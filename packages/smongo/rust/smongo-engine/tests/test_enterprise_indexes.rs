//! Integration tests for the Enterprise Index Plan.
//!
//! Covers: IndexType enum, SortedIndexScan, BinaryHeap vectorSearch/geoNear,
//! sort+limit fusion, descending key encoding, VectorIndex, BitmapIndex,
//! TextIndex, PrefixIndex, and the unified write dispatch.

use bson::{doc, Bson, Document};

// ============================================================
// Phase 0: Unified IndexType enum
// ============================================================

#[test]
fn test_resolve_index_type_btree_default() {
    use smongo_engine::index::{resolve_index_type, IndexOptions, IndexType};
    let keys = doc! { "age": 1, "name": -1 };
    let opts = IndexOptions::default();
    assert_eq!(resolve_index_type(&keys, &opts), IndexType::BTree);
}

#[test]
fn test_resolve_index_type_2dsphere() {
    use smongo_engine::index::{resolve_index_type, IndexOptions, IndexType};
    let keys = doc! { "location": "2dsphere" };
    let opts = IndexOptions::default();
    assert_eq!(resolve_index_type(&keys, &opts), IndexType::TwoDSphere);
}

#[test]
fn test_resolve_index_type_text() {
    use smongo_engine::index::{resolve_index_type, IndexOptions, IndexType};
    let keys = doc! { "title": "text", "body": "text" };
    let opts = IndexOptions::default();
    assert_eq!(resolve_index_type(&keys, &opts), IndexType::Text);
}

#[test]
fn test_resolve_index_type_explicit_override() {
    use smongo_engine::index::{resolve_index_type, IndexOptions, IndexType};
    let keys = doc! { "emb": 1 };
    let opts = IndexOptions {
        index_type: Some(IndexType::VectorSearch),
        ..Default::default()
    };
    assert_eq!(resolve_index_type(&keys, &opts), IndexType::VectorSearch);
}

#[test]
fn test_text_fields() {
    use smongo_engine::index::text_fields;
    let keys = doc! { "title": "text", "body": "text", "date": 1 };
    let fields = text_fields(&keys);
    assert!(fields.contains(&"title".to_string()));
    assert!(fields.contains(&"body".to_string()));
    assert!(!fields.contains(&"date".to_string()));
}

// ============================================================
// Phase 1c: Descending key byte inversion
// ============================================================

#[test]
fn test_descending_key_encoding_roundtrip() {
    use smongo_engine::index::{decode_index_key, extract_index_key};

    let d = doc! { "score": 42_i32 };
    let keys_asc = doc! { "score": 1 };
    let keys_desc = doc! { "score": -1 };

    let asc_key = extract_index_key(&d, &keys_asc);
    let desc_key = extract_index_key(&d, &keys_desc);

    // Descending key should be inverted (different bytes)
    assert_ne!(asc_key, desc_key);

    // Both should decode back to the same value
    let decoded_asc = decode_index_key(&asc_key, &keys_asc).unwrap();
    let decoded_desc = decode_index_key(&desc_key, &keys_desc).unwrap();
    assert_eq!(decoded_asc.get_i32("score").unwrap(), 42);
    assert_eq!(decoded_desc.get_i32("score").unwrap(), 42);
}

#[test]
fn test_descending_key_reverses_sort_order() {
    use smongo_engine::index::extract_index_key;

    let keys_desc = doc! { "val": -1 };
    let d1 = doc! { "val": 10_i32 };
    let d2 = doc! { "val": 20_i32 };

    let k1 = extract_index_key(&d1, &keys_desc);
    let k2 = extract_index_key(&d2, &keys_desc);

    // With descending encoding, the smaller value should sort AFTER
    // the larger value in byte order.
    assert!(
        k1 > k2,
        "descending: key(10) should be > key(20) in byte order"
    );
}

// ============================================================
// Phase 1b: SortedIndexScan planner
// ============================================================

#[test]
fn test_plan_query_full_selects_sorted_scan() {
    use smongo_engine::index::{IndexOptions, IndexSpec};
    use smongo_engine::planner::{plan_query_full, ExecutionPlan};

    let indexes = vec![IndexSpec {
        name: "age_1".to_string(),
        keys: doc! { "age": 1 },
        options: IndexOptions::default(),
    }];

    let plan = plan_query_full(&doc! {}, &indexes, None, Some(&doc! { "age": 1 }), Some(10));

    assert!(
        matches!(plan.execution_plan, ExecutionPlan::SortedIndexScan { .. }),
        "Expected SortedIndexScan, got: {:?}",
        plan.execution_plan
    );
}

#[test]
fn test_sorted_scan_reverse_direction() {
    use smongo_engine::index::{IndexOptions, IndexSpec};
    use smongo_engine::planner::{plan_query_full, ExecutionPlan};

    let indexes = vec![IndexSpec {
        name: "age_1".to_string(),
        keys: doc! { "age": 1 },
        options: IndexOptions::default(),
    }];

    let plan = plan_query_full(&doc! {}, &indexes, None, Some(&doc! { "age": -1 }), Some(5));

    match &plan.execution_plan {
        ExecutionPlan::SortedIndexScan { reverse, limit, .. } => {
            assert!(
                *reverse,
                "descending sort on ascending index should be reverse"
            );
            assert_eq!(*limit, 5);
        }
        other => panic!("Expected SortedIndexScan, got: {:?}", other),
    }
}

#[test]
fn test_sorted_scan_no_match_different_fields() {
    use smongo_engine::index::{IndexOptions, IndexSpec};
    use smongo_engine::planner::{plan_query_full, ExecutionPlan};

    let indexes = vec![IndexSpec {
        name: "name_1".to_string(),
        keys: doc! { "name": 1 },
        options: IndexOptions::default(),
    }];

    let plan = plan_query_full(&doc! {}, &indexes, None, Some(&doc! { "age": 1 }), Some(10));

    // sort field "age" doesn't match index field "name"
    assert!(
        !matches!(plan.execution_plan, ExecutionPlan::SortedIndexScan { .. }),
        "Should not use SortedIndexScan when sort doesn't match index"
    );
}

// ============================================================
// Phase 2a: TotalOrd
// ============================================================

#[test]
fn test_total_f32_in_binary_heap() {
    use smongo_engine::aggregation::total_ord::TotalF32;
    use std::cmp::Reverse;
    use std::collections::BinaryHeap;

    let mut heap: BinaryHeap<Reverse<TotalF32>> = BinaryHeap::new();
    heap.push(Reverse(TotalF32(3.14)));
    heap.push(Reverse(TotalF32(1.41)));
    heap.push(Reverse(TotalF32(2.72)));
    assert_eq!(heap.pop().unwrap().0 .0, 1.41);
    assert_eq!(heap.pop().unwrap().0 .0, 2.72);
}

#[test]
fn test_total_f64_nan_sorts_high() {
    use smongo_engine::aggregation::total_ord::TotalF64;
    assert!(TotalF64(f64::NAN) > TotalF64(f64::MAX));
}

// ============================================================
// Phase 2b: BinaryHeap vectorSearch (integration)
// ============================================================

#[test]
fn test_vector_search_hnsw_topk() {
    use smongo_engine::aggregation::vector::vector_search_stage;

    let mut docs = Vec::new();
    for i in 0..100 {
        let v = vec![Bson::Double(i as f64), Bson::Double((100 - i) as f64)];
        docs.push(doc! { "_id": i, "emb": v });
    }

    let query_vec: Vec<Bson> = vec![Bson::Double(50.0), Bson::Double(50.0)];
    let spec = Bson::Document(doc! {
        "path": "emb",
        "queryVector": query_vec,
        "limit": 5,
        "numCandidates": 100,
        "index": "test_idx",
        "metric": "euclidean",
    });

    let results = vector_search_stage(docs, &spec).unwrap();

    assert_eq!(results.len(), 5);
    // Doc 50 ([50, 50]) is distance 0 from query [50, 50].
    let first_id = results[0].get_i32("_id").unwrap();
    assert_eq!(first_id, 50, "doc 50 should be closest, got {first_id}");
}

// ============================================================
// Phase 2d: $sort+$limit fusion
// ============================================================

#[test]
fn test_sort_limit_fusion() {
    use smongo_engine::aggregation::aggregate_stream;

    let docs: Vec<Document> = (0..50).map(|i| doc! { "val": i }).collect();

    let pipeline = vec![doc! { "$sort": { "val": -1 } }, doc! { "$limit": 5 }];

    let stream = aggregate_stream(docs, &pipeline).unwrap();
    let results: Vec<Document> = stream.filter_map(|r| r.ok()).collect();

    assert_eq!(results.len(), 5);
    // Should be descending: 49, 48, 47, 46, 45
    let vals: Vec<i32> = results.iter().map(|d| d.get_i32("val").unwrap()).collect();
    assert_eq!(vals, vec![49, 48, 47, 46, 45]);
}

// ============================================================
// Phase 3: VectorIndex
// ============================================================

#[cfg(not(target_arch = "wasm32"))]
mod vector_index_tests {
    use bson::doc;
    use smongo_engine::index::vector_index::VectorIndex;

    #[test]
    fn test_vector_index_build_and_search() {
        let docs = vec![
            doc! { "_id": "a", "v": [1.0, 0.0, 0.0] },
            doc! { "_id": "b", "v": [0.0, 1.0, 0.0] },
            doc! { "_id": "c", "v": [0.0, 0.0, 1.0] },
        ];
        let mut idx = VectorIndex::build(&docs, "v", 3, "cosine");
        assert_eq!(idx.len(), 3);

        let results = idx.search(&[1.0, 0.0, 0.0], 1);
        assert_eq!(results[0].0, "a");
    }

    #[test]
    fn test_vector_index_incremental() {
        let mut idx = VectorIndex::new(2, "euclidean");
        idx.insert("x", &[1.0, 0.0]);
        idx.insert("y", &[0.0, 1.0]);
        idx.insert("z", &[0.5, 0.5]);
        assert_eq!(idx.len(), 3);

        idx.remove("y");
        assert_eq!(idx.len(), 2);

        let results = idx.search(&[0.0, 1.0], 3);
        // y was removed, so z (0.5, 0.5) should be the closest
        assert_eq!(results[0].0, "z");
    }

    #[test]
    fn test_vector_index_persistence_roundtrip() {
        let mut idx = VectorIndex::new(3, "dotProduct");
        idx.insert("doc1", &[0.1, 0.2, 0.3]);
        idx.insert("doc2", &[0.4, 0.5, 0.6]);

        let bytes = idx.to_bytes();
        let mut idx2 = VectorIndex::from_bytes(&bytes).expect("deserialize");
        assert_eq!(idx2.len(), 2);
        assert_eq!(idx2.dimensions, 3);
        assert_eq!(idx2.metric, "dotProduct");

        let results = idx2.search(&[0.4, 0.5, 0.6], 1);
        assert_eq!(results[0].0, "doc2");
    }

    #[test]
    fn test_vector_index_dimension_mismatch_rejected() {
        let mut idx = VectorIndex::new(3, "cosine");
        idx.insert("a", &[1.0, 2.0]); // wrong dimensions
        assert_eq!(idx.len(), 0, "dimension mismatch should reject insert");
    }
}

// ============================================================
// Phase 5: BitmapIndex
// ============================================================

#[cfg(not(target_arch = "wasm32"))]
mod bitmap_tests {
    use smongo_engine::index::bitmap_index::BitmapIndex;

    #[test]
    fn test_bitmap_equality_lookup() {
        let mut bm = BitmapIndex::new();
        bm.insert("doc1", b"active");
        bm.insert("doc2", b"inactive");
        bm.insert("doc3", b"active");
        bm.insert("doc4", b"active");

        let pos = bm.lookup(b"active");
        let ids = bm.positions_to_ids(&pos);
        assert_eq!(ids.len(), 3);
        assert!(ids.contains(&"doc1".to_string()));
        assert!(ids.contains(&"doc3".to_string()));
    }

    #[test]
    fn test_bitmap_in_lookup() {
        let mut bm = BitmapIndex::new();
        bm.insert("a", b"red");
        bm.insert("b", b"blue");
        bm.insert("c", b"green");
        bm.insert("d", b"red");

        let pos = bm.lookup_in(&[b"red".to_vec(), b"green".to_vec()]);
        let ids = bm.positions_to_ids(&pos);
        assert_eq!(ids.len(), 3);
    }

    #[test]
    fn test_bitmap_and_operation() {
        let mut bm1 = BitmapIndex::new();
        bm1.insert("a", b"yes");
        bm1.insert("b", b"yes");
        bm1.insert("c", b"no");

        let mut bm2 = BitmapIndex::new();
        bm2.insert("a", b"premium");
        bm2.insert("c", b"premium");
        bm2.insert("d", b"basic");

        let active = bm1.lookup(b"yes");
        let premium = bm2.lookup(b"premium");
        let both = BitmapIndex::and(&active, &premium);
        // Only "a" is in both sets (position-based)
        let ids = bm1.positions_to_ids(&both);
        assert!(ids.contains(&"a".to_string()));
    }

    #[test]
    fn test_bitmap_remove() {
        let mut bm = BitmapIndex::new();
        bm.insert("x", b"val");
        bm.insert("y", b"val");
        bm.remove("x");
        let pos = bm.lookup(b"val");
        let ids = bm.positions_to_ids(&pos);
        assert_eq!(ids, vec!["y"]);
    }
}

// ============================================================
// Phase 6: TextIndex
// ============================================================

#[cfg(not(target_arch = "wasm32"))]
mod text_index_tests {
    use bson::doc;
    use smongo_engine::index::text_index::{tokenize, TextIndex};

    #[test]
    fn test_tokenizer_consistency() {
        let tokens = tokenize("Hello, World! Testing 1-2-3.");
        assert!(tokens.contains(&"hello".to_string()));
        assert!(tokens.contains(&"world".to_string()));
        assert!(tokens.contains(&"testing".to_string()));
    }

    #[test]
    fn test_text_search_and_semantics() {
        let docs = vec![
            doc! { "_id": 1, "title": "The quick brown fox" },
            doc! { "_id": 2, "title": "The lazy brown dog" },
            doc! { "_id": 3, "title": "Quick red car" },
        ];
        let idx = TextIndex::build(&docs, &["title".to_string()], None);

        // "quick brown" should only match doc 1 (AND semantics)
        let results = idx.search("quick brown", None);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, "1");
    }

    #[test]
    fn test_text_index_incremental_remove() {
        let docs = vec![
            doc! { "_id": "a", "text": "alpha beta" },
            doc! { "_id": "b", "text": "beta gamma" },
        ];
        let mut idx = TextIndex::build(&docs, &["text".to_string()], None);
        assert_eq!(idx.search("beta", None).len(), 2);

        idx.remove_doc("a");
        let results = idx.search("beta", None);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, "b");
    }

    #[test]
    fn test_text_index_persistence() {
        let docs = vec![
            doc! { "_id": 1, "body": "hello world" },
            doc! { "_id": 2, "body": "goodbye world" },
        ];
        let idx = TextIndex::build(&docs, &["body".to_string()], None);
        let bytes = idx.to_bytes();
        let idx2 = TextIndex::from_bytes(&bytes).unwrap();
        assert_eq!(idx2.doc_count(), 2);
        let results = idx2.search("world", None);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_text_index_multi_field() {
        let docs = vec![
            doc! { "_id": 1, "title": "Rust programming", "body": "Systems language" },
            doc! { "_id": 2, "title": "Python scripting", "body": "Dynamic language" },
        ];
        let idx = TextIndex::build(&docs, &["title".to_string(), "body".to_string()], None);
        let results = idx.search("language", None);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_text_index_tfidf_scoring() {
        let docs = vec![
            doc! { "_id": 1, "text": "cat cat cat dog" },
            doc! { "_id": 2, "text": "cat dog" },
            doc! { "_id": 3, "text": "bird" },
        ];
        let idx = TextIndex::build(&docs, &["text".to_string()], None);
        let results = idx.search("cat", None);
        // Doc 1 has higher TF for "cat", should score higher
        assert_eq!(results[0].0, "1");
    }
}

// ============================================================
// Phase 7: PrefixIndex
// ============================================================

#[test]
fn test_prefix_truncation() {
    use smongo_engine::index::prefix_index::truncate_key;
    let key = b"https://example.com/very/long/path".to_vec();
    let truncated = truncate_key(&key, 16);
    assert_eq!(truncated.len(), 16);
    assert_eq!(&truncated[..], &key[..16]);
}

#[test]
fn test_prefix_short_key_unchanged() {
    use smongo_engine::index::prefix_index::truncate_key;
    let key = b"hi".to_vec();
    let truncated = truncate_key(&key, 32);
    assert_eq!(truncated, key);
}

// ============================================================
// Unified ExecutionPlan exhaustiveness
// ============================================================

#[test]
fn test_explain_covers_all_plan_types() {
    use smongo_engine::explain::ExecutionPlanExplain;
    use smongo_engine::planner::ExecutionPlan;

    let plans = vec![
        ExecutionPlan::CollectionScan,
        ExecutionPlan::IndexScan {
            index_name: "x".into(),
            index_keys: doc! {},
        },
        ExecutionPlan::IndexSeek {
            index_name: "x".into(),
            index_keys: doc! {},
            seek_values: doc! {},
        },
        ExecutionPlan::CoveringIndexScan {
            index_name: "x".into(),
            index_keys: doc! {},
            seek_values: None,
            projection: doc! {},
        },
        ExecutionPlan::SortedIndexScan {
            index_name: "x".into(),
            index_keys: doc! {},
            limit: 10,
            reverse: false,
        },
        ExecutionPlan::VectorIndexSearch {
            index_name: "x".into(),
            field: "v".into(),
            dimensions: 3,
            metric: "cosine".into(),
            ef_construction: None,
            m: None,
            indexing_method: "hnsw".into(),
        },
        ExecutionPlan::BitmapScan {
            index_name: "x".into(),
            field: "f".into(),
        },
        ExecutionPlan::TextIndexScan {
            index_name: "x".into(),
            fields: vec!["t".into()],
        },
        ExecutionPlan::PrefixIndexScan {
            index_name: "x".into(),
            index_keys: doc! {},
            prefix_length: 16,
        },
        ExecutionPlan::GeoNear {
            index_name: "x".into(),
            field: "loc".into(),
            lon: 0.0,
            lat: 0.0,
            max_distance_m: None,
            min_distance_m: None,
        },
        ExecutionPlan::OrUnionPlans { subplans: vec![] },
    ];

    // Verifies that From<&ExecutionPlan> -> ExecutionPlanExplain doesn't panic
    for plan in &plans {
        let _explain: ExecutionPlanExplain = plan.into();
    }
}
