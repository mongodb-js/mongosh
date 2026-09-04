use bson::{oid::ObjectId, Bson, Document};
use std::marker::PhantomData;

use super::cursor::{FindCursor, FindCursorState, OwnedFindIter};
use super::{
    build_seek_prefix, deserialize_document, ensure_id, extract_equality_fields, extract_id_string,
    serialize_document, Collection, CollectionError, CollectionResult, DeleteOptions, DeleteResult,
    FindOptions, InsertManyResult, InsertOneResult, InsertOptions, UpdateOptions, UpdateResult,
};
use crate::planner::{plan_query, ExecutionPlan};
use crate::query::eval_query;
use crate::storage::{StorageCursor, StorageSession};
use crate::update::apply_update;

impl<S: StorageSession> Collection<S> {
    /// Insert a single document into the collection
    ///
    /// If the document does not have an `_id` field, one will be generated.
    ///
    /// # Arguments
    ///
    /// * `document` - The document to insert
    ///
    /// # Returns
    ///
    /// `InsertOneResult` containing the inserted document's `_id`
    pub fn insert_one(&self, document: Document) -> CollectionResult<InsertOneResult> {
        self.insert_one_with_options(document, InsertOptions::default())
    }

    pub fn insert_one_with_options(
        &self,
        document: Document,
        opts: InsertOptions,
    ) -> CollectionResult<InsertOneResult> {
        self.with_batched_write(|col| col.insert_one_inner(document, opts.internal))
    }

    pub(super) fn insert_one_inner(
        &self,
        mut document: Document,
        internal: bool,
    ) -> CollectionResult<InsertOneResult> {
        let inserted_id = ensure_id(&mut document);

        self.validate_doc(&document)?;

        self.insert_into_indexes(&document)?;

        let doc_bytes = serialize_document(&document)?;

        let key_str = extract_id_string(&document)?;

        let mut cursor = self.cursor()?;
        cursor.set_key_str(&key_str);
        cursor.set_value_raw(&doc_bytes);
        cursor.insert()?;

        self.append_oplog_if_enabled(
            "insert",
            inserted_id.clone(),
            Some(document),
            internal,
            None,
        )?;

        Ok(InsertOneResult { inserted_id })
    }

    /// Insert multiple documents into the collection
    ///
    /// If any document does not have an `_id` field, one will be generated.
    ///
    /// # Arguments
    ///
    /// * `documents` - The documents to insert
    ///
    /// # Returns
    ///
    /// `InsertManyResult` containing the inserted documents' `_id`s
    pub fn insert_many(&self, documents: Vec<Document>) -> CollectionResult<InsertManyResult> {
        self.insert_many_with_options(documents, InsertOptions::default())
    }

    pub fn insert_many_with_options(
        &self,
        mut documents: Vec<Document>,
        opts: InsertOptions,
    ) -> CollectionResult<InsertManyResult> {
        let mut inserted_ids = Vec::with_capacity(documents.len());

        for doc in &mut documents {
            let id = ensure_id(doc);
            self.validate_doc(doc)?;
            inserted_ids.push(id);
        }

        self.with_batched_write(|col| {
            for doc in &documents {
                col.insert_into_indexes(doc)?;
                let doc_bytes = serialize_document(doc)?;
                let key_str = extract_id_string(doc)?;
                let mut cursor = col.cursor()?;
                cursor.set_key_str(&key_str);
                cursor.set_value_raw(&doc_bytes);
                cursor.insert()?;

                let id = doc.get("_id").cloned().unwrap_or(Bson::Null);
                col.append_oplog_if_enabled("insert", id, Some(doc.clone()), opts.internal, None)?;
            }
            Ok(InsertManyResult {
                inserted_ids: inserted_ids.clone(),
            })
        })
    }

    /// Find the first document matching the filter
    ///
    /// # Arguments
    ///
    /// * `filter` - Query filter (empty document matches all)
    ///
    /// # Returns
    ///
    /// The first matching document, or `None` if no match found
    pub fn find_one(&self, filter: Document) -> CollectionResult<Option<Document>> {
        let indexes = self.list_indexes()?;
        let plan = plan_query(&filter, &indexes);

        match &plan.execution_plan {
            ExecutionPlan::IndexSeek {
                index_name,
                index_keys,
                seek_values,
            } => self.find_one_with_index_seek(&filter, index_name, index_keys, seek_values),
            ExecutionPlan::IndexScan {
                index_name,
                index_keys,
            } => self.find_one_with_index_scan(&filter, index_name, index_keys),
            ExecutionPlan::CollectionScan => self.find_one_with_collection_scan(&filter),
            _ => Ok(self
                .execute_plan(&plan.execution_plan, &filter)?
                .into_iter()
                .next()),
        }
    }

    /// Return a streaming iterator over all documents matching the filter.
    ///
    /// Unlike [`find`], this does **not** materialize the full result set.
    /// Documents are deserialized and filtered lazily as the iterator is
    /// advanced, using the query planner to choose the best access strategy
    /// (collection scan, index scan, or index seek).
    pub fn find_iter(&self, filter: Document) -> CollectionResult<FindCursor<'_, S::Cursor>> {
        let indexes = self.list_indexes()?;
        let plan = plan_query(&filter, &indexes);

        let state = match &plan.execution_plan {
            ExecutionPlan::IndexSeek {
                index_name,
                index_keys,
                seek_values,
            } => {
                let index_table = format!("{}.idx_{}", self.collection_name, index_name);
                let index_cursor = self.session.open_cursor(&index_table)?;
                let data_cursor = self.cursor()?;
                let seek_key = build_seek_prefix(index_keys, seek_values);
                FindCursorState::IndexSeek {
                    index_cursor,
                    data_cursor,
                    seek_key,
                    positioned: false,
                }
            }
            ExecutionPlan::IndexScan {
                index_name,
                index_keys: _,
            } => {
                let index_table = format!("{}.idx_{}", self.collection_name, index_name);
                let index_cursor = self.session.open_cursor(&index_table)?;
                let data_cursor = self.cursor()?;
                FindCursorState::IndexScan {
                    index_cursor,
                    data_cursor,
                }
            }
            ExecutionPlan::CollectionScan => {
                let cursor = self.cursor()?;
                FindCursorState::CollectionScan { cursor }
            }
            _ => {
                let docs = self.execute_plan(&plan.execution_plan, &filter)?;
                FindCursorState::Materialized { docs, next_ix: 0 }
            }
        };

        Ok(FindCursor {
            state,
            filter,
            _lifetime: PhantomData,
        })
    }

    /// Find all documents matching the query filter
    ///
    /// # Arguments
    ///
    /// * `filter` - Query filter (empty document matches all)
    ///
    /// # Returns
    ///
    /// Vector of all matching documents
    pub fn find(&self, filter: Document) -> CollectionResult<Vec<Document>> {
        self.find_iter(filter)?.collect()
    }

    /// Consume this collection and return a lazy, owned iterator over matches.
    ///
    /// This is the primary entry point for FFI consumers (PyO3, napi) that
    /// need a `'static` iterator without materializing the full result set.
    /// The returned [`OwnedFindIter`] keeps the `Collection` (and its
    /// storage session) alive for the duration of iteration.
    ///
    /// No `unsafe` code is used -- `OwnedFindIter` holds the cursor state
    /// and the `Collection` side-by-side as plain owned fields.
    pub fn find_into_iter(self, filter: Document) -> CollectionResult<OwnedFindIter<S>> {
        let indexes = self.list_indexes()?;
        let plan = plan_query(&filter, &indexes);

        let state = match &plan.execution_plan {
            ExecutionPlan::IndexSeek {
                index_name,
                index_keys,
                seek_values,
            } => {
                let index_table = format!("{}.idx_{}", self.collection_name, index_name);
                let index_cursor = self.session.open_cursor(&index_table)?;
                let data_cursor = self.cursor()?;
                let seek_key = build_seek_prefix(index_keys, seek_values);
                FindCursorState::IndexSeek {
                    index_cursor,
                    data_cursor,
                    seek_key,
                    positioned: false,
                }
            }
            ExecutionPlan::IndexScan {
                index_name,
                index_keys: _,
            } => {
                let index_table = format!("{}.idx_{}", self.collection_name, index_name);
                let index_cursor = self.session.open_cursor(&index_table)?;
                let data_cursor = self.cursor()?;
                FindCursorState::IndexScan {
                    index_cursor,
                    data_cursor,
                }
            }
            ExecutionPlan::CollectionScan => {
                let cursor = self.cursor()?;
                FindCursorState::CollectionScan { cursor }
            }
            _ => {
                let docs = self.execute_plan(&plan.execution_plan, &filter)?;
                FindCursorState::Materialized { docs, next_ix: 0 }
            }
        };

        Ok(OwnedFindIter {
            _collection: self,
            state,
            filter,
        })
    }

    /// Find all documents matching the filter, with sort/skip/limit/projection.
    ///
    /// Uses [`plan_query_full`] so that covering indexes, sorted index scans,
    /// and other combined optimizations can fire when the caller provides
    /// projection, sort, and/or limit.
    pub fn find_with_options(
        &self,
        filter: Document,
        options: FindOptions,
    ) -> CollectionResult<Vec<Document>> {
        use crate::aggregation::stages;
        use crate::planner::plan_query_full;

        let indexes = self.list_indexes()?;
        let plan = plan_query_full(
            &filter,
            &indexes,
            options.projection.as_ref(),
            options.sort.as_ref(),
            options.limit,
        );

        let skip_post_sort = matches!(plan.execution_plan, ExecutionPlan::SortedIndexScan { .. });

        let mut docs = self.execute_plan(&plan.execution_plan, &filter)?;

        if !skip_post_sort {
            if let Some(ref sort_doc) = options.sort {
                docs = stages::stage_sort(docs, &Bson::Document(sort_doc.clone()))
                    .map_err(|e| CollectionError::Other(e.to_string()))?;
            }
        }

        if let Some(n) = options.skip {
            if n > 0 {
                docs = stages::stage_skip(docs, &Bson::Int64(n))
                    .map_err(|e| CollectionError::Other(e.to_string()))?;
            }
        }

        if !skip_post_sort {
            if let Some(n) = options.limit {
                if n > 0 {
                    docs = stages::stage_limit(docs, &Bson::Int64(n))
                        .map_err(|e| CollectionError::Other(e.to_string()))?;
                }
            }
        }

        if let Some(ref proj_doc) = options.projection {
            docs = stages::stage_project(docs, &Bson::Document(proj_doc.clone()))
                .map_err(|e| CollectionError::Other(e.to_string()))?;
        }

        Ok(docs)
    }

    /// Find one document with options (projection, sort to pick which "first").
    pub fn find_one_with_options(
        &self,
        filter: Document,
        options: FindOptions,
    ) -> CollectionResult<Option<Document>> {
        let find_opts = FindOptions {
            limit: Some(1),
            ..options
        };
        let mut docs = self.find_with_options(filter, find_opts)?;
        Ok(if docs.is_empty() {
            None
        } else {
            Some(docs.swap_remove(0))
        })
    }

    /// Update a single document matching the query filter
    ///
    /// # Arguments
    ///
    /// * `filter` - Query filter to match documents
    /// * `update` - Update operations to apply
    ///
    /// # Returns
    ///
    /// `UpdateResult` with matched and modified counts
    pub fn update_one(&self, filter: Document, update: Document) -> CollectionResult<UpdateResult> {
        self.update_one_with_options(filter, update, UpdateOptions::default())
    }

    /// Update one document with options (e.g. upsert).
    pub fn update_one_with_options(
        &self,
        filter: Document,
        update: Document,
        options: UpdateOptions,
    ) -> CollectionResult<UpdateResult> {
        self.with_batched_write(|col| col.update_one_inner(filter, update, options))
    }

    fn update_one_inner(
        &self,
        filter: Document,
        update: Document,
        options: UpdateOptions,
    ) -> CollectionResult<UpdateResult> {
        let mut cursor = self.cursor()?;
        let mut matched_count = 0;
        let mut modified_count = 0;

        let mut found = false;
        if cursor.next().is_ok() {
            loop {
                let doc_bytes = cursor.get_value_raw()?;
                let mut doc = deserialize_document(&doc_bytes)?;

                let matches = eval_query(&doc, &filter).map_err(CollectionError::QueryError)?;

                if matches {
                    found = true;
                    matched_count += 1;

                    let original_doc = doc.clone();

                    apply_update(&mut doc, &update).map_err(CollectionError::UpdateError)?;

                    if doc != original_doc {
                        modified_count += 1;
                        self.update_in_indexes(&original_doc, &doc)?;
                        let updated_bytes = serialize_document(&doc)?;
                        cursor.set_value_raw(&updated_bytes);
                        cursor.update()?;

                        let id = doc
                            .get("_id")
                            .cloned()
                            .ok_or(CollectionError::MissingIdError)?;
                        let changed = Some(Self::doc_top_level_changed(&original_doc, &doc));
                        self.append_oplog_if_enabled(
                            "update",
                            id,
                            Some(update.clone()),
                            options.internal,
                            changed,
                        )?;
                    }

                    break;
                }

                if cursor.next().is_err() {
                    break;
                }
            }
        }

        if !found && options.upsert {
            let mut new_doc = extract_equality_fields(&filter);
            if !new_doc.contains_key("_id") {
                new_doc.insert("_id", Bson::ObjectId(ObjectId::new()));
            }
            crate::update::apply_update_for_upsert(&mut new_doc, &update)
                .map_err(CollectionError::UpdateError)?;
            let upserted_id = new_doc.get("_id").cloned().unwrap_or(Bson::Null);
            self.insert_one_inner(new_doc, options.internal)?;
            return Ok(UpdateResult {
                matched_count: 0,
                modified_count: 0,
                upserted_id: Some(upserted_id),
            });
        }

        Ok(UpdateResult {
            matched_count,
            modified_count,
            upserted_id: None,
        })
    }

    /// Update all documents matching the query filter
    ///
    /// # Arguments
    ///
    /// * `filter` - Query filter to match documents
    /// * `update` - Update operations to apply
    ///
    /// # Returns
    ///
    /// `UpdateResult` with matched and modified counts
    pub fn update_many(
        &self,
        filter: Document,
        update: Document,
    ) -> CollectionResult<UpdateResult> {
        self.update_many_with_options(filter, update, UpdateOptions::default())
    }

    /// Update many documents with options (e.g. upsert).
    pub fn update_many_with_options(
        &self,
        filter: Document,
        update: Document,
        options: UpdateOptions,
    ) -> CollectionResult<UpdateResult> {
        self.with_batched_write(|col| col.update_many_inner(filter, update, options))
    }

    fn update_many_inner(
        &self,
        filter: Document,
        update: Document,
        options: UpdateOptions,
    ) -> CollectionResult<UpdateResult> {
        let mut cursor = self.cursor()?;
        let mut matched_count = 0;
        let mut modified_count = 0;

        if cursor.next().is_ok() {
            loop {
                let doc_bytes = cursor.get_value_raw()?;
                let mut doc = deserialize_document(&doc_bytes)?;

                let matches = eval_query(&doc, &filter).map_err(CollectionError::QueryError)?;

                if matches {
                    matched_count += 1;

                    let original_doc = doc.clone();

                    apply_update(&mut doc, &update).map_err(CollectionError::UpdateError)?;

                    if doc != original_doc {
                        modified_count += 1;
                        self.update_in_indexes(&original_doc, &doc)?;
                        let updated_bytes = serialize_document(&doc)?;
                        cursor.set_value_raw(&updated_bytes);
                        cursor.update()?;

                        let id = doc
                            .get("_id")
                            .cloned()
                            .ok_or(CollectionError::MissingIdError)?;
                        let changed = Some(Self::doc_top_level_changed(&original_doc, &doc));
                        self.append_oplog_if_enabled(
                            "update",
                            id,
                            Some(update.clone()),
                            options.internal,
                            changed,
                        )?;
                    }
                }

                if cursor.next().is_err() {
                    break;
                }
            }
        }

        if matched_count == 0 && options.upsert {
            let mut new_doc = extract_equality_fields(&filter);
            if !new_doc.contains_key("_id") {
                new_doc.insert("_id", Bson::ObjectId(ObjectId::new()));
            }
            crate::update::apply_update_for_upsert(&mut new_doc, &update)
                .map_err(CollectionError::UpdateError)?;
            let upserted_id = new_doc.get("_id").cloned().unwrap_or(Bson::Null);
            self.insert_one_inner(new_doc, options.internal)?;
            return Ok(UpdateResult {
                matched_count: 0,
                modified_count: 0,
                upserted_id: Some(upserted_id),
            });
        }

        Ok(UpdateResult {
            matched_count,
            modified_count,
            upserted_id: None,
        })
    }

    /// Delete a single document matching the query filter
    ///
    /// # Arguments
    ///
    /// * `filter` - Query filter to match documents
    ///
    /// # Returns
    ///
    /// `DeleteResult` with deleted count
    pub fn delete_one(&self, filter: Document) -> CollectionResult<DeleteResult> {
        self.delete_one_with_options(filter, DeleteOptions::default())
    }

    pub fn delete_one_with_options(
        &self,
        filter: Document,
        options: DeleteOptions,
    ) -> CollectionResult<DeleteResult> {
        self.with_batched_write(|col| col.delete_one_inner(filter, options))
    }

    fn delete_one_inner(
        &self,
        filter: Document,
        options: DeleteOptions,
    ) -> CollectionResult<DeleteResult> {
        let mut cursor = self.cursor()?;
        let mut deleted_count = 0;

        if cursor.next().is_err() {
            return Ok(DeleteResult { deleted_count });
        }

        loop {
            let doc_bytes = cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;
            let matches = eval_query(&doc, &filter).map_err(CollectionError::QueryError)?;

            if matches {
                let id = doc
                    .get("_id")
                    .cloned()
                    .ok_or(CollectionError::MissingIdError)?;
                self.remove_from_indexes(&doc)?;
                cursor.remove()?;
                deleted_count += 1;
                self.append_oplog_if_enabled("delete", id, None, options.internal, None)?;
                break;
            }

            if cursor.next().is_err() {
                break;
            }
        }

        Ok(DeleteResult { deleted_count })
    }

    /// Delete all documents matching the query filter
    ///
    /// # Arguments
    ///
    /// * `filter` - Query filter to match documents
    ///
    /// # Returns
    ///
    /// `DeleteResult` with deleted count
    pub fn delete_many(&self, filter: Document) -> CollectionResult<DeleteResult> {
        self.delete_many_with_options(filter, DeleteOptions::default())
    }

    pub fn delete_many_with_options(
        &self,
        filter: Document,
        options: DeleteOptions,
    ) -> CollectionResult<DeleteResult> {
        self.with_batched_write(|col| col.delete_many_inner(filter, options))
    }

    fn delete_many_inner(
        &self,
        filter: Document,
        options: DeleteOptions,
    ) -> CollectionResult<DeleteResult> {
        let mut cursor = self.cursor()?;
        let mut deleted_count = 0;

        if cursor.next().is_err() {
            return Ok(DeleteResult { deleted_count });
        }

        loop {
            let doc_bytes = cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;
            let matches = eval_query(&doc, &filter).map_err(CollectionError::QueryError)?;

            if matches {
                let id = doc
                    .get("_id")
                    .cloned()
                    .ok_or(CollectionError::MissingIdError)?;
                self.remove_from_indexes(&doc)?;
                cursor.remove()?;
                deleted_count += 1;
                self.append_oplog_if_enabled("delete", id, None, options.internal, None)?;
            }

            if cursor.next().is_err() {
                break;
            }
        }

        Ok(DeleteResult { deleted_count })
    }

    /// Count documents matching the query filter
    ///
    /// # Arguments
    ///
    /// * `filter` - Optional query filter (None or empty document matches all)
    ///
    /// # Returns
    ///
    /// Number of matching documents
    pub fn count_documents(&self, filter: Option<Document>) -> CollectionResult<u64> {
        let filter = filter.unwrap_or_default();
        let mut count = 0;
        let mut cursor = self.cursor()?;

        if cursor.next().is_err() {
            return Ok(0);
        }

        loop {
            let doc_bytes = cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;
            let matches = eval_query(&doc, &filter).map_err(CollectionError::QueryError)?;

            if matches {
                count += 1;
            }

            if cursor.next().is_err() {
                break;
            }
        }

        Ok(count)
    }
}
