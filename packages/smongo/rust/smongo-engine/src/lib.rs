//! Pure Rust MongoDB-compatible embedded database engine.
//!
//! # Highlights
//!
//! - Full CRUD with MQL query operators and update expressions
//! - Aggregation pipeline with 25+ stages and window functions
//! - Atlas-compatible `$vectorSearch` with HNSW (ANN) **and** flat (exact)
//!   index types, vendored zero-dependency implementation
//! - Multi-tenant vector search: `tenant_id` pre-filter, `exact: true`,
//!   `indexingMethod: "flat"` — matching
//!   [Atlas multi-tenant guidance](https://www.mongodb.com/docs/atlas/atlas-vector-search/multi-tenant-architecture/)
//! - B-tree, text, 2dsphere, bitmap, and prefix indexes
//! - Pluggable storage: in-memory, redb (native), OPFS (WASM)
//! - Collation-aware comparison and sorting
//! - Multi-document transactions with snapshot isolation
//! - Builds on both native and `wasm32-unknown-unknown` targets

pub mod aggregation;
pub mod collation;
pub mod collection;
pub mod database;
pub mod explain;
pub mod geo;
pub mod index;
pub mod oplog;
pub mod paths;
pub mod planner;
pub mod query;
pub mod schema;
pub mod storage;
pub mod update;

#[cfg(target_arch = "wasm32")]
pub mod wasm_bindings;

// Re-export main types for convenience
pub use collection::{CollectionView, FindCursor, OwnedFindIter};
pub use database::TransactionSession;
pub use storage::{
    DefaultBackend, DefaultSession, MemBackend, MemCursor, MemSession, StorageBackend,
    StorageCursor, StorageError, StorageResult, StorageSession,
};
#[cfg(not(target_arch = "wasm32"))]
pub use storage::{RedbBackend, RedbCursor, RedbSession};
