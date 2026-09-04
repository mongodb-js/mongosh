use bson::Document;

use super::{
    deserialize_document, ensure_id, extract_id_string, serialize_document, Collection,
    CollectionError, CollectionResult, DeleteResult, InsertOneResult, UpdateResult,
};
use crate::index::{extract_index_key_with_collation, resolve_index_type, IndexSpec, IndexType};
use crate::query::eval_query;
use crate::storage::{DefaultSession, StorageCursor, StorageResult, StorageSession};
use crate::update::apply_update;

/// A collection handle that borrows a shared [`StorageSession`] from a
/// [`TransactionSession`](crate::database::TransactionSession).
///
/// Provides the same core CRUD surface as [`Collection`], but multiple
/// `CollectionView`s can share one session for atomic multi-collection writes.
pub struct CollectionView<'a, S: StorageSession = DefaultSession> {
    session: &'a S,
    table_name: String,
    collection_name: String,
}

impl<'a, S: StorageSession> CollectionView<'a, S> {
    /// Create a view backed by the given session.
    pub fn new(session: &'a S, name: &str, table_uri: &str) -> CollectionResult<Self> {
        session.create_table(table_uri)?;
        Ok(CollectionView {
            session,
            table_name: table_uri.to_string(),
            collection_name: name.to_string(),
        })
    }

    fn cursor(&self) -> StorageResult<S::Cursor> {
        self.session.open_cursor(&self.table_name)
    }

    fn list_indexes(&self) -> CollectionResult<Vec<IndexSpec>> {
        let meta_table = format!("{}.indexes_metadata", self.collection_name);
        let mut meta_cursor = match self.session.open_cursor(&meta_table) {
            Ok(c) => c,
            Err(_) => return Ok(vec![]),
        };
        let mut indexes = Vec::new();
        while meta_cursor.next().is_ok() {
            let bytes = meta_cursor.get_value_raw()?;
            let spec: IndexSpec = bson::from_slice(&bytes)
                .map_err(|e| CollectionError::Other(format!("index spec: {}", e)))?;
            indexes.push(spec);
        }
        Ok(indexes)
    }

    fn insert_into_indexes(&self, doc: &Document) -> CollectionResult<()> {
        let indexes = self.list_indexes()?;
        let id_str = extract_id_string(doc)?;
        for spec in indexes {
            if resolve_index_type(&spec.keys, &spec.options) == IndexType::BTree {
                let idx_table = format!("{}.idx_{}", self.collection_name, spec.name);
                let mut idx_cursor = self.session.open_cursor(&idx_table)?;
                let collation = spec
                    .options
                    .collation
                    .as_ref()
                    .map(crate::collation::Collation::from_doc);
                let key_bytes =
                    extract_index_key_with_collation(doc, &spec.keys, collation.as_ref());
                if spec.options.unique
                    && Collection::<S>::index_has_prefix(&mut idx_cursor, &key_bytes)?
                {
                    let fields: Vec<&str> = spec.keys.keys().map(|s| s.as_str()).collect();
                    return Err(CollectionError::UniqueConstraintViolation(format!(
                        "Duplicate key for index '{}' on fields: {}",
                        spec.name,
                        fields.join(", ")
                    )));
                }
                let mut combined = key_bytes;
                combined.extend_from_slice(id_str.as_bytes());
                idx_cursor.set_key_raw(&combined);
                idx_cursor.set_value_str(&id_str);
                idx_cursor.insert()?;
            }
        }
        Ok(())
    }

    fn remove_from_indexes(&self, doc: &Document) -> CollectionResult<()> {
        let indexes = self.list_indexes()?;
        let id_str = extract_id_string(doc)?;
        for spec in indexes {
            if resolve_index_type(&spec.keys, &spec.options) == IndexType::BTree {
                let idx_table = format!("{}.idx_{}", self.collection_name, spec.name);
                let mut idx_cursor = self.session.open_cursor(&idx_table)?;
                let collation = spec
                    .options
                    .collation
                    .as_ref()
                    .map(crate::collation::Collation::from_doc);
                let key_bytes =
                    extract_index_key_with_collation(doc, &spec.keys, collation.as_ref());
                let mut combined = key_bytes;
                combined.extend_from_slice(id_str.as_bytes());
                idx_cursor.set_key_raw(&combined);
                if idx_cursor.search().is_ok() {
                    idx_cursor.remove()?;
                }
            }
        }
        Ok(())
    }

    pub fn insert_one(&self, mut document: Document) -> CollectionResult<InsertOneResult> {
        let inserted_id = ensure_id(&mut document);
        self.insert_into_indexes(&document)?;
        let doc_bytes = serialize_document(&document)?;
        let key_str = extract_id_string(&document)?;
        let mut cursor = self.cursor()?;
        cursor.set_key_str(&key_str);
        cursor.set_value_raw(&doc_bytes);
        cursor.insert()?;
        Ok(InsertOneResult { inserted_id })
    }

    pub fn find_one(&self, filter: Document) -> CollectionResult<Option<Document>> {
        let mut cursor = self.cursor()?;
        while cursor.next().is_ok() {
            let doc_bytes = cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;
            if eval_query(&doc, &filter).map_err(CollectionError::QueryError)? {
                return Ok(Some(doc));
            }
        }
        Ok(None)
    }

    pub fn find(&self, filter: Document) -> CollectionResult<Vec<Document>> {
        let mut results = Vec::new();
        let mut cursor = self.cursor()?;
        while cursor.next().is_ok() {
            let doc_bytes = cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;
            if eval_query(&doc, &filter).map_err(CollectionError::QueryError)? {
                results.push(doc);
            }
        }
        Ok(results)
    }

    pub fn update_one(&self, filter: Document, update: Document) -> CollectionResult<UpdateResult> {
        let mut cursor = self.cursor()?;
        if cursor.next().is_ok() {
            loop {
                let doc_bytes = cursor.get_value_raw()?;
                let mut doc = deserialize_document(&doc_bytes)?;
                if eval_query(&doc, &filter).map_err(CollectionError::QueryError)? {
                    let original = doc.clone();
                    apply_update(&mut doc, &update).map_err(CollectionError::UpdateError)?;
                    if doc != original {
                        self.remove_from_indexes(&original)?;
                        self.insert_into_indexes(&doc)?;
                        let updated_bytes = serialize_document(&doc)?;
                        cursor.set_value_raw(&updated_bytes);
                        cursor.update()?;
                        return Ok(UpdateResult {
                            matched_count: 1,
                            modified_count: 1,
                            upserted_id: None,
                        });
                    }
                    return Ok(UpdateResult {
                        matched_count: 1,
                        modified_count: 0,
                        upserted_id: None,
                    });
                }
                if cursor.next().is_err() {
                    break;
                }
            }
        }
        Ok(UpdateResult {
            matched_count: 0,
            modified_count: 0,
            upserted_id: None,
        })
    }

    pub fn update_many(
        &self,
        filter: Document,
        update: Document,
    ) -> CollectionResult<UpdateResult> {
        let mut cursor = self.cursor()?;
        let mut matched = 0u64;
        let mut modified = 0u64;
        if cursor.next().is_ok() {
            loop {
                let doc_bytes = cursor.get_value_raw()?;
                let mut doc = deserialize_document(&doc_bytes)?;
                if eval_query(&doc, &filter).map_err(CollectionError::QueryError)? {
                    matched += 1;
                    let original = doc.clone();
                    apply_update(&mut doc, &update).map_err(CollectionError::UpdateError)?;
                    if doc != original {
                        modified += 1;
                        self.remove_from_indexes(&original)?;
                        self.insert_into_indexes(&doc)?;
                        let updated_bytes = serialize_document(&doc)?;
                        cursor.set_value_raw(&updated_bytes);
                        cursor.update()?;
                    }
                }
                if cursor.next().is_err() {
                    break;
                }
            }
        }
        Ok(UpdateResult {
            matched_count: matched,
            modified_count: modified,
            upserted_id: None,
        })
    }

    pub fn delete_one(&self, filter: Document) -> CollectionResult<DeleteResult> {
        let mut cursor = self.cursor()?;
        while cursor.next().is_ok() {
            let doc_bytes = cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;
            if eval_query(&doc, &filter).map_err(CollectionError::QueryError)? {
                self.remove_from_indexes(&doc)?;
                cursor.remove()?;
                return Ok(DeleteResult { deleted_count: 1 });
            }
        }
        Ok(DeleteResult { deleted_count: 0 })
    }

    pub fn delete_many(&self, filter: Document) -> CollectionResult<DeleteResult> {
        let mut cursor = self.cursor()?;
        let mut deleted = 0u64;
        while cursor.next().is_ok() {
            let doc_bytes = cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;
            if eval_query(&doc, &filter).map_err(CollectionError::QueryError)? {
                self.remove_from_indexes(&doc)?;
                cursor.remove()?;
                deleted += 1;
            }
        }
        Ok(DeleteResult {
            deleted_count: deleted,
        })
    }

    pub fn count_documents(&self, filter: Option<Document>) -> CollectionResult<u64> {
        let filter = filter.unwrap_or_default();
        let mut count = 0;
        let mut cursor = self.cursor()?;
        while cursor.next().is_ok() {
            let doc_bytes = cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;
            if eval_query(&doc, &filter).map_err(CollectionError::QueryError)? {
                count += 1;
            }
        }
        Ok(count)
    }

    /// Run an aggregation pipeline over the view's snapshot.
    ///
    /// Loads all documents from the underlying table, then pipes them through
    /// the engine's in-memory aggregation framework.
    pub fn aggregate(&self, pipeline: Vec<Document>) -> CollectionResult<Vec<Document>> {
        let mut docs = Vec::new();
        let mut cursor = self.cursor()?;
        while cursor.next().is_ok() {
            let doc_bytes = cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;
            docs.push(doc);
        }
        crate::aggregation::aggregate(docs, &pipeline)
            .map_err(|e| CollectionError::Other(e.to_string()))
    }
}
