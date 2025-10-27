import type { Document } from 'bson';
import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';

import {
  returnsPromise,
  shellApiClassDefault,
  ShellApiWithMongoClass,
  ShellApiValueClass,
} from './decorators';
import StreamProcessor from './stream-processor';
import { ADMIN_DB, asPrintable, shellApiType } from './enums';
import type { Database, DatabaseWithSchema } from './database';
import type Mongo from './mongo';
import type { GenericDatabaseSchema, GenericServerSideSchema } from './helpers';
import type { MQLPipeline } from './mql-types';

@shellApiClassDefault
export class WorkspaceDefaults extends ShellApiValueClass {
  tier: string;
  maxTierSize: number;

  constructor(tier: string, maxTierSize: number) {
    super();
    this.tier = tier;
    this.maxTierSize = maxTierSize;
  }
}

@shellApiClassDefault
export class Streams<
  M extends GenericServerSideSchema = GenericServerSideSchema,
  D extends GenericDatabaseSchema = GenericDatabaseSchema
> extends ShellApiWithMongoClass {
  public static newInstance<
    M extends GenericServerSideSchema = GenericServerSideSchema,
    D extends GenericDatabaseSchema = GenericDatabaseSchema
  >(database: DatabaseWithSchema<M, D>) {
    return new Proxy(new Streams<M, D>(database), {
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

  private _database: DatabaseWithSchema<M, D>;

  constructor(database: DatabaseWithSchema<M, D> | Database<M, D>) {
    super();
    this._database = database as DatabaseWithSchema<M, D>;
  }

  get _mongo(): Mongo<M> {
    return this._database._mongo;
  }

  [asPrintable](): string {
    return 'Atlas Stream Processing';
  }

  getProcessor(name: string): StreamProcessor {
    return new StreamProcessor(this, name);
  }

  @returnsPromise
  async process(pipeline: MQLPipeline, options?: Document) {
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
    pipeline: MQLPipeline,
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

  @returnsPromise
  async listWorkspaceDefaults(): Promise<WorkspaceDefaults | Document> {
    const result = await this._runStreamCommand({
      listWorkspaceDefaults: 1,
    });
    if (result.ok !== 1) {
      return result;
    }
    return new WorkspaceDefaults(result.tier, result.maxTierSize);
  }

  async _runStreamCommand(cmd: Document, options: Document = {}) {
    return this._mongo._serviceProvider.runCommand(ADMIN_DB, cmd, options); // run cmd
  }
}
