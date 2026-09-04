/**
 * Canonical browser entry point — same WASM (`pkg/`), two first-class storage modes:
 *
 * - **Ephemeral:** `initSmongo()`, `new Database(name)` — main thread, MemBackend in WASM.
 * - **Persistent:** `initOpfsDatabase(dbName, collections)` — dedicated worker, OPFS, Web Locks,
 *   multi-tab RPC (`reconnectOpfsDatabase`, `closeOpfsDatabase`, `wipeOpfsDatabaseDirectory`).
 *
 * Applications should import from this module. Lower-level modules (`wrapper.js`, `opfs-wrapper.js`)
 * remain for tree-shaking, tests, and demos that exercise one path in isolation.
 */

export { initSmongo, Database, Collection } from './wrapper.js';
export {
  initOpfsDatabase,
  reconnectOpfsDatabase,
  closeOpfsDatabase,
  wipeOpfsDatabaseDirectory,
  assertValidDbName,
  OpfsError,
  OPFS_ERROR_CODES,
  OPFS_RPC_LIMITS,
  isOpfsError,
  configureOpfsDebug,
  OpfsDatabase,
  OpfsCollection,
} from './opfs-wrapper.js';
