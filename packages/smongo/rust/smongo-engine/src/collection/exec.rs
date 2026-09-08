use bson::{Bson, Document};
use std::collections::HashSet;

use super::{
    apply_projection_to_index_doc, build_seek_prefix, deserialize_document, extract_id_string,
    extract_vector_query, should_include_id, Collection, CollectionError, CollectionResult,
};
use crate::index::{decode_index_key, extract_index_key};
use crate::planner::ExecutionPlan;
use crate::query::eval_query;
use crate::storage::{StorageCursor, StorageSession};

use super::geo_find;

impl<S: StorageSession> Collection<S> {
    /// Run a planner [`ExecutionPlan`] and return all documents matching `filter`.
    pub fn execute_plan(
        &self,
        plan: &ExecutionPlan,
        filter: &Document,
    ) -> CollectionResult<Vec<Document>> {
        match plan {
            ExecutionPlan::CollectionScan => self.collect_collection_scan(filter),
            ExecutionPlan::IndexScan {
                index_name,
                index_keys,
            } => self.collect_index_scan(filter, index_name, index_keys),
            ExecutionPlan::IndexSeek {
                index_name,
                index_keys,
                seek_values,
            } => self.collect_index_seek(filter, index_name, index_keys, seek_values),
            ExecutionPlan::CoveringIndexScan {
                index_name,
                index_keys,
                seek_values,
                projection,
            } => self.collect_covering_index_scan(
                filter,
                index_name,
                index_keys,
                seek_values.as_ref(),
                projection,
            ),
            ExecutionPlan::SortedIndexScan {
                index_name, limit, ..
            } => self.collect_sorted_index_scan(filter, index_name, *limit),
            ExecutionPlan::BitmapScan { index_name, field } => {
                self.collect_bitmap_scan(filter, index_name, field)
            }
            ExecutionPlan::PrefixIndexScan {
                index_name,
                index_keys,
                prefix_length,
            } => self.collect_prefix_index_scan(filter, index_name, index_keys, *prefix_length),
            ExecutionPlan::TextIndexScan { index_name, fields } => {
                self.collect_text_index_scan(filter, index_name, fields)
            }
            ExecutionPlan::VectorIndexSearch {
                index_name,
                field,
                dimensions,
                metric,
                ef_construction,
                m,
                indexing_method,
            } => self.collect_vector_index_search(
                filter,
                index_name,
                field,
                *dimensions,
                metric,
                *ef_construction,
                *m,
                indexing_method,
            ),
            ExecutionPlan::GeoNear { .. }
            | ExecutionPlan::GeoCapWithin { .. }
            | ExecutionPlan::GeoCellCover { .. } => {
                geo_find::materialize_geo_plan(self, plan, filter)
            }
            ExecutionPlan::OrUnionPlans { subplans } => {
                let mut seen = HashSet::new();
                let mut out = Vec::new();
                for sub in subplans {
                    for doc in self.execute_plan(sub, filter)? {
                        let id_str = extract_id_string(&doc)?;
                        if seen.insert(id_str) {
                            out.push(doc);
                        }
                    }
                }
                Ok(out)
            }
        }
    }

    // ============================================================
    // QUERY EXECUTION STRATEGIES
    // ============================================================

    /// Find one document using collection scan
    pub(super) fn find_one_with_collection_scan(
        &self,
        filter: &Document,
    ) -> CollectionResult<Option<Document>> {
        let mut cursor = self.cursor()?;

        if cursor.next().is_err() {
            return Ok(None);
        }

        loop {
            let doc_bytes = cursor.get_value_raw()?;
            let doc = deserialize_document(&doc_bytes)?;

            if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                return Ok(Some(doc));
            }

            if cursor.next().is_err() {
                break;
            }
        }

        Ok(None)
    }

    /// Find one document using index scan
    pub(super) fn find_one_with_index_scan(
        &self,
        filter: &Document,
        index_name: &str,
        _index_keys: &Document,
    ) -> CollectionResult<Option<Document>> {
        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        let mut index_cursor = self.session.open_cursor(&index_table_name)?;

        if index_cursor.next().is_err() {
            return Ok(None);
        }

        loop {
            let id_str = index_cursor.get_value_str()?;

            let mut data_cursor = self.cursor()?;
            data_cursor.set_key_str(&id_str);
            if data_cursor.search().is_ok() {
                let doc_bytes = data_cursor.get_value_raw()?;
                let doc = deserialize_document(&doc_bytes)?;

                if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                    return Ok(Some(doc));
                }
            }

            if index_cursor.next().is_err() {
                break;
            }
        }

        Ok(None)
    }

    /// Find one document using index seek (direct lookup)
    pub(super) fn find_one_with_index_seek(
        &self,
        filter: &Document,
        index_name: &str,
        index_keys: &Document,
        seek_values: &Document,
    ) -> CollectionResult<Option<Document>> {
        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        let mut index_cursor = self.session.open_cursor(&index_table_name)?;

        let seek_key = build_seek_prefix(index_keys, seek_values);

        index_cursor.set_key_raw(&seek_key);
        match index_cursor.search_near() {
            Ok(exact) => {
                if exact < 0 && index_cursor.next().is_err() {
                    return Ok(None);
                }
            }
            Err(_) => return Ok(None),
        }

        loop {
            let index_key_raw = index_cursor.get_key_raw()?;

            if index_key_raw.starts_with(&seek_key) {
                let id_str = index_cursor.get_value_str()?;

                let mut data_cursor = self.cursor()?;
                data_cursor.set_key_str(&id_str);
                if data_cursor.search().is_ok() {
                    let doc_bytes = data_cursor.get_value_raw()?;
                    let doc = deserialize_document(&doc_bytes)?;

                    if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                        return Ok(Some(doc));
                    }
                }
            } else {
                break;
            }

            if index_cursor.next().is_err() {
                break;
            }
        }

        Ok(None)
    }

    /// Walk a B-tree index in order, fetch docs, post-filter, stop at `limit`.
    fn collect_sorted_index_scan(
        &self,
        filter: &Document,
        index_name: &str,
        limit: usize,
    ) -> CollectionResult<Vec<Document>> {
        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        let mut index_cursor = self
            .session
            .open_cursor(&index_table_name)
            .map_err(CollectionError::from)?;
        let mut out = Vec::with_capacity(limit);
        if index_cursor.next().is_err() {
            return Ok(out);
        }
        loop {
            let id_str = index_cursor
                .get_value_str()
                .map_err(CollectionError::from)?;
            if let Some(doc) = self.fetch_doc_by_id_str(&id_str)? {
                if filter.is_empty()
                    || eval_query(&doc, filter).map_err(CollectionError::QueryError)?
                {
                    out.push(doc);
                    if out.len() >= limit {
                        break;
                    }
                }
            }
            if index_cursor.next().is_err() {
                break;
            }
        }
        Ok(out)
    }

    pub(super) fn collect_collection_scan(
        &self,
        filter: &Document,
    ) -> CollectionResult<Vec<Document>> {
        let mut cursor = self.cursor().map_err(CollectionError::from)?;
        let mut out = Vec::new();
        if cursor.next().is_err() {
            return Ok(out);
        }
        loop {
            let doc_bytes = cursor.get_value_raw().map_err(CollectionError::from)?;
            let doc = deserialize_document(&doc_bytes)?;
            if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                out.push(doc);
            }
            if cursor.next().is_err() {
                break;
            }
        }
        Ok(out)
    }

    fn collect_index_scan(
        &self,
        filter: &Document,
        index_name: &str,
        _index_keys: &Document,
    ) -> CollectionResult<Vec<Document>> {
        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        let mut index_cursor = self
            .session
            .open_cursor(&index_table_name)
            .map_err(CollectionError::from)?;
        let mut out = Vec::new();
        if index_cursor.next().is_err() {
            return Ok(out);
        }
        loop {
            let id_str = index_cursor
                .get_value_str()
                .map_err(CollectionError::from)?;
            if let Some(doc) = self.fetch_doc_by_id_str(&id_str)? {
                if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                    out.push(doc);
                }
            }
            if index_cursor.next().is_err() {
                break;
            }
        }
        Ok(out)
    }

    fn collect_index_seek(
        &self,
        filter: &Document,
        index_name: &str,
        index_keys: &Document,
        seek_values: &Document,
    ) -> CollectionResult<Vec<Document>> {
        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        let mut index_cursor = self
            .session
            .open_cursor(&index_table_name)
            .map_err(CollectionError::from)?;
        let seek_key = build_seek_prefix(index_keys, seek_values);
        let mut out = Vec::new();
        index_cursor.set_key_raw(&seek_key);
        match index_cursor.search_near() {
            Ok(exact) => {
                if exact < 0 && index_cursor.next().is_err() {
                    return Ok(out);
                }
            }
            Err(_) => return Ok(out),
        }
        loop {
            let index_key_raw = index_cursor.get_key_raw().map_err(CollectionError::from)?;
            if !index_key_raw.starts_with(&seek_key) {
                break;
            }
            let id_str = index_cursor
                .get_value_str()
                .map_err(CollectionError::from)?;
            if let Some(doc) = self.fetch_doc_by_id_str(&id_str)? {
                if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                    out.push(doc);
                }
            }
            if index_cursor.next().is_err() {
                break;
            }
        }
        Ok(out)
    }

    fn collect_covering_index_scan(
        &self,
        filter: &Document,
        index_name: &str,
        index_keys: &Document,
        seek_values: Option<&Document>,
        projection: &Document,
    ) -> CollectionResult<Vec<Document>> {
        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        let mut index_cursor = self
            .session
            .open_cursor(&index_table_name)
            .map_err(CollectionError::from)?;

        let mut out = Vec::new();

        if let Some(seek_vals) = seek_values {
            let seek_key = build_seek_prefix(index_keys, seek_vals);
            index_cursor.set_key_raw(&seek_key);
            match index_cursor.search_near() {
                Ok(exact) => {
                    if exact < 0 && index_cursor.next().is_err() {
                        return Ok(out);
                    }
                }
                Err(_) => return Ok(out),
            }

            loop {
                let index_key_raw = index_cursor.get_key_raw().map_err(CollectionError::from)?;
                if !index_key_raw.starts_with(&seek_key) {
                    break;
                }

                if let Some(index_doc) = decode_index_key(&index_key_raw, index_keys) {
                    let filter_result =
                        eval_query(&index_doc, filter).map_err(CollectionError::QueryError)?;

                    if filter_result {
                        let mut projected = apply_projection_to_index_doc(&index_doc, projection);

                        if should_include_id(projection) {
                            let id_str = index_cursor
                                .get_value_str()
                                .map_err(CollectionError::from)?;
                            projected.insert("_id".to_string(), Bson::String(id_str));
                        }

                        out.push(projected);
                    }
                }

                if index_cursor.next().is_err() {
                    break;
                }
            }
        } else {
            if index_cursor.next().is_err() {
                return Ok(out);
            }

            loop {
                let index_key_raw = index_cursor.get_key_raw().map_err(CollectionError::from)?;

                if let Some(index_doc) = decode_index_key(&index_key_raw, index_keys) {
                    if eval_query(&index_doc, filter).map_err(CollectionError::QueryError)? {
                        let mut projected = apply_projection_to_index_doc(&index_doc, projection);

                        if should_include_id(projection) {
                            let id_str = index_cursor
                                .get_value_str()
                                .map_err(CollectionError::from)?;
                            projected.insert("_id".to_string(), Bson::String(id_str));
                        }

                        out.push(projected);
                    }
                }

                if index_cursor.next().is_err() {
                    break;
                }
            }
        }

        Ok(out)
    }

    fn collect_bitmap_scan(
        &self,
        filter: &Document,
        index_name: &str,
        field: &str,
    ) -> CollectionResult<Vec<Document>> {
        use crate::index::bitmap_index::BitmapIndex;

        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        let mut index_cursor = match self.session.open_cursor(&index_table_name) {
            Ok(c) => c,
            Err(_) => return self.collect_collection_scan(filter),
        };

        let mut bitmap = BitmapIndex::new();
        if index_cursor.next().is_ok() {
            loop {
                let key_raw = index_cursor.get_key_raw().map_err(CollectionError::from)?;
                let id_str = index_cursor
                    .get_value_str()
                    .map_err(CollectionError::from)?;
                bitmap.insert(&id_str, &key_raw);
                if index_cursor.next().is_err() {
                    break;
                }
            }
        }

        let seek_bytes = match filter.get(field) {
            Some(Bson::String(s)) => Some(s.as_bytes().to_vec()),
            Some(Bson::Int32(n)) => Some(n.to_be_bytes().to_vec()),
            Some(Bson::Int64(n)) => Some(n.to_be_bytes().to_vec()),
            Some(Bson::Boolean(b)) => Some(vec![if *b { 0x01 } else { 0x00 }]),
            Some(Bson::Document(d)) if d.contains_key("$in") => None,
            _ => None,
        };

        let positions = if let Some(ref sb) = seek_bytes {
            bitmap.lookup(sb)
        } else if let Some(Bson::Document(d)) = filter.get(field) {
            if let Some(Bson::Array(arr)) = d.get("$in") {
                let vals: Vec<Vec<u8>> = arr
                    .iter()
                    .filter_map(|v| match v {
                        Bson::String(s) => Some(s.as_bytes().to_vec()),
                        Bson::Int32(n) => Some(n.to_be_bytes().to_vec()),
                        Bson::Int64(n) => Some(n.to_be_bytes().to_vec()),
                        _ => None,
                    })
                    .collect();
                bitmap.lookup_in(&vals)
            } else {
                return self.collect_collection_scan(filter);
            }
        } else {
            return self.collect_collection_scan(filter);
        };

        let ids = bitmap.positions_to_ids(&positions);
        let mut out = Vec::new();
        for id_str in ids {
            if let Some(doc) = self.fetch_doc_by_id_str(&id_str)? {
                if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                    out.push(doc);
                }
            }
        }
        Ok(out)
    }

    fn collect_prefix_index_scan(
        &self,
        filter: &Document,
        index_name: &str,
        index_keys: &Document,
        prefix_length: usize,
    ) -> CollectionResult<Vec<Document>> {
        use crate::index::prefix_index::truncate_key;

        let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
        let mut index_cursor = match self.session.open_cursor(&index_table_name) {
            Ok(c) => c,
            Err(_) => return self.collect_collection_scan(filter),
        };

        let seek_doc = Document::from_iter(
            index_keys
                .keys()
                .filter_map(|k| filter.get(k).map(|v| (k.clone(), v.clone()))),
        );
        if seek_doc.is_empty() {
            return self.collect_index_scan(filter, index_name, index_keys);
        }

        let full_key = extract_index_key(&seek_doc, index_keys);
        let prefix = truncate_key(&full_key, prefix_length);

        index_cursor.set_key_raw(&prefix);
        match index_cursor.search_near() {
            Ok(exact) => {
                if exact < 0 && index_cursor.next().is_err() {
                    return Ok(Vec::new());
                }
            }
            Err(_) => return Ok(Vec::new()),
        }

        let mut out = Vec::new();
        loop {
            let key_raw = index_cursor.get_key_raw().map_err(CollectionError::from)?;
            if !key_raw.starts_with(&prefix) {
                break;
            }
            let id_str = index_cursor
                .get_value_str()
                .map_err(CollectionError::from)?;
            if let Some(doc) = self.fetch_doc_by_id_str(&id_str)? {
                if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                    out.push(doc);
                }
            }
            if index_cursor.next().is_err() {
                break;
            }
        }
        Ok(out)
    }

    fn collect_text_index_scan(
        &self,
        filter: &Document,
        _index_name: &str,
        fields: &[String],
    ) -> CollectionResult<Vec<Document>> {
        use crate::index::text_index::TextIndex;

        let search_text = match filter.get("$text") {
            Some(Bson::Document(td)) => match td.get("$search") {
                Some(Bson::String(s)) => s.clone(),
                _ => return self.collect_collection_scan(filter),
            },
            Some(Bson::String(s)) => s.clone(),
            _ => return self.collect_collection_scan(filter),
        };

        let all_docs = self.collect_collection_scan(&Document::new())?;
        let text_idx = TextIndex::build(&all_docs, fields, None);
        let scored = text_idx.search(&search_text, None);

        let id_set: HashSet<String> = scored.into_iter().map(|(id, _)| id).collect();

        let mut out = Vec::new();
        for doc in &all_docs {
            let id_str = extract_id_string(doc)?;
            if id_set.contains(&id_str) {
                let non_text_filter: Document = filter
                    .iter()
                    .filter(|(k, _)| k.as_str() != "$text")
                    .map(|(k, v)| (k.clone(), v.clone()))
                    .collect();
                if non_text_filter.is_empty()
                    || eval_query(doc, &non_text_filter).map_err(CollectionError::QueryError)?
                {
                    out.push(doc.clone());
                }
            }
        }
        Ok(out)
    }

    #[allow(clippy::too_many_arguments)]
    fn collect_vector_index_search(
        &self,
        filter: &Document,
        _index_name: &str,
        field: &str,
        dimensions: usize,
        metric: &str,
        ef_construction: Option<usize>,
        m: Option<usize>,
        indexing_method: &str,
    ) -> CollectionResult<Vec<Document>> {
        use crate::index::vector_index::VectorIndex;

        let (query_vec, k) = match extract_vector_query(filter, field) {
            Some(v) => v,
            None => return self.collect_collection_scan(filter),
        };

        let all_docs = self.collect_collection_scan(&Document::new())?;
        let mut vec_idx = VectorIndex::build_with_params(
            &all_docs,
            field,
            dimensions,
            metric,
            ef_construction,
            m,
        );

        let results = if indexing_method == "flat" {
            vec_idx.search_exact(&query_vec, k)
        } else {
            vec_idx.search(&query_vec, k)
        };

        let id_set: HashSet<String> = results.into_iter().map(|(id, _)| id).collect();

        let mut out = Vec::new();
        for doc in &all_docs {
            let id_str = extract_id_string(doc)?;
            if id_set.contains(&id_str) {
                out.push(doc.clone());
            }
        }
        Ok(out)
    }
}
