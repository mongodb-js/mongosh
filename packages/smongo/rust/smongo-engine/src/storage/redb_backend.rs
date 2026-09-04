//! Production storage backend powered by [redb](https://github.com/cberner/redb).
//!
//! redb is a pure-Rust, ACID, single-file embedded B-tree database. All tables
//! are stored as `TableDefinition<&[u8], &[u8]>` internally; the cursor layer
//! handles string / byte conversion.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, OnceLock};

use redb::{Database, ReadableTable, TableDefinition, TableHandle};

use super::{StorageBackend, StorageCursor, StorageError, StorageResult, StorageSession};

fn lock_map<T>(mutex: &Mutex<T>) -> StorageResult<MutexGuard<'_, T>> {
    mutex
        .lock()
        .map_err(|e| StorageError::Other(format!("lock poisoned: {e}")))
}

// redb's `TableDefinition` requires a `'static` name; we intern dynamic table names once.
static TABLE_NAME_INTERN: OnceLock<Mutex<HashMap<String, &'static str>>> = OnceLock::new();

fn intern_table_name(name: &str) -> &'static str {
    let pool = TABLE_NAME_INTERN.get_or_init(|| Mutex::new(HashMap::new()));
    let mut guard = pool.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(&s) = guard.get(name) {
        return s;
    }
    let owned = name.to_string();
    let s: &'static str = Box::leak(owned.clone().into_boxed_str());
    guard.insert(owned, s);
    s
}

// All tables use the same redb type. String keys/values are stored as UTF-8.
fn table_def(name: &'static str) -> TableDefinition<'static, &'static [u8], &'static [u8]> {
    TableDefinition::new(name)
}

// ---------------------------------------------------------------------------
// Pending write buffer (used during explicit transactions)
// ---------------------------------------------------------------------------

/// Buffered write operation. The table name is the HashMap key in the
/// partitioned `pending_writes` map, so it is not stored here.
#[derive(Debug, Clone)]
enum PendingWrite {
    Insert { key: Vec<u8>, value: Vec<u8> },
    Remove { key: Vec<u8> },
}

/// Pending writes partitioned by table name for O(1) lookup in `materialize()`.
type PendingWriteMap = HashMap<String, Vec<PendingWrite>>;

// ---------------------------------------------------------------------------
// RedbBackend
// ---------------------------------------------------------------------------

pub struct RedbBackend {
    db: Arc<Database>,
}

impl StorageBackend for RedbBackend {
    type Session = RedbSession;

    fn open(path: &str) -> StorageResult<Self> {
        let db = Database::create(path).map_err(|e| StorageError::Other(e.to_string()))?;
        Ok(Self { db: Arc::new(db) })
    }

    fn open_session(&self) -> StorageResult<RedbSession> {
        Ok(RedbSession {
            db: self.db.clone(),
            in_transaction: Arc::new(AtomicBool::new(false)),
            pending_writes: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    fn list_tables(&self) -> StorageResult<Vec<String>> {
        let read_txn = self
            .db
            .begin_read()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        let tables = read_txn
            .list_tables()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        Ok(tables.map(|h| h.name().to_string()).collect())
    }
}

// ---------------------------------------------------------------------------
// RedbSession
// ---------------------------------------------------------------------------

pub struct RedbSession {
    db: Arc<Database>,
    in_transaction: Arc<AtomicBool>,
    pending_writes: Arc<Mutex<PendingWriteMap>>,
}

impl StorageSession for RedbSession {
    type Cursor = RedbCursor;

    fn create_table(&self, name: &str) -> StorageResult<()> {
        let txn = self
            .db
            .begin_write()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        {
            let _table = txn
                .open_table(table_def(intern_table_name(name)))
                .map_err(|e| StorageError::Other(e.to_string()))?;
        }
        txn.commit()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        Ok(())
    }

    fn drop_table(&self, name: &str) -> StorageResult<()> {
        let txn = self
            .db
            .begin_write()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        txn.delete_table(table_def(intern_table_name(name)))
            .map_err(|e| StorageError::Other(e.to_string()))?;
        txn.commit()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        Ok(())
    }

    fn open_cursor(&self, table_name: &str) -> StorageResult<RedbCursor> {
        Ok(RedbCursor {
            db: self.db.clone(),
            table_name: table_name.to_string(),
            entries: None,
            position: None,
            current_key: None,
            current_value: None,
            pending_key: None,
            pending_value: None,
            in_transaction: self.in_transaction.clone(),
            pending_writes: self.pending_writes.clone(),
        })
    }

    fn in_transaction(&self) -> bool {
        self.in_transaction.load(Ordering::SeqCst)
    }

    fn begin_transaction(&self) -> StorageResult<()> {
        self.in_transaction.store(true, Ordering::SeqCst);
        lock_map(&self.pending_writes)?.clear();
        Ok(())
    }

    fn commit_transaction(&self) -> StorageResult<()> {
        let ops_by_table: PendingWriteMap = {
            let mut buf = lock_map(&self.pending_writes)?;
            std::mem::take(&mut *buf)
        };
        self.in_transaction.store(false, Ordering::SeqCst);

        if ops_by_table.is_empty() {
            return Ok(());
        }

        let txn = self
            .db
            .begin_write()
            .map_err(|e| StorageError::Other(e.to_string()))?;

        for (table, ops) in &ops_by_table {
            let mut t = txn
                .open_table(table_def(intern_table_name(table)))
                .map_err(|e| StorageError::Other(e.to_string()))?;
            for op in ops {
                match op {
                    PendingWrite::Insert { key, value } => {
                        t.insert(key.as_slice(), value.as_slice())
                            .map_err(|e| StorageError::Other(e.to_string()))?;
                    }
                    PendingWrite::Remove { key } => {
                        t.remove(key.as_slice())
                            .map_err(|e| StorageError::Other(e.to_string()))?;
                    }
                }
            }
        }

        txn.commit()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        Ok(())
    }

    fn rollback_transaction(&self) -> StorageResult<()> {
        lock_map(&self.pending_writes)?.clear();
        self.in_transaction.store(false, Ordering::SeqCst);
        Ok(())
    }

    fn rename_table(&self, from: &str, to: &str) -> StorageResult<()> {
        let from_static = intern_table_name(from);
        let to_static = intern_table_name(to);
        let txn = self
            .db
            .begin_write()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        {
            let src = match txn.open_table(table_def(from_static)) {
                Ok(t) => t,
                Err(redb::TableError::TableDoesNotExist(_)) => {
                    return Err(StorageError::NotFound(format!(
                        "table {from} does not exist"
                    )));
                }
                Err(e) => return Err(StorageError::Other(e.to_string())),
            };
            let mut dst = txn
                .open_table(table_def(to_static))
                .map_err(|e| StorageError::Other(e.to_string()))?;
            let iter = src.iter().map_err(|e| StorageError::Other(e.to_string()))?;
            for item in iter {
                let (k, v) = item.map_err(|e| StorageError::Other(e.to_string()))?;
                dst.insert(k.value(), v.value())
                    .map_err(|e| StorageError::Other(e.to_string()))?;
            }
        }
        txn.delete_table(table_def(from_static))
            .map_err(|e| StorageError::Other(e.to_string()))?;
        txn.commit()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        Ok(())
    }

    fn open_sibling_session(&self) -> StorageResult<Self> {
        Ok(RedbSession {
            db: self.db.clone(),
            in_transaction: Arc::new(AtomicBool::new(false)),
            pending_writes: Arc::new(Mutex::new(HashMap::new())),
        })
    }
}

// ---------------------------------------------------------------------------
// RedbCursor
// ---------------------------------------------------------------------------

pub struct RedbCursor {
    db: Arc<Database>,
    table_name: String,

    // Materialized snapshot for iteration (loaded lazily)
    entries: Option<Vec<(Vec<u8>, Vec<u8>)>>,
    position: Option<usize>,

    // Current key/value after positioning (next / search / search_near)
    current_key: Option<Vec<u8>>,
    current_value: Option<Vec<u8>>,

    // Staged key/value before a mutation or search
    pending_key: Option<Vec<u8>>,
    pending_value: Option<Vec<u8>>,

    // Shared transaction state with the session
    in_transaction: Arc<AtomicBool>,
    pending_writes: Arc<Mutex<PendingWriteMap>>,
}

impl RedbCursor {
    /// Ensure `self.entries` is populated with a sorted snapshot of the table.
    fn materialize(&mut self) -> StorageResult<()> {
        if self.entries.is_some() {
            return Ok(());
        }
        let read_txn = self
            .db
            .begin_read()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        let static_name = intern_table_name(self.table_name.as_str());
        let table = match read_txn.open_table(table_def(static_name)) {
            Ok(t) => t,
            Err(redb::TableError::TableDoesNotExist(_)) => {
                self.entries = Some(Vec::new());
                return Ok(());
            }
            Err(e) => return Err(StorageError::Other(e.to_string())),
        };
        let mut rows = Vec::new();
        let iter = table
            .iter()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        for item in iter {
            let (k, v) = item.map_err(|e| StorageError::Other(e.to_string()))?;
            rows.push((k.value().to_vec(), v.value().to_vec()));
        }

        // During an explicit transaction, mutations are buffered in `pending_writes`
        // and are not yet visible to redb read transactions. Merge only the ops
        // for *this* table (O(1) HashMap lookup instead of scanning all ops).
        if self.in_transaction.load(Ordering::SeqCst) {
            let pending = lock_map(&self.pending_writes)?;
            if let Some(ops) = pending.get(&self.table_name) {
                for op in ops {
                    match op {
                        PendingWrite::Insert { key, value } => {
                            rows.retain(|(k, _)| k != key);
                            rows.push((key.clone(), value.clone()));
                        }
                        PendingWrite::Remove { key } => {
                            rows.retain(|(k, _)| k != key);
                        }
                    }
                }
                rows.sort_by(|a, b| a.0.cmp(&b.0));
            }
        }

        self.entries = Some(rows);
        self.position = None;
        Ok(())
    }

    /// Execute a write immediately in its own transaction.
    fn write_immediate(&self, op: PendingWrite) -> StorageResult<()> {
        let txn = self
            .db
            .begin_write()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        {
            let mut t = txn
                .open_table(table_def(intern_table_name(&self.table_name)))
                .map_err(|e| StorageError::Other(e.to_string()))?;
            match op {
                PendingWrite::Insert { key, value } => {
                    t.insert(key.as_slice(), value.as_slice())
                        .map_err(|e| StorageError::Other(e.to_string()))?;
                }
                PendingWrite::Remove { key } => {
                    t.remove(key.as_slice())
                        .map_err(|e| StorageError::Other(e.to_string()))?;
                }
            }
        }
        txn.commit()
            .map_err(|e| StorageError::Other(e.to_string()))?;
        Ok(())
    }

    fn do_write(&mut self, op: PendingWrite) -> StorageResult<()> {
        // Do NOT invalidate the snapshot here — iteration must continue
        // over its stable snapshot even when the underlying data changes.
        // A fresh cursor will see the updated data.

        if self.in_transaction.load(Ordering::SeqCst) {
            lock_map(&self.pending_writes)?
                .entry(self.table_name.clone())
                .or_default()
                .push(op);
            Ok(())
        } else {
            self.write_immediate(op)
        }
    }

    fn effective_key(&self) -> StorageResult<Vec<u8>> {
        self.pending_key
            .as_ref()
            .or(self.current_key.as_ref())
            .cloned()
            .ok_or_else(|| StorageError::Other("no key set on cursor".into()))
    }

    fn effective_value(&self) -> StorageResult<Vec<u8>> {
        self.pending_value
            .as_ref()
            .or(self.current_value.as_ref())
            .cloned()
            .ok_or_else(|| StorageError::Other("no value set on cursor".into()))
    }
}

impl StorageCursor for RedbCursor {
    // -- key staging --

    fn set_key_str(&mut self, key: &str) {
        self.pending_key = Some(key.as_bytes().to_vec());
    }

    fn get_key_str(&self) -> StorageResult<String> {
        let bytes = self
            .current_key
            .as_ref()
            .ok_or_else(|| StorageError::NotFound("cursor not positioned".into()))?;
        String::from_utf8(bytes.clone())
            .map_err(|e| StorageError::Other(format!("key is not valid UTF-8: {e}")))
    }

    fn set_key_raw(&mut self, data: &[u8]) {
        self.pending_key = Some(data.to_vec());
    }

    fn get_key_raw(&self) -> StorageResult<Vec<u8>> {
        self.current_key
            .clone()
            .ok_or_else(|| StorageError::NotFound("cursor not positioned".into()))
    }

    // -- value staging --

    fn set_value_str(&mut self, value: &str) {
        self.pending_value = Some(value.as_bytes().to_vec());
    }

    fn get_value_str(&self) -> StorageResult<String> {
        let bytes = self
            .current_value
            .as_ref()
            .ok_or_else(|| StorageError::NotFound("cursor not positioned".into()))?;
        String::from_utf8(bytes.clone())
            .map_err(|e| StorageError::Other(format!("value is not valid UTF-8: {e}")))
    }

    fn set_value_raw(&mut self, data: &[u8]) {
        self.pending_value = Some(data.to_vec());
    }

    fn get_value_raw(&self) -> StorageResult<Vec<u8>> {
        self.current_value
            .clone()
            .ok_or_else(|| StorageError::NotFound("cursor not positioned".into()))
    }

    // -- navigation --

    fn search(&mut self) -> StorageResult<()> {
        let key = self.effective_key()?;

        // Point lookup via a read transaction (fast path, no materialization).
        let lookup: Result<(Vec<u8>, Vec<u8>), StorageError> = (|| {
            let read_txn = self
                .db
                .begin_read()
                .map_err(|e| StorageError::Other(e.to_string()))?;
            let static_name = intern_table_name(self.table_name.as_str());
            let table = match read_txn.open_table(table_def(static_name)) {
                Ok(t) => t,
                Err(redb::TableError::TableDoesNotExist(_)) => {
                    return Err(StorageError::NotFound("table does not exist".into()));
                }
                Err(e) => return Err(StorageError::Other(e.to_string())),
            };
            match table.get(key.as_slice()) {
                Ok(Some(v)) => Ok((key, v.value().to_vec())),
                Ok(None) => Err(StorageError::NotFound("key not found".into())),
                Err(e) => Err(StorageError::Other(e.to_string())),
            }
        })();

        match lookup {
            Ok((k, v)) => {
                self.current_key = Some(k);
                self.current_value = Some(v);
                Ok(())
            }
            Err(e) => Err(e),
        }
    }

    fn search_near(&mut self) -> StorageResult<i32> {
        // Always re-read so we see any writes made through this cursor
        // (e.g. rebuild_index inserts then search_near checks for dupes).
        self.entries = None;
        self.materialize()?;
        let seek = self.effective_key()?;
        let entries = self
            .entries
            .as_ref()
            .ok_or(StorageError::Other("not materialized".into()))?;

        if entries.is_empty() {
            return Err(StorageError::NotFound("table is empty".into()));
        }

        match entries.binary_search_by(|(k, _)| k.as_slice().cmp(seek.as_slice())) {
            Ok(idx) => {
                self.position = Some(idx);
                self.current_key = Some(entries[idx].0.clone());
                self.current_value = Some(entries[idx].1.clone());
                Ok(0)
            }
            Err(idx) => {
                if idx < entries.len() {
                    // Positioned at next greater key.
                    self.position = Some(idx);
                    self.current_key = Some(entries[idx].0.clone());
                    self.current_value = Some(entries[idx].1.clone());
                    Ok(1)
                } else if idx > 0 {
                    // No greater key; position at the largest smaller key.
                    let prev = idx - 1;
                    self.position = Some(prev);
                    self.current_key = Some(entries[prev].0.clone());
                    self.current_value = Some(entries[prev].1.clone());
                    Ok(-1)
                } else {
                    Err(StorageError::NotFound("no entries near key".into()))
                }
            }
        }
    }

    fn next(&mut self) -> StorageResult<()> {
        self.materialize()?;
        let entries = self
            .entries
            .as_ref()
            .ok_or(StorageError::Other("not materialized".into()))?;

        let next_pos = match self.position {
            Some(p) => p + 1,
            None => 0,
        };

        if next_pos >= entries.len() {
            return Err(StorageError::NotFound("end of cursor".into()));
        }

        self.position = Some(next_pos);
        self.current_key = Some(entries[next_pos].0.clone());
        self.current_value = Some(entries[next_pos].1.clone());
        self.pending_key = self.current_key.clone();
        Ok(())
    }

    // -- mutations --

    fn insert(&mut self) -> StorageResult<()> {
        let key = self.effective_key()?;
        let value = self.effective_value()?;
        self.do_write(PendingWrite::Insert { key, value })
    }

    fn update(&mut self) -> StorageResult<()> {
        // redb insert is an upsert, semantically identical to update.
        self.insert()
    }

    fn remove(&mut self) -> StorageResult<()> {
        let key = self.effective_key()?;
        self.do_write(PendingWrite::Remove { key })
    }

    fn reset(&mut self) -> StorageResult<()> {
        self.entries = None;
        self.position = None;
        self.current_key = None;
        self.current_value = None;
        self.pending_key = None;
        self.pending_value = None;
        Ok(())
    }
}
