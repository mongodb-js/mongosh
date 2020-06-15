export default interface BulkWriteResult {
  result: {
    ok: number;
  };

  /**
   * The number of documents inserted.
   */
  insertedCount: number;

  /**
   * The number of existing documents selected for update or replacement.
   */
  matchedCount: number;

  /**
   * The number of existing documents updated or replaced.
   */
  modifiedCount: number;

  /**
   * The number of documents removed.
   */
  deletedCount: number;

  /**
   * The number of upserted documents.
   */
  upsertedCount: number;

  /**
   * Ids of upserted documents.
   */
  upsertedIds: {[index: number]: any};

  /**
   * Ids of inserted documents.
   */
  insertedIds: {[index: number]: any};
}
