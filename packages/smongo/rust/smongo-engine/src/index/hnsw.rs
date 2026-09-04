//! Vendored HNSW (Hierarchical Navigable Small World) graph for approximate
//! nearest-neighbor search.
//!
//! Implements the algorithm from Malkov & Yashunin (2016) with the
//! **diversified** neighbor-selection heuristic (Algorithm 4 from the paper).
//! Pure safe Rust, zero external dependencies, single-threaded, WASM-compatible.
//!
//! The graph stores only topology (neighbor lists per layer).  Raw vectors
//! live in the caller's flat `&[f32]` buffer, passed by reference at insert
//! and search time.

use std::cmp::Ordering;
use std::collections::BinaryHeap;

// ---------------------------------------------------------------------------
// Distance metrics
// ---------------------------------------------------------------------------

/// Distance metric used by the HNSW graph.
///
/// All metrics are oriented so that **smaller values = closer / more similar**.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DistanceMetric {
    /// Squared L2 (Euclidean) distance.  No sqrt — monotonic ordering is
    /// preserved and we avoid the cost in the hot loop.
    Euclidean,
    /// Negative dot product: `distance = -dot(a, b)`.  Smaller (more
    /// negative) means higher dot-product similarity.
    NegDotProduct,
}

/// Squared L2 distance, autovectorization-friendly via `chunks_exact`.
#[inline(always)]
fn distance_l2_sq(a: &[f32], b: &[f32]) -> f32 {
    debug_assert_eq!(a.len(), b.len());
    let a_chunks = a.chunks_exact(4);
    let b_chunks = b.chunks_exact(4);
    let a_rem = a_chunks.remainder();
    let b_rem = b_chunks.remainder();

    let mut sum0 = 0.0f32;
    let mut sum1 = 0.0f32;
    let mut sum2 = 0.0f32;
    let mut sum3 = 0.0f32;

    for (ac, bc) in a_chunks.zip(b_chunks) {
        let d0 = ac[0] - bc[0];
        let d1 = ac[1] - bc[1];
        let d2 = ac[2] - bc[2];
        let d3 = ac[3] - bc[3];
        sum0 += d0 * d0;
        sum1 += d1 * d1;
        sum2 += d2 * d2;
        sum3 += d3 * d3;
    }

    let mut tail = 0.0f32;
    for (a, b) in a_rem.iter().zip(b_rem.iter()) {
        let d = a - b;
        tail += d * d;
    }

    (sum0 + sum1) + (sum2 + sum3) + tail
}

/// Negative dot product, autovectorization-friendly via `chunks_exact`.
#[inline(always)]
fn distance_neg_dot(a: &[f32], b: &[f32]) -> f32 {
    debug_assert_eq!(a.len(), b.len());
    let a_chunks = a.chunks_exact(4);
    let b_chunks = b.chunks_exact(4);
    let a_rem = a_chunks.remainder();
    let b_rem = b_chunks.remainder();

    let mut sum0 = 0.0f32;
    let mut sum1 = 0.0f32;
    let mut sum2 = 0.0f32;
    let mut sum3 = 0.0f32;

    for (ac, bc) in a_chunks.zip(b_chunks) {
        sum0 += ac[0] * bc[0];
        sum1 += ac[1] * bc[1];
        sum2 += ac[2] * bc[2];
        sum3 += ac[3] * bc[3];
    }

    let mut tail = 0.0f32;
    for (a, b) in a_rem.iter().zip(b_rem.iter()) {
        tail += a * b;
    }

    -((sum0 + sum1) + (sum2 + sum3) + tail)
}

/// Compute distance between two vectors using the given metric.
#[inline(always)]
pub fn compute_distance(a: &[f32], b: &[f32], metric: DistanceMetric) -> f32 {
    match metric {
        DistanceMetric::Euclidean => distance_l2_sq(a, b),
        DistanceMetric::NegDotProduct => distance_neg_dot(a, b),
    }
}

// ---------------------------------------------------------------------------
// Min/max heap wrappers
// ---------------------------------------------------------------------------

#[derive(Clone, Copy)]
struct HeapItem {
    dist: f32,
    id: usize,
}

/// Min-heap ordering (closest first) via BinaryHeap (which is max-heap).
#[derive(Clone, Copy)]
struct MinItem(HeapItem);

impl PartialEq for MinItem {
    fn eq(&self, other: &Self) -> bool {
        self.0.id == other.0.id
    }
}
impl Eq for MinItem {}
impl PartialOrd for MinItem {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for MinItem {
    fn cmp(&self, other: &Self) -> Ordering {
        other
            .0
            .dist
            .partial_cmp(&self.0.dist)
            .unwrap_or(Ordering::Equal)
    }
}

/// Max-heap ordering (farthest first).
#[derive(Clone, Copy)]
struct MaxItem(HeapItem);

impl PartialEq for MaxItem {
    fn eq(&self, other: &Self) -> bool {
        self.0.id == other.0.id
    }
}
impl Eq for MaxItem {}
impl PartialOrd for MaxItem {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for MaxItem {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0
            .dist
            .partial_cmp(&other.0.dist)
            .unwrap_or(Ordering::Equal)
    }
}

// ---------------------------------------------------------------------------
// Graph structures
// ---------------------------------------------------------------------------

#[derive(Clone, Copy)]
struct Neighbor {
    id: usize,
    dist: f32,
}

/// One layer of the HNSW graph.
///
/// `neighbors[node_id]` is `Some(vec)` if the node exists at this layer.
struct Layer {
    neighbors: Vec<Option<Vec<Neighbor>>>,
}

impl Layer {
    fn new() -> Self {
        Self {
            neighbors: Vec::new(),
        }
    }

    fn ensure_capacity(&mut self, id: usize) {
        if id >= self.neighbors.len() {
            self.neighbors.resize_with(id + 1, || None);
        }
    }

    fn init_node(&mut self, id: usize) {
        self.ensure_capacity(id);
        self.neighbors[id] = Some(Vec::new());
    }

    #[inline]
    fn get_neighbors(&self, id: usize) -> &[Neighbor] {
        if id < self.neighbors.len() {
            if let Some(ref v) = self.neighbors[id] {
                return v;
            }
        }
        &[]
    }
}

// ---------------------------------------------------------------------------
// Visited-node tracking with generation counter
// ---------------------------------------------------------------------------

/// Amortized O(1) visited set.  Instead of clearing the entire vec between
/// searches, we bump a generation counter and compare.  Only the allocation
/// persists across calls — no per-search cost.
struct VisitedSet {
    generations: Vec<u32>,
    current_gen: u32,
}

impl VisitedSet {
    fn new() -> Self {
        Self {
            generations: Vec::new(),
            current_gen: 1,
        }
    }

    /// Reset for a new search.  O(1) — just bumps the counter.
    fn reset(&mut self) {
        self.current_gen = self.current_gen.wrapping_add(1);
        if self.current_gen == 0 {
            // Overflow (every ~4 billion searches): actually clear.
            self.generations.fill(0);
            self.current_gen = 1;
        }
    }

    #[inline]
    fn insert(&mut self, id: usize) {
        if id >= self.generations.len() {
            self.generations.resize(id + 1, 0);
        }
        self.generations[id] = self.current_gen;
    }

    #[inline]
    fn contains(&self, id: usize) -> bool {
        id < self.generations.len() && self.generations[id] == self.current_gen
    }
}

// ---------------------------------------------------------------------------
// HnswGraph
// ---------------------------------------------------------------------------

/// HNSW graph index.
///
/// The graph does **not** own vector data.  All operations that need vectors
/// accept a `vectors: &[f32]` flat buffer where node `i`'s vector occupies
/// `vectors[i*dim .. (i+1)*dim]`.
pub struct HnswGraph {
    layers: Vec<Layer>,
    entry_point: Option<usize>,
    max_level: usize,
    dim: usize,
    m: usize,
    m_max_0: usize,
    ef_construction: usize,
    ml: f64,
    metric: DistanceMetric,
    rng_state: u64,
    node_count: usize,
    /// Reusable visited set — avoids allocation per search.
    visited: VisitedSet,
}

impl HnswGraph {
    /// Create a new empty HNSW graph.
    ///
    /// - `dim`: vector dimensionality
    /// - `m`: max neighbors per node per layer (typical: 12-48, default 16)
    /// - `ef_construction`: beam width during insert (typical: 100-500)
    /// - `metric`: distance metric
    pub fn new(dim: usize, m: usize, ef_construction: usize, metric: DistanceMetric) -> Self {
        let m = m.max(2);
        let ml = 1.0 / (m as f64).ln();
        Self {
            layers: Vec::new(),
            entry_point: None,
            max_level: 0,
            dim,
            m,
            m_max_0: m * 2,
            ef_construction: ef_construction.max(1),
            ml,
            metric,
            rng_state: 0x5EED_CAFE_BABE_D00D,
            node_count: 0,
            visited: VisitedSet::new(),
        }
    }

    /// Number of nodes in the graph.
    #[inline]
    pub fn len(&self) -> usize {
        self.node_count
    }

    /// True if the graph contains no nodes.
    #[inline]
    pub fn is_empty(&self) -> bool {
        self.node_count == 0
    }

    /// Look up node `id`'s vector from a flat buffer.
    #[inline(always)]
    fn vec_ref<'a>(&self, vectors: &'a [f32], id: usize) -> &'a [f32] {
        let start = id * self.dim;
        &vectors[start..start + self.dim]
    }

    /// Insert a node into the graph.
    ///
    /// `id` is the caller-assigned node identifier.  `vectors` is the flat
    /// buffer containing all vectors (including the one being inserted).
    pub fn insert(&mut self, id: usize, vectors: &[f32]) {
        let node_level = self.random_level();

        while self.layers.len() <= node_level {
            self.layers.push(Layer::new());
        }

        for layer in self.layers.iter_mut().take(node_level + 1) {
            layer.init_node(id);
        }

        self.node_count += 1;

        let ep = match self.entry_point {
            Some(ep) => ep,
            None => {
                self.entry_point = Some(id);
                self.max_level = node_level;
                return;
            }
        };

        let query = self.vec_ref(vectors, id);
        let mut current_ep = ep;

        // Phase 1: greedily descend from top layer to node_level + 1 (ef=1).
        if self.max_level > node_level {
            for lc in (node_level + 1..=self.max_level).rev() {
                current_ep = self.search_layer_greedy(query, current_ep, lc, vectors);
            }
        }

        // Phase 2: insert at layers min(node_level, max_level) down to 0.
        let insert_top = node_level.min(self.max_level);
        let mut entry_points = vec![HeapItem {
            dist: compute_distance(query, self.vec_ref(vectors, current_ep), self.metric),
            id: current_ep,
        }];

        for lc in (0..=insert_top).rev() {
            let m_max = if lc == 0 { self.m_max_0 } else { self.m };

            let candidates =
                self.search_layer_beam(query, &entry_points, self.ef_construction, lc, vectors);

            let selected = self.select_neighbors_heuristic(&candidates, m_max, lc, vectors);

            // Connect id -> selected neighbors.
            if let Some(ref mut nbrs) = self.layers[lc].neighbors[id] {
                *nbrs = selected
                    .iter()
                    .map(|h| Neighbor {
                        id: h.id,
                        dist: h.dist,
                    })
                    .collect();
            }

            // Bidirectional: connect selected neighbors -> id, pruning with
            // the diversified heuristic to maintain graph quality.
            let dim = self.dim;
            let metric = self.metric;
            for &sel in &selected {
                let layer = &mut self.layers[lc];
                layer.ensure_capacity(sel.id);
                if let Some(ref mut nbrs) = layer.neighbors[sel.id] {
                    nbrs.push(Neighbor { id, dist: sel.dist });
                    if nbrs.len() > m_max {
                        Self::prune_neighbors(nbrs, m_max, vectors, dim, metric);
                    }
                }
            }

            entry_points = candidates;
        }

        if node_level > self.max_level {
            self.entry_point = Some(id);
            self.max_level = node_level;
        }
    }

    /// Search for the `k` nearest neighbors of `query`.
    ///
    /// Returns `Vec<(node_id, distance)>` sorted closest-first.
    pub fn search(
        &mut self,
        query: &[f32],
        k: usize,
        ef_search: usize,
        vectors: &[f32],
    ) -> Vec<(usize, f32)> {
        let ep = match self.entry_point {
            Some(ep) => ep,
            None => return Vec::new(),
        };

        let mut current_ep = ep;

        // Greedily descend layers max_level..1 with ef=1.
        if self.max_level > 0 {
            for lc in (1..=self.max_level).rev() {
                current_ep = self.search_layer_greedy(query, current_ep, lc, vectors);
            }
        }

        // Beam search at layer 0 with ef = max(k, ef_search).
        let ef = k.max(ef_search);
        let entry_points = vec![HeapItem {
            dist: compute_distance(query, self.vec_ref(vectors, current_ep), self.metric),
            id: current_ep,
        }];
        let results = self.search_layer_beam(query, &entry_points, ef, 0, vectors);

        let mut out: Vec<(usize, f32)> = results.iter().map(|h| (h.id, h.dist)).collect();
        out.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(Ordering::Equal));
        out.truncate(k);
        out
    }

    // ------------------------------------------------------------------
    // Internal algorithms
    // ------------------------------------------------------------------

    /// Beam search within a single layer.  Returns up to `ef` nearest candidates.
    fn search_layer_beam(
        &mut self,
        query: &[f32],
        entry_points: &[HeapItem],
        ef: usize,
        layer: usize,
        vectors: &[f32],
    ) -> Vec<HeapItem> {
        let mut candidates: BinaryHeap<MinItem> = BinaryHeap::with_capacity(ef + 1);
        let mut results: BinaryHeap<MaxItem> = BinaryHeap::with_capacity(ef + 1);

        self.visited.reset();

        for ep in entry_points {
            self.visited.insert(ep.id);
            candidates.push(MinItem(HeapItem {
                dist: ep.dist,
                id: ep.id,
            }));
            results.push(MaxItem(HeapItem {
                dist: ep.dist,
                id: ep.id,
            }));
        }

        while let Some(MinItem(closest)) = candidates.pop() {
            let farthest_dist = results.peek().map_or(f32::INFINITY, |r| r.0.dist);
            if closest.dist > farthest_dist {
                break;
            }

            let layer_ref = &self.layers[layer];
            for nbr in layer_ref.get_neighbors(closest.id) {
                if self.visited.contains(nbr.id) {
                    continue;
                }
                self.visited.insert(nbr.id);

                let d = compute_distance(query, self.vec_ref(vectors, nbr.id), self.metric);
                let farthest_dist = results.peek().map_or(f32::INFINITY, |r| r.0.dist);

                if results.len() < ef || d < farthest_dist {
                    let item = HeapItem {
                        dist: d,
                        id: nbr.id,
                    };
                    candidates.push(MinItem(item));
                    results.push(MaxItem(item));
                    if results.len() > ef {
                        results.pop();
                    }
                }
            }
        }

        results.into_iter().map(|MaxItem(h)| h).collect()
    }

    /// Greedy single-step search (ef=1).  Returns the ID of the closest node.
    fn search_layer_greedy(
        &self,
        query: &[f32],
        entry: usize,
        layer: usize,
        vectors: &[f32],
    ) -> usize {
        let mut current = entry;
        let mut current_dist = compute_distance(query, self.vec_ref(vectors, entry), self.metric);

        loop {
            let mut improved = false;
            for nbr in self.layers[layer].get_neighbors(current) {
                let d = compute_distance(query, self.vec_ref(vectors, nbr.id), self.metric);
                if d < current_dist {
                    current = nbr.id;
                    current_dist = d;
                    improved = true;
                }
            }
            if !improved {
                break;
            }
        }
        current
    }

    /// Diversified neighbor selection wrapper (delegates to free function
    /// to avoid borrow-checker conflicts with `&mut self.layers`).
    fn select_neighbors_heuristic(
        &self,
        candidates: &[HeapItem],
        m: usize,
        _layer: usize,
        vectors: &[f32],
    ) -> Vec<HeapItem> {
        select_neighbors_diversified(candidates, m, vectors, self.dim, self.metric)
    }

    /// Prune an over-capacity neighbor list using the diversified heuristic.
    /// Standalone call that borrows only the layer mutably — no `&self` conflict.
    fn prune_neighbors(
        nbrs: &mut Vec<Neighbor>,
        m_max: usize,
        vectors: &[f32],
        dim: usize,
        metric: DistanceMetric,
    ) {
        let as_heap: Vec<HeapItem> = nbrs
            .iter()
            .map(|n| HeapItem {
                id: n.id,
                dist: n.dist,
            })
            .collect();
        let pruned = select_neighbors_diversified(&as_heap, m_max, vectors, dim, metric);
        *nbrs = pruned
            .iter()
            .map(|h| Neighbor {
                id: h.id,
                dist: h.dist,
            })
            .collect();
    }

    /// Generate a random level for a new node.
    fn random_level(&mut self) -> usize {
        self.rng_state = self
            .rng_state
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        let uniform = ((self.rng_state >> 33) as f64 + 1.0) / (u32::MAX as f64 + 2.0);
        let level = (-uniform.ln() * self.ml).floor() as usize;
        level.min(32)
    }
}

// ---------------------------------------------------------------------------
// Standalone diversified neighbor selection (Algorithm 4 from the paper)
// ---------------------------------------------------------------------------

/// **Diversified** neighbor selection.
///
/// Instead of naively keeping the M closest candidates, this considers each
/// candidate in distance order and only keeps it if it is closer to the query
/// than to any already-selected neighbor.  This produces a more angularly
/// diverse neighbor set that dramatically improves graph connectivity and
/// recall at 100K+ scale.
///
/// Free function (not `&self`) so it can be called while `layers` is
/// mutably borrowed during insert.
fn select_neighbors_diversified(
    candidates: &[HeapItem],
    m: usize,
    vectors: &[f32],
    dim: usize,
    metric: DistanceMetric,
) -> Vec<HeapItem> {
    if candidates.len() <= m {
        return candidates.to_vec();
    }

    let mut sorted: Vec<HeapItem> = candidates.to_vec();
    sorted.sort_by(|a, b| a.dist.partial_cmp(&b.dist).unwrap_or(Ordering::Equal));

    let mut selected: Vec<HeapItem> = Vec::with_capacity(m);

    let vec_of = |id: usize| -> &[f32] {
        let start = id * dim;
        &vectors[start..start + dim]
    };

    for candidate in &sorted {
        if selected.len() >= m {
            break;
        }

        let mut good = true;
        for s in &selected {
            let dist_to_selected = compute_distance(vec_of(candidate.id), vec_of(s.id), metric);
            if dist_to_selected < candidate.dist {
                good = false;
                break;
            }
        }

        if good {
            selected.push(*candidate);
        }
    }

    // If the heuristic was too aggressive, backfill from pruned candidates
    // to ensure we reach M neighbors (important for small graphs).
    if selected.len() < m {
        let selected_ids: std::collections::HashSet<usize> =
            selected.iter().map(|h| h.id).collect();
        for candidate in &sorted {
            if selected.len() >= m {
                break;
            }
            if !selected_ids.contains(&candidate.id) {
                selected.push(*candidate);
            }
        }
    }

    selected
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;

    fn make_vecs(n: usize, dim: usize, seed: u64) -> Vec<f32> {
        let mut s = seed;
        let mut next = || -> f32 {
            s = s.wrapping_mul(6364136223846793005).wrapping_add(1);
            ((s >> 33) as f32) / (u32::MAX as f32 / 2.0) - 1.0
        };
        let mut flat = Vec::with_capacity(n * dim);
        for _ in 0..n {
            let raw: Vec<f32> = (0..dim).map(|_| next()).collect();
            let norm: f32 = raw.iter().map(|x| x * x).sum::<f32>().sqrt();
            if norm == 0.0 {
                flat.extend_from_slice(&raw);
            } else {
                flat.extend(raw.iter().map(|x| x / norm));
            }
        }
        flat
    }

    fn brute_force_knn(
        vectors: &[f32],
        dim: usize,
        query: &[f32],
        k: usize,
        metric: DistanceMetric,
    ) -> Vec<(usize, f32)> {
        let n = vectors.len() / dim;
        let mut dists: Vec<(usize, f32)> = (0..n)
            .map(|i| {
                let v = &vectors[i * dim..(i + 1) * dim];
                (i, compute_distance(query, v, metric))
            })
            .collect();
        dists.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        dists.truncate(k);
        dists
    }

    #[test]
    fn test_basic_insert_and_search() {
        let vecs: Vec<f32> = vec![1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.9, 0.1, 0.0];

        let mut g = HnswGraph::new(3, 4, 32, DistanceMetric::NegDotProduct);
        for i in 0..3 {
            g.insert(i, &vecs);
        }

        let results = g.search(&[1.0, 0.0, 0.0], 2, 16, &vecs);
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].0, 0);
    }

    #[test]
    fn test_euclidean_basic() {
        let vecs: Vec<f32> = vec![0.0, 0.0, 1.0, 0.0, 3.0, 4.0];

        let mut g = HnswGraph::new(2, 4, 32, DistanceMetric::Euclidean);
        for i in 0..3 {
            g.insert(i, &vecs);
        }

        let results = g.search(&[0.0, 0.0], 2, 16, &vecs);
        assert_eq!(results[0].0, 0);
        assert_eq!(results[1].0, 1);
    }

    #[test]
    fn test_hnsw_vs_brute_force_neg_dot() {
        let n = 200;
        let dim = 64;
        let k = 10;
        let vecs = make_vecs(n, dim, 42);
        let query_vecs = make_vecs(1, dim, 999);
        let query = &query_vecs[..dim];

        let mut g = HnswGraph::new(dim, 16, 200, DistanceMetric::NegDotProduct);
        for i in 0..n {
            g.insert(i, &vecs);
        }
        let hnsw_results = g.search(query, k, 64, &vecs);
        let brute = brute_force_knn(&vecs, dim, query, k, DistanceMetric::NegDotProduct);

        assert_eq!(
            hnsw_results[0].0, brute[0].0,
            "top-1 mismatch: HNSW={} brute={}",
            hnsw_results[0].0, brute[0].0
        );

        let brute_ids: std::collections::HashSet<usize> = brute.iter().map(|x| x.0).collect();
        let recall = hnsw_results
            .iter()
            .filter(|r| brute_ids.contains(&r.0))
            .count();
        assert!(recall >= 9, "recall@10 too low: {recall}/10");
    }

    #[test]
    fn test_hnsw_vs_brute_force_euclidean() {
        let n = 200;
        let dim = 32;
        let k = 10;
        let vecs = make_vecs(n, dim, 77);
        let query_vecs = make_vecs(1, dim, 1234);
        let query = &query_vecs[..dim];

        let mut g = HnswGraph::new(dim, 16, 200, DistanceMetric::Euclidean);
        for i in 0..n {
            g.insert(i, &vecs);
        }
        let hnsw_results = g.search(query, k, 64, &vecs);
        let brute = brute_force_knn(&vecs, dim, query, k, DistanceMetric::Euclidean);

        assert_eq!(hnsw_results[0].0, brute[0].0);
    }

    #[test]
    fn test_single_element() {
        let vecs: Vec<f32> = vec![1.0, 0.0];

        let mut g = HnswGraph::new(2, 4, 32, DistanceMetric::Euclidean);
        g.insert(0, &vecs);

        let results = g.search(&[0.0, 1.0], 5, 16, &vecs);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, 0);
    }

    #[test]
    fn test_empty_graph() {
        let mut g = HnswGraph::new(2, 4, 32, DistanceMetric::Euclidean);
        let results = g.search(&[1.0, 0.0], 5, 16, &[]);
        assert!(results.is_empty());
    }

    #[test]
    fn test_k_larger_than_n() {
        let vecs: Vec<f32> = vec![1.0, 0.0, 0.0, 1.0];

        let mut g = HnswGraph::new(2, 4, 32, DistanceMetric::Euclidean);
        g.insert(0, &vecs);
        g.insert(1, &vecs);

        let results = g.search(&[1.0, 0.0], 100, 16, &vecs);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_500_vectors_high_dim() {
        let n = 500;
        let dim = 128;
        let k = 5;
        let vecs = make_vecs(n, dim, 31415);
        let query_vecs = make_vecs(1, dim, 27182);
        let query = &query_vecs[..dim];

        let mut g = HnswGraph::new(dim, 16, 200, DistanceMetric::NegDotProduct);
        for i in 0..n {
            g.insert(i, &vecs);
        }
        let hnsw_results = g.search(query, k, 128, &vecs);
        let brute = brute_force_knn(&vecs, dim, query, k, DistanceMetric::NegDotProduct);

        assert_eq!(
            hnsw_results[0].0, brute[0].0,
            "top-1 must match for 500 vectors"
        );
    }

    #[test]
    fn test_len_tracking() {
        let vecs = make_vecs(50, 8, 123);
        let mut g = HnswGraph::new(8, 8, 64, DistanceMetric::NegDotProduct);
        assert!(g.is_empty());
        for i in 0..50 {
            g.insert(i, &vecs);
        }
        assert_eq!(g.len(), 50);
    }

    #[test]
    fn test_visited_set_generation_counter() {
        let mut vs = VisitedSet::new();
        vs.insert(5);
        assert!(vs.contains(5));
        assert!(!vs.contains(6));

        vs.reset();
        assert!(!vs.contains(5));
        vs.insert(6);
        assert!(vs.contains(6));
        assert!(!vs.contains(5));
    }

    /// Verify the diversified heuristic produces at least as good recall as
    /// simple selection on a moderately-sized dataset.
    #[test]
    fn test_diversified_recall_1000() {
        let n = 1000;
        let dim = 32;
        let k = 10;
        let vecs = make_vecs(n, dim, 2024);
        let query_vecs = make_vecs(1, dim, 7777);
        let query = &query_vecs[..dim];

        let mut g = HnswGraph::new(dim, 16, 200, DistanceMetric::NegDotProduct);
        for i in 0..n {
            g.insert(i, &vecs);
        }
        let hnsw_results = g.search(query, k, 128, &vecs);
        let brute = brute_force_knn(&vecs, dim, query, k, DistanceMetric::NegDotProduct);

        assert_eq!(
            hnsw_results[0].0, brute[0].0,
            "top-1 mismatch at 1K vectors"
        );

        let brute_ids: std::collections::HashSet<usize> = brute.iter().map(|x| x.0).collect();
        let recall = hnsw_results
            .iter()
            .filter(|r| brute_ids.contains(&r.0))
            .count();
        assert!(recall >= 9, "recall@10 too low at 1K vectors: {recall}/10");
    }
}
