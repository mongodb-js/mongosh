export {
  AggregationCursor: {
    type: 'AggregationCursor',
    attributes: {
      bsonsize: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      close: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      forEach: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      hasNext: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      isClosed: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      isExhausted: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      itcount: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      map: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      next: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      objsLeftInBatch: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      toArray: { type: 'function', returnsPromise: false, returnType: 'Unknown' }
    }
  },
  BulkWriteResult: {
    type: 'BulkWriteResult',
    attributes: {

    }
  },
  Collection: {
    type: 'Collection',
    attributes: {
      aggregate: { type: 'function', returnsPromise: false, returnType: 'AggregationCursor' },
      bulkWrite: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      countDocuments: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      count: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      deleteMany: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      deleteOne: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      distinct: { type: 'function', returnsPromise: false, returnType: 'Cursor' },
      estimatedDocumentCount: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      find: { type: 'function', returnsPromise: false, returnType: 'Cursor' },
      findAndModify: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      findOne: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      findOneAndDelete: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      findOneAndReplace: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      findOneAndUpdate: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      insert: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      insertMany: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      insertOne: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      isCapped: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      remove: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      save: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      replaceOne: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      update: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      updateMany: { type: 'function', returnsPromise: true, returnType: 'Unknown' },
      updateOne: { type: 'function', returnsPromise: true, returnType: 'Unknown' }
    }
  },
  Cursor: {
    type: 'Cursor',
    attributes: {
      addOption: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      allowPartialResults: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      arrayAccess: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      batchSize: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      clone: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      close: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      collation: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      comment: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      count: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      explain: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      forEach: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      getQueryPlan: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      hasNext: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      hint: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      isClosed: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      isExhausted: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      itcount: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      length: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      limit: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      map: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      max: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      maxScan: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      maxTimeMS: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      min: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      modifiers: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      next: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      noCursorTimeout: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      objsLeftInBatch: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      oplogReplay: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      projection: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      pretty: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      readConcern: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      readOnly: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      readPref: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      returnKey: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      showDiskLoc: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      showRecordId: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      size: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      skip: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      snapshot: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      sort: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      tailable: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      toArray: { type: 'function', returnsPromise: false, returnType: 'Unknown' }
    }
  },
  Database: {
    type: 'Database',
    attributes: {
      runCommand: { type: 'function', returnsPromise: false, returnType: 'Unknown' }
    }
  },
  DeleteResult: {
    type: 'DeleteResult',
    attributes: {

    }
  },
  InsertManyResult: {
    type: 'InsertManyResult',
    attributes: {

    }
  },
  InsertOneResult: {
    type: 'InsertOneResult',
    attributes: {

    }
  },
  ReplicaSet: {
    type: 'ReplicaSet',
    attributes: {

    }
  },
  Shard: {
    type: 'Shard',
    attributes: {

    }
  },
  ShellApi: {
    type: 'ShellApi',
    attributes: {
      use: { type: 'function', returnsPromise: false, returnType: 'Unknown' },
      it: { type: 'function', returnsPromise: false, returnType: 'Unknown' }
    }
  },
  UpdateResult: {
    type: 'UpdateResult',
    attributes: {

    }
  }
};