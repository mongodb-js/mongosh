//! OPFS-backed storage for persistent browser database.

use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};
use web_sys::{FileSystemReadWriteOptions, FileSystemSyncAccessHandle};

use super::{StorageBackend, StorageCursor, StorageError, StorageResult, StorageSession};

pub struct OpfsBackend {
    handles: Arc<Mutex<BTreeMap<String, FileSystemSyncAccessHandle>>>,
}

impl OpfsBackend {
    pub fn from_handles(handles: BTreeMap<String, FileSystemSyncAccessHandle>) -> Self {
        Self {
            handles: Arc::new(Mutex::new(handles)),
        }
    }
}

impl StorageBackend for OpfsBackend {
    type Session = OpfsSession;

    fn open(_path: &str) -> StorageResult<Self> {
        Err(StorageError::Other("Use from_handles".into()))
    }

    fn open_session(&self) -> StorageResult<OpfsSession> {
        Ok(OpfsSession {
            handles: self.handles.clone(),
        })
    }

    fn list_tables(&self) -> StorageResult<Vec<String>> {
        let h = self.handles.lock().unwrap_or_else(|e| e.into_inner());
        Ok(h.keys().cloned().collect())
    }
}

pub struct OpfsSession {
    handles: Arc<Mutex<BTreeMap<String, FileSystemSyncAccessHandle>>>,
}

impl StorageSession for OpfsSession {
    type Cursor = OpfsCursor;

    fn create_table(&self, _name: &str) -> StorageResult<()> {
        Ok(())
    }

    fn drop_table(&self, name: &str) -> StorageResult<()> {
        self.handles
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .remove(name);
        Ok(())
    }

    fn open_cursor(&self, table_name: &str) -> StorageResult<OpfsCursor> {
        let h = self.handles.lock().unwrap_or_else(|e| e.into_inner());
        let handle = h
            .get(table_name)
            .cloned()
            .ok_or_else(|| StorageError::NotFound(table_name.to_string()))?;

        let contents = read_sync(&handle)?;
        let entries = parse_file(&contents)?;

        Ok(OpfsCursor {
            handle,
            entries: Some(entries),
            position: None,
            current_key: None,
            current_value: None,
            pending_key: None,
            pending_value: None,
            dirty: false,
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
        let mut h = self.handles.lock().unwrap_or_else(|e| e.into_inner());
        let handle = h
            .remove(from)
            .ok_or_else(|| StorageError::NotFound(format!("table {from} does not exist")))?;
        h.insert(to.to_string(), handle);
        Ok(())
    }

    fn open_sibling_session(&self) -> StorageResult<Self> {
        Ok(OpfsSession {
            handles: self.handles.clone(),
        })
    }
}

pub struct OpfsCursor {
    handle: FileSystemSyncAccessHandle,
    entries: Option<Vec<(Vec<u8>, Vec<u8>)>>,
    position: Option<usize>,
    current_key: Option<Vec<u8>>,
    current_value: Option<Vec<u8>>,
    pending_key: Option<Vec<u8>>,
    pending_value: Option<Vec<u8>>,
    dirty: bool,
}

impl OpfsCursor {
    fn entries_mut(&mut self) -> &mut Vec<(Vec<u8>, Vec<u8>)> {
        self.entries
            .as_mut()
            .expect("cursor entries must be initialized before use")
    }

    fn effective_key(&self) -> StorageResult<Vec<u8>> {
        self.pending_key
            .as_ref()
            .or(self.current_key.as_ref())
            .cloned()
            .ok_or_else(|| StorageError::Other("no key".into()))
    }

    fn effective_value(&self) -> StorageResult<Vec<u8>> {
        self.pending_value
            .as_ref()
            .or(self.current_value.as_ref())
            .cloned()
            .ok_or_else(|| StorageError::Other("no value".into()))
    }
}

impl StorageCursor for OpfsCursor {
    fn set_key_str(&mut self, key: &str) {
        self.pending_key = Some(key.as_bytes().to_vec());
    }
    fn get_key_str(&self) -> StorageResult<String> {
        let b = self
            .current_key
            .as_ref()
            .ok_or_else(|| StorageError::NotFound("not positioned".into()))?;
        String::from_utf8(b.clone()).map_err(|e| StorageError::Other(format!("not UTF-8: {e}")))
    }
    fn set_key_raw(&mut self, data: &[u8]) {
        self.pending_key = Some(data.to_vec());
    }
    fn get_key_raw(&self) -> StorageResult<Vec<u8>> {
        self.current_key
            .clone()
            .ok_or_else(|| StorageError::NotFound("not positioned".into()))
    }

    fn set_value_str(&mut self, value: &str) {
        self.pending_value = Some(value.as_bytes().to_vec());
    }
    fn get_value_str(&self) -> StorageResult<String> {
        let b = self
            .current_value
            .as_ref()
            .ok_or_else(|| StorageError::NotFound("not positioned".into()))?;
        String::from_utf8(b.clone()).map_err(|e| StorageError::Other(format!("not UTF-8: {e}")))
    }
    fn set_value_raw(&mut self, data: &[u8]) {
        self.pending_value = Some(data.to_vec());
    }
    fn get_value_raw(&self) -> StorageResult<Vec<u8>> {
        self.current_value
            .clone()
            .ok_or_else(|| StorageError::NotFound("not positioned".into()))
    }

    fn search(&mut self) -> StorageResult<()> {
        let key = self.effective_key()?;
        let entries = self
            .entries
            .as_ref()
            .ok_or_else(|| StorageError::Other("not materialized".into()))?;

        match entries.binary_search_by(|(k, _)| k.as_slice().cmp(&key)) {
            Ok(idx) => {
                let (k, v) = &entries[idx];
                self.current_key = Some(k.clone());
                self.current_value = Some(v.clone());
                self.position = Some(idx);
                Ok(())
            }
            Err(_) => Err(StorageError::NotFound("key not found".into())),
        }
    }

    fn search_near(&mut self) -> StorageResult<i32> {
        let seek = self.effective_key()?;
        let entries = self
            .entries
            .as_ref()
            .ok_or_else(|| StorageError::Other("not materialized".into()))?;

        if entries.is_empty() {
            return Err(StorageError::NotFound("empty".into()));
        }

        match entries.binary_search_by(|(k, _)| k.as_slice().cmp(&seek)) {
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
                    Err(StorageError::NotFound("no entries".into()))
                }
            }
        }
    }

    fn next(&mut self) -> StorageResult<()> {
        // Match MemBackend / Redb: first `next()` with `position: None` lands on entries[0].
        // Collection scans (`find`) only call `next()` and never `search_near` first.
        let entries = self
            .entries
            .as_ref()
            .ok_or_else(|| StorageError::Other("not materialized".into()))?;

        let next_pos = match self.position {
            Some(p) => p + 1,
            None => 0,
        };

        if next_pos >= entries.len() {
            return Err(StorageError::NotFound("eof".into()));
        }

        self.position = Some(next_pos);
        self.current_key = Some(entries[next_pos].0.clone());
        self.current_value = Some(entries[next_pos].1.clone());
        self.pending_key = self.current_key.clone();
        Ok(())
    }

    fn reset(&mut self) -> StorageResult<()> {
        self.position = None;
        self.current_key = None;
        self.current_value = None;
        Ok(())
    }

    fn insert(&mut self) -> StorageResult<()> {
        let key = self.effective_key()?;
        let value = self.effective_value()?;
        let entries = self.entries_mut();

        match entries.binary_search_by(|(k, _)| k.as_slice().cmp(&key)) {
            Ok(_) => Err(StorageError::DuplicateKey("exists".into())),
            Err(idx) => {
                entries.insert(idx, (key, value));
                self.dirty = true;
                Ok(())
            }
        }
    }

    fn update(&mut self) -> StorageResult<()> {
        let key = self.effective_key()?;
        let value = self.effective_value()?;
        let entries = self.entries_mut();

        match entries.iter_mut().find(|(k, _)| k == &key) {
            Some((_, v)) => {
                *v = value;
                self.dirty = true;
                Ok(())
            }
            None => Err(StorageError::NotFound("key not found".into())),
        }
    }

    fn remove(&mut self) -> StorageResult<()> {
        let key = self.effective_key()?;
        let entries = self.entries_mut();

        if let Some(pos) = entries.iter().position(|(k, _)| k == &key) {
            entries.remove(pos);
            self.dirty = true;
            Ok(())
        } else {
            Err(StorageError::NotFound("key not found".into()))
        }
    }
}

impl Drop for OpfsCursor {
    fn drop(&mut self) {
        if self.dirty {
            if let Some(entries) = self.entries.as_ref() {
                let _ = flush_sync(&self.handle, entries);
            }
        }
    }
}

fn read_sync(handle: &FileSystemSyncAccessHandle) -> StorageResult<Vec<u8>> {
    let size = handle
        .get_size()
        .map_err(|_| StorageError::Other("get_size failed".into()))? as usize;
    if size == 0 {
        return Ok(Vec::new());
    }

    let mut buf = vec![0u8; size];
    // OPFS read/write advance a file cursor; without `{ at: 0 }`, reads after a write start at EOF
    // and return no data while leaving the buffer zero-filled (looks like empty/corrupt storage).
    let opts = FileSystemReadWriteOptions::new();
    opts.set_at(0.0);
    let n = handle
        .read_with_u8_array_and_options(&mut buf[..], &opts)
        .map_err(|e| StorageError::Other(format!("read failed: {:?}", e)))? as usize;
    if n != size {
        return Err(StorageError::Other(format!(
            "OPFS read incomplete: got {n} bytes, expected {size}"
        )));
    }
    Ok(buf)
}

fn flush_sync(
    handle: &FileSystemSyncAccessHandle,
    entries: &[(Vec<u8>, Vec<u8>)],
) -> StorageResult<()> {
    let bytes = serialize_file(entries);

    handle
        .truncate_with_f64(bytes.len() as f64)
        .map_err(|e| StorageError::Other(format!("OPFS truncate failed: {:?}", e)))?;

    let opts = FileSystemReadWriteOptions::new();
    opts.set_at(0.0);
    let written = handle
        .write_with_u8_array_and_options(&bytes[..], &opts)
        .map_err(|e| StorageError::Other(format!("OPFS write failed: {:?}", e)))?
        as usize;
    if written != bytes.len() {
        return Err(StorageError::Other(format!(
            "OPFS write incomplete: wrote {written}, expected {}",
            bytes.len()
        )));
    }

    handle
        .flush()
        .map_err(|e| StorageError::Other(format!("OPFS flush failed: {:?}", e)))?;

    Ok(())
}

fn parse_file(bytes: &[u8]) -> StorageResult<Vec<(Vec<u8>, Vec<u8>)>> {
    if bytes.is_empty() {
        return Ok(Vec::new());
    }

    let mut pos = 0;
    let mut entries = Vec::new();

    while pos + 4 <= bytes.len() {
        let klen = u32::from_le_bytes([bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]])
            as usize;
        pos += 4;

        if pos + klen + 4 > bytes.len() {
            break;
        }

        let key = bytes[pos..pos + klen].to_vec();
        pos += klen;

        let vlen = u32::from_le_bytes([bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]])
            as usize;
        pos += 4;

        if pos + vlen > bytes.len() {
            break;
        }

        let value = bytes[pos..pos + vlen].to_vec();
        pos += vlen;

        entries.push((key, value));
    }

    Ok(entries)
}

fn serialize_file(entries: &[(Vec<u8>, Vec<u8>)]) -> Vec<u8> {
    let total: usize = entries.iter().map(|(k, v)| 8 + k.len() + v.len()).sum();
    let mut buf = Vec::with_capacity(total);

    for (key, value) in entries {
        buf.extend_from_slice(&(key.len() as u32).to_le_bytes());
        buf.extend_from_slice(key);
        buf.extend_from_slice(&(value.len() as u32).to_le_bytes());
        buf.extend_from_slice(value);
    }

    buf
}
