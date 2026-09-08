//! MongoDB-compatible aggregation pipeline.
//!
//! Supports stages: `$match`, `$project`, `$limit`, `$skip`, `$sort`, `$group`,
//! `$count`, `$unwind`, `$addFields`/`$set`, `$unset`, `$replaceRoot`/`$replaceWith`,
//! `$sample`, `$redact`, `$sortByCount`, `$bucket`, `$bucketAuto`, `$lookup`,
//! `$graphLookup`, `$facet`, `$setWindowFields`, `$unionWith`, `$out`, `$merge`,
//! `$vectorSearch`, `$geoNear`.
//!
//! Group accumulators: `$sum`, `$avg`, `$count`, `$min`, `$max`, `$first`, `$last`,
//! `$push`, `$addToSet`, `$mergeObjects`, `$stdDevPop`, `$stdDevSamp`, `$top`,
//! `$bottom`, `$topN`, `$bottomN`, `$firstN`, `$lastN`.

pub mod accumulators;
#[cfg(not(target_arch = "wasm32"))]
pub mod disk_spill;
pub mod expressions;
pub mod stages;
pub mod total_ord;
pub mod vector;

use bson::{Bson, Document};

use crate::database::Database;
use crate::storage::StorageBackend;

pub type AggregationResult<T> = Result<T, AggregationError>;

/// Boxed iterator over document results for streaming pipelines.
///
/// Streaming stages wrap the previous iterator lazily (e.g. filter, map, take),
/// while blocking stages collect all input, process it, and re-emit results.
pub type DocStream = Box<dyn Iterator<Item = AggregationResult<Document>>>;

/// 100 MB — matches MongoDB's default in-memory limit for blocking stages.
pub const DEFAULT_MEMORY_LIMIT_BYTES: usize = 100 * 1024 * 1024;

#[derive(Debug)]
pub enum AggregationError {
    InvalidStage(String),
    InvalidOperator(String),
    MissingField(String),
    TypeError(String),
    MemoryLimitExceeded {
        stage: String,
        used: usize,
        limit: usize,
    },
    Other(String),
}

impl std::fmt::Display for AggregationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AggregationError::InvalidStage(s) => write!(f, "Invalid stage: {}", s),
            AggregationError::InvalidOperator(s) => write!(f, "Invalid operator: {}", s),
            AggregationError::MissingField(s) => write!(f, "Missing field: {}", s),
            AggregationError::TypeError(s) => write!(f, "Type error: {}", s),
            AggregationError::MemoryLimitExceeded { stage, used, limit } => {
                let used_mb = *used as f64 / (1024.0 * 1024.0);
                let limit_mb = *limit as f64 / (1024.0 * 1024.0);
                #[cfg(not(target_arch = "wasm32"))]
                {
                    write!(
                        f,
                        "{stage} requires ~{used_mb:.0} MB, exceeding the {limit_mb:.0} MB limit. \
                         Pass allowDiskUse=True to enable spill-to-disk for memory-intensive stages."
                    )
                }
                #[cfg(target_arch = "wasm32")]
                {
                    write!(
                        f,
                        "{stage} requires ~{used_mb:.0} MB, exceeding the {limit_mb:.0} MB limit. \
                         Reduce the dataset size or increase the memory limit."
                    )
                }
            }
            AggregationError::Other(s) => write!(f, "{}", s),
        }
    }
}

impl std::error::Error for AggregationError {}

/// Trait for resolving cross-collection document access in `$lookup` and `$graphLookup`.
///
/// Implement this trait to allow the aggregation pipeline to read documents from
/// other collections. Pass `None` for pipelines that don't use join stages.
pub trait CollectionResolver {
    fn resolve(&self, name: &str, filter: Option<&Document>) -> AggregationResult<Vec<Document>>;
}

/// Read-only trait for index-accelerated operations in aggregation stages.
///
/// When an `IndexProvider` is available, stages like `$vectorSearch`,
/// `$geoNear`, `$sort`+`$limit`, and `$text`-inside-`$match` can check
/// for a matching index and use it instead of a full collection scan.  Each
/// method returns `Ok(None)` when no suitable index exists, signalling the
/// caller to fall back to the default streaming path.
#[allow(clippy::too_many_arguments)]
pub trait IndexProvider {
    fn vector_search(
        &self,
        collection: &str,
        field: &str,
        query_vec: &[f32],
        limit: usize,
        num_candidates: usize,
        metric: &str,
        filter: Option<&Document>,
        exact: bool,
    ) -> AggregationResult<Option<Vec<(Document, f32)>>>;

    fn geo_near_indexed(
        &self,
        collection: &str,
        field: &str,
        lon: f64,
        lat: f64,
        limit: Option<usize>,
        max_distance: Option<f64>,
        query: Option<&Document>,
    ) -> AggregationResult<Option<Vec<(Document, f64)>>>;

    fn sorted_scan(
        &self,
        collection: &str,
        sort_keys: &Document,
        limit: usize,
        filter: Option<&Document>,
    ) -> AggregationResult<Option<Vec<Document>>>;

    fn text_search(
        &self,
        collection: &str,
        search_str: &str,
        filter: Option<&Document>,
    ) -> AggregationResult<Option<Vec<Document>>>;
}

/// Trait for write access to collections from aggregation stages (`$out`, `$merge`).
pub trait DatabaseMutator {
    fn drop_and_insert(&self, name: &str, docs: &[Document]) -> AggregationResult<()>;
    fn upsert(
        &self,
        name: &str,
        on_fields: &[String],
        docs: &[Document],
        when_matched: &str,
    ) -> AggregationResult<()>;
}

/// Aggregation context backed by a real [`Database`], enabling cross-collection
/// reads (`$lookup`, `$graphLookup`, `$unionWith`) and writes (`$out`, `$merge`)
/// without leaving Rust.
pub struct DatabaseContext<'a, B: StorageBackend> {
    db: &'a Database<B>,
}

impl<'a, B: StorageBackend> DatabaseContext<'a, B> {
    pub fn new(db: &'a Database<B>) -> Self {
        Self { db }
    }
}

impl<B: StorageBackend> CollectionResolver for DatabaseContext<'_, B> {
    fn resolve(&self, name: &str, filter: Option<&Document>) -> AggregationResult<Vec<Document>> {
        let coll = self
            .db
            .collection(name)
            .map_err(|e| AggregationError::Other(e.to_string()))?;
        let query = filter.cloned().unwrap_or_default();
        coll.find(query)
            .map_err(|e| AggregationError::Other(e.to_string()))
    }
}

impl<B: StorageBackend> DatabaseMutator for DatabaseContext<'_, B> {
    fn drop_and_insert(&self, name: &str, docs: &[Document]) -> AggregationResult<()> {
        let coll = self
            .db
            .collection(name)
            .map_err(|e| AggregationError::Other(e.to_string()))?;
        coll.delete_many(Document::new())
            .map_err(|e| AggregationError::Other(e.to_string()))?;
        if !docs.is_empty() {
            coll.insert_many(docs.to_vec())
                .map_err(|e| AggregationError::Other(e.to_string()))?;
        }
        Ok(())
    }

    fn upsert(
        &self,
        name: &str,
        on_fields: &[String],
        docs: &[Document],
        when_matched: &str,
    ) -> AggregationResult<()> {
        let coll = self
            .db
            .collection(name)
            .map_err(|e| AggregationError::Other(e.to_string()))?;
        for doc in docs {
            let mut filter = Document::new();
            for field in on_fields {
                if let Some(val) = doc.get(field) {
                    filter.insert(field.clone(), val.clone());
                }
            }
            let existing = coll
                .find_one(filter.clone())
                .map_err(|e| AggregationError::Other(e.to_string()))?;
            if existing.is_some() {
                match when_matched {
                    "replace" => {
                        let update = bson::doc! { "$set": doc.clone() };
                        coll.update_one(filter, update)
                            .map_err(|e| AggregationError::Other(e.to_string()))?;
                    }
                    "keepExisting" => {}
                    "fail" => {
                        return Err(AggregationError::Other(
                            "$merge: document matched whenMatched=fail".into(),
                        ));
                    }
                    _ => {
                        let update = bson::doc! { "$set": doc.clone() };
                        coll.update_one(filter, update)
                            .map_err(|e| AggregationError::Other(e.to_string()))?;
                    }
                }
            } else {
                coll.insert_one(doc.clone())
                    .map_err(|e| AggregationError::Other(e.to_string()))?;
            }
        }
        Ok(())
    }
}

impl<B: StorageBackend> IndexProvider for DatabaseContext<'_, B> {
    fn vector_search(
        &self,
        collection: &str,
        field: &str,
        query_vec: &[f32],
        limit: usize,
        num_candidates: usize,
        metric: &str,
        filter: Option<&Document>,
        exact: bool,
    ) -> AggregationResult<Option<Vec<(Document, f32)>>> {
        let coll = self
            .db
            .collection(collection)
            .map_err(|e| AggregationError::Other(e.to_string()))?;

        let indexes = coll
            .list_indexes()
            .map_err(|e| AggregationError::Other(e.to_string()))?;

        let vec_idx = indexes.iter().find(|idx| {
            matches!(
                idx.options.index_type,
                Some(crate::index::IndexType::VectorSearch)
            )
        });
        let vec_idx = match vec_idx {
            Some(idx) => idx,
            None => return Ok(None),
        };

        let vopts = vec_idx.options.vector_options.as_ref();

        // Determine whether to use flat scan: explicit `exact: true` in the
        // query, or the index was created with `indexingMethod: "flat"`.
        let use_flat = exact || vopts.map(|v| v.indexing_method == "flat").unwrap_or(false);

        // Atlas resolves the similarity metric from the index definition, not
        // the query.  If the query supplied a metric we honour it, but when
        // the default ("cosine") was used we prefer the index's metric.
        let resolved_metric = vopts.map(|v| v.metric.as_str()).unwrap_or(metric);

        let candidates = match filter {
            Some(f) => coll
                .find(f.clone())
                .map_err(|e| AggregationError::Other(e.to_string()))?,
            None => coll
                .find(Document::new())
                .map_err(|e| AggregationError::Other(e.to_string()))?,
        };

        let effective_limit = num_candidates.max(limit);
        let scored = vector::score_documents(
            &candidates,
            field,
            query_vec,
            effective_limit,
            resolved_metric,
            use_flat,
        )?;
        let trimmed = if scored.len() > limit {
            scored.into_iter().take(limit).collect()
        } else {
            scored
        };
        Ok(Some(trimmed))
    }

    fn geo_near_indexed(
        &self,
        collection: &str,
        field: &str,
        lon: f64,
        lat: f64,
        limit: Option<usize>,
        max_distance: Option<f64>,
        query: Option<&Document>,
    ) -> AggregationResult<Option<Vec<(Document, f64)>>> {
        let coll = self
            .db
            .collection(collection)
            .map_err(|e| AggregationError::Other(e.to_string()))?;

        let indexes = coll
            .list_indexes()
            .map_err(|e| AggregationError::Other(e.to_string()))?;

        let geo_index = indexes
            .iter()
            .find(|idx| crate::index::twodsphere_field(&idx.keys).as_deref() == Some(field));

        let Some(idx) = geo_index else {
            return Ok(None);
        };

        let plan = crate::planner::ExecutionPlan::GeoNear {
            index_name: idx.name.clone(),
            field: field.to_string(),
            lon,
            lat,
            max_distance_m: max_distance,
            min_distance_m: None,
        };

        let filter = query.cloned().unwrap_or_default();
        let docs = coll
            .execute_plan(&plan, &filter)
            .map_err(|e| AggregationError::Other(e.to_string()))?;

        let mut scored: Vec<(Document, f64)> = docs
            .into_iter()
            .filter_map(|doc| {
                let val = crate::paths::get_value(&doc, field);
                let (dlon, dlat) = crate::geo::extract_lon_lat(val)?;
                let dist = crate::geo::haversine_meters(lon, lat, dlon, dlat);
                Some((doc, dist))
            })
            .collect();

        scored.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));

        if let Some(lim) = limit {
            scored.truncate(lim);
        }

        Ok(Some(scored))
    }

    fn sorted_scan(
        &self,
        collection: &str,
        sort_keys: &Document,
        limit: usize,
        filter: Option<&Document>,
    ) -> AggregationResult<Option<Vec<Document>>> {
        let coll = self
            .db
            .collection(collection)
            .map_err(|e| AggregationError::Other(e.to_string()))?;
        let indexes = coll
            .list_indexes()
            .map_err(|e| AggregationError::Other(e.to_string()))?;
        let plan = crate::planner::plan_query_full(
            filter.unwrap_or(&Document::new()),
            &indexes,
            None,
            Some(sort_keys),
            Some(limit as i64),
        );
        if matches!(
            plan.execution_plan,
            crate::planner::ExecutionPlan::SortedIndexScan { .. }
        ) {
            let docs = coll
                .execute_plan(&plan.execution_plan, filter.unwrap_or(&Document::new()))
                .map_err(|e| AggregationError::Other(e.to_string()))?;
            Ok(Some(docs))
        } else {
            Ok(None)
        }
    }

    fn text_search(
        &self,
        collection: &str,
        search_str: &str,
        filter: Option<&Document>,
    ) -> AggregationResult<Option<Vec<Document>>> {
        let text_filter = bson::doc! { "$text": { "$search": search_str } };
        let combined = match filter {
            Some(f) => {
                let mut merged = f.clone();
                if let Some(tv) = text_filter.get("$text") {
                    merged.insert("$text".to_string(), tv.clone());
                }
                merged
            }
            None => text_filter,
        };
        let coll = self
            .db
            .collection(collection)
            .map_err(|e| AggregationError::Other(e.to_string()))?;
        let indexes = coll
            .list_indexes()
            .map_err(|e| AggregationError::Other(e.to_string()))?;
        let plan = crate::planner::plan_query(&combined, &indexes);
        if matches!(
            plan.execution_plan,
            crate::planner::ExecutionPlan::TextIndexScan { .. }
        ) {
            let docs = coll
                .execute_plan(&plan.execution_plan, &combined)
                .map_err(|e| AggregationError::Other(e.to_string()))?;
            Ok(Some(docs))
        } else {
            Ok(None)
        }
    }
}

/// Extract and merge consecutive leading `$match` stages from a pipeline.
///
/// Returns `(leading_filter, remaining_pipeline)`.  If the pipeline starts
/// with one or more `$match` stages they are merged into a single filter
/// document (using `$and` when field keys overlap) and stripped from the
/// returned pipeline.  Stages after the first non-`$match` are never touched.
///
/// This is a pure function — it performs no I/O and has no storage dependency.
pub fn optimize_pipeline(pipeline: &[Document]) -> (Option<Document>, Vec<Document>) {
    let mut merged_filter: Option<Document> = None;
    let mut remaining_start = 0;

    for stage in pipeline {
        let is_match = stage
            .iter()
            .next()
            .map(|(name, _)| name == "$match")
            .unwrap_or(false);

        if !is_match {
            break;
        }

        if let Ok(filter) = stage.get_document("$match") {
            merged_filter = Some(match merged_filter {
                None => filter.clone(),
                Some(prev) => merge_match_filters(&prev, filter),
            });
            remaining_start += 1;
        } else {
            break;
        }
    }

    let remaining = pipeline[remaining_start..].to_vec();
    (merged_filter, remaining)
}

/// Merge two `$match` filter documents into one.
///
/// Simple case: disjoint field sets are combined into a single document.
/// Overlapping keys are wrapped in `$and` to preserve both predicates.
fn merge_match_filters(a: &Document, b: &Document) -> Document {
    let has_overlap = b.keys().any(|k| a.contains_key(k));

    if !has_overlap {
        let mut merged = a.clone();
        for (k, v) in b {
            merged.insert(k.clone(), v.clone());
        }
        merged
    } else {
        bson::doc! {
            "$and": [a.clone(), b.clone()]
        }
    }
}

/// Optional context for index-accelerated aggregation stages.
///
/// When passed through the pipeline dispatch, stages like `$sort`+`$limit`
/// and `$vectorSearch` can probe for a matching index and short-circuit the
/// default scan path.
pub struct PipelineIndexCtx<'a> {
    pub provider: &'a dyn IndexProvider,
    pub source_collection: &'a str,
}

/// Execute an aggregation pipeline without cross-collection support.
///
/// Internally delegates to the streaming pipeline and collects results.
pub fn aggregate(docs: Vec<Document>, pipeline: &[Document]) -> AggregationResult<Vec<Document>> {
    aggregate_with_resolver(docs, pipeline, None)
}

/// Execute an aggregation pipeline with optional cross-collection support.
///
/// Internally delegates to the streaming pipeline and collects results.
pub fn aggregate_with_resolver(
    docs: Vec<Document>,
    pipeline: &[Document],
    resolver: Option<&dyn CollectionResolver>,
) -> AggregationResult<Vec<Document>> {
    let stream = aggregate_stream_with_resolver(docs, pipeline, resolver, None)?;
    stream.collect()
}

/// Execute a full aggregation pipeline with a [`DatabaseContext`] providing
/// both cross-collection reads and writes. This is the "zero-FFI" path:
/// `$lookup`, `$graphLookup`, `$facet`, `$unionWith`, `$out`, `$merge`,
/// `$vectorSearch`, and `$geoNear` all resolve entirely inside the engine.
pub fn aggregate_with_db<B: StorageBackend>(
    docs: Vec<Document>,
    pipeline: &[Document],
    ctx: &DatabaseContext<'_, B>,
) -> AggregationResult<Vec<Document>> {
    aggregate_with_db_collection(docs, pipeline, ctx, None)
}

/// Like [`aggregate_with_db`] but also provides the source collection name
/// so that index-backed optimisations (`$sort`+`$limit`, `$vectorSearch`,
/// `$text`) can probe for matching indexes.
pub fn aggregate_with_db_collection<B: StorageBackend>(
    docs: Vec<Document>,
    pipeline: &[Document],
    ctx: &DatabaseContext<'_, B>,
    source_collection: Option<&str>,
) -> AggregationResult<Vec<Document>> {
    let resolver: &dyn CollectionResolver = ctx;
    let idx_ctx = source_collection.map(|name| PipelineIndexCtx {
        provider: ctx as &dyn IndexProvider,
        source_collection: name,
    });

    let (main_pipeline, write_stage) = split_write_stage(pipeline);

    let stream =
        aggregate_stream_full(docs, &main_pipeline, Some(resolver), idx_ctx.as_ref(), None)?;
    let results: Vec<Document> = stream.collect::<AggregationResult<Vec<_>>>()?;

    if let Some(stage) = write_stage {
        let (stage_name, stage_value) = stage
            .iter()
            .next()
            .ok_or_else(|| AggregationError::InvalidStage("empty write stage".into()))?;
        match stage_name.as_str() {
            "$out" => stages::execute_out(stage_value, &results, ctx)?,
            "$merge" => stages::execute_merge(stage_value, &results, ctx)?,
            _ => {}
        }
    }

    Ok(results)
}

/// Like [`aggregate_with_db_collection`] but accepts a lazy iterator of
/// results instead of a pre-materialized `Vec<Document>`.
pub fn aggregate_with_db_collection_streaming<B: StorageBackend, I>(
    docs: I,
    pipeline: &[Document],
    ctx: &DatabaseContext<'_, B>,
    source_collection: Option<&str>,
    memory_limit_bytes: Option<usize>,
) -> AggregationResult<Vec<Document>>
where
    I: Iterator<Item = crate::collection::CollectionResult<Document>> + 'static,
{
    aggregate_with_db_collection_streaming_opts(
        docs,
        pipeline,
        ctx,
        source_collection,
        memory_limit_bytes,
        false,
    )
}

/// Like [`aggregate_with_db_collection_streaming`] but also accepts
/// `allow_disk_use` to enable spill-to-disk for `$sort` and `$group`.
pub fn aggregate_with_db_collection_streaming_opts<B: StorageBackend, I>(
    docs: I,
    pipeline: &[Document],
    ctx: &DatabaseContext<'_, B>,
    source_collection: Option<&str>,
    memory_limit_bytes: Option<usize>,
    allow_disk_use: bool,
) -> AggregationResult<Vec<Document>>
where
    I: Iterator<Item = crate::collection::CollectionResult<Document>> + 'static,
{
    let resolver: &dyn CollectionResolver = ctx;
    let idx_ctx = source_collection.map(|name| PipelineIndexCtx {
        provider: ctx as &dyn IndexProvider,
        source_collection: name,
    });

    let (main_pipeline, write_stage) = split_write_stage(pipeline);

    let stream = aggregate_stream_full_from_iter(
        docs,
        &main_pipeline,
        Some(resolver),
        idx_ctx.as_ref(),
        memory_limit_bytes,
        allow_disk_use,
    )?;
    let results: Vec<Document> = stream.collect::<AggregationResult<Vec<_>>>()?;

    if let Some(stage) = write_stage {
        let (stage_name, stage_value) = stage
            .iter()
            .next()
            .ok_or_else(|| AggregationError::InvalidStage("empty write stage".into()))?;
        match stage_name.as_str() {
            "$out" => stages::execute_out(stage_value, &results, ctx)?,
            "$merge" => stages::execute_merge(stage_value, &results, ctx)?,
            _ => {}
        }
    }

    Ok(results)
}

/// Split a trailing `$out` or `$merge` from the rest of the pipeline.
fn split_write_stage(pipeline: &[Document]) -> (Vec<Document>, Option<Document>) {
    if let Some(last) = pipeline.last() {
        let is_write = last
            .iter()
            .next()
            .map(|(name, _)| name == "$out" || name == "$merge")
            .unwrap_or(false);
        if is_write {
            return (pipeline[..pipeline.len() - 1].to_vec(), Some(last.clone()));
        }
    }
    (pipeline.to_vec(), None)
}

/// Execute an aggregation pipeline as a streaming iterator.
///
/// Returns a lazy iterator that processes documents through the pipeline
/// with constant memory for consecutive streaming stages (`$match`,
/// `$project`, `$limit`, `$skip`, `$unwind`, `$addFields`, `$unset`,
/// `$replaceRoot`, `$redact`).  Blocking stages (`$sort`, `$group`, etc.)
/// materialize only at their own boundary.
///
/// `$limit` uses `Iterator::take`, which naturally short-circuits upstream
/// and delivers early termination for free.
pub fn aggregate_stream(
    docs: Vec<Document>,
    pipeline: &[Document],
) -> AggregationResult<DocStream> {
    aggregate_stream_with_resolver(docs, pipeline, None, None)
}

/// Execute a streaming aggregation pipeline with optional cross-collection support.
///
/// Includes a **sort+limit fusion** optimisation: when a `$sort` is
/// immediately followed by `$limit`, both stages are merged into a single
/// BinaryHeap top-k pass (O(n log k) instead of O(n log n)).
pub fn aggregate_stream_with_resolver(
    docs: Vec<Document>,
    pipeline: &[Document],
    resolver: Option<&dyn CollectionResolver>,
    memory_limit_bytes: Option<usize>,
) -> AggregationResult<DocStream> {
    aggregate_stream_full(docs, pipeline, resolver, None, memory_limit_bytes)
}

/// Streaming pipeline with full context: cross-collection resolver **and**
/// index provider for index-backed stage optimisations.
pub fn aggregate_stream_full(
    docs: Vec<Document>,
    pipeline: &[Document],
    resolver: Option<&dyn CollectionResolver>,
    idx_ctx: Option<&PipelineIndexCtx<'_>>,
    memory_limit_bytes: Option<usize>,
) -> AggregationResult<DocStream> {
    let stream: DocStream = Box::new(docs.into_iter().map(Ok));
    run_pipeline_stages(
        stream,
        pipeline,
        resolver,
        idx_ctx,
        memory_limit_bytes,
        false,
    )
}

/// Like [`aggregate_stream_full`] but accepts a lazy iterator of documents
/// instead of a pre-materialized `Vec`.  The input is only consumed as
/// downstream stages demand, so a `$match` → `$limit` pipeline over a lazy
/// cursor will short-circuit without reading the entire collection.
pub fn aggregate_stream_full_from_iter<I>(
    docs: I,
    pipeline: &[Document],
    resolver: Option<&dyn CollectionResolver>,
    idx_ctx: Option<&PipelineIndexCtx<'_>>,
    memory_limit_bytes: Option<usize>,
    allow_disk_use: bool,
) -> AggregationResult<DocStream>
where
    I: Iterator<Item = crate::collection::CollectionResult<Document>> + 'static,
{
    let stream: DocStream =
        Box::new(docs.map(|r| r.map_err(|e| AggregationError::Other(e.to_string()))));
    run_pipeline_stages(
        stream,
        pipeline,
        resolver,
        idx_ctx,
        memory_limit_bytes,
        allow_disk_use,
    )
}

fn run_pipeline_stages(
    initial: DocStream,
    pipeline: &[Document],
    resolver: Option<&dyn CollectionResolver>,
    idx_ctx: Option<&PipelineIndexCtx<'_>>,
    memory_limit_bytes: Option<usize>,
    allow_disk_use: bool,
) -> AggregationResult<DocStream> {
    // Atlas requires $vectorSearch / $geoNear to be the first stage.
    for (pos, stage) in pipeline.iter().enumerate() {
        if pos == 0 {
            continue;
        }
        if let Some(name) = stage.keys().next() {
            if name == "$vectorSearch" || name == "$geoNear" {
                return Err(AggregationError::InvalidStage(format!(
                    "{name} must be the first stage in the pipeline"
                )));
            }
        }
    }

    let mut stream = initial;
    let mut i = 0;

    while i < pipeline.len() {
        let stage = &pipeline[i];

        // Peek ahead: $sort followed by $limit → try index-backed sorted scan
        // first, falling back to the in-memory BinaryHeap top-k pass.
        if i + 1 < pipeline.len() {
            if let (Some((sn, sv)), Some((ln, lv))) =
                (stage.iter().next(), pipeline[i + 1].iter().next())
            {
                if sn == "$sort" && ln == "$limit" {
                    if let Some(ctx) = idx_ctx {
                        if let Some(sorted) = try_index_sort_limit(ctx, sv, lv)? {
                            drop(stream);
                            stream = Box::new(sorted.into_iter().map(Ok));
                            i += 2;
                            continue;
                        }
                    }
                    stream = stages::stage_sort_limit_stream(stream, sv, lv, memory_limit_bytes)?;
                    i += 2;
                    continue;
                }
            }
        }

        stream = execute_stage_stream(
            stream,
            stage,
            resolver,
            idx_ctx,
            memory_limit_bytes,
            allow_disk_use,
        )?;
        i += 1;
    }

    Ok(stream)
}

/// Attempt a `sorted_scan` through the index provider for a $sort + $limit pair.
fn try_index_sort_limit(
    ctx: &PipelineIndexCtx<'_>,
    sort_spec: &Bson,
    limit_spec: &Bson,
) -> AggregationResult<Option<Vec<Document>>> {
    let sort_doc = match sort_spec.as_document() {
        Some(d) => d,
        None => return Ok(None),
    };
    let limit = limit_spec
        .as_i64()
        .or_else(|| limit_spec.as_i32().map(|i| i as i64))
        .unwrap_or(0) as usize;
    if limit == 0 {
        return Ok(None);
    }
    ctx.provider
        .sorted_scan(ctx.source_collection, sort_doc, limit, None)
}

fn execute_stage_stream(
    input: DocStream,
    stage: &Document,
    resolver: Option<&dyn CollectionResolver>,
    idx_ctx: Option<&PipelineIndexCtx<'_>>,
    memory_limit_bytes: Option<usize>,
    allow_disk_use: bool,
) -> AggregationResult<DocStream> {
    let (stage_name, stage_value) = stage
        .iter()
        .next()
        .ok_or_else(|| AggregationError::InvalidStage("Empty stage".to_string()))?;

    let ml = memory_limit_bytes;
    match stage_name.as_str() {
        "$match" => stages::stage_match_stream(input, stage_value),
        "$project" => stages::stage_project_stream(input, stage_value),
        "$limit" => stages::stage_limit_stream(input, stage_value),
        "$skip" => stages::stage_skip_stream(input, stage_value),
        "$sort" => stages::stage_sort_stream(input, stage_value, ml, allow_disk_use),
        "$group" => stages::stage_group_stream(input, stage_value, ml, allow_disk_use),
        "$count" => stages::stage_count_stream(input, stage_value, ml),
        "$unwind" => stages::stage_unwind_stream(input, stage_value),
        "$addFields" | "$set" => stages::stage_add_fields_stream(input, stage_value),
        "$unset" => stages::stage_unset_stream(input, stage_value),
        "$replaceRoot" | "$replaceWith" => stages::stage_replace_root_stream(input, stage_value),
        "$sample" => stages::stage_sample_stream(input, stage_value, ml),
        "$redact" => stages::stage_redact_stream(input, stage_value),
        "$sortByCount" => stages::stage_sort_by_count_stream(input, stage_value, ml),
        "$bucket" => stages::stage_bucket_stream(input, stage_value, ml),
        "$bucketAuto" => stages::stage_bucket_auto_stream(input, stage_value, ml),
        "$lookup" => stages::stage_lookup_stream(input, stage_value, resolver, ml),
        "$graphLookup" => stages::stage_graph_lookup_stream(input, stage_value, resolver, ml),
        "$facet" => stages::stage_facet_stream(input, stage_value, resolver, ml),
        "$setWindowFields" => stages::stage_set_window_fields_stream(input, stage_value, ml),
        "$unionWith" => stages::stage_union_with_stream(input, stage_value, resolver, ml),
        "$out" => stages::stage_out_stream(input, stage_value),
        "$merge" => stages::stage_merge_stream(input, stage_value),
        "$vectorSearch" => stages::stage_vector_search_stream_indexed(input, stage_value, idx_ctx),
        "$geoNear" => stages::stage_geo_near_stream_indexed(input, stage_value, idx_ctx),
        _ => Err(AggregationError::InvalidStage(format!(
            "Unknown stage: {}",
            stage_name
        ))),
    }
}

/// Compare two BSON values following MongoDB's comparison order.
///
/// Ordering: Null < Number < String < Document < Array < Boolean < ObjectId.
/// Cross-numeric comparison (Int32 vs Int64 vs Double) is supported.
pub fn compare_bson(a: Option<&Bson>, b: Option<&Bson>) -> std::cmp::Ordering {
    use std::cmp::Ordering;

    fn type_order(b: &Bson) -> u8 {
        match b {
            Bson::Null => 1,
            Bson::Int32(_) | Bson::Int64(_) | Bson::Double(_) => 2,
            Bson::String(_) => 3,
            Bson::Document(_) => 4,
            Bson::Array(_) => 5,
            Bson::Boolean(_) => 6,
            Bson::ObjectId(_) => 7,
            Bson::DateTime(_) => 8,
            _ => 9,
        }
    }

    fn as_f64(b: &Bson) -> Option<f64> {
        match b {
            Bson::Int32(n) => Some(*n as f64),
            Bson::Int64(n) => Some(*n as f64),
            Bson::Double(n) => Some(*n),
            _ => None,
        }
    }

    match (a, b) {
        (None, None) => Ordering::Equal,
        (None, Some(_)) => Ordering::Less,
        (Some(_), None) => Ordering::Greater,
        (Some(a_val), Some(b_val)) => {
            let ta = type_order(a_val);
            let tb = type_order(b_val);
            if ta != tb {
                return ta.cmp(&tb);
            }
            match (a_val, b_val) {
                (Bson::Null, Bson::Null) => Ordering::Equal,
                (na, nb) if as_f64(na).is_some() && as_f64(nb).is_some() => {
                    match (as_f64(na), as_f64(nb)) {
                        (Some(fa), Some(fb)) => fa.partial_cmp(&fb).unwrap_or(Ordering::Equal),
                        _ => Ordering::Equal,
                    }
                }
                (Bson::String(x), Bson::String(y)) => x.cmp(y),
                (Bson::Boolean(x), Bson::Boolean(y)) => x.cmp(y),
                (Bson::ObjectId(x), Bson::ObjectId(y)) => x.cmp(y),
                (Bson::DateTime(x), Bson::DateTime(y)) => x.cmp(y),
                _ => Ordering::Equal,
            }
        }
    }
}

/// Compare two BSON values following MongoDB's comparison order, with
/// optional collation applied to string comparisons.
pub fn compare_bson_with_collation(
    a: Option<&Bson>,
    b: Option<&Bson>,
    collation: Option<&crate::collation::Collation>,
) -> std::cmp::Ordering {
    match collation {
        Some(c) => c.compare_bson(a, b),
        None => compare_bson(a, b),
    }
}

fn bson_to_key_string(bson: &Bson) -> String {
    match bson {
        Bson::String(s) => format!("s:{}", s),
        Bson::Int32(n) => format!("n:{}", *n as f64),
        Bson::Int64(n) => format!("n:{}", *n as f64),
        Bson::Double(n) => format!("n:{}", n),
        Bson::Boolean(b) => format!("bool:{}", b),
        Bson::Null => "null".to_string(),
        Bson::ObjectId(oid) => format!("oid:{}", oid),
        Bson::Document(d) => format!("doc:{:?}", d),
        _ => format!("{:?}", bson),
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;
    use bson::doc;

    #[test]
    fn test_stage_match() {
        let docs = vec![
            doc! { "age": 30, "name": "Alice" },
            doc! { "age": 25, "name": "Bob" },
        ];
        let pipeline = vec![doc! { "$match": { "age": { "$gte": 30 } } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].get_str("name").unwrap(), "Alice");
    }

    #[test]
    fn test_stage_limit() {
        let docs = vec![doc! { "n": 1 }, doc! { "n": 2 }, doc! { "n": 3 }];
        let pipeline = vec![doc! { "$limit": 2 }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_stage_skip() {
        let docs = vec![doc! { "n": 1 }, doc! { "n": 2 }, doc! { "n": 3 }];
        let pipeline = vec![doc! { "$skip": 1 }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].get_i32("n").unwrap(), 2);
    }

    #[test]
    fn test_stage_sort() {
        let docs = vec![doc! { "age": 30 }, doc! { "age": 20 }, doc! { "age": 25 }];
        let pipeline = vec![doc! { "$sort": { "age": 1 } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results[0].get_i32("age").unwrap(), 20);
        assert_eq!(results[2].get_i32("age").unwrap(), 30);
    }

    #[test]
    fn test_stage_count() {
        let docs = vec![doc! { "n": 1 }, doc! { "n": 2 }, doc! { "n": 3 }];
        let pipeline = vec![doc! { "$count": "total" }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].get_i32("total").unwrap(), 3);
    }

    #[test]
    fn test_project_inclusion() {
        let docs = vec![doc! { "_id": 1, "name": "Alice", "age": 30, "email": "a@b.c" }];
        let pipeline = vec![doc! { "$project": { "name": 1, "age": 1 } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results[0].get_str("name").unwrap(), "Alice");
        assert_eq!(results[0].get_i32("age").unwrap(), 30);
        assert!(results[0].get("_id").is_some());
        assert!(results[0].get("email").is_none());
    }

    #[test]
    fn test_project_exclusion() {
        let docs = vec![doc! { "_id": 1, "name": "Alice", "age": 30, "email": "a@b.c" }];
        let pipeline = vec![doc! { "$project": { "email": 0 } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results[0].get_str("name").unwrap(), "Alice");
        assert_eq!(results[0].get_i32("age").unwrap(), 30);
        assert!(results[0].get("email").is_none());
        assert!(results[0].get("_id").is_some());
    }

    #[test]
    fn test_project_exclude_id() {
        let docs = vec![doc! { "_id": 1, "name": "Alice" }];
        let pipeline = vec![doc! { "$project": { "_id": 0, "name": 1 } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert!(results[0].get("_id").is_none());
        assert_eq!(results[0].get_str("name").unwrap(), "Alice");
    }

    #[test]
    fn test_group_sum() {
        let docs = vec![
            doc! { "dept": "eng", "salary": 100 },
            doc! { "dept": "eng", "salary": 200 },
            doc! { "dept": "hr", "salary": 150 },
        ];
        let pipeline = vec![doc! { "$group": { "_id": "$dept", "total": { "$sum": "$salary" } } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_group_multiple_accumulators() {
        let docs = vec![doc! { "x": 10 }, doc! { "x": 20 }, doc! { "x": 30 }];
        let pipeline = vec![doc! {
            "$group": {
                "_id": bson::Bson::Null,
                "total": { "$sum": "$x" },
                "average": { "$avg": "$x" },
                "minimum": { "$min": "$x" },
                "maximum": { "$max": "$x" },
                "count": { "$count": {} },
            }
        }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].get_i64("total").unwrap(), 60);
        assert!((results[0].get_f64("average").unwrap() - 20.0).abs() < 0.01);
        assert_eq!(results[0].get_i32("minimum").unwrap(), 10);
        assert_eq!(results[0].get_i32("maximum").unwrap(), 30);
        assert_eq!(results[0].get_i32("count").unwrap(), 3);
    }

    #[test]
    fn test_unwind_basic() {
        let docs = vec![doc! { "name": "Alice", "tags": ["a", "b", "c"] }];
        let pipeline = vec![doc! { "$unwind": "$tags" }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 3);
        assert_eq!(results[0].get_str("tags").unwrap(), "a");
        assert_eq!(results[2].get_str("tags").unwrap(), "c");
    }

    #[test]
    fn test_unwind_preserve_null() {
        let docs = vec![
            doc! { "name": "Alice", "tags": ["a"] },
            doc! { "name": "Bob" },
        ];
        let pipeline =
            vec![doc! { "$unwind": { "path": "$tags", "preserveNullAndEmptyArrays": true } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_unwind_include_index() {
        let docs = vec![doc! { "tags": ["a", "b"] }];
        let pipeline = vec![doc! { "$unwind": { "path": "$tags", "includeArrayIndex": "idx" } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results[0].get_i64("idx").unwrap(), 0);
        assert_eq!(results[1].get_i64("idx").unwrap(), 1);
    }

    #[test]
    fn test_add_fields() {
        let docs = vec![doc! { "x": 10 }];
        let pipeline = vec![doc! { "$addFields": { "y": 20 } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results[0].get_i32("x").unwrap(), 10);
        assert_eq!(results[0].get_i32("y").unwrap(), 20);
    }

    #[test]
    fn test_set_alias() {
        let docs = vec![doc! { "x": 10 }];
        let pipeline = vec![doc! { "$set": { "y": 20 } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results[0].get_i32("y").unwrap(), 20);
    }

    #[test]
    fn test_unset() {
        let docs = vec![doc! { "a": 1, "b": 2, "c": 3 }];
        let pipeline = vec![doc! { "$unset": ["a", "c"] }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert!(results[0].get("a").is_none());
        assert_eq!(results[0].get_i32("b").unwrap(), 2);
        assert!(results[0].get("c").is_none());
    }

    #[test]
    fn test_replace_root() {
        let docs = vec![doc! { "outer": { "inner": "value" } }];
        let pipeline = vec![doc! { "$replaceRoot": { "newRoot": "$outer" } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results[0].get_str("inner").unwrap(), "value");
    }

    #[test]
    fn test_sample() {
        let docs: Vec<Document> = (0..100).map(|i| doc! { "n": i }).collect();
        let pipeline = vec![doc! { "$sample": { "size": 5 } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 5);
    }

    #[test]
    fn test_redact_keep() {
        let docs = vec![doc! { "level": 1, "data": "secret" }];
        let pipeline = vec![doc! { "$redact": "$$KEEP" }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].get_str("data").unwrap(), "secret");
    }

    #[test]
    fn test_redact_prune() {
        let docs = vec![doc! { "level": 1, "data": "secret" }];
        let pipeline = vec![doc! { "$redact": "$$PRUNE" }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_sort_by_count() {
        let docs = vec![
            doc! { "color": "red" },
            doc! { "color": "blue" },
            doc! { "color": "red" },
            doc! { "color": "red" },
            doc! { "color": "blue" },
        ];
        let pipeline = vec![doc! { "$sortByCount": "$color" }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].get_str("_id").unwrap(), "red");
        assert_eq!(results[0].get_i64("count").unwrap(), 3);
    }

    #[test]
    fn test_bucket() {
        let docs = vec![
            doc! { "score": 15.0 },
            doc! { "score": 35.0 },
            doc! { "score": 55.0 },
            doc! { "score": 75.0 },
            doc! { "score": 95.0 },
        ];
        let pipeline = vec![doc! { "$bucket": {
            "groupBy": "$score",
            "boundaries": [0.0, 25.0, 50.0, 75.0, 100.0],
        }}];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 4);
    }

    #[test]
    fn test_bucket_auto() {
        let docs: Vec<Document> = (0..20).map(|i| doc! { "val": i as f64 }).collect();
        let pipeline = vec![doc! { "$bucketAuto": { "groupBy": "$val", "buckets": 4 } }];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 4);
    }

    #[test]
    fn test_facet() {
        let docs = vec![doc! { "x": 1 }, doc! { "x": 2 }, doc! { "x": 3 }];
        let pipeline = vec![doc! { "$facet": {
            "all": [{ "$count": "total" }],
            "top2": [{ "$limit": 2 }],
        }}];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 1);
        let all = results[0].get_array("all").unwrap();
        assert_eq!(all.len(), 1);
        let top2 = results[0].get_array("top2").unwrap();
        assert_eq!(top2.len(), 2);
    }

    #[test]
    fn test_multi_stage_pipeline() {
        let docs = vec![
            doc! { "dept": "eng", "salary": 100 },
            doc! { "dept": "eng", "salary": 200 },
            doc! { "dept": "hr", "salary": 150 },
            doc! { "dept": "hr", "salary": 250 },
        ];
        let pipeline = vec![
            doc! { "$group": { "_id": "$dept", "total": { "$sum": "$salary" } } },
            doc! { "$sort": { "total": -1 } },
            doc! { "$limit": 1 },
        ];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].get_i64("total").unwrap(), 400);
    }

    // ============================================================
    // optimize_pipeline tests
    // ============================================================

    #[test]
    fn test_optimize_pipeline_single_match() {
        let pipeline = vec![
            doc! { "$match": { "status": "active" } },
            doc! { "$sort": { "age": 1 } },
        ];
        let (filter, remaining) = optimize_pipeline(&pipeline);
        assert_eq!(filter, Some(doc! { "status": "active" }));
        assert_eq!(remaining.len(), 1);
        assert!(remaining[0].contains_key("$sort"));
    }

    #[test]
    fn test_optimize_pipeline_consecutive_matches_disjoint() {
        let pipeline = vec![
            doc! { "$match": { "status": "active" } },
            doc! { "$match": { "age": { "$gte": 18 } } },
            doc! { "$sort": { "age": 1 } },
        ];
        let (filter, remaining) = optimize_pipeline(&pipeline);
        let f = filter.unwrap();
        assert_eq!(f.get_str("status").unwrap(), "active");
        assert!(f.contains_key("age"));
        assert_eq!(remaining.len(), 1);
    }

    #[test]
    fn test_optimize_pipeline_consecutive_matches_overlapping() {
        let pipeline = vec![
            doc! { "$match": { "age": { "$gte": 18 } } },
            doc! { "$match": { "age": { "$lte": 65 } } },
        ];
        let (filter, remaining) = optimize_pipeline(&pipeline);
        let f = filter.unwrap();
        assert!(f.contains_key("$and"));
        assert_eq!(remaining.len(), 0);
    }

    #[test]
    fn test_optimize_pipeline_no_match() {
        let pipeline = vec![doc! { "$sort": { "age": 1 } }, doc! { "$limit": 10 }];
        let (filter, remaining) = optimize_pipeline(&pipeline);
        assert!(filter.is_none());
        assert_eq!(remaining.len(), 2);
    }

    #[test]
    fn test_optimize_pipeline_match_not_first() {
        let pipeline = vec![
            doc! { "$group": { "_id": "$status", "count": { "$count": {} } } },
            doc! { "$match": { "count": { "$gte": 5 } } },
        ];
        let (filter, remaining) = optimize_pipeline(&pipeline);
        assert!(filter.is_none());
        assert_eq!(remaining.len(), 2);
    }

    #[test]
    fn test_optimize_pipeline_empty() {
        let pipeline: Vec<Document> = vec![];
        let (filter, remaining) = optimize_pipeline(&pipeline);
        assert!(filter.is_none());
        assert!(remaining.is_empty());
    }

    #[test]
    fn test_optimize_pipeline_only_match() {
        let pipeline = vec![doc! { "$match": { "x": 1 } }];
        let (filter, remaining) = optimize_pipeline(&pipeline);
        assert_eq!(filter, Some(doc! { "x": 1 }));
        assert!(remaining.is_empty());
    }

    #[test]
    fn test_compare_bson_cross_numeric() {
        use std::cmp::Ordering;
        assert_eq!(
            compare_bson(Some(&Bson::Int32(5)), Some(&Bson::Int64(10))),
            Ordering::Less
        );
        assert_eq!(
            compare_bson(Some(&Bson::Double(3.5)), Some(&Bson::Int32(3))),
            Ordering::Greater
        );
    }

    #[test]
    fn test_compare_bson_type_ordering() {
        use std::cmp::Ordering;
        assert_eq!(
            compare_bson(Some(&Bson::Null), Some(&Bson::Int32(0))),
            Ordering::Less
        );
        assert_eq!(
            compare_bson(Some(&Bson::Int32(0)), Some(&Bson::String("a".into()))),
            Ordering::Less
        );
    }

    struct MockResolver {
        docs: Vec<Document>,
    }
    impl CollectionResolver for MockResolver {
        fn resolve(
            &self,
            _name: &str,
            _filter: Option<&Document>,
        ) -> AggregationResult<Vec<Document>> {
            Ok(self.docs.clone())
        }
    }

    #[test]
    fn test_lookup() {
        let orders = vec![
            doc! { "item": "apple", "qty": 5 },
            doc! { "item": "banana", "qty": 3 },
        ];
        let inventory = vec![
            doc! { "sku": "apple", "desc": "fruit" },
            doc! { "sku": "banana", "desc": "fruit" },
            doc! { "sku": "carrot", "desc": "veggie" },
        ];
        let resolver = MockResolver { docs: inventory };
        let pipeline = vec![doc! { "$lookup": {
            "from": "inventory",
            "localField": "item",
            "foreignField": "sku",
            "as": "matched",
        }}];
        let results = aggregate_with_resolver(orders, &pipeline, Some(&resolver)).unwrap();
        assert_eq!(results.len(), 2);
        let matched = results[0].get_array("matched").unwrap();
        assert_eq!(matched.len(), 1);
    }

    #[test]
    fn test_set_window_fields_rank() {
        let docs = vec![
            doc! { "score": 90 },
            doc! { "score": 80 },
            doc! { "score": 70 },
        ];
        let pipeline = vec![doc! { "$setWindowFields": {
            "sortBy": { "score": -1 },
            "output": { "rank": { "$rank": {} } },
        }}];
        let results = aggregate(docs, &pipeline).unwrap();
        assert_eq!(results[0].get_i32("rank").unwrap(), 1);
        assert_eq!(results[0].get_i32("score").unwrap(), 90);
    }

    // ============================================================
    // Streaming pipeline tests
    // ============================================================

    #[test]
    fn test_stream_returns_same_results_as_batch() {
        let docs = vec![
            doc! { "dept": "eng", "salary": 100 },
            doc! { "dept": "eng", "salary": 200 },
            doc! { "dept": "hr", "salary": 150 },
            doc! { "dept": "hr", "salary": 250 },
        ];
        let pipeline = vec![
            doc! { "$match": { "dept": "eng" } },
            doc! { "$project": { "salary": 1, "_id": 0 } },
            doc! { "$sort": { "salary": 1 } },
        ];
        let batch = aggregate(docs.clone(), &pipeline).unwrap();
        let stream: Vec<Document> = aggregate_stream(docs, &pipeline)
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(batch, stream);
    }

    #[test]
    fn test_stream_limit_short_circuits() {
        use std::sync::atomic::{AtomicUsize, Ordering};
        use std::sync::Arc;

        let counter = Arc::new(AtomicUsize::new(0));
        let docs: Vec<Document> = (0..1000).map(|i| doc! { "n": i }).collect();

        let pipeline = vec![doc! { "$limit": 5 }];
        let stream = aggregate_stream(docs, &pipeline).unwrap();

        let counter_clone = Arc::clone(&counter);
        let results: Vec<Document> = stream
            .inspect(move |_| {
                counter_clone.fetch_add(1, Ordering::Relaxed);
            })
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(results.len(), 5);
        assert_eq!(counter.load(Ordering::Relaxed), 5);
    }

    #[test]
    fn test_stream_empty_pipeline() {
        let docs = vec![doc! { "a": 1 }, doc! { "a": 2 }];
        let results: Vec<Document> = aggregate_stream(docs.clone(), &[])
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(results, docs);
    }

    #[test]
    fn test_stream_empty_input() {
        let pipeline = vec![doc! { "$match": { "x": 1 } }, doc! { "$sort": { "x": 1 } }];
        let results: Vec<Document> = aggregate_stream(vec![], &pipeline)
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_stream_mixed_streaming_and_blocking() {
        let docs = vec![
            doc! { "cat": "a", "val": 3 },
            doc! { "cat": "b", "val": 1 },
            doc! { "cat": "a", "val": 2 },
            doc! { "cat": "b", "val": 4 },
            doc! { "cat": "a", "val": 5 },
        ];
        let pipeline = vec![
            doc! { "$match": { "cat": "a" } },
            doc! { "$sort": { "val": 1 } },
            doc! { "$project": { "val": 1, "_id": 0 } },
            doc! { "$limit": 2 },
        ];
        let results: Vec<Document> = aggregate_stream(docs, &pipeline)
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0], doc! { "val": 2 });
        assert_eq!(results[1], doc! { "val": 3 });
    }

    #[test]
    fn test_stream_match_project_limit_pipeline() {
        let docs: Vec<Document> = (0..100)
            .map(|i| doc! { "n": i, "even": (i % 2 == 0), "extra": "data" })
            .collect();
        let pipeline = vec![
            doc! { "$match": { "even": true } },
            doc! { "$project": { "n": 1, "_id": 0 } },
            doc! { "$limit": 3 },
        ];
        let results: Vec<Document> = aggregate_stream(docs, &pipeline)
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(results.len(), 3);
        assert_eq!(results[0], doc! { "n": 0 });
        assert_eq!(results[1], doc! { "n": 2 });
        assert_eq!(results[2], doc! { "n": 4 });
    }

    #[test]
    fn test_stream_unwind_then_group() {
        let docs = vec![
            doc! { "name": "Alice", "tags": ["a", "b"] },
            doc! { "name": "Bob", "tags": ["b", "c"] },
        ];
        let pipeline = vec![
            doc! { "$unwind": "$tags" },
            doc! { "$group": { "_id": "$tags", "count": { "$count": {} } } },
            doc! { "$sort": { "_id": 1 } },
        ];
        let results: Vec<Document> = aggregate_stream(docs, &pipeline)
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(results.len(), 3);
        assert_eq!(results[0].get_str("_id").unwrap(), "a");
        assert_eq!(results[0].get_i32("count").unwrap(), 1);
        assert_eq!(results[1].get_str("_id").unwrap(), "b");
        assert_eq!(results[1].get_i32("count").unwrap(), 2);
    }

    #[test]
    fn test_stream_skip_and_limit() {
        let docs: Vec<Document> = (0..10).map(|i| doc! { "n": i }).collect();
        let pipeline = vec![doc! { "$skip": 3 }, doc! { "$limit": 4 }];
        let results: Vec<Document> = aggregate_stream(docs, &pipeline)
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(results.len(), 4);
        assert_eq!(results[0].get_i32("n").unwrap(), 3);
        assert_eq!(results[3].get_i32("n").unwrap(), 6);
    }

    #[test]
    fn test_stream_add_fields_and_unset() {
        let docs = vec![doc! { "x": 10, "y": 20 }];
        let pipeline = vec![doc! { "$addFields": { "z": 30 } }, doc! { "$unset": "y" }];
        let results: Vec<Document> = aggregate_stream(docs, &pipeline)
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(results[0].get_i32("x").unwrap(), 10);
        assert_eq!(results[0].get_i32("z").unwrap(), 30);
        assert!(results[0].get("y").is_none());
    }

    #[test]
    fn test_stream_replace_root() {
        let docs = vec![doc! { "nested": { "a": 1, "b": 2 } }];
        let pipeline = vec![doc! { "$replaceRoot": { "newRoot": "$nested" } }];
        let results: Vec<Document> = aggregate_stream(docs, &pipeline)
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(results[0], doc! { "a": 1, "b": 2 });
    }

    #[test]
    fn test_stream_redact() {
        let docs = vec![
            doc! { "level": 1, "data": "public" },
            doc! { "level": 2, "data": "secret" },
        ];
        let pipeline = vec![doc! { "$redact": "$$KEEP" }];
        let results: Vec<Document> = aggregate_stream(docs, &pipeline)
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_stream_invalid_stage_returns_error() {
        let docs = vec![doc! { "x": 1 }];
        let pipeline = vec![doc! { "$bogus": {} }];
        let result = aggregate_stream(docs, &pipeline);
        assert!(result.is_err());
    }

    #[test]
    fn test_stream_with_resolver() {
        let orders = vec![
            doc! { "item": "apple", "qty": 5 },
            doc! { "item": "banana", "qty": 3 },
        ];
        let inventory = vec![
            doc! { "sku": "apple", "desc": "fruit" },
            doc! { "sku": "banana", "desc": "fruit" },
        ];
        let resolver = MockResolver { docs: inventory };
        let pipeline = vec![doc! { "$lookup": {
            "from": "inventory",
            "localField": "item",
            "foreignField": "sku",
            "as": "matched",
        }}];
        let results: Vec<Document> =
            aggregate_stream_with_resolver(orders, &pipeline, Some(&resolver), None)
                .unwrap()
                .collect::<Result<Vec<_>, _>>()
                .unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].get_array("matched").unwrap().len(), 1);
    }
}
