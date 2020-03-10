import { NodeTransport, NodeOptions } from 'mongosh-transport-server';
import { Document, Cursor, Result } from 'mongosh-transport-core';
import { ServiceProvider } from 'mongosh-service-provider-core';

type BuildInfoResult = { version: string };

type CustomWriteConcern = string;
type WriteConcern = 0 | 1 | 'majority' | CustomWriteConcern;
type WriteConcernDoc = { w: WriteConcern; j: boolean; wtimeout: number };

/**
 * Encapsulates logic for the service provider for the mongosh CLI.
 */
class CliServiceProvider implements ServiceProvider {
  private readonly nodeTransport: NodeTransport;

  /**
   *
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param pipeline
   * @param options
   *    allowDiskUse: Optional<Boolean>;
   *    batchSize: Optional<Int32>;
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    maxTimeMS: Optional<Int64>;
   *    maxAwaitTimeMS: Optional<Int64>;
   *    comment: Optional<String>;
   *    hint: Optional<(String | Document = {})>;
   * @param dbOptions
   *    readConcern:
   *        level: <String local|majority|linearizable|available>
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  aggregate(
    db: string,
    coll: string,
    pipeline: Document[] = [],
    options: Document = {},
    dbOptions: Document = {}): Cursor {
    return this.nodeTransport.aggregate(db, coll, pipeline, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param pipeline
   * @param options
   *    allowDiskUse: Optional<Boolean>;
   *    batchSize: Optional<Int32>;
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    maxTimeMS: Optional<Int64>;
   *    maxAwaitTimeMS: Optional<Int64>;
   *    comment: Optional<String>;
   *    hint: Optional<(String | Document = {})>;
   * @param dbOptions
   *    readConcern:
   *        level: <String local|majority|linearizable|available>
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  aggregateDb(
    db: string,
    pipeline: Document[] = [],
    options: Document = {},
    dbOptions: Document = {}): Cursor {
    return this.nodeTransport.aggregateDb(db, pipeline, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param requests
   * @param options
   *      ordered: Boolean;
   *      bypassDocumentValidation: Optional<Boolean>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  bulkWrite(
    db: string,
    coll: string,
    requests: Document,
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.bulkWrite(db, coll, requests, options, dbOptions);
  }

  /**
   * Close the connection.
   *
   * @param {boolean} force - Whether to force close.
   */
  close(force: boolean): void {
    this.nodeTransport.close(force);
  }

  /**
   * Create a new CLI service provider from the provided URI.
   *
   * @param {String} uri - The URI.
   * @param {NodeOptions} options - The options.
   *
   * @returns {Promise} The promise with cli service provider.
   */
  static async connect(uri: string, options: NodeOptions = {}): Promise<CliServiceProvider> {
    const nodeTransport = await NodeTransport.fromURI(uri, options);
    return new CliServiceProvider(nodeTransport);
  }

  /**
   * Instantiate the new service provider.
   *
   * @param {NodeTransport} nodeTransport - The node transport.
   */
  constructor(nodeTransport: NodeTransport) {
    this.nodeTransport = nodeTransport;
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param query
   * @param options
   *    collation: Optional<Document>
   *    hint: Optional<(String | Document = {})>;
   *    limit: Optional<Int64>;
   *    maxTimeMS: Optional<Int64>;
   *    skip: Optional<Int64>;
   * @param dbOptions
   *    readConcern:
   *        level: <String local|majority|linearizable|available>
   * @return {any}
   */
  count(
    db: string,
    coll: string,
    query: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.count(db, coll, query, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    hint: Optional<(String | Document = {})>;
   *    limit: Optional<Int64>;
   *    maxTimeMS: Optional<Int64>;
   *    skip: Optional<Int64>;
   * @return {any}
   */
  countDocuments(
    db: string,
    coll: string,
    filter: Document = {},
    options: Document = {}): Promise<Result> {
    return this.nodeTransport.countDocuments(db, coll, filter, options);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    collation: Optional<Document>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  deleteMany(
    db: string,
    coll: string,
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.deleteMany(db, coll, filter, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    collation: Optional<Document>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  deleteOne(
    db: string,
    coll: string,
    filter: Document,
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.deleteOne(db, coll, filter, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param {string} field - The field name.
   * @param options
   *    collation: Optional<Document>;
   *    maxTimeMS: Optional<Int64>;
   * @param dbOptions
   * @return {any}
   */
  distinct(
    db: string,
    coll: string,
    field: string,
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Cursor {
    return this.nodeTransport.distinct(db, coll, field, filter, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    maxTimeMS: Optional<Int64>;
   * @return {any}
   */
  estimatedDocumentCount(
    db: string,
    coll: string,
    filter: Document = {},
    options: Document = {}): Promise<Result> {
    return this.nodeTransport.estimatedDocumentCount(db, coll, filter, options);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param query
   * @param options
   *    allowPartialPromise<Result>s: Optional<Boolean>;
   *    batchSize: Optional<Int32>;
   *    collation: Optional<Document>;
   *    comment: Optional<String>;
   *    cursorType: Optional<CursorType>; TODO
   *    hint: Optional<(String | Document = {})>;
   *    limit: Optional<Int64>;
   *    max: Optional<Document>;
   *    maxAwaitTimeMS: Optional<Int64>; TODO
   *    maxScan: Optional<Int64>;
   *    maxTimeMS: Optional<Int64>;
   *    min: Optional<Document>;
   *    noCursorTimeout: Optional<Boolean>;
   *    projection: Optional<Document>;
   *    returnKey: Optional<Boolean>;
   *    showRecordId: Optional<Boolean>; TODO
   *    skip: Optional<Int64>;
   *    snapshot: Optional<Boolean>;
   *    sort: Optional<Document>;
   * @return {Cursor}
   */
  find(
    db: string,
    coll: string,
    query: Document = {},
    options: Document = {}): Cursor {
    return this.nodeTransport.find(db, coll, query, options);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    collation: Optional<Document>;
   *    maxTimeMS: Optional<Int64>;
   *    projection: Optional<Document>;
   *    sort: Optional<Document>;
   * @return {any}
   */
  findOneAndDelete(
    db: string,
    coll: string,
    filter: Document = {},
    options: Document = {}): Promise<Result> {
    return this.nodeTransport.findOneAndDelete(db, coll, filter, options);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    maxTimeMS: Optional<Int64>;
   *    projection: Optional<Document>;
   *    returnDocument: Optional<ReturnDocument>;
   *    sort: Optional<Document>;
   *    upsert: Optional<Boolean>;
   * @return {any}
   */
  findOneAndReplace(
    db: string,
    coll: string,
    filter: Document = {},
    options: Document = {}): Promise<Result> {
    return this.nodeTransport.findOneAndReplace(db, coll, filter, options);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    arrayFilters: Optional<Array<Document>>;
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    maxTimeMS: Optional<Int64>;
   *    projection: Optional<Document>;
   *    returnDocument: Optional<ReturnDocument>;
   *    sort: Optional<Document>;
   *    upsert: Optional<Boolean>;
   * @return {any}
   */
  findOneAndUpdate(
    db: string,
    coll: string,
    filter: Document = {},
    options: Document = {}): Promise<Result> {
    return this.nodeTransport.findOneAndUpdate(db, coll, filter, options);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param {document[]} docs - The documents.
   * @param options
   *    bypassDocumentValidation: Optional<Boolean>;
   *    ordered: Boolean;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  insertMany(
    db: string,
    coll: string,
    docs: Document[] = [],
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.insertMany(db, coll, docs, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    bypassDocumentValidation: Optional<Boolean>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  insertOne(
    db: string,
    coll: string,
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.insertOne(db, coll, filter, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @return {any}
   */
  isCapped(db: string, coll: string): Promise<Result> {
    return this.nodeTransport.isCapped(db, coll);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param query
   * @param options
   *    collation: Optional<Document>;
   *    justOne: Optional<Boolean>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  remove(
    db: string,
    coll: string,
    query: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.remove(db, coll, query, options, dbOptions);
  }

  save(
    db: string,
    coll: string,
    doc: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.save(db, coll, doc, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    hint: Optional<(String | Document = {})>;
   *    upsert: Optional<Boolean>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  replaceOne(
    db: string,
    coll: string,
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.replaceOne(db, coll, filter, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param spec
   * @param options
   * @return {any}
   */
  runCommand(
    db: string,
    spec: Document,
    options: Document = {}): Promise<Result> {
    return this.nodeTransport.runCommand(db, spec, options);
  }

  /**
   * @param {String} db - the db name
   * @return {any}
   */
  listDatabases(db: string): Promise<Result> {
    return this.nodeTransport.listDatabases(db);
  }


  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    arrayFilters: Optional<Array<Document>>;
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    hint: Optional<(String | Document = {})>;
   *    upsert: Optional<Boolean>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  updateMany(
    db: string,
    coll: string,
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.updateMany(db, coll, filter, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    arrayFilters: Optional<Array<Document>>;
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    hint: Optional<(String | Document = {})>;
   *    upsert: Optional<Boolean>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  updateOne(
    db: string,
    coll: string,
    filter: Document = {},
    options: Document = {},
    dbOptions: Document = {}): Promise<Result> {
    return this.nodeTransport.updateOne(db, coll, filter, options, dbOptions);
  }

  /**
   * Returns the server version.
   *
   * @returns {Promise} The server version.
   */
  async getServerVersion(): Promise<string> {
    const result: BuildInfoResult = await this.nodeTransport.runCommand(
      'admin',
      {
        buildInfo: 1
      },
      {}
    ) as BuildInfoResult;

    if (!result) {
      return;
    }

    return result.version;
  }

  /**
   * Drop a database
   *
   * @param {String} db - The database name.
   * @param {WriteConcernDoc} writeConcern - The write concern.
   *
   * @returns {Promise<Result>} The result of the operation.
   */
  async dropDatabase(
    db: string,
    writeConcern?: WriteConcernDoc
  ): Promise<Result> {
    // Defaults are based on old shell implementation.
    // See: https://github.com/mongodb/mongo/blob/d2b75b4e2a6d1e9db7cbb6120c34b0b44476828e/src/mongo/shell/db.js#L7
    const defaultWriteConcern = {
      w: 'majority',
      wtimeout: 10 * 60 * 1000
    };

    return await this.nodeTransport.runCommand(db, {
      dropDatabase: 1,
      writeConcern: writeConcern ?
        writeConcern :
        defaultWriteConcern
    });
  }
}

export default CliServiceProvider;
