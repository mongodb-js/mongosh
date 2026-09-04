# mongosh `--from` — embedded smongo spike (TEST.md)

This is a spike for idea #1 in the [mongosh improvement ideas](https://docs.google.com/document/d/1mMd0H1Wlsp0zBAniuybvYiIo8evDrp8bL4sv7HIelDA)
doc: **query a local file with no server** — "mongosh as DuckDB".

It embeds the [smongo](https://github.com/ranfysvalle02/mdb-embedded) engine
in-process and lets you query local files with the usual MongoDB syntax, without
a running `mongod`:

```bash
mongosh --from ./data.csv --eval 'db.data.find({})'
```

---

## What this adds

- A vendored smongo embedded engine (`packages/smongo/`) — the Rust `smongo-engine`
  plus a minimal MongoDB wire-protocol server (OP_MSG / OP_QUERY) exposed to Node
  through a napi addon.
- A new `--from <file>` CLI flag that:
  1. starts the embedded engine on an ephemeral localhost port,
  2. ingests each file into a collection named after the file stem
     (`data.csv` -> `db.data`),
  3. points the shell's driver at the engine,
  4. runs the usual `--eval` (one-shot) or interactive session,
  5. stops the engine and removes its temporary data directory on exit.

> Note: mongosh talks to the engine over the real wire protocol (its driver
> requires it). The engine lives in-process via the native addon; nothing is
> spawned and no Python runtime is needed.

---

## Prerequisites

- **Node.js** `>= 18.19` (this repo targets Node 24).
- **Rust toolchain** — required to build the vendored native addon.
  Install with [rustup](https://rustup.rs):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

---

## Compile mongosh

### 1. Install JS dependencies

From the repository root:

```bash
npm install
```

### 2. Build the vendored smongo native addon

The engine's Rust code is under `packages/smongo/rust/`. Build the napi addon and
copy it into place:

```bash
cargo build --manifest-path packages/smongo/rust/Cargo.toml -p smongo-node
cp packages/smongo/rust/target/debug/libsmongo_node.so packages/smongo/smongo-node.node
```

Or use the package script:

```bash
npm run build:native -w @mongosh/smongo
```

> `packages/smongo/smongo-node.node` is a build artifact and is gitignored —
> rebuild it after a fresh clone. (The `.so`/`.dylib`/`.dll` filename varies by
> platform; this repo was built on Linux x64.)

### 3. Compile the TypeScript

```bash
npm run compile
```

You can also compile just the CLI plus its workspace dependencies:

```bash
npm run compile -w @mongosh/cli-repl
```

---

## Run with a CSV

Create a CSV:

```bash
printf 'name,age,city\nAlice,34,NYC\nBob,41,LA\nCarol,28,NYC\n' > data.csv
```

One-shot with `--eval`:

```bash
mongosh --from ./data.csv --eval 'db.data.find({})'
```

Aggregate:

```bash
mongosh --from ./data.csv --eval 'db.data.aggregate([{ $group: { _id: "$city", count: { $sum: 1 } } }])'
```

Multiple files:

```bash
mongosh --from ./a.csv --from ./b.ndjson --eval 'db.a.countDocuments({})'
```

Interactive session (no `--eval`) — the prompt shows `local>`, and the engine is
torn down when you `exit`:

```bash
mongosh --from ./data.csv
```

---

## Supported features

- **File formats**: `.csv`, `.json` (single object or array), `.ndjson` / `.jsonl`.
- **Collection naming**: collection name = file stem without extension
  (`./orders.csv` -> `db.orders`; `my.data.ndjson` -> `db.my.data`).
- **CSV typing**: cells are inferred as numbers, booleans, or strings; empty cells
  become `null`; quoted fields (including embedded commas/newlines) are handled.
- **Queries**: `find`, `aggregate`, `count` (via the MongoDB driver over the wire).
- **Multiple `--from` files** in one session.
- **Interactive + `--eval`** modes.
- **Cleanup**: the temporary engine directory and port are released on exit.
- **Safety**: `--from` cannot be combined with a remote connection string or `--nodb`.

---

## Limitations (spike)

- No release packaging / multi-platform native binaries; the addon must be built
  locally (Linux x64 was used for testing).
- The engine is a single-file store with an exclusive lock, so ingestion happens
  over the wire connection (a short-lived driver client) rather than a second
  handle.
- Only a subset of wire commands is implemented (`hello/isMaster`, `buildInfo`,
  `ping`, `getLog`, `listDatabases`, `listCollections`, `create`, `insert`,
  `find`, `aggregate`, `count`, and cursor bookkeeping).
- CSV type inference is heuristic; nested/array columns are not expanded.
- This is not a MongoDB server replacement — it targets local, throwaway data.
