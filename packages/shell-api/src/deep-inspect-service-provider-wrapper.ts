import type {
  ServiceProvider,
  ServiceProviderAbstractCursor,
} from '@mongosh/service-provider-core';
import { ServiceProviderCore } from '@mongosh/service-provider-core';
import type { InspectOptions, inspect as _inspect } from 'util';
import type { Document } from '@mongosh/service-provider-core';

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
  count = forwardedMethod('count');
  estimatedDocumentCount = forwardedMethod('estimatedDocumentCount');
  countDocuments = forwardedMethod('countDocuments');
  distinct = bsonMethod('distinct');
  find = cursorMethod('find');
  findOneAndDelete = bsonMethod('findOneAndDelete');
  findOneAndReplace = bsonMethod('findOneAndReplace');
  findOneAndUpdate = bsonMethod('findOneAndUpdate');
  getTopologyDescription = forwardedMethod('getTopologyDescription');
  getIndexes = bsonMethod('getIndexes');
  listCollections = bsonMethod('listCollections');
  readPreferenceFromOptions = forwardedMethod('readPreferenceFromOptions');
  // TODO: this should be a cursor method, but the types are incompatible
  watch = forwardedMethod('watch');
  getSearchIndexes = bsonMethod('getSearchIndexes');
  runCommand = bsonMethod('runCommand');
  runCommandWithCheck = bsonMethod('runCommandWithCheck');
  runCursorCommand = cursorMethod('runCursorCommand');
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
    return new DeepInspectServiceProviderWrapper(sp as ServiceProvider);
  }
}

type PickMethodsByReturnType<T, R> = {
  [k in keyof T as NonNullable<T[k]> extends (...args: any[]) => R
    ? k
    : never]: T[k];
};

function cursorMethod<
  K extends keyof PickMethodsByReturnType<
    ServiceProvider,
    ServiceProviderAbstractCursor
  >
>(
  key: K
): (
  ...args: Parameters<Required<ServiceProvider>[K]>
) => ReturnType<Required<ServiceProvider>[K]> {
  return function (
    this: DeepInspectServiceProviderWrapper,
    ...args: Parameters<ServiceProvider[K]>
  ): ReturnType<ServiceProvider[K]> {
    // The problem here is that ReturnType<ServiceProvider[K]> results in
    // ServiceProviderAnyCursor which includes ServiceProviderChangeStream which
    // doesn't have readBufferedDocuments or toArray. We can try cast things to
    // ServiceProviderAbstractCursor, but then that's not assignable to
    // ServiceProviderAnyCursor. And that's why there's so much casting below.
    const cursor = (this._sp[key] as any)(...args) as any;

    cursor.next = cursorNext(
      cursor.next.bind(cursor) as () => Promise<Document | null>
    );
    cursor.tryNext = cursorTryNext(
      cursor.tryNext.bind(cursor) as () => Promise<Document | null>
    );

    if (cursor.readBufferedDocuments) {
      cursor.readBufferedDocuments = cursorReadBufferedDocuments(
        cursor.readBufferedDocuments.bind(cursor) as (
          number?: number
        ) => Document[]
      );
    }
    if (cursor.toArray) {
      cursor.toArray = cursorToArray(
        cursor.toArray.bind(cursor) as () => Promise<Document[]>
      );
    }

    return cursor;
  };
}

const customInspectSymbol = Symbol.for('nodejs.util.inspect.custom');

function cursorNext(
  original: () => Promise<Document | null>
): () => Promise<Document | null> {
  return async function (): Promise<Document | null> {
    const result = await original();
    if (result) {
      replaceWithCustomInspect(result);
    }
    return result;
  };
}

const cursorTryNext = cursorNext;

function cursorReadBufferedDocuments(
  original: (number?: number) => Document[]
): (number?: number) => Document[] {
  return function (number?: number): Document[] {
    const results = original(number);

    replaceWithCustomInspect(results);

    return results;
  };
}

function cursorToArray(
  original: () => Promise<Document[]>
): () => Promise<Document[]> {
  return async function (): Promise<Document[]> {
    const results = await original();

    replaceWithCustomInspect(results);

    return results;
  };
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
    replaceWithCustomInspect(result);
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

function customDocumentInspect(
  this: Document,
  depth: number,
  inspectOptions: InspectOptions,
  inspect: typeof _inspect
) {
  const newInspectOptions = {
    ...inspectOptions,
    depth: Infinity,
    maxArrayLength: Infinity,
    maxStringLength: Infinity,
  };

  // reuse the standard inpect logic for an object without causing infinite
  // recursion
  const inspectBackup = (this as any)[customInspectSymbol];
  delete (this as any)[customInspectSymbol];
  const result = inspect(this, newInspectOptions);
  (this as any)[customInspectSymbol] = inspectBackup;
  return result;
}

function replaceWithCustomInspect(obj: any) {
  if (Array.isArray(obj)) {
    (obj as any)[customInspectSymbol] = customDocumentInspect;
    for (const item of obj) {
      replaceWithCustomInspect(item);
    }
  } else if (obj && typeof obj === 'object' && obj !== null) {
    obj[customInspectSymbol] = customDocumentInspect;
    for (const value of Object.values(obj)) {
      replaceWithCustomInspect(value);
    }
  }
}
