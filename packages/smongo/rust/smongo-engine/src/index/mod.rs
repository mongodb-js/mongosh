//! MongoDB-compatible index support for query optimization.
//!
//! Supports B-tree, `2dsphere`, text, vector search, bitmap, and prefix
//! index types through a unified [`IndexType`] enum.  The planner, storage,
//! and write-maintenance code dispatch via exhaustive `match` on this enum
//! so that adding a new type is a compile error until every path is handled.

pub mod bitmap_index;
pub mod hnsw;
pub mod prefix_index;
pub mod text_index;
pub mod vector_index;

use bson::{Bson, Document};
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// IndexType — the single discriminator for all index kinds
// ---------------------------------------------------------------------------

/// Discriminator for all supported index types.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum IndexType {
    /// Standard B-tree index (default).  Keys use integer directions (1 / -1).
    BTree,
    /// Spherical geo index.  Keys use `"2dsphere"` or `"2d"` string values.
    TwoDSphere,
    /// Full-text inverted index.  Keys use `"text"` string values.
    Text,
    /// Vector similarity search index (HNSW or flat, per `indexingMethod`).
    VectorSearch,
    /// Roaring-bitmap index for low-cardinality fields.
    Bitmap,
    /// Prefix-truncated B-tree index for long string keys.
    Prefix,
}

/// Resolve the effective [`IndexType`] from key definitions and options.
///
/// Priority: explicit `opts.index_type` > key-string detection > `BTree` default.
pub fn resolve_index_type(keys: &Document, opts: &IndexOptions) -> IndexType {
    if let Some(ref explicit) = opts.index_type {
        return explicit.clone();
    }
    if is_2dsphere_keys(keys) {
        return IndexType::TwoDSphere;
    }
    if is_text_keys(keys) {
        return IndexType::Text;
    }
    IndexType::BTree
}

// ---------------------------------------------------------------------------
// Key-pattern helpers
// ---------------------------------------------------------------------------

/// `true` if keys are `{ "field": "2dsphere" }` or `{ "field": "2d" }` (single-field spherical geo).
pub fn is_2dsphere_keys(keys: &Document) -> bool {
    if keys.len() != 1 {
        return false;
    }
    keys.values()
        .all(|v| matches!(v, Bson::String(s) if s == "2dsphere" || s == "2d"))
}

/// Field name for a single-field `2dsphere` index, or `None`.
pub fn twodsphere_field(keys: &Document) -> Option<String> {
    if !is_2dsphere_keys(keys) {
        return None;
    }
    keys.keys().next().cloned()
}

/// `true` if any key value is the string `"text"`.
pub fn is_text_keys(keys: &Document) -> bool {
    keys.values()
        .any(|v| matches!(v, Bson::String(s) if s == "text"))
}

/// Return all field names whose direction is `"text"`.
pub fn text_fields(keys: &Document) -> Vec<String> {
    keys.iter()
        .filter(|(_, v)| matches!(v, Bson::String(s) if s == "text"))
        .map(|(k, _)| k.clone())
        .collect()
}

/// Return the single vector field name from a vector index key document.
pub fn vector_field(keys: &Document) -> Option<String> {
    if keys.len() == 1 {
        keys.keys().next().cloned()
    } else {
        None
    }
}

// ---------------------------------------------------------------------------
// IndexSpec / IndexOptions
// ---------------------------------------------------------------------------

/// Index specification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexSpec {
    /// Index name
    pub name: String,
    /// Index keys (field -> direction: 1 for ascending, -1 for descending)
    pub keys: Document,
    /// Index options
    pub options: IndexOptions,
}

/// Options for index creation
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct IndexOptions {
    /// Explicit index name (MongoDB `name`). When set, overrides [`generate_index_name`].
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// Unique constraint
    pub unique: bool,
    /// Sparse index (only index documents with the field)
    pub sparse: bool,
    /// Background index creation (not yet supported)
    pub background: bool,
    /// TTL: automatically delete documents after this many seconds.
    /// Only valid on single-field indexes over a DateTime field.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expire_after_seconds: Option<u64>,
    /// Partial filter expression — only index documents matching this filter.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub partial_filter_expression: Option<Document>,
    /// Collation options for string comparison in the index.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub collation: Option<Document>,
    /// Explicit index type override. When `None`, the type is inferred from the
    /// key document (e.g. `"2dsphere"` string -> [`IndexType::TwoDSphere`]).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub index_type: Option<IndexType>,
    /// Options specific to vector search indexes.
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        alias = "vectorSearchOptions"
    )]
    pub vector_options: Option<VectorIndexOptions>,
    /// Options specific to full-text indexes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text_options: Option<TextIndexOptions>,
    /// Options specific to prefix indexes.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub prefix_options: Option<PrefixOptions>,
}

// ---------------------------------------------------------------------------
// Per-type option structs
// ---------------------------------------------------------------------------

/// Configuration for vector search indexes.
///
/// Supports two indexing methods matching
/// [Atlas Vector Search](https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-type/):
///
/// - **`"hnsw"`** (default): approximate nearest-neighbor via HNSW graph.
///   Best for datasets > 10K vectors per filtered partition.
/// - **`"flat"`**: exhaustive brute-force scan.  Optimal for multi-tenant
///   workloads with many small tenants (< 10K vectors each after
///   pre-filtering by `tenant_id`).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorIndexOptions {
    /// Number of dimensions in each vector.
    /// Atlas uses `numDimensions` in index definitions; both are accepted.
    #[serde(alias = "numDimensions")]
    pub dimensions: usize,
    /// Similarity metric: `"cosine"`, `"euclidean"`, or `"dotProduct"`.
    /// Atlas uses `similarity` in index definitions; both are accepted.
    #[serde(default = "default_vector_metric", alias = "similarity")]
    pub metric: String,
    /// Indexing method: `"hnsw"` (default) or `"flat"`.
    ///
    /// Flat indexes skip HNSW graph construction and perform exhaustive scan.
    /// Recommended for multi-tenant workloads where each tenant has < 10K
    /// vectors and queries always include a `tenant_id` pre-filter.
    #[serde(default = "default_indexing_method", skip_serializing_if = "is_hnsw")]
    pub indexing_method: String,
    /// HNSW construction-time expansion factor (default 200).
    /// Ignored when `indexing_method` is `"flat"`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub ef_construction: Option<usize>,
    /// HNSW max connections per layer (default 16).
    /// Ignored when `indexing_method` is `"flat"`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub m: Option<usize>,
}

fn default_indexing_method() -> String {
    "hnsw".to_string()
}

fn is_hnsw(s: &String) -> bool {
    s == "hnsw"
}

fn default_vector_metric() -> String {
    "cosine".to_string()
}

/// Configuration for full-text indexes.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TextIndexOptions {
    /// Default language for stemming (future).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_language: Option<String>,
    /// Per-field weights for relevance scoring.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub weights: Option<Document>,
}

/// Configuration for prefix-truncated indexes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrefixOptions {
    /// Maximum number of bytes stored per key field.
    pub prefix_length: usize,
}

// ---------------------------------------------------------------------------
// IndexDirection
// ---------------------------------------------------------------------------

/// Index direction
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IndexDirection {
    /// Ascending (1)
    Ascending,
    /// Descending (-1)
    Descending,
}

impl IndexDirection {
    /// Parse from BSON value
    pub fn from_bson(value: &Bson) -> Option<Self> {
        match value {
            Bson::Int32(1) | Bson::Int64(1) => Some(IndexDirection::Ascending),
            Bson::Int32(-1) | Bson::Int64(-1) => Some(IndexDirection::Descending),
            _ => None,
        }
    }
}

/// Extract index key from a document
///
/// # Arguments
///
/// * `doc` - Document to extract key from
/// * `keys` - Index key specification
///
/// # Returns
///
/// Serialized key bytes for the index
pub fn extract_index_key(doc: &Document, keys: &Document) -> Vec<u8> {
    extract_index_key_with_collation(doc, keys, None)
}

/// Build a B-tree key from `doc` for the given index `keys`, optionally
/// applying `collation` to string fields.
pub fn extract_index_key_with_collation(
    doc: &Document,
    keys: &Document,
    collation: Option<&crate::collation::Collation>,
) -> Vec<u8> {
    use crate::paths::get_value;

    let mut key_parts = Vec::new();

    for (field, direction) in keys {
        let value = get_value(doc, field);
        let descending = IndexDirection::from_bson(direction) == Some(IndexDirection::Descending);

        let mut serialized = match value {
            Some(Bson::Null) => vec![0x00],
            Some(Bson::Int32(n)) => n.to_be_bytes().to_vec(),
            Some(Bson::Int64(n)) => n.to_be_bytes().to_vec(),
            Some(Bson::Double(n)) => n.to_be_bytes().to_vec(),
            Some(Bson::String(s)) => match collation {
                Some(c) => c.index_key_bytes(s),
                None => s.as_bytes().to_vec(),
            },
            Some(Bson::ObjectId(oid)) => oid.bytes().to_vec(),
            Some(Bson::Boolean(b)) => vec![if *b { 0x01 } else { 0x00 }],
            Some(Bson::DateTime(dt)) => dt.timestamp_millis().to_be_bytes().to_vec(),
            Some(_other) => {
                vec![0x02]
            }
            None => vec![0xFF],
        };

        if descending {
            invert_bytes(&mut serialized);
        }

        key_parts.push(serialized);
    }

    let mut result = Vec::new();
    for (i, part) in key_parts.iter().enumerate() {
        if i > 0 {
            result.push(0xFE);
        }
        result.extend_from_slice(part);
    }

    result
}

/// XOR every byte with 0xFF, reversing the sort order of a byte string.
fn invert_bytes(bytes: &mut [u8]) {
    for b in bytes.iter_mut() {
        *b ^= 0xFF;
    }
}

/// Decode index key bytes back into field values for covering index queries
///
/// Note: Index keys are stored as: field1|field2|...|fieldN|_id_str
/// We only decode the indexed fields, not the trailing _id.
pub fn decode_index_key(key_bytes: &[u8], index_keys: &Document) -> Option<Document> {
    let mut result = Document::new();
    let parts: Vec<&[u8]> = key_bytes.split(|&b| b == 0xFE).collect();

    if parts.len() < index_keys.len() {
        return None;
    }

    for (i, (field, direction)) in index_keys.iter().enumerate() {
        if i >= parts.len() {
            break;
        }
        let descending = IndexDirection::from_bson(direction) == Some(IndexDirection::Descending);
        let mut part = parts[i].to_vec();
        if descending {
            invert_bytes(&mut part);
        }
        let value = decode_index_value_part(&part)?;
        result.insert(field.clone(), value);
    }

    Some(result)
}

/// Decode a single field value from index key bytes
fn decode_index_value_part(bytes: &[u8]) -> Option<Bson> {
    if bytes.is_empty() {
        return None;
    }

    // Check for special markers first
    if bytes[0] == 0xFF {
        return None; // Missing field
    }

    if bytes[0] == 0x01 && bytes.len() == 1 {
        return Some(Bson::Boolean(true));
    }

    if bytes[0] == 0x00 && bytes.len() == 1 {
        return Some(Bson::Boolean(false));
    }

    // Try to decode as UTF-8 string first (most common for text fields)
    if let Ok(s) = std::str::from_utf8(bytes) {
        // If it's all printable ASCII or valid UTF-8, it's probably a string
        if !s.is_empty()
            && s.chars()
                .all(|c| c.is_alphanumeric() || c.is_whitespace() || "_-./".contains(c))
        {
            return Some(Bson::String(s.to_string()));
        }
    }

    // Try fixed-width numeric types
    // For the last field before _id, we may have extra bytes appended (the _id)
    if bytes.len() >= 4 {
        // Check if first 4 bytes could be Int32
        if bytes.len() == 4
            || (bytes.len() > 4 && bytes[4..].iter().all(|&b| (32..=126).contains(&b)))
        {
            // Either exactly 4 bytes, or 4 bytes followed by ASCII (the _id)
            let arr: [u8; 4] = bytes[0..4].try_into().ok()?;
            return Some(Bson::Int32(i32::from_be_bytes(arr)));
        }
    }

    if bytes.len() == 8 {
        let arr: [u8; 8] = bytes.try_into().ok()?;
        return Some(Bson::Int64(i64::from_be_bytes(arr)));
    }

    if bytes.len() == 12 {
        let arr: [u8; 12] = bytes.try_into().ok()?;
        return Some(Bson::ObjectId(bson::oid::ObjectId::from_bytes(arr)));
    }

    // Fallback: treat as string even if not all printable
    std::str::from_utf8(bytes)
        .ok()
        .map(|s| Bson::String(s.to_string()))
}

/// `2dsphere` index key bytes, or `None` if the document has no indexed point (sparse skip).
pub fn twodsphere_index_key(doc: &Document, keys: &Document) -> Option<Vec<u8>> {
    let field = twodsphere_field(keys)?;
    let val = crate::paths::get_value(doc, &field);
    let (lon, lat) = crate::geo::extract_lon_lat(val)?;
    let cell = crate::geo::cell_key_for_point(lon, lat);
    let id = match doc.get("_id") {
        Some(Bson::ObjectId(oid)) => oid.to_hex(),
        Some(Bson::String(s)) => s.clone(),
        Some(Bson::Int32(i)) => i.to_string(),
        Some(Bson::Int64(i)) => i.to_string(),
        Some(other) => format!("{}", other),
        None => return None,
    };
    let mut s = format!("{:016X}|", cell);
    s.push_str(&id);
    Some(s.into_bytes())
}

/// Generate index name from keys
///
/// # Arguments
///
/// * `keys` - Index key specification
///
/// # Returns
///
/// Generated index name (e.g., "field1_1_field2_-1")
pub fn generate_index_name(keys: &Document) -> String {
    let mut parts = Vec::new();

    for (field, direction) in keys {
        let dir_str = match direction {
            Bson::Int32(1) | Bson::Int64(1) => "1",
            Bson::Int32(-1) | Bson::Int64(-1) => "-1",
            Bson::String(s) => s.as_str(),
            _ => "1",
        };
        parts.push(format!("{}_{}", field, dir_str));
    }

    parts.join("_")
}

/// Rejects names that break storage layout (`collection.idx_<name>`) or collide with reserved ids.
pub fn validate_custom_index_name(name: &str) -> Result<(), String> {
    if name.contains('.') || name.contains('/') || name.contains('\\') {
        return Err(format!(
            "index name must not contain '.', '/', or '\\\\': {name:?}"
        ));
    }
    if name == "_id_" {
        return Err("index name '_id_' is reserved".to_string());
    }
    Ok(())
}

/// Check if a query can use an index
///
/// # Arguments
///
/// * `query` - Query document
/// * `index_keys` - Index key specification
///
/// # Returns
///
/// true if the query can potentially use this index
pub fn can_use_index(query: &Document, index_keys: &Document) -> bool {
    // Simple heuristic: check if any query field matches an index field
    // More sophisticated query planning could be added later

    for query_field in query.keys() {
        // Skip operators
        if query_field.starts_with('$') {
            continue;
        }

        // Check if this field is in the index
        if index_keys.contains_key(query_field) {
            return true;
        }
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;

    #[test]
    fn test_validate_custom_index_name() {
        assert!(validate_custom_index_name("ok_name_1").is_ok());
        assert!(validate_custom_index_name("bad.dot").is_err());
        assert!(validate_custom_index_name("_id_").is_err());
    }

    #[test]
    fn test_generate_index_name() {
        let keys = doc! { "email": 1 };
        assert_eq!(generate_index_name(&keys), "email_1");

        let keys = doc! { "age": 1, "name": -1 };
        let name = generate_index_name(&keys);
        assert!(name.contains("age_1"));
        assert!(name.contains("name_-1"));
    }

    #[test]
    fn test_extract_index_key() {
        let doc = doc! { "name": "Alice", "age": 30 };
        let keys = doc! { "age": 1 };
        let key = extract_index_key(&doc, &keys);
        assert!(!key.is_empty());
    }

    #[test]
    fn test_can_use_index() {
        let index_keys = doc! { "email": 1 };
        let query = doc! { "email": "alice@example.com" };
        assert!(can_use_index(&query, &index_keys));

        let query = doc! { "name": "Alice" };
        assert!(!can_use_index(&query, &index_keys));
    }

    #[test]
    fn test_index_direction_from_bson() {
        assert_eq!(
            IndexDirection::from_bson(&Bson::Int32(1)),
            Some(IndexDirection::Ascending)
        );
        assert_eq!(
            IndexDirection::from_bson(&Bson::Int32(-1)),
            Some(IndexDirection::Descending)
        );
    }
}
