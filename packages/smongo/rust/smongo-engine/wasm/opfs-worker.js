// OPFS Worker - handles WASM + OPFS in worker context where sync access is available
import init, { WasmOpfsDatabase } from '../pkg/smongo_engine.js';
import { BSON } from '../node_modules/bson/lib/bson.mjs';

/** Keep in sync with opfs-wrapper.js OPFS_RPC_LIMITS (defense in depth). */
const MAX_DB_NAME_LEN = 128;
const MAX_COLL_LEN = 256;
const MAX_COLLECTIONS = 256;

let db = null;
let initInProgress = false;

/**
 * @param {number} id
 * @param {unknown} err
 * @param {string} [errorCode]
 */
function postErr(id, err, errorCode = 'OPFS_WORKER_ERROR') {
  const msg = err instanceof Error ? err.message : String(err);
  self.postMessage({ id, error: msg, errorCode });
}

/**
 * @param {unknown} name
 * @returns {name is string}
 */
function validDbName(name) {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name.length <= MAX_DB_NAME_LEN &&
    /^[a-zA-Z0-9._-]+$/.test(name) &&
    !name.includes('..') &&
    !name.startsWith('.') &&
    !name.endsWith('.')
  );
}

/**
 * @param {unknown} name
 * @returns {name is string}
 */
function validCollName(name) {
  return typeof name === 'string' && name.length > 0 && name.length <= MAX_COLL_LEN && /^[a-zA-Z0-9._-]+$/.test(name);
}

/**
 * @param {number} id
 * @returns {boolean}
 */
function requireDb(id) {
  if (!db) {
    postErr(id, new Error('Database not initialized; send init first'), 'OPFS_NOT_INITIALIZED');
    return false;
  }
  return true;
}

self.onmessage = async (e) => {
  const data = e.data;
  if (!data || typeof data !== 'object') {
    return;
  }
  const { id, type, payload } = data;
  if (typeof id !== 'number' || !Number.isFinite(id) || typeof type !== 'string') {
    return;
  }

  const p = payload && typeof payload === 'object' ? payload : {};

  try {
    switch (type) {
      case 'init': {
        if (db) {
          postErr(id, new Error('OPFS worker already initialized'), 'OPFS_ALREADY_INITIALIZED');
          break;
        }
        if (initInProgress) {
          postErr(id, new Error('OPFS worker init already in progress'), 'OPFS_ALREADY_INITIALIZED');
          break;
        }

        const { dbName, collections } = p;
        if (!validDbName(dbName)) {
          postErr(id, new Error('Invalid dbName in worker init'), 'OPFS_INVALID_DB_NAME');
          break;
        }
        if (!Array.isArray(collections) || collections.length === 0 || collections.length > MAX_COLLECTIONS) {
          postErr(id, new Error('collections must be a non-empty array'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        if (!collections.every((c) => validCollName(c))) {
          postErr(id, new Error('Invalid collection name in init'), 'OPFS_INVALID_COLLECTION');
          break;
        }

        initInProgress = true;
        try {
          await init();

          const root = await navigator.storage.getDirectory();
          const dbDir = await root.getDirectoryHandle(dbName, { create: true });

          for (const collName of collections) {
            await dbDir.getFileHandle(collName, { create: true });
          }

          const handlesMap = new Map();
          for await (const [tableName, entry] of dbDir.entries()) {
            if (entry.kind === 'file') {
              const fileHandle = await dbDir.getFileHandle(tableName);
              const syncHandle = await fileHandle.createSyncAccessHandle();
              handlesMap.set(tableName, syncHandle);
            }
          }

          db = new WasmOpfsDatabase(dbName, handlesMap);
          self.postMessage({ id, result: { success: true } });
        } catch (err) {
          postErr(id, err, 'OPFS_WORKER_ERROR');
        } finally {
          initInProgress = false;
        }
        break;
      }

      case 'insertOne': {
        if (!requireDb(id)) break;
        const { collection, doc } = p;
        if (!validCollName(collection) || doc === undefined || doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
          postErr(id, new Error('insertOne: invalid collection or doc'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const bytes = BSON.serialize(doc);
        const resultBytes = coll.insert_one(bytes);
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result });
        break;
      }

      case 'insertMany': {
        if (!requireDb(id)) break;
        const { collection, docs } = p;
        if (!validCollName(collection) || !Array.isArray(docs)) {
          postErr(id, new Error('insertMany: invalid collection or docs'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const bytes = BSON.serialize({ documents: docs });
        const resultBytes = coll.insert_many(bytes);
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result });
        break;
      }

      case 'findOne': {
        if (!requireDb(id)) break;
        const { collection, filter } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('findOne: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        const f = filter === undefined ? {} : filter;
        if (typeof f !== 'object' || f === null || Array.isArray(f)) {
          postErr(id, new Error('findOne: filter must be an object'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const bytes = BSON.serialize(f);
        const resultBytes = coll.find_one(bytes);
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result: result.__null ? null : result });
        break;
      }

      case 'find': {
        if (!requireDb(id)) break;
        const { collection, filter } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('find: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        const f = filter === undefined ? {} : filter;
        if (typeof f !== 'object' || f === null || Array.isArray(f)) {
          postErr(id, new Error('find: filter must be an object'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const bytes = BSON.serialize(f);
        const resultBytes = coll.find(bytes);
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result: result.results });
        break;
      }

      case 'findWithOptions': {
        if (!requireDb(id)) break;
        const { collection, filter, options } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('findWithOptions: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        const f = filter === undefined ? {} : filter;
        const o = options === undefined ? {} : options;
        if (typeof f !== 'object' || f === null || Array.isArray(f)) {
          postErr(id, new Error('findWithOptions: filter must be an object'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        if (typeof o !== 'object' || o === null || Array.isArray(o)) {
          postErr(id, new Error('findWithOptions: options must be an object'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const filterBytes = BSON.serialize(f);
        const optionsBytes = BSON.serialize(o);
        const resultBytes = coll.find_with_options(filterBytes, optionsBytes);
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result: result.results });
        break;
      }

      case 'countDocuments': {
        if (!requireDb(id)) break;
        const { collection, filter } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('countDocuments: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        const f = filter === undefined ? {} : filter;
        if (typeof f !== 'object' || f === null || Array.isArray(f)) {
          postErr(id, new Error('countDocuments: filter must be an object'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const bytes = BSON.serialize(f);
        const count = coll.count_documents(bytes);
        self.postMessage({ id, result: count });
        break;
      }

      case 'updateOne': {
        if (!requireDb(id)) break;
        const { collection, filter, update } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('updateOne: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        if (typeof filter !== 'object' || filter === null || Array.isArray(filter)) {
          postErr(id, new Error('updateOne: invalid filter'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        if (typeof update !== 'object' || update === null || Array.isArray(update)) {
          postErr(id, new Error('updateOne: invalid update'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const filterBytes = BSON.serialize(filter);
        const updateBytes = BSON.serialize(update);
        const resultBytes = coll.update_one(filterBytes, updateBytes);
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result });
        break;
      }

      case 'updateMany': {
        if (!requireDb(id)) break;
        const { collection, filter, update } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('updateMany: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        if (typeof filter !== 'object' || filter === null || Array.isArray(filter)) {
          postErr(id, new Error('updateMany: invalid filter'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        if (typeof update !== 'object' || update === null || Array.isArray(update)) {
          postErr(id, new Error('updateMany: invalid update'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const filterBytes = BSON.serialize(filter);
        const updateBytes = BSON.serialize(update);
        const resultBytes = coll.update_many(filterBytes, updateBytes);
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result });
        break;
      }

      case 'deleteOne': {
        if (!requireDb(id)) break;
        const { collection, filter } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('deleteOne: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        if (typeof filter !== 'object' || filter === null || Array.isArray(filter)) {
          postErr(id, new Error('deleteOne: filter must be an object'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const bytes = BSON.serialize(filter);
        const resultBytes = coll.delete_one(bytes);
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result });
        break;
      }

      case 'deleteMany': {
        if (!requireDb(id)) break;
        const { collection, filter } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('deleteMany: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        if (typeof filter !== 'object' || filter === null || Array.isArray(filter)) {
          postErr(id, new Error('deleteMany: filter must be an object'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const bytes = BSON.serialize(filter);
        const resultBytes = coll.delete_many(bytes);
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result });
        break;
      }

      case 'aggregate': {
        if (!requireDb(id)) break;
        const { collection, pipeline } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('aggregate: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        if (!Array.isArray(pipeline)) {
          postErr(id, new Error('aggregate: pipeline must be an array'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const bytes = BSON.serialize({ pipeline });
        const resultBytes = coll.aggregate(bytes);
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result: result.results });
        break;
      }

      case 'createIndex': {
        if (!requireDb(id)) break;
        const { collection, keys, options } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('createIndex: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        if (typeof keys !== 'object' || keys === null || Array.isArray(keys)) {
          postErr(id, new Error('createIndex: keys must be an object'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        const keysBytes = BSON.serialize(keys);
        const optionsBytes = options ? BSON.serialize(options) : new Uint8Array(0);
        const indexName = coll.create_index(keysBytes, optionsBytes);
        self.postMessage({ id, result: indexName });
        break;
      }

      case 'dropIndex': {
        if (!requireDb(id)) break;
        const { collection, indexName } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('dropIndex: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        if (typeof indexName !== 'string' || indexName.length === 0) {
          postErr(id, new Error('dropIndex: indexName must be a non-empty string'), 'OPFS_INVALID_PAYLOAD');
          break;
        }
        const coll = db.collection(collection);
        coll.drop_index(indexName);
        self.postMessage({ id, result: { success: true } });
        break;
      }

      case 'listIndexes': {
        if (!requireDb(id)) break;
        const { collection } = p;
        if (!validCollName(collection)) {
          postErr(id, new Error('listIndexes: invalid collection'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        const coll = db.collection(collection);
        const resultBytes = coll.list_indexes();
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result: result.indexes });
        break;
      }

      case 'listCollectionNames': {
        if (!requireDb(id)) break;
        const names = db.list_collection_names();
        self.postMessage({ id, result: names });
        break;
      }

      case 'dropCollection': {
        if (!requireDb(id)) break;
        const { name } = p;
        if (!validCollName(name)) {
          postErr(id, new Error('dropCollection: invalid name'), 'OPFS_INVALID_COLLECTION');
          break;
        }
        db.drop_collection(name);
        self.postMessage({ id, result: { success: true } });
        break;
      }

      case 'stats': {
        if (!requireDb(id)) break;
        const resultBytes = db.stats();
        const result = BSON.deserialize(new Uint8Array(resultBytes));
        self.postMessage({ id, result });
        break;
      }

      case 'shutdown': {
        if (initInProgress) {
          postErr(id, new Error('Cannot shutdown while init is in progress'), 'OPFS_WORKER_ERROR');
          break;
        }
        if (db) {
          db.free();
          db = null;
        }
        self.postMessage({ id, result: { success: true } });
        break;
      }

      default:
        postErr(id, new Error(`Unknown message type: ${type}`), 'OPFS_INVALID_REQUEST');
    }
  } catch (error) {
    postErr(id, error, 'OPFS_WORKER_ERROR');
  }
};
