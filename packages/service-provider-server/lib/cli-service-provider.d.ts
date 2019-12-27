import { NodeTransport } from 'mongosh-transport-server';
import { Document, Cursor, Result } from 'mongosh-transport-core';
/**
 * Encapsulates logic for the service provider for the mongosh CLI.
 */
declare class CliServiceProvider {
    private readonly nodeTransport;
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
    aggregate(db: string, coll: string, pipeline: Document[], options: Document, dbOptions: Document): Cursor;
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
    aggregateDb(db: string, pipeline: Document[], options: Document, dbOptions: Document): Cursor;
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
    bulkWrite(db: string, coll: string, requests: Document, options: Document, dbOptions: Document): Promise<Result>;
    /**
     * Close the connection.
     *
     * @param {boolean} force - Whether to force close.
     */
    close(force: boolean): void;
    /**
     * Create a new CLI service provider from the provided URI.
     *
     * @param {String} uri - The URI.
     */
    connect(uri: string): Promise<CliServiceProvider>;
    /**
     * Instantiate the new service provider.
     *
     * @param {NodeTransport} nodeTransport - The node transport.
     */
    constructor(nodeTransport: NodeTransport);
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
    count(db: string, coll: string, query: Document, options: Document, dbOptions: Document): Promise<Result>;
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
    countDocuments(db: string, coll: string, filter: Document, options: Document): Promise<Result>;
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
    deleteMany(db: string, coll: string, filter: Document, options: Document, dbOptions: Document): Promise<Result>;
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
    deleteOne(db: string, coll: string, filter: Document, options: Document, dbOptions: Document): Promise<Result>;
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
    distinct(db: string, coll: string, field: string, options: Document, dbOptions: Document): Cursor;
    /**
     * @param {String} db - the db name
     * @param {String} coll - the collection name
     * @param filter
     * @param options
     *    maxTimeMS: Optional<Int64>;
     * @return {any}
     */
    estimatedDocumentCount(db: string, coll: string, filter: Document, options: Document): Promise<Result>;
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
    find(db: string, coll: string, query: Document, options?: Document): Cursor;
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
    findOneAndDelete(db: string, coll: string, filter: Document, options: Document): Promise<Result>;
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
    findOneAndReplace(db: string, coll: string, filter: Document, options: Document): Promise<Result>;
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
    findOneAndUpdate(db: string, coll: string, filter: Document, options: Document): Promise<Result>;
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
    insertMany(db: string, coll: string, docs: Document[], options: Document, dbOptions: Document): Promise<Result>;
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
    insertOne(db: string, coll: string, filter: Document, options: Document, dbOptions: Document): Promise<Result>;
    /**
     * @param {String} db - the db name
     * @param {String} coll - the collection name
     * @return {any}
     */
    isCapped(db: string, coll: string): Promise<Result>;
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
    remove(db: string, coll: string, query: Document, options: Document, dbOptions: Document): Promise<Result>;
    save(db: string, coll: string, doc: Document, options: Document, dbOptions: Document): Promise<Result>;
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
    replaceOne(db: string, coll: string, filter: Document, options: Document, dbOptions: Document): Promise<Result>;
    /**
     * @param {String} db - the db name
     * @param spec
     * @param options
     * @return {any}
     */
    runCommand(db: string, spec: Document, options?: Document): Promise<Result>;
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
    updateMany(db: string, coll: string, filter: Document, options: Document, dbOptions: Document): Promise<Result>;
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
    updateOne(db: string, coll: string, filter: Document, options: Document, dbOptions: Document): Promise<Result>;
}
export default CliServiceProvider;
