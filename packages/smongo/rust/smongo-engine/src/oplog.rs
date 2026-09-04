//! Pure Rust oplog: change tracking, reader/writer, and change streams.
//!
//! Provides the same oplog functionality as the PyO3 layer in `smongo-py`,
//! but operating on `bson::Document` and `serde_json::Value` without any
//! Python dependency. Usable from C, Node.js, or any Rust consumer.
//!
//! # Storage Layout
//!
//! - Table name: `__oplog_{db}_{collection}`
//! - Key format: string (`"{:020}-{uuid}"`)
//! - Value format: BSON document bytes (legacy JSON UTF-8 still readable)
//!
//! # Example
//!
//! ```ignore
//! use smongo_engine::oplog::{OplogWriter, OplogReader, OplogHub};
//! use bson::{Bson, doc};
//! use std::sync::Arc;
//!
//! let hub = Arc::new(OplogHub::new());
//! let writer = OplogWriter::new(session, "__oplog_mydb_users", "mydb.users", Some(hub.clone()));
//! writer.log("insert", Bson::String("abc".into()), Some(doc!{"name": "Alice"}), Default::default())?;
//! ```

use std::collections::VecDeque;
use std::io::Cursor;
use std::sync::Arc;
#[cfg(not(target_arch = "wasm32"))]
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use bson::{Bson, Document};
#[cfg(not(target_arch = "wasm32"))]
use parking_lot::{Condvar, Mutex};
use serde::{Deserialize, Serialize};
#[cfg(target_arch = "wasm32")]
use std::sync::Mutex;

use crate::storage::{DefaultSession, StorageCursor, StorageError, StorageSession};

#[cfg(not(target_arch = "wasm32"))]
fn now_time_nanos() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
}

#[cfg(target_arch = "wasm32")]
fn now_time_nanos() -> u128 {
    let ms = js_sys::Date::now();
    (ms * 1_000_000.0) as u128
}

#[cfg(not(target_arch = "wasm32"))]
fn now_time_secs_f64() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64()
}

#[cfg(target_arch = "wasm32")]
fn now_time_secs_f64() -> f64 {
    js_sys::Date::now() / 1000.0
}

/// Result type for oplog operations.
pub type OplogResult<T> = Result<T, OplogError>;

/// Errors from oplog operations.
#[derive(Debug)]
pub enum OplogError {
    Storage(StorageError),
    Serialization(String),
    Other(String),
}

impl From<StorageError> for OplogError {
    fn from(e: StorageError) -> Self {
        OplogError::Storage(e)
    }
}

impl From<serde_json::Error> for OplogError {
    fn from(e: serde_json::Error) -> Self {
        OplogError::Serialization(e.to_string())
    }
}

impl std::fmt::Display for OplogError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OplogError::Storage(e) => write!(f, "Oplog storage error: {}", e),
            OplogError::Serialization(e) => write!(f, "Oplog serialization error: {}", e),
            OplogError::Other(e) => write!(f, "Oplog error: {}", e),
        }
    }
}

impl std::error::Error for OplogError {}

/// A single oplog entry recording a mutation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OplogEntry {
    pub ts: f64,
    pub ns: String,
    pub op: String,
    pub doc_id: serde_json::Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payload: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub v: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub checksum: Option<String>,
    #[serde(default)]
    pub internal: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changed_fields: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub node_id: Option<String>,
}

/// Decode oplog value bytes: BSON document (Python / Tier 2.1) or legacy JSON UTF-8.
pub fn decode_oplog_value_bytes(bytes: &[u8]) -> OplogResult<OplogEntry> {
    if bytes.is_empty() {
        return Err(OplogError::Serialization("empty oplog value".into()));
    }
    if bytes[0] == b'{' {
        if let Ok(e) = serde_json::from_slice::<OplogEntry>(bytes) {
            return Ok(e);
        }
    }
    let mut r = Cursor::new(bytes);
    let doc =
        Document::from_reader(&mut r).map_err(|e| OplogError::Serialization(e.to_string()))?;
    oplog_entry_from_document(doc)
}

fn oplog_entry_to_document(entry: &OplogEntry) -> OplogResult<Document> {
    let mut d = Document::new();
    d.insert("ts", Bson::Double(entry.ts));
    d.insert("ns", entry.ns.clone());
    d.insert("op", entry.op.clone());
    d.insert("doc_id", json_to_bson_value(&entry.doc_id));
    if let Some(ref p) = entry.payload {
        d.insert("payload", json_to_bson_value(p));
    }
    if let Some(v) = entry.v {
        d.insert("v", Bson::Int64(v));
    }
    if let Some(ref c) = entry.checksum {
        d.insert("checksum", Bson::String(c.clone()));
    }
    d.insert("internal", Bson::Boolean(entry.internal));
    if let Some(ref cf) = entry.changed_fields {
        d.insert(
            "changed_fields",
            Bson::Array(cf.iter().map(|s| Bson::String(s.clone())).collect()),
        );
    }
    if let Some(ref n) = entry.node_id {
        d.insert("node_id", Bson::String(n.clone()));
    }
    Ok(d)
}

fn bson_as_f64(b: &Bson) -> Option<f64> {
    match b {
        Bson::Double(x) => Some(*x),
        Bson::Int32(i) => Some(f64::from(*i)),
        Bson::Int64(i) => Some(*i as f64),
        _ => None,
    }
}

fn oplog_entry_from_document(doc: Document) -> OplogResult<OplogEntry> {
    let ts = doc
        .get("ts")
        .and_then(bson_as_f64)
        .ok_or_else(|| OplogError::Serialization("missing or invalid ts".into()))?;
    let ns = doc
        .get_str("ns")
        .map_err(|e| OplogError::Serialization(e.to_string()))?
        .to_string();
    let op = doc
        .get_str("op")
        .map_err(|e| OplogError::Serialization(e.to_string()))?
        .to_string();
    let doc_id = doc
        .get("doc_id")
        .map(bson_to_json_value)
        .ok_or_else(|| OplogError::Serialization("missing doc_id".into()))?;
    let payload = doc
        .get("payload")
        .filter(|b| !matches!(b, Bson::Null))
        .map(bson_to_json_value);
    let v = doc.get("v").and_then(|b| match b {
        Bson::Int32(i) => Some(*i as i64),
        Bson::Int64(i) => Some(*i),
        Bson::Double(x) => Some(*x as i64),
        _ => None,
    });
    let checksum = doc
        .get_str("checksum")
        .ok()
        .map(std::string::ToString::to_string);
    let internal = doc.get_bool("internal").unwrap_or(false);
    let changed_fields = doc.get_array("changed_fields").ok().map(|arr| {
        arr.iter()
            .filter_map(|b| b.as_str().map(String::from))
            .collect::<Vec<_>>()
    });
    let node_id = doc
        .get_str("node_id")
        .ok()
        .map(std::string::ToString::to_string);

    Ok(OplogEntry {
        ts,
        ns,
        op,
        doc_id,
        payload,
        v,
        checksum,
        internal,
        changed_fields,
        node_id,
    })
}

// ---------------------------------------------------------------------------
// OplogHub
// ---------------------------------------------------------------------------

/// Listener registry for oplog change notifications.
///
/// Notifies registered `ChangeStream` instances when new oplog entries arrive.
pub struct OplogHub {
    listeners: Mutex<Vec<Arc<ChangeStream>>>,
}

impl OplogHub {
    pub fn new() -> Self {
        Self {
            listeners: Mutex::new(Vec::new()),
        }
    }

    pub fn register(&self, listener: Arc<ChangeStream>) {
        Self::lock_listeners(&self.listeners).push(listener);
    }

    pub fn unregister(&self, target: &ChangeStream) {
        let mut listeners = Self::lock_listeners(&self.listeners);
        listeners.retain(|l| !std::ptr::eq(l.as_ref(), target));
    }

    /// Notify all registered listeners of a new oplog entry.
    pub fn notify(&self, entry: &OplogEntry) {
        let mut listeners = Self::lock_listeners(&self.listeners);
        let mut dead = Vec::new();

        for (i, listener) in listeners.iter().enumerate() {
            if let Some(ref ns) = listener.namespace {
                if !ns.is_empty() && ns != &entry.ns {
                    continue;
                }
            }
            if listener.enqueue_entry(entry).is_err() {
                dead.push(i);
            }
        }

        for &i in dead.iter().rev() {
            listeners.remove(i);
        }
    }

    pub fn listener_count(&self) -> usize {
        Self::lock_listeners(&self.listeners).len()
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn lock_listeners(
        m: &Mutex<Vec<Arc<ChangeStream>>>,
    ) -> parking_lot::MutexGuard<'_, Vec<Arc<ChangeStream>>> {
        m.lock()
    }

    #[cfg(target_arch = "wasm32")]
    fn lock_listeners(
        m: &Mutex<Vec<Arc<ChangeStream>>>,
    ) -> std::sync::MutexGuard<'_, Vec<Arc<ChangeStream>>> {
        m.lock().unwrap_or_else(|e| e.into_inner())
    }
}

impl Default for OplogHub {
    fn default() -> Self {
        Self::new()
    }
}

/// Per-collection oplog settings for [`crate::collection::Collection`].
#[derive(Clone)]
pub struct CollectionOplogSettings {
    pub oplog_table: String,
    pub namespace: String,
    pub hub: Option<Arc<OplogHub>>,
    pub node_id: Option<String>,
}

/// Per-operation options for [`append_oplog`].
#[derive(Default)]
pub struct AppendOplogOpts {
    pub version: Option<i64>,
    pub internal: bool,
    pub changed_fields: Option<Vec<String>>,
}

/// Append one oplog row using *session* (participates in the same storage transaction as data writes).
pub fn append_oplog<S: StorageSession>(
    session: &S,
    settings: &CollectionOplogSettings,
    op: &str,
    doc_id: Bson,
    payload: Option<Document>,
    opts: AppendOplogOpts,
) -> OplogResult<String> {
    let time_ns = now_time_nanos();
    let uuid_val = uuid::Uuid::new_v4();
    let oplog_key = format!("{:020}-{}", time_ns, uuid_val);
    let ts = now_time_secs_f64();

    let doc_id_json = bson_to_json_value(&doc_id);
    let payload_json = payload.as_ref().map(|p| {
        let bson_val = Bson::Document(p.clone());
        bson_to_json_value(&bson_val)
    });

    let entry = OplogEntry {
        ts,
        ns: settings.namespace.clone(),
        op: op.to_string(),
        doc_id: doc_id_json,
        payload: payload_json,
        v: opts.version,
        checksum: None,
        internal: opts.internal,
        changed_fields: opts.changed_fields,
        node_id: settings.node_id.clone(),
    };

    let doc = oplog_entry_to_document(&entry)?;
    let mut buf = Vec::new();
    doc.to_writer(&mut buf)
        .map_err(|e| OplogError::Serialization(e.to_string()))?;

    let mut cursor = session.open_cursor(&settings.oplog_table)?;
    cursor.set_key_str(&oplog_key);
    cursor.set_value_raw(&buf);
    cursor.insert()?;

    if let Some(ref h) = settings.hub {
        h.notify(&entry);
    }

    Ok(oplog_key)
}

// ---------------------------------------------------------------------------
// OplogWriter
// ---------------------------------------------------------------------------

/// Appends structured operation entries to a storage-backed oplog table.
pub struct OplogWriter<S: StorageSession = DefaultSession> {
    session: S,
    oplog_uri: String,
    namespace: String,
    hub: Option<Arc<OplogHub>>,
    /// Provenance node id (sync); stored in BSON oplog entries when set.
    pub node_id: Option<String>,
}

impl<S: StorageSession> OplogWriter<S> {
    pub fn new(session: S, oplog_uri: &str, namespace: &str, hub: Option<Arc<OplogHub>>) -> Self {
        Self {
            session,
            oplog_uri: oplog_uri.to_string(),
            namespace: namespace.to_string(),
            hub,
            node_id: None,
        }
    }

    pub fn set_node_id(&mut self, id: Option<String>) {
        self.node_id = id;
    }

    /// Create the oplog table if it doesn't exist.
    pub fn ensure_table(&self) -> OplogResult<()> {
        self.session
            .create_table(&self.oplog_uri)
            .map_err(OplogError::Storage)
    }

    /// Log an operation to the oplog.
    ///
    /// Returns the oplog key string for the new entry.
    pub fn log(
        &self,
        op: &str,
        doc_id: Bson,
        payload: Option<Document>,
        opts: AppendOplogOpts,
    ) -> OplogResult<String> {
        let settings = CollectionOplogSettings {
            oplog_table: self.oplog_uri.clone(),
            namespace: self.namespace.clone(),
            hub: self.hub.clone(),
            node_id: self.node_id.clone(),
        };
        append_oplog(&self.session, &settings, op, doc_id, payload, opts)
    }

    /// Remove all entries with keys strictly less than `key`.
    pub fn truncate_before(&self, key: &str) -> OplogResult<i64> {
        let mut cursor = self.session.open_cursor(&self.oplog_uri)?;
        let mut to_remove = Vec::new();

        while cursor.next().is_ok() {
            let k = cursor.get_key_str()?;
            if k.as_str() >= key {
                break;
            }
            to_remove.push(k);
        }

        if !to_remove.is_empty() {
            let mut cursor = self.session.open_cursor(&self.oplog_uri)?;
            for k in &to_remove {
                cursor.set_key_str(k);
                let _ = cursor.remove();
            }
        }

        Ok(to_remove.len() as i64)
    }

    /// Keep at most `max_entries` in the oplog, removing the oldest excess.
    pub fn truncate_count(&self, max_entries: i64) -> OplogResult<i64> {
        let mut cursor = self.session.open_cursor(&self.oplog_uri)?;
        let mut keys = Vec::new();
        while cursor.next().is_ok() {
            keys.push(cursor.get_key_str()?);
        }

        let excess = keys.len() as i64 - max_entries;
        if excess <= 0 {
            return Ok(0);
        }

        let mut cursor = self.session.open_cursor(&self.oplog_uri)?;
        for k in &keys[..excess as usize] {
            cursor.set_key_str(k);
            let _ = cursor.remove();
        }

        Ok(excess)
    }

    pub fn namespace(&self) -> &str {
        &self.namespace
    }

    pub fn oplog_uri(&self) -> &str {
        &self.oplog_uri
    }
}

// ---------------------------------------------------------------------------
// OplogReader
// ---------------------------------------------------------------------------

/// Reads oplog entries from a storage-backed oplog table.
pub struct OplogReader<S: StorageSession = DefaultSession> {
    session: S,
    oplog_uri: String,
}

impl<S: StorageSession> OplogReader<S> {
    pub fn new(session: S, oplog_uri: &str) -> Self {
        Self {
            session,
            oplog_uri: oplog_uri.to_string(),
        }
    }

    /// Read all oplog entries.
    pub fn read_all(&self) -> OplogResult<Vec<OplogEntry>> {
        let mut cursor = self.session.open_cursor(&self.oplog_uri)?;
        let mut results = Vec::new();
        while cursor.next().is_ok() {
            let raw = cursor.get_value_raw()?;
            let entry = decode_oplog_value_bytes(&raw)?;
            results.push(entry);
        }
        Ok(results)
    }

    /// Read entries after a checkpoint key, optionally skipping internal entries.
    ///
    /// Uses `search_near` on the staged checkpoint key (O(log n) on redb) matching
    /// Same semantics as Python `smongo.oplog.OplogReader.read_from`.
    pub fn read_from(
        &self,
        checkpoint_key: Option<&str>,
        skip_internal: bool,
    ) -> OplogResult<Vec<(String, OplogEntry)>> {
        let mut cursor = self.session.open_cursor(&self.oplog_uri)?;
        let mut results = Vec::new();

        match checkpoint_key {
            None => {
                let _ = cursor.reset();
                if cursor.next().is_err() {
                    return Ok(results);
                }
            }
            Some(ck) => {
                cursor.set_key_str(ck);
                match cursor.search_near() {
                    Ok(x) if x <= 0 => {
                        if cursor.next().is_err() {
                            return Ok(results);
                        }
                    }
                    Ok(_) => {}
                    Err(StorageError::NotFound(_)) => {
                        return Ok(results);
                    }
                    Err(e) => return Err(OplogError::Storage(e)),
                }
            }
        }

        loop {
            let key = cursor.get_key_str()?;
            let raw = cursor.get_value_raw()?;
            let entry = decode_oplog_value_bytes(&raw)?;
            if !(skip_internal && entry.internal) {
                results.push((key, entry));
            }
            if cursor.next().is_err() {
                break;
            }
        }

        Ok(results)
    }

    /// Get the key of the most recent entry.
    pub fn latest_key(&self) -> OplogResult<Option<String>> {
        let mut cursor = self.session.open_cursor(&self.oplog_uri)?;
        let mut last_key: Option<String> = None;
        while cursor.next().is_ok() {
            last_key = Some(cursor.get_key_str()?);
        }
        Ok(last_key)
    }

    /// Count total entries in the oplog.
    pub fn count(&self) -> OplogResult<i64> {
        let mut cursor = self.session.open_cursor(&self.oplog_uri)?;
        let mut n: i64 = 0;
        while cursor.next().is_ok() {
            n += 1;
        }
        Ok(n)
    }

    /// Get the key of the oldest entry.
    pub fn oldest_key(&self) -> OplogResult<Option<String>> {
        let mut cursor = self.session.open_cursor(&self.oplog_uri)?;
        if cursor.next().is_ok() {
            Ok(Some(cursor.get_key_str()?))
        } else {
            Ok(None)
        }
    }
}

// ---------------------------------------------------------------------------
// ChangeStream
// ---------------------------------------------------------------------------

/// A MongoDB-style change event produced by the change stream.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeEvent {
    #[serde(rename = "operationType")]
    pub operation_type: String,
    pub ns: ChangeEventNamespace,
    #[serde(rename = "documentKey")]
    pub document_key: Document,
    #[serde(rename = "_ts")]
    pub ts: f64,
    #[serde(rename = "fullDocument", skip_serializing_if = "Option::is_none")]
    pub full_document: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeEventNamespace {
    pub db: String,
    pub coll: String,
}

struct ChangeStreamInner {
    queue: VecDeque<ChangeEvent>,
    closed: bool,
}

type ChangeFilter = Box<dyn Fn(&ChangeEvent) -> bool + Send + Sync>;

/// Returned when `enqueue_entry` fails because the stream is closed.
#[derive(Debug)]
pub struct EnqueueError;

impl std::fmt::Display for EnqueueError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("change stream closed")
    }
}

impl std::error::Error for EnqueueError {}

/// A change stream that receives oplog events matching optional filters.
///
/// On native targets, `next()` blocks until an event arrives or the stream is
/// closed. On WASM (single-threaded), `next()` uses try-next semantics.
/// Use `try_next()` for non-blocking access on all platforms.
pub struct ChangeStream {
    pub namespace: Option<String>,
    filter: Option<ChangeFilter>,
    state: Mutex<ChangeStreamInner>,
    #[cfg(not(target_arch = "wasm32"))]
    cond: Condvar,
}

impl ChangeStream {
    /// Create a new change stream, optionally filtering by namespace and a predicate.
    pub fn new(namespace: Option<String>, filter: Option<ChangeFilter>) -> Self {
        Self {
            namespace,
            filter,
            state: Mutex::new(ChangeStreamInner {
                queue: VecDeque::new(),
                closed: false,
            }),
            #[cfg(not(target_arch = "wasm32"))]
            cond: Condvar::new(),
        }
    }

    /// Enqueue a change event derived from an oplog entry.
    ///
    /// Returns `Err(EnqueueError)` if the stream is already closed.
    pub fn enqueue_entry(&self, entry: &OplogEntry) -> Result<(), EnqueueError> {
        let change_type = match entry.op.as_str() {
            "insert" => "insert",
            "update" => "update",
            "delete" => "delete",
            "replace" => "replace",
            _ => return Ok(()),
        };

        let ns_parts: Vec<&str> = entry.ns.splitn(2, '.').collect();
        let db = ns_parts[0].to_string();
        let coll = if ns_parts.len() > 1 {
            ns_parts[1].to_string()
        } else {
            String::new()
        };

        let mut doc_key = Document::new();
        let doc_id_bson = json_to_bson_value(&entry.doc_id);
        doc_key.insert("_id".to_string(), doc_id_bson);

        let full_document = if change_type != "delete" {
            entry.payload.clone()
        } else {
            None
        };

        let event = ChangeEvent {
            operation_type: change_type.to_string(),
            ns: ChangeEventNamespace { db, coll },
            document_key: doc_key,
            ts: entry.ts,
            full_document,
        };

        if let Some(ref filter) = self.filter {
            if !filter(&event) {
                return Ok(());
            }
        }

        let mut inner = Self::lock_state(&self.state);
        if inner.closed {
            return Err(EnqueueError);
        }
        inner.queue.push_back(event);
        #[cfg(not(target_arch = "wasm32"))]
        self.cond.notify_all();
        Ok(())
    }

    /// Block until the next event is available or the stream is closed.
    ///
    /// On WASM, this is equivalent to `try_next()` (non-blocking).
    #[cfg(not(target_arch = "wasm32"))]
    pub fn next(&self) -> Option<ChangeEvent> {
        loop {
            {
                let inner = self.state.lock();
                if inner.closed {
                    return None;
                }
            }

            {
                let mut inner = self.state.lock();
                if let Some(event) = inner.queue.pop_front() {
                    return Some(event);
                }
            }

            {
                let mut inner = self.state.lock();
                self.cond.wait_for(&mut inner, Duration::from_secs(1));
            }

            {
                let mut inner = self.state.lock();
                if let Some(event) = inner.queue.pop_front() {
                    return Some(event);
                }
                if inner.closed {
                    return None;
                }
            }
        }
    }

    #[cfg(target_arch = "wasm32")]
    pub fn next(&self) -> Option<ChangeEvent> {
        let mut inner = Self::lock_state(&self.state);
        if inner.closed {
            return None;
        }
        inner.queue.pop_front()
    }

    /// Non-blocking: return the next event if one is queued.
    pub fn try_next(&self) -> Option<ChangeEvent> {
        let mut inner = Self::lock_state(&self.state);
        inner.queue.pop_front()
    }

    /// Close the stream, waking any blocked consumers.
    pub fn close(&self) {
        {
            let mut inner = Self::lock_state(&self.state);
            inner.closed = true;
        }
        #[cfg(not(target_arch = "wasm32"))]
        self.cond.notify_all();
    }

    pub fn is_closed(&self) -> bool {
        Self::lock_state(&self.state).closed
    }

    pub fn queue_len(&self) -> usize {
        Self::lock_state(&self.state).queue.len()
    }

    #[cfg(not(target_arch = "wasm32"))]
    fn lock_state(m: &Mutex<ChangeStreamInner>) -> parking_lot::MutexGuard<'_, ChangeStreamInner> {
        m.lock()
    }

    #[cfg(target_arch = "wasm32")]
    fn lock_state(m: &Mutex<ChangeStreamInner>) -> std::sync::MutexGuard<'_, ChangeStreamInner> {
        m.lock().unwrap_or_else(|e| e.into_inner())
    }
}

// ---------------------------------------------------------------------------
// BSON <-> JSON helpers
// ---------------------------------------------------------------------------

fn bson_to_json_value(bson: &Bson) -> serde_json::Value {
    match bson {
        Bson::Null => serde_json::Value::Null,
        Bson::Boolean(b) => serde_json::Value::Bool(*b),
        Bson::Int32(n) => serde_json::json!(*n),
        Bson::Int64(n) => serde_json::json!(*n),
        Bson::Double(n) => serde_json::json!(*n),
        Bson::String(s) => serde_json::Value::String(s.clone()),
        Bson::ObjectId(oid) => serde_json::json!({ "$oid": oid.to_hex() }),
        Bson::Document(doc) => {
            let mut map = serde_json::Map::new();
            for (k, v) in doc {
                map.insert(k.clone(), bson_to_json_value(v));
            }
            serde_json::Value::Object(map)
        }
        Bson::Array(arr) => serde_json::Value::Array(arr.iter().map(bson_to_json_value).collect()),
        _ => serde_json::json!(format!("{:?}", bson)),
    }
}

fn json_to_bson_value(json: &serde_json::Value) -> Bson {
    match json {
        serde_json::Value::Null => Bson::Null,
        serde_json::Value::Bool(b) => Bson::Boolean(*b),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                if i >= i32::MIN as i64 && i <= i32::MAX as i64 {
                    Bson::Int32(i as i32)
                } else {
                    Bson::Int64(i)
                }
            } else if let Some(f) = n.as_f64() {
                Bson::Double(f)
            } else {
                Bson::Null
            }
        }
        serde_json::Value::String(s) => Bson::String(s.clone()),
        serde_json::Value::Array(arr) => Bson::Array(arr.iter().map(json_to_bson_value).collect()),
        serde_json::Value::Object(map) => {
            if let Some(oid) = map.get("$oid").and_then(|v| v.as_str()) {
                if let Ok(id) = bson::oid::ObjectId::parse_str(oid) {
                    return Bson::ObjectId(id);
                }
            }
            let mut doc = Document::new();
            for (k, v) in map {
                doc.insert(k.clone(), json_to_bson_value(v));
            }
            Bson::Document(doc)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;

    #[test]
    fn test_oplog_entry_serialize_roundtrip() {
        let entry = OplogEntry {
            ts: 1234567890.123,
            ns: "mydb.users".into(),
            op: "insert".into(),
            doc_id: serde_json::json!("abc123"),
            payload: Some(serde_json::json!({"name": "Alice"})),
            v: Some(1),
            checksum: None,
            internal: false,
            changed_fields: None,
            node_id: None,
        };
        let json_str = serde_json::to_string(&entry).unwrap();
        let decoded: OplogEntry = serde_json::from_str(&json_str).unwrap();
        assert_eq!(decoded.ns, "mydb.users");
        assert_eq!(decoded.op, "insert");
    }

    #[test]
    fn test_bson_json_roundtrip() {
        let bson_val = Bson::String("hello".into());
        let json_val = bson_to_json_value(&bson_val);
        let back = json_to_bson_value(&json_val);
        assert_eq!(back, bson_val);
    }

    #[test]
    fn test_bson_objectid_roundtrip() {
        let oid = bson::oid::ObjectId::new();
        let bson_val = Bson::ObjectId(oid);
        let json_val = bson_to_json_value(&bson_val);
        let back = json_to_bson_value(&json_val);
        assert_eq!(back, bson_val);
    }

    #[test]
    fn test_change_stream_enqueue() {
        let cs = ChangeStream::new(None, None);
        let entry = OplogEntry {
            ts: 1.0,
            ns: "db.coll".into(),
            op: "insert".into(),
            doc_id: serde_json::json!("id1"),
            payload: Some(serde_json::json!({"x": 1})),
            v: None,
            checksum: None,
            internal: false,
            changed_fields: None,
            node_id: None,
        };
        cs.enqueue_entry(&entry).unwrap();
        assert_eq!(cs.queue_len(), 1);
        let event = cs.try_next().unwrap();
        assert_eq!(event.operation_type, "insert");
        assert_eq!(event.ns.db, "db");
        assert_eq!(event.ns.coll, "coll");
    }

    #[test]
    fn test_change_stream_namespace_filter() {
        let cs = ChangeStream::new(Some("db.users".into()), None);
        let entry_match = OplogEntry {
            ts: 1.0,
            ns: "db.users".into(),
            op: "insert".into(),
            doc_id: serde_json::json!("id1"),
            payload: None,
            v: None,
            checksum: None,
            internal: false,
            changed_fields: None,
            node_id: None,
        };
        let entry_no_match = OplogEntry {
            ts: 1.0,
            ns: "db.posts".into(),
            op: "insert".into(),
            doc_id: serde_json::json!("id2"),
            payload: None,
            v: None,
            checksum: None,
            internal: false,
            changed_fields: None,
            node_id: None,
        };
        cs.enqueue_entry(&entry_match).unwrap();
        cs.enqueue_entry(&entry_no_match).unwrap();
        assert_eq!(cs.queue_len(), 2);
    }

    #[test]
    fn test_change_stream_predicate_filter() {
        let cs = ChangeStream::new(
            None,
            Some(Box::new(|event: &ChangeEvent| {
                event.operation_type == "delete"
            })),
        );
        let insert = OplogEntry {
            ts: 1.0,
            ns: "db.coll".into(),
            op: "insert".into(),
            doc_id: serde_json::json!("id1"),
            payload: None,
            v: None,
            checksum: None,
            internal: false,
            changed_fields: None,
            node_id: None,
        };
        let delete = OplogEntry {
            ts: 2.0,
            ns: "db.coll".into(),
            op: "delete".into(),
            doc_id: serde_json::json!("id2"),
            payload: None,
            v: None,
            checksum: None,
            internal: false,
            changed_fields: None,
            node_id: None,
        };
        cs.enqueue_entry(&insert).unwrap();
        cs.enqueue_entry(&delete).unwrap();
        assert_eq!(cs.queue_len(), 1);
        let event = cs.try_next().unwrap();
        assert_eq!(event.operation_type, "delete");
    }

    #[test]
    fn test_change_stream_close() {
        let cs = ChangeStream::new(None, None);
        assert!(!cs.is_closed());
        cs.close();
        assert!(cs.is_closed());
    }

    #[test]
    fn test_oplog_hub_register_notify() {
        let hub = OplogHub::new();
        let cs = Arc::new(ChangeStream::new(None, None));
        hub.register(cs.clone());
        assert_eq!(hub.listener_count(), 1);

        let entry = OplogEntry {
            ts: 1.0,
            ns: "db.coll".into(),
            op: "update".into(),
            doc_id: serde_json::json!("id1"),
            payload: None,
            v: None,
            checksum: None,
            internal: false,
            changed_fields: None,
            node_id: None,
        };
        hub.notify(&entry);
        assert_eq!(cs.queue_len(), 1);
    }

    #[test]
    fn test_oplog_hub_unregister() {
        let hub = OplogHub::new();
        let cs = Arc::new(ChangeStream::new(None, None));
        hub.register(cs.clone());
        assert_eq!(hub.listener_count(), 1);
        hub.unregister(&cs);
        assert_eq!(hub.listener_count(), 0);
    }

    #[test]
    fn test_oplog_hub_namespace_routing() {
        let hub = OplogHub::new();
        let cs_users = Arc::new(ChangeStream::new(Some("db.users".into()), None));
        let cs_all = Arc::new(ChangeStream::new(None, None));
        hub.register(cs_users.clone());
        hub.register(cs_all.clone());

        let entry = OplogEntry {
            ts: 1.0,
            ns: "db.posts".into(),
            op: "insert".into(),
            doc_id: serde_json::json!("id1"),
            payload: None,
            v: None,
            checksum: None,
            internal: false,
            changed_fields: None,
            node_id: None,
        };
        hub.notify(&entry);
        assert_eq!(cs_users.queue_len(), 0);
        assert_eq!(cs_all.queue_len(), 1);
    }

    #[test]
    fn test_unknown_op_ignored() {
        let cs = ChangeStream::new(None, None);
        let entry = OplogEntry {
            ts: 1.0,
            ns: "db.coll".into(),
            op: "noop".into(),
            doc_id: serde_json::json!("id1"),
            payload: None,
            v: None,
            checksum: None,
            internal: false,
            changed_fields: None,
            node_id: None,
        };
        cs.enqueue_entry(&entry).unwrap();
        assert_eq!(cs.queue_len(), 0);
    }

    #[test]
    fn test_delete_no_full_document() {
        let cs = ChangeStream::new(None, None);
        let entry = OplogEntry {
            ts: 1.0,
            ns: "db.coll".into(),
            op: "delete".into(),
            doc_id: serde_json::json!("id1"),
            payload: Some(serde_json::json!({"x": 1})),
            v: None,
            checksum: None,
            internal: false,
            changed_fields: None,
            node_id: None,
        };
        cs.enqueue_entry(&entry).unwrap();
        let event = cs.try_next().unwrap();
        assert!(event.full_document.is_none());
    }

    #[test]
    fn test_oplog_bson_roundtrip_and_read_from_mem() {
        use crate::storage::{MemBackend, StorageBackend};

        let backend = MemBackend::new();
        let k_mid;
        {
            let session = backend.open_session().unwrap();
            let w = OplogWriter::new(session, "__oplog_m", "db.m", None);
            w.ensure_table().unwrap();
            let _k1 = w
                .log(
                    "insert",
                    Bson::String("a".into()),
                    Some(doc! {"x": 1}),
                    Default::default(),
                )
                .unwrap();
            k_mid = w
                .log(
                    "update",
                    Bson::String("b".into()),
                    Some(doc! {"$set": {"y": 2}}),
                    Default::default(),
                )
                .unwrap();
            w.log("delete", Bson::String("c".into()), None, Default::default())
                .unwrap();
        }

        let session2 = backend.open_session().unwrap();
        let r = OplogReader::new(session2, "__oplog_m");
        let all = r.read_all().unwrap();
        assert_eq!(all.len(), 3);
        let first_raw = {
            let s = backend.open_session().unwrap();
            let mut c = s.open_cursor("__oplog_m").unwrap();
            c.next().unwrap();
            c.get_value_raw().unwrap()
        };
        let decoded = decode_oplog_value_bytes(&first_raw).unwrap();
        assert_eq!(decoded.op, "insert");

        let tail = r.read_from(Some(&k_mid), true).unwrap();
        assert_eq!(tail.len(), 1);
        assert_eq!(tail[0].1.op, "delete");

        let from_start = r.read_from(None, true).unwrap();
        assert_eq!(from_start.len(), 3);
    }
}
