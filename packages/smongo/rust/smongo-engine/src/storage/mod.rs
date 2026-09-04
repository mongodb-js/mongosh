//! Pluggable storage backend abstraction.
//!
//! This module defines the traits that any storage backend must implement,
//! plus a unified error type. The engine operates entirely through these
//! traits, enabling different backends (redb on native, in-memory on WASM
//! and tests, potentially OPFS/IDB for persistent WASM storage).
//!
//! [`DefaultBackend`] and [`DefaultSession`] are type aliases that resolve
//! to `RedbBackend`/`RedbSession` on native and `MemBackend`/`MemSession`
//! on `wasm32`.

pub mod memory;

#[cfg(not(target_arch = "wasm32"))]
pub mod redb_backend;

#[cfg(target_arch = "wasm32")]
pub mod opfs;

pub use memory::{MemBackend, MemCursor, MemSession};

#[cfg(not(target_arch = "wasm32"))]
pub use redb_backend::{RedbBackend, RedbCursor, RedbSession};

#[cfg(target_arch = "wasm32")]
pub use opfs::{OpfsBackend, OpfsCursor, OpfsSession};

use std::fmt;

#[derive(Debug)]
pub enum StorageError {
    NotFound(String),
    DuplicateKey(String),
    Other(String),
}

impl fmt::Display for StorageError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StorageError::NotFound(msg) => write!(f, "Storage error: not found: {msg}"),
            StorageError::DuplicateKey(msg) => write!(f, "Storage error: duplicate key: {msg}"),
            StorageError::Other(msg) => write!(f, "Storage error: {msg}"),
        }
    }
}

impl std::error::Error for StorageError {}

pub type StorageResult<T> = Result<T, StorageError>;

// ---------------------------------------------------------------------------
// Traits
// ---------------------------------------------------------------------------

/// Top-level database handle. Owns the connection to the storage file and
/// creates sessions for individual operations.
pub trait StorageBackend: Send + Sync + Sized {
    type Session: StorageSession;

    fn open(path: &str) -> StorageResult<Self>;
    fn open_session(&self) -> StorageResult<Self::Session>;
    fn list_tables(&self) -> StorageResult<Vec<String>>;
}

/// A session scopes a series of operations (and optionally a transaction).
pub trait StorageSession: Send + Sized {
    type Cursor: StorageCursor;

    fn create_table(&self, name: &str) -> StorageResult<()>;
    fn drop_table(&self, name: &str) -> StorageResult<()>;
    fn open_cursor(&self, table_name: &str) -> StorageResult<Self::Cursor>;

    fn begin_transaction(&self) -> StorageResult<()>;
    fn commit_transaction(&self) -> StorageResult<()>;
    fn rollback_transaction(&self) -> StorageResult<()>;
    fn in_transaction(&self) -> bool;

    /// Atomically rename a table by copying all rows from `from` to `to` and
    /// dropping `from`, all within a single transaction where the backend
    /// supports it.  The destination table must not already exist.
    fn rename_table(&self, from: &str, to: &str) -> StorageResult<()>;

    fn open_sibling_session(&self) -> StorageResult<Self>;
}

/// A cursor iterates over or mutates records in a single table.
///
/// Lifecycle:
///   1. `set_key_*` / `set_value_*` to stage key and value
///   2. `insert` / `update` / `remove` / `search` / `search_near` to act
///   3. `get_key_*` / `get_value_*` to read positioned data
///   4. `next` to advance to the next record
///   5. `reset` to rewind
pub trait StorageCursor: Send {
    fn set_key_str(&mut self, key: &str);
    fn get_key_str(&self) -> StorageResult<String>;
    fn set_key_raw(&mut self, data: &[u8]);
    fn get_key_raw(&self) -> StorageResult<Vec<u8>>;

    fn set_value_str(&mut self, value: &str);
    fn get_value_str(&self) -> StorageResult<String>;
    fn set_value_raw(&mut self, data: &[u8]);
    fn get_value_raw(&self) -> StorageResult<Vec<u8>>;

    fn search(&mut self) -> StorageResult<()>;
    /// Position at or near the staged key. Returns:
    ///   0  = exact match
    ///  <0  = positioned before the key (closest smaller)
    ///  >0  = positioned after the key (closest larger)
    fn search_near(&mut self) -> StorageResult<i32>;
    fn next(&mut self) -> StorageResult<()>;

    fn insert(&mut self) -> StorageResult<()>;
    fn update(&mut self) -> StorageResult<()>;
    fn remove(&mut self) -> StorageResult<()>;
    fn reset(&mut self) -> StorageResult<()>;
}

// ---------------------------------------------------------------------------
// Platform-default types
// ---------------------------------------------------------------------------

/// Default backend: redb on native, MemBackend on WASM.
#[cfg(not(target_arch = "wasm32"))]
pub type DefaultBackend = RedbBackend;
#[cfg(target_arch = "wasm32")]
pub type DefaultBackend = MemBackend;

/// Default session type matching [`DefaultBackend`].
#[cfg(not(target_arch = "wasm32"))]
pub type DefaultSession = RedbSession;
#[cfg(target_arch = "wasm32")]
pub type DefaultSession = MemSession;
