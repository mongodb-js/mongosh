import { Document, Cursor, Result } from 'mongosh-transport-core';

/**
 * Interface for read operations in the CRUD specification.
 */
interface Readable {
  /**
   * Run an aggregation pipeline.
   *
   * @note: Passing a null collection will cause the
   *   aggregation to run on the DB.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Array} pipeline - The aggregation pipeline.
   * @param {Document} options - The pipeline options.
   *
   * @returns {Cursor} A cursor.
   */
  aggregate(
    database: string,
    collection: string,
    pipeline: Document[],
    options: Document,
    dbOptions: Document) : Cursor;

  /**
   * Get an exact document count from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The count options.
   *
   * @returns {Promise} A promise of the result.
   */
  countDocuments(
    database: string,
    collection: string,
    filter: Document,
    options: Document) : Promise<Result>;

  /**
   * Get distinct values for the field.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {String} fieldName - The field name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The distinct options.
   *
   * @returns {Cursor} The cursor.
   */
  distinct(
    database: string,
    collection: string,
    fieldName: string,
    filter: Document,
    options: Document,
    dbOptions: Document) : Cursor;

  /**
   * Get an estimated document count from the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} options - The count options.
   *
   * @returns {Promise} The promise of the result.
   */
  estimatedDocumentCount(
    database: string,
    collection: string,
    options: Document) : Promise<Result>;

  /**
   * Find documents in the collection.
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @param {Document} filter - The filter.
   * @param {Document} options - The find options.
   *
   * @returns {Promise} The promise of the cursor.
   */
  find(
    database: string,
    collection: string,
    filter: Document,
    options: Document) : Cursor;
}

export default Readable;
