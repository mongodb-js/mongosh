// smongo WASM wrapper: Friendlier JavaScript API over raw wasm-bindgen exports
//
// Provides automatic BSON serialization/deserialization using MongoDB's official
// `bson` package. This layer keeps the wasm-bindgen boundary clean (raw bytes only)
// while giving JavaScript users a natural object-based API.
//
// In-memory only. For persistent OPFS (worker + Web Locks + multi-tab RPC), use
// opfs-wrapper.js or smongo-browser.js.

import init, { WasmDatabase } from '../pkg/smongo_engine.js';
import { BSON } from '../node_modules/bson/lib/bson.mjs';

/** Normalize BSON serialization and WASM errors into a consistent Error shape. */
function wrapErr(fn) {
  try { return fn(); }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`[smongo] ${msg}`);
  }
}

/**
 * Initialize the WASM module. Must be called once before using Database/Collection.
 * @returns {Promise<void>}
 */
export async function initSmongo() {
  await init();
}

/**
 * Database handle (in-memory storage).
 */
export class Database {
  /**
   * @param {string} name - Database name
   */
  constructor(name) {
    this._db = new WasmDatabase(name);
  }

  /**
   * @param {string} name - Collection name
   * @returns {Collection}
   */
  collection(name) {
    const wasmColl = this._db.collection(name);
    return new Collection(wasmColl);
  }

  /** @returns {string[]} */
  listCollectionNames() {
    return this._db.list_collection_names();
  }

  /** @param {string} name */
  dropCollection(name) {
    this._db.drop_collection(name);
  }

  /** @returns {Object} */
  stats() {
    return wrapErr(() => {
      const resultBytes = this._db.stats();
      return BSON.deserialize(new Uint8Array(resultBytes));
    });
  }
}

/**
 * Collection handle for CRUD, aggregation, and index operations.
 */
export class Collection {
  constructor(wasmColl) {
    this._coll = wasmColl;
  }

  /**
   * @param {Object} doc
   * @returns {Object} Result with insertedId field
   */
  insertOne(doc) {
    return wrapErr(() => {
      const bytes = BSON.serialize(doc);
      const resultBytes = this._coll.insert_one(bytes);
      return BSON.deserialize(new Uint8Array(resultBytes));
    });
  }

  /**
   * @param {Object[]} docs
   * @returns {Object} Result with insertedIds array
   */
  insertMany(docs) {
    return wrapErr(() => {
      const bytes = BSON.serialize({ documents: docs });
      const resultBytes = this._coll.insert_many(bytes);
      return BSON.deserialize(new Uint8Array(resultBytes));
    });
  }

  /**
   * @param {Object} filter
   * @returns {Object|null}
   */
  findOne(filter = {}) {
    return wrapErr(() => {
      const bytes = BSON.serialize(filter);
      const resultBytes = this._coll.find_one(bytes);
      const result = BSON.deserialize(new Uint8Array(resultBytes));
      if (result.__null) return null;
      return result;
    });
  }

  /**
   * @param {Object} filter
   * @returns {Object[]}
   */
  find(filter = {}) {
    return wrapErr(() => {
      const bytes = BSON.serialize(filter);
      const resultBytes = this._coll.find(bytes);
      const result = BSON.deserialize(new Uint8Array(resultBytes));
      return result.results;
    });
  }

  /**
   * @param {Object} filter
   * @param {Object} options - { limit?, skip?, sort?, projection? }
   * @returns {Object[]}
   */
  findWithOptions(filter, options) {
    return wrapErr(() => {
      const filterBytes = BSON.serialize(filter);
      const optionsBytes = BSON.serialize(options);
      const resultBytes = this._coll.find_with_options(filterBytes, optionsBytes);
      const result = BSON.deserialize(new Uint8Array(resultBytes));
      return result.results;
    });
  }

  /**
   * @param {Object} filter
   * @returns {number}
   */
  countDocuments(filter = {}) {
    return wrapErr(() => {
      const bytes = BSON.serialize(filter);
      return this._coll.count_documents(bytes);
    });
  }

  /**
   * @param {Object} filter
   * @param {Object} update
   * @returns {Object} Result with matchedCount and modifiedCount
   */
  updateOne(filter, update) {
    return wrapErr(() => {
      const filterBytes = BSON.serialize(filter);
      const updateBytes = BSON.serialize(update);
      const resultBytes = this._coll.update_one(filterBytes, updateBytes);
      return BSON.deserialize(new Uint8Array(resultBytes));
    });
  }

  /**
   * @param {Object} filter
   * @param {Object} update
   * @returns {Object} Result with matchedCount and modifiedCount
   */
  updateMany(filter, update) {
    return wrapErr(() => {
      const filterBytes = BSON.serialize(filter);
      const updateBytes = BSON.serialize(update);
      const resultBytes = this._coll.update_many(filterBytes, updateBytes);
      return BSON.deserialize(new Uint8Array(resultBytes));
    });
  }

  /**
   * @param {Object} filter
   * @returns {Object} Result with deletedCount
   */
  deleteOne(filter) {
    return wrapErr(() => {
      const bytes = BSON.serialize(filter);
      const resultBytes = this._coll.delete_one(bytes);
      return BSON.deserialize(new Uint8Array(resultBytes));
    });
  }

  /**
   * @param {Object} filter
   * @returns {Object} Result with deletedCount
   */
  deleteMany(filter) {
    return wrapErr(() => {
      const bytes = BSON.serialize(filter);
      const resultBytes = this._coll.delete_many(bytes);
      return BSON.deserialize(new Uint8Array(resultBytes));
    });
  }

  /**
   * @param {Object[]} pipeline - Array of aggregation stage documents
   * @returns {Object[]}
   */
  aggregate(pipeline) {
    return wrapErr(() => {
      const bytes = BSON.serialize({ pipeline });
      const resultBytes = this._coll.aggregate(bytes);
      const result = BSON.deserialize(new Uint8Array(resultBytes));
      return result.results;
    });
  }

  /**
   * @param {Object} keys - Index key specification (e.g. { name: 1 })
   * @param {Object} [options] - Index options (unique, sparse, etc.)
   * @returns {string} Index name
   */
  createIndex(keys, options = {}) {
    return wrapErr(() => {
      const keysBytes = BSON.serialize(keys);
      const optionsBytes = BSON.serialize(options);
      return this._coll.create_index(keysBytes, optionsBytes);
    });
  }

  /** @param {string} indexName */
  dropIndex(indexName) {
    wrapErr(() => {
      this._coll.drop_index(indexName);
    });
  }

  /** @returns {Object[]} */
  listIndexes() {
    return wrapErr(() => {
      const resultBytes = this._coll.list_indexes();
      const result = BSON.deserialize(new Uint8Array(resultBytes));
      return result.indexes;
    });
  }
}
