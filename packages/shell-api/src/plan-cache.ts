import {
  returnsPromise,
  apiVersions,
  serverVersions,
  shellApiClassDefault,
  deprecated,
  ShellApiWithMongoClass,
} from './decorators';
import type { Document } from '@mongosh/service-provider-core';
import type { CollectionWithSchema } from './collection';
import { asPrintable, ServerVersions } from './enums';
import { MongoshDeprecatedError } from '@mongosh/errors';
import type Mongo from './mongo';
import type {
  GenericServerSideSchema,
  GenericDatabaseSchema,
  GenericCollectionSchema,
  StringKey,
} from './helpers';

@shellApiClassDefault
export default class PlanCache<
  M extends GenericServerSideSchema = GenericServerSideSchema,
  D extends GenericDatabaseSchema = M[keyof M],
  C extends GenericCollectionSchema = D[keyof D],
  N extends StringKey<D> = StringKey<D>
> extends ShellApiWithMongoClass<M> {
  _collection: CollectionWithSchema<M, D, C, N>;

  constructor(collection: CollectionWithSchema<M, D, C, N>) {
    super();
    this._collection = collection;
  }

  get _mongo(): Mongo<M> {
    return this._collection._mongo;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return `PlanCache for collection ${this._collection._name}.`;
  }

  @returnsPromise
  @apiVersions([])
  async clear(): Promise<Document> {
    return await this._collection.runCommand('planCacheClear');
  }

  @returnsPromise
  @apiVersions([])
  async clearPlansByQuery(
    query: Document,
    projection?: Document,
    sort?: Document
  ): Promise<Document> {
    const cmd = { query } as any;
    if (projection) {
      cmd.projection = projection;
    }
    if (sort) {
      cmd.sort = sort;
    }
    return await this._collection.runCommand('planCacheClear', cmd);
  }

  @serverVersions(['4.4.0', ServerVersions.latest])
  @returnsPromise
  @apiVersions([])
  async list(pipeline?: Document[]): Promise<Document[]> {
    const p = pipeline || [];
    const agg = await this._collection.aggregate([
      { $planCacheStats: {} },
      ...p,
    ]);
    return await agg.toArray();
  }

  @deprecated
  listQueryShapes(): never {
    throw new MongoshDeprecatedError(
      'PlanCache.listQueryShapes was deprecated, please use PlanCache.list instead'
    );
  }

  @deprecated
  getPlansByQuery(): never {
    throw new MongoshDeprecatedError(
      'PlanCache.getPlansByQuery was deprecated, please use PlanCache.list instead'
    );
  }
}
