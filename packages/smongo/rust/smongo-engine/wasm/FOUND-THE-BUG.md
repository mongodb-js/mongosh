# OPFS persistence: historical notes and current behavior

## Truncation (previously the main corruption risk)

**Status (fixed):** [`flush_sync` in `../src/storage/opfs.rs`](../src/storage/opfs.rs) calls `FileSystemSyncAccessHandle.truncate` via `Reflect` (not yet in web-sys), then writes and `flush()`es.

**Strict behavior:** If `truncate` is missing or throws, flush returns `StorageError` instead of silently continuing. That avoids the classic bug where a shorter serialization leaves stale bytes at the end of the file and corrupts reads.

## Multi-tab / single writer

**Browser rule:** Only one active `FileSystemSyncAccessHandle` per OPFS file per origin.

**App enforcement:** [`opfs-wrapper.js`](opfs-wrapper.js) uses:

1. **Web Locks** — `navigator.locks.request('smongo-opfs-${dbName}', { mode: 'exclusive', ifAvailable: true })` so a second tab gets a clear error instead of racing `createSyncAccessHandle()`.
2. **BroadcastChannel** — ping/pong while claiming ownership, with a **single** `onmessage` handler so an owning tab always answers pings (the old bug was replacing `onmessage` inside `claimOwnership()`, which stopped pongs after the first claim).

Without Web Locks (unsupported browser), a console warning is printed; broadcast-only mode can still race if two tabs start at the exact same instant.

## Worker script URL

`Worker` is created with `new URL('./opfs-worker.js', import.meta.url)` so the worker resolves next to `opfs-wrapper.js`, not the HTML document path (important for pages under subdirectories or tests in `/tests/`).

## Verification

- Persistence manual flow: [`demo/opfs-persistence.html`](demo/opfs-persistence.html)
- Multi-tab automation: `npm run test:e2e` in this directory (requires `wasm-pack`-built `pkg/` and Playwright Chromium)

## Future: true concurrent multi-tab

Needs a different storage path (e.g. IndexedDB + async adapter) or a single-writer tab with others as clients. See [`OPFS-ARCHITECTURE.md`](OPFS-ARCHITECTURE.md).
