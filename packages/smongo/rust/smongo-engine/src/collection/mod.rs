//! MongoDB-compatible collection operations for pure Rust BSON documents.
//!
//! This module provides a high-level API for database operations, integrating
//! the query, update, and pluggable storage layers.
//!
//! # Features
//!
//! - **Insert operations**: `insert_one`, `insert_many`
//! - **Find operations**: `find_one`, `find` with query filters
//! - **Update operations**: `update_one`, `update_many`
//! - **Delete operations**: `delete_one`, `delete_many`
//! - **Index operations**: `create_index`, `drop_index`, `list_indexes`
//! - **Vector search**: HNSW (ANN) and flat (exact) via `$vectorSearch` with multi-tenant pre-filtering
//! - **Aggregation pipeline**: 25+ stages including `$vectorSearch`, `$geoNear`, `$lookup`
//! - **Transactions**: multi-document snapshot-isolated sessions
//! - **Utility operations**: `count_documents`
//!
//! # Example
//!
//! ```ignore
//! use smongo_engine::collection::Collection;
//! use bson::doc;
//!
//! let collection = Collection::new(session, "users")?;
//!
//! // Insert a document
//! let result = collection.insert_one(doc! { "name": "Alice", "age": 30 })?;
//!
//! // Create index for faster queries
//! collection.create_index(doc! { "email": 1 }, None)?;
//!
//! // Find documents (uses index automatically)
//! let users = collection.find(doc! { "age": { "$gte": 18 } })?;
//!
//! // Update documents
//! let result = collection.update_many(
//!     doc! { "status": "pending" },
//!     doc! { "$set": { "status": "active" } }
//! )?;
//! ```

use bson::{oid::ObjectId, Bson, Document};
use std::cell::RefCell;
use std::collections::HashSet;
use std::io::Cursor;

use crate::index::{extract_index_key, IndexSpec};
use crate::oplog::{append_oplog, AppendOplogOpts, CollectionOplogSettings};
use crate::storage::{DefaultSession, StorageCursor, StorageError, StorageResult, StorageSession};

// ── Sub-modules ──────────────────────────────────────────────────────
mod aggregate;
mod crud;
pub(crate) mod cursor;
mod exec;
mod explain;
mod geo_find;
mod indexes;
mod transactions;
mod ttl;
mod view;

// ── Re-exports (preserves the public API surface) ────────────────────
pub use cursor::{FindCursor, OwnedFindIter};
pub use view::CollectionView;

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests;

// ── Utility functions ────────────────────────────────────────────────

#[cfg(not(target_arch = "wasm32"))]
fn now_epoch_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[cfg(target_arch = "wasm32")]
fn now_epoch_millis() -> i64 {
    js_sys::Date::now() as i64
}

// ── Error & result types ─────────────────────────────────────────────

/// Result type for collection operations
pub type CollectionResult<T> = Result<T, CollectionError>;

/// Errors that can occur during collection operations
#[derive(Debug)]
pub enum CollectionError {
    StorageError(StorageError),
    SerializationError(String),
    DeserializationError(String),
    QueryError(String),
    UpdateError(String),
    MissingIdError,
    UniqueConstraintViolation(String),
    InvalidIndexSpec(String),
    IndexAlreadyExists(String),
    Other(String),
}

impl From<StorageError> for CollectionError {
    fn from(e: StorageError) -> Self {
        CollectionError::StorageError(e)
    }
}

impl From<bson::ser::Error> for CollectionError {
    fn from(e: bson::ser::Error) -> Self {
        CollectionError::SerializationError(e.to_string())
    }
}

impl From<bson::de::Error> for CollectionError {
    fn from(e: bson::de::Error) -> Self {
        CollectionError::DeserializationError(e.to_string())
    }
}

impl std::fmt::Display for CollectionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CollectionError::StorageError(e) => write!(f, "Storage error: {}", e),
            CollectionError::SerializationError(e) => write!(f, "Serialization error: {}", e),
            CollectionError::DeserializationError(e) => write!(f, "Deserialization error: {}", e),
            CollectionError::QueryError(e) => write!(f, "Query error: {}", e),
            CollectionError::UpdateError(e) => write!(f, "Update error: {}", e),
            CollectionError::MissingIdError => write!(f, "Document missing _id field"),
            CollectionError::UniqueConstraintViolation(e) => {
                write!(f, "Unique constraint violation: {}", e)
            }
            CollectionError::InvalidIndexSpec(e) => write!(f, "Invalid index specification: {}", e),
            CollectionError::IndexAlreadyExists(e) => {
                write!(f, "Index already exists with different keys: {}", e)
            }
            CollectionError::Other(e) => write!(f, "{}", e),
        }
    }
}

impl std::error::Error for CollectionError {}

// ── Public option / result structs ───────────────────────────────────

/// Result of an insert_one operation
pub struct InsertOneResult {
    pub inserted_id: Bson,
}

/// Result of an insert_many operation
pub struct InsertManyResult {
    pub inserted_ids: Vec<Bson>,
}

/// Result of an update operation
pub struct UpdateResult {
    pub matched_count: u64,
    pub modified_count: u64,
    pub upserted_id: Option<Bson>,
}

/// Options for insert operations
#[derive(Default)]
pub struct InsertOptions {
    /// When true, skip oplog recording (used for internal replication replay).
    pub internal: bool,
}

/// Options for update operations
#[derive(Default)]
pub struct UpdateOptions {
    /// When true, insert a new document if no match is found.
    pub upsert: bool,
    /// When true, skip oplog recording.
    pub internal: bool,
}

/// Options for delete operations
#[derive(Default)]
pub struct DeleteOptions {
    /// When true, skip oplog recording.
    pub internal: bool,
}

/// Options for find operations (sort, skip, limit, projection).
#[derive(Default)]
pub struct FindOptions {
    pub sort: Option<Document>,
    pub skip: Option<i64>,
    pub limit: Option<i64>,
    pub projection: Option<Document>,
}

/// Result of a delete operation
pub struct DeleteResult {
    pub deleted_count: u64,
}

// ── Shared private helpers ───────────────────────────────────────────

fn extract_equality_fields(filter: &Document) -> Document {
    let mut doc = Document::new();
    for (key, value) in filter {
        if key.starts_with('$') {
            continue;
        }
        match value {
            Bson::Document(inner) if inner.keys().any(|k| k.starts_with('$')) => {}
            _ => {
                doc.insert(key.clone(), value.clone());
            }
        }
    }
    doc
}

fn ensure_id(doc: &mut Document) -> Bson {
    if let Some(id) = doc.get("_id") {
        id.clone()
    } else {
        let id = Bson::ObjectId(ObjectId::new());
        doc.insert("_id", id.clone());
        id
    }
}

fn extract_id_string(doc: &Document) -> CollectionResult<String> {
    match doc.get("_id") {
        Some(Bson::ObjectId(oid)) => Ok(oid.to_hex()),
        Some(Bson::String(s)) => Ok(s.clone()),
        Some(Bson::Int32(i)) => Ok(i.to_string()),
        Some(Bson::Int64(i)) => Ok(i.to_string()),
        Some(other) => Ok(format!("{}", other)),
        None => Err(CollectionError::MissingIdError),
    }
}

fn serialize_document(doc: &Document) -> CollectionResult<Vec<u8>> {
    let mut buf = Vec::new();
    doc.to_writer(&mut buf)?;
    Ok(buf)
}

fn deserialize_document(bytes: &[u8]) -> CollectionResult<Document> {
    let mut r = Cursor::new(bytes);
    let doc = Document::from_reader(&mut r)?;
    Ok(doc)
}

fn build_seek_prefix(index_keys: &Document, seek_values: &Document) -> Vec<u8> {
    let mut trimmed = Document::new();
    for (field, dir) in index_keys {
        if seek_values.contains_key(field) {
            trimmed.insert(field.clone(), dir.clone());
        } else {
            break;
        }
    }
    extract_index_key(seek_values, &trimmed)
}

fn extract_vector_query(filter: &Document, field: &str) -> Option<(Vec<f32>, usize)> {
    let mut k = 10usize;
    let arr = match filter.get(field)? {
        Bson::Array(arr) => arr.clone(),
        Bson::Document(d) => {
            if let Some(Bson::Int32(n)) = d.get("$k").or_else(|| d.get("$limit")) {
                k = (*n).max(1) as usize;
            } else if let Some(Bson::Int64(n)) = d.get("$k").or_else(|| d.get("$limit")) {
                k = (*n).max(1) as usize;
            }
            match d.get("$near").or_else(|| d.get("$vector")) {
                Some(Bson::Array(a)) => a.clone(),
                _ => return None,
            }
        }
        _ => return None,
    };
    let vec: Vec<f32> = arr
        .iter()
        .filter_map(|v| v.as_f64().map(|f| f as f32))
        .collect();
    if vec.len() != arr.len() || vec.is_empty() {
        return None;
    }
    Some((vec, k))
}

fn apply_projection_to_index_doc(index_doc: &Document, projection: &Document) -> Document {
    let mut result = Document::new();

    for (field, value) in projection {
        if field == "_id" {
            continue;
        }

        let is_included = match value {
            Bson::Int32(n) => *n != 0,
            Bson::Int64(n) => *n != 0,
            Bson::Double(d) => *d != 0.0,
            Bson::Boolean(b) => *b,
            _ => true,
        };

        if is_included {
            if let Some(v) = index_doc.get(field) {
                result.insert(field.clone(), v.clone());
            }
        }
    }

    result
}

fn should_include_id(projection: &Document) -> bool {
    !matches!(
        projection.get("_id"),
        Some(Bson::Int32(0)) | Some(Bson::Int64(0)) | Some(Bson::Boolean(false))
    )
}

// ── Collection struct & core impl ────────────────────────────────────

/// A MongoDB-compatible collection backed by pluggable storage.
pub struct Collection<S: StorageSession = DefaultSession> {
    session: S,
    table_name: String,
    collection_name: String,
    validator: Option<Document>,
    /// When set, mutating operations append BSON oplog rows in the same storage transaction.
    oplog: Option<CollectionOplogSettings>,
    /// Cached index specs, populated on first `list_indexes()` call within a
    /// `with_batched_write` scope to avoid repeated metadata reads.
    index_cache: RefCell<Option<Vec<IndexSpec>>>,
}

impl<S: StorageSession> Collection<S> {
    /// Create a new collection using `name` as the storage table name.
    pub fn new(session: S, name: &str) -> CollectionResult<Self> {
        Self::with_table_uri(session, name, name)
    }

    /// Create a collection with a custom storage table name.
    ///
    /// Use this when you need a namespaced table like `mydb_users`.
    pub fn with_table_uri(session: S, name: &str, table_uri: &str) -> CollectionResult<Self> {
        session.create_table(table_uri)?;

        Ok(Collection {
            session,
            table_name: table_uri.to_string(),
            collection_name: name.to_string(),
            validator: None,
            oplog: None,
            index_cache: RefCell::new(None),
        })
    }

    /// Attach oplog settings (creates oplog table). Used for sync / change streams on redb.
    pub fn with_oplog_settings(mut self, oplog: CollectionOplogSettings) -> CollectionResult<Self> {
        self.session
            .create_table(&oplog.oplog_table)
            .map_err(CollectionError::from)?;
        self.oplog = Some(oplog);
        Ok(self)
    }

    fn map_oplog_err(e: crate::oplog::OplogError) -> CollectionError {
        CollectionError::Other(e.to_string())
    }

    fn with_batched_write<R>(
        &self,
        f: impl FnOnce(&Self) -> CollectionResult<R>,
    ) -> CollectionResult<R> {
        // If an outer transaction is already active (e.g. from with_transaction),
        // just run the closure without nesting to avoid commit/rollback conflicts.
        if self.session.in_transaction() {
            return f(self);
        }
        self.session
            .begin_transaction()
            .map_err(CollectionError::from)?;
        let r = f(self);
        // Invalidate cached index list; the committed data may have changed.
        *self.index_cache.borrow_mut() = None;
        match &r {
            Ok(_) => {
                self.session
                    .commit_transaction()
                    .map_err(CollectionError::from)?;
            }
            Err(_) => {
                let _ = self.session.rollback_transaction();
            }
        }
        r
    }

    fn append_oplog_if_enabled(
        &self,
        op: &str,
        doc_id: Bson,
        payload: Option<Document>,
        internal: bool,
        changed_fields: Option<Vec<String>>,
    ) -> CollectionResult<()> {
        if internal {
            return Ok(());
        }
        let Some(ref cfg) = self.oplog else {
            return Ok(());
        };
        append_oplog(
            &self.session,
            cfg,
            op,
            doc_id,
            payload,
            AppendOplogOpts {
                changed_fields,
                ..Default::default()
            },
        )
        .map_err(Self::map_oplog_err)?;
        Ok(())
    }

    fn doc_top_level_changed(before: &Document, after: &Document) -> Vec<String> {
        let mut names = HashSet::new();
        for k in before.keys().chain(after.keys()) {
            if k != "_id" {
                names.insert(k.clone());
            }
        }
        let mut out: Vec<String> = names
            .into_iter()
            .filter(|k| before.get(k) != after.get(k))
            .collect();
        out.sort();
        out
    }

    /// Attach a JSON Schema validator. Documents will be validated on insert/update.
    pub fn set_validator(&mut self, schema: Option<Document>) {
        self.validator = schema;
    }

    /// Get the current validator schema, if any.
    pub fn validator(&self) -> Option<&Document> {
        self.validator.as_ref()
    }

    fn validate_doc(&self, doc: &Document) -> CollectionResult<()> {
        if let Some(ref schema) = self.validator {
            crate::schema::validate_document(doc, schema)
                .map_err(|e| CollectionError::Other(format!("Validation failed: {}", e)))
        } else {
            Ok(())
        }
    }

    /// Get a cursor for the collection table
    fn cursor(&self) -> StorageResult<S::Cursor> {
        self.session.open_cursor(&self.table_name)
    }

    fn fetch_doc_by_id_str(&self, id: &str) -> CollectionResult<Option<Document>> {
        let mut data_cursor = self.cursor().map_err(CollectionError::from)?;
        data_cursor.set_key_str(id);
        if data_cursor.search().is_err() {
            return Ok(None);
        }
        let doc_bytes = data_cursor.get_value_raw().map_err(CollectionError::from)?;
        Ok(Some(deserialize_document(&doc_bytes)?))
    }

    /// Access the underlying storage session (for transaction sharing).
    pub fn session(&self) -> &S {
        &self.session
    }

    /// Get the collection name.
    pub fn collection_name(&self) -> &str {
        &self.collection_name
    }

    /// Get the storage table name.
    pub fn table_name(&self) -> &str {
        &self.table_name
    }
}
