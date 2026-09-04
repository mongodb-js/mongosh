//! Minimal MongoDB wire-protocol (OP_MSG) server for the Node.js binding.
//!
//! smongo's full wire server lives in the PyO3 crate (`smongo-py`) and is
//! coupled to the Python interpreter. This module reimplements just enough of
//! the same protocol logic against `smongo-engine` so that mongosh's driver can
//! connect to the embedded engine over localhost TCP, in-process, without a
//! Python runtime. It handles the command subset mongosh needs to query an
//! ingested collection: hello/isMaster, buildInfo, ping, listDatabases,
//! listCollections, create, insert, find, aggregate, count, and the cursor
//! bookkeeping commands.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use bson::{doc, Bson, Document};
use napi_derive::napi;

use smongo_engine::aggregation::DatabaseContext;
use smongo_engine::collection::{Collection as EngineCollection, FindOptions as EngineFindOptions};
use smongo_engine::database::Database as EngineDatabase;

const OP_MSG: i32 = 2013;
const OP_QUERY: i32 = 2004;
const OP_REPLY: i32 = 1;
const HEADER_SIZE: usize = 16;
const MAX_MSG_SIZE: usize = 48_000_000;
const DEFAULT_BATCH_SIZE: usize = 1_000;

// ============================================================
// Wire framing
// ============================================================

fn build_msg(response_to: i32, body: &Document) -> std::io::Result<Vec<u8>> {
    let body_bytes = bson::to_vec(body)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, format!("bson encode: {e}")))?;
    // OP_MSG: 16-byte message header + 4-byte flagBits + section(s).
    let msg_len = 16 + 4 + 1 + body_bytes.len();
    let mut msg = Vec::with_capacity(msg_len);
    msg.extend_from_slice(&(msg_len as i32).to_le_bytes()); // messageLength
    msg.extend_from_slice(&0i32.to_le_bytes()); // requestID
    msg.extend_from_slice(&response_to.to_le_bytes()); // responseTo
    msg.extend_from_slice(&OP_MSG.to_le_bytes()); // opCode
    msg.extend_from_slice(&0i32.to_le_bytes()); // flagBits
    msg.push(0x00); // section kind 0: body
    msg.extend_from_slice(&body_bytes);
    Ok(msg)
}

/// Build an OP_REPLY message (response to a legacy OP_QUERY).
fn build_reply(response_to: i32, body: &Document) -> std::io::Result<Vec<u8>> {
    let body_bytes = bson::to_vec(body)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, format!("bson encode: {e}")))?;
    let msg_len = HEADER_SIZE + 4 + 8 + 4 + 4 + body_bytes.len();
    let mut msg = Vec::with_capacity(msg_len);
    msg.extend_from_slice(&(msg_len as i32).to_le_bytes()); // messageLength
    msg.extend_from_slice(&0i32.to_le_bytes()); // requestID
    msg.extend_from_slice(&response_to.to_le_bytes()); // responseTo
    msg.extend_from_slice(&OP_REPLY.to_le_bytes()); // opCode
    msg.extend_from_slice(&0i32.to_le_bytes()); // responseFlags
    msg.extend_from_slice(&0i64.to_le_bytes()); // cursorID
    msg.extend_from_slice(&0i32.to_le_bytes()); // startingFrom
    msg.extend_from_slice(&1i32.to_le_bytes()); // numberReturned
    msg.extend_from_slice(&body_bytes);
    Ok(msg)
}

/// Parse a complete request message: returns (requestID, opcode, command document).
fn parse_message(buf: &[u8]) -> Option<(i32, i32, Document)> {
    if buf.len() < HEADER_SIZE {
        return None;
    }
    let op_code = i32::from_le_bytes(buf[12..16].try_into().ok()?);
    let request_id = i32::from_le_bytes(buf[4..8].try_into().ok()?);
    let body = &buf[HEADER_SIZE..];

    match op_code {
        OP_MSG => {
            if body.len() < 4 {
                return None;
            }
            let mut pos = 4usize; // skip flagBits (int32)
            let mut command: Option<Document> = None;
            // OP_MSG may contain a body section (kind 0) followed by one or
            // more document-sequence sections (kind 1). For insert, the driver
            // puts the documents in a document sequence, so merge those into a
            // synthetic `documents` array on the command.
            while pos < body.len() {
                let kind = body[pos];
                pos += 1;
                match kind {
                    0x00 => {
                        if body.len() < pos + 4 {
                            return None;
                        }
                        let doc_len =
                            i32::from_le_bytes(body[pos..pos + 4].try_into().ok()?) as usize;
                        if doc_len < 5 || body.len() < pos + doc_len {
                            return None;
                        }
                        let doc = bson::from_slice::<Document>(&body[pos..pos + doc_len]).ok()?;
                        command = Some(doc);
                        pos += doc_len;
                    }
                    0x01 => {
                        if body.len() < pos + 4 {
                            return None;
                        }
                        let seq_size =
                            i32::from_le_bytes(body[pos..pos + 4].try_into().ok()?) as usize;
                        pos += 4;
                        let seq_end = pos + seq_size.saturating_sub(4);
                        if seq_size < 4 || seq_end > body.len() {
                            return None;
                        }
                        // cstring identifier
                        let ident_start = pos;
                        while pos < seq_end && body[pos] != 0 {
                            pos += 1;
                        }
                        let identifier =
                            String::from_utf8_lossy(&body[ident_start..pos]).to_string();
                        pos += 1; // null terminator
                        let mut docs = Vec::new();
                        while pos < seq_end {
                            if body.len() < pos + 4 {
                                return None;
                            }
                            let d_len =
                                i32::from_le_bytes(body[pos..pos + 4].try_into().ok()?) as usize;
                            if d_len < 5 || seq_end < pos + d_len {
                                return None;
                            }
                            let d = bson::from_slice::<Document>(&body[pos..pos + d_len]).ok()?;
                            docs.push(d);
                            pos += d_len;
                        }
                        if let Some(cmd) = command.as_mut() {
                            if identifier == "documents" && cmd.get("documents").is_none() {
                                let arr: Vec<Bson> = docs.into_iter().map(Bson::Document).collect();
                                cmd.insert("documents", Bson::Array(arr));
                            }
                        }
                        pos = seq_end;
                    }
                    _ => return None,
                }
            }
            Some((request_id, op_code, command?))
        }
        OP_QUERY => {
            // flags(int32) fullCollectionName(cstring) numberToSkip(int32) numberToReturn(int32) query(bson)
            let mut pos = 4usize;
            // Skip the full collection name (null-terminated).
            while pos < body.len() && body[pos] != 0 {
                pos += 1;
            }
            pos += 1; // null terminator
            if body.len() < pos + 8 {
                return None;
            }
            pos += 8; // skip numberToSkip + numberToReturn
            let doc = bson::from_slice::<Document>(&body[pos..]).ok()?;
            Some((request_id, op_code, doc))
        }
        _ => None,
    }
}

// ============================================================
// Command handlers
// ============================================================

fn array_of_docs(docs: Vec<Document>) -> Bson {
    Bson::Array(docs.into_iter().map(Bson::Document).collect())
}

fn hello_response() -> Document {
    doc! {
        "ok": 1,
        "ismaster": true,
        "isWritablePrimary": true,
        "maxBsonObjectSize": 16_777_216i32,
        "maxMessageSizeBytes": MAX_MSG_SIZE as i32,
        "maxWriteBatchSize": 100_000i32,
        "localTime": bson::DateTime::now(),
        "maxWireVersion": 21i32,
        "minWireVersion": 0i32,
        "readOnly": false,
        "logicalSessionTimeoutMinutes": 30i32,
        "topologyVersion": { "processId": bson::oid::ObjectId::new(), "counter": 0i64 },
        "connectionId": 1i32,
    }
}

fn build_info() -> Document {
    doc! {
        "ok": 1,
        "version": "1.0.0 (mongosh embedded smongo)",
        "gitVersion": "smongo",
        "maxBsonObjectSize": 16_777_216i32,
        "maxMessageSizeBytes": MAX_MSG_SIZE as i32,
        "maxWriteBatchSize": 100_000i32,
        "localTime": bson::DateTime::now(),
        "versionArray": [1i32, 0, 0, 0],
        "bits": 64i32,
        "debug": false,
    }
}

fn ns_name(db_name: &str, coll: &str) -> String {
    format!("{db_name}.{coll}")
}

fn cursor_ok(db_name: &str, coll: &str, docs: Vec<Document>) -> Document {
    doc! {
        "ok": 1,
        "cursor": {
            "id": 0i64,
            "ns": ns_name(db_name, coll),
            "firstBatch": array_of_docs(docs),
        }
    }
}

fn handle_command(db: &EngineDatabase, cmd: &Document) -> Document {
    let name = cmd.keys().next().cloned().unwrap_or_default();
    let db_name = cmd.get_str("$db").unwrap_or("local").to_string();

    match name.as_str() {
        "hello" | "isMaster" | "ismaster" => hello_response(),
        "buildInfo" => build_info(),
        "ping" => doc! { "ok": 1 },
        "getLog" => doc! { "ok": 1, "log": Bson::Array(vec![]) },
        "endSessions" => doc! { "ok": 1 },
        "killCursors" => doc! {
            "ok": 1,
            "cursorsKilled": Bson::Array(vec![]),
            "cursorsNotFound": Bson::Array(vec![]),
            "cursorsAlive": Bson::Array(vec![]),
            "cursorsUnknown": Bson::Array(vec![]),
        },
        "getMore" => {
            let coll = cmd.get_str("collection").unwrap_or("");
            doc! {
                "ok": 1,
                "cursor": {
                    "id": 0i64,
                    "ns": ns_name(&db_name, coll),
                    "nextBatch": Bson::Array(vec![]),
                }
            }
        }
        "listDatabases" => {
            let db_names = match db.list_collection_names() {
                Ok(_) => vec![db_name.clone()],
                Err(_) => vec![db_name.clone()],
            };
            let dbs: Vec<Bson> = db_names
                .iter()
                .map(|n| {
                    Bson::Document(doc! { "name": n.clone(), "sizeOnDisk": 0i64, "empty": false })
                })
                .collect();
            doc! { "ok": 1, "databases": Bson::Array(dbs), "totalSize": 0i64 }
        }
        "listCollections" => {
            let names = db.list_collection_names().unwrap_or_default();
            let first_batch: Vec<Bson> = names
                .iter()
                .map(|n| {
                    Bson::Document(doc! {
                        "name": n.clone(),
                        "type": "collection",
                        "options": Bson::Document(Document::new()),
                        "info": {
                            "readOnly": false,
                            "uuid": bson::oid::ObjectId::new(),
                        },
                        "idIndex": { "v": 2i32, "key": { "_id": 1i32 }, "name": "_id_" },
                    })
                })
                .collect();
            doc! {
                "ok": 1,
                "cursor": {
                    "id": 0i64,
                    "ns": format!("{db_name}.$cmd.listCollections"),
                    "firstBatch": Bson::Array(first_batch),
                }
            }
        }
        "create" => {
            let coll = cmd.get_str("create").unwrap_or("");
            match db.collection(coll) {
                Ok(_) => doc! { "ok": 1 },
                Err(e) => doc! { "ok": 0, "errmsg": e.to_string() },
            }
        }
        "insert" => handle_insert(db, &db_name, cmd),
        "find" => handle_find(db, &db_name, cmd),
        "aggregate" => handle_aggregate(db, &db_name, cmd),
        "count" => handle_count(db, &db_name, cmd),
        _ => doc! { "ok": 0, "errmsg": format!("no such command: {name}") },
    }
}

fn handle_insert(db: &EngineDatabase, _db_name: &str, cmd: &Document) -> Document {
    let coll_name = cmd.get_str("insert").unwrap_or("");
    let docs: Vec<Document> = cmd
        .get_array("documents")
        .map(|arr| {
            arr.iter()
                .filter_map(|b| match b {
                    Bson::Document(d) => Some(d.clone()),
                    _ => None,
                })
                .collect()
        })
        .unwrap_or_default();
    let coll: EngineCollection = match db.collection(coll_name) {
        Ok(c) => c,
        Err(e) => {
            return doc! { "ok": 0, "errmsg": e.to_string(), "n": 0i32 };
        }
    };
    match coll.insert_many(docs) {
        Ok(res) => {
            let n = res.inserted_ids.len() as i32;
            doc! { "ok": 1, "n": n, "nInserted": n, "writeErrors": Bson::Array(vec![]) }
        }
        Err(e) => {
            doc! { "ok": 0, "errmsg": e.to_string(), "n": 0i32 }
        }
    }
}

fn handle_find(db: &EngineDatabase, db_name: &str, cmd: &Document) -> Document {
    let coll_name = cmd.get_str("find").unwrap_or("");
    let filter = cmd.get_document("filter").cloned().unwrap_or_default();
    let opts = EngineFindOptions {
        sort: cmd.get_document("sort").ok().cloned(),
        limit: cmd.get_i64("limit").ok(),
        skip: cmd.get_i64("skip").ok(),
        projection: cmd.get_document("projection").ok().cloned(),
    };
    let coll: EngineCollection = match db.collection(coll_name) {
        Ok(c) => c,
        Err(e) => return doc! { "ok": 0, "errmsg": e.to_string() },
    };
    match coll.find_with_options(filter, opts) {
        Ok(mut docs) => {
            if let Some(limit) = cmd.get_i64("limit").ok() {
                if limit > 0 {
                    docs.truncate(limit as usize);
                }
            }
            let batch = docs.into_iter().take(DEFAULT_BATCH_SIZE).collect();
            cursor_ok(db_name, coll_name, batch)
        }
        Err(e) => doc! { "ok": 0, "errmsg": e.to_string() },
    }
}

fn handle_aggregate(db: &EngineDatabase, db_name: &str, cmd: &Document) -> Document {
    let coll_name = cmd.get_str("aggregate").unwrap_or("");
    let pipeline: Vec<Document> = cmd
        .get_array("pipeline")
        .map(|arr| {
            arr.iter()
                .filter_map(|b| match b {
                    Bson::Document(d) => Some(d.clone()),
                    _ => None,
                })
                .collect()
        })
        .unwrap_or_default();
    let coll: EngineCollection = match db.collection(coll_name) {
        Ok(c) => c,
        Err(e) => return doc! { "ok": 0, "errmsg": e.to_string() },
    };
    // Run through a DatabaseContext so cross-collection stages ($lookup,
    // $unionWith, $graphLookup) can resolve other collections.
    let source_docs = match coll.find(Document::new()) {
        Ok(docs) => docs,
        Err(e) => return doc! { "ok": 0, "errmsg": e.to_string() },
    };
    let ctx = DatabaseContext::new(db);
    let result = smongo_engine::aggregation::aggregate_with_db_collection(
        source_docs,
        &pipeline,
        &ctx,
        Some(coll_name),
    );
    match result {
        Ok(docs) => {
            let batch = docs.into_iter().take(DEFAULT_BATCH_SIZE).collect();
            cursor_ok(db_name, coll_name, batch)
        }
        Err(e) => doc! { "ok": 0, "errmsg": e.to_string() },
    }
}

fn handle_count(db: &EngineDatabase, db_name: &str, cmd: &Document) -> Document {
    let coll_name = cmd.get_str("count").unwrap_or("");
    let filter = cmd.get_document("query").cloned().unwrap_or_default();
    let coll: EngineCollection = match db.collection(coll_name) {
        Ok(c) => c,
        Err(e) => return doc! { "ok": 0, "errmsg": e.to_string() },
    };
    match coll.count_documents(Some(filter)) {
        Ok(n) => doc! { "ok": 1, "n": n as i64, "ns": ns_name(db_name, coll_name) },
        Err(e) => doc! { "ok": 0, "errmsg": e.to_string() },
    }
}

// ============================================================
// Connection handling
// ============================================================

fn handle_conn(mut stream: TcpStream, db: Arc<EngineDatabase>, shutdown: Arc<AtomicBool>) {
    let _ = stream.set_read_timeout(Some(Duration::from_millis(200)));
    let mut buf: Vec<u8> = Vec::with_capacity(64 * 1024);

    loop {
        // Drain any complete messages already buffered.
        let responded = drain_messages(&mut stream, &mut buf, &db);
        if shutdown.load(Ordering::Relaxed) {
            return;
        }
        if responded {
            // Keep processing without blocking on a fresh read.
            continue;
        }

        let mut tmp = [0u8; 8192];
        match stream.read(&mut tmp) {
            Ok(0) => return, // client disconnected
            Ok(n) => buf.extend_from_slice(&tmp[..n]),
            Err(ref e)
                if e.kind() == std::io::ErrorKind::WouldBlock
                    || e.kind() == std::io::ErrorKind::TimedOut =>
            {
                std::thread::sleep(Duration::from_millis(10));
                continue;
            }
            Err(_) => return,
        }
    }
}

/// Process every complete OP_MSG request in `buf`, writing responses back.
/// Returns true if at least one message was consumed.
fn drain_messages(stream: &mut TcpStream, buf: &mut Vec<u8>, db: &EngineDatabase) -> bool {
    let mut consumed_any = false;
    loop {
        if buf.len() < HEADER_SIZE {
            break;
        }
        let msg_len = i32::from_le_bytes(buf[0..4].try_into().unwrap_or([0, 0, 0, 0])) as usize;
        if msg_len < HEADER_SIZE || msg_len > MAX_MSG_SIZE {
            buf.clear();
            break;
        }
        if buf.len() < msg_len {
            break; // incomplete, wait for more bytes
        }
        let msg: Vec<u8> = buf.drain(..msg_len).collect();
        consumed_any = true;
        match parse_message(&msg) {
            Some((req_id, op_code, cmd)) => {
                let response = handle_command(db, &cmd);
                let bytes = match op_code {
                    OP_MSG => build_msg(req_id, &response),
                    OP_QUERY => build_reply(req_id, &response),
                    _ => return true,
                };
                match bytes {
                    Ok(bytes) => {
                        if stream.write_all(&bytes).is_err() {
                            return true;
                        }
                    }
                    Err(_) => return true,
                }
            }
            None => {
                // Unsupported/undecodable opcode: drop the message.
            }
        }
    }
    consumed_any
}

// ============================================================
// Server (napi-exported)
// ============================================================

#[napi(object)]
pub struct WireServerOptions {
    pub db_path: String,
    pub port: Option<u16>,
}

#[napi]
pub struct WireServer {
    port: u16,
    db: Arc<EngineDatabase>,
    shutdown: Arc<AtomicBool>,
}

#[napi]
impl WireServer {
    #[napi(constructor)]
    pub fn new(options: WireServerOptions) -> napi::Result<Self> {
        let db = EngineDatabase::open(&options.db_path)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(WireServer {
            port: options.port.unwrap_or(0),
            db: Arc::new(db),
            shutdown: Arc::new(AtomicBool::new(false)),
        })
    }

    /// Start the wire server on 127.0.0.1 and return the bound port.
    #[napi]
    pub fn start(&mut self) -> napi::Result<u16> {
        let listener = TcpListener::bind(format!("127.0.0.1:{}", self.port))
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let _ = listener.set_nonblocking(true);
        let bound_port = listener
            .local_addr()
            .map_err(|e| napi::Error::from_reason(e.to_string()))?
            .port();
        self.port = bound_port;

        let db = Arc::clone(&self.db);
        let shutdown = Arc::clone(&self.shutdown);
        std::thread::spawn(move || accept_loop(listener, db, shutdown));
        Ok(bound_port)
    }

    /// Request the server to stop accepting connections and shut down.
    #[napi]
    pub fn stop(&self) {
        self.shutdown.store(true, Ordering::Relaxed);
    }

    /// The port the server is bound to (after start()).
    #[napi(getter)]
    pub fn port(&self) -> u16 {
        self.port
    }
}

fn accept_loop(listener: TcpListener, db: Arc<EngineDatabase>, shutdown: Arc<AtomicBool>) {
    while !shutdown.load(Ordering::Relaxed) {
        match listener.accept() {
            Ok((stream, _)) => {
                let db = Arc::clone(&db);
                let shutdown = Arc::clone(&shutdown);
                std::thread::spawn(move || handle_conn(stream, db, shutdown));
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                std::thread::sleep(Duration::from_millis(5));
            }
            Err(_) => break,
        }
    }
}
