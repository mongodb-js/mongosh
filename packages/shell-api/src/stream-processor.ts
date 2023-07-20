import { promisify } from 'util';

import type { Document } from '@mongosh/service-provider-core';

import type Mongo from './mongo';
import { asPrintable } from './enums';
import {
  ShellApiWithMongoClass,
  returnsPromise,
  shellApiClassDefault,
} from './decorators';

import type { Streams } from './streams';

const sleep = promisify(setTimeout);

@shellApiClassDefault
export default class StreamProcessor extends ShellApiWithMongoClass {
  constructor(public _streams: Streams, public name: string) {
    super();
  }

  get _mongo(): Mongo {
    return this._streams._mongo;
  }

  [asPrintable]() {
    return `Atlas Stream Processor: ${this.name}`;
  }

  @returnsPromise
  async start() {
    const result = await this._streams._runCommand({
      startStreamProcessor: this.name,
    });
    return result;
  }

  @returnsPromise
  async stop() {
    const result = await this._streams._runCommand({
      stopStreamProcessor: this.name,
    });
    return result;
  }

  @returnsPromise
  async drop() {
    const result = await this._streams._runCommand({
      dropStreamProcessor: this.name,
    });
    return result;
  }

  @returnsPromise
  async stats(options: Document = {}) {
    return this._streams._runCommand({
      getStreamProcessorStats: this.name,
      ...options,
    });
  }

  @returnsPromise
  async sample(options: Document = {}) {
    const r = await this._streams._runCommand({
      startSampleStreamProcessor: this.name,
      ...options,
    });

    if (r.ok !== 1) {
      return r;
    }

    return this._sampleFrom(r.cursorId as number);
  }

  @returnsPromise
  async _sampleFrom(cursorId: number) {
    let currentCursorId = cursorId;
    // keep pulling until end of stream
    while (currentCursorId !== 0) {
      const res = await this._streams._runCommand({
        getMoreSampleStreamProcessor: this.name,
        cursorID: currentCursorId,
      });

      if (res.ok !== 1) {
        return res;
      }

      currentCursorId = res.cursorId;

      // print fetched documents
      for (const doc of res.messages) {
        await this._instanceState.shellApi.printjson(doc);
      }

      // wait before pulling again if no result in this batch
      if (!res.messages.length) {
        const interruptable = this._instanceState.interrupted.asPromise();
        try {
          await Promise.race([
            sleep(1000), // wait 1 second
            interruptable.promise, // unless interruppted
          ]);
        } finally {
          interruptable.destroy();
        }
      }
    }

    return;
  }
}
