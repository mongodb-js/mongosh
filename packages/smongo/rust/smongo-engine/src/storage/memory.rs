//! In-memory storage backend for unit tests.
//!
//! Uses `BTreeMap` for sorted key-value storage. No disk I/O, no external
//! dependencies. Transactions are no-ops (each write is immediately visible).

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex, MutexGuard};

use super::{StorageBackend, StorageCursor, StorageError, StorageResult, StorageSession};

type TableStore = BTreeMap<Vec<u8>, Vec<u8>>;

fn lock_map<T>(mutex: &Mutex<T>) -> StorageResult<MutexGuard<'_, T>> {
    mutex
        .lock()
        .map_err(|e| StorageError::Other(format!("lock poisoned: {e}")))
}

// ---------------------------------------------------------------------------
// MemBackend
// ---------------------------------------------------------------------------

pub struct MemBackend {
    tables: Arc<Mutex<BTreeMap<String, TableStore>>>,
}

impl MemBackend {
    pub fn new() -> Self {
        Self {
            tables: Arc::new(Mutex::new(BTreeMap::new())),
        }
    }
}

impl Default for MemBackend {
    fn default() -> Self {
        Self::new()
    }
}

impl StorageBackend for MemBackend {
    type Session = MemSession;

    fn open(_path: &str) -> StorageResult<Self> {
        Ok(Self::new())
    }

    fn open_session(&self) -> StorageResult<MemSession> {
        Ok(MemSession {
            tables: self.tables.clone(),
        })
    }

    fn list_tables(&self) -> StorageResult<Vec<String>> {
        let tables = lock_map(&self.tables)?;
        Ok(tables.keys().cloned().collect())
    }
}

// ---------------------------------------------------------------------------
// MemSession
// ---------------------------------------------------------------------------

pub struct MemSession {
    tables: Arc<Mutex<BTreeMap<String, TableStore>>>,
}

impl StorageSession for MemSession {
    type Cursor = MemCursor;

    fn create_table(&self, name: &str) -> StorageResult<()> {
        let mut tables = lock_map(&self.tables)?;
        tables.entry(name.to_string()).or_default();
        Ok(())
    }

    fn drop_table(&self, name: &str) -> StorageResult<()> {
        let mut tables = lock_map(&self.tables)?;
        tables.remove(name);
        Ok(())
    }

    fn open_cursor(&self, table_name: &str) -> StorageResult<MemCursor> {
        Ok(MemCursor {
            tables: self.tables.clone(),
            table_name: table_name.to_string(),
            entries: None,
            position: None,
            current_key: None,
            current_value: None,
            pending_key: None,
            pending_value: None,
        })
    }

    fn in_transaction(&self) -> bool {
        false
    }
    fn begin_transaction(&self) -> StorageResult<()> {
        Ok(())
    }
    fn commit_transaction(&self) -> StorageResult<()> {
        Ok(())
    }
    fn rollback_transaction(&self) -> StorageResult<()> {
        Ok(())
    }

    fn rename_table(&self, from: &str, to: &str) -> StorageResult<()> {
        let mut tables = lock_map(&self.tables)?;
        let data = tables
            .remove(from)
            .ok_or_else(|| StorageError::NotFound(format!("table {from} does not exist")))?;
        tables.insert(to.to_string(), data);
        Ok(())
    }

    fn open_sibling_session(&self) -> StorageResult<Self> {
        Ok(MemSession {
            tables: self.tables.clone(),
        })
    }
}

// ---------------------------------------------------------------------------
// MemCursor
// ---------------------------------------------------------------------------

pub struct MemCursor {
    tables: Arc<Mutex<BTreeMap<String, TableStore>>>,
    table_name: String,

    entries: Option<Vec<(Vec<u8>, Vec<u8>)>>,
    position: Option<usize>,

    current_key: Option<Vec<u8>>,
    current_value: Option<Vec<u8>>,

    pending_key: Option<Vec<u8>>,
    pending_value: Option<Vec<u8>>,
}

impl MemCursor {
    fn materialize(&mut self) -> StorageResult<()> {
        if self.entries.is_some() {
            return Ok(());
        }
        let tables = lock_map(&self.tables)?;
        let rows: Vec<(Vec<u8>, Vec<u8>)> = tables
            .get(&self.table_name)
            .map(|t| t.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
            .unwrap_or_default();
        self.entries = Some(rows);
        self.position = None;
        Ok(())
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

impl StorageCursor for MemCursor {
    fn set_key_str(&mut self, key: &str) {
        self.pending_key = Some(key.as_bytes().to_vec());
    }
    fn get_key_str(&self) -> StorageResult<String> {
        let b = self
            .current_key
            .as_ref()
            .ok_or_else(|| StorageError::NotFound("cursor not positioned".into()))?;
        String::from_utf8(b.clone()).map_err(|e| StorageError::Other(format!("key not UTF-8: {e}")))
    }
    fn set_key_raw(&mut self, data: &[u8]) {
        self.pending_key = Some(data.to_vec());
    }
    fn get_key_raw(&self) -> StorageResult<Vec<u8>> {
        self.current_key
            .clone()
            .ok_or_else(|| StorageError::NotFound("cursor not positioned".into()))
    }

    fn set_value_str(&mut self, value: &str) {
        self.pending_value = Some(value.as_bytes().to_vec());
    }
    fn get_value_str(&self) -> StorageResult<String> {
        let b = self
            .current_value
            .as_ref()
            .ok_or_else(|| StorageError::NotFound("cursor not positioned".into()))?;
        String::from_utf8(b.clone())
            .map_err(|e| StorageError::Other(format!("value not UTF-8: {e}")))
    }
    fn set_value_raw(&mut self, data: &[u8]) {
        self.pending_value = Some(data.to_vec());
    }
    fn get_value_raw(&self) -> StorageResult<Vec<u8>> {
        self.current_value
            .clone()
            .ok_or_else(|| StorageError::NotFound("cursor not positioned".into()))
    }

    fn search(&mut self) -> StorageResult<()> {
        let key = self.effective_key()?;
        let tables = lock_map(&self.tables)?;
        let table = tables
            .get(&self.table_name)
            .ok_or_else(|| StorageError::NotFound("table does not exist".into()))?;
        match table.get(&key) {
            Some(v) => {
                self.current_key = Some(key);
                self.current_value = Some(v.clone());
                Ok(())
            }
            None => Err(StorageError::NotFound("key not found".into())),
        }
    }

    fn search_near(&mut self) -> StorageResult<i32> {
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
                    self.position = Some(idx);
                    self.current_key = Some(entries[idx].0.clone());
                    self.current_value = Some(entries[idx].1.clone());
                    Ok(1)
                } else if idx > 0 {
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

    fn insert(&mut self) -> StorageResult<()> {
        let key = self.effective_key()?;
        let value = self.effective_value()?;
        let mut tables = lock_map(&self.tables)?;
        let table = tables.entry(self.table_name.clone()).or_default();
        table.insert(key, value);
        Ok(())
    }

    fn update(&mut self) -> StorageResult<()> {
        self.insert()
    }

    fn remove(&mut self) -> StorageResult<()> {
        let key = self.effective_key()?;
        let mut tables = lock_map(&self.tables)?;
        if let Some(table) = tables.get_mut(&self.table_name) {
            table.remove(&key);
        }
        Ok(())
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
