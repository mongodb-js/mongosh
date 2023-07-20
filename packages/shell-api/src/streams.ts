import type { Document } from 'bson';
import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';

import { MongoshInterruptedError } from './interruptor';
import {
  ShellApiWithMongoClass,
  returnsPromise,
  shellApiClassDefault,
} from './decorators';
import type ShellInstanceState from './shell-instance-state';
import StreamProcessor from './stream-processor';
import { ADMIN_DB, asPrintable } from './enums';
import type Mongo from './mongo';

@shellApiClassDefault
export class Streams extends ShellApiWithMongoClass {
  public static newInstance(instanceState: ShellInstanceState) {
    return new Proxy(new Streams(instanceState), {
      get(target, prop) {
        const v = (target as any)[prop];
        if (v !== undefined) {
          return v;
        }
        if (typeof prop === 'string') {
          return target.getProcessor(prop);
        }
      },
    });
  }

  constructor(private instanceState: ShellInstanceState) {
    super();
  }

  get _mongo(): Mongo {
    return this.instanceState.currentDb._mongo;
  }

  [asPrintable](): string {
    return 'Atlas Stream Processing';
  }

  getProcessor(name: string) {
    return new StreamProcessor(this, name);
  }

  @returnsPromise
  async process(pipeline: Document[], options: Document = {}) {
    if (!Array.isArray(pipeline) || !pipeline.length) {
      throw new MongoshInvalidInputError(
        'Invalid pipeline',
        CommonErrors.InvalidArgument,
        pipeline
      );
    }
    const result = await this._runCommand({
      processStreamProcessor: 1,
      pipeline,
      options,
    });

    if (result.ok !== 1) {
      return result;
    }

    const { name, cursorId } = result as {
      name: string;
      limit: number;
      cursorId: number;
    };
    const sp = this.getProcessor(name);

    const stopAndDrop = () => {
      sp.stop()
        .then(() => sp.drop())
        .catch(() => {
          /* ignore */
        });
    };

    try {
      await sp._sampleFrom(cursorId);
    } catch (err) {
      // try to stop and drop the temp processor when interrupted
      if (err instanceof MongoshInterruptedError) {
        this._instanceState.messageBus.once(
          'mongosh:interrupt-complete',
          stopAndDrop
        );
      }

      throw err;
    }

    // stop and drop the temp processor if reached the end of sample
    return stopAndDrop();
  }

  @returnsPromise
  async createStreamProcessor(
    name: string,
    pipeline: Document[],
    options: Document
  ) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new MongoshInvalidInputError(
        `Invalid processor name: ${name}`,
        CommonErrors.InvalidArgument
      );
    }
    if (!Array.isArray(pipeline) || !pipeline.length) {
      throw new MongoshInvalidInputError(
        'Invalid pipeline',
        CommonErrors.InvalidArgument,
        pipeline
      );
    }
    const result = await this._runCommand({
      createStreamProcessor: name,
      pipeline,
      options,
    });

    if (result.ok !== 1) {
      return result;
    }

    return this.getProcessor(name);
  }

  @returnsPromise
  async listStreamProcessors(filter: Document) {
    const result = await this._runCommand({
      listStreamProcessors: 1,
      filter,
    });
    if (result.ok !== 1) {
      return result;
    }
    const processors = result.streamProcessors;
    const sps = processors.map((sp: StreamProcessor) =>
      this.getProcessor(sp.name)
    );
    return Object.defineProperty(sps, asPrintable, {
      value() {
        return JSON.stringify(processors, null, 2);
      },
    });
  }

  @returnsPromise
  listConnections(filter: Document) {
    return this._runCommand({
      listStreamConnections: 1,
      filter,
    });
  }

  async _runCommand(cmd: Document, options: Document = {}) {
    const { _mongo, _instanceState } = this;
    const interruptable = _instanceState.interrupted.asPromise();
    try {
      const result = await Promise.race([
        _mongo._serviceProvider.runCommand(ADMIN_DB, cmd, options), // run cmd
        interruptable.promise, // unless interruppted
      ]);
      return result;
    } finally {
      interruptable.destroy();
    }
  }
}
