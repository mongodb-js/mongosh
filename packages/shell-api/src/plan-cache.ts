import {
  hasAsyncChild,
  returnsPromise,
  serverVersions,
  ShellApiClass,
  shellApiClassDefault
} from './decorators';
import { Document } from '@mongosh/service-provider-core';
import Collection from './collection';
import { ServerVersions, asPrintable } from './enums';
import { MongoshUnimplementedError } from '@mongosh/errors';

@shellApiClassDefault
@hasAsyncChild
export default class PlanCache extends ShellApiClass {
  _collection: Collection;

  constructor(collection: Collection) {
    super();
    this._collection = collection;
  }

  /**
   * Internal method to determine what is printed for this class.
   */
  [asPrintable](): string {
    return `PlanCache for collection ${this._collection._name}.`;
  }

  @returnsPromise
  async clear(): Promise<any> {
    return await this._collection.runCommand('planCacheClear');
  }

  @returnsPromise
  async clearPlansByQuery(query: Document, projection?: Document, sort?: Document): Promise<any> {
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
  async list(pipeline?: Document[]): Promise<Document> {
    const p = pipeline || [];
    const agg = await this._collection.aggregate([ { $planCacheStats: {} }, ...p ]);
    return await agg.toArray();
  }

  planCacheQueryShapes(): void {
    throw new MongoshUnimplementedError('PlanCache.listQueryShapes was deprecated, please use PlanCache.list instead');
  }

  getPlansByQuery(): void {
    throw new MongoshUnimplementedError('PlanCache.getPlansByQuery was deprecated, please use PlanCache.list instead');
  }
}
