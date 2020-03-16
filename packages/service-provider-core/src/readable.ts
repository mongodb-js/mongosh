import Document from './document';
import Cursor from './cursor';
import Result from './result';

/**
 * Interface for read operations in the CRUD specification.
 */
interface Readable {
  /**
   * Run an aggregation pipeline.
   *
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
    options?: Document,
    dbOptions?: Document) : Cursor;

  /**
   * Run an aggregation pipeline on the DB.
   *
   * @param {String} database - The database name.
   * @param {Array} pipeline - The aggregation pipeline.
   * @param {Document} options - The pipeline options.
   *
   * @returns {Cursor} A cursor.
   */
  aggregateDb(
    database: string,
    pipeline: Document[],
    options?: Document,
    dbOptions?: Document) : Cursor;

  /**
   * Returns the count of documents that would match a find() query for the
   * collection or view. The db.collection.count() method does not perform the
   * find() operation but instead counts and returns the number of results
   * that match a query.
   *
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param query
   * @param options
   * @param dbOptions
   *
   * @returns {Promise} A promise of the result.
   */
  count(
    db: string,
    coll: string,
    query?: Document,
    options?: Document,
    dbOptions?: Document): Promise<Result>;

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
    filter?: Document,
    options?: Document) : Promise<Result>;

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
    filter?: Document,
    options?: Document,
    dbOptions?: Document) : Promise<any>;

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
    options?: Document) : Promise<Result>;

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
    filter?: Document,
    options?: Document) : Cursor;

  /**
   * Returns the server version.
   *
   * @returns {Promise} The server version.
   */
  getServerVersion(): Promise<string>;

  /**
   * list databases.
   *
   * @param {String} database - The database name.
   *
   * @returns {Promise} The promise of command results.
   */
  listDatabases(database: string): Promise<Result>;

  /**
   * Is the collection capped?
   *
   * @param {String} database - The database name.
   * @param {String} collection - The collection name.
   * @returns {Promise} The promise of the result.
   */
  isCapped(
    database: string,
    collection: string): Promise<Result>;
}

export default Readable;
