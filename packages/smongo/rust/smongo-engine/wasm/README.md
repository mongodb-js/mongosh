# smongo WASM browser demos

Browser tests for the `wasm-pack` bundle (`pkg/`). ES modules require **HTTP** (use `npm run serve` or Docker below).

## Choosing memory vs OPFS

Ship **one WASM binary**; pick storage by import and API:

| Goal | API | Module |
|------|-----|--------|
| Fast, ephemeral (benchmarks, SSR islands, tests) | `initSmongo()` → `new Database(name)` | Prefer [`smongo-browser.js`](smongo-browser.js) |
| Survives reloads (Chromium-class browsers, secure context) | `initOpfsDatabase(dbName, collections)` | Same — [`smongo-browser.js`](smongo-browser.js) |

**`smongo-browser.js` is the supported application entry:** it re-exports memory helpers from `wrapper.js` and persistence from `opfs-wrapper.js`. Multi-tab behavior, lifecycle, structured errors, and recovery are documented in [**PERSISTENCE-AND-LIFECYCLE.md**](PERSISTENCE-AND-LIFECYCLE.md).

## Build

From the repo root:

```bash
make build-wasm
```

Or manually from `rust/smongo-engine`:

```bash
wasm-pack build --target web --out-dir wasm/pkg --release
# Optional: shrink binary ~10-20%
wasm-opt -Oz wasm/pkg/smongo_engine_bg.wasm -o wasm/pkg/smongo_engine_bg.wasm
```

**Requirements:** `wasm-pack`, Rust with `wasm32-unknown-unknown` target. Optional: `binaryen` (provides `wasm-opt`).

## Run locally

```bash
cd rust/smongo-engine/wasm
npm install
npm run serve
```

Open **http://127.0.0.1:8080/** (redirects to `demo/`).

## Run with Docker

From `rust/smongo-engine/wasm`:

```bash
# Build wasm first (see above), then:
docker compose up
```

Open **http://localhost:8080/demo/**.

## Demo pages (`demo/`)

| Page | Purpose |
|------|---------|
| `demo/index.html` | Hub |
| `demo/memory-crud.html` | In-memory CRUD via `smongo-browser.js` |
| `demo/benchmark.html` | MemBackend throughput (`smongo-browser.js`) |
| `demo/opfs-persistence.html` | OPFS write / read / **wipe** |
| `demo/opfs-multitab-shared.html` | Multi-tab RPC: owner + client tabs share one OPFS worker |
| `demo/opfs-multitab-handoff.html` | **Close database** releases lock for another tab |

OPFS flows use the **dedicated worker** (`opfs-worker.js`, loaded by `opfs-wrapper.js`). Demos import **`smongo-browser.js`**. Use **Chromium**; sync access handles require a worker.

**Multi-tab:** With the Web Locks API, the first tab to open a `dbName` becomes the **owner** (holds the lock + worker). Other tabs become **RPC clients** on `BroadcastChannel('smongo-opfs-rpc-' + dbName)` and forward operations to the owner. Without Web Locks, only single-tab owner mode is used.

### JavaScript API (canonical)

```javascript
import {
  initSmongo,
  Database,
  initOpfsDatabase,
  closeOpfsDatabase,
  wipeOpfsDatabaseDirectory,
  reconnectOpfsDatabase,
} from './smongo-browser.js';

// --- In-memory (sync, main thread) ---
await initSmongo();
const memDb = new Database('mydb');
const coll = memDb.collection('users');

coll.insertOne({ name: 'Alice', age: 30 });
coll.insertMany([{ name: 'Bob' }, { name: 'Carol' }]);

const alice = coll.findOne({ name: 'Alice' });
const young = coll.findWithOptions({ age: { $gte: 18 } }, { limit: 10, sort: { age: -1 } });
const count = coll.countDocuments({});

coll.updateOne({ name: 'Alice' }, { $set: { age: 31 } });
coll.deleteOne({ name: 'Bob' });

const results = coll.aggregate([
  { $match: { age: { $gte: 18 } } },
  { $group: { _id: null, avgAge: { $avg: '$age' } } },
]);

coll.createIndex({ name: 1 }, { unique: true });
const indexes = coll.listIndexes();
coll.dropIndex('name_1');

const names = memDb.listCollectionNames();
const stats = memDb.stats();

// --- OPFS (async, dedicated worker) ---
const opfsDb = await initOpfsDatabase('myDb', ['collectionA']);
const opfsColl = opfsDb.collection('collectionA');
await opfsColl.insertOne({ x: 1 });
await opfsColl.aggregate([{ $group: { _id: null, total: { $sum: '$x' } } }]);

await closeOpfsDatabase('myDb');
await wipeOpfsDatabaseDirectory('myDb');
await reconnectOpfsDatabase('myDb', ['collectionA']);
```

### Full API surface

**Database** (sync for memory, async for OPFS):
- `collection(name)` — get collection handle
- `listCollectionNames()` — list all collections
- `dropCollection(name)` — drop a collection
- `stats()` — `{ collectionCount, sizeBytes }`

**Collection** (sync for memory, async for OPFS):
- `insertOne(doc)` / `insertMany(docs)`
- `findOne(filter)` / `find(filter)` / `findWithOptions(filter, { limit, skip, sort, projection })`
- `countDocuments(filter)`
- `updateOne(filter, update)` / `updateMany(filter, update)`
- `deleteOne(filter)` / `deleteMany(filter)`
- `aggregate(pipeline)`
- `createIndex(keys, options)` / `dropIndex(name)` / `listIndexes()`

### Enterprise / production notes

- **Trust boundary:** `BroadcastChannel` is same-origin only; hostile same-origin iframes can still post messages. This layer enforces allow-listed ops, plain-object RPC envelopes, payload weight/depth caps, and per-database in-flight RPC limits. Isolate sensitive apps on a dedicated origin and use CSP / COOP+COEP where appropriate.
- **Structured errors:** Operations throw `OpfsError` with a stable `code` matching `OPFS_ERROR_CODES`. When the engine wraps an underlying failure, `cause` is set; RPC responses may include `errorCode` for the same strings. Use `isOpfsError(e)` and switch on `e.code` for retries, circuit-breaking, or telemetry.
- **Limits:** See `OPFS_RPC_LIMITS` (payload weight, nesting, client RPC concurrency, ping/backoff, **worker message timeout**). Hung worker replies no longer block the main thread indefinitely.
- **Multi-database:** In-flight RPC waiters are **scoped per `dbName`**; losing one owner does not reject pending calls for another database in the same tab.
- **Debug:** `configureOpfsDebug({ enabled: true })` turns on verbose internal logging (default off).
- **Panic hook:** Rust panics now produce readable `console.error` output via `console_error_panic_hook`, replacing the opaque `RuntimeError: unreachable`.

## Automation

```bash
# From repo root:
make check-wasm    # Fast: cargo check against wasm32
make build-wasm    # Full: wasm-pack build + wasm-opt
make test-wasm     # Build + Playwright e2e

# Or directly:
cd rust/smongo-engine/wasm
npm run test:e2e
```

Playwright serves this directory and loads `tests/opfs-multitab-harness.html`.

## Layout

- **`smongo-browser.js`** (+ **`smongo-browser.d.ts`**) — **canonical app entry**; memory + OPFS
- `wrapper.js` / `wrapper.d.ts` — BSON + `WasmDatabase` (in-memory only)
- `opfs-wrapper.js` / `opfs-wrapper.d.ts` / `opfs-worker.js` — OPFS + `WasmOpfsDatabase`
- `nginx.conf` — ensures `application/wasm` MIME type for streaming compilation
- `pkg/` — `wasm-pack` output (not committed in some setups)
- `docker-compose.yml` — static `nginx:alpine` on port 8080

See [PERSISTENCE-AND-LIFECYCLE.md](PERSISTENCE-AND-LIFECYCLE.md) for WASM persistence design and [ARCHITECTURE.md](../../../ARCHITECTURE.md) for the overall project architecture.
