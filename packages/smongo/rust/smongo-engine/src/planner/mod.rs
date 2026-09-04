//! Query planning and execution strategy selection.
//!
//! This module analyzes queries and selects the most efficient execution strategy,
//! including index selection for query optimization.

#[cfg(not(target_arch = "wasm32"))]
mod geo_plan;

use bson::{Bson, Document};

use crate::index::{is_2dsphere_keys, IndexSpec};

/// Check whether the query filter is compatible with a partial index's filter expression.
///
/// A partial index should only be selected when the query's predicates logically
/// imply the partial filter (conservative: require all partial-filter fields to
/// appear in the query with at least the same constraints).
fn query_satisfies_partial_filter(query: &Document, partial_filter: &Document) -> bool {
    for (field, pf_val) in partial_filter {
        let Some(q_val) = query.get(field) else {
            return false;
        };
        match (pf_val, q_val) {
            (Bson::Document(pf_doc), Bson::Document(q_doc)) => {
                for (op, pf_v) in pf_doc {
                    if let Some(q_v) = q_doc.get(op) {
                        if q_v != pf_v && !is_tighter_bound(op, pf_v, q_v) {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }
            }
            _ => {
                if q_val != pf_val {
                    return false;
                }
            }
        }
    }
    true
}

fn is_tighter_bound(op: &str, partial_val: &Bson, query_val: &Bson) -> bool {
    let pf = bson_to_f64(partial_val);
    let qv = bson_to_f64(query_val);
    match (op, pf, qv) {
        ("$gt" | "$gte", Some(pf), Some(qv)) => qv >= pf,
        ("$lt" | "$lte", Some(pf), Some(qv)) => qv <= pf,
        _ => false,
    }
}

fn bson_to_f64(v: &Bson) -> Option<f64> {
    match v {
        Bson::Int32(n) => Some(*n as f64),
        Bson::Int64(n) => Some(*n as f64),
        Bson::Double(d) => Some(*d),
        _ => None,
    }
}

/// Returns true if the index is eligible for the given query, considering its
/// partial filter expression. If no partial filter is set, the index is always eligible.
fn index_eligible_for_query(index: &IndexSpec, query: &Document) -> bool {
    match &index.options.partial_filter_expression {
        Some(pfe) if !pfe.is_empty() => query_satisfies_partial_filter(query, pfe),
        _ => true,
    }
}

/// Query execution strategy
#[derive(Debug, Clone, PartialEq)]
pub enum ExecutionPlan {
    /// Full collection scan (no index used)
    CollectionScan,
    /// Index scan with post-filtering
    IndexScan {
        index_name: String,
        index_keys: Document,
    },
    /// Direct index seek for equality queries
    IndexSeek {
        index_name: String,
        index_keys: Document,
        seek_values: Document,
    },
    /// Covering index scan - all requested fields are in the index
    CoveringIndexScan {
        index_name: String,
        index_keys: Document,
        seek_values: Option<Document>,
        projection: Document,
    },
    /// Walk a B-tree index in order (or reverse) with early termination at `limit`.
    SortedIndexScan {
        index_name: String,
        index_keys: Document,
        limit: usize,
        reverse: bool,
    },
    /// Vector similarity search on a vector index (HNSW or flat).
    VectorIndexSearch {
        index_name: String,
        field: String,
        dimensions: usize,
        metric: String,
        ef_construction: Option<usize>,
        m: Option<usize>,
        /// `"hnsw"` (default) or `"flat"`.
        indexing_method: String,
    },
    /// Bitmap lookup for low-cardinality equality / `$in` queries.
    BitmapScan { index_name: String, field: String },
    /// Full-text inverted-index scan for `$text` queries.
    TextIndexScan {
        index_name: String,
        fields: Vec<String>,
    },
    /// Prefix-truncated B-tree scan with post-filter.
    PrefixIndexScan {
        index_name: String,
        index_keys: Document,
        prefix_length: usize,
    },
    /// `$near` / `$nearSphere` with optional min/max distance (results sorted by distance).
    GeoNear {
        index_name: String,
        field: String,
        lon: f64,
        lat: f64,
        max_distance_m: Option<f64>,
        min_distance_m: Option<f64>,
    },
    /// `$geoWithin` with `$centerSphere` (cap covering + post-filter).
    GeoCapWithin {
        index_name: String,
        field: String,
        lon: f64,
        lat: f64,
        radius_m: f64,
    },
    /// `$geoWithin` / `$geoIntersects` with `$geometry` (S2 cell union + post-filter).
    GeoCellCover {
        index_name: String,
        field: String,
        cell_ids: Vec<u64>,
    },
    /// Union of plans for top-level `$or` (each branch must be indexable).
    OrUnionPlans { subplans: Vec<ExecutionPlan> },
}

/// Query plan with estimated cost
#[derive(Debug, Clone)]
pub struct QueryPlan {
    pub execution_plan: ExecutionPlan,
    pub estimated_cost: u64,
    pub reason: String,
}

/// Analyze a query and select the best execution plan
pub fn plan_query(query: &Document, indexes: &[IndexSpec]) -> QueryPlan {
    plan_query_with_projection(query, indexes, None)
}

/// Analyze a query with projection and select the best execution plan (with covering detection)
pub fn plan_query_with_projection(
    query: &Document,
    indexes: &[IndexSpec],
    projection: Option<&Document>,
) -> QueryPlan {
    if query.is_empty() {
        return QueryPlan {
            execution_plan: ExecutionPlan::CollectionScan,
            estimated_cost: u64::MAX,
            reason: "Empty query requires full collection scan".to_string(),
        };
    }

    if let Some(Bson::Array(branches)) = query.get("$or") {
        return plan_or_query(query, branches, indexes);
    }

    plan_simple_query_with_projection(query, indexes, projection)
}

/// Holistic planner that considers filter, projection, sort, and limit together.
///
/// This is the entry point for `find_with_options` so that covering indexes,
/// sorted index scans, and other combined optimizations can fire.
pub fn plan_query_full(
    query: &Document,
    indexes: &[IndexSpec],
    projection: Option<&Document>,
    sort: Option<&Document>,
    limit: Option<i64>,
) -> QueryPlan {
    let base_plan = plan_query_with_projection(query, indexes, projection);

    // If we have sort + limit, check whether a SortedIndexScan beats the
    // base plan (post-sort is O(n log n), sorted scan is O(limit)).
    if let (Some(sort_doc), Some(lim)) = (sort, limit) {
        if lim > 0 {
            if let Some(sorted_plan) =
                plan_sorted_index_scan(sort_doc, indexes, lim as usize, query)
            {
                if sorted_plan.estimated_cost < base_plan.estimated_cost {
                    return sorted_plan;
                }
            }
        }
    }

    base_plan
}

/// Check if any index can satisfy `sort` in order (or reverse), and produce
/// a `SortedIndexScan` plan with early termination at `limit`.
fn plan_sorted_index_scan(
    sort: &Document,
    indexes: &[IndexSpec],
    limit: usize,
    query: &Document,
) -> Option<QueryPlan> {
    use crate::index::{resolve_index_type, IndexType};

    for spec in indexes {
        if resolve_index_type(&spec.keys, &spec.options) != IndexType::BTree {
            continue;
        }
        if !index_eligible_for_query(spec, query) {
            continue;
        }
        if let Some(reverse) = sort_matches_index(sort, &spec.keys) {
            let cost = (limit as u64).saturating_mul(2);
            return Some(QueryPlan {
                execution_plan: ExecutionPlan::SortedIndexScan {
                    index_name: spec.name.clone(),
                    index_keys: spec.keys.clone(),
                    limit,
                    reverse,
                },
                estimated_cost: cost,
                reason: format!(
                    "Index '{}' provides sort order{}",
                    spec.name,
                    if reverse { " (reverse)" } else { "" }
                ),
            });
        }
    }
    None
}

/// Check whether `sort` fields are a prefix of `index_keys` with matching
/// (or all-inverted) directions.  Returns `Some(false)` for forward match,
/// `Some(true)` for reverse match, or `None` on mismatch.
fn sort_matches_index(sort: &Document, index_keys: &Document) -> Option<bool> {
    use crate::index::IndexDirection;

    let sort_fields: Vec<(&str, IndexDirection)> = sort
        .iter()
        .filter_map(|(k, v)| IndexDirection::from_bson(v).map(|d| (k.as_str(), d)))
        .collect();
    if sort_fields.is_empty() {
        return None;
    }

    let index_fields: Vec<(&str, IndexDirection)> = index_keys
        .iter()
        .filter_map(|(k, v)| IndexDirection::from_bson(v).map(|d| (k.as_str(), d)))
        .collect();

    if sort_fields.len() > index_fields.len() {
        return None;
    }

    let mut all_same = true;
    let mut all_inverted = true;
    for (i, (sf, sd)) in sort_fields.iter().enumerate() {
        let (ik, id) = &index_fields[i];
        if sf != ik {
            return None;
        }
        if sd != id {
            all_same = false;
        }
        if sd == id {
            all_inverted = false;
        }
    }

    if all_same {
        Some(false)
    } else if all_inverted {
        Some(true)
    } else {
        None
    }
}

fn plan_or_query(query: &Document, branches: &[Bson], indexes: &[IndexSpec]) -> QueryPlan {
    let mut base = Document::new();
    for (k, v) in query {
        if k != "$or" {
            base.insert(k.clone(), v.clone());
        }
    }

    let mut subplans: Vec<ExecutionPlan> = Vec::new();

    for b in branches {
        let Bson::Document(branch_doc) = b else {
            return QueryPlan {
                execution_plan: ExecutionPlan::CollectionScan,
                estimated_cost: u64::MAX,
                reason: "$or requires array of documents".to_string(),
            };
        };
        let mut merged = base.clone();
        for (k, v) in branch_doc {
            merged.insert(k.clone(), v.clone());
        }

        let sub = plan_query(&merged, indexes);
        if matches!(sub.execution_plan, ExecutionPlan::CollectionScan) {
            return QueryPlan {
                execution_plan: ExecutionPlan::CollectionScan,
                estimated_cost: u64::MAX,
                reason: "$or branch falls back to collection scan".to_string(),
            };
        }
        subplans.push(sub.execution_plan);
    }

    if subplans.is_empty() {
        return QueryPlan {
            execution_plan: ExecutionPlan::CollectionScan,
            estimated_cost: u64::MAX,
            reason: "Empty $or".to_string(),
        };
    }

    QueryPlan {
        execution_plan: ExecutionPlan::OrUnionPlans { subplans },
        estimated_cost: 200,
        reason: "Union of indexed $or branches".to_string(),
    }
}

fn plan_simple_query_with_projection(
    query: &Document,
    indexes: &[IndexSpec],
    projection: Option<&Document>,
) -> QueryPlan {
    use crate::index::{resolve_index_type, text_fields, vector_field, IndexType};

    let mut best_plan: Option<QueryPlan> = None;

    for index_spec in indexes {
        if !index_eligible_for_query(index_spec, query) {
            continue;
        }

        let idx_type = resolve_index_type(&index_spec.keys, &index_spec.options);

        if is_2dsphere_keys(&index_spec.keys) {
            #[cfg(not(target_arch = "wasm32"))]
            if let Some(plan) = geo_plan::evaluate_2dsphere_plan(query, index_spec) {
                best_plan = Some(pick_better(best_plan, plan));
            }
            continue;
        }

        match idx_type {
            IndexType::Bitmap => {
                if let Some(field) = index_spec.keys.keys().next() {
                    if query.contains_key(field) {
                        let plan = QueryPlan {
                            execution_plan: ExecutionPlan::BitmapScan {
                                index_name: index_spec.name.clone(),
                                field: field.clone(),
                            },
                            estimated_cost: 15,
                            reason: format!(
                                "Bitmap index '{}' on field '{}'",
                                index_spec.name, field
                            ),
                        };
                        best_plan = Some(pick_better(best_plan, plan));
                    }
                }
                continue;
            }
            IndexType::Prefix => {
                let prefix_length = index_spec
                    .options
                    .prefix_options
                    .as_ref()
                    .map(|p| p.prefix_length)
                    .unwrap_or(16);
                if let Some(first_field) = index_spec.keys.keys().next() {
                    if query.contains_key(first_field) {
                        let plan = QueryPlan {
                            execution_plan: ExecutionPlan::PrefixIndexScan {
                                index_name: index_spec.name.clone(),
                                index_keys: index_spec.keys.clone(),
                                prefix_length,
                            },
                            estimated_cost: 80,
                            reason: format!(
                                "Prefix index '{}' (prefix_length={})",
                                index_spec.name, prefix_length
                            ),
                        };
                        best_plan = Some(pick_better(best_plan, plan));
                    }
                }
                continue;
            }
            IndexType::Text => {
                if query.contains_key("$text") {
                    let fields = text_fields(&index_spec.keys);
                    if !fields.is_empty() {
                        let plan = QueryPlan {
                            execution_plan: ExecutionPlan::TextIndexScan {
                                index_name: index_spec.name.clone(),
                                fields,
                            },
                            estimated_cost: 50,
                            reason: format!("Text index '{}'", index_spec.name),
                        };
                        best_plan = Some(pick_better(best_plan, plan));
                    }
                }
                continue;
            }
            IndexType::VectorSearch => {
                if let Some(field) = vector_field(&index_spec.keys) {
                    if query.contains_key(&field) {
                        let vopts = &index_spec.options.vector_options;
                        let dimensions = vopts.as_ref().map(|v| v.dimensions).unwrap_or(0);
                        let metric = vopts
                            .as_ref()
                            .map(|v| v.metric.clone())
                            .unwrap_or_else(|| "cosine".to_string());
                        if dimensions > 0 {
                            let ef_construction = vopts.as_ref().and_then(|v| v.ef_construction);
                            let m = vopts.as_ref().and_then(|v| v.m);
                            let indexing_method = vopts
                                .as_ref()
                                .map(|v| v.indexing_method.clone())
                                .unwrap_or_else(|| "hnsw".to_string());
                            let plan = QueryPlan {
                                execution_plan: ExecutionPlan::VectorIndexSearch {
                                    index_name: index_spec.name.clone(),
                                    field: field.clone(),
                                    dimensions,
                                    metric,
                                    ef_construction,
                                    m,
                                    indexing_method,
                                },
                                estimated_cost: 30,
                                reason: format!(
                                    "Vector index '{}' on field '{}'",
                                    index_spec.name, field
                                ),
                            };
                            best_plan = Some(pick_better(best_plan, plan));
                        }
                    }
                }
                continue;
            }
            _ => {}
        }

        if let Some(plan) = evaluate_index_for_query_with_projection(query, index_spec, projection)
        {
            best_plan = Some(pick_better(best_plan, plan));
        }
    }

    best_plan.unwrap_or_else(|| QueryPlan {
        execution_plan: ExecutionPlan::CollectionScan,
        estimated_cost: u64::MAX,
        reason: "No suitable index found".to_string(),
    })
}

fn pick_better(current: Option<QueryPlan>, candidate: QueryPlan) -> QueryPlan {
    match current {
        None => candidate,
        Some(prev) => {
            if candidate.estimated_cost < prev.estimated_cost {
                candidate
            } else {
                prev
            }
        }
    }
}

/// Evaluate if a btree index can be used for a query, with covering detection
fn evaluate_index_for_query_with_projection(
    query: &Document,
    index_spec: &IndexSpec,
    projection: Option<&Document>,
) -> Option<QueryPlan> {
    let first_index_field = index_spec.keys.iter().next()?.0;

    if !query.contains_key(first_index_field) {
        return None;
    }

    let query_value = query.get(first_index_field)?;

    // Check if this index can cover the query
    if let Some(proj) = projection {
        if is_covering_index(&index_spec.keys, proj) {
            // Covering index path
            if is_equality_query(query_value) {
                let mut seek_values = Document::new();
                seek_values.insert(first_index_field.clone(), query_value.clone());

                return Some(QueryPlan {
                    execution_plan: ExecutionPlan::CoveringIndexScan {
                        index_name: index_spec.name.clone(),
                        index_keys: index_spec.keys.clone(),
                        seek_values: Some(seek_values),
                        projection: proj.clone(),
                    },
                    estimated_cost: 5, // Better than regular IndexSeek
                    reason: format!(
                        "Covering index on '{}' (no document fetch needed)",
                        first_index_field
                    ),
                });
            }

            if is_range_query(query_value) {
                return Some(QueryPlan {
                    execution_plan: ExecutionPlan::CoveringIndexScan {
                        index_name: index_spec.name.clone(),
                        index_keys: index_spec.keys.clone(),
                        seek_values: None,
                        projection: proj.clone(),
                    },
                    estimated_cost: 50, // Better than regular IndexScan
                    reason: format!(
                        "Covering index range scan on '{}' (no document fetch needed)",
                        first_index_field
                    ),
                });
            }
        }
    }

    // Regular index path
    if is_equality_query(query_value) {
        let mut seek_values = Document::new();
        seek_values.insert(first_index_field.clone(), query_value.clone());

        return Some(QueryPlan {
            execution_plan: ExecutionPlan::IndexSeek {
                index_name: index_spec.name.clone(),
                index_keys: index_spec.keys.clone(),
                seek_values,
            },
            estimated_cost: 10,
            reason: format!("Equality query on indexed field '{}'", first_index_field),
        });
    }

    if is_range_query(query_value) {
        return Some(QueryPlan {
            execution_plan: ExecutionPlan::IndexScan {
                index_name: index_spec.name.clone(),
                index_keys: index_spec.keys.clone(),
            },
            estimated_cost: 100,
            reason: format!("Range query on indexed field '{}'", first_index_field),
        });
    }

    None
}

/// Check if an index covers a projection (all projected fields are in the index)
fn is_covering_index(index_keys: &Document, projection: &Document) -> bool {
    // Get index field names
    let index_fields: Vec<&str> = index_keys.keys().map(|s| s.as_str()).collect();

    // Check projection type (inclusion or exclusion)
    let has_inclusion = projection
        .iter()
        .any(|(k, v)| k != "_id" && is_truthy_value(v));

    if !has_inclusion {
        // Exclusion projection - cannot be covered
        return false;
    }

    // Check if all included fields are in the index
    for (field, value) in projection {
        if field == "_id" && !is_truthy_value(value) {
            // _id: 0 is fine for covering
            continue;
        }
        if is_truthy_value(value) {
            // This field must be in the index
            if !index_fields.contains(&field.as_str()) && field != "_id" {
                return false;
            }
        }
    }

    true
}

/// Check if a BSON value is truthy (1, true, or any non-zero number)
fn is_truthy_value(value: &Bson) -> bool {
    match value {
        Bson::Int32(n) => *n != 0,
        Bson::Int64(n) => *n != 0,
        Bson::Double(d) => *d != 0.0,
        Bson::Boolean(b) => *b,
        _ => true,
    }
}

fn is_equality_query(value: &Bson) -> bool {
    match value {
        Bson::Document(doc) => doc.len() == 1 && doc.contains_key("$eq"),
        _ => true,
    }
}

fn is_range_query(value: &Bson) -> bool {
    match value {
        Bson::Document(doc) => doc
            .keys()
            .any(|k| matches!(k.as_str(), "$gt" | "$gte" | "$lt" | "$lte")),
        _ => false,
    }
}

/// Calculate query selectivity score (lower is more selective)
pub fn calculate_selectivity(query: &Document) -> u32 {
    if query.is_empty() {
        return u32::MAX;
    }

    let mut selectivity = 0u32;

    for (field, value) in query {
        if field.starts_with('$') {
            selectivity += 50;
            continue;
        }

        match value {
            Bson::Document(doc) => {
                for op in doc.keys() {
                    selectivity += match op.as_str() {
                        "$eq" => 10,
                        "$ne" => 90,
                        "$gt" | "$gte" | "$lt" | "$lte" => 30,
                        "$in" => 20,
                        "$nin" => 80,
                        "$exists" => 70,
                        _ => 50,
                    };
                }
            }
            _ => selectivity += 10,
        }
    }

    selectivity
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::index::IndexOptions;
    use bson::doc;

    #[test]
    fn test_plan_empty_query() {
        let indexes = vec![];
        let plan = plan_query(&doc! {}, &indexes);
        assert!(matches!(plan.execution_plan, ExecutionPlan::CollectionScan));
    }

    #[test]
    fn test_plan_equality_query_with_index() {
        let indexes = vec![IndexSpec {
            name: "email_1".to_string(),
            keys: doc! { "email": 1 },
            options: IndexOptions::default(),
        }];

        let plan = plan_query(&doc! { "email": "alice@example.com" }, &indexes);

        assert!(matches!(
            plan.execution_plan,
            ExecutionPlan::IndexSeek { .. }
        ));
        assert_eq!(plan.estimated_cost, 10);
    }

    #[test]
    fn test_plan_range_query_with_index() {
        let indexes = vec![IndexSpec {
            name: "age_1".to_string(),
            keys: doc! { "age": 1 },
            options: IndexOptions::default(),
        }];

        let plan = plan_query(&doc! { "age": { "$gte": 18 } }, &indexes);

        assert!(matches!(
            plan.execution_plan,
            ExecutionPlan::IndexScan { .. }
        ));
        assert_eq!(plan.estimated_cost, 100);
    }

    #[test]
    #[cfg(not(target_arch = "wasm32"))]
    fn test_plan_2dsphere_near() {
        let indexes = vec![IndexSpec {
            name: "loc_2dsphere".to_string(),
            keys: doc! { "loc": "2dsphere" },
            options: IndexOptions::default(),
        }];
        let plan = plan_query(
            &doc! { "loc": { "$near": { "$geometry": { "type": "Point", "coordinates": [0.0, 0.0] } }, "$maxDistance": 1000.0 } },
            &indexes,
        );
        assert!(matches!(plan.execution_plan, ExecutionPlan::GeoNear { .. }));
    }

    #[test]
    fn test_is_equality_query() {
        assert!(is_equality_query(&Bson::String("value".to_string())));
        assert!(is_equality_query(&Bson::Int32(42)));
        assert!(is_equality_query(&Bson::Document(doc! { "$eq": 42 })));
        assert!(!is_equality_query(&Bson::Document(doc! { "$gt": 42 })));
    }

    #[test]
    fn test_is_range_query() {
        assert!(is_range_query(&Bson::Document(doc! { "$gt": 18 })));
        assert!(is_range_query(&Bson::Document(
            doc! { "$gte": 18, "$lte": 65 }
        )));
        assert!(!is_range_query(&Bson::String("value".to_string())));
        assert!(!is_range_query(&Bson::Document(doc! { "$eq": 42 })));
    }

    #[test]
    fn test_calculate_selectivity() {
        let sel = calculate_selectivity(&doc! { "email": "alice@example.com" });
        assert_eq!(sel, 10);

        let sel = calculate_selectivity(&doc! { "age": { "$gte": 18 } });
        assert_eq!(sel, 30);

        let sel = calculate_selectivity(&doc! {});
        assert_eq!(sel, u32::MAX);
    }

    #[test]
    fn test_select_best_index_among_multiple() {
        let indexes = vec![
            IndexSpec {
                name: "name_1".to_string(),
                keys: doc! { "name": 1 },
                options: IndexOptions::default(),
            },
            IndexSpec {
                name: "email_1".to_string(),
                keys: doc! { "email": 1 },
                options: IndexOptions::default(),
            },
        ];

        let plan = plan_query(&doc! { "email": "alice@example.com" }, &indexes);

        if let ExecutionPlan::IndexSeek { index_name, .. } = plan.execution_plan {
            assert_eq!(index_name, "email_1");
        } else {
            panic!("Expected IndexSeek");
        }
    }

    #[test]
    fn test_partial_filter_skips_ineligible_index() {
        let indexes = vec![IndexSpec {
            name: "status_1".to_string(),
            keys: doc! { "status": 1 },
            options: IndexOptions {
                partial_filter_expression: Some(doc! { "status": "active" }),
                ..Default::default()
            },
        }];

        // Query does not satisfy partial filter
        let plan = plan_query(&doc! { "status": "inactive" }, &indexes);
        assert!(matches!(plan.execution_plan, ExecutionPlan::CollectionScan));
    }

    #[test]
    fn test_partial_filter_allows_matching_query() {
        let indexes = vec![IndexSpec {
            name: "status_1".to_string(),
            keys: doc! { "status": 1 },
            options: IndexOptions {
                partial_filter_expression: Some(doc! { "status": "active" }),
                ..Default::default()
            },
        }];

        // Query matches partial filter exactly
        let plan = plan_query(&doc! { "status": "active" }, &indexes);
        assert!(matches!(
            plan.execution_plan,
            ExecutionPlan::IndexSeek { .. }
        ));
    }

    #[test]
    fn test_partial_filter_range_tighter_bound() {
        let indexes = vec![IndexSpec {
            name: "age_1".to_string(),
            keys: doc! { "age": 1 },
            options: IndexOptions {
                partial_filter_expression: Some(doc! { "age": { "$gte": 18 } }),
                ..Default::default()
            },
        }];

        // Query has tighter bound (21 >= 18) — eligible
        let plan = plan_query(&doc! { "age": { "$gte": 21 } }, &indexes);
        assert!(matches!(
            plan.execution_plan,
            ExecutionPlan::IndexScan { .. }
        ));

        // Query has looser bound (10 < 18) — ineligible
        let plan2 = plan_query(&doc! { "age": { "$gte": 10 } }, &indexes);
        assert!(matches!(
            plan2.execution_plan,
            ExecutionPlan::CollectionScan
        ));
    }

    #[test]
    fn test_partial_filter_sorted_scan_excluded() {
        let indexes = vec![IndexSpec {
            name: "score_1".to_string(),
            keys: doc! { "score": 1 },
            options: IndexOptions {
                partial_filter_expression: Some(doc! { "active": true }),
                ..Default::default()
            },
        }];

        // Query does not include the partial filter field — SortedIndexScan should not be selected
        let plan = plan_query_full(
            &doc! { "x": 1 },
            &indexes,
            None,
            Some(&doc! { "score": 1 }),
            Some(10),
        );
        assert!(!matches!(
            plan.execution_plan,
            ExecutionPlan::SortedIndexScan { .. }
        ));
    }

    #[test]
    fn test_no_partial_filter_always_eligible() {
        let indexes = vec![IndexSpec {
            name: "email_1".to_string(),
            keys: doc! { "email": 1 },
            options: IndexOptions::default(),
        }];

        let plan = plan_query(&doc! { "email": "test" }, &indexes);
        assert!(matches!(
            plan.execution_plan,
            ExecutionPlan::IndexSeek { .. }
        ));
    }
}
