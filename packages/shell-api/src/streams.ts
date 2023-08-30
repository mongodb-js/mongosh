import type { Document } from 'bson';
import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';

import {
  returnsPromise,
  shellApiClassDefault,
  ShellApiWithMongoClass,
} from './decorators';
import StreamProcessor from './stream-processor';
import { ADMIN_DB, asPrintable, shellApiType } from './enums';
import type Database from './database';
import type Mongo from './mongo';

@shellApiClassDefault
export class Streams extends ShellApiWithMongoClass {
  public static newInstance(database: Database) {
    return new Proxy(new Streams(database), {
      get(target, prop) {
        const v = (target as any)[prop];
        if (v !== undefined) {
          return v;
        }
        if (typeof prop === 'string' && !prop.startsWith('_')) {
          return target.getProcessor(prop);
        }
      },
    });
  }

  private _database: Database;

  constructor(database: Database) {
    super();
    this._database = database;
  }

  get _mongo(): Mongo {
    return this._database._mongo;
  }

  [asPrintable](): string {
    return 'Atlas Stream Processing';
  }

  getProcessor(name: string) {
    return new StreamProcessor(this, name);
  }

  @returnsPromise
  async process(pipeline: Document[], options?: Document) {
    if (!Array.isArray(pipeline) || !pipeline.length) {
      throw new MongoshInvalidInputError(
        'Invalid pipeline',
        CommonErrors.InvalidArgument,
        pipeline
      );
    }
    const result = await this._runStreamCommand({
      processStreamProcessor: pipeline,
      ...(options ? { options } : {}),
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

    async function dropSp() {
      try {
        await sp._drop();
      } catch {
        // ignore
      }
    }

    await this._instanceState.interrupted.withOverrideInterruptBehavior(
      () => sp._sampleFrom(cursorId),
      dropSp
    );

    // drop the temp processor if reached the end of sample
    return dropSp();
  }

  @returnsPromise
  async createStreamProcessor(
    name: string,
    pipeline: Document[],
    options?: Document
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
    const result = await this._runStreamCommand({
      createStreamProcessor: name,
      pipeline,
      ...(options ? { options } : {}),
    });

    if (result.ok !== 1) {
      return result;
    }

    return this.getProcessor(name);
  }

  @returnsPromise
  async listStreamProcessors(filter: Document) {
    const result = await this._runStreamCommand({
      listStreamProcessors: 1,
      filter,
    });
    if (result.ok !== 1) {
      return result;
    }
    const rawProcessors = result.streamProcessors;
    const sps = rawProcessors.map((sp: StreamProcessor) =>
      this.getProcessor(sp.name)
    );

    return Object.defineProperties(sps, {
      [asPrintable]: { value: () => rawProcessors },
      [shellApiType]: { value: 'StreamsListResult' },
    });
  }

  @returnsPromise
  async listConnections(filter: Document) {
    const result = await this._runStreamCommand({
      listStreamConnections: 1,
      filter,
    });
    if (result.ok !== 1) {
      return result;
    }
    return Object.defineProperties(result.connections, {
      [shellApiType]: { value: 'StreamsListResult' },
    });
  }

  async _runStreamCommand(cmd: Document, options: Document = {}) {
    return this._mongo._serviceProvider.runCommand(ADMIN_DB, cmd, options); // run cmd
  }
}
