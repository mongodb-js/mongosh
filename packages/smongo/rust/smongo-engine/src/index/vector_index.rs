//! Vector similarity search index supporting both **HNSW** (approximate) and
//! **flat** (exact brute-force) search modes.
//!
//! Wraps a vendored [`HnswGraph`] that is rebuilt lazily from raw vector
//! storage whenever mutations (`insert` / `remove`) invalidate the graph.
//! Persistence uses a compact binary format (doc-ids + row-major f32 vectors)
//! and rebuilds the HNSW graph on deserialization.
//!
//! ## Multi-Tenant Architecture
//!
//! Matches the [Atlas multi-tenant guidance][mt]: a single collection stores
//! all tenants, distinguished by a `tenant_id` field.  Use `filter` in
//! `$vectorSearch` to scope queries to one tenant.
//!
//! - **Many small tenants (<10K vectors each)**: use `exact: true` or a flat
//!   index (`indexingMethod: "flat"`) — exhaustive scan after pre-filtering is
//!   already the fastest path and avoids HNSW graph overhead.
//! - **Larger tenants (>10K vectors)**: use HNSW (the default) for sub-linear
//!   query latency.
//!
//! [mt]: https://www.mongodb.com/docs/atlas/atlas-vector-search/multi-tenant-architecture/

use std::collections::HashMap;

use bson::Document;

use super::hnsw::{compute_distance, DistanceMetric, HnswGraph};

/// In-memory vector index with doc_id mapping.
///
/// Supports both HNSW (approximate, default) and flat (exact brute-force)
/// search modes, matching the [Atlas Vector Search][avs] index types.
///
/// [avs]: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-type/
pub struct VectorIndex {
    /// doc_id -> internal node id
    id_map: HashMap<String, u32>,
    /// internal node id -> doc_id
    reverse_map: Vec<String>,
    /// Raw vector storage (row-major, `dimensions` floats per row).
    vectors: Vec<f32>,
    /// Number of dimensions per vector.
    pub dimensions: usize,
    /// Similarity metric name (`"cosine"`, `"euclidean"`, `"dotProduct"`).
    pub metric: String,
    /// Built HNSW graph. `None` until the first build/search.
    hnsw: Option<HnswGraph>,
    /// Prepared vectors fed to the HNSW graph (e.g. L2-normalized for cosine).
    graph_vectors: Vec<f32>,
    /// Set after insert/remove to signal the graph needs a rebuild.
    dirty: bool,
    /// HNSW ef_construction. `None` = default (200).
    ef_construction: Option<usize>,
    /// HNSW M parameter. `None` = default (16).
    m: Option<usize>,
}

impl VectorIndex {
    /// Create an empty index.
    pub fn new(dimensions: usize, metric: &str) -> Self {
        Self {
            id_map: HashMap::new(),
            reverse_map: Vec::new(),
            vectors: Vec::new(),
            dimensions,
            metric: metric.to_string(),
            hnsw: None,
            graph_vectors: Vec::new(),
            dirty: false,
            ef_construction: None,
            m: None,
        }
    }

    /// Bulk-build from documents using default HNSW parameters.
    pub fn build(docs: &[Document], field: &str, dimensions: usize, metric: &str) -> Self {
        Self::build_with_params(docs, field, dimensions, metric, None, None)
    }

    /// Bulk-build from documents with explicit HNSW tuning knobs.
    pub fn build_with_params(
        docs: &[Document],
        field: &str,
        dimensions: usize,
        metric: &str,
        ef_construction: Option<usize>,
        m: Option<usize>,
    ) -> Self {
        let mut idx = Self::new(dimensions, metric);
        idx.ef_construction = ef_construction;
        idx.m = m;
        for doc in docs {
            let id = match doc.get("_id") {
                Some(bson::Bson::ObjectId(oid)) => oid.to_hex(),
                Some(bson::Bson::String(s)) => s.clone(),
                Some(bson::Bson::Int32(i)) => i.to_string(),
                Some(bson::Bson::Int64(i)) => i.to_string(),
                _ => continue,
            };
            if let Some(vec) = extract_vector(doc, field, dimensions) {
                idx.raw_insert(&id, &vec);
            }
        }
        idx.rebuild_hnsw();
        idx
    }

    /// Insert a single vector. Marks the HNSW graph dirty.
    pub fn insert(&mut self, doc_id: &str, vector: &[f32]) {
        if vector.len() != self.dimensions {
            return;
        }
        self.raw_insert(doc_id, vector);
        self.dirty = true;
    }

    /// Remove a vector by doc_id. Marks the slot as empty (lazy deletion).
    pub fn remove(&mut self, doc_id: &str) {
        if let Some(&node_id) = self.id_map.get(doc_id) {
            self.id_map.remove(doc_id);
            if (node_id as usize) < self.reverse_map.len() {
                self.reverse_map[node_id as usize] = String::new();
            }
            self.dirty = true;
        }
    }

    /// HNSW-accelerated k-NN search. Rebuilds the graph if dirty.
    pub fn search(&mut self, query: &[f32], k: usize) -> Vec<(String, f32)> {
        if query.len() != self.dimensions || self.id_map.is_empty() {
            return Vec::new();
        }
        self.ensure_built();

        let search_vec = self.prepare_query(query);
        let ef_search = k.max(64);

        let hnsw = match self.hnsw.as_mut() {
            Some(h) => h,
            None => return Vec::new(),
        };
        let results = hnsw.search(&search_vec, k, ef_search, &self.graph_vectors);

        let is_euclidean = self.metric == "euclidean";
        let mut scored: Vec<(String, f32)> = Vec::with_capacity(results.len());
        for (idx, distance) in results {
            if idx < self.reverse_map.len() && !self.reverse_map[idx].is_empty() {
                scored.push((
                    self.reverse_map[idx].clone(),
                    atlas_score(distance, is_euclidean),
                ));
            }
        }

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scored
    }

    /// **Exact** (flat / brute-force) k-NN search.
    ///
    /// Computes the distance from `query` to every active vector and returns
    /// the top-k results with Atlas-normalized scores.  No HNSW graph is
    /// built — this is the correct path for:
    ///
    /// - `exact: true` in `$vectorSearch`
    /// - Flat indexes (`indexingMethod: "flat"`)
    /// - Multi-tenant workloads where each tenant has <10K vectors and the
    ///   query is pre-filtered to a single tenant
    ///
    /// Prepared vectors (e.g. L2-normalized for cosine) are built once and
    /// cached in `graph_vectors`, so repeated queries avoid per-vector
    /// allocation.
    pub fn search_exact(&mut self, query: &[f32], k: usize) -> Vec<(String, f32)> {
        if query.len() != self.dimensions || self.id_map.is_empty() {
            return Vec::new();
        }

        self.ensure_prepared_vectors();
        let prepared_query = self.prepare_query(query);
        let is_euclidean = self.metric == "euclidean";
        let metric = match self.metric.as_str() {
            "euclidean" => DistanceMetric::Euclidean,
            _ => DistanceMetric::NegDotProduct,
        };

        let dim = self.dimensions;
        let n = self.reverse_map.len();
        let mut scored: Vec<(String, f32)> = Vec::with_capacity(n.min(k));

        for i in 0..n {
            if self.reverse_map[i].is_empty() {
                continue;
            }
            let offset = i * dim;
            let end = offset + dim;
            if end > self.graph_vectors.len() {
                continue;
            }
            let dist = compute_distance(&prepared_query, &self.graph_vectors[offset..end], metric);
            scored.push((self.reverse_map[i].clone(), atlas_score(dist, is_euclidean)));
        }

        scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        scored.truncate(k);
        scored
    }

    /// Serialize the index to bytes for persistence.
    pub fn to_bytes(&self) -> Vec<u8> {
        let estimated =
            12 + self.metric.len() + self.reverse_map.len() * (4 + 24 + self.dimensions * 4);
        let mut buf = Vec::with_capacity(estimated);
        buf.extend_from_slice(&(self.dimensions as u32).to_le_bytes());
        let metric_bytes = self.metric.as_bytes();
        buf.extend_from_slice(&(metric_bytes.len() as u32).to_le_bytes());
        buf.extend_from_slice(metric_bytes);
        buf.extend_from_slice(&(self.reverse_map.len() as u32).to_le_bytes());
        for (i, doc_id) in self.reverse_map.iter().enumerate() {
            let id_bytes = doc_id.as_bytes();
            buf.extend_from_slice(&(id_bytes.len() as u32).to_le_bytes());
            buf.extend_from_slice(id_bytes);
            let offset = i * self.dimensions;
            let end = offset + self.dimensions;
            if end <= self.vectors.len() {
                for &f in &self.vectors[offset..end] {
                    buf.extend_from_slice(&f.to_le_bytes());
                }
            }
        }
        buf
    }

    /// Deserialize from bytes. The HNSW graph is rebuilt on first search.
    pub fn from_bytes(data: &[u8]) -> Option<Self> {
        let mut pos = 0usize;
        if data.len() < 8 {
            return None;
        }
        let dimensions = u32::from_le_bytes(data[pos..pos + 4].try_into().ok()?) as usize;
        pos += 4;
        let metric_len = u32::from_le_bytes(data[pos..pos + 4].try_into().ok()?) as usize;
        pos += 4;
        if pos + metric_len > data.len() {
            return None;
        }
        let metric = std::str::from_utf8(&data[pos..pos + metric_len])
            .ok()?
            .to_string();
        pos += metric_len;
        if pos + 4 > data.len() {
            return None;
        }
        let count = u32::from_le_bytes(data[pos..pos + 4].try_into().ok()?) as usize;
        pos += 4;

        let mut idx = Self::new(dimensions, &metric);
        for _ in 0..count {
            if pos + 4 > data.len() {
                return None;
            }
            let id_len = u32::from_le_bytes(data[pos..pos + 4].try_into().ok()?) as usize;
            pos += 4;
            if pos + id_len > data.len() {
                return None;
            }
            let doc_id = std::str::from_utf8(&data[pos..pos + id_len])
                .ok()?
                .to_string();
            pos += id_len;
            let vec_bytes = dimensions * 4;
            if pos + vec_bytes > data.len() {
                return None;
            }
            let mut vec = Vec::with_capacity(dimensions);
            for _ in 0..dimensions {
                let f = f32::from_le_bytes(data[pos..pos + 4].try_into().ok()?);
                pos += 4;
                vec.push(f);
            }
            if !doc_id.is_empty() {
                idx.raw_insert(&doc_id, &vec);
            } else {
                idx.reverse_map.push(String::new());
                idx.vectors.extend_from_slice(&vec);
            }
        }
        idx.dirty = true;
        Some(idx)
    }

    /// Number of active entries.
    pub fn len(&self) -> usize {
        self.id_map.len()
    }

    pub fn is_empty(&self) -> bool {
        self.id_map.is_empty()
    }

    // ------------------------------------------------------------------
    // Private helpers
    // ------------------------------------------------------------------

    fn raw_insert(&mut self, doc_id: &str, vector: &[f32]) {
        if vector.len() != self.dimensions {
            return;
        }
        if self.id_map.contains_key(doc_id) {
            self.remove(doc_id);
        }
        let node_id = self.reverse_map.len() as u32;
        self.id_map.insert(doc_id.to_string(), node_id);
        self.reverse_map.push(doc_id.to_string());
        self.vectors.extend_from_slice(vector);
    }

    fn ensure_built(&mut self) {
        if self.hnsw.is_none() || self.dirty {
            self.rebuild_hnsw();
        }
    }

    /// Prepare a raw vector for distance computation.
    ///
    /// * **cosine**: L2-normalize so that NegDotProduct distance equals
    ///   negated cosine similarity.
    /// * **dotProduct** / **euclidean**: pass through unchanged.
    fn prepare_for_graph(&self, raw: &[f32]) -> Vec<f32> {
        match self.metric.as_str() {
            "cosine" => l2_normalize(raw),
            _ => raw.to_vec(),
        }
    }

    /// Prepare a query vector for search (same transform as stored vectors).
    fn prepare_query(&self, raw: &[f32]) -> Vec<f32> {
        self.prepare_for_graph(raw)
    }

    /// Build the prepared (e.g. L2-normalized) vector buffer from raw storage.
    ///
    /// Shared by both `rebuild_hnsw` and `search_exact` so that cosine vectors
    /// are only normalized once regardless of how many queries follow.
    fn ensure_prepared_vectors(&mut self) {
        let n = self.reverse_map.len();
        let expected_len = n * self.dimensions;
        if self.graph_vectors.len() == expected_len && !self.dirty {
            return;
        }
        self.graph_vectors = Vec::with_capacity(expected_len);
        for i in 0..n {
            let offset = i * self.dimensions;
            let end = offset + self.dimensions;
            if end > self.vectors.len() {
                self.graph_vectors
                    .extend(std::iter::repeat_n(0.0f32, self.dimensions));
                continue;
            }
            let prepared = self.prepare_for_graph(&self.vectors[offset..end]);
            self.graph_vectors.extend_from_slice(&prepared);
        }
    }

    /// (Re-)build the HNSW graph from raw vector storage.
    fn rebuild_hnsw(&mut self) {
        let n = self.reverse_map.len();
        if n == 0 || self.dimensions == 0 {
            self.hnsw = None;
            self.graph_vectors.clear();
            self.dirty = false;
            return;
        }

        let hnsw_metric = match self.metric.as_str() {
            "euclidean" => DistanceMetric::Euclidean,
            _ => DistanceMetric::NegDotProduct,
        };

        let m = self.m.unwrap_or(16);
        let ef = self.ef_construction.unwrap_or(200);

        self.ensure_prepared_vectors();

        let mut graph = HnswGraph::new(self.dimensions, m, ef, hnsw_metric);
        for i in 0..n {
            if self.reverse_map[i].is_empty() {
                continue;
            }
            graph.insert(i, &self.graph_vectors);
        }

        self.hnsw = Some(graph);
        self.dirty = false;
    }
}

/// Atlas-compatible score normalization, clamped to `[0, 1]`.
///
/// - **Euclidean**: `1 / (1 + sqrt(distance))`
/// - **Cosine / dotProduct** (stored as NegDotProduct): `(1 + similarity) / 2`
///   where `similarity = -distance`.
#[inline]
fn atlas_score(distance: f32, is_euclidean: bool) -> f32 {
    let score = if is_euclidean {
        let d = distance.max(0.0).sqrt();
        1.0 / (1.0 + d)
    } else {
        let raw = -distance;
        (1.0 + raw) / 2.0
    };
    score.clamp(0.0, 1.0)
}

/// L2-normalize a vector. Returns the original if norm is zero.
fn l2_normalize(v: &[f32]) -> Vec<f32> {
    let norm: f32 = v.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm == 0.0 {
        return v.to_vec();
    }
    v.iter().map(|x| x / norm).collect()
}

fn extract_vector(doc: &Document, field: &str, dimensions: usize) -> Option<Vec<f32>> {
    let val = crate::paths::get_value(doc, field)?;
    let bson::Bson::Array(arr) = val else {
        return None;
    };
    if arr.len() != dimensions {
        return None;
    }
    let vec: Vec<f32> = arr
        .iter()
        .filter_map(|v| v.as_f64().map(|f| f as f32))
        .collect();
    if vec.len() == dimensions {
        Some(vec)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;

    #[test]
    fn test_vector_index_basic() {
        let mut idx = VectorIndex::new(3, "cosine");
        idx.insert("a", &[1.0, 0.0, 0.0]);
        idx.insert("b", &[0.0, 1.0, 0.0]);
        idx.insert("c", &[0.9, 0.1, 0.0]);
        assert_eq!(idx.len(), 3);

        let results = idx.search(&[1.0, 0.0, 0.0], 2);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].0, "a");
    }

    #[test]
    fn test_vector_index_serialize_roundtrip() {
        let mut idx = VectorIndex::new(2, "euclidean");
        idx.insert("x", &[1.0, 2.0]);
        idx.insert("y", &[3.0, 4.0]);
        let bytes = idx.to_bytes();
        let mut idx2 = VectorIndex::from_bytes(&bytes).unwrap();
        assert_eq!(idx2.len(), 2);
        assert_eq!(idx2.dimensions, 2);
        assert_eq!(idx2.metric, "euclidean");
        let results = idx2.search(&[1.0, 2.0], 1);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, "x");
    }

    #[test]
    fn test_vector_index_build() {
        let docs = vec![
            doc! { "_id": 1, "emb": [1.0, 0.0] },
            doc! { "_id": 2, "emb": [0.0, 1.0] },
        ];
        let mut idx = VectorIndex::build(&docs, "emb", 2, "cosine");
        assert_eq!(idx.len(), 2);
        let results = idx.search(&[1.0, 0.0], 1);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, "1");
    }

    #[test]
    fn test_vector_index_remove() {
        let mut idx = VectorIndex::new(2, "cosine");
        idx.insert("a", &[1.0, 0.0]);
        idx.insert("b", &[0.0, 1.0]);
        idx.remove("a");
        assert_eq!(idx.len(), 1);
        let results = idx.search(&[1.0, 0.0], 2);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, "b");
    }

    #[test]
    fn test_vector_index_build_with_params() {
        let docs = vec![
            doc! { "_id": "a", "v": [1.0, 0.0, 0.0] },
            doc! { "_id": "b", "v": [0.0, 1.0, 0.0] },
            doc! { "_id": "c", "v": [0.0, 0.0, 1.0] },
        ];
        let mut idx =
            VectorIndex::build_with_params(&docs, "v", 3, "euclidean", Some(100), Some(16));
        assert_eq!(idx.len(), 3);
        let results = idx.search(&[1.0, 0.0, 0.0], 2);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].0, "a");
    }

    #[test]
    fn test_vector_index_dot_product() {
        let mut idx = VectorIndex::new(3, "dotProduct");
        idx.insert("a", &[1.0, 0.0, 0.0]);
        idx.insert("b", &[0.5, 0.5, 0.0]);
        idx.insert("c", &[0.0, 1.0, 0.0]);

        let results = idx.search(&[1.0, 0.0, 0.0], 3);
        assert_eq!(results[0].0, "a");
        assert!(results[0].1 > results[1].1);
    }

    /// Verify HNSW matches brute-force cosine for 8 vectors in 64 dimensions.
    #[test]
    fn test_hnsw_vs_brute_force_64dim() {
        let dim = 64;
        let n = 8;

        let mut seed: u64 = 42;
        let mut next = || -> f32 {
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
            ((seed >> 33) as f32) / (u32::MAX as f32 / 2.0) - 1.0
        };

        let mut vecs: Vec<Vec<f32>> = Vec::new();
        for _ in 0..n {
            let raw: Vec<f32> = (0..dim).map(|_| next()).collect();
            vecs.push(l2_normalize(&raw));
        }
        let query: Vec<f32> = {
            let raw: Vec<f32> = (0..dim).map(|_| next()).collect();
            l2_normalize(&raw)
        };

        // Brute-force cosine ranking with Atlas-style normalization
        let mut brute: Vec<(usize, f32)> = vecs
            .iter()
            .enumerate()
            .map(|(i, v)| {
                let dot: f32 = v.iter().zip(query.iter()).map(|(a, b)| a * b).sum();
                let score = (1.0 + dot) / 2.0;
                (i, score)
            })
            .collect();
        brute.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());

        let mut idx = VectorIndex::new(dim, "cosine");
        for (i, v) in vecs.iter().enumerate() {
            idx.insert(&i.to_string(), v);
        }
        let hnsw_results = idx.search(&query, n);

        for (_, score) in &hnsw_results {
            assert!(
                (0.0..=1.0).contains(score),
                "score {score} outside [0, 1] range"
            );
        }

        for k in 0..n {
            let brute_id = brute[k].0.to_string();
            let hnsw_id = &hnsw_results[k].0;
            assert_eq!(
                hnsw_id, &brute_id,
                "rank {k}: HNSW returned {hnsw_id} (score={:.6}) but brute-force expected {brute_id} (score={:.6})",
                hnsw_results[k].1, brute[k].1,
            );
        }
    }

    /// Verify Atlas-style score ranges for all three metrics.
    #[test]
    fn test_atlas_score_ranges() {
        // cosine: identical vectors -> score = 1.0
        let mut cos_idx = VectorIndex::new(3, "cosine");
        cos_idx.insert("a", &[1.0, 0.0, 0.0]);
        let r = cos_idx.search(&[1.0, 0.0, 0.0], 1);
        assert!(
            (r[0].1 - 1.0).abs() < 1e-5,
            "cosine self-sim should be 1.0, got {}",
            r[0].1
        );

        // cosine: orthogonal vectors -> score = 0.5
        cos_idx.insert("b", &[0.0, 1.0, 0.0]);
        let r = cos_idx.search(&[1.0, 0.0, 0.0], 2);
        let orth_score = r.iter().find(|(id, _)| id == "b").unwrap().1;
        assert!(
            (orth_score - 0.5).abs() < 1e-5,
            "cosine orthogonal should be 0.5, got {orth_score}"
        );

        // euclidean: identical -> score = 1.0
        let mut euc_idx = VectorIndex::new(2, "euclidean");
        euc_idx.insert("a", &[0.0, 0.0]);
        let r = euc_idx.search(&[0.0, 0.0], 1);
        assert!(
            (r[0].1 - 1.0).abs() < 1e-5,
            "euclidean self-dist should be 1.0, got {}",
            r[0].1
        );

        // euclidean: distance=1 -> score = 0.5
        euc_idx.insert("b", &[1.0, 0.0]);
        let r = euc_idx.search(&[0.0, 0.0], 2);
        let dist1_score = r.iter().find(|(id, _)| id == "b").unwrap().1;
        assert!(
            (dist1_score - 0.5).abs() < 1e-5,
            "euclidean dist=1 should be 0.5, got {dist1_score}"
        );

        // dotProduct: unit vectors, dot=1 -> score = 1.0
        let mut dp_idx = VectorIndex::new(3, "dotProduct");
        dp_idx.insert("a", &[1.0, 0.0, 0.0]);
        let r = dp_idx.search(&[1.0, 0.0, 0.0], 1);
        assert!(
            (r[0].1 - 1.0).abs() < 1e-5,
            "dotProduct self should be 1.0, got {}",
            r[0].1
        );

        // dotProduct: orthogonal -> score = 0.5
        dp_idx.insert("b", &[0.0, 1.0, 0.0]);
        let r = dp_idx.search(&[1.0, 0.0, 0.0], 2);
        let orth_score = r.iter().find(|(id, _)| id == "b").unwrap().1;
        assert!(
            (orth_score - 0.5).abs() < 1e-5,
            "dotProduct orthogonal should be 0.5, got {orth_score}"
        );
    }

    // -----------------------------------------------------------------------
    // search_exact (flat index) tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_search_exact_cosine() {
        let mut idx = VectorIndex::new(3, "cosine");
        idx.insert("a", &[1.0, 0.0, 0.0]);
        idx.insert("b", &[0.0, 1.0, 0.0]);
        idx.insert("c", &[0.9, 0.1, 0.0]);

        let results = idx.search_exact(&[1.0, 0.0, 0.0], 2);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].0, "a");
        assert!((results[0].1 - 1.0).abs() < 1e-5);
    }

    #[test]
    fn test_search_exact_euclidean() {
        let mut idx = VectorIndex::new(2, "euclidean");
        idx.insert("a", &[0.0, 0.0]);
        idx.insert("b", &[1.0, 0.0]);
        idx.insert("c", &[3.0, 4.0]);

        let results = idx.search_exact(&[0.0, 0.0], 2);
        assert_eq!(results[0].0, "a");
        assert!((results[0].1 - 1.0).abs() < 1e-5);
        assert_eq!(results[1].0, "b");
        assert!((results[1].1 - 0.5).abs() < 1e-5);
    }

    #[test]
    fn test_search_exact_dot_product() {
        let mut idx = VectorIndex::new(3, "dotProduct");
        idx.insert("a", &[1.0, 0.0, 0.0]);
        idx.insert("b", &[0.0, 1.0, 0.0]);

        let results = idx.search_exact(&[1.0, 0.0, 0.0], 2);
        assert_eq!(results[0].0, "a");
        assert!((results[0].1 - 1.0).abs() < 1e-5);
        assert!((results[1].1 - 0.5).abs() < 1e-5);
    }

    /// search_exact matches search (HNSW) for small datasets.
    #[test]
    fn test_search_exact_matches_hnsw() {
        let dim = 32;
        let n = 20;

        let mut seed: u64 = 1337;
        let mut next = || -> f32 {
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
            ((seed >> 33) as f32) / (u32::MAX as f32 / 2.0) - 1.0
        };

        let vecs: Vec<Vec<f32>> = (0..n).map(|_| (0..dim).map(|_| next()).collect()).collect();
        let query: Vec<f32> = (0..dim).map(|_| next()).collect();

        let mut idx = VectorIndex::new(dim, "cosine");
        for (i, v) in vecs.iter().enumerate() {
            idx.insert(&i.to_string(), v);
        }

        let exact_results = idx.search_exact(&query, 5);
        let hnsw_results = idx.search(&query, 5);

        assert_eq!(hnsw_results.len(), exact_results.len());
        for (h, e) in hnsw_results.iter().zip(exact_results.iter()) {
            assert_eq!(h.0, e.0, "ranking mismatch");
            assert!(
                (h.1 - e.1).abs() < 1e-4,
                "score mismatch: {} vs {}",
                h.1,
                e.1
            );
        }
    }

    /// search_exact scores are in [0, 1] for all metrics.
    #[test]
    fn test_search_exact_atlas_score_ranges() {
        for metric in &["cosine", "euclidean", "dotProduct"] {
            let mut idx = VectorIndex::new(3, metric);
            idx.insert("a", &[1.0, 0.0, 0.0]);
            idx.insert("b", &[-1.0, 0.0, 0.0]);
            idx.insert("c", &[0.0, 1.0, 0.0]);

            let results = idx.search_exact(&[1.0, 0.0, 0.0], 3);
            for (id, score) in &results {
                assert!(
                    (0.0..=1.0).contains(score),
                    "{metric}: {id} score {score} outside [0, 1]"
                );
            }
            assert!(
                (results[0].1 - 1.0).abs() < 1e-4,
                "{metric}: self-similarity should be ~1.0, got {}",
                results[0].1
            );
        }
    }
}
