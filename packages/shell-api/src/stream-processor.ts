import type { Document } from '@mongosh/service-provider-core';
import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';

import type Mongo from './mongo';
import { asPrintable } from './enums';
import {
  ShellApiWithMongoClass,
  returnsPromise,
  shellApiClassDefault,
} from './decorators';

import type { Streams } from './streams';
import type { MQLPipeline } from './mql-types';

export type StreamProcessorData = Document & { name: string };

@shellApiClassDefault
export class StreamProcessor extends ShellApiWithMongoClass {
  public name: string;
  public id?: string;
  public pipeline?: MQLPipeline;
  public state?: string;
  public tier?: string;
  public errorMsg?: string;
  public lastModified?: Date;
  public lastStateChange?: Date;

  constructor(public _streams: Streams, data: StreamProcessorData) {
    super();

    this.name = data.name;
    this.id = data.id;
    this.pipeline = data.pipeline;
    this.state = data.state;
    this.tier = data.tier;
    this.errorMsg = data.errorMsg;
    this.lastModified = data.lastModified;
    this.lastStateChange = data.lastStateChange;
  }

  get _mongo(): Mongo {
    return this._streams._mongo;
  }

  [asPrintable]() {
    const result: Document = {
      name: this.name,
    };

    // Only add keys onto the document if they have values
    if (this.id) {
      result.id = this.id;
    }
    if (this.pipeline) {
      result.pipeline = this.pipeline;
    }
    if (this.state) {
      result.state = this.state;
    }
    if (this.tier) {
      result.tier = this.tier;
    }
    if (this.lastModified) {
      result.lastModified = this.lastModified;
    }
    if (this.lastStateChange) {
      result.lastStateChange = this.lastStateChange;
    }

    // Check explicitly for undefined so that empty string can be exposed
    // back to the user
    if (this.errorMsg !== undefined) {
      result.errorMsg = this.errorMsg;
    }

    return result;
  }

  @returnsPromise
  async start(options: Document = {}) {
    return await this._streams._runStreamCommand({
      startStreamProcessor: this.name,
      ...options,
    });
  }

  @returnsPromise
  async stop(options: Document = {}) {
    return await this._streams._runStreamCommand({
      stopStreamProcessor: this.name,
      ...options,
    });
  }

  @returnsPromise
  async drop(options: Document = {}) {
    return this._drop(options);
  }

  async _drop(options: Document = {}) {
    return await this._streams._runStreamCommand({
      dropStreamProcessor: this.name,
      ...options,
    });
  }

  @returnsPromise
  async stats(options: Document = {}) {
    return this._streams._runStreamCommand({
      getStreamProcessorStats: this.name,
      ...options,
    });
  }

  /**
   * modify is used to modify a stream processor definition, like below:
   *  Change the pipeline:
   *    sp.name.modify(newPipeline)
   *  Keep the same pipeline, change other options:
   *   sp.name.modify({resumeFromCheckpoint: false})
   *  Change the pipeline and set additional options:
   *    sp.name.modify(newPipeline, {resumeFromCheckpoint: false})
   */
  async modify(options: Document): Promise<Document>;
  async modify(pipeline: MQLPipeline, options?: Document): Promise<Document>;

  @returnsPromise
  async modify(
    pipelineOrOptions: MQLPipeline | Document,
    options?: Document
  ): Promise<Document> {
    if (Array.isArray(pipelineOrOptions)) {
      options = { ...options, pipeline: pipelineOrOptions };
    } else if (typeof pipelineOrOptions === 'object') {
      if (options) {
        throw new MongoshInvalidInputError(
          'If the first argument to modify is an object, the second argument should not be specified.',
          CommonErrors.InvalidArgument
        );
      }
      options = { ...pipelineOrOptions };
    } else {
      throw new MongoshInvalidInputError(
        'The first argument to modify must be an array or object.',
        CommonErrors.InvalidArgument
      );
    }

    return this._streams._runStreamCommand({
      modifyStreamProcessor: this.name,
      ...options,
    });
  }

  @returnsPromise
  async sample(options: Document = {}) {
    const r = await this._streams._runStreamCommand({
      startSampleStreamProcessor: this.name,
      ...options,
    });

    if (r.ok !== 1) {
      return r;
    }

    return this._sampleFrom(r.cursorId as number);
  }

  async _sampleFrom(cursorId: number) {
    let currentCursorId = cursorId;
    // keep pulling until end of stream
    while (String(currentCursorId) !== '0') {
      const res = await this._streams._runStreamCommand({
        getMoreSampleStreamProcessor: this.name,
        cursorId: currentCursorId,
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
            this._instanceState.shellApi.sleep(1000), // wait 1 second
            interruptable.promise, // unless interrupted
          ]);
        } finally {
          interruptable.destroy();
        }
      }
    }

    return;
  }
}
export default StreamProcessor;
