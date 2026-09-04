use bson::{Bson, Document};

use super::{
    deserialize_document, extract_id_string, Collection, CollectionError, CollectionResult,
};
#[cfg(not(target_arch = "wasm32"))]
use crate::index::twodsphere_index_key;
use crate::index::{
    extract_index_key, extract_index_key_with_collation, generate_index_name, is_2dsphere_keys,
    validate_custom_index_name, IndexOptions, IndexSpec,
};
use crate::storage::{StorageCursor, StorageSession};

impl<S: StorageSession> Collection<S> {
    // ============================================================
    // INDEX OPERATIONS
    // ============================================================

    /// Create an index on the collection
    ///
    /// # Arguments
    ///
    /// * `keys` - Index key specification (e.g., `doc! { "email": 1 }` for ascending, -1 for descending)
    /// * `options` - Optional index options (unique, sparse, etc.)
    ///
    /// # Returns
    ///
    /// Index name
    ///
    /// # Example
    ///
    /// ```ignore
    /// // Single-field index
    /// collection.create_index(doc! { "email": 1 }, None)?;
    ///
    /// // Compound index
    /// collection.create_index(doc! { "age": 1, "name": -1 }, None)?;
    ///
    /// // Unique index
    /// collection.create_index(
    ///     doc! { "username": 1 },
    ///     Some(IndexOptions { unique: true, ..Default::default() })
    /// )?;
    /// ```
    pub fn create_index(
        &self,
        keys: Document,
        options: Option<IndexOptions>,
    ) -> CollectionResult<String> {
        if keys.is_empty() {
            return Err(CollectionError::InvalidIndexSpec(
                "Index keys cannot be empty".to_string(),
            ));
        }

        let mut opts = options.clone().unwrap_or_default();
        let index_name = match opts.name.take() {
            Some(n) => {
                let t = n.trim();
                if t.is_empty() {
                    generate_index_name(&keys)
                } else {
                    validate_custom_index_name(t).map_err(CollectionError::InvalidIndexSpec)?;
                    t.to_string()
                }
            }
            None => generate_index_name(&keys),
        };
        if is_2dsphere_keys(&keys) {
            #[cfg(target_arch = "wasm32")]
            {
                return Err(CollectionError::InvalidIndexSpec(
                    "2dsphere index is not supported on wasm32".to_string(),
                ));
            }
            #[cfg(not(target_arch = "wasm32"))]
            {
                if keys.len() != 1 {
                    return Err(CollectionError::InvalidIndexSpec(
                        "2dsphere index must be defined on exactly one field".to_string(),
                    ));
                }
                if opts.unique {
                    return Err(CollectionError::InvalidIndexSpec(
                        "unique 2dsphere indexes are not supported".to_string(),
                    ));
                }
            }
        }

        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);

        let existing = self.list_indexes()?;
        if let Some(spec) = existing.iter().find(|s| s.name == index_name) {
            if spec.keys == keys {
                return Ok(index_name);
            }
            return Err(CollectionError::IndexAlreadyExists(index_name));
        }

        self.session
            .begin_transaction()
            .map_err(CollectionError::from)?;

        let result = (|| -> CollectionResult<String> {
            self.session.create_table(&index_table_name)?;

            let metadata_table = format!("{}.indexes_metadata", self.collection_name);
            self.session.create_table(&metadata_table)?;

            let index_spec = IndexSpec {
                name: index_name.clone(),
                keys: keys.clone(),
                options: opts,
            };

            let spec_bytes = bson::to_vec(&index_spec).map_err(|e| {
                CollectionError::Other(format!("Failed to serialize index spec: {}", e))
            })?;

            let mut metadata_cursor = self.session.open_cursor(&metadata_table)?;
            metadata_cursor.set_key_str(&index_name);
            metadata_cursor.set_value_raw(&spec_bytes);
            metadata_cursor.insert()?;

            self.rebuild_index(&index_name, &keys, &index_spec.options)?;

            let payload = bson::to_document(&index_spec).ok();
            self.append_oplog_if_enabled(
                "index_create",
                Bson::String(index_name.clone()),
                payload,
                false,
                None,
            )?;

            Ok(index_name)
        })();

        self.invalidate_index_cache();
        match &result {
            Ok(_) => {
                self.session
                    .commit_transaction()
                    .map_err(CollectionError::from)?;
            }
            Err(_) => {
                let _ = self.session.rollback_transaction();
            }
        }

        result
    }

    /// Drop an index from the collection
    ///
    /// # Arguments
    ///
    /// * `index_name` - Name of the index to drop (or "*" to drop all indexes)
    ///
    /// # Example
    ///
    /// ```ignore
    /// collection.drop_index("email_1")?;
    /// collection.drop_index("*")?; // Drop all indexes
    /// ```
    pub fn drop_index(&self, index_name: &str) -> CollectionResult<()> {
        if index_name == "*" {
            let indexes = self.list_indexes()?;
            for spec in indexes {
                if spec.name != "_id_" {
                    self.drop_index(&spec.name)?;
                }
            }
            return Ok(());
        }

        let drop_session = self.session.open_sibling_session()?;
        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        drop_session.drop_table(&index_table_name)?;

        let metadata_table = format!("{}.indexes_metadata", self.collection_name);
        let mut metadata_cursor = self.session.open_cursor(&metadata_table)?;
        metadata_cursor.set_key_str(index_name);
        if metadata_cursor.search().is_ok() {
            metadata_cursor.remove()?;
        }

        self.invalidate_index_cache();

        self.append_oplog_if_enabled(
            "index_drop",
            Bson::String(index_name.to_string()),
            None,
            false,
            None,
        )?;

        Ok(())
    }

    /// List all indexes on the collection
    ///
    /// # Returns
    ///
    /// Vector of IndexSpec describing each index
    ///
    /// # Example
    ///
    /// ```ignore
    /// let indexes = collection.list_indexes()?;
    /// for idx in indexes {
    ///     println!("Index: {}, Keys: {:?}", idx.name, idx.keys);
    /// }
    /// ```
    pub fn list_indexes(&self) -> CollectionResult<Vec<IndexSpec>> {
        // Fast path: return cached index list if available.
        if let Some(ref cached) = *self.index_cache.borrow() {
            return Ok(cached.clone());
        }

        let metadata_table = format!("{}.indexes_metadata", self.collection_name);

        let mut metadata_cursor = match self.session.open_cursor(&metadata_table) {
            Ok(cursor) => cursor,
            Err(_) => {
                return Ok(vec![]);
            }
        };

        let mut indexes = Vec::new();

        if metadata_cursor.next().is_ok() {
            loop {
                let spec_bytes = metadata_cursor.get_value_raw()?;
                let index_spec: IndexSpec = bson::from_slice(&spec_bytes).map_err(|e| {
                    CollectionError::Other(format!("Failed to deserialize index spec: {}", e))
                })?;
                indexes.push(index_spec);

                if metadata_cursor.next().is_err() {
                    break;
                }
            }
        }

        // Populate cache for subsequent calls in the same operation.
        *self.index_cache.borrow_mut() = Some(indexes.clone());

        Ok(indexes)
    }

    /// Invalidate the cached index list (called after index creation/deletion).
    fn invalidate_index_cache(&self) {
        *self.index_cache.borrow_mut() = None;
    }

    /// Clear all entries from a secondary index table (metadata unchanged).
    fn clear_index_table(&self, index_name: &str) -> CollectionResult<()> {
        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        let mut index_cursor = self.session.open_cursor(&index_table_name)?;
        index_cursor.set_key_raw(&[]);
        let mut keys: Vec<Vec<u8>> = Vec::new();
        if index_cursor.search().is_ok() {
            loop {
                keys.push(index_cursor.get_key_raw()?);
                if index_cursor.next().is_err() {
                    break;
                }
            }
        }
        for k in keys {
            index_cursor.set_key_raw(&k);
            if index_cursor.search().is_ok() {
                index_cursor.remove()?;
            }
        }
        Ok(())
    }

    /// Rebuild every secondary index from collection data (`_id_` unchanged).
    ///
    /// Returns the number of secondary indexes rebuilt.
    pub fn rebuild_all_indexes(&self) -> CollectionResult<i64> {
        let indexes = self.list_indexes()?;
        let mut n: i64 = 0;
        for spec in indexes {
            if spec.name == "_id_" {
                continue;
            }
            self.clear_index_table(&spec.name)?;
            self.rebuild_index(&spec.name, &spec.keys, &spec.options)?;
            n += 1;
        }
        Ok(n)
    }

    // ============================================================
    // INTERNAL INDEX MAINTENANCE
    // ============================================================

    /// Check whether any entry in the index B-tree has `prefix` as a key prefix.
    ///
    /// Uses `search_near` to jump close to `prefix` in the sorted key space,
    /// then checks whether the landing position (or its immediate successor)
    /// starts with `prefix`.
    pub(super) fn index_has_prefix<C: StorageCursor>(
        cursor: &mut C,
        prefix: &[u8],
    ) -> CollectionResult<bool> {
        cursor.set_key_raw(prefix);
        match cursor.search_near() {
            Ok(exact) => {
                if exact < 0 && cursor.next().is_err() {
                    return Ok(false);
                }
                let found = cursor.get_key_raw()?;
                Ok(found.starts_with(prefix))
            }
            Err(_) => Ok(false),
        }
    }

    /// Rebuild an index by scanning all documents
    pub(super) fn rebuild_index(
        &self,
        index_name: &str,
        keys: &Document,
        options: &IndexOptions,
    ) -> CollectionResult<()> {
        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        let mut index_cursor = self.session.open_cursor(&index_table_name)?;
        let mut data_cursor = self.cursor()?;

        if data_cursor.next().is_err() {
            return Ok(());
        }

        // For unique indexes, check duplicates in memory to avoid O(n^2)
        // search_near calls during the batched transaction.
        let mut seen_keys: Option<std::collections::HashSet<Vec<u8>>> = if options.unique {
            Some(std::collections::HashSet::new())
        } else {
            None
        };

        loop {
            let doc_bytes = data_cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;
            let id_str = extract_id_string(&doc)?;

            if let Some(ref pfe) = options.partial_filter_expression {
                if !pfe.is_empty() && !crate::query::eval_query(&doc, pfe).unwrap_or(false) {
                    if data_cursor.next().is_err() {
                        break;
                    }
                    continue;
                }
            }

            if is_2dsphere_keys(keys) {
                #[cfg(target_arch = "wasm32")]
                {
                    if data_cursor.next().is_err() {
                        break;
                    }
                    continue;
                }
                #[cfg(not(target_arch = "wasm32"))]
                {
                    let Some(combined_key) = twodsphere_index_key(&doc, keys) else {
                        if options.sparse {
                            if data_cursor.next().is_err() {
                                break;
                            }
                            continue;
                        }
                        let field =
                            crate::index::twodsphere_field(keys).unwrap_or_else(|| "?".to_string());
                        return Err(CollectionError::Other(format!(
                            "2dsphere indexed field '{field}' must be a GeoJSON Point or [longitude, latitude] array"
                        )));
                    };
                    index_cursor.set_key_raw(&combined_key);
                    index_cursor.set_value_str(&id_str);
                    index_cursor.insert()?;
                    if data_cursor.next().is_err() {
                        break;
                    }
                    continue;
                }
            }

            let index_key_bytes = extract_index_key(&doc, keys);

            if let Some(ref mut seen) = seen_keys {
                if !seen.insert(index_key_bytes.clone()) {
                    let field_names: Vec<&str> = keys.keys().map(|s| s.as_str()).collect();
                    return Err(CollectionError::UniqueConstraintViolation(format!(
                        "Duplicate key for index on fields: {}",
                        field_names.join(", ")
                    )));
                }
            }

            let mut combined_key = index_key_bytes;
            combined_key.extend_from_slice(id_str.as_bytes());

            index_cursor.set_key_raw(&combined_key);
            index_cursor.set_value_str(&id_str);
            index_cursor.insert()?;

            if data_cursor.next().is_err() {
                break;
            }
        }

        Ok(())
    }

    /// Insert document into all indexes, dispatching by [`IndexType`].
    pub(super) fn insert_into_indexes(&self, doc: &Document) -> CollectionResult<()> {
        let indexes = self.list_indexes()?;
        let id_str = extract_id_string(doc)?;
        for index_spec in &indexes {
            self.insert_into_indexes_single(doc, &id_str, index_spec)?;
        }
        Ok(())
    }

    /// Insert document into a single index.
    fn insert_into_indexes_single(
        &self,
        doc: &Document,
        id_str: &str,
        index_spec: &IndexSpec,
    ) -> CollectionResult<()> {
        use crate::index::{resolve_index_type, IndexType};

        if let Some(ref pfe) = index_spec.options.partial_filter_expression {
            if !pfe.is_empty() && !crate::query::eval_query(doc, pfe).unwrap_or(false) {
                return Ok(());
            }
        }

        match resolve_index_type(&index_spec.keys, &index_spec.options) {
            IndexType::TwoDSphere => {
                #[cfg(target_arch = "wasm32")]
                {
                    return Ok(());
                }
                #[cfg(not(target_arch = "wasm32"))]
                {
                    let index_table_name =
                        format!("{}.idx_{}", self.collection_name, index_spec.name);
                    let mut index_cursor = self.session.open_cursor(&index_table_name)?;
                    let Some(combined_key) = twodsphere_index_key(doc, &index_spec.keys) else {
                        if index_spec.options.sparse {
                            return Ok(());
                        }
                        let field = crate::index::twodsphere_field(&index_spec.keys)
                            .unwrap_or_else(|| "?".to_string());
                        return Err(CollectionError::Other(format!(
                            "2dsphere indexed field '{field}' must be a GeoJSON Point or [longitude, latitude] array"
                        )));
                    };
                    index_cursor.set_key_raw(&combined_key);
                    index_cursor.set_value_str(id_str);
                    index_cursor.insert()?;
                }
            }
            IndexType::BTree => {
                let index_table_name = format!("{}.idx_{}", self.collection_name, index_spec.name);
                let mut index_cursor = self.session.open_cursor(&index_table_name)?;
                let collation = index_spec
                    .options
                    .collation
                    .as_ref()
                    .map(crate::collation::Collation::from_doc);
                let index_key_bytes =
                    extract_index_key_with_collation(doc, &index_spec.keys, collation.as_ref());

                if index_spec.options.unique
                    && Self::index_has_prefix(&mut index_cursor, &index_key_bytes)?
                {
                    let field_names: Vec<&str> =
                        index_spec.keys.keys().map(|s| s.as_str()).collect();
                    return Err(CollectionError::UniqueConstraintViolation(format!(
                        "Duplicate key for index '{}' on fields: {}",
                        index_spec.name,
                        field_names.join(", ")
                    )));
                }

                let mut combined_key = index_key_bytes;
                combined_key.extend_from_slice(id_str.as_bytes());
                index_cursor.set_key_raw(&combined_key);
                index_cursor.set_value_str(id_str);
                index_cursor.insert()?;
            }
            IndexType::Text => {
                let table = format!("{}.ftx_{}", self.collection_name, index_spec.name);
                let fields = crate::index::text_fields(&index_spec.keys);
                if let Ok(mut cursor) = self.session.open_cursor(&table) {
                    for field in &fields {
                        if let Some(bson::Bson::String(text)) = crate::paths::get_value(doc, field)
                        {
                            for token in crate::index::text_index::tokenize(text) {
                                let mut key = token.as_bytes().to_vec();
                                key.push(0xFE);
                                key.extend_from_slice(id_str.as_bytes());
                                cursor.set_key_raw(&key);
                                cursor.set_value_str(id_str);
                                let _ = cursor.insert();
                            }
                        }
                    }
                }
            }
            IndexType::VectorSearch => {}
            IndexType::Bitmap => {}
            IndexType::Prefix => {
                let prefix_length = index_spec
                    .options
                    .prefix_options
                    .as_ref()
                    .map(|p| p.prefix_length)
                    .unwrap_or(32);
                let table = format!("{}.pfx_{}", self.collection_name, index_spec.name);
                if let Ok(mut cursor) = self.session.open_cursor(&table) {
                    let full_key = extract_index_key(doc, &index_spec.keys);
                    let truncated =
                        crate::index::prefix_index::truncate_key(&full_key, prefix_length);
                    let mut combined = truncated;
                    combined.extend_from_slice(id_str.as_bytes());
                    cursor.set_key_raw(&combined);
                    cursor.set_value_str(id_str);
                    let _ = cursor.insert();
                }
            }
        }

        Ok(())
    }

    /// Remove document from all indexes, dispatching by [`IndexType`].
    pub(super) fn remove_from_indexes(&self, doc: &Document) -> CollectionResult<()> {
        let indexes = self.list_indexes()?;
        let id_str = extract_id_string(doc)?;
        for index_spec in &indexes {
            self.remove_from_indexes_single(doc, &id_str, index_spec)?;
        }
        Ok(())
    }

    /// Remove document from a single index.
    fn remove_from_indexes_single(
        &self,
        doc: &Document,
        id_str: &str,
        index_spec: &IndexSpec,
    ) -> CollectionResult<()> {
        use crate::index::{resolve_index_type, IndexType};

        match resolve_index_type(&index_spec.keys, &index_spec.options) {
            IndexType::TwoDSphere => {
                #[cfg(target_arch = "wasm32")]
                {
                    return Ok(());
                }
                #[cfg(not(target_arch = "wasm32"))]
                {
                    let Some(combined_key) = twodsphere_index_key(doc, &index_spec.keys) else {
                        return Ok(());
                    };
                    let table = format!("{}.idx_{}", self.collection_name, index_spec.name);
                    let mut cursor = self.session.open_cursor(&table)?;
                    cursor.set_key_raw(&combined_key);
                    if cursor.search().is_ok() {
                        cursor.remove()?;
                    }
                }
            }
            IndexType::BTree => {
                let table = format!("{}.idx_{}", self.collection_name, index_spec.name);
                let mut cursor = self.session.open_cursor(&table)?;
                let collation = index_spec
                    .options
                    .collation
                    .as_ref()
                    .map(crate::collation::Collation::from_doc);
                let index_key_bytes =
                    extract_index_key_with_collation(doc, &index_spec.keys, collation.as_ref());
                let mut combined_key = index_key_bytes;
                combined_key.extend_from_slice(id_str.as_bytes());
                cursor.set_key_raw(&combined_key);
                if cursor.search().is_ok() {
                    cursor.remove()?;
                }
            }
            IndexType::Text => {
                let table = format!("{}.ftx_{}", self.collection_name, index_spec.name);
                let fields = crate::index::text_fields(&index_spec.keys);
                if let Ok(mut cursor) = self.session.open_cursor(&table) {
                    for field in &fields {
                        if let Some(bson::Bson::String(text)) = crate::paths::get_value(doc, field)
                        {
                            for token in crate::index::text_index::tokenize(text) {
                                let mut key = token.as_bytes().to_vec();
                                key.push(0xFE);
                                key.extend_from_slice(id_str.as_bytes());
                                cursor.set_key_raw(&key);
                                if cursor.search().is_ok() {
                                    let _ = cursor.remove();
                                }
                            }
                        }
                    }
                }
            }
            IndexType::VectorSearch => {}
            IndexType::Bitmap => {}
            IndexType::Prefix => {
                let prefix_length = index_spec
                    .options
                    .prefix_options
                    .as_ref()
                    .map(|p| p.prefix_length)
                    .unwrap_or(32);
                let table = format!("{}.pfx_{}", self.collection_name, index_spec.name);
                if let Ok(mut cursor) = self.session.open_cursor(&table) {
                    let full_key = extract_index_key(doc, &index_spec.keys);
                    let truncated =
                        crate::index::prefix_index::truncate_key(&full_key, prefix_length);
                    let mut combined = truncated;
                    combined.extend_from_slice(id_str.as_bytes());
                    cursor.set_key_raw(&combined);
                    if cursor.search().is_ok() {
                        let _ = cursor.remove();
                    }
                }
            }
        }

        Ok(())
    }

    /// Update document in all indexes, skipping any index whose key is unchanged.
    pub(super) fn update_in_indexes(
        &self,
        old_doc: &Document,
        new_doc: &Document,
    ) -> CollectionResult<()> {
        use crate::index::{extract_index_key_with_collation, resolve_index_type, IndexType};

        let indexes = self.list_indexes()?;
        let old_id_str = extract_id_string(old_doc)?;
        let new_id_str = extract_id_string(new_doc)?;

        for index_spec in &indexes {
            if resolve_index_type(&index_spec.keys, &index_spec.options) == IndexType::BTree {
                let collation = index_spec
                    .options
                    .collation
                    .as_ref()
                    .map(crate::collation::Collation::from_doc);
                let old_key =
                    extract_index_key_with_collation(old_doc, &index_spec.keys, collation.as_ref());
                let new_key =
                    extract_index_key_with_collation(new_doc, &index_spec.keys, collation.as_ref());
                if old_key == new_key && old_id_str == new_id_str {
                    continue;
                }
            }
            self.remove_from_indexes_single(old_doc, &old_id_str, index_spec)?;
            self.insert_into_indexes_single(new_doc, &new_id_str, index_spec)?;
        }
        Ok(())
    }
}
