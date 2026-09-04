# OPFS architecture: one sync handle per file, coordinated multi-tab

## The Hard Constraint

**OPFS `FileSystemSyncAccessHandle` can only have ONE active handle per file across ALL browser tabs.**

This is a **browser-level restriction**, not a smongo limitation.

## Why This Exists

OPFS sync handles provide synchronous file I/O (crucial for our sync-only Rust storage traits), but the browser enforces exclusive access to prevent corruption from concurrent writes.

### Attempted Solutions (All Failed)

1. **SharedWorker**: Can't use `createSyncAccessHandle()` - only available in dedicated Workers
2. **Web Locks API**: Doesn't help - browser still rejects second handle even with lock held
3. **Multiple Workers**: Each worker tries to create its own handle = conflict

## Current Implementation

**Single OPFS writer per `dbName`:** Web Locks (exclusive `ifAvailable`) + dedicated worker with sync handles. **Additional tabs** do not open OPFS handles; they become **RPC clients** on `BroadcastChannel('smongo-opfs-rpc-' + encodeURIComponent(dbName))` and the lock-holding tab forwards work to the worker.

```
Tab 1 → lock acquired → worker + sync handles + RPC server on per-db channel → owner ✅
Tab 2 → lock busy → ping owner via RPC → client proxy ✅ (same data, higher latency)
Tab 1 closes / pagehide → lock released → Tab 2 can reconnectOpfsDatabase / init → new owner ✅
```

### Code Flow

1. `initOpfsDatabase()` uses `navigator.locks.request(..., { ifAvailable: true })` when supported; otherwise warns and uses broadcast-only single-tab ownership.
2. **Global** `BroadcastChannel('smongo-opfs')`: ping/pong so two tabs without Web Locks do not both assume ownership.
3. **Per-db** `smongo-opfs-rpc-${dbName}`: versioned RPC (`v: 1`), allow-listed ops, bounded payloads, serialized handling on the owner, structured `OpfsError` / `errorCode` on failure.
4. Lock callback holds until `pagehide` / `beforeunload` or explicit `closeOpfsDatabase` / `internalOwnerClose` (releases lock, stops RPC server, shuts down worker).

## User Experience

### Multi-tab (Web Locks + RPC)
- One tab holds the lock and the WASM/OPFS worker; others use RPC (no second sync handle).
- If the owner goes away, clients get `OPFS_OWNER_LOST` (`OpfsError`); call `reconnectOpfsDatabase(dbName, collections)` to re-handshake (owner path closes worker first; client path cancels in-flight RPC for that db only).

### Broadcast-only fallback (no Web Locks)
- Single-tab ownership via ping/pong only; not suitable for multi-tab RPC clients.

### Error messages

Structured errors use **`OpfsError`** with stable **`code`** (`OPFS_*` constants). Examples:

- **`OPFS_ALREADY_OPEN_ELSEWHERE`** — broadcast fallback saw another tab’s pong while claiming ownership.
- **`OPFS_OWNER_UNAVAILABLE`** — client could not reach an RPC owner (ping exhausted).
- **`OPFS_OWNER_LOST`** — owner closed; in-flight client RPC rejected.
- **`OPFS_RPC_TIMEOUT`**, **`OPFS_WORKER_MESSAGE_TIMEOUT`** — bounded wait exceeded; safe to retry or reconnect per app policy.

Human-readable `message` strings remain for logs; production code should prefer **`e.code`**.

## Alternative: IndexedDB Backend

For true multi-tab support, we'd need to:

1. Create `IndexedDBBackend` implementing `StorageBackend` traits
2. Use IndexedDB's transactions (multi-tab safe)
3. Trade-off: async-over-sync adapter (complexity + performance hit)

IndexedDB allows concurrent access but requires async API, which conflicts with our sync-only storage traits.

## Comparison: OPFS vs IndexedDB

| Feature | OPFS (Current) | IndexedDB (Alternative) |
|---------|----------------|--------------------------|
| API Type | Sync | Async |
| Multi-tab | One tab owns sync handles; additional tabs use RPC to that owner (same origin) | Native IDB concurrency across tabs |
| Performance | Faster (no async overhead) | Slower (async overhead) |
| Trait Compatibility | Perfect fit | Requires adapter |
| Browser Support | Chrome/Edge 102+ | All modern browsers |
| Implementation Complexity | Simple | Complex (async-over-sync) |

## Why We Chose OPFS

1. **Trait Compatibility**: Storage traits are `fn`, not `async fn`
2. **Performance**: Synchronous I/O = no overhead
3. **Simplicity**: Direct handle mapping, no async adapter
4. **Use Case**: Embedded database typically accessed from single context

## Future Considerations

**Current production shape:** Multi-tab is handled with **Web Locks + RPC** (one owner tab with the worker and sync handles; other tabs are RPC clients). True concurrent multi-writer OPFS is still a browser limitation; see [PERSISTENCE-AND-LIFECYCLE.md](PERSISTENCE-AND-LIFECYCLE.md) for lifecycle and recovery.

### Option 1: Hybrid Approach
- Detect multi-tab scenario
- Fall back to IndexedDB for secondary tabs
- Primary tab uses OPFS, others use IndexedDB
- Requires cache invalidation protocol

### Option 2: Service Worker Coordination
- Single Service Worker manages OPFS handles
- All tabs communicate via MessagePort
- Complex lifecycle management

### Option 3: In-memory fallback
- Apps that cannot rely on OPFS (unsupported engines, serverless workers) use `WasmDatabase` via [`wrapper.js`](wrapper.js); same WASM binary, no on-disk story on that runtime.

## Testing

### Persistence Test (Single Tab)
```bash
# Terminal
python3 -m http.server 8081

# Browser
1. Open http://localhost:8081/demo/opfs-persistence.html
2. Click "Write"
3. CLOSE the tab
4. Open http://localhost:8081/demo/opfs-persistence.html again
5. Click "Read"
6. ✅ Should see persisted document
```

### Multi-tab shared access (RPC)
Additional tabs use `BroadcastChannel('smongo-opfs-rpc-' + dbName)` to forward operations to the tab that holds the Web Lock and OPFS worker. See [opfs-wrapper.js](opfs-wrapper.js) and [demo/opfs-multitab-shared.html](demo/opfs-multitab-shared.html).

## Files

- `opfs-wrapper.js` - Web Locks + BroadcastChannel; worker URL via `import.meta.url`
- `opfs-worker.js` - Dedicated Worker with OPFS sync handles
- `demo/opfs-persistence.html` - Persistence smoke test
- `tests/opfs-multitab-harness.html` + `tests/opfs-multitab.spec.js` - Playwright multi-page checks (same browser context)
- `OPFS-ARCHITECTURE.md` - This document

## References

- [OPFS Sync Access Handle](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle)
- [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Worker)
- [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
