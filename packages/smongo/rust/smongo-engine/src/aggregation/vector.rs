//! Vector similarity search (`$vectorSearch`).
//!
//! Implements the [Atlas `$vectorSearch` aggregation stage][atlas] with
//! `cosine`, `euclidean`, and `dotProduct` metrics, optional MQL pre-filter,
//! and Atlas-compatible `[0, 1]` score normalization.
//!
//! Supports both search modes:
//! - **HNSW** (default): approximate nearest-neighbor for large datasets.
//! - **Flat / Exact** (`exact: true` or `indexingMethod: "flat"`): exhaustive
//!   brute-force scan, ideal for [multi-tenant workloads][mt] where each
//!   tenant has < 10K vectors after pre-filtering by `tenant_id`.
//!
//! Scores are accessible in subsequent stages via `{$meta: "vectorSearchScore"}`.
//!
//! [atlas]: https://www.mongodb.com/docs/atlas/atlas-vector-search/vector-search-stage/
//! [mt]: https://www.mongodb.com/docs/atlas/atlas-vector-search/multi-tenant-architecture/

use bson::{Bson, Document};

use crate::index::vector_index::VectorIndex;
use crate::query::eval_query;

use super::{AggregationError, AggregationResult};

/// Parse the common `$vectorSearch` spec fields shared by in-memory and
/// streaming code paths.
pub(crate) struct VectorSearchSpec<'a> {
    pub path: &'a str,
    pub query_vec: Vec<f32>,
    pub limit: usize,
    pub num_candidates: usize,
    pub metric: &'a str,
    pub score_field: &'a str,
    pub mql_filter: Option<&'a Document>,
    /// When `true`, bypasses HNSW and performs exhaustive brute-force search.
    /// Atlas equivalent of `"exact": true` in the `$vectorSearch` stage, or
    /// using a flat index (`indexingMethod: "flat"`).
    pub exact: bool,
}

impl<'a> VectorSearchSpec<'a> {
    pub fn parse(vs_doc: &'a Document) -> AggregationResult<Self> {
        let path = vs_doc
            .get_str("path")
            .map_err(|_| AggregationError::MissingField("$vectorSearch.path required".into()))?;
        let query_vector_bson = vs_doc.get_array("queryVector").map_err(|_| {
            AggregationError::MissingField("$vectorSearch.queryVector required".into())
        })?;

        let query_vec: Vec<f32> = query_vector_bson
            .iter()
            .filter_map(|v| v.as_f64().map(|f| f as f32))
            .collect();
        if query_vec.is_empty() {
            return Err(AggregationError::InvalidStage(
                "$vectorSearch.queryVector must be a non-empty numeric array".into(),
            ));
        }

        let limit = vs_doc
            .get("limit")
            .and_then(|v| v.as_i64().or_else(|| v.as_i32().map(|i| i as i64)))
            .unwrap_or(10) as usize;

        let num_candidates = vs_doc
            .get("numCandidates")
            .and_then(|v| v.as_i64().or_else(|| v.as_i32().map(|i| i as i64)))
            .unwrap_or(limit as i64) as usize;

        // Atlas uses `similarity` in the index definition; we also accept
        // `metric` in the query as a convenient override.
        let metric = vs_doc
            .get_str("metric")
            .or_else(|_| vs_doc.get_str("similarity"))
            .unwrap_or("cosine");

        let score_field = vs_doc.get_str("scoreField").unwrap_or("_vectorScore");
        let mql_filter = vs_doc.get_document("filter").ok();
        let exact = vs_doc.get_bool("exact").unwrap_or(false);

        Ok(Self {
            path,
            query_vec,
            limit,
            num_candidates,
            metric,
            score_field,
            mql_filter,
            exact,
        })
    }
}

pub fn vector_search_stage(docs: Vec<Document>, spec: &Bson) -> AggregationResult<Vec<Document>> {
    let vs_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$vectorSearch requires document".into()))?;

    let s = VectorSearchSpec::parse(vs_doc)?;

    let candidates: Vec<Document> = if let Some(filter) = s.mql_filter {
        let mut filtered = Vec::new();
        for d in docs.iter() {
            if eval_query(d, filter).map_err(AggregationError::Other)? {
                filtered.push(d.clone());
            }
        }
        filtered
    } else {
        docs
    };

    let scored = score_documents(
        &candidates,
        s.path,
        &s.query_vec,
        s.limit,
        s.metric,
        s.exact,
    )?;

    let mut results = Vec::with_capacity(scored.len());
    for (mut doc, score) in scored {
        doc.insert(s.score_field.to_string(), Bson::Double(score as f64));
        results.push(doc);
    }

    Ok(results)
}

/// Score documents by vector similarity and return the top-k `(doc, score)` pairs.
///
/// This is the shared kernel used by the `$vectorSearch` stage,
/// `IndexProvider::vector_search`, and the streaming pipeline.
///
/// When `exact` is `true`, performs a flat exhaustive scan (optimal for
/// multi-tenant workloads where each tenant has <10K vectors after
/// pre-filtering).  Otherwise builds an HNSW graph for ANN search.
pub fn score_documents(
    docs: &[Document],
    field: &str,
    query_vec: &[f32],
    limit: usize,
    metric: &str,
    exact: bool,
) -> AggregationResult<Vec<(Document, f32)>> {
    let dim = query_vec.len();
    let mut idx = VectorIndex::build(docs, field, dim, metric);
    let hits = if exact {
        idx.search_exact(query_vec, limit)
    } else {
        idx.search(query_vec, limit)
    };

    let id_score: std::collections::HashMap<String, f32> = hits.into_iter().collect();

    let mut results: Vec<(Document, f32)> = Vec::with_capacity(id_score.len());
    for doc in docs {
        let id_str = match doc.get("_id") {
            Some(bson::Bson::ObjectId(oid)) => oid.to_hex(),
            Some(bson::Bson::String(s)) => s.clone(),
            Some(bson::Bson::Int32(i)) => i.to_string(),
            Some(bson::Bson::Int64(i)) => i.to_string(),
            _ => continue,
        };
        if let Some(&score) = id_score.get(&id_str) {
            results.push((doc.clone(), score));
        }
    }

    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    Ok(results)
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;
    use bson::doc;

    fn make_doc(id: i32, vec: Vec<f64>) -> Document {
        let bson_vec: Vec<Bson> = vec.into_iter().map(Bson::Double).collect();
        doc! { "_id": id, "embedding": bson_vec }
    }

    #[test]
    fn test_cosine_basic() {
        let docs = vec![
            make_doc(1, vec![1.0, 0.0, 0.0]),
            make_doc(2, vec![0.0, 1.0, 0.0]),
            make_doc(3, vec![0.9, 0.1, 0.0]),
        ];
        let spec = doc! {
            "path": "embedding",
            "queryVector": [1.0, 0.0, 0.0],
            "limit": 2,
            "metric": "cosine",
        };
        let results = vector_search_stage(docs, &Bson::Document(spec)).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].get_i32("_id").unwrap(), 1);
        assert_eq!(results[1].get_i32("_id").unwrap(), 3);
    }

    #[test]
    fn test_euclidean() {
        let docs = vec![
            make_doc(1, vec![0.0, 0.0]),
            make_doc(2, vec![3.0, 4.0]),
            make_doc(3, vec![1.0, 0.0]),
        ];
        let spec = doc! {
            "path": "embedding",
            "queryVector": [0.0, 0.0],
            "limit": 2,
            "metric": "euclidean",
        };
        let results = vector_search_stage(docs, &Bson::Document(spec)).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].get_i32("_id").unwrap(), 1);
        assert_eq!(results[1].get_i32("_id").unwrap(), 3);
    }

    #[test]
    fn test_with_filter() {
        let docs = vec![
            {
                let mut d = make_doc(1, vec![1.0, 0.0]);
                d.insert("active", true);
                d
            },
            {
                let mut d = make_doc(2, vec![0.9, 0.1]);
                d.insert("active", false);
                d
            },
            {
                let mut d = make_doc(3, vec![0.8, 0.2]);
                d.insert("active", true);
                d
            },
        ];
        let spec = doc! {
            "path": "embedding",
            "queryVector": [1.0, 0.0],
            "limit": 10,
            "metric": "cosine",
            "filter": { "active": true },
        };
        let results = vector_search_stage(docs, &Bson::Document(spec)).unwrap();
        assert_eq!(results.len(), 2);
        for r in &results {
            assert_eq!(r.get_bool("active").unwrap(), true);
        }
    }

    #[test]
    fn test_score_field() {
        let docs = vec![make_doc(1, vec![1.0, 0.0])];
        let spec = doc! {
            "path": "embedding",
            "queryVector": [1.0, 0.0],
            "limit": 1,
            "metric": "cosine",
            "scoreField": "_myScore",
        };
        let results = vector_search_stage(docs, &Bson::Document(spec)).unwrap();
        assert!(results[0].get_f64("_myScore").is_ok());
    }

    /// End-to-end test mimicking LangChain's MongoDBAtlasVectorSearch pipeline:
    /// `[$vectorSearch, {$set: {score: {$meta: "vectorSearchScore"}}}, {$project: {embedding: 0}}]`
    #[test]
    fn test_langchain_pipeline_scores_visible() {
        let docs = vec![
            make_doc(1, vec![1.0, 0.0, 0.0]),
            make_doc(2, vec![0.0, 1.0, 0.0]),
            make_doc(3, vec![0.9, 0.1, 0.0]),
        ];
        let pipeline = vec![
            doc! { "$vectorSearch": {
                "path": "embedding",
                "queryVector": [1.0, 0.0, 0.0],
                "limit": 2,
                "index": "default",
                "metric": "cosine",
            }},
            doc! { "$set": { "score": { "$meta": "vectorSearchScore" } } },
            doc! { "$project": { "embedding": 0 } },
        ];
        let results = crate::aggregation::aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 2);

        // Score must be a real number, not null
        let score = results[0].get_f64("score").expect("score should be f64");
        assert!(
            score > 0.0,
            "top result score should be positive, got {score}"
        );

        // Ranking preserved: doc 1 is the closest cosine match
        assert_eq!(results[0].get_i32("_id").unwrap(), 1);
        assert_eq!(results[1].get_i32("_id").unwrap(), 3);

        // Embedding field should be projected out
        assert!(results[0].get("embedding").is_none());
    }

    /// Atlas requires $vectorSearch to be the first pipeline stage.
    #[test]
    fn test_vector_search_must_be_first_stage() {
        let docs = vec![make_doc(1, vec![1.0, 0.0, 0.0])];
        let pipeline = vec![
            doc! { "$match": { "_id": 1 } },
            doc! { "$vectorSearch": {
                "path": "embedding",
                "queryVector": [1.0, 0.0, 0.0],
                "limit": 1,
                "metric": "cosine",
            }},
        ];
        let result = crate::aggregation::aggregate(docs, &pipeline);
        assert!(result.is_err(), "$vectorSearch not first should fail");
    }

    /// `similarity` is accepted as an alias for `metric` (Atlas-style).
    #[test]
    fn test_similarity_alias_for_metric() {
        let docs = vec![
            make_doc(1, vec![1.0, 0.0, 0.0]),
            make_doc(2, vec![0.0, 1.0, 0.0]),
        ];
        let spec = doc! {
            "path": "embedding",
            "queryVector": [1.0, 0.0, 0.0],
            "limit": 2,
            "similarity": "cosine",
        };
        let results = vector_search_stage(docs, &Bson::Document(spec)).unwrap();
        assert_eq!(results[0].get_i32("_id").unwrap(), 1);
    }

    /// Scores must be in [0, 1] range (Atlas normalization).
    #[test]
    fn test_scores_normalized_zero_to_one() {
        let docs = vec![
            make_doc(1, vec![1.0, 0.0, 0.0]),
            make_doc(2, vec![-1.0, 0.0, 0.0]),
            make_doc(3, vec![0.0, 1.0, 0.0]),
        ];
        let spec = doc! {
            "path": "embedding",
            "queryVector": [1.0, 0.0, 0.0],
            "limit": 3,
            "metric": "cosine",
        };
        let results = vector_search_stage(docs, &Bson::Document(spec)).unwrap();
        for r in &results {
            let score = r.get_f64("_vectorScore").unwrap();
            assert!((0.0..=1.0).contains(&score), "score {score} outside [0, 1]");
        }
        // Identical vector → score ≈ 1.0
        let top_score = results[0].get_f64("_vectorScore").unwrap();
        assert!((top_score - 1.0).abs() < 1e-4);

        // Opposite vector → score ≈ 0.0
        let bottom_score = results.last().unwrap().get_f64("_vectorScore").unwrap();
        assert!(bottom_score < 0.1);
    }

    // -----------------------------------------------------------------------
    // Multi-tenant + flat / exact tests
    // -----------------------------------------------------------------------

    fn make_tenant_doc(id: i32, tenant: &str, vec: Vec<f64>) -> Document {
        let bson_vec: Vec<Bson> = vec.into_iter().map(Bson::Double).collect();
        doc! { "_id": id, "tenant_id": tenant, "embedding": bson_vec }
    }

    /// `exact: true` produces the same ranking and scores as HNSW for small datasets.
    #[test]
    fn test_exact_matches_hnsw_ranking() {
        let docs = vec![
            make_doc(1, vec![1.0, 0.0, 0.0]),
            make_doc(2, vec![0.0, 1.0, 0.0]),
            make_doc(3, vec![0.9, 0.1, 0.0]),
        ];
        let hnsw_spec = doc! {
            "path": "embedding",
            "queryVector": [1.0, 0.0, 0.0],
            "limit": 3,
            "metric": "cosine",
        };
        let exact_spec = doc! {
            "path": "embedding",
            "queryVector": [1.0, 0.0, 0.0],
            "limit": 3,
            "metric": "cosine",
            "exact": true,
        };
        let hnsw_results = vector_search_stage(docs.clone(), &Bson::Document(hnsw_spec)).unwrap();
        let exact_results = vector_search_stage(docs, &Bson::Document(exact_spec)).unwrap();

        assert_eq!(hnsw_results.len(), exact_results.len());
        for (h, e) in hnsw_results.iter().zip(exact_results.iter()) {
            assert_eq!(h.get_i32("_id").unwrap(), e.get_i32("_id").unwrap());
            let hs = h.get_f64("_vectorScore").unwrap();
            let es = e.get_f64("_vectorScore").unwrap();
            assert!(
                (hs - es).abs() < 1e-4,
                "score mismatch: HNSW={hs} exact={es}"
            );
        }
    }

    /// Multi-tenant pre-filter: only tenant_a docs are scored, tenant_b excluded.
    #[test]
    fn test_multi_tenant_filter_isolates_tenant() {
        let docs = vec![
            make_tenant_doc(1, "tenant_a", vec![1.0, 0.0, 0.0]),
            make_tenant_doc(2, "tenant_b", vec![0.99, 0.01, 0.0]),
            make_tenant_doc(3, "tenant_a", vec![0.0, 1.0, 0.0]),
            make_tenant_doc(4, "tenant_b", vec![0.0, 0.0, 1.0]),
        ];
        let spec = doc! {
            "path": "embedding",
            "queryVector": [1.0, 0.0, 0.0],
            "limit": 10,
            "metric": "cosine",
            "filter": { "tenant_id": "tenant_a" },
        };
        let results = vector_search_stage(docs, &Bson::Document(spec)).unwrap();
        assert_eq!(results.len(), 2);
        for r in &results {
            assert_eq!(r.get_str("tenant_id").unwrap(), "tenant_a");
        }
        assert_eq!(results[0].get_i32("_id").unwrap(), 1);
    }

    /// Multi-tenant with `exact: true` — flat scan after pre-filter.
    #[test]
    fn test_multi_tenant_exact_flat_scan() {
        let docs = vec![
            make_tenant_doc(1, "t1", vec![1.0, 0.0]),
            make_tenant_doc(2, "t1", vec![0.5, 0.5]),
            make_tenant_doc(3, "t2", vec![0.99, 0.01]),
            make_tenant_doc(4, "t1", vec![0.0, 1.0]),
        ];
        let spec = doc! {
            "path": "embedding",
            "queryVector": [1.0, 0.0],
            "limit": 2,
            "metric": "cosine",
            "filter": { "tenant_id": "t1" },
            "exact": true,
        };
        let results = vector_search_stage(docs, &Bson::Document(spec)).unwrap();
        assert_eq!(results.len(), 2);
        for r in &results {
            assert_eq!(r.get_str("tenant_id").unwrap(), "t1");
        }
        assert_eq!(results[0].get_i32("_id").unwrap(), 1);
    }

    /// `exact: true` scores are in [0, 1] for all three metrics.
    #[test]
    fn test_exact_score_normalization_all_metrics() {
        for metric in &["cosine", "euclidean", "dotProduct"] {
            let docs = vec![
                make_doc(1, vec![1.0, 0.0, 0.0]),
                make_doc(2, vec![-1.0, 0.0, 0.0]),
                make_doc(3, vec![0.0, 1.0, 0.0]),
            ];
            let spec = doc! {
                "path": "embedding",
                "queryVector": [1.0, 0.0, 0.0],
                "limit": 3,
                "metric": *metric,
                "exact": true,
            };
            let results = vector_search_stage(docs, &Bson::Document(spec)).unwrap();
            for r in &results {
                let score = r.get_f64("_vectorScore").unwrap();
                assert!(
                    (0.0..=1.0).contains(&score),
                    "{metric}: score {score} outside [0, 1]"
                );
            }
            let top = results[0].get_f64("_vectorScore").unwrap();
            assert!(
                (top - 1.0).abs() < 1e-4,
                "{metric}: identical vector score should be ~1.0, got {top}"
            );
        }
    }

    /// Exact LangChain `MongoDBAtlasVectorSearch` pipeline: no metric, no
    /// scoreField — just `queryVector`, `path`, `index`, `limit`,
    /// `numCandidates`.  Score extracted via `$meta: "vectorSearchScore"`,
    /// embedding projected out.
    #[test]
    fn test_langchain_exact_pipeline_no_metric() {
        let docs = vec![
            make_doc(1, vec![1.0, 0.0, 0.0]),
            make_doc(2, vec![0.0, 1.0, 0.0]),
            make_doc(3, vec![0.9, 0.1, 0.0]),
        ];
        let pipeline = vec![
            doc! { "$vectorSearch": {
                "queryVector": [1.0, 0.0, 0.0],
                "path": "embedding",
                "index": "default",
                "limit": 2,
                "numCandidates": 20,
            }},
            doc! { "$set": { "score": { "$meta": "vectorSearchScore" } } },
            doc! { "$project": { "embedding": 0 } },
        ];
        let results = crate::aggregation::aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 2);

        let score = results[0].get_f64("score").expect("score must be f64");
        assert!(score > 0.0 && score <= 1.0, "score {score} outside (0, 1]");

        assert_eq!(results[0].get_i32("_id").unwrap(), 1);
        assert_eq!(results[1].get_i32("_id").unwrap(), 3);

        assert!(results[0].get("embedding").is_none());
        assert!(results[1].get("embedding").is_none());

        // _vectorScore internal field should NOT leak through $project
        // (it does still exist in the doc, but embedding was the projected-out field)
    }

    /// LangChain `similarity_search_with_score` reads the `score` field
    /// from each result doc. Verify this works end-to-end with dotProduct.
    #[test]
    fn test_langchain_dotproduct_pipeline() {
        let docs = vec![make_doc(1, vec![1.0, 0.0]), make_doc(2, vec![0.0, 1.0])];
        let pipeline = vec![
            doc! { "$vectorSearch": {
                "queryVector": [1.0, 0.0],
                "path": "embedding",
                "index": "default",
                "limit": 2,
                "numCandidates": 10,
                "similarity": "dotProduct",
            }},
            doc! { "$set": { "score": { "$meta": "vectorSearchScore" } } },
        ];
        let results = crate::aggregation::aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 2);
        let top = results[0].get_f64("score").unwrap();
        let bottom = results[1].get_f64("score").unwrap();
        assert!(top >= bottom, "scores should be descending");
        assert!((0.0..=1.0).contains(&top), "top score {top} outside [0, 1]");
    }

    /// Pipeline-level test: `$vectorSearch` with `exact: true` works in
    /// the full aggregation pipeline including `$meta: "vectorSearchScore"`.
    #[test]
    fn test_exact_pipeline_with_meta_score() {
        let docs = vec![
            make_tenant_doc(1, "a", vec![1.0, 0.0, 0.0]),
            make_tenant_doc(2, "b", vec![0.99, 0.01, 0.0]),
            make_tenant_doc(3, "a", vec![0.0, 1.0, 0.0]),
        ];
        let pipeline = vec![
            doc! { "$vectorSearch": {
                "path": "embedding",
                "queryVector": [1.0, 0.0, 0.0],
                "limit": 2,
                "index": "default",
                "metric": "cosine",
                "filter": { "tenant_id": "a" },
                "exact": true,
            }},
            doc! { "$set": { "score": { "$meta": "vectorSearchScore" } } },
        ];
        let results = crate::aggregation::aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 2);
        for r in &results {
            let score = r.get_f64("score").unwrap();
            assert!(score > 0.0, "score should be positive");
            assert_eq!(r.get_str("tenant_id").unwrap(), "a");
        }
    }
}
