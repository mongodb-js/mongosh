const AggregationCursor = {
  type: 'AggregationCursor',
  attributes: {
    bsonsize: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    close: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    forEach: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    hasNext: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    isClosed: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    isExhausted: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    itcount: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    map: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    next: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    objsLeftInBatch: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    toArray: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] }
  }
};
const BulkWriteResult = {
  type: 'BulkWriteResult',
  attributes: {

  }
};
const Collection = {
  type: 'Collection',
  attributes: {
    aggregate: { type: 'function', returnsPromise: false, returnType: 'AggregationCursor', serverVersions: [
 0,
 4.4
] },
    bulkWrite: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    countDocuments: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 "4.0.3",
 4.4
] },
    count: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    deleteMany: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    deleteOne: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    distinct: { type: 'function', returnsPromise: false, returnType: 'Cursor', serverVersions: [
 0,
 4.4
] },
    estimatedDocumentCount: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 "4.0.3",
 4.4
] },
    find: { type: 'function', returnsPromise: false, returnType: 'Cursor', serverVersions: [
 0,
 4.4
] },
    findAndModify: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    findOne: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    findOneAndDelete: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    findOneAndReplace: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    findOneAndUpdate: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    insert: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    insertMany: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    insertOne: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    isCapped: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    remove: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    save: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    replaceOne: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    update: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    updateMany: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    updateOne: { type: 'function', returnsPromise: true, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] }
  }
};
const Cursor = {
  type: 'Cursor',
  attributes: {
    addOption: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 3.2
] },
    allowPartialResults: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    arrayAccess: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    batchSize: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    clone: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    close: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    collation: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 3.4,
 4.4
] },
    comment: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    count: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    explain: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    forEach: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    getQueryPlan: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    hasNext: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    hint: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    isClosed: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    isExhausted: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    itcount: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    length: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    limit: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    map: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    max: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    maxScan: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4
] },
    maxTimeMS: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    min: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    modifiers: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    next: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    noCursorTimeout: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    objsLeftInBatch: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    oplogReplay: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    projection: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    pretty: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    readConcern: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    readOnly: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    readPref: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    returnKey: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    showDiskLoc: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    showRecordId: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    size: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    skip: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    snapshot: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4
] },
    sort: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    tailable: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 3.2,
 4.4
] },
    toArray: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] }
  }
};
const Database = {
  type: 'Database',
  attributes: {
    runCommand: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] }
  }
};
const DeleteResult = {
  type: 'DeleteResult',
  attributes: {

  }
};
const InsertManyResult = {
  type: 'InsertManyResult',
  attributes: {

  }
};
const InsertOneResult = {
  type: 'InsertOneResult',
  attributes: {

  }
};
const ReplicaSet = {
  type: 'ReplicaSet',
  attributes: {

  }
};
const Shard = {
  type: 'Shard',
  attributes: {

  }
};
const ShellApi = {
  type: 'ShellApi',
  attributes: {
    use: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] },
    it: { type: 'function', returnsPromise: false, returnType: 'Unknown', serverVersions: [
 0,
 4.4
] }
  }
};
const UpdateResult = {
  type: 'UpdateResult',
  attributes: {

  }
};
export default {
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