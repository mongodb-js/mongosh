import Document from './document';

export interface BulkBatch {
  originalZeroIndex: number;
  batchType: number;
  operations: any[];
  [key: string]: any;
}

export interface DriverBulkResult {
  result: {
    ok: boolean;
    /**
     * The number of documents inserted.
     */
    nInserted: number;

    /**
     * The number of existing documents selected for update or replacement.
     */
    nMatched: number;

    /**
     * The number of existing documents updated or replaced.
     */
    nModified: number;

    /**
     * The number of documents removed.
     */
    nRemoved: number;

    /**
     * The number of upserted documents.
     */
    nUpserted: number;

    /**
     * Ids of upserted documents.
     */
    upserted: {[index: number]: any};

    /**
     * Ids of inserted documents.
     */
    insertedIds: {[index: number]: any};
  };
}

export interface ServiceProviderBulkFindOp {
  /**
   * Add a remove operation
   */
  remove(): ServiceProviderBulkOp;

  /**
   * Add a removeOne operation
   */
  removeOne(): ServiceProviderBulkOp;

  /**
   * Add a replaceOne operation
   */
  replaceOne(replacement: Document): ServiceProviderBulkOp;

  /**
   * Add a updateOne operation
   */
  updateOne(update: Document): ServiceProviderBulkOp;

  /**
   * Add a update operation
   */
  update(update: Document): ServiceProviderBulkOp;

  /**
   * Make subsequent update operations upsert: true
   */
  upsert(): ServiceProviderBulkFindOp;
}

export default interface ServiceProviderBulkOp {
  /**
   * Internal state
   */
  s: {
    batches: BulkBatch[];
    currentUpdateBatch: BulkBatch;
    currentRemoveBatch: BulkBatch;
    currentInsertBatch: BulkBatch;
    currentBatch: BulkBatch;
  };

  /**
   * Execute the operation.
   */
  execute(): Promise<DriverBulkResult>;

  /**
   * Find
   */
  find(document: Document): ServiceProviderBulkFindOp;

  /**
   * Insert
   */
  insert(document: Document): ServiceProviderBulkOp;

}
