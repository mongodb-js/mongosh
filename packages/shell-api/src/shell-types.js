const unknown = {
  type: 'unknown',
  attributes: {}
};
const AggregationCursor = {
  type: 'AggregationCursor',
  hasAsyncChild: false,
  attributes: {
    bsonsize: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    close: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    forEach: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    hasNext: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    isClosed: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    isExhausted: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    itcount: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    map: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    next: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    objsLeftInBatch: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    toArray: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] }
  }
};
const BulkWriteResult = {
  type: 'BulkWriteResult',
  hasAsyncChild: false,
  attributes: {

  }
};
const Collection = {
  type: 'Collection',
  hasAsyncChild: true,
  attributes: {
    aggregate: { type: 'function', returnsPromise: false, returnType: 'AggregationCursor', serverVersions: ['0.0.0', '4.4.0'] },
    bulkWrite: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    countDocuments: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['4.0.3', '4.4.0'] },
    count: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    deleteMany: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    deleteOne: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    distinct: { type: 'function', returnsPromise: false, returnType: 'Cursor', serverVersions: ['0.0.0', '4.4.0'] },
    estimatedDocumentCount: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['4.0.3', '4.4.0'] },
    find: { type: 'function', returnsPromise: false, returnType: 'Cursor', serverVersions: ['0.0.0', '4.4.0'] },
    findAndModify: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    findOne: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    findOneAndDelete: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    findOneAndReplace: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    findOneAndUpdate: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    insert: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    insertMany: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    insertOne: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    isCapped: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    remove: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    save: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    replaceOne: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    update: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    updateMany: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    updateOne: { type: 'function', returnsPromise: true, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] }
  }
};
const Cursor = {
  type: 'Cursor',
  hasAsyncChild: false,
  attributes: {
    addOption: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '3.2.0'] },
    allowPartialResults: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    arrayAccess: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    batchSize: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    clone: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    close: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    collation: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['3.4.0', '4.4.0'] },
    comment: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    count: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    explain: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    forEach: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    getQueryPlan: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    hasNext: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    hint: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    isClosed: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    isExhausted: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    itcount: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    length: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    limit: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    map: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    max: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    maxScan: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.0.0'] },
    maxTimeMS: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    min: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    modifiers: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    next: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    noCursorTimeout: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    objsLeftInBatch: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    oplogReplay: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    projection: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    pretty: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    readConcern: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    readOnly: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    readPref: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    returnKey: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    showDiskLoc: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    showRecordId: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    size: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    skip: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    snapshot: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.0.0'] },
    sort: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    tailable: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['3.2.0', '4.4.0'] },
    toArray: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] }
  }
};
const Database = {
  type: 'Database',
  hasAsyncChild: true,
  attributes: {
    runCommand: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] }
  }
};
const DeleteResult = {
  type: 'DeleteResult',
  hasAsyncChild: false,
  attributes: {

  }
};
const InsertManyResult = {
  type: 'InsertManyResult',
  hasAsyncChild: false,
  attributes: {

  }
};
const InsertOneResult = {
  type: 'InsertOneResult',
  hasAsyncChild: false,
  attributes: {

  }
};
const ReplicaSet = {
  type: 'ReplicaSet',
  hasAsyncChild: false,
  attributes: {

  }
};
const Shard = {
  type: 'Shard',
  hasAsyncChild: false,
  attributes: {

  }
};
const ShellApi = {
  type: 'ShellApi',
  hasAsyncChild: false,
  attributes: {
    use: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    it: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] },
    show: { type: 'function', returnsPromise: false, returnType: 'unknown', serverVersions: ['0.0.0', '4.4.0'] }
  }
};
const UpdateResult = {
  type: 'UpdateResult',
  hasAsyncChild: false,
  attributes: {

  }
};
export {
  unknown,
  AggregationCursor,
  BulkWriteResult,
  Collection,
  Cursor,
  Database,
  DeleteResult,
  InsertManyResult,
  InsertOneResult,
  ReplicaSet,
  Shard,
  ShellApi,
  UpdateResult
};
