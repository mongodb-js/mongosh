use bson::{doc, Bson, Document};
use criterion::{black_box, criterion_group, criterion_main, Criterion};

use smongo_engine::aggregation::aggregate_stream;
use smongo_engine::index::extract_index_key;
use smongo_engine::index::hnsw::{DistanceMetric, HnswGraph};
use smongo_engine::index::vector_index::VectorIndex;
use smongo_engine::query::eval_query;
use smongo_engine::update::apply_update;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn sample_doc(i: i32) -> Document {
    doc! {
        "_id": i,
        "name": format!("user_{i}"),
        "age": 20 + (i % 60),
        "active": i % 2 == 0,
        "tags": ["alpha", "beta", "gamma"],
        "score": (i as f64) * 1.5,
        "nested": { "x": i * 10, "y": format!("val_{}", i % 100) },
    }
}

fn sample_docs(n: i32) -> Vec<Document> {
    (0..n).map(sample_doc).collect()
}

// ---------------------------------------------------------------------------
// eval_query benchmarks
// ---------------------------------------------------------------------------

fn bench_eval_query(c: &mut Criterion) {
    let doc = sample_doc(42);

    c.bench_function("eval_query/simple_eq", |b| {
        let q = doc! { "age": 42 };
        b.iter(|| eval_query(black_box(&doc), black_box(&q)))
    });

    c.bench_function("eval_query/$gt", |b| {
        let q = doc! { "age": { "$gt": 30 } };
        b.iter(|| eval_query(black_box(&doc), black_box(&q)))
    });

    c.bench_function("eval_query/$in_100", |b| {
        let vals: Vec<Bson> = (0..100).map(|i| Bson::Int32(i)).collect();
        let q = doc! { "age": { "$in": vals } };
        b.iter(|| eval_query(black_box(&doc), black_box(&q)))
    });

    c.bench_function("eval_query/$regex", |b| {
        let q = doc! { "name": { "$regex": "^user_4", "$options": "" } };
        b.iter(|| eval_query(black_box(&doc), black_box(&q)))
    });

    c.bench_function("eval_query/nested_field", |b| {
        let q = doc! { "nested.x": 420 };
        b.iter(|| eval_query(black_box(&doc), black_box(&q)))
    });

    c.bench_function("eval_query/compound_and", |b| {
        let q = doc! { "age": { "$gte": 20 }, "active": true, "score": { "$lt": 100.0 } };
        b.iter(|| eval_query(black_box(&doc), black_box(&q)))
    });
}

// ---------------------------------------------------------------------------
// apply_update benchmarks
// ---------------------------------------------------------------------------

fn bench_apply_update(c: &mut Criterion) {
    c.bench_function("apply_update/$set", |b| {
        b.iter_batched(
            || sample_doc(1),
            |mut doc| apply_update(&mut doc, black_box(&doc! { "$set": { "name": "updated" } })),
            criterion::BatchSize::SmallInput,
        )
    });

    c.bench_function("apply_update/$inc", |b| {
        b.iter_batched(
            || sample_doc(1),
            |mut doc| apply_update(&mut doc, black_box(&doc! { "$inc": { "age": 1 } })),
            criterion::BatchSize::SmallInput,
        )
    });

    c.bench_function("apply_update/$push", |b| {
        b.iter_batched(
            || sample_doc(1),
            |mut doc| apply_update(&mut doc, black_box(&doc! { "$push": { "tags": "delta" } })),
            criterion::BatchSize::SmallInput,
        )
    });

    c.bench_function("apply_update/$unset", |b| {
        b.iter_batched(
            || sample_doc(1),
            |mut doc| apply_update(&mut doc, black_box(&doc! { "$unset": { "score": "" } })),
            criterion::BatchSize::SmallInput,
        )
    });
}

// ---------------------------------------------------------------------------
// extract_index_key benchmarks
// ---------------------------------------------------------------------------

fn bench_extract_index_key(c: &mut Criterion) {
    let doc = sample_doc(42);

    c.bench_function("extract_index_key/single", |b| {
        let keys = doc! { "age": 1 };
        b.iter(|| extract_index_key(black_box(&doc), black_box(&keys)))
    });

    c.bench_function("extract_index_key/compound", |b| {
        let keys = doc! { "age": 1, "name": 1 };
        b.iter(|| extract_index_key(black_box(&doc), black_box(&keys)))
    });

    c.bench_function("extract_index_key/nested", |b| {
        let keys = doc! { "nested.x": 1 };
        b.iter(|| extract_index_key(black_box(&doc), black_box(&keys)))
    });
}

// ---------------------------------------------------------------------------
// aggregate_stream benchmarks
// ---------------------------------------------------------------------------

fn bench_aggregate(c: &mut Criterion) {
    let docs_100 = sample_docs(100);
    let docs_1000 = sample_docs(1000);

    c.bench_function("aggregate/$match+$limit/100", |b| {
        let pipeline = vec![
            doc! { "$match": { "age": { "$gte": 30 } } },
            doc! { "$limit": 10 },
        ];
        b.iter(|| {
            let stream =
                aggregate_stream(black_box(docs_100.clone()), black_box(&pipeline)).unwrap();
            stream.collect::<Vec<_>>()
        })
    });

    c.bench_function("aggregate/$match+$limit/1000", |b| {
        let pipeline = vec![
            doc! { "$match": { "age": { "$gte": 30 } } },
            doc! { "$limit": 10 },
        ];
        b.iter(|| {
            let stream =
                aggregate_stream(black_box(docs_1000.clone()), black_box(&pipeline)).unwrap();
            stream.collect::<Vec<_>>()
        })
    });

    c.bench_function("aggregate/$group_sum/100", |b| {
        let pipeline = vec![doc! { "$group": { "_id": "$active", "total": { "$sum": "$score" } } }];
        b.iter(|| {
            let stream =
                aggregate_stream(black_box(docs_100.clone()), black_box(&pipeline)).unwrap();
            stream.collect::<Vec<_>>()
        })
    });

    c.bench_function("aggregate/$sort+$limit/100", |b| {
        let pipeline = vec![doc! { "$sort": { "score": -1 } }, doc! { "$limit": 10 }];
        b.iter(|| {
            let stream =
                aggregate_stream(black_box(docs_100.clone()), black_box(&pipeline)).unwrap();
            stream.collect::<Vec<_>>()
        })
    });

    c.bench_function("aggregate/$sort+$limit/1000", |b| {
        let pipeline = vec![doc! { "$sort": { "score": -1 } }, doc! { "$limit": 10 }];
        b.iter(|| {
            let stream =
                aggregate_stream(black_box(docs_1000.clone()), black_box(&pipeline)).unwrap();
            stream.collect::<Vec<_>>()
        })
    });

    c.bench_function("aggregate/$project_inclusion/100", |b| {
        let pipeline = vec![doc! { "$project": { "name": 1, "age": 1 } }];
        b.iter(|| {
            let stream =
                aggregate_stream(black_box(docs_100.clone()), black_box(&pipeline)).unwrap();
            stream.collect::<Vec<_>>()
        })
    });

    c.bench_function("aggregate/$addFields/100", |b| {
        let pipeline =
            vec![doc! { "$addFields": { "doubled_score": { "$multiply": ["$score", 2] } } }];
        b.iter(|| {
            let stream =
                aggregate_stream(black_box(docs_100.clone()), black_box(&pipeline)).unwrap();
            stream.collect::<Vec<_>>()
        })
    });

    c.bench_function("aggregate/$unwind/100", |b| {
        let pipeline = vec![doc! { "$unwind": "$tags" }];
        b.iter(|| {
            let stream =
                aggregate_stream(black_box(docs_100.clone()), black_box(&pipeline)).unwrap();
            stream.collect::<Vec<_>>()
        })
    });
}

// ---------------------------------------------------------------------------
// HNSW vector search benchmarks
// ---------------------------------------------------------------------------

fn make_random_vecs(n: usize, dim: usize, seed: u64) -> Vec<f32> {
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

fn bench_hnsw(c: &mut Criterion) {
    let dim = 128;

    // --- Build benchmarks ---
    c.bench_function("hnsw/build_1k_128d", |b| {
        let vecs = make_random_vecs(1000, dim, 42);
        b.iter(|| {
            let mut g = HnswGraph::new(dim, 16, 200, DistanceMetric::NegDotProduct);
            for i in 0..1000 {
                g.insert(i, black_box(&vecs));
            }
            g
        })
    });

    c.bench_function("hnsw/build_10k_128d", |b| {
        let vecs = make_random_vecs(10_000, dim, 42);
        b.iter(|| {
            let mut g = HnswGraph::new(dim, 16, 200, DistanceMetric::NegDotProduct);
            for i in 0..10_000 {
                g.insert(i, black_box(&vecs));
            }
            g
        })
    });

    // --- Search benchmarks (pre-built graph) ---
    let n = 10_000;
    let vecs = make_random_vecs(n, dim, 42);
    let query_vecs = make_random_vecs(1, dim, 999);
    let query = &query_vecs[..dim];

    let mut graph = HnswGraph::new(dim, 16, 200, DistanceMetric::NegDotProduct);
    for i in 0..n {
        graph.insert(i, &vecs);
    }

    c.bench_function("hnsw/search_10k_k10_ef64", |b| {
        b.iter(|| graph.search(black_box(query), 10, 64, black_box(&vecs)))
    });

    c.bench_function("hnsw/search_10k_k10_ef200", |b| {
        b.iter(|| graph.search(black_box(query), 10, 200, black_box(&vecs)))
    });

    // --- VectorIndex end-to-end (build + search) ---
    c.bench_function("vector_index/build_search_1k_cosine", |b| {
        let docs: Vec<Document> = (0..1000)
            .map(|i| {
                let offset = i * dim;
                let emb: Vec<Bson> = vecs[offset..offset + dim]
                    .iter()
                    .map(|&f| Bson::Double(f as f64))
                    .collect();
                doc! { "_id": i as i32, "emb": emb }
            })
            .collect();
        b.iter(|| {
            let mut idx = VectorIndex::build(black_box(&docs), "emb", dim, "cosine");
            idx.search(black_box(query), 10)
        })
    });
}

criterion_group!(
    benches,
    bench_eval_query,
    bench_apply_update,
    bench_extract_index_key,
    bench_aggregate,
    bench_hnsw,
);
criterion_main!(benches);
