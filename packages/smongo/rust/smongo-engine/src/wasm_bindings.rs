//! WASM bindings for smongo-engine: browser-compatible database API
//!
//! Exposes a JavaScript API over wasm-bindgen. Follows the C ABI pattern:
//! raw BSON bytes at every boundary to avoid expensive type marshalling.
//!
//! # Design
//!
//! - `WasmDatabase` wraps `Database<MemBackend>` (ephemeral in-memory)
//! - `WasmOpfsDatabase` wraps `Database<OpfsBackend>` (persistent via OPFS)
//! - All document parameters and results are BSON byte arrays (`Vec<u8>`)
//! - JavaScript layer uses MongoDB's `bson` package for serialization
//!
//! # Example (from JavaScript)
//!
//! ```javascript
//! import { initSmongo, Database } from './smongo-browser.js';
//!
//! await initSmongo();
//! const db = new Database('mydb');
//! const coll = db.collection('users');
//!
//! // Insert
//! coll.insertOne({ name: 'Alice', age: 30 });
//!
//! // Find with options
//! const docs = coll.find({ age: { $gte: 18 } }, { limit: 10, sort: { age: -1 } });
//!
//! // Aggregate
//! const results = coll.aggregate([{ $match: { age: { $gte: 18 } } }, { $sort: { age: -1 } }]);
//! ```

use bson::{doc, from_slice, to_vec, Bson, Document};
use js_sys::{Iterator, Map};
use std::collections::BTreeMap;
use wasm_bindgen::prelude::*;
use web_sys::FileSystemSyncAccessHandle;

use crate::collection::{Collection, FindOptions};
use crate::database::Database;
use crate::index::{IndexOptions, IndexType, PrefixOptions, TextIndexOptions, VectorIndexOptions};
use crate::storage::{MemBackend, MemSession, OpfsBackend, OpfsSession};

/// Called automatically when the WASM module loads. Installs a panic hook that
/// forwards Rust panic messages to `console.error` instead of the opaque
/// `RuntimeError: unreachable` default.
#[wasm_bindgen(start)]
pub fn wasm_init() {
    console_error_panic_hook::set_once();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn js_err(msg: String) -> JsValue {
    JsValue::from_str(&msg)
}

fn parse_find_options(opts_bytes: &[u8]) -> Result<FindOptions, JsValue> {
    let opts_doc: Document =
        from_slice(opts_bytes).map_err(|e| js_err(format!("BSON parse error (options): {}", e)))?;

    Ok(FindOptions {
        sort: opts_doc.get_document("sort").ok().cloned(),
        limit: opts_doc
            .get_i64("limit")
            .ok()
            .or_else(|| opts_doc.get_i32("limit").ok().map(i64::from)),
        skip: opts_doc
            .get_i64("skip")
            .ok()
            .or_else(|| opts_doc.get_i32("skip").ok().map(i64::from)),
        projection: opts_doc.get_document("projection").ok().cloned(),
    })
}

fn parse_index_options(opts_bytes: &[u8]) -> Result<IndexOptions, JsValue> {
    let opts_doc: Document = from_slice(opts_bytes)
        .map_err(|e| js_err(format!("BSON parse error (index options): {}", e)))?;

    let index_type = opts_doc.get_str("indexType").ok().and_then(|s| match s {
        "btree" | "bTree" => Some(IndexType::BTree),
        "text" => Some(IndexType::Text),
        "bitmap" => Some(IndexType::Bitmap),
        "prefix" => Some(IndexType::Prefix),
        "vectorSearch" => Some(IndexType::VectorSearch),
        "2dsphere" => Some(IndexType::TwoDSphere),
        _ => None,
    });

    let vector_options = opts_doc
        .get_document("vectorOptions")
        .or_else(|_| opts_doc.get_document("vectorSearchOptions"))
        .ok()
        .map(|vdoc| VectorIndexOptions {
            dimensions: vdoc
                .get_i64("dimensions")
                .or_else(|_| vdoc.get_i64("numDimensions"))
                .ok()
                .or_else(|| {
                    vdoc.get_i32("dimensions")
                        .or_else(|_| vdoc.get_i32("numDimensions"))
                        .ok()
                        .map(i64::from)
                })
                .unwrap_or(0) as usize,
            metric: vdoc
                .get_str("metric")
                .or_else(|_| vdoc.get_str("similarity"))
                .ok()
                .unwrap_or("cosine")
                .to_string(),
            indexing_method: vdoc
                .get_str("indexingMethod")
                .ok()
                .unwrap_or("hnsw")
                .to_string(),
            ef_construction: vdoc
                .get_i64("efConstruction")
                .ok()
                .or_else(|| vdoc.get_i32("efConstruction").ok().map(i64::from))
                .map(|v| v as usize),
            m: vdoc
                .get_i64("m")
                .ok()
                .or_else(|| vdoc.get_i32("m").ok().map(i64::from))
                .map(|v| v as usize),
        });

    let text_options = opts_doc
        .get_document("textOptions")
        .ok()
        .map(|tdoc| TextIndexOptions {
            default_language: tdoc.get_str("defaultLanguage").ok().map(String::from),
            weights: tdoc.get_document("weights").ok().cloned(),
        });

    let prefix_options = opts_doc
        .get_document("prefixOptions")
        .ok()
        .map(|pdoc| PrefixOptions {
            prefix_length: pdoc
                .get_i64("prefixLength")
                .ok()
                .or_else(|| pdoc.get_i32("prefixLength").ok().map(i64::from))
                .unwrap_or(128) as usize,
        });

    Ok(IndexOptions {
        name: opts_doc.get_str("name").ok().map(String::from),
        unique: opts_doc.get_bool("unique").unwrap_or(false),
        sparse: opts_doc.get_bool("sparse").unwrap_or(false),
        background: opts_doc.get_bool("background").unwrap_or(false),
        expire_after_seconds: opts_doc
            .get_i64("expireAfterSeconds")
            .ok()
            .or_else(|| opts_doc.get_i32("expireAfterSeconds").ok().map(i64::from))
            .map(|v| v as u64),
        partial_filter_expression: opts_doc
            .get_document("partialFilterExpression")
            .ok()
            .cloned(),
        collation: opts_doc.get_document("collation").ok().cloned(),
        index_type,
        vector_options,
        text_options,
        prefix_options,
    })
}

// ---------------------------------------------------------------------------
// WasmDatabase (in-memory)
// ---------------------------------------------------------------------------

/// WASM-compatible database handle.
///
/// Uses in-memory storage only (`MemBackend`). For persistent storage in browsers,
/// use [`WasmOpfsDatabase`] with OPFS sync handles (typically via `initOpfsDatabase` /
/// `smongo-browser.js`). Lifecycle, errors, and recovery: `wasm/PERSISTENCE-AND-LIFECYCLE.md`.
#[wasm_bindgen]
pub struct WasmDatabase {
    inner: Database<MemBackend>,
}

#[wasm_bindgen]
impl WasmDatabase {
    #[wasm_bindgen(constructor)]
    pub fn new(name: String) -> WasmDatabase {
        let backend = MemBackend::new();
        let db = Database::from_backend(backend, &name, None);
        WasmDatabase { inner: db }
    }

    pub fn collection(&self, name: String) -> Result<WasmCollection, JsValue> {
        let coll = self
            .inner
            .collection(&name)
            .map_err(|e| js_err(format!("Collection error: {}", e)))?;
        Ok(WasmCollection { inner: coll })
    }

    pub fn list_collection_names(&self) -> Result<Vec<JsValue>, JsValue> {
        let names = self
            .inner
            .list_collection_names()
            .map_err(|e| js_err(format!("list_collection_names error: {}", e)))?;
        Ok(names.into_iter().map(|n| JsValue::from_str(&n)).collect())
    }

    pub fn drop_collection(&self, name: String) -> Result<(), JsValue> {
        self.inner
            .drop_collection(&name)
            .map_err(|e| js_err(format!("drop_collection error: {}", e)))
    }

    pub fn stats(&self) -> Result<Vec<u8>, JsValue> {
        let s = self
            .inner
            .stats()
            .map_err(|e| js_err(format!("stats error: {}", e)))?;
        let result_doc = doc! {
            "collectionCount": s.collection_count as i64,
            "sizeBytes": s.size_bytes as i64
        };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }
}

// ---------------------------------------------------------------------------
// WasmCollection (in-memory)
// ---------------------------------------------------------------------------

/// WASM-compatible collection handle (in-memory backend).
///
/// All document methods accept and return raw BSON bytes.
#[wasm_bindgen]
pub struct WasmCollection {
    inner: Collection<MemSession>,
}

#[wasm_bindgen]
impl WasmCollection {
    pub fn insert_one(&self, doc_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let document =
            from_slice(&doc_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let result = self
            .inner
            .insert_one(document)
            .map_err(|e| js_err(format!("Insert error: {}", e)))?;
        let result_doc = doc! { "insertedId": result.inserted_id };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn insert_many(&self, docs_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let wrapper: Document =
            from_slice(&docs_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let docs_bson = wrapper
            .get_array("documents")
            .map_err(|e| js_err(format!("Missing 'documents' array: {}", e)))?;
        let mut documents: Vec<Document> = Vec::with_capacity(docs_bson.len());
        for (i, b) in docs_bson.iter().enumerate() {
            match b {
                Bson::Document(d) => documents.push(d.clone()),
                other => {
                    return Err(js_err(format!(
                        "documents[{}] is not a document (got {:?})",
                        i,
                        other.element_type()
                    )))
                }
            }
        }
        let result = self
            .inner
            .insert_many(documents)
            .map_err(|e| js_err(format!("InsertMany error: {}", e)))?;
        let ids: Vec<Bson> = result.inserted_ids;
        let result_doc = doc! { "insertedIds": ids };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn find_one(&self, filter_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let filter =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let maybe_doc = self
            .inner
            .find_one(filter)
            .map_err(|e| js_err(format!("FindOne error: {}", e)))?;
        match maybe_doc {
            Some(d) => to_vec(&d).map_err(|e| js_err(format!("BSON serialize error: {}", e))),
            None => {
                let null_doc = doc! { "__null": true };
                to_vec(&null_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
            }
        }
    }

    pub fn find(&self, filter_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let filter =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let docs = self
            .inner
            .find(filter)
            .map_err(|e| js_err(format!("Find error: {}", e)))?;
        let result = doc! { "results": docs };
        to_vec(&result).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn find_with_options(
        &self,
        filter_bytes: Vec<u8>,
        options_bytes: Vec<u8>,
    ) -> Result<Vec<u8>, JsValue> {
        let filter =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let options = parse_find_options(&options_bytes)?;
        let docs = self
            .inner
            .find_with_options(filter, options)
            .map_err(|e| js_err(format!("Find error: {}", e)))?;
        let result = doc! { "results": docs };
        to_vec(&result).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn count_documents(&self, filter_bytes: Vec<u8>) -> Result<f64, JsValue> {
        let filter: Document =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let count = self
            .inner
            .count_documents(Some(filter))
            .map_err(|e| js_err(format!("Count error: {}", e)))?;
        Ok(count as f64)
    }

    pub fn update_one(
        &self,
        filter_bytes: Vec<u8>,
        update_bytes: Vec<u8>,
    ) -> Result<Vec<u8>, JsValue> {
        let filter = from_slice(&filter_bytes)
            .map_err(|e| js_err(format!("BSON parse error (filter): {}", e)))?;
        let update = from_slice(&update_bytes)
            .map_err(|e| js_err(format!("BSON parse error (update): {}", e)))?;
        let result = self
            .inner
            .update_one(filter, update)
            .map_err(|e| js_err(format!("Update error: {}", e)))?;
        let result_doc = doc! {
            "matchedCount": result.matched_count as i64,
            "modifiedCount": result.modified_count as i64
        };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn update_many(
        &self,
        filter_bytes: Vec<u8>,
        update_bytes: Vec<u8>,
    ) -> Result<Vec<u8>, JsValue> {
        let filter = from_slice(&filter_bytes)
            .map_err(|e| js_err(format!("BSON parse error (filter): {}", e)))?;
        let update = from_slice(&update_bytes)
            .map_err(|e| js_err(format!("BSON parse error (update): {}", e)))?;
        let result = self
            .inner
            .update_many(filter, update)
            .map_err(|e| js_err(format!("Update error: {}", e)))?;
        let result_doc = doc! {
            "matchedCount": result.matched_count as i64,
            "modifiedCount": result.modified_count as i64
        };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn delete_one(&self, filter_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let filter =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let result = self
            .inner
            .delete_one(filter)
            .map_err(|e| js_err(format!("Delete error: {}", e)))?;
        let result_doc = doc! { "deletedCount": result.deleted_count as i64 };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn delete_many(&self, filter_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let filter =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let result = self
            .inner
            .delete_many(filter)
            .map_err(|e| js_err(format!("Delete error: {}", e)))?;
        let result_doc = doc! { "deletedCount": result.deleted_count as i64 };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn aggregate(&self, pipeline_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let wrapper: Document =
            from_slice(&pipeline_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let stages_bson = wrapper
            .get_array("pipeline")
            .map_err(|e| js_err(format!("Missing 'pipeline' array: {}", e)))?;
        let pipeline: Vec<Document> = stages_bson
            .iter()
            .filter_map(|b| {
                if let Bson::Document(d) = b {
                    Some(d.clone())
                } else {
                    None
                }
            })
            .collect();
        let docs = self
            .inner
            .aggregate(pipeline)
            .map_err(|e| js_err(format!("Aggregate error: {}", e)))?;
        let result = doc! { "results": docs };
        to_vec(&result).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn create_index(
        &self,
        keys_bytes: Vec<u8>,
        options_bytes: Vec<u8>,
    ) -> Result<String, JsValue> {
        let keys: Document = from_slice(&keys_bytes)
            .map_err(|e| js_err(format!("BSON parse error (keys): {}", e)))?;
        let options = if options_bytes.is_empty() {
            None
        } else {
            Some(parse_index_options(&options_bytes)?)
        };
        self.inner
            .create_index(keys, options)
            .map_err(|e| js_err(format!("CreateIndex error: {}", e)))
    }

    pub fn drop_index(&self, index_name: String) -> Result<(), JsValue> {
        self.inner
            .drop_index(&index_name)
            .map_err(|e| js_err(format!("DropIndex error: {}", e)))
    }

    pub fn list_indexes(&self) -> Result<Vec<u8>, JsValue> {
        let indexes = self
            .inner
            .list_indexes()
            .map_err(|e| js_err(format!("ListIndexes error: {}", e)))?;
        let idx_docs: Vec<Bson> = indexes
            .into_iter()
            .map(|spec| {
                Bson::Document(doc! {
                    "name": spec.name,
                    "keys": spec.keys,
                    "unique": spec.options.unique,
                    "sparse": spec.options.sparse,
                })
            })
            .collect();
        let result = doc! { "indexes": idx_docs };
        to_vec(&result).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }
}

// ---------------------------------------------------------------------------
// WasmOpfsDatabase (persistent OPFS)
// ---------------------------------------------------------------------------

#[wasm_bindgen]
pub struct WasmOpfsDatabase {
    inner: Database<OpfsBackend>,
}

#[wasm_bindgen]
impl WasmOpfsDatabase {
    #[wasm_bindgen(constructor)]
    pub fn new(name: String, handles: JsValue) -> Result<WasmOpfsDatabase, JsValue> {
        let js_map = handles
            .dyn_into::<Map>()
            .map_err(|_| JsValue::from_str("handles must be a Map"))?;

        let mut map = BTreeMap::new();
        let iter = js_map.entries();

        loop {
            let next =
                Iterator::next(&iter).map_err(|e| js_err(format!("Iterator error: {:?}", e)))?;

            if next.done() {
                break;
            }

            let entry = next.value();
            let arr: js_sys::Array = entry.into();
            let key = arr
                .get(0)
                .as_string()
                .ok_or_else(|| JsValue::from_str("key must be string"))?;
            let handle = arr
                .get(1)
                .dyn_into::<FileSystemSyncAccessHandle>()
                .map_err(|_| JsValue::from_str("value must be FileSystemSyncAccessHandle"))?;

            map.insert(key, handle);
        }

        let backend = OpfsBackend::from_handles(map);
        let db = Database::from_backend(backend, &name, None);
        Ok(WasmOpfsDatabase { inner: db })
    }

    pub fn collection(&self, name: String) -> Result<WasmOpfsCollection, JsValue> {
        let coll = self
            .inner
            .collection(&name)
            .map_err(|e| js_err(format!("Collection error: {}", e)))?;
        Ok(WasmOpfsCollection { inner: coll })
    }

    pub fn list_collection_names(&self) -> Result<Vec<JsValue>, JsValue> {
        let names = self
            .inner
            .list_collection_names()
            .map_err(|e| js_err(format!("list_collection_names error: {}", e)))?;
        Ok(names.into_iter().map(|n| JsValue::from_str(&n)).collect())
    }

    pub fn drop_collection(&self, name: String) -> Result<(), JsValue> {
        self.inner
            .drop_collection(&name)
            .map_err(|e| js_err(format!("drop_collection error: {}", e)))
    }

    pub fn stats(&self) -> Result<Vec<u8>, JsValue> {
        let s = self
            .inner
            .stats()
            .map_err(|e| js_err(format!("stats error: {}", e)))?;
        let result_doc = doc! {
            "collectionCount": s.collection_count as i64,
            "sizeBytes": s.size_bytes as i64
        };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }
}

// ---------------------------------------------------------------------------
// WasmOpfsCollection (persistent OPFS)
// ---------------------------------------------------------------------------

#[wasm_bindgen]
pub struct WasmOpfsCollection {
    inner: Collection<OpfsSession>,
}

#[wasm_bindgen]
impl WasmOpfsCollection {
    pub fn insert_one(&self, doc_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let document =
            from_slice(&doc_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let result = self
            .inner
            .insert_one(document)
            .map_err(|e| js_err(format!("Insert error: {}", e)))?;
        let result_doc = doc! { "insertedId": result.inserted_id };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn insert_many(&self, docs_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let wrapper: Document =
            from_slice(&docs_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let docs_bson = wrapper
            .get_array("documents")
            .map_err(|e| js_err(format!("Missing 'documents' array: {}", e)))?;
        let mut documents: Vec<Document> = Vec::with_capacity(docs_bson.len());
        for (i, b) in docs_bson.iter().enumerate() {
            match b {
                Bson::Document(d) => documents.push(d.clone()),
                other => {
                    return Err(js_err(format!(
                        "documents[{}] is not a document (got {:?})",
                        i,
                        other.element_type()
                    )))
                }
            }
        }
        let result = self
            .inner
            .insert_many(documents)
            .map_err(|e| js_err(format!("InsertMany error: {}", e)))?;
        let ids: Vec<Bson> = result.inserted_ids;
        let result_doc = doc! { "insertedIds": ids };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn find_one(&self, filter_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let filter =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let maybe_doc = self
            .inner
            .find_one(filter)
            .map_err(|e| js_err(format!("FindOne error: {}", e)))?;
        match maybe_doc {
            Some(d) => to_vec(&d).map_err(|e| js_err(format!("BSON serialize error: {}", e))),
            None => {
                let null_doc = doc! { "__null": true };
                to_vec(&null_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
            }
        }
    }

    pub fn find(&self, filter_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let filter =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let docs = self
            .inner
            .find(filter)
            .map_err(|e| js_err(format!("Find error: {}", e)))?;
        let result = doc! { "results": docs };
        to_vec(&result).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn find_with_options(
        &self,
        filter_bytes: Vec<u8>,
        options_bytes: Vec<u8>,
    ) -> Result<Vec<u8>, JsValue> {
        let filter =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let options = parse_find_options(&options_bytes)?;
        let docs = self
            .inner
            .find_with_options(filter, options)
            .map_err(|e| js_err(format!("Find error: {}", e)))?;
        let result = doc! { "results": docs };
        to_vec(&result).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn count_documents(&self, filter_bytes: Vec<u8>) -> Result<f64, JsValue> {
        let filter: Document =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let count = self
            .inner
            .count_documents(Some(filter))
            .map_err(|e| js_err(format!("Count error: {}", e)))?;
        Ok(count as f64)
    }

    pub fn update_one(
        &self,
        filter_bytes: Vec<u8>,
        update_bytes: Vec<u8>,
    ) -> Result<Vec<u8>, JsValue> {
        let filter = from_slice(&filter_bytes)
            .map_err(|e| js_err(format!("BSON parse error (filter): {}", e)))?;
        let update = from_slice(&update_bytes)
            .map_err(|e| js_err(format!("BSON parse error (update): {}", e)))?;
        let result = self
            .inner
            .update_one(filter, update)
            .map_err(|e| js_err(format!("Update error: {}", e)))?;
        let result_doc = doc! {
            "matchedCount": result.matched_count as i64,
            "modifiedCount": result.modified_count as i64
        };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn update_many(
        &self,
        filter_bytes: Vec<u8>,
        update_bytes: Vec<u8>,
    ) -> Result<Vec<u8>, JsValue> {
        let filter = from_slice(&filter_bytes)
            .map_err(|e| js_err(format!("BSON parse error (filter): {}", e)))?;
        let update = from_slice(&update_bytes)
            .map_err(|e| js_err(format!("BSON parse error (update): {}", e)))?;
        let result = self
            .inner
            .update_many(filter, update)
            .map_err(|e| js_err(format!("Update error: {}", e)))?;
        let result_doc = doc! {
            "matchedCount": result.matched_count as i64,
            "modifiedCount": result.modified_count as i64
        };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn delete_one(&self, filter_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let filter =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let result = self
            .inner
            .delete_one(filter)
            .map_err(|e| js_err(format!("Delete error: {}", e)))?;
        let result_doc = doc! { "deletedCount": result.deleted_count as i64 };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn delete_many(&self, filter_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let filter =
            from_slice(&filter_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let result = self
            .inner
            .delete_many(filter)
            .map_err(|e| js_err(format!("Delete error: {}", e)))?;
        let result_doc = doc! { "deletedCount": result.deleted_count as i64 };
        to_vec(&result_doc).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn aggregate(&self, pipeline_bytes: Vec<u8>) -> Result<Vec<u8>, JsValue> {
        let wrapper: Document =
            from_slice(&pipeline_bytes).map_err(|e| js_err(format!("BSON parse error: {}", e)))?;
        let stages_bson = wrapper
            .get_array("pipeline")
            .map_err(|e| js_err(format!("Missing 'pipeline' array: {}", e)))?;
        let pipeline: Vec<Document> = stages_bson
            .iter()
            .filter_map(|b| {
                if let Bson::Document(d) = b {
                    Some(d.clone())
                } else {
                    None
                }
            })
            .collect();
        let docs = self
            .inner
            .aggregate(pipeline)
            .map_err(|e| js_err(format!("Aggregate error: {}", e)))?;
        let result = doc! { "results": docs };
        to_vec(&result).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }

    pub fn create_index(
        &self,
        keys_bytes: Vec<u8>,
        options_bytes: Vec<u8>,
    ) -> Result<String, JsValue> {
        let keys: Document = from_slice(&keys_bytes)
            .map_err(|e| js_err(format!("BSON parse error (keys): {}", e)))?;
        let options = if options_bytes.is_empty() {
            None
        } else {
            Some(parse_index_options(&options_bytes)?)
        };
        self.inner
            .create_index(keys, options)
            .map_err(|e| js_err(format!("CreateIndex error: {}", e)))
    }

    pub fn drop_index(&self, index_name: String) -> Result<(), JsValue> {
        self.inner
            .drop_index(&index_name)
            .map_err(|e| js_err(format!("DropIndex error: {}", e)))
    }

    pub fn list_indexes(&self) -> Result<Vec<u8>, JsValue> {
        let indexes = self
            .inner
            .list_indexes()
            .map_err(|e| js_err(format!("ListIndexes error: {}", e)))?;
        let idx_docs: Vec<Bson> = indexes
            .into_iter()
            .map(|spec| {
                Bson::Document(doc! {
                    "name": spec.name,
                    "keys": spec.keys,
                    "unique": spec.options.unique,
                    "sparse": spec.options.sparse,
                })
            })
            .collect();
        let result = doc! { "indexes": idx_docs };
        to_vec(&result).map_err(|e| js_err(format!("BSON serialize error: {}", e)))
    }
}
