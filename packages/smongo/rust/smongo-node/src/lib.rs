//! Node.js binding for smongo embedded database engine.
//!
//! Provides a MongoDB-compatible API for Node.js via napi-rs.
//! Documents cross the boundary as plain JS objects, with automatic
//! BSON <-> JSON conversion handled internally.

use std::sync::Arc;

use bson::{Bson, Document};
use napi_derive::napi;

use smongo_engine::collection::{
    Collection as EngineCollection, FindOptions as EngineFindOptions,
    UpdateOptions as EngineUpdateOptions,
};
use smongo_engine::database::Database as EngineDatabase;
use smongo_engine::database::TransactionSession as EngineTransactionSession;
use smongo_engine::index::{
    IndexOptions as EngineIndexOptions, IndexType as EngineIndexType,
    PrefixOptions as EnginePrefixOptions, TextIndexOptions as EngineTextIndexOptions,
    VectorIndexOptions as EngineVectorIndexOptions,
};

// ============================================================
// JSON <-> BSON CONVERSION
// ============================================================

fn json_to_bson(value: &serde_json::Value) -> Bson {
    match value {
        serde_json::Value::Object(map) => {
            let doc: Document = map
                .iter()
                .map(|(k, v)| (k.clone(), json_to_bson(v)))
                .collect();
            Bson::Document(doc)
        }
        serde_json::Value::Array(arr) => Bson::Array(arr.iter().map(json_to_bson).collect()),
        serde_json::Value::String(s) => Bson::String(s.clone()),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                if i >= i64::from(i32::MIN) && i <= i64::from(i32::MAX) {
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
        serde_json::Value::Bool(b) => Bson::Boolean(*b),
        serde_json::Value::Null => Bson::Null,
    }
}

fn json_to_doc(value: serde_json::Value) -> napi::Result<Document> {
    match json_to_bson(&value) {
        Bson::Document(doc) => Ok(doc),
        _ => Err(napi::Error::from_reason("Expected a JSON object")),
    }
}

fn json_vec_to_docs(value: serde_json::Value) -> napi::Result<Vec<Document>> {
    match value {
        serde_json::Value::Array(arr) => arr.into_iter().map(json_to_doc).collect(),
        _ => Err(napi::Error::from_reason("Expected a JSON array of objects")),
    }
}

fn bson_to_json(bson: &Bson) -> serde_json::Value {
    match bson {
        Bson::Document(doc) => doc_to_json(doc),
        Bson::Array(arr) => serde_json::Value::Array(arr.iter().map(bson_to_json).collect()),
        Bson::ObjectId(oid) => serde_json::Value::String(oid.to_hex()),
        Bson::String(s) => serde_json::Value::String(s.clone()),
        Bson::Int32(i) => serde_json::Value::Number((*i).into()),
        Bson::Int64(i) => serde_json::Value::Number((*i).into()),
        Bson::Double(f) => serde_json::Number::from_f64(*f)
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        Bson::Boolean(b) => serde_json::Value::Bool(*b),
        Bson::Null => serde_json::Value::Null,
        other => other.clone().into_relaxed_extjson(),
    }
}

fn doc_to_json(doc: &Document) -> serde_json::Value {
    let map: serde_json::Map<String, serde_json::Value> = doc
        .iter()
        .map(|(k, v)| (k.clone(), bson_to_json(v)))
        .collect();
    serde_json::Value::Object(map)
}

fn docs_to_json_array(docs: &[Document]) -> serde_json::Value {
    serde_json::Value::Array(docs.iter().map(doc_to_json).collect())
}

fn parse_find_options(options: &Option<serde_json::Value>) -> EngineFindOptions {
    match options {
        Some(o) => {
            let sort = o.get("sort").and_then(|v| {
                if let Bson::Document(d) = json_to_bson(v) {
                    Some(d)
                } else {
                    None
                }
            });
            let limit = o.get("limit").and_then(|v| v.as_i64());
            let skip = o.get("skip").and_then(|v| v.as_i64());
            let projection = o.get("projection").and_then(|v| {
                if let Bson::Document(d) = json_to_bson(v) {
                    Some(d)
                } else {
                    None
                }
            });
            EngineFindOptions {
                sort,
                limit,
                skip,
                projection,
            }
        }
        None => EngineFindOptions::default(),
    }
}

fn parse_update_options(options: &Option<serde_json::Value>) -> EngineUpdateOptions {
    match options {
        Some(o) => EngineUpdateOptions {
            upsert: o.get("upsert").and_then(|v| v.as_bool()).unwrap_or(false),
            ..Default::default()
        },
        None => EngineUpdateOptions::default(),
    }
}

fn apply_find_options_in_memory(docs: &mut Vec<Document>, opts: &serde_json::Value) {
    if let Some(sort) = opts.get("sort") {
        if let Bson::Document(sort_doc) = json_to_bson(sort) {
            docs.sort_by(|a, b| {
                for (key, dir) in sort_doc.iter() {
                    let dir_val = match dir {
                        Bson::Int32(n) => *n as i64,
                        Bson::Int64(n) => *n,
                        _ => 1,
                    };
                    let av = a.get(key);
                    let bv = b.get(key);
                    let cmp = compare_bson_values(av, bv);
                    let cmp = if dir_val < 0 { cmp.reverse() } else { cmp };
                    if cmp != std::cmp::Ordering::Equal {
                        return cmp;
                    }
                }
                std::cmp::Ordering::Equal
            });
        }
    }
    if let Some(skip) = opts.get("skip").and_then(|v| v.as_u64()) {
        let skip = skip as usize;
        if skip >= docs.len() {
            docs.clear();
        } else {
            docs.drain(..skip);
        }
    }
    if let Some(limit) = opts.get("limit").and_then(|v| v.as_u64()) {
        docs.truncate(limit as usize);
    }
    if let Some(proj) = opts.get("projection") {
        if let Bson::Document(proj_doc) = json_to_bson(proj) {
            let include_fields: Vec<String> = proj_doc
                .iter()
                .filter(|(_, v)| matches!(v, Bson::Int32(1) | Bson::Int64(1) | Bson::Boolean(true)))
                .map(|(k, _)| k.clone())
                .collect();
            if !include_fields.is_empty() {
                for doc in docs.iter_mut() {
                    let mut projected = Document::new();
                    if let Some(id) = doc.get("_id") {
                        projected.insert("_id", id.clone());
                    }
                    for field in &include_fields {
                        if let Some(val) = doc.get(field) {
                            projected.insert(field, val.clone());
                        }
                    }
                    *doc = projected;
                }
            }
        }
    }
}

fn compare_bson_values(a: Option<&Bson>, b: Option<&Bson>) -> std::cmp::Ordering {
    match (a, b) {
        (None, None) => std::cmp::Ordering::Equal,
        (None, Some(_)) => std::cmp::Ordering::Less,
        (Some(_), None) => std::cmp::Ordering::Greater,
        (Some(av), Some(bv)) => {
            let fa = bson_sort_key(av);
            let fb = bson_sort_key(bv);
            fa.partial_cmp(&fb).unwrap_or(std::cmp::Ordering::Equal)
        }
    }
}

fn bson_sort_key(v: &Bson) -> f64 {
    match v {
        Bson::Int32(n) => *n as f64,
        Bson::Int64(n) => *n as f64,
        Bson::Double(f) => *f,
        Bson::Boolean(b) => {
            if *b {
                1.0
            } else {
                0.0
            }
        }
        Bson::Null => f64::NEG_INFINITY,
        _ => 0.0,
    }
}

fn explain_to_json(explain: &smongo_engine::explain::ExplainResult) -> serde_json::Value {
    serde_json::json!({
        "executionPlan": match &explain.execution_plan {
            smongo_engine::explain::ExecutionPlanExplain::CollectionScan => "COLLSCAN",
            smongo_engine::explain::ExecutionPlanExplain::IndexScan { .. } => "IXSCAN",
            smongo_engine::explain::ExecutionPlanExplain::IndexSeek { .. } => "IXSEEK",
            smongo_engine::explain::ExecutionPlanExplain::Geo { .. } => "GEO",
            smongo_engine::explain::ExecutionPlanExplain::OrUnion => "OR_UNION",
            smongo_engine::explain::ExecutionPlanExplain::CoveringIndexScan { .. } => "IXSCAN_COVERING",
            smongo_engine::explain::ExecutionPlanExplain::SortedIndexScan { .. } => "IXSCAN_SORTED",
            smongo_engine::explain::ExecutionPlanExplain::VectorIndexSearch { .. } => "VECTOR_SEARCH",
            smongo_engine::explain::ExecutionPlanExplain::BitmapScan { .. } => "BITMAP_SCAN",
            smongo_engine::explain::ExecutionPlanExplain::TextIndexScan { .. } => "TEXT_SCAN",
            smongo_engine::explain::ExecutionPlanExplain::PrefixIndexScan { .. } => "PREFIX_SCAN",
        },
        "indexUsed": explain.index_used,
        "planReason": explain.plan_reason,
        "executionStats": {
            "documentsExamined": explain.execution_stats.documents_examined,
            "documentsReturned": explain.execution_stats.documents_returned,
            "indexEntriesExamined": explain.execution_stats.index_entries_examined,
        },
        "efficiency": explain.efficiency(),
        "summary": explain.summary(),
    })
}

fn parse_index_options(o: &serde_json::Value) -> EngineIndexOptions {
    let index_type = o
        .get("indexType")
        .and_then(|v| v.as_str())
        .and_then(|s| match s {
            "btree" | "BTree" => Some(EngineIndexType::BTree),
            "2dsphere" | "TwoDSphere" => Some(EngineIndexType::TwoDSphere),
            "text" | "Text" => Some(EngineIndexType::Text),
            "vectorSearch" | "VectorSearch" => Some(EngineIndexType::VectorSearch),
            "bitmap" | "Bitmap" => Some(EngineIndexType::Bitmap),
            "prefix" | "Prefix" => Some(EngineIndexType::Prefix),
            _ => None,
        });

    let vector_options = o.get("vectorOptions").and_then(|v| {
        let dimensions = v.get("dimensions")?.as_u64()? as usize;
        let metric = v
            .get("metric")
            .and_then(|m| m.as_str())
            .unwrap_or("cosine")
            .to_string();
        let ef_construction = v
            .get("efConstruction")
            .and_then(|n| n.as_u64())
            .map(|n| n as usize);
        let m = v.get("m").and_then(|n| n.as_u64()).map(|n| n as usize);
        let indexing_method = v
            .get("indexingMethod")
            .and_then(|s| s.as_str())
            .unwrap_or("hnsw")
            .to_string();
        Some(EngineVectorIndexOptions {
            dimensions,
            metric,
            indexing_method,
            ef_construction,
            m,
        })
    });

    let text_options = o.get("textOptions").map(|v| EngineTextIndexOptions {
        default_language: v
            .get("defaultLanguage")
            .and_then(|s| s.as_str())
            .map(|s| s.to_string()),
        weights: v.get("weights").and_then(|w| {
            if let Bson::Document(d) = json_to_bson(w) {
                Some(d)
            } else {
                None
            }
        }),
    });

    let prefix_options = o.get("prefixOptions").map(|v| {
        let prefix_length = v.get("prefixLength").and_then(|n| n.as_u64()).unwrap_or(16) as usize;
        EnginePrefixOptions { prefix_length }
    });

    let partial_filter_expression = o.get("partialFilterExpression").and_then(|v| {
        if let bson::Bson::Document(d) = json_to_bson(v) {
            Some(d)
        } else {
            None
        }
    });

    let collation = o.get("collation").and_then(|v| {
        if let bson::Bson::Document(d) = json_to_bson(v) {
            Some(d)
        } else {
            None
        }
    });

    EngineIndexOptions {
        name: o
            .get("name")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        unique: o.get("unique").and_then(|v| v.as_bool()).unwrap_or(false),
        sparse: o.get("sparse").and_then(|v| v.as_bool()).unwrap_or(false),
        background: o
            .get("background")
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
        expire_after_seconds: o.get("expireAfterSeconds").and_then(|v| v.as_u64()),
        partial_filter_expression,
        collation,
        index_type,
        vector_options,
        text_options,
        prefix_options,
    }
}

// ============================================================
// MongoClient — top-level entry point (MongoDB driver-like API)
// ============================================================

#[napi]
pub struct MongoClient {
    base_path: String,
}

#[napi]
impl MongoClient {
    /// Create a new MongoClient.
    ///
    /// Accepts a URI-like path: `local://./my_data` or just a filesystem path.
    #[napi(constructor)]
    pub fn new(uri: String) -> Self {
        let base_path = uri.strip_prefix("local://").unwrap_or(&uri).to_string();
        MongoClient { base_path }
    }

    /// Open a named database under the client's base path.
    #[napi]
    pub fn db(&self, name: String) -> napi::Result<Database> {
        let path = format!("{}/{}", self.base_path, name);
        Database::open(path)
    }
}

// ============================================================
// Database — wraps smongo_engine::database::Database
// ============================================================

#[napi]
pub struct Database {
    inner: Arc<EngineDatabase>,
}

#[napi]
impl Database {
    /// Open or create a database at the given path.
    #[napi(factory)]
    pub fn open(path: String) -> napi::Result<Self> {
        let db =
            EngineDatabase::open(&path).map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(Database {
            inner: Arc::new(db),
        })
    }

    /// Get the database name (derived from the path).
    #[napi(getter)]
    pub fn name(&self) -> String {
        self.inner.name().to_string()
    }

    /// Get the database path.
    #[napi(getter)]
    pub fn path(&self) -> String {
        self.inner.path().to_string()
    }

    /// Get or create a collection.
    #[napi]
    pub fn collection(&self, name: String) -> napi::Result<Collection> {
        let col = self
            .inner
            .collection(&name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(Collection {
            inner: Some(col),
            db_ref: Some(Arc::clone(&self.inner)),
        })
    }

    /// List all collection names in the database.
    #[napi(js_name = "listCollectionNames")]
    pub fn list_collection_names(&self) -> napi::Result<Vec<String>> {
        self.inner
            .list_collection_names()
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Drop a collection by name.
    #[napi(js_name = "dropCollection")]
    pub fn drop_collection(&self, name: String) -> napi::Result<()> {
        self.inner
            .drop_collection(&name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Get database statistics.
    #[napi]
    pub fn stats(&self) -> napi::Result<serde_json::Value> {
        let s = self
            .inner
            .stats()
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(serde_json::json!({
            "collectionCount": s.collection_count,
            "sizeBytes": s.size_bytes,
        }))
    }

    /// Start a new client session for multi-collection transactions.
    ///
    /// Returns a `ClientSession` that supports `startTransaction()`,
    /// `commitTransaction()`, and `abortTransaction()`, with collection
    /// operations scoped to the transaction.
    #[napi(js_name = "startSession")]
    pub fn start_session(&self) -> napi::Result<ClientSession> {
        let session = self
            .inner
            .start_session()
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(ClientSession { inner: session })
    }

    /// Reap expired documents from all TTL-indexed collections.
    ///
    /// Returns the total number of documents removed.
    #[napi(js_name = "reapTtl")]
    pub fn reap_ttl(&self) -> napi::Result<i64> {
        let count = self
            .inner
            .reap_ttl()
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(count as i64)
    }

    /// Drop the entire database, removing all data files.
    ///
    /// After this call, the database handle is consumed and must not be used.
    #[napi]
    pub fn drop(&mut self) -> napi::Result<()> {
        let dummy_dir = std::env::temp_dir().join(format!(
            "smongo_node_drop_{}_{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        std::fs::create_dir_all(&dummy_dir).map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let dummy_db = EngineDatabase::open(&dummy_dir)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let old_inner = std::mem::replace(&mut self.inner, Arc::new(dummy_db));
        let db = Arc::try_unwrap(old_inner).map_err(|_| {
            napi::Error::from_reason(
                "Cannot drop database: other references still exist (close all collections first)",
            )
        })?;
        db.drop()
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }
}

// ============================================================
// Collection — wraps smongo_engine::collection::Collection
// ============================================================

#[napi]
pub struct Collection {
    inner: Option<EngineCollection>,
    db_ref: Option<Arc<EngineDatabase>>,
}

impl Collection {
    fn engine(&self) -> napi::Result<&EngineCollection> {
        self.inner
            .as_ref()
            .ok_or_else(|| napi::Error::from_reason("Collection has been closed"))
    }
}

#[napi]
impl Collection {
    /// Release the underlying engine collection handle.
    ///
    /// Must be called before `db.dropCollection()` when a JS-side handle
    /// was previously obtained for the same collection name, so the engine
    /// can drop tables without conflicting open handles.
    #[napi]
    pub fn close(&mut self) {
        self.inner.take();
        self.db_ref.take();
    }

    // ---- INSERT ----

    #[napi(js_name = "insertOne")]
    pub fn insert_one(&self, document: serde_json::Value) -> napi::Result<serde_json::Value> {
        let doc = json_to_doc(document)?;
        let result = self
            .engine()?
            .insert_one(doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(serde_json::json!({
            "insertedId": bson_to_json(&result.inserted_id),
        }))
    }

    #[napi(js_name = "insertMany")]
    pub fn insert_many(&self, documents: serde_json::Value) -> napi::Result<serde_json::Value> {
        let docs = json_vec_to_docs(documents)?;
        let result = self
            .engine()?
            .insert_many(docs)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let ids: Vec<serde_json::Value> = result.inserted_ids.iter().map(bson_to_json).collect();
        Ok(serde_json::json!({ "insertedIds": ids }))
    }

    // ---- FIND ----

    #[napi(js_name = "findOne")]
    pub fn find_one(
        &self,
        filter: serde_json::Value,
        options: Option<serde_json::Value>,
    ) -> napi::Result<Option<serde_json::Value>> {
        let engine = self.engine()?;
        let filter_doc = json_to_doc(filter)?;
        let opts = parse_find_options(&options);
        let has_options = options.is_some();
        let result = if has_options {
            engine.find_one_with_options(filter_doc, opts)
        } else {
            engine.find_one(filter_doc)
        }
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(result.map(|d| doc_to_json(&d)))
    }

    #[napi]
    pub fn find(
        &self,
        filter: serde_json::Value,
        options: Option<serde_json::Value>,
    ) -> napi::Result<serde_json::Value> {
        let engine = self.engine()?;
        let filter_doc = json_to_doc(filter)?;
        let opts = parse_find_options(&options);
        let has_options = options.is_some();
        let docs = if has_options {
            engine.find_with_options(filter_doc, opts)
        } else {
            engine.find(filter_doc)
        }
        .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(docs_to_json_array(&docs))
    }

    // ---- UPDATE ----

    #[napi(js_name = "updateOne")]
    pub fn update_one(
        &self,
        filter: serde_json::Value,
        update: serde_json::Value,
        options: Option<serde_json::Value>,
    ) -> napi::Result<serde_json::Value> {
        let filter_doc = json_to_doc(filter)?;
        let update_doc = json_to_doc(update)?;
        let opts = parse_update_options(&options);
        let result = self
            .engine()?
            .update_one_with_options(filter_doc, update_doc, opts)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let mut res = serde_json::json!({
            "matchedCount": result.matched_count,
            "modifiedCount": result.modified_count,
        });
        if let Some(id) = &result.upserted_id {
            res["upsertedId"] = bson_to_json(id);
        }
        Ok(res)
    }

    #[napi(js_name = "updateMany")]
    pub fn update_many(
        &self,
        filter: serde_json::Value,
        update: serde_json::Value,
        options: Option<serde_json::Value>,
    ) -> napi::Result<serde_json::Value> {
        let filter_doc = json_to_doc(filter)?;
        let update_doc = json_to_doc(update)?;
        let opts = parse_update_options(&options);
        let result = self
            .engine()?
            .update_many_with_options(filter_doc, update_doc, opts)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let mut res = serde_json::json!({
            "matchedCount": result.matched_count,
            "modifiedCount": result.modified_count,
        });
        if let Some(id) = &result.upserted_id {
            res["upsertedId"] = bson_to_json(id);
        }
        Ok(res)
    }

    // ---- DELETE ----

    #[napi(js_name = "deleteOne")]
    pub fn delete_one(&self, filter: serde_json::Value) -> napi::Result<serde_json::Value> {
        let filter_doc = json_to_doc(filter)?;
        let result = self
            .engine()?
            .delete_one(filter_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(serde_json::json!({ "deletedCount": result.deleted_count }))
    }

    #[napi(js_name = "deleteMany")]
    pub fn delete_many(&self, filter: serde_json::Value) -> napi::Result<serde_json::Value> {
        let filter_doc = json_to_doc(filter)?;
        let result = self
            .engine()?
            .delete_many(filter_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(serde_json::json!({ "deletedCount": result.deleted_count }))
    }

    // ---- COUNT ----

    #[napi(js_name = "countDocuments")]
    pub fn count_documents(&self, filter: Option<serde_json::Value>) -> napi::Result<i64> {
        let filter_doc = filter.map(json_to_doc).transpose()?;
        let count = self
            .engine()?
            .count_documents(filter_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(count as i64)
    }

    // ---- AGGREGATION ----

    #[napi]
    pub fn aggregate(&self, pipeline: serde_json::Value) -> napi::Result<serde_json::Value> {
        let stages = json_vec_to_docs(pipeline)?;
        let docs = self
            .engine()?
            .aggregate(stages)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(docs_to_json_array(&docs))
    }

    #[napi(js_name = "explainAggregate")]
    pub fn explain_aggregate(
        &self,
        pipeline: serde_json::Value,
    ) -> napi::Result<serde_json::Value> {
        let stages = json_vec_to_docs(pipeline)?;
        let explain = self
            .engine()?
            .explain_aggregate(stages)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(explain_to_json(&explain))
    }

    // ---- EXPLAIN ----

    #[napi(js_name = "explainFind")]
    pub fn explain_find(&self, filter: serde_json::Value) -> napi::Result<serde_json::Value> {
        let filter_doc = json_to_doc(filter)?;
        let explain = self
            .engine()?
            .explain_find(filter_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(explain_to_json(&explain))
    }

    #[napi(js_name = "explainFindOne")]
    pub fn explain_find_one(&self, filter: serde_json::Value) -> napi::Result<serde_json::Value> {
        let filter_doc = json_to_doc(filter)?;
        let explain = self
            .engine()?
            .explain_find_one(filter_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(explain_to_json(&explain))
    }

    // ---- INDEXES ----

    #[napi(js_name = "createIndex")]
    pub fn create_index(
        &self,
        keys: serde_json::Value,
        options: Option<serde_json::Value>,
    ) -> napi::Result<String> {
        let keys_doc = json_to_doc(keys)?;
        let opts = options.as_ref().map(parse_index_options);
        self.engine()?
            .create_index(keys_doc, opts)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    #[napi(js_name = "reapExpired")]
    pub fn reap_expired(&self) -> napi::Result<i64> {
        let count = self
            .engine()?
            .reap_expired()
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(count as i64)
    }

    #[napi(js_name = "dropIndex")]
    pub fn drop_index(&self, name: String) -> napi::Result<()> {
        self.engine()?
            .drop_index(&name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    #[napi(js_name = "listIndexes")]
    pub fn list_indexes(&self) -> napi::Result<serde_json::Value> {
        let indexes = self
            .engine()?
            .list_indexes()
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let arr: Vec<serde_json::Value> = indexes
            .iter()
            .map(|idx| {
                let keys = doc_to_json(&idx.keys);
                let mut opts = serde_json::json!({
                    "unique": idx.options.unique,
                    "sparse": idx.options.sparse,
                    "background": idx.options.background,
                });
                if let Some(ttl) = idx.options.expire_after_seconds {
                    opts["expireAfterSeconds"] = serde_json::json!(ttl);
                }
                serde_json::json!({
                    "name": idx.name,
                    "keys": keys,
                    "options": opts,
                })
            })
            .collect();
        Ok(serde_json::Value::Array(arr))
    }

    #[napi(js_name = "rebuildAllIndexes")]
    pub fn rebuild_all_indexes(&self) -> napi::Result<i64> {
        self.engine()?
            .rebuild_all_indexes()
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }
}

// ============================================================
// ClientSession — multi-collection transaction support
// ============================================================

#[napi]
pub struct ClientSession {
    inner: EngineTransactionSession,
}

#[napi]
impl ClientSession {
    /// Begin a transaction on this session.
    #[napi(js_name = "startTransaction")]
    pub fn start_transaction(&self) -> napi::Result<()> {
        self.inner
            .begin_transaction()
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Commit the current transaction.
    #[napi(js_name = "commitTransaction")]
    pub fn commit_transaction(&self) -> napi::Result<()> {
        self.inner
            .commit_transaction()
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Abort / roll back the current transaction.
    #[napi(js_name = "abortTransaction")]
    pub fn abort_transaction(&self) -> napi::Result<()> {
        self.inner
            .rollback_transaction()
            .map_err(|e| napi::Error::from_reason(e.to_string()))
    }

    /// Insert a single document into a collection within this transaction.
    ///
    /// Returns `{ insertedId: string }`.
    #[napi(js_name = "insertOne")]
    pub fn insert_one(
        &self,
        collection_name: String,
        document: serde_json::Value,
    ) -> napi::Result<serde_json::Value> {
        let col = self
            .inner
            .collection(&collection_name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let doc = json_to_doc(document)?;
        let result = col
            .insert_one(doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(serde_json::json!({
            "insertedId": bson_to_json(&result.inserted_id),
        }))
    }

    /// Find a single document within this transaction.
    #[napi(js_name = "findOne")]
    pub fn find_one(
        &self,
        collection_name: String,
        filter: serde_json::Value,
        options: Option<serde_json::Value>,
    ) -> napi::Result<Option<serde_json::Value>> {
        let col = self
            .inner
            .collection(&collection_name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let filter_doc = json_to_doc(filter)?;
        // CollectionView only supports basic find; apply sort/projection in-memory
        let mut docs = col
            .find(filter_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        if let Some(ref opts) = options {
            apply_find_options_in_memory(&mut docs, opts);
        }
        Ok(docs.into_iter().next().map(|d| doc_to_json(&d)))
    }

    /// Find all documents matching the filter within this transaction.
    #[napi]
    pub fn find(
        &self,
        collection_name: String,
        filter: serde_json::Value,
        options: Option<serde_json::Value>,
    ) -> napi::Result<serde_json::Value> {
        let col = self
            .inner
            .collection(&collection_name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let filter_doc = json_to_doc(filter)?;
        let mut docs = col
            .find(filter_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        if let Some(ref opts) = options {
            apply_find_options_in_memory(&mut docs, opts);
        }
        Ok(docs_to_json_array(&docs))
    }

    /// Update a single document within this transaction.
    ///
    /// Returns `{ matchedCount, modifiedCount }`.
    #[napi(js_name = "updateOne")]
    pub fn update_one(
        &self,
        collection_name: String,
        filter: serde_json::Value,
        update: serde_json::Value,
        _options: Option<serde_json::Value>,
    ) -> napi::Result<serde_json::Value> {
        let col = self
            .inner
            .collection(&collection_name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let filter_doc = json_to_doc(filter)?;
        let update_doc = json_to_doc(update)?;
        let result = col
            .update_one(filter_doc, update_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let mut res = serde_json::json!({
            "matchedCount": result.matched_count,
            "modifiedCount": result.modified_count,
        });
        if let Some(id) = &result.upserted_id {
            res["upsertedId"] = bson_to_json(id);
        }
        Ok(res)
    }

    /// Update all documents matching the filter within this transaction.
    ///
    /// Returns `{ matchedCount, modifiedCount }`.
    #[napi(js_name = "updateMany")]
    pub fn update_many(
        &self,
        collection_name: String,
        filter: serde_json::Value,
        update: serde_json::Value,
        _options: Option<serde_json::Value>,
    ) -> napi::Result<serde_json::Value> {
        let col = self
            .inner
            .collection(&collection_name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let filter_doc = json_to_doc(filter)?;
        let update_doc = json_to_doc(update)?;
        let result = col
            .update_many(filter_doc, update_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let mut res = serde_json::json!({
            "matchedCount": result.matched_count,
            "modifiedCount": result.modified_count,
        });
        if let Some(id) = &result.upserted_id {
            res["upsertedId"] = bson_to_json(id);
        }
        Ok(res)
    }

    /// Delete a single document within this transaction.
    ///
    /// Returns `{ deletedCount }`.
    #[napi(js_name = "deleteOne")]
    pub fn delete_one(
        &self,
        collection_name: String,
        filter: serde_json::Value,
    ) -> napi::Result<serde_json::Value> {
        let col = self
            .inner
            .collection(&collection_name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let filter_doc = json_to_doc(filter)?;
        let result = col
            .delete_one(filter_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(serde_json::json!({ "deletedCount": result.deleted_count }))
    }

    /// Delete all documents matching the filter within this transaction.
    ///
    /// Returns `{ deletedCount }`.
    #[napi(js_name = "deleteMany")]
    pub fn delete_many(
        &self,
        collection_name: String,
        filter: serde_json::Value,
    ) -> napi::Result<serde_json::Value> {
        let col = self
            .inner
            .collection(&collection_name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let filter_doc = json_to_doc(filter)?;
        let result = col
            .delete_many(filter_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(serde_json::json!({ "deletedCount": result.deleted_count }))
    }

    /// Count documents matching the filter within this transaction.
    #[napi(js_name = "countDocuments")]
    pub fn count_documents(
        &self,
        collection_name: String,
        filter: Option<serde_json::Value>,
    ) -> napi::Result<i64> {
        let col = self
            .inner
            .collection(&collection_name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let filter_doc = filter.map(json_to_doc).transpose()?;
        let count = col
            .count_documents(filter_doc)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(count as i64)
    }

    /// Run an aggregation pipeline within this transaction.
    #[napi]
    pub fn aggregate(
        &self,
        collection_name: String,
        pipeline: serde_json::Value,
    ) -> napi::Result<serde_json::Value> {
        let col = self
            .inner
            .collection(&collection_name)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        let stages = json_vec_to_docs(pipeline)?;
        let results = col
            .aggregate(stages)
            .map_err(|e| napi::Error::from_reason(e.to_string()))?;
        Ok(docs_to_json_array(&results))
    }
}

// Wire server (see wire_server.rs)
mod wire_server;
pub use wire_server::{WireServer, WireServerOptions};
