// OPFS wrapper — single OPFS owner per dbName (Web Lock) + BroadcastChannel RPC for other tabs.
//
// Security model (same-origin):
//   BroadcastChannel is restricted to the browsing context origin. Any same-origin page (including
//   iframes) can post to the channel; this layer validates shape, size, and op allow-lists so
//   arbitrary code cannot drive the worker with unbounded or malformed payloads. For hostile
//   same-origin content, isolate the app in a dedicated origin or use COOP/COEP + CSP as appropriate.
//
// RPC protocol (channel: `smongo-opfs-rpc-${encodeURIComponent(safeDbName)}`):
//   Request:  { type: 'rpc', v: 1, requestId: string, op: string, payload: object }
//   Response: { type: 'rpc-resp', v: 1, requestId, ok, result?, error?, errorCode? } (errorCode = stable OpfsError.code)
//   Lifecycle: { type: 'owner-lost', v: 1, dbName }
//
// Ops forwarded to worker: insertOne, find, countDocuments, deleteMany, updateMany
// Ops on owner main thread only: ping, closeDb
//
// Without Web Locks API: owner-only mode (single tab); multi-tab RPC clients are not supported.
//
// After owner tab closes or RPC fails: call reconnectOpfsDatabase(dbName, collections) to clear
// caches and run initOpfsDatabase again (may acquire the lock or become RPC client).

/** Protocol version — bump if envelope fields change */
const RPC_VERSION = 1;

/** @readonly */
export const OPFS_RPC_LIMITS = Object.freeze({
  maxDbNameLength: 128,
  maxCollectionNameLength: 256,
  maxRequestIdLength: 128,
  maxPayloadWeight: 2_000_000,
  maxObjectDepth: 48,
  maxClientPendingRpc: 64,
  defaultTimeoutMs: 30_000,
  pingTimeoutMs: 2_000,
  pingAttempts: 8,
  pingBackoffMs: 200,
  /** Max time waiting for a dedicated-worker round-trip (init, CRUD, shutdown). */
  workerMessageTimeoutMs: 90_000,
});

/** Stable machine-readable codes for `instanceof OpfsError` / monitoring. */
export const OPFS_ERROR_CODES = Object.freeze({
  INVALID_DB_NAME: 'OPFS_INVALID_DB_NAME',
  INVALID_COLLECTION: 'OPFS_INVALID_COLLECTION',
  INVALID_PAYLOAD: 'OPFS_INVALID_PAYLOAD',
  INVALID_REQUEST: 'OPFS_INVALID_REQUEST',
  RPC_UNKNOWN_OP: 'OPFS_RPC_UNKNOWN_OP',
  RPC_TIMEOUT: 'OPFS_RPC_TIMEOUT',
  RPC_TOO_MANY_IN_FLIGHT: 'OPFS_RPC_TOO_MANY_IN_FLIGHT',
  OWNER_LOST: 'OPFS_OWNER_LOST',
  RECONNECTING: 'OPFS_RECONNECTING',
  WORKER_ERROR: 'OPFS_WORKER_ERROR',
  WORKER_MESSAGE_TIMEOUT: 'OPFS_WORKER_MESSAGE_TIMEOUT',
  NOT_INITIALIZED: 'OPFS_NOT_INITIALIZED',
  ALREADY_OPEN_ELSEWHERE: 'OPFS_ALREADY_OPEN_ELSEWHERE',
  OWNER_UNAVAILABLE: 'OPFS_OWNER_UNAVAILABLE',
  ALREADY_INITIALIZED: 'OPFS_ALREADY_INITIALIZED',
});

export class OpfsError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {{ cause?: unknown }} [opts]
   */
  constructor(message, code, opts = {}) {
    super(message);
    this.name = 'OpfsError';
    /** @type {string} */
    this.code = code;
    if (opts.cause !== undefined) {
      this.cause = opts.cause;
    }
  }
}

/** @param {unknown} e */
export function isOpfsError(e) {
  return e instanceof OpfsError;
}

let opfsDebug = false;

/**
 * Verbose logging for ownership and RPC edges. Off by default; enable for debugging or support.
 * @param {{ enabled?: boolean }} opts
 */
export function configureOpfsDebug(opts = {}) {
  if (typeof opts.enabled === 'boolean') {
    opfsDebug = opts.enabled;
  }
}

function dlog(...args) {
  if (opfsDebug) {
    console.log('[smongo-opfs]', ...args);
  }
}

const WORKER_OPS = new Set([
  'insertOne', 'insertMany',
  'findOne', 'find', 'findWithOptions',
  'countDocuments',
  'updateOne', 'updateMany',
  'deleteOne', 'deleteMany',
  'aggregate',
  'createIndex', 'dropIndex', 'listIndexes',
  'listCollectionNames', 'dropCollection', 'stats',
]);
const OWNER_LOCAL_OPS = new Set(['ping', 'closeDb']);

let worker = null;
let nextId = 0;
const pending = new Map();
const broadcast = new BroadcastChannel('smongo-opfs');
const tabId = Math.random().toString(36).substring(2, 8);

let isOwner = false;

/** @type {{ active: boolean, timeoutId: ReturnType<typeof setTimeout> | null, reject: ((e: Error) => void) | null } | null} */
let claiming = null;

/** @type {Map<string, () => void>} */
const opfsLockReleasers = new Map();

/** @type {Map<string, 'owner' | 'client'>} */
const tabRoleByDb = new Map();

/** @type {Map<string, BroadcastChannel>} */
const rpcServersByDb = new Map();

/** @type {Map<string, BroadcastChannel>} */
const rpcClientChannelsByDb = new Map();

/**
 * In-flight client RPC per dbName (isolated so one database never cancels another's waiters).
 * @type {Map<string, Map<string, { resolve: (v: unknown) => void, reject: (e: Error) => void, timeoutId: ReturnType<typeof setTimeout> }>>}
 */
const clientRpcPendingByDb = new Map();

/** Serialize owner-side RPC handling per dbName (single worker, strict ordering). */
/** @type {Map<string, Promise<void>>} */
const ownerRpcTail = new Map();

const LOCKS_SUPPORTED =
  typeof globalThis !== 'undefined' &&
  globalThis.navigator &&
  globalThis.navigator.locks &&
  typeof globalThis.navigator.locks.request === 'function';

/**
 * @param {string} dbName
 * @returns {string}
 */
function rpcChannelName(dbName) {
  return `smongo-opfs-rpc-${encodeURIComponent(dbName)}`;
}

/**
 * @param {string} name
 * @returns {string} validated name
 */
export function assertValidDbName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new OpfsError('OPFS database name must be a non-empty string', OPFS_ERROR_CODES.INVALID_DB_NAME);
  }
  if (name.length > OPFS_RPC_LIMITS.maxDbNameLength) {
    throw new OpfsError(
      `OPFS database name exceeds ${OPFS_RPC_LIMITS.maxDbNameLength} characters`,
      OPFS_ERROR_CODES.INVALID_DB_NAME,
    );
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new OpfsError(
      'OPFS database name may only contain letters, digits, ".", "_", and "-" (no path segments)',
      OPFS_ERROR_CODES.INVALID_DB_NAME,
    );
  }
  if (name.includes('..') || name.startsWith('.') || name.endsWith('.')) {
    throw new OpfsError('OPFS database name must not use "." path tricks', OPFS_ERROR_CODES.INVALID_DB_NAME);
  }
  return name;
}

/**
 * @param {string} name
 * @returns {string}
 */
function assertValidCollectionName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new OpfsError('Collection name must be a non-empty string', OPFS_ERROR_CODES.INVALID_COLLECTION);
  }
  if (name.length > OPFS_RPC_LIMITS.maxCollectionNameLength) {
    throw new OpfsError(
      `Collection name exceeds ${OPFS_RPC_LIMITS.maxCollectionNameLength} characters`,
      OPFS_ERROR_CODES.INVALID_COLLECTION,
    );
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    throw new OpfsError('Collection name has invalid characters', OPFS_ERROR_CODES.INVALID_COLLECTION);
  }
  return name;
}

/**
 * Strict plain object for untrusted RPC envelopes (BroadcastChannel same-origin).
 * @param {unknown} o
 * @returns {o is Record<string, unknown>}
 */
function isPlainObjectEnvelope(o) {
  if (o === null || typeof o !== 'object' || Array.isArray(o)) {
    return false;
  }
  const proto = Object.getPrototypeOf(o);
  return proto === Object.prototype || proto === null;
}

/**
 * Approximate "weight" for DoS bounds (not exact byte size; avoids JSON breaking BSON dates).
 * @param {unknown} val
 * @param {number} depth
 * @returns {number}
 */
function estimatePayloadWeight(val, depth = 0) {
  if (depth > OPFS_RPC_LIMITS.maxObjectDepth) {
    throw new OpfsError('RPC payload nesting too deep', OPFS_ERROR_CODES.INVALID_PAYLOAD);
  }
  const t = typeof val;
  if (val === null || t === 'undefined' || t === 'boolean' || t === 'number' || t === 'bigint') {
    return 8;
  }
  if (t === 'string') {
    return val.length * 2 + 8;
  }
  if (val instanceof Date) {
    return 32;
  }
  if (Array.isArray(val)) {
    let w = 16;
    for (let i = 0; i < val.length; i++) {
      w += estimatePayloadWeight(val[i], depth + 1);
      if (w > OPFS_RPC_LIMITS.maxPayloadWeight) {
        throw new OpfsError('RPC payload too large', OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
    }
    return w;
  }
  if (t === 'object') {
    if (val instanceof Promise) {
      throw new OpfsError('RPC payload cannot contain Promise values', OPFS_ERROR_CODES.INVALID_PAYLOAD);
    }
    if (val instanceof Map || val instanceof Set || val instanceof WeakMap || val instanceof WeakSet) {
      throw new OpfsError('RPC payload cannot contain Map/Set/WeakMap/WeakSet', OPFS_ERROR_CODES.INVALID_PAYLOAD);
    }
    let w = 16;
    for (const k of Object.keys(val)) {
      if (k.length > 1024) {
        throw new OpfsError('RPC payload key too long', OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      w += k.length * 2;
      w += estimatePayloadWeight(/** @type {Record<string, unknown>} */ (val)[k], depth + 1);
      if (w > OPFS_RPC_LIMITS.maxPayloadWeight) {
        throw new OpfsError('RPC payload too large', OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
    }
    return w;
  }
  throw new OpfsError(`RPC payload disallowed type: ${t}`, OPFS_ERROR_CODES.INVALID_PAYLOAD);
}

/**
 * @param {unknown} payload
 */
function validateAndWeighPayload(payload) {
  if (!isPlainObjectEnvelope(payload)) {
    throw new OpfsError('RPC payload must be a plain object', OPFS_ERROR_CODES.INVALID_PAYLOAD);
  }
  estimatePayloadWeight(payload, 0);
}

/**
 * @param {string} op
 * @param {Record<string, unknown>} p
 */
function validateWorkerPayloadShape(op, p) {
  // Database-level ops don't require a collection field
  if (op === 'listCollectionNames' || op === 'stats') {
    return;
  }
  if (op === 'dropCollection') {
    assertValidCollectionName(typeof p.name === 'string' ? p.name : '');
    return;
  }

  const coll = p.collection;
  assertValidCollectionName(typeof coll === 'string' ? coll : '');

  switch (op) {
    case 'insertOne': {
      if (!p.doc || typeof p.doc !== 'object' || Array.isArray(p.doc)) {
        throw new OpfsError('insertOne requires a non-array object doc', OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      estimatePayloadWeight(p.doc, 0);
      break;
    }
    case 'insertMany': {
      if (!Array.isArray(p.docs)) {
        throw new OpfsError('insertMany requires a docs array', OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      estimatePayloadWeight(p.docs, 0);
      break;
    }
    case 'findOne':
    case 'find':
    case 'countDocuments':
    case 'deleteOne':
    case 'deleteMany': {
      const f = p.filter;
      if (f === undefined) break;
      if (typeof f !== 'object' || f === null || Array.isArray(f)) {
        throw new OpfsError(`${op} filter must be a plain object`, OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      estimatePayloadWeight(f, 0);
      break;
    }
    case 'findWithOptions': {
      const f = p.filter;
      if (f !== undefined && (typeof f !== 'object' || f === null || Array.isArray(f))) {
        throw new OpfsError('findWithOptions filter must be a plain object', OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      if (f !== undefined) estimatePayloadWeight(f, 0);
      const o = p.options;
      if (o !== undefined && (typeof o !== 'object' || o === null || Array.isArray(o))) {
        throw new OpfsError('findWithOptions options must be a plain object', OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      if (o !== undefined) estimatePayloadWeight(o, 0);
      break;
    }
    case 'updateOne':
    case 'updateMany': {
      const f = p.filter;
      const u = p.update;
      if (typeof f !== 'object' || f === null || Array.isArray(f)) {
        throw new OpfsError(`${op} requires a plain object filter`, OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      if (typeof u !== 'object' || u === null || Array.isArray(u)) {
        throw new OpfsError(`${op} requires a plain object update`, OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      estimatePayloadWeight(f, 0);
      estimatePayloadWeight(u, 0);
      break;
    }
    case 'aggregate': {
      if (!Array.isArray(p.pipeline)) {
        throw new OpfsError('aggregate requires a pipeline array', OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      estimatePayloadWeight(p.pipeline, 0);
      break;
    }
    case 'createIndex': {
      if (!p.keys || typeof p.keys !== 'object' || Array.isArray(p.keys)) {
        throw new OpfsError('createIndex requires a keys object', OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      estimatePayloadWeight(p.keys, 0);
      if (p.options !== undefined) estimatePayloadWeight(p.options, 0);
      break;
    }
    case 'dropIndex': {
      if (typeof p.indexName !== 'string' || p.indexName.length === 0) {
        throw new OpfsError('dropIndex requires a non-empty indexName string', OPFS_ERROR_CODES.INVALID_PAYLOAD);
      }
      break;
    }
    case 'listIndexes':
      break;
    default:
      break;
  }
}

/**
 * @param {string} dbName
 * @param {() => Promise<void>} task
 */
function runOwnerRpcSequential(dbName, task) {
  const prev = ownerRpcTail.get(dbName) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => task());
  ownerRpcTail.set(
    dbName,
    next.then(
      () => {},
      () => {},
    ),
  );
  return next;
}

function clearOwnerRpcChain(dbName) {
  ownerRpcTail.delete(dbName);
}

/**
 * @param {BroadcastChannel} ch
 * @param {unknown} data
 */
function safePostRpc(ch, data) {
  try {
    ch.postMessage(data);
  } catch (e) {
    console.warn('[smongo-opfs] postMessage failed', e);
  }
}

function onBroadcastMessage(e) {
  const d = e.data;
  if (!d || typeof d.type !== 'string') return;

  if (d.type === 'ping' && isOwner) {
    broadcast.postMessage({ type: 'pong', tabId });
    return;
  }

  if (d.type === 'pong' && claiming && claiming.active && d.tabId !== tabId && claiming.reject) {
    claiming.active = false;
    if (claiming.timeoutId !== null) clearTimeout(claiming.timeoutId);
    const rej = claiming.reject;
    claiming.reject = null;
    claiming = null;
    rej(
      new OpfsError(
        `Database already open in another tab (${d.tabId}). Close other tabs and reload.`,
        OPFS_ERROR_CODES.ALREADY_OPEN_ELSEWHERE,
      ),
    );
  }
}

broadcast.onmessage = onBroadcastMessage;

function claimOwnershipBroadcast() {
  if (isOwner) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const state = {
      active: true,
      timeoutId: /** @type {ReturnType<typeof setTimeout> | null} */ (null),
      reject: /** @type {((e: Error) => void) | null} */ (null),
    };
    claiming = state;

    const settleTimeoutMs = 200;

    state.reject = (err) => {
      if (!state.active) return;
      state.active = false;
      if (state.timeoutId !== null) clearTimeout(state.timeoutId);
      claiming = null;
      reject(err);
    };

    state.timeoutId = setTimeout(() => {
      if (!state.active) return;
      state.active = false;
      state.timeoutId = null;
      claiming = null;
      isOwner = true;
      dlog(`[Tab ${tabId}] Claimed database ownership (broadcast fallback)`);
      resolve();
    }, settleTimeoutMs);

    broadcast.postMessage({ type: 'ping' });
  });
}

function releaseBroadcastOwnership() {
  if (isOwner) {
    isOwner = false;
    broadcast.postMessage({ type: 'release', tabId });
  }
}

function waitUntilTabUnload() {
  return new Promise((releaseLock) => {
    const onRelease = () => {
      releaseBroadcastOwnership();
      releaseLock();
    };
    globalThis.addEventListener('pagehide', onRelease, { once: true });
    globalThis.addEventListener('beforeunload', onRelease, { once: true });
  });
}

function stopRpcServer(dbName) {
  const ch = rpcServersByDb.get(dbName);
  if (!ch) return;
  safePostRpc(ch, { type: 'owner-lost', v: RPC_VERSION, dbName });
  try {
    ch.close();
  } catch {
    /* ignore */
  }
  rpcServersByDb.delete(dbName);
  clearOwnerRpcChain(dbName);
}

function startRpcServer(dbName) {
  if (rpcServersByDb.has(dbName)) return;

  const ch = new BroadcastChannel(rpcChannelName(dbName));

  ch.onmessage = (ev) => {
    const d = ev.data;
    if (!d || d.type !== 'rpc' || d.v !== RPC_VERSION) {
      return;
    }

    const requestId = d.requestId;
    const op = d.op;
    if (typeof requestId !== 'string' || typeof op !== 'string') {
      return;
    }
    if (requestId.length === 0 || requestId.length > OPFS_RPC_LIMITS.maxRequestIdLength) {
      safePostRpc(ch, {
        type: 'rpc-resp',
        v: RPC_VERSION,
        requestId,
        ok: false,
        error: 'Invalid requestId',
        errorCode: OPFS_ERROR_CODES.INVALID_REQUEST,
      });
      return;
    }

    if (!OWNER_LOCAL_OPS.has(op) && !WORKER_OPS.has(op)) {
      safePostRpc(ch, {
        type: 'rpc-resp',
        v: RPC_VERSION,
        requestId,
        ok: false,
        error: `Unknown op: ${op}`,
        errorCode: OPFS_ERROR_CODES.RPC_UNKNOWN_OP,
      });
      return;
    }

    const rawPayload = d.payload;
    const payload =
      rawPayload === undefined || rawPayload === null
        ? {}
        : rawPayload;

    runOwnerRpcSequential(dbName, async () => {
      try {
        if (!isPlainObjectEnvelope(payload)) {
          throw new OpfsError('RPC payload must be a plain object', OPFS_ERROR_CODES.INVALID_PAYLOAD);
        }
        const p = /** @type {Record<string, unknown>} */ (payload);

        if (op === 'ping') {
          validateAndWeighPayload(p);
          safePostRpc(ch, { type: 'rpc-resp', v: RPC_VERSION, requestId, ok: true, result: { pong: true, tabId } });
          return;
        }

        if (op === 'closeDb') {
          validateAndWeighPayload(p);
          const wipe = p.wipe === true;
          safePostRpc(ch, { type: 'rpc-resp', v: RPC_VERSION, requestId, ok: true, result: { success: true } });
          await Promise.resolve();
          await internalOwnerClose(dbName, { wipe });
          return;
        }

        validateWorkerPayloadShape(op, p);
        const result = await sendMessage(op, p);
        safePostRpc(ch, { type: 'rpc-resp', v: RPC_VERSION, requestId, ok: true, result });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const code = err instanceof OpfsError ? err.code : OPFS_ERROR_CODES.WORKER_ERROR;
        safePostRpc(ch, {
          type: 'rpc-resp',
          v: RPC_VERSION,
          requestId,
          ok: false,
          error: msg,
          errorCode: code,
        });
      }
    }).catch((err) => {
      console.error('[smongo-opfs] owner RPC chain', err);
    });
  };

  rpcServersByDb.set(dbName, ch);

  const notifyUnload = () => {
    safePostRpc(ch, { type: 'owner-lost', v: RPC_VERSION, dbName });
  };
  globalThis.addEventListener('pagehide', notifyUnload, { once: true });
  globalThis.addEventListener('beforeunload', notifyUnload, { once: true });
}

/**
 * @param {string} dbName
 * @param {Error} err
 */
function rejectAllClientPending(dbName, err) {
  initByDbName.delete(dbName);
  tabRoleByDb.delete(dbName);
  const sub = clientRpcPendingByDb.get(dbName);
  if (!sub) return;
  const entries = [...sub.entries()];
  for (const [rid, p] of entries) {
    clearTimeout(p.timeoutId);
    p.reject(err);
    sub.delete(rid);
  }
  if (sub.size === 0) {
    clientRpcPendingByDb.delete(dbName);
  }
}

/** @param {string} dbName */
function getPendingSubmap(dbName) {
  let sub = clientRpcPendingByDb.get(dbName);
  if (!sub) {
    sub = new Map();
    clientRpcPendingByDb.set(dbName, sub);
  }
  return sub;
}

/** @param {string} dbName */
function clientPendingCountForDb(dbName) {
  return clientRpcPendingByDb.get(dbName)?.size ?? 0;
}

function getClientRpcChannel(dbName) {
  let ch = rpcClientChannelsByDb.get(dbName);
  if (ch) return ch;

  ch = new BroadcastChannel(rpcChannelName(dbName));
  ch.onmessage = (ev) => {
    const d = ev.data;
    if (!d || typeof d.type !== 'string' || d.v !== RPC_VERSION) return;

    if (d.type === 'owner-lost' && d.dbName === dbName) {
      rejectAllClientPending(
        dbName,
        new OpfsError(
          'OPFS database owner closed; call reconnectOpfsDatabase() or initOpfsDatabase()',
          OPFS_ERROR_CODES.OWNER_LOST,
        ),
      );
      return;
    }

    if (d.type === 'rpc-resp' && typeof d.requestId === 'string') {
      const sub = clientRpcPendingByDb.get(dbName);
      const p = sub?.get(d.requestId);
      if (!p) return;
      clearTimeout(p.timeoutId);
      sub.delete(d.requestId);
      if (sub.size === 0) {
        clientRpcPendingByDb.delete(dbName);
      }
      if (d.ok) p.resolve(d.result);
      else {
        const msg = typeof d.error === 'string' ? d.error : 'RPC error';
        const code =
          typeof d.errorCode === 'string' ? d.errorCode : OPFS_ERROR_CODES.WORKER_ERROR;
        p.reject(new OpfsError(msg, code));
      }
    }
  };

  rpcClientChannelsByDb.set(dbName, ch);
  return ch;
}

function newRpcRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `r${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * @param {string} dbName
 * @param {string} op
 * @param {Record<string, unknown>} payload
 * @param {number} [timeoutMs]
 */
function rpcCall(dbName, op, payload, timeoutMs = OPFS_RPC_LIMITS.defaultTimeoutMs) {
  assertValidDbName(dbName);
  if (clientPendingCountForDb(dbName) >= OPFS_RPC_LIMITS.maxClientPendingRpc) {
    return Promise.reject(
      new OpfsError(
        `Too many in-flight OPFS RPC calls for this database (max ${OPFS_RPC_LIMITS.maxClientPendingRpc})`,
        OPFS_ERROR_CODES.RPC_TOO_MANY_IN_FLIGHT,
      ),
    );
  }

  validateAndWeighPayload(payload);

  return new Promise((resolve, reject) => {
    const requestId = newRpcRequestId();
    const ch = getClientRpcChannel(dbName);
    const sub = getPendingSubmap(dbName);
    const timeoutId = setTimeout(() => {
      if (sub.has(requestId)) {
        sub.delete(requestId);
        if (sub.size === 0) {
          clientRpcPendingByDb.delete(dbName);
        }
        reject(
          new OpfsError('RPC timeout — owner tab may be busy or closed', OPFS_ERROR_CODES.RPC_TIMEOUT),
        );
      }
    }, timeoutMs);
    sub.set(requestId, { resolve, reject, timeoutId });
    safePostRpc(ch, { type: 'rpc', v: RPC_VERSION, requestId, op, payload });
  });
}

async function verifyRpcOwner(dbName) {
  let lastErr = /** @type {Error} */ (new OpfsError('RPC ping failed', OPFS_ERROR_CODES.OWNER_UNAVAILABLE));
  for (let i = 0; i < OPFS_RPC_LIMITS.pingAttempts; i++) {
    try {
      await rpcCall(dbName, 'ping', {}, OPFS_RPC_LIMITS.pingTimeoutMs);
      return;
    } catch (e) {
      lastErr =
        e instanceof Error
          ? e
          : new OpfsError(String(e), OPFS_ERROR_CODES.OWNER_UNAVAILABLE);
      await new Promise((r) => setTimeout(r, OPFS_RPC_LIMITS.pingBackoffMs));
    }
  }
  throw new OpfsError(
    lastErr.message +
      ' — could not reach OPFS owner. Open this database in one tab first, or call reconnectOpfsDatabase().',
    OPFS_ERROR_CODES.OWNER_UNAVAILABLE,
    { cause: lastErr },
  );
}

function createWorker() {
  if (worker) return;
  worker = new Worker(new URL('./opfs-worker.js', import.meta.url), { type: 'module' });

  worker.onmessage = (e) => {
    const { id, result, error, errorCode } = e.data;
    const handlers = pending.get(id);
    if (handlers) {
      pending.delete(id);
      if (error) {
        const code =
          typeof errorCode === 'string' ? errorCode : OPFS_ERROR_CODES.WORKER_ERROR;
        handlers.reject(new OpfsError(String(error), code));
      } else {
        handlers.resolve(result);
      }
    }
  };

  worker.onerror = (e) => {
    console.error('Worker error:', e);
    for (const [, handlers] of pending.entries()) {
      handlers.reject(
        new OpfsError(`Worker error: ${e.message}`, OPFS_ERROR_CODES.WORKER_ERROR),
      );
    }
    pending.clear();
  };
}

function sendMessage(type, payload) {
  return new Promise((resolve, reject) => {
    createWorker();
    const id = nextId++;
    const timeoutMs = OPFS_RPC_LIMITS.workerMessageTimeoutMs;
    const timeoutId = setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      reject(
        new OpfsError(
          `Worker message timeout (${timeoutMs}ms) for ${type}`,
          OPFS_ERROR_CODES.WORKER_MESSAGE_TIMEOUT,
        ),
      );
    }, timeoutMs);
    pending.set(id, {
      resolve: (v) => {
        clearTimeout(timeoutId);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timeoutId);
        reject(e);
      },
    });
    worker.postMessage({ id, type, payload });
  });
}

createWorker();

async function runInit(dbName, collections) {
  try {
    await claimOwnershipBroadcast();
    await sendMessage('init', { dbName, collections });
    return new OpfsDatabase(dbName, { mode: 'owner' });
  } catch (e) {
    releaseBroadcastOwnership();
    throw e;
  }
}

/** @type {Map<string, Promise<OpfsDatabase>>} */
const initByDbName = new Map();

/**
 * @param {string} dbName
 * @param {string[]} [collections]
 */
export function initOpfsDatabase(dbName, collections = ['testData']) {
  assertValidDbName(dbName);
  const cols = Array.isArray(collections) ? [...collections] : ['testData'];
  for (const c of cols) {
    assertValidCollectionName(c);
  }

  const existing = initByDbName.get(dbName);
  if (existing) return existing;

  const promise = acquireOpfsDatabase(dbName, cols);
  initByDbName.set(dbName, promise);
  promise.catch(() => {
    initByDbName.delete(dbName);
  });
  return promise;
}

/**
 * Drop cached handles and open again (e.g. after owner-lost). Returns a new OpfsDatabase promise.
 * @param {string} dbName
 * @param {string[]} [collections]
 */
export async function reconnectOpfsDatabase(dbName, collections = ['testData']) {
  assertValidDbName(dbName);
  const role = tabRoleByDb.get(dbName);

  if (role === 'owner') {
    await internalOwnerClose(dbName, { wipe: false });
    return initOpfsDatabase(dbName, collections);
  }

  if (role === 'client') {
    rejectAllClientPending(
      dbName,
      new OpfsError(
        'Reconnecting: cancelled in-flight RPC for this database',
        OPFS_ERROR_CODES.RECONNECTING,
      ),
    );
    const ch = rpcClientChannelsByDb.get(dbName);
    if (ch) {
      try {
        ch.close();
      } catch {
        /* ignore */
      }
      rpcClientChannelsByDb.delete(dbName);
    }
    initByDbName.delete(dbName);
    tabRoleByDb.delete(dbName);
    return initOpfsDatabase(dbName, collections);
  }

  const ch = rpcClientChannelsByDb.get(dbName);
  if (ch) {
    try {
      ch.close();
    } catch {
      /* ignore */
    }
    rpcClientChannelsByDb.delete(dbName);
  }
  initByDbName.delete(dbName);
  tabRoleByDb.delete(dbName);
  return initOpfsDatabase(dbName, collections);
}

async function acquireOpfsDatabase(dbName, collections) {
  assertValidDbName(dbName);
  const lockName = `smongo-opfs-${dbName}`;

  if (!LOCKS_SUPPORTED) {
    console.warn(
      '[smongo-opfs] Web Locks API unavailable; using BroadcastChannel only. Multi-tab RPC requires Web Locks; use a single tab.',
    );
    const db = await runInit(dbName, collections);
    tabRoleByDb.set(dbName, 'owner');
    const onRelease = () => releaseBroadcastOwnership();
    globalThis.addEventListener('pagehide', onRelease, { once: true });
    globalThis.addEventListener('beforeunload', onRelease, { once: true });
    return db;
  }

  return new Promise((resolve, reject) => {
    navigator.locks.request(
      lockName,
      { mode: 'exclusive', ifAvailable: true },
      async (lock) => {
        if (!lock) {
          try {
            await verifyRpcOwner(dbName);
            tabRoleByDb.set(dbName, 'client');
            resolve(new OpfsDatabase(dbName, { mode: 'client' }));
          } catch (e) {
            if (e instanceof OpfsError) {
              reject(e);
            } else if (e instanceof Error) {
              reject(e);
            } else {
              reject(
                new OpfsError(
                  'Could not connect to OPFS database owner. Open this database in one tab first, then retry or call reconnectOpfsDatabase().',
                  OPFS_ERROR_CODES.OWNER_UNAVAILABLE,
                ),
              );
            }
          }
          return;
        }

        let releaseHeldLock = () => {};
        const heldLockReleased = new Promise((r) => {
          releaseHeldLock = r;
        });
        opfsLockReleasers.set(dbName, releaseHeldLock);
        try {
          const db = await runInit(dbName, collections);
          tabRoleByDb.set(dbName, 'owner');
          startRpcServer(dbName);
          resolve(db);
          await Promise.race([waitUntilTabUnload(), heldLockReleased]);
        } catch (e) {
          reject(e);
        } finally {
          opfsLockReleasers.delete(dbName);
          stopRpcServer(dbName);
        }
      },
    );
  });
}

/**
 * @param {{ wipe?: boolean }} opts
 */
async function internalOwnerClose(dbName, opts = {}) {
  const { wipe = false } = opts;

  stopRpcServer(dbName);

  try {
    await sendMessage('shutdown', {});
  } catch {
    /* ignore */
  }

  for (const [, handlers] of pending.entries()) {
    handlers.reject(new OpfsError('OPFS worker restarted', OPFS_ERROR_CODES.WORKER_ERROR));
  }
  pending.clear();

  if (worker) {
    worker.terminate();
    worker = null;
  }

  opfsLockReleasers.get(dbName)?.();
  opfsLockReleasers.delete(dbName);

  await Promise.resolve();

  initByDbName.delete(dbName);
  tabRoleByDb.delete(dbName);
  releaseBroadcastOwnership();

  if (wipe) {
    const root = await navigator.storage.getDirectory();
    try {
      await root.removeEntry(dbName, { recursive: true });
    } catch (e) {
      if (e && e.name !== 'NotFoundError') throw e;
    }
  }

  createWorker();
}

export async function closeOpfsDatabase(dbName) {
  assertValidDbName(dbName);
  const role = tabRoleByDb.get(dbName);

  if (role === 'client') {
    await rpcCall(dbName, 'closeDb', { wipe: false }, 20_000);
    initByDbName.delete(dbName);
    tabRoleByDb.delete(dbName);
    const ch = rpcClientChannelsByDb.get(dbName);
    if (ch) {
      try {
        ch.close();
      } catch {
        /* ignore */
      }
      rpcClientChannelsByDb.delete(dbName);
    }
    return;
  }

  await internalOwnerClose(dbName, { wipe: false });
}

export async function wipeOpfsDatabaseDirectory(dbName) {
  assertValidDbName(dbName);
  const role = tabRoleByDb.get(dbName);

  if (role === 'client') {
    await rpcCall(dbName, 'closeDb', { wipe: true }, 30_000);
    initByDbName.delete(dbName);
    tabRoleByDb.delete(dbName);
    const ch = rpcClientChannelsByDb.get(dbName);
    if (ch) {
      try {
        ch.close();
      } catch {
        /* ignore */
      }
      rpcClientChannelsByDb.delete(dbName);
    }
    return;
  }

  await internalOwnerClose(dbName, { wipe: true });
}

export class OpfsDatabase {
  /**
   * @param {string} dbName
   * @param {{ mode?: 'owner' | 'client' }} [options]
   */
  constructor(dbName, options = {}) {
    this._name = assertValidDbName(dbName);
    this._mode = options.mode === 'client' ? 'client' : 'owner';
  }

  collection(name) {
    return new OpfsCollection(name, this._name, this._mode);
  }

  async listCollectionNames() {
    if (this._mode === 'client') {
      return await rpcCall(this._name, 'listCollectionNames', {});
    }
    validateWorkerPayloadShape('listCollectionNames', {});
    return await sendMessage('listCollectionNames', {});
  }

  async dropCollection(name) {
    if (this._mode === 'client') {
      return await rpcCall(this._name, 'dropCollection', { name });
    }
    validateWorkerPayloadShape('dropCollection', { name });
    return await sendMessage('dropCollection', { name });
  }

  async stats() {
    if (this._mode === 'client') {
      return await rpcCall(this._name, 'stats', {});
    }
    validateWorkerPayloadShape('stats', {});
    return await sendMessage('stats', {});
  }
}

export class OpfsCollection {
  /**
   * @param {string} name
   * @param {string} dbName
   * @param {'owner' | 'client'} mode
   */
  constructor(name, dbName, mode) {
    this._name = assertValidCollectionName(name);
    this._dbName = dbName;
    this._mode = mode;
  }

  async insertOne(doc) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'insertOne', { collection: this._name, doc });
    }
    validateWorkerPayloadShape('insertOne', { collection: this._name, doc });
    return await sendMessage('insertOne', { collection: this._name, doc });
  }

  async insertMany(docs) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'insertMany', { collection: this._name, docs });
    }
    validateWorkerPayloadShape('insertMany', { collection: this._name, docs });
    return await sendMessage('insertMany', { collection: this._name, docs });
  }

  async findOne(filter = {}) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'findOne', { collection: this._name, filter });
    }
    validateWorkerPayloadShape('findOne', { collection: this._name, filter });
    return await sendMessage('findOne', { collection: this._name, filter });
  }

  async find(filter = {}) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'find', { collection: this._name, filter });
    }
    validateWorkerPayloadShape('find', { collection: this._name, filter });
    return await sendMessage('find', { collection: this._name, filter });
  }

  async findWithOptions(filter, options) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'findWithOptions', { collection: this._name, filter, options });
    }
    validateWorkerPayloadShape('findWithOptions', { collection: this._name, filter, options });
    return await sendMessage('findWithOptions', { collection: this._name, filter, options });
  }

  async countDocuments(filter = {}) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'countDocuments', { collection: this._name, filter });
    }
    validateWorkerPayloadShape('countDocuments', { collection: this._name, filter });
    return await sendMessage('countDocuments', { collection: this._name, filter });
  }

  async updateOne(filter, update) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'updateOne', { collection: this._name, filter, update });
    }
    validateWorkerPayloadShape('updateOne', { collection: this._name, filter, update });
    return await sendMessage('updateOne', { collection: this._name, filter, update });
  }

  async updateMany(filter, update) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'updateMany', { collection: this._name, filter, update });
    }
    validateWorkerPayloadShape('updateMany', { collection: this._name, filter, update });
    return await sendMessage('updateMany', { collection: this._name, filter, update });
  }

  async deleteOne(filter) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'deleteOne', { collection: this._name, filter });
    }
    validateWorkerPayloadShape('deleteOne', { collection: this._name, filter });
    return await sendMessage('deleteOne', { collection: this._name, filter });
  }

  async deleteMany(filter) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'deleteMany', { collection: this._name, filter });
    }
    validateWorkerPayloadShape('deleteMany', { collection: this._name, filter });
    return await sendMessage('deleteMany', { collection: this._name, filter });
  }

  async aggregate(pipeline) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'aggregate', { collection: this._name, pipeline });
    }
    validateWorkerPayloadShape('aggregate', { collection: this._name, pipeline });
    return await sendMessage('aggregate', { collection: this._name, pipeline });
  }

  async createIndex(keys, options = {}) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'createIndex', { collection: this._name, keys, options });
    }
    validateWorkerPayloadShape('createIndex', { collection: this._name, keys, options });
    return await sendMessage('createIndex', { collection: this._name, keys, options });
  }

  async dropIndex(indexName) {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'dropIndex', { collection: this._name, indexName });
    }
    validateWorkerPayloadShape('dropIndex', { collection: this._name, indexName });
    return await sendMessage('dropIndex', { collection: this._name, indexName });
  }

  async listIndexes() {
    if (this._mode === 'client') {
      return await rpcCall(this._dbName, 'listIndexes', { collection: this._name });
    }
    validateWorkerPayloadShape('listIndexes', { collection: this._name });
    return await sendMessage('listIndexes', { collection: this._name });
  }
}
