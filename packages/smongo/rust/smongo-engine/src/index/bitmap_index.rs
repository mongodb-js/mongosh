//! Roaring-bitmap index for low-cardinality fields.
//!
//! Each distinct value maps to a compressed bitmap of document ordinal
//! positions.  Boolean algebra on bitmaps enables very fast multi-field
//! AND / OR / NOT filtering before any document fetch.

use std::collections::{BTreeMap, HashMap};

/// Compressed bitmap index over a single field.
///
/// Maps canonical value representations to sets of document ordinal
/// positions.  A separate `pos_to_id` table maps positions back to
/// `_id` strings for document retrieval.
pub struct BitmapIndex {
    /// value_bytes -> set of document positions
    bitmaps: BTreeMap<Vec<u8>, Vec<u32>>,
    /// position -> doc_id string
    pos_to_id: Vec<String>,
    /// doc_id -> position (for incremental updates)
    id_to_pos: HashMap<String, u32>,
    /// Next ordinal position to assign.
    next_pos: u32,
}

impl BitmapIndex {
    pub fn new() -> Self {
        Self {
            bitmaps: BTreeMap::new(),
            pos_to_id: Vec::new(),
            id_to_pos: HashMap::new(),
            next_pos: 0,
        }
    }

    /// Bulk-build from value-id pairs.
    pub fn build(entries: impl Iterator<Item = (Vec<u8>, String)>) -> Self {
        let mut idx = Self::new();
        for (value_bytes, doc_id) in entries {
            idx.insert(&doc_id, &value_bytes);
        }
        idx
    }

    /// Insert a document into the bitmap.
    pub fn insert(&mut self, doc_id: &str, value_bytes: &[u8]) {
        let pos = if let Some(&existing) = self.id_to_pos.get(doc_id) {
            existing
        } else {
            let p = self.next_pos;
            self.next_pos += 1;
            self.id_to_pos.insert(doc_id.to_string(), p);
            if p as usize >= self.pos_to_id.len() {
                self.pos_to_id.resize(p as usize + 1, String::new());
            }
            self.pos_to_id[p as usize] = doc_id.to_string();
            p
        };
        self.bitmaps
            .entry(value_bytes.to_vec())
            .or_default()
            .push(pos);
    }

    /// Remove a document from all bitmaps.
    pub fn remove(&mut self, doc_id: &str) {
        if let Some(&pos) = self.id_to_pos.get(doc_id) {
            for bitmap in self.bitmaps.values_mut() {
                bitmap.retain(|&p| p != pos);
            }
            self.id_to_pos.remove(doc_id);
            if (pos as usize) < self.pos_to_id.len() {
                self.pos_to_id[pos as usize] = String::new();
            }
        }
    }

    /// Look up all document positions matching an exact value.
    pub fn lookup(&self, value_bytes: &[u8]) -> Vec<u32> {
        self.bitmaps.get(value_bytes).cloned().unwrap_or_default()
    }

    /// Look up positions matching any value in the given set (`$in`).
    pub fn lookup_in(&self, values: &[Vec<u8>]) -> Vec<u32> {
        let mut result = Vec::new();
        for v in values {
            if let Some(positions) = self.bitmaps.get(v) {
                result.extend_from_slice(positions);
            }
        }
        result.sort_unstable();
        result.dedup();
        result
    }

    /// Look up positions in a range (inclusive) by B-tree key ordering.
    pub fn lookup_range(&self, min: Option<&[u8]>, max: Option<&[u8]>) -> Vec<u32> {
        use std::ops::Bound;
        let lo = min.map_or(Bound::Unbounded, |m| Bound::Included(m.to_vec()));
        let hi = max.map_or(Bound::Unbounded, |m| Bound::Included(m.to_vec()));
        let mut result = Vec::new();
        for (_, positions) in self.bitmaps.range((lo, hi)) {
            result.extend_from_slice(positions);
        }
        result.sort_unstable();
        result.dedup();
        result
    }

    /// Intersect two position sets (AND).
    pub fn and(a: &[u32], b: &[u32]) -> Vec<u32> {
        let set: std::collections::HashSet<u32> = a.iter().copied().collect();
        b.iter().copied().filter(|p| set.contains(p)).collect()
    }

    /// Union two position sets (OR).
    pub fn or(a: &[u32], b: &[u32]) -> Vec<u32> {
        let mut result: Vec<u32> = a.to_vec();
        result.extend_from_slice(b);
        result.sort_unstable();
        result.dedup();
        result
    }

    /// Map positions back to doc_id strings.
    pub fn positions_to_ids(&self, positions: &[u32]) -> Vec<String> {
        positions
            .iter()
            .filter_map(|&p| {
                self.pos_to_id
                    .get(p as usize)
                    .filter(|s| !s.is_empty())
                    .cloned()
            })
            .collect()
    }

    pub fn len(&self) -> usize {
        self.id_to_pos.len()
    }

    pub fn is_empty(&self) -> bool {
        self.id_to_pos.is_empty()
    }

    pub fn distinct_count(&self) -> usize {
        self.bitmaps.len()
    }
}

impl Default for BitmapIndex {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bitmap_basic() {
        let mut bm = BitmapIndex::new();
        bm.insert("doc1", b"active");
        bm.insert("doc2", b"inactive");
        bm.insert("doc3", b"active");

        let active = bm.lookup(b"active");
        assert_eq!(bm.positions_to_ids(&active).len(), 2);

        let inactive = bm.lookup(b"inactive");
        assert_eq!(bm.positions_to_ids(&inactive).len(), 1);
    }

    #[test]
    fn test_bitmap_remove() {
        let mut bm = BitmapIndex::new();
        bm.insert("a", b"yes");
        bm.insert("b", b"yes");
        bm.remove("a");
        let pos = bm.lookup(b"yes");
        let ids = bm.positions_to_ids(&pos);
        assert_eq!(ids, vec!["b"]);
    }

    #[test]
    fn test_bitmap_and_or() {
        let a = vec![1, 2, 3, 5];
        let b = vec![2, 3, 4, 6];
        let inter = BitmapIndex::and(&a, &b);
        assert!(inter.contains(&2));
        assert!(inter.contains(&3));
        assert!(!inter.contains(&1));

        let union = BitmapIndex::or(&a, &b);
        assert_eq!(union.len(), 6);
    }

    #[test]
    fn test_bitmap_lookup_in() {
        let mut bm = BitmapIndex::new();
        bm.insert("a", b"red");
        bm.insert("b", b"blue");
        bm.insert("c", b"green");
        let pos = bm.lookup_in(&[b"red".to_vec(), b"blue".to_vec()]);
        let ids = bm.positions_to_ids(&pos);
        assert_eq!(ids.len(), 2);
    }
}
