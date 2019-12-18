const { NodeTransport } = require('mongosh-transport-server');

/**
 * Encapsulates logic for the service provider for the mongosh CLI.
 */
class CliServiceProvider {
  /**
   * Create a new CLI service provider from the provided URI.
   *
   * @param {String} uri - The URI.
   */
  async connect(uri) {
    this.nodeTransport = await NodeTransport.fromURI(uri);
  }
  constructor(uri) {
    this.connect(uri);
  }

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
   *    hint: Optional<(String | Document)>;
   * @param dbOptions
   *    readConcern:
   *        level: <String local|majority|linearizable|available>
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  aggregate(db, coll, pipeline, options, dbOptions) {
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
   *    hint: Optional<(String | Document)>;
   * @param dbOptions
   *    readConcern:
   *        level: <String local|majority|linearizable|available>
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  aggregateDb(db, pipeline, options, dbOptions) {
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
  bulkWrite(db, coll, requests = {}, options = {}, dbOptions = {}) {
    return this.nodeTransport.bulkWrite(db, coll, requests, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param query
   * @param options
   *    collation: Optional<Document>
   *    hint: Optional<(String | Document)>;
   *    limit: Optional<Int64>;
   *    maxTimeMS: Optional<Int64>;
   *    skip: Optional<Int64>;
   * @param dbOptions
   *    readConcern:
   *        level: <String local|majority|linearizable|available>
   * @return {any}
   */
  count(db, coll, query, options, dbOptions) {
    return this.nodeTransport.count(db, coll, query, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    hint: Optional<(String | Document)>;
   *    limit: Optional<Int64>;
   *    maxTimeMS: Optional<Int64>;
   *    skip: Optional<Int64>;
   * @return {any}
   */
  countDocuments(db, coll, filter, options) {
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
  deleteMany(db, coll, filter, options, dbOptions) {
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
  deleteOne(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.deleteOne(db, coll, filter, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    collation: Optional<Document>;
   *    maxTimeMS: Optional<Int64>;
   * @param dbOptions
   * @return {any}
   */
  distinct(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.distinct(db, coll, filter, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    maxTimeMS: Optional<Int64>;
   * @return {any}
   */
  estimatedDocumentCount(db, coll, filter, options) {
    return this.nodeTransport.estimatedDocumentCount(db, coll, filter, options);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param query
   * @param options
   *    allowPartialResults: Optional<Boolean>;
   *    batchSize: Optional<Int32>;
   *    collation: Optional<Document>;
   *    comment: Optional<String>;
   *    cursorType: Optional<CursorType>; TODO
   *    hint: Optional<(String | Document)>;
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
  find(db, coll, query, options = {}) {
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
  findOneAndDelete(db, coll, filter, options) {
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
  findOneAndReplace(db, coll, filter, options) {
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
  findOneAndUpdate(db, coll, filter, options) {
    return this.nodeTransport.findOneAndUpdate(db, coll, filter, options);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
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
  insertMany(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.insertMany(db, coll, filter, options, dbOptions);
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
  insertOne(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.insertOne(db, coll, filter, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @return {any}
   */
  isCapped(db, coll) {
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
  remove(db, coll, query, options, dbOptions) {
    return this.nodeTransport.remove(db, coll, query, options, dbOptions);
  }

  save(db, coll, doc, options, dbOptions) {
    return this.nodeTransport.save(db, coll, doc, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    hint: Optional<(String | Document)>;
   *    upsert: Optional<Boolean>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  replaceOne(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.replaceOne(db, coll, filter, options, dbOptions);
  }

  /**
   * @param {String} db - the db name
   * @param spec
   * @param options
   * @return {any}
   */
  runCommand(db, spec, options = {}) {
    return this.nodeTransport.runCommand(db, spec, options);
  }

  /**
   * @param {String} db - the db name
   * @param {String} coll - the collection name
   * @param filter
   * @param options
   *    arrayFilters: Optional<Array<Document>>;
   *    bypassDocumentValidation: Optional<Boolean>;
   *    collation: Optional<Document>;
   *    hint: Optional<(String | Document)>;
   *    upsert: Optional<Boolean>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  updateMany(db, coll, filter, options, dbOptions) {
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
   *    hint: Optional<(String | Document)>;
   *    upsert: Optional<Boolean>;
   * @param dbOptions
   *    writeConcern:
   *        j: Optional<Boolean>
   *        w: Optional<Int32 | String>
   *        wtimeoutMS: Optional<Int64>
   * @return {any}
   */
  updateOne(db, coll, filter, options, dbOptions) {
    return this.nodeTransport.updateOne(db, coll, filter, options, dbOptions);
  }
}

module.exports = CliServiceProvider;
