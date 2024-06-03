import type {
  ServiceProvider,
  ServiceProviderAnyCursor,
  ServiceProviderAbstractCursor,
} from '@mongosh/service-provider-core';
import { ServiceProviderCore } from '@mongosh/service-provider-core';

export class DeepInspectServiceProviderWrapper
  extends ServiceProviderCore
  implements ServiceProvider
{
  _sp: ServiceProvider;

  constructor(sp: ServiceProvider) {
    super(sp.bsonLibrary);
    this._sp = sp;

    for (const prop of Object.keys(this)) {
      if (typeof (this as any)[prop] === 'function' && !(prop in sp)) {
        (this as any)[prop] = undefined;
      }
    }
  }

  aggregate = cursorMethod('aggregate');
  aggregateDb = cursorMethod('aggregateDb');
  count = bsonMethod('count');
  estimatedDocumentCount = bsonMethod('estimatedDocumentCount');
  countDocuments = bsonMethod('countDocuments');
  distinct = bsonMethod('distinct');
  find = cursorMethod('find');
  findOneAndDelete = bsonMethod('findOneAndDelete');
  findOneAndReplace = bsonMethod('findOneAndReplace');
  findOneAndUpdate = bsonMethod('findOneAndUpdate');
  getTopology = forwardedMethod('getTopology');
  getIndexes = bsonMethod('getIndexes');
  listCollections = bsonMethod('listCollections');
  readPreferenceFromOptions = forwardedMethod('readPreferenceFromOptions');
  watch = cursorMethod('watch');
  getSearchIndexes = bsonMethod('getSearchIndexes');
  runCommand = bsonMethod('runCommand');
  runCommandWithCheck = bsonMethod('runCommandWithCheck');
  runCursorCommand = cursorMethod('runCursorCommand');
  dropDatabase = bsonMethod('dropDatabase');
  dropCollection = bsonMethod('dropCollection');
  bulkWrite = bsonMethod('bulkWrite');
  deleteMany = bsonMethod('deleteMany');
  updateMany = bsonMethod('updateMany');
  updateOne = bsonMethod('updateOne');
  deleteOne = bsonMethod('deleteOne');
  createIndexes = bsonMethod('createIndexes');
  insertMany = bsonMethod('insertMany');
  insertOne = bsonMethod('insertOne');
  replaceOne = bsonMethod('replaceOne');
  initializeBulkOp = bsonMethod('initializeBulkOp');
  createSearchIndexes = bsonMethod('createSearchIndexes');
  close = forwardedMethod('close');
  suspend = forwardedMethod('suspend');
  renameCollection = bsonMethod('renameCollection');
  dropSearchIndex = bsonMethod('dropSearchIndex');
  updateSearchIndex = bsonMethod('updateSearchIndex');
  listDatabases = bsonMethod('listDatabases');
  authenticate = bsonMethod('authenticate');
  createCollection = bsonMethod('createCollection');
  getReadPreference = forwardedMethod('getReadPreference');
  getReadConcern = forwardedMethod('getReadConcern');
  getWriteConcern = forwardedMethod('getWriteConcern');

  get platform() {
    return this._sp.platform;
  }
  get initialDb() {
    return this._sp.initialDb;
  }
  getURI = forwardedMethod('getURI');
  getConnectionInfo = forwardedMethod('getConnectionInfo');
  resetConnectionOptions = forwardedMethod('resetConnectionOptions');
  startSession = forwardedMethod('startSession');
  getRawClient = forwardedMethod('getRawClient');
  createClientEncryption = forwardedMethod('createClientEncryption');
  getFleOptions = forwardedMethod('getFleOptions');
  createEncryptedCollection = forwardedMethod('createEncryptedCollection');

  async getNewConnection(
    ...args: Parameters<ServiceProvider['getNewConnection']>
  ): Promise<ServiceProvider> {
    return new DeepInspectServiceProviderWrapper(
      await this._sp.getNewConnection(...args)
    );
  }
}

const cursorBsonMethods: (keyof Partial<ServiceProviderAnyCursor>)[] = [
  'next',
  'tryNext',
  'readBufferedDocuments',
  'toArray',
  '',
];

type PickMethodsByReturnType<T, R> = {
  [k in keyof T as NonNullable<T[k]> extends (...args: any[]) => R
    ? k
    : never]: T[k];
};

function cursorMethod<
  K extends keyof PickMethodsByReturnType<
    ServiceProvider,
    ServiceProviderAnyCursor
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProvider>[K]>
) => ReturnType<Required<ServiceProvider>[K]> {
  return function (
    this: ServiceProvider,
    ...args: Parameters<ServiceProvider[K]>
  ): ReturnType<ServiceProvider[K]> {
    return this[key](...args);
  };
}

function bsonMethod<
  K extends keyof PickMethodsByReturnType<ServiceProvider, any>
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProvider>[K]>
) => ReturnType<Required<ServiceProvider>[K]> {
  return function (
    this: ServiceProvider,
    ...args: Parameters<Required<ServiceProvider>[K]>
  ): ReturnType<Required<ServiceProvider>[K]> {
    return this[key](...args);
  };
}

function forwardedMethod<
  K extends keyof PickMethodsByReturnType<ServiceProvider, any>
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProvider>[K]>
) => ReturnType<Required<ServiceProvider>[K]> {
  return function (
    this: ServiceProvider,
    ...args: Parameters<Required<ServiceProvider>[K]>
  ): ReturnType<Required<ServiceProvider>[K]> {
    return this[key](...args);
  };
}
