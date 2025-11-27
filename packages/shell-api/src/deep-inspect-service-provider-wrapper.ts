import type { ServiceProvider } from '@mongosh/service-provider-core';
import { DeepInspectAggregationCursorWrapper } from './deep-inspect-aggregation-cursor-wrapper';
import { DeepInspectFindCursorWrapper } from './deep-inspect-find-cursor-wrapper';
import { addCustomInspect } from './custom-inspect';
import type { PickMethodsByReturnType } from './pick-methods-by-return-type';
import { DeepInspectRunCommandCursorWrapper } from './deep-inspect-run-command-cursor-wrapper';
import { DeepInspectChangeStreamWrapper } from './deep-inspect-change-stream-wrapper';

export class DeepInspectServiceProviderWrapper implements ServiceProvider {
  _sp: ServiceProvider;

  deepInspectWrappable = false;

  constructor(sp: ServiceProvider) {
    this._sp = sp;
  }
  get bsonLibrary() {
    return this._sp.bsonLibrary;
  }

  aggregate = (...args: Parameters<ServiceProvider['aggregate']>) => {
    const cursor = this._sp.aggregate(...args);
    return new DeepInspectAggregationCursorWrapper(cursor);
  };
  aggregateDb = (...args: Parameters<ServiceProvider['aggregateDb']>) => {
    const cursor = this._sp.aggregateDb(...args);
    return new DeepInspectAggregationCursorWrapper(cursor);
  };
  count = forwardedMethod('count');
  estimatedDocumentCount = forwardedMethod('estimatedDocumentCount');
  countDocuments = forwardedMethod('countDocuments');
  distinct = bsonMethod('distinct');
  find = (...args: Parameters<ServiceProvider['find']>) => {
    const cursor = this._sp.find(...args);
    return new DeepInspectFindCursorWrapper(cursor);
  };
  findOneAndDelete = bsonMethod('findOneAndDelete');
  findOneAndReplace = bsonMethod('findOneAndReplace');
  findOneAndUpdate = bsonMethod('findOneAndUpdate');
  getTopologyDescription = forwardedMethod('getTopologyDescription');
  getIndexes = bsonMethod('getIndexes');
  listCollections = bsonMethod('listCollections');
  readPreferenceFromOptions = forwardedMethod('readPreferenceFromOptions');
  watch = (...args: Parameters<ServiceProvider['watch']>) => {
    const cursor = this._sp.watch(...args);
    return new DeepInspectChangeStreamWrapper(cursor);
  };
  getSearchIndexes = bsonMethod('getSearchIndexes');
  runCommand = bsonMethod('runCommand');
  runCommandWithCheck = bsonMethod('runCommandWithCheck');
  runCursorCommand = (
    ...args: Parameters<ServiceProvider['runCursorCommand']>
  ) => {
    const cursor = this._sp.runCursorCommand(...args);
    return new DeepInspectRunCommandCursorWrapper(cursor);
  };
  dropDatabase = bsonMethod('dropDatabase');
  dropCollection = forwardedMethod('dropCollection');
  bulkWrite = bsonMethod('bulkWrite');
  clientBulkWrite = bsonMethod('clientBulkWrite');
  deleteMany = bsonMethod('deleteMany');
  updateMany = bsonMethod('updateMany');
  updateOne = bsonMethod('updateOne');
  deleteOne = bsonMethod('deleteOne');
  createIndexes = bsonMethod('createIndexes');
  insertMany = bsonMethod('insertMany');
  insertOne = bsonMethod('insertOne');
  replaceOne = bsonMethod('replaceOne');
  initializeBulkOp = forwardedMethod('initializeBulkOp'); // you cannot extend the return value here
  createSearchIndexes = forwardedMethod('createSearchIndexes');
  close = forwardedMethod('close');
  suspend = forwardedMethod('suspend');
  renameCollection = forwardedMethod('renameCollection');
  dropSearchIndex = forwardedMethod('dropSearchIndex');
  updateSearchIndex = forwardedMethod('updateSearchIndex');
  listDatabases = bsonMethod('listDatabases');
  authenticate = forwardedMethod('authenticate');
  createCollection = forwardedMethod('createCollection');
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
    const sp = await this._sp.getNewConnection(...args);
    return new DeepInspectServiceProviderWrapper(sp);
  }
}

function bsonMethod<
  K extends keyof PickMethodsByReturnType<ServiceProvider, Promise<any>>
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProvider>[K]>
) => ReturnType<Required<ServiceProvider>[K]> {
  return async function (
    this: DeepInspectServiceProviderWrapper,
    ...args: Parameters<Required<ServiceProvider>[K]>
  ): // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore The returntype already contains a promise
  ReturnType<Required<ServiceProvider>[K]> {
    const result = await (this._sp[key] as any)(...args);
    addCustomInspect(result);
    return result;
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
    this: DeepInspectServiceProviderWrapper,
    ...args: Parameters<Required<ServiceProvider>[K]>
  ): ReturnType<Required<ServiceProvider>[K]> {
    // not wrapping the result at all because forwardedMethod() is for simple
    // values only
    return (this._sp[key] as any)(...args);
  };
}
