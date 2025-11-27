import type { ServiceProvider } from '@mongosh/service-provider-core';
import { deepInspectCursorWrapper } from './cursor-wrapper';
import { addCustomInspect } from './custom-inspect';
import type { PickMethodsByReturnType } from './ts-helpers';

export function deepInspectServiceProviderWrapper(
  sp: ServiceProvider
): ServiceProvider {
  return {
    get bsonLibrary() {
      return sp.bsonLibrary;
    },
    aggregate: (...args: Parameters<ServiceProvider['aggregate']>) => {
      const cursor = sp.aggregate(...args);
      return deepInspectCursorWrapper(cursor);
    },
    aggregateDb: (...args: Parameters<ServiceProvider['aggregateDb']>) => {
      const cursor = sp.aggregateDb(...args);
      return deepInspectCursorWrapper(cursor);
    },
    count: forwardedMethod('count', sp),
    estimatedDocumentCount: forwardedMethod('estimatedDocumentCount', sp),
    countDocuments: forwardedMethod('countDocuments', sp),
    distinct: bsonMethod('distinct', sp),
    find: (...args: Parameters<ServiceProvider['find']>) => {
      const cursor = sp.find(...args);
      return deepInspectCursorWrapper(cursor);
    },
    findOneAndDelete: bsonMethod('findOneAndDelete', sp),
    findOneAndReplace: bsonMethod('findOneAndReplace', sp),
    findOneAndUpdate: bsonMethod('findOneAndUpdate', sp),
    getTopologyDescription: forwardedMethod('getTopologyDescription', sp),
    getIndexes: bsonMethod('getIndexes', sp),
    listCollections: bsonMethod('listCollections', sp),
    readPreferenceFromOptions: forwardedMethod('readPreferenceFromOptions', sp),
    watch: (...args: Parameters<ServiceProvider['watch']>) => {
      const cursor = sp.watch(...args);
      return deepInspectCursorWrapper(cursor);
    },
    getSearchIndexes: bsonMethod('getSearchIndexes', sp),
    runCommand: bsonMethod('runCommand', sp),
    runCommandWithCheck: bsonMethod('runCommandWithCheck', sp),
    runCursorCommand: (
      ...args: Parameters<ServiceProvider['runCursorCommand']>
    ) => {
      const cursor = sp.runCursorCommand(...args);
      return deepInspectCursorWrapper(cursor);
    },
    dropDatabase: bsonMethod('dropDatabase', sp),
    dropCollection: forwardedMethod('dropCollection', sp),
    bulkWrite: bsonMethod('bulkWrite', sp),
    clientBulkWrite: bsonMethod('clientBulkWrite', sp),
    deleteMany: bsonMethod('deleteMany', sp),
    updateMany: bsonMethod('updateMany', sp),
    updateOne: bsonMethod('updateOne', sp),
    deleteOne: bsonMethod('deleteOne', sp),
    createIndexes: bsonMethod('createIndexes', sp),
    insertMany: bsonMethod('insertMany', sp),
    insertOne: bsonMethod('insertOne', sp),
    replaceOne: bsonMethod('replaceOne', sp),
    initializeBulkOp: forwardedMethod('initializeBulkOp', sp), // you cannot extend the return value here
    createSearchIndexes: forwardedMethod('createSearchIndexes', sp),
    close: forwardedMethod('close', sp),
    suspend: forwardedMethod('suspend', sp),
    renameCollection: forwardedMethod('renameCollection', sp),
    dropSearchIndex: forwardedMethod('dropSearchIndex', sp),
    updateSearchIndex: forwardedMethod('updateSearchIndex', sp),
    listDatabases: bsonMethod('listDatabases', sp),
    authenticate: forwardedMethod('authenticate', sp),
    createCollection: forwardedMethod('createCollection', sp),
    getReadPreference: forwardedMethod('getReadPreference', sp),
    getReadConcern: forwardedMethod('getReadConcern', sp),
    getWriteConcern: forwardedMethod('getWriteConcern', sp),
    get platform() {
      return sp.platform;
    },
    get initialDb() {
      return sp.initialDb;
    },
    getURI: forwardedMethod('getURI', sp),
    getConnectionInfo: forwardedMethod('getConnectionInfo', sp),
    resetConnectionOptions: forwardedMethod('resetConnectionOptions', sp),
    startSession: forwardedMethod('startSession', sp),
    getRawClient: forwardedMethod('getRawClient', sp),
    createClientEncryption: forwardedMethod('createClientEncryption', sp),
    getFleOptions: forwardedMethod('getFleOptions', sp),
    createEncryptedCollection: forwardedMethod('createEncryptedCollection', sp),
    async getNewConnection(
      ...args: Parameters<ServiceProvider['getNewConnection']>
    ): Promise<ServiceProvider> {
      const newSp = await sp.getNewConnection(...args);
      return deepInspectServiceProviderWrapper(newSp);
    },
  };
}

function bsonMethod<
  K extends keyof PickMethodsByReturnType<ServiceProvider, Promise<any>>
>(key: K, sp: ServiceProvider): ServiceProvider[K] {
  if (!sp[key]) return undefined as ServiceProvider[K];
  return async function (
    ...args: Parameters<Required<ServiceProvider>[K]>
  ): // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore The returntype already contains a promise
  ReturnType<Required<ServiceProvider>[K]> {
    const result = await (sp[key] as any)(...args);
    addCustomInspect(result);
    return result;
  } as ServiceProvider[K];
}

function forwardedMethod<
  K extends keyof PickMethodsByReturnType<ServiceProvider, any>
>(key: K, sp: ServiceProvider): ServiceProvider[K] {
  if (!sp[key]) return undefined as ServiceProvider[K];
  return function (
    ...args: Parameters<Required<ServiceProvider>[K]>
  ): ReturnType<Required<ServiceProvider>[K]> {
    // not wrapping the result at all because forwardedMethod() is for simple
    // values only
    return (sp[key] as any)(...args);
  } as ServiceProvider[K];
}
