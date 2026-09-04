//! MongoDB-compatible database operations managing multiple collections.
//!
//! This module provides the top-level API for database operations, managing
//! multiple collections within a single storage backend.
//!
//! # Example (native)
//!
//! ```ignore
//! use smongo_engine::database::Database;
//! use bson::doc;
//!
//! // Database::open() is available on native targets (redb backend).
//! // On WASM, use Database::from_backend(MemBackend::new(), "mydb", None).
//! let db = Database::open("./data/mydb")?;
//! let users = db.collection("users")?;
//! users.insert_one(doc! { "name": "Alice" })?;
//! let names = db.list_collection_names()?;
//! ```

#[cfg(not(target_arch = "wasm32"))]
use std::path::Path;

use crate::collection::{Collection, CollectionError, CollectionView};
#[cfg(not(target_arch = "wasm32"))]
use crate::storage::RedbBackend;
#[cfg(not(target_arch = "wasm32"))]
use crate::storage::StorageCursor;
use crate::storage::{DefaultSession, StorageBackend, StorageError, StorageSession};

pub type DatabaseResult<T> = Result<T, DatabaseError>;

#[derive(Debug)]
pub enum DatabaseError {
    StorageError(StorageError),
    CollectionError(CollectionError),
    DatabaseNotFound,
    CollectionNotFound(String),
    InvalidName(String),
    IoError(std::io::Error),
    Other(String),
}

impl From<StorageError> for DatabaseError {
    fn from(err: StorageError) -> Self {
        DatabaseError::StorageError(err)
    }
}

impl From<CollectionError> for DatabaseError {
    fn from(err: CollectionError) -> Self {
        DatabaseError::CollectionError(err)
    }
}

impl From<std::io::Error> for DatabaseError {
    fn from(err: std::io::Error) -> Self {
        DatabaseError::IoError(err)
    }
}

impl std::fmt::Display for DatabaseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DatabaseError::StorageError(e) => write!(f, "Storage error: {}", e),
            DatabaseError::CollectionError(e) => write!(f, "Collection error: {}", e),
            DatabaseError::DatabaseNotFound => write!(f, "Database not found"),
            DatabaseError::CollectionNotFound(name) => {
                write!(f, "Collection not found: {}", name)
            }
            DatabaseError::InvalidName(name) => write!(f, "Invalid database name: {}", name),
            DatabaseError::IoError(e) => write!(f, "I/O error: {}", e),
            DatabaseError::Other(e) => write!(f, "Error: {}", e),
        }
    }
}

impl std::error::Error for DatabaseError {}

/// A MongoDB-compatible database managing multiple collections.
///
/// Generic over the storage backend. On native targets the default is
/// [`RedbBackend`] (redb, single-file ACID). On WASM the default is
/// [`MemBackend`](crate::storage::MemBackend) (in-memory, no persistence).
pub struct Database<B: StorageBackend = crate::storage::DefaultBackend> {
    backend: B,
    name: String,
    path: String,
    table_prefix: Option<String>,
}

#[cfg(not(target_arch = "wasm32"))]
impl Database<RedbBackend> {
    /// Open or create a database backed by redb at the given path.
    pub fn open<P: AsRef<Path>>(path: P) -> DatabaseResult<Self> {
        let path_str = path
            .as_ref()
            .to_str()
            .ok_or_else(|| DatabaseError::InvalidName("Invalid path".to_string()))?;

        std::fs::create_dir_all(path.as_ref())?;

        let name = path
            .as_ref()
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("default")
            .to_string();

        let db_file = path.as_ref().join("data.redb");
        let db_file_str = db_file
            .to_str()
            .ok_or_else(|| DatabaseError::InvalidName("Invalid db file path".to_string()))?;

        let backend = RedbBackend::open(db_file_str)?;

        Ok(Database {
            backend,
            name,
            path: path_str.to_string(),
            table_prefix: None,
        })
    }
}

impl<B: StorageBackend> Database<B> {
    /// Create a Database from an existing backend.
    pub fn from_backend(backend: B, name: &str, table_prefix: Option<&str>) -> Self {
        Database {
            backend,
            name: name.to_string(),
            path: String::new(),
            table_prefix: table_prefix.map(String::from),
        }
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn path(&self) -> &str {
        &self.path
    }

    /// Open a new storage session (low-level oplog / KV helpers).
    pub fn open_storage_session(&self) -> DatabaseResult<B::Session> {
        self.backend.open_session().map_err(DatabaseError::from)
    }

    /// Get or create a collection.
    pub fn collection(&self, name: &str) -> DatabaseResult<Collection<B::Session>> {
        let session = self.backend.open_session()?;
        if let Some(ref prefix) = self.table_prefix {
            let table_uri = format!("{}{}", prefix, name);
            Ok(Collection::with_table_uri(session, name, &table_uri)?)
        } else {
            Ok(Collection::new(session, name)?)
        }
    }

    /// Same as [`collection`](Self::collection) but enables BSON oplog on `__oplog_{logical_db}_{name}`.
    pub fn collection_with_oplog(
        &self,
        logical_db: &str,
        coll_name: &str,
        hub: Option<std::sync::Arc<crate::oplog::OplogHub>>,
        node_id: Option<String>,
    ) -> DatabaseResult<Collection<B::Session>> {
        let session = self.backend.open_session()?;
        let col = if let Some(ref prefix) = self.table_prefix {
            let table_uri = format!("{}{}", prefix, coll_name);
            Collection::with_table_uri(session, coll_name, &table_uri)?
        } else {
            Collection::new(session, coll_name)?
        };
        let ns = format!("{logical_db}.{coll_name}");
        let oplog_table = format!("__oplog_{logical_db}_{coll_name}");
        let settings = crate::oplog::CollectionOplogSettings {
            oplog_table,
            namespace: ns,
            hub,
            node_id,
        };
        Ok(col.with_oplog_settings(settings)?)
    }

    /// Start a new session for multi-collection transactions.
    pub fn start_session(&self) -> DatabaseResult<TransactionSession<B::Session>> {
        let session = self.backend.open_session()?;
        Ok(TransactionSession {
            session,
            table_prefix: self.table_prefix.clone(),
        })
    }

    /// Delete expired documents across all collections (TTL reaper).
    pub fn reap_ttl(&self) -> DatabaseResult<u64> {
        let names = self.list_collection_names()?;
        let mut total = 0u64;
        for name in names {
            if name.contains(".idx_") || name.contains(".indexes_metadata") {
                continue;
            }
            let col = self.collection(&name)?;
            total += col.reap_expired().map_err(DatabaseError::CollectionError)?;
        }
        Ok(total)
    }

    /// List all collection names in the database.
    pub fn list_collection_names(&self) -> DatabaseResult<Vec<String>> {
        let all_tables = self.backend.list_tables()?;
        let mut collections = Vec::new();
        for name in all_tables {
            // Skip internal tables (indexes, metadata, oplog)
            if name.starts_with("__")
                || name.contains(".idx_")
                || name.contains(".indexes_metadata")
            {
                continue;
            }
            if let Some(ref prefix) = self.table_prefix {
                if let Some(stripped) = name.strip_prefix(prefix.as_str()) {
                    collections.push(stripped.to_string());
                }
            } else {
                collections.push(name);
            }
        }
        Ok(collections)
    }

    /// Drop a collection from the database.
    ///
    /// Removes the primary document table plus any satellite tables owned by that
    /// collection (secondary indexes `{{table}}.idx_*` and `{{table}}.indexes_metadata`).
    /// Oplog tables (`__oplog_*`) are not included; drop those separately if needed.
    pub fn drop_collection(&self, name: &str) -> DatabaseResult<()> {
        let table_name = if let Some(ref prefix) = self.table_prefix {
            format!("{}{}", prefix, name)
        } else {
            name.to_string()
        };

        let all_tables = self.backend.list_tables()?;
        if !all_tables.iter().any(|t| t == &table_name) {
            return Err(DatabaseError::CollectionNotFound(name.to_string()));
        }

        let child_prefix = format!("{}.", table_name);
        let mut owned: Vec<String> = all_tables
            .into_iter()
            .filter(|t| t == &table_name || t.starts_with(&child_prefix))
            .collect();
        // Drop `users.idx_*` / `users.indexes_metadata` before `users`.
        owned.sort_by_key(|t| std::cmp::Reverse(t.len()));

        let session = self.backend.open_session()?;
        for t in owned {
            let is_primary = t == table_name;
            match session.drop_table(&t) {
                Ok(()) => {}
                Err(e) => {
                    if is_primary {
                        return Err(DatabaseError::from(e));
                    }
                    // Secondary tables: tolerate missing / already dropped.
                }
            }
        }
        Ok(())
    }

    /// Atomically rename a collection (and its satellite tables: indexes, metadata).
    ///
    /// On redb this executes inside a single write transaction -- a crash at any
    /// point either completes the full rename or leaves the original intact.
    pub fn rename_collection(&self, from: &str, to: &str) -> DatabaseResult<()> {
        let prefix = self.table_prefix.as_deref().unwrap_or("");
        let src_table = format!("{prefix}{from}");
        let dst_table = format!("{prefix}{to}");

        let all_tables = self.backend.list_tables()?;
        if !all_tables.iter().any(|t| t == &src_table) {
            return Err(DatabaseError::CollectionNotFound(from.to_string()));
        }

        let child_prefix = format!("{src_table}.");
        let session = self.backend.open_session()?;

        // Rename the primary document table.
        session.rename_table(&src_table, &dst_table)?;

        // Rename satellite tables (indexes, metadata) by swapping the prefix.
        let dst_child_prefix = format!("{dst_table}.");
        for table in &all_tables {
            if let Some(suffix) = table.strip_prefix(&child_prefix) {
                let new_name = format!("{dst_child_prefix}{suffix}");
                let _ = session.rename_table(table, &new_name);
            }
        }

        Ok(())
    }

    /// Drop the entire database (deletes all data files).
    ///
    /// Only available on native targets (requires filesystem).
    #[cfg(not(target_arch = "wasm32"))]
    pub fn drop(self) -> DatabaseResult<()> {
        let path = self.path.clone();
        drop(self.backend);
        std::fs::remove_dir_all(&path)?;
        Ok(())
    }

    /// Get database statistics.
    pub fn stats(&self) -> DatabaseResult<DatabaseStats> {
        let collection_names = self.list_collection_names()?;
        let collection_count = collection_names.len();
        let size = Self::get_data_size(&self.path);
        Ok(DatabaseStats {
            collection_count,
            size_bytes: size,
        })
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn get_data_size(path: &str) -> u64 {
        Self::get_directory_size(path).unwrap_or(0)
    }

    #[cfg(target_arch = "wasm32")]
    fn get_data_size(_path: &str) -> u64 {
        0
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn get_directory_size(path: &str) -> DatabaseResult<u64> {
        let mut total_size = 0u64;
        for entry in std::fs::read_dir(path)? {
            let entry = entry?;
            let metadata = entry.metadata()?;
            if metadata.is_file() {
                total_size += metadata.len();
            } else if metadata.is_dir() {
                if let Some(subdir_path) = entry.path().to_str() {
                    total_size += Self::get_directory_size(subdir_path)?;
                }
            }
        }
        Ok(total_size)
    }
}

// ============================================================
// TRANSACTION SESSION
// ============================================================

/// A session for multi-collection transactions.
///
/// Owns a single storage session. Multiple [`CollectionView`]s created
/// from this session share the same transaction context.
pub struct TransactionSession<S: StorageSession = DefaultSession> {
    session: S,
    table_prefix: Option<String>,
}

impl<S: StorageSession> TransactionSession<S> {
    pub fn begin_transaction(&self) -> DatabaseResult<()> {
        self.session
            .begin_transaction()
            .map_err(DatabaseError::from)
    }

    pub fn commit_transaction(&self) -> DatabaseResult<()> {
        self.session
            .commit_transaction()
            .map_err(DatabaseError::from)
    }

    pub fn rollback_transaction(&self) -> DatabaseResult<()> {
        self.session
            .rollback_transaction()
            .map_err(DatabaseError::from)
    }

    pub fn collection(&self, name: &str) -> DatabaseResult<CollectionView<'_, S>> {
        let table_uri = if let Some(ref prefix) = self.table_prefix {
            format!("{}{}", prefix, name)
        } else {
            name.to_string()
        };
        Ok(CollectionView::new(&self.session, name, &table_uri)?)
    }

    pub fn session(&self) -> &S {
        &self.session
    }
}

#[cfg(not(target_arch = "wasm32"))]
impl Database<RedbBackend> {
    /// Read a UTF-8 string value by key (table created if missing).
    pub fn redb_kv_get(&self, table: &str, key: &str) -> DatabaseResult<Option<String>> {
        let s = self.backend.open_session()?;
        let _ = s.create_table(table);
        let mut c = s.open_cursor(table)?;
        c.set_key_str(key);
        match c.search() {
            Ok(()) => Ok(Some(c.get_value_str()?)),
            Err(StorageError::NotFound(_)) => Ok(None),
            Err(e) => Err(DatabaseError::from(e)),
        }
    }

    /// Upsert key → UTF-8 string value.
    pub fn redb_kv_put(&self, table: &str, key: &str, value: &str) -> DatabaseResult<()> {
        let s = self.backend.open_session()?;
        s.create_table(table)?;
        let mut c = s.open_cursor(table)?;
        c.set_key_str(key);
        c.set_value_str(value);
        c.insert()?;
        Ok(())
    }

    /// Remove a key if present.
    pub fn redb_kv_remove(&self, table: &str, key: &str) -> DatabaseResult<()> {
        let s = self.backend.open_session()?;
        let mut c = s.open_cursor(table)?;
        c.set_key_str(key);
        let _ = c.remove();
        Ok(())
    }

    /// Scan entire table as (key, value) pairs in sort order.
    pub fn redb_kv_scan(&self, table: &str) -> DatabaseResult<Vec<(String, String)>> {
        let s = self.backend.open_session()?;
        let mut c = s.open_cursor(table)?;
        let mut out = Vec::new();
        let _ = c.reset();
        while c.next().is_ok() {
            out.push((c.get_key_str()?, c.get_value_str()?));
        }
        Ok(out)
    }

    /// Atomically write a checkpoint key and remove oplog keys strictly less than *truncate_before_exclusive*.
    pub fn redb_atomic_checkpoint_truncate_oplog(
        &self,
        checkpoint_table: &str,
        checkpoint_key: &str,
        checkpoint_val: &str,
        oplog_table: &str,
        truncate_before_exclusive: &str,
    ) -> DatabaseResult<()> {
        let s = self.backend.open_session()?;
        s.create_table(checkpoint_table)?;
        s.begin_transaction()?;
        {
            let mut ck = s.open_cursor(checkpoint_table)?;
            ck.set_key_str(checkpoint_key);
            ck.set_value_str(checkpoint_val);
            ck.insert()?;
        }
        let mut to_remove: Vec<String> = Vec::new();
        {
            let mut oc = s.open_cursor(oplog_table)?;
            let _ = oc.reset();
            while oc.next().is_ok() {
                let k = oc.get_key_str()?;
                if k.as_str() >= truncate_before_exclusive {
                    break;
                }
                to_remove.push(k);
            }
        }
        for k in &to_remove {
            let mut c = s.open_cursor(oplog_table)?;
            c.set_key_str(k);
            let _ = c.remove();
        }
        s.commit_transaction()?;
        Ok(())
    }
}

/// Database statistics
#[derive(Debug, Clone)]
pub struct DatabaseStats {
    pub collection_count: usize,
    pub size_bytes: u64,
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;
    use bson::doc;
    use tempfile::TempDir;

    fn setup_database() -> (TempDir, Database) {
        let temp_dir = TempDir::new().unwrap();
        let db = Database::open(temp_dir.path().join("testdb")).unwrap();
        (temp_dir, db)
    }

    #[test]
    fn test_open_database() {
        let (_temp_dir, db) = setup_database();
        assert!(!db.name().is_empty());
        assert!(!db.path().is_empty());
    }

    #[test]
    fn test_collection_crud() {
        let (_temp_dir, db) = setup_database();
        let users = db.collection("users").unwrap();
        let result = users.insert_one(doc! { "name": "Alice" }).unwrap();
        assert!(matches!(result.inserted_id, bson::Bson::ObjectId(_)));
        let found = users.find_one(doc! { "name": "Alice" }).unwrap();
        assert!(found.is_some());
    }

    #[test]
    fn test_list_collections_empty() {
        let (_temp_dir, db) = setup_database();
        let names = db.list_collection_names().unwrap();
        assert_eq!(names.len(), 0);
    }

    #[test]
    fn test_list_collections() {
        let (_temp_dir, db) = setup_database();
        db.collection("users")
            .unwrap()
            .insert_one(doc! { "name": "Alice" })
            .unwrap();
        db.collection("posts")
            .unwrap()
            .insert_one(doc! { "title": "Hello" })
            .unwrap();
        db.collection("comments")
            .unwrap()
            .insert_one(doc! { "text": "Nice" })
            .unwrap();
        let names = db.list_collection_names().unwrap();
        assert!(names.contains(&"users".to_string()));
        assert!(names.contains(&"posts".to_string()));
        assert!(names.contains(&"comments".to_string()));
        assert_eq!(names.len(), 3);
    }

    #[test]
    fn test_drop_collection() {
        let (_temp_dir, db) = setup_database();
        db.collection("users")
            .unwrap()
            .insert_one(doc! { "name": "Alice" })
            .unwrap();
        let names = db.list_collection_names().unwrap();
        assert!(names.contains(&"users".to_string()));
        db.drop_collection("users").unwrap();
        let names = db.list_collection_names().unwrap();
        assert!(!names.contains(&"users".to_string()));
    }

    #[test]
    fn test_drop_collection_removes_index_tables() {
        let (_temp_dir, db) = setup_database();
        let users = db.collection("users").unwrap();
        users.insert_one(doc! { "email": "a@example.com" }).unwrap();
        users.create_index(doc! { "email": 1 }, None).unwrap();
        let tables_before = db.backend.list_tables().unwrap();
        assert!(tables_before.iter().any(|t| t.contains("idx_")));

        db.drop_collection("users").unwrap();

        let tables_after = db.backend.list_tables().unwrap();
        assert!(!tables_after
            .iter()
            .any(|t| { t == "users" || t.starts_with("users.") }));
        assert!(db.drop_collection("users").is_err());
    }

    #[test]
    fn test_multiple_collections() {
        let (_temp_dir, db) = setup_database();
        let users = db.collection("users").unwrap();
        let posts = db.collection("posts").unwrap();
        users.insert_one(doc! { "name": "Alice" }).unwrap();
        posts.insert_one(doc! { "title": "Hello" }).unwrap();
        assert_eq!(users.count_documents(None).unwrap(), 1);
        assert_eq!(posts.count_documents(None).unwrap(), 1);
    }

    #[test]
    fn test_database_stats() {
        let (_temp_dir, db) = setup_database();
        let stats = db.stats().unwrap();
        assert_eq!(stats.collection_count, 0);

        db.collection("users")
            .unwrap()
            .insert_one(doc! { "name": "Alice" })
            .unwrap();
        db.collection("posts")
            .unwrap()
            .insert_one(doc! { "title": "Hello" })
            .unwrap();

        let stats = db.stats().unwrap();
        assert_eq!(stats.collection_count, 2);
        assert!(stats.size_bytes > 0);
    }

    #[test]
    fn test_drop_database() {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("testdb");
        {
            let db = Database::open(&db_path).unwrap();
            db.collection("users")
                .unwrap()
                .insert_one(doc! { "name": "Alice" })
                .unwrap();
            assert!(db_path.exists());
            db.drop().unwrap();
        }
        assert!(!db_path.exists());
    }

    #[test]
    fn test_collection_operations_integration() {
        let (_temp_dir, db) = setup_database();
        let users = db.collection("users").unwrap();
        users
            .insert_one(doc! { "name": "Alice", "age": 30 })
            .unwrap();
        users.insert_one(doc! { "name": "Bob", "age": 25 }).unwrap();
        let all_users = users.find(doc! {}).unwrap();
        assert_eq!(all_users.len(), 2);
        users
            .update_one(doc! { "name": "Alice" }, doc! { "$set": { "age": 31 } })
            .unwrap();
        let alice = users.find_one(doc! { "name": "Alice" }).unwrap().unwrap();
        assert_eq!(alice.get_i32("age").unwrap(), 31);
        users.delete_one(doc! { "name": "Bob" }).unwrap();
        let remaining = users.find(doc! {}).unwrap();
        assert_eq!(remaining.len(), 1);
        assert_eq!(users.count_documents(None).unwrap(), 1);
    }

    #[test]
    fn test_multi_collection_transaction_commit() {
        let (_temp_dir, db) = setup_database();
        db.collection("orders").unwrap();
        db.collection("inventory").unwrap();

        let session = db.start_session().unwrap();
        session.begin_transaction().unwrap();
        {
            let orders = session.collection("orders").unwrap();
            let inventory = session.collection("inventory").unwrap();
            orders
                .insert_one(doc! { "item": "apple", "qty": 5 })
                .unwrap();
            inventory
                .insert_one(doc! { "sku": "apple", "stock": 100 })
                .unwrap();
        }
        session.commit_transaction().unwrap();

        let orders = db.collection("orders").unwrap();
        let inventory = db.collection("inventory").unwrap();
        assert_eq!(orders.count_documents(None).unwrap(), 1);
        assert_eq!(inventory.count_documents(None).unwrap(), 1);
    }

    #[test]
    fn test_multi_collection_transaction_rollback() {
        let (_temp_dir, db) = setup_database();
        db.collection("orders").unwrap();
        db.collection("inventory").unwrap();

        let session = db.start_session().unwrap();
        session.begin_transaction().unwrap();
        {
            let orders = session.collection("orders").unwrap();
            let inventory = session.collection("inventory").unwrap();
            orders.insert_one(doc! { "item": "apple" }).unwrap();
            inventory.insert_one(doc! { "sku": "apple" }).unwrap();
        }
        session.rollback_transaction().unwrap();

        let orders = db.collection("orders").unwrap();
        let inventory = db.collection("inventory").unwrap();
        assert_eq!(orders.count_documents(None).unwrap(), 0);
        assert_eq!(inventory.count_documents(None).unwrap(), 0);
    }

    #[test]
    fn test_reap_ttl_no_ttl_indexes() {
        let (_temp_dir, db) = setup_database();
        let col = db.collection("data").unwrap();
        col.insert_one(doc! { "x": 1 }).unwrap();
        assert_eq!(db.reap_ttl().unwrap(), 0);
    }
}
