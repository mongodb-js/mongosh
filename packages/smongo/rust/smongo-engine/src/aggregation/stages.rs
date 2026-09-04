//! Aggregation pipeline stage implementations.

use bson::{Bson, Document};
use std::collections::HashMap;

use crate::paths::{get_value, set_value, unset_value};
use crate::query::eval_query;

use super::accumulators::evaluate_accumulator;
use super::expressions::{bson_to_f64_pub as bson_to_f64, evaluate_expression};
use super::{
    bson_to_key_string, compare_bson, AggregationError, AggregationResult, CollectionResolver,
    DocStream,
};

/// Produce a canonical byte key for a BSON value suitable for use as a
/// HashMap key.  Wraps the value in a single-field document and serializes
/// to raw BSON bytes, giving exact type-aware equality semantics (int 1 !=
/// string "1", etc.).  `None` maps to an empty vec.
fn canonical_bson_key(val: Option<&Bson>) -> Vec<u8> {
    match val {
        Some(v) => bson::to_vec(&bson::doc! { "": v.clone() }).unwrap_or_default(),
        None => Vec::new(),
    }
}

// ---------------------------------------------------------------------------
// $match
// ---------------------------------------------------------------------------

pub fn stage_match(docs: Vec<Document>, filter: &Bson) -> AggregationResult<Vec<Document>> {
    let filter_doc = filter
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$match requires document".into()))?;

    Ok(docs
        .into_iter()
        .filter(|doc| eval_query(doc, filter_doc).unwrap_or(false))
        .collect())
}

// ---------------------------------------------------------------------------
// $project
// ---------------------------------------------------------------------------

pub fn stage_project(docs: Vec<Document>, projection: &Bson) -> AggregationResult<Vec<Document>> {
    let proj_doc = projection
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$project requires document".into()))?;

    let has_exclusion = proj_doc.iter().any(|(k, v)| {
        k != "_id" && matches!(v, Bson::Int32(0) | Bson::Int64(0) | Bson::Boolean(false))
    });

    let id_excluded = matches!(
        proj_doc.get("_id"),
        Some(Bson::Int32(0)) | Some(Bson::Int64(0)) | Some(Bson::Boolean(false))
    );

    let mut results = Vec::with_capacity(docs.len());

    for doc in docs {
        let new_doc = if has_exclusion {
            let mut nd = doc.clone();
            for (field, value) in proj_doc {
                if field == "_id" {
                    continue;
                }
                match value {
                    Bson::Int32(0) | Bson::Int64(0) | Bson::Boolean(false) => {
                        nd.remove(field);
                    }
                    _ => {
                        let val = evaluate_expression(&doc, value)?;
                        nd.insert(field.clone(), val);
                    }
                }
            }
            if id_excluded {
                nd.remove("_id");
            }
            nd
        } else {
            let mut nd = Document::new();
            if !id_excluded {
                if let Some(id) = doc.get("_id") {
                    nd.insert("_id".to_string(), id.clone());
                }
            }
            for (field, value) in proj_doc {
                if field == "_id" {
                    continue;
                }
                match value {
                    Bson::Int32(1) | Bson::Int64(1) | Bson::Boolean(true) => {
                        if let Some(val) = get_value(&doc, field) {
                            nd.insert(field.clone(), val.clone());
                        }
                    }
                    _ => {
                        let val = evaluate_expression(&doc, value)?;
                        nd.insert(field.clone(), val);
                    }
                }
            }
            nd
        };

        results.push(new_doc);
    }

    Ok(results)
}

// ---------------------------------------------------------------------------
// $limit / $skip
// ---------------------------------------------------------------------------

pub fn stage_limit(docs: Vec<Document>, limit: &Bson) -> AggregationResult<Vec<Document>> {
    let n = limit
        .as_i64()
        .or_else(|| limit.as_i32().map(|i| i as i64))
        .ok_or_else(|| AggregationError::InvalidStage("$limit requires number".into()))?;
    Ok(docs.into_iter().take(n as usize).collect())
}

pub fn stage_skip(docs: Vec<Document>, skip: &Bson) -> AggregationResult<Vec<Document>> {
    let n = skip
        .as_i64()
        .or_else(|| skip.as_i32().map(|i| i as i64))
        .ok_or_else(|| AggregationError::InvalidStage("$skip requires number".into()))?;
    Ok(docs.into_iter().skip(n as usize).collect())
}

// ---------------------------------------------------------------------------
// $sort
// ---------------------------------------------------------------------------

pub fn stage_sort(mut docs: Vec<Document>, sort_spec: &Bson) -> AggregationResult<Vec<Document>> {
    let sort_doc = sort_spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$sort requires document".into()))?;

    docs.sort_by(|a, b| {
        for (field, direction) in sort_doc {
            let dir = direction.as_i32().unwrap_or(1);
            let val_a = get_value(a, field);
            let val_b = get_value(b, field);
            let cmp = compare_bson(val_a, val_b);
            let result = if dir < 0 { cmp.reverse() } else { cmp };
            if result != std::cmp::Ordering::Equal {
                return result;
            }
        }
        std::cmp::Ordering::Equal
    });

    Ok(docs)
}

// ---------------------------------------------------------------------------
// $group
// ---------------------------------------------------------------------------

pub fn stage_group(docs: Vec<Document>, group_spec: &Bson) -> AggregationResult<Vec<Document>> {
    let group_doc = group_spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$group requires document".into()))?;

    let id_expr = group_doc
        .get("_id")
        .ok_or_else(|| AggregationError::MissingField("_id required in $group".into()))?;

    let mut groups: HashMap<String, (Bson, Vec<Document>)> = HashMap::new();

    for doc in docs {
        let group_key = evaluate_expression(&doc, id_expr)?;
        let key_str = bson_to_key_string(&group_key);
        groups
            .entry(key_str)
            .or_insert_with(|| (group_key.clone(), Vec::new()))
            .1
            .push(doc);
    }

    let mut results = Vec::with_capacity(groups.len());
    for (_key_str, (id_val, group_docs)) in groups {
        let mut result_doc = Document::new();
        result_doc.insert("_id".to_string(), id_val);

        for (field, accumulator) in group_doc {
            if field == "_id" {
                continue;
            }
            let value = evaluate_accumulator(&group_docs, accumulator)?;
            result_doc.insert(field.clone(), value);
        }

        results.push(result_doc);
    }

    Ok(results)
}

// ---------------------------------------------------------------------------
// $count
// ---------------------------------------------------------------------------

pub fn stage_count(docs: Vec<Document>, field_name: &Bson) -> AggregationResult<Vec<Document>> {
    let name = field_name
        .as_str()
        .ok_or_else(|| AggregationError::InvalidStage("$count requires string".into()))?;

    let mut result = Document::new();
    result.insert(name.to_string(), Bson::Int32(docs.len() as i32));
    Ok(vec![result])
}

// ---------------------------------------------------------------------------
// $unwind
// ---------------------------------------------------------------------------

pub fn stage_unwind(docs: Vec<Document>, spec: &Bson) -> AggregationResult<Vec<Document>> {
    let (path, preserve_null, include_index) = match spec {
        Bson::String(s) => {
            let p = s.strip_prefix('$').unwrap_or(s);
            (p.to_string(), false, None)
        }
        Bson::Document(d) => {
            let path = d
                .get_str("path")
                .map_err(|_| AggregationError::MissingField("$unwind requires path".into()))?;
            let p = path.strip_prefix('$').unwrap_or(path).to_string();
            let preserve = d.get_bool("preserveNullAndEmptyArrays").unwrap_or(false);
            let idx_field = d.get_str("includeArrayIndex").ok().map(String::from);
            (p, preserve, idx_field)
        }
        _ => {
            return Err(AggregationError::InvalidStage(
                "$unwind requires string or document".into(),
            ))
        }
    };

    let mut results = Vec::new();

    for doc in docs {
        let val = get_value(&doc, &path).cloned();

        match val {
            Some(Bson::Array(arr)) => {
                if arr.is_empty() {
                    if preserve_null {
                        let mut new_doc = doc.clone();
                        let _ = unset_value(&mut new_doc, &path);
                        if let Some(ref idx_field) = include_index {
                            new_doc.insert(idx_field.clone(), Bson::Null);
                        }
                        results.push(new_doc);
                    }
                } else {
                    for (i, item) in arr.into_iter().enumerate() {
                        let mut new_doc = doc.clone();
                        let _ = set_value(&mut new_doc, &path, item);
                        if let Some(ref idx_field) = include_index {
                            new_doc.insert(idx_field.clone(), Bson::Int64(i as i64));
                        }
                        results.push(new_doc);
                    }
                }
            }
            Some(Bson::Null) | None => {
                if preserve_null {
                    let mut new_doc = doc.clone();
                    if let Some(ref idx_field) = include_index {
                        new_doc.insert(idx_field.clone(), Bson::Null);
                    }
                    results.push(new_doc);
                }
            }
            Some(scalar) => {
                let mut new_doc = doc;
                let _ = set_value(&mut new_doc, &path, scalar);
                if let Some(ref idx_field) = include_index {
                    new_doc.insert(idx_field.clone(), Bson::Null);
                }
                results.push(new_doc);
            }
        }
    }

    Ok(results)
}

// ---------------------------------------------------------------------------
// $addFields / $set
// ---------------------------------------------------------------------------

pub fn stage_add_fields(
    docs: Vec<Document>,
    fields_spec: &Bson,
) -> AggregationResult<Vec<Document>> {
    let fields = fields_spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$addFields requires document".into()))?;

    let mut results = Vec::with_capacity(docs.len());
    for doc in docs {
        let mut new_doc = doc.clone();
        for (field, expr) in fields {
            let val = evaluate_expression(&doc, expr)?;
            let _ = set_value(&mut new_doc, field, val);
        }
        results.push(new_doc);
    }
    Ok(results)
}

// ---------------------------------------------------------------------------
// $unset
// ---------------------------------------------------------------------------

pub fn stage_unset(docs: Vec<Document>, spec: &Bson) -> AggregationResult<Vec<Document>> {
    let fields: Vec<String> = match spec {
        Bson::String(s) => vec![s.clone()],
        Bson::Array(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect(),
        _ => {
            return Err(AggregationError::InvalidStage(
                "$unset requires string or array".into(),
            ))
        }
    };

    let mut results = Vec::with_capacity(docs.len());
    for doc in docs {
        let mut new_doc = doc;
        for field in &fields {
            let _ = unset_value(&mut new_doc, field);
        }
        results.push(new_doc);
    }
    Ok(results)
}

// ---------------------------------------------------------------------------
// $replaceRoot / $replaceWith
// ---------------------------------------------------------------------------

pub fn stage_replace_root(docs: Vec<Document>, spec: &Bson) -> AggregationResult<Vec<Document>> {
    let new_root_expr = match spec {
        Bson::Document(d) => d.get("newRoot").unwrap_or(spec),
        _ => spec,
    };

    let mut results = Vec::with_capacity(docs.len());
    for doc in docs {
        let val = evaluate_expression(&doc, new_root_expr)?;
        match val {
            Bson::Document(d) => results.push(d),
            _ => {
                return Err(AggregationError::TypeError(
                    "$replaceRoot expression must evaluate to a document".into(),
                ))
            }
        }
    }
    Ok(results)
}

// ---------------------------------------------------------------------------
// $sample
// ---------------------------------------------------------------------------

pub fn stage_sample(docs: Vec<Document>, spec: &Bson) -> AggregationResult<Vec<Document>> {
    let size_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$sample requires document".into()))?;
    let size = size_doc
        .get("size")
        .and_then(|v| v.as_i64().or_else(|| v.as_i32().map(|i| i as i64)))
        .ok_or_else(|| AggregationError::MissingField("$sample.size required".into()))?
        as usize;

    use rand::seq::SliceRandom;
    let mut rng = rand::thread_rng();
    let mut shuffled = docs;
    shuffled.shuffle(&mut rng);
    shuffled.truncate(size);
    Ok(shuffled)
}

// ---------------------------------------------------------------------------
// $redact
// ---------------------------------------------------------------------------

pub fn stage_redact(docs: Vec<Document>, expr: &Bson) -> AggregationResult<Vec<Document>> {
    let mut results = Vec::new();
    for doc in docs {
        if let Some(redacted) = redact_doc(&doc, expr)? {
            results.push(redacted);
        }
    }
    Ok(results)
}

fn redact_doc(doc: &Document, expr: &Bson) -> AggregationResult<Option<Document>> {
    let result = match expr {
        Bson::String(s) if s.starts_with("$$") => expr.clone(),
        _ => evaluate_expression(doc, expr)?,
    };
    match result.as_str() {
        Some("$$KEEP") => Ok(Some(doc.clone())),
        Some("$$PRUNE") => Ok(None),
        Some("$$DESCEND") => {
            let mut new_doc = Document::new();
            for (key, val) in doc {
                match val {
                    Bson::Document(sub) => {
                        if let Some(redacted) = redact_doc(sub, expr)? {
                            new_doc.insert(key.clone(), Bson::Document(redacted));
                        }
                    }
                    Bson::Array(arr) => {
                        let mut new_arr = Vec::new();
                        for item in arr {
                            if let Bson::Document(sub) = item {
                                if let Some(redacted) = redact_doc(sub, expr)? {
                                    new_arr.push(Bson::Document(redacted));
                                }
                            } else {
                                new_arr.push(item.clone());
                            }
                        }
                        new_doc.insert(key.clone(), Bson::Array(new_arr));
                    }
                    _ => {
                        new_doc.insert(key.clone(), val.clone());
                    }
                }
            }
            Ok(Some(new_doc))
        }
        _ => Err(AggregationError::InvalidStage(
            "$redact expression must resolve to $$KEEP, $$PRUNE, or $$DESCEND".into(),
        )),
    }
}

// ---------------------------------------------------------------------------
// $sortByCount
// ---------------------------------------------------------------------------

pub fn stage_sort_by_count(docs: Vec<Document>, expr: &Bson) -> AggregationResult<Vec<Document>> {
    let group_spec = Bson::Document(bson::doc! {
        "_id": expr.clone(),
        "count": { "$sum": 1 }
    });
    let grouped = stage_group(docs, &group_spec)?;
    stage_sort(grouped, &Bson::Document(bson::doc! { "count": -1 }))
}

// ---------------------------------------------------------------------------
// $bucket
// ---------------------------------------------------------------------------

pub fn stage_bucket(docs: Vec<Document>, spec: &Bson) -> AggregationResult<Vec<Document>> {
    let bucket_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$bucket requires document".into()))?;

    let group_by = bucket_doc
        .get("groupBy")
        .ok_or_else(|| AggregationError::MissingField("$bucket.groupBy required".into()))?;
    let boundaries = bucket_doc
        .get_array("boundaries")
        .map_err(|_| AggregationError::MissingField("$bucket.boundaries required".into()))?;
    let default_bucket = bucket_doc.get("default");
    let output_spec = bucket_doc.get_document("output").ok();

    let boundary_vals: Vec<f64> = boundaries.iter().filter_map(bson_to_f64).collect();
    if boundary_vals.len() < 2 {
        return Err(AggregationError::InvalidStage(
            "$bucket requires at least 2 boundaries".into(),
        ));
    }

    let mut buckets: HashMap<String, Vec<Document>> = HashMap::new();
    let mut default_docs: Vec<Document> = Vec::new();

    for doc in docs {
        let val = evaluate_expression(&doc, group_by)?;
        match bson_to_f64(&val) {
            Some(n) => {
                // Binary search for the bucket: find the rightmost boundary
                // <= n, then check it falls before the next boundary.
                let idx = boundary_vals.partition_point(|&b| b <= n);
                if idx > 0 && idx < boundary_vals.len() {
                    let key = format!("{}", boundary_vals[idx - 1]);
                    buckets.entry(key).or_default().push(doc.clone());
                } else if default_bucket.is_some() {
                    default_docs.push(doc.clone());
                }
            }
            None => {
                if default_bucket.is_some() {
                    default_docs.push(doc);
                }
            }
        }
    }

    let mut results = Vec::new();
    for &bval in &boundary_vals[..boundary_vals.len() - 1] {
        let key = format!("{bval}");
        let bucket_docs = buckets.remove(&key).unwrap_or_default();
        let mut result_doc = Document::new();
        result_doc.insert("_id".to_string(), Bson::Double(bval));

        if let Some(output) = output_spec {
            for (field, acc) in output {
                result_doc.insert(field.clone(), evaluate_accumulator(&bucket_docs, acc)?);
            }
        } else {
            result_doc.insert("count".to_string(), Bson::Int32(bucket_docs.len() as i32));
        }
        results.push(result_doc);
    }

    if let Some(def) = default_bucket {
        if !default_docs.is_empty() {
            let mut result_doc = Document::new();
            result_doc.insert("_id".to_string(), def.clone());
            if let Some(output) = output_spec {
                for (field, acc) in output {
                    result_doc.insert(field.clone(), evaluate_accumulator(&default_docs, acc)?);
                }
            } else {
                result_doc.insert("count".to_string(), Bson::Int32(default_docs.len() as i32));
            }
            results.push(result_doc);
        }
    }

    Ok(results)
}

// ---------------------------------------------------------------------------
// $bucketAuto
// ---------------------------------------------------------------------------

pub fn stage_bucket_auto(docs: Vec<Document>, spec: &Bson) -> AggregationResult<Vec<Document>> {
    let auto_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$bucketAuto requires document".into()))?;

    let group_by = auto_doc
        .get("groupBy")
        .ok_or_else(|| AggregationError::MissingField("$bucketAuto.groupBy required".into()))?;
    let num_buckets = auto_doc
        .get("buckets")
        .and_then(|v| v.as_i64().or_else(|| v.as_i32().map(|i| i as i64)))
        .ok_or_else(|| AggregationError::MissingField("$bucketAuto.buckets required".into()))?
        as usize;
    let output_spec = auto_doc.get_document("output").ok();

    let mut valued_docs: Vec<(f64, Document)> = Vec::new();
    for doc in docs {
        let val = evaluate_expression(&doc, group_by)?;
        if let Some(n) = bson_to_f64(&val) {
            valued_docs.push((n, doc));
        }
    }

    valued_docs.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));

    let total = valued_docs.len();
    let per_bucket = if num_buckets > 0 {
        total.div_ceil(num_buckets)
    } else {
        total
    };

    let mut results = Vec::new();
    let mut i = 0;
    while i < total {
        let end = (i + per_bucket).min(total);
        let chunk: Vec<Document> = valued_docs[i..end].iter().map(|(_, d)| d.clone()).collect();
        let min_val = valued_docs[i].0;
        let max_val = if end < total {
            valued_docs[end].0
        } else {
            valued_docs[end - 1].0
        };

        let mut result_doc = Document::new();
        result_doc.insert(
            "_id".to_string(),
            Bson::Document(bson::doc! { "min": min_val, "max": max_val }),
        );

        if let Some(output) = output_spec {
            for (field, acc) in output {
                result_doc.insert(field.clone(), evaluate_accumulator(&chunk, acc)?);
            }
        } else {
            result_doc.insert("count".to_string(), Bson::Int32(chunk.len() as i32));
        }

        results.push(result_doc);
        i = end;
    }

    Ok(results)
}

// ---------------------------------------------------------------------------
// $lookup
// ---------------------------------------------------------------------------

pub fn stage_lookup(
    docs: Vec<Document>,
    spec: &Bson,
    resolver: Option<&dyn CollectionResolver>,
) -> AggregationResult<Vec<Document>> {
    let lookup_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$lookup requires document".into()))?;

    let has_pipeline = lookup_doc.get_array("pipeline").is_ok();
    if has_pipeline {
        return stage_lookup_pipeline(docs, lookup_doc, resolver);
    }

    let from = lookup_doc
        .get_str("from")
        .map_err(|_| AggregationError::MissingField("$lookup.from required".into()))?;
    let local_field = lookup_doc
        .get_str("localField")
        .map_err(|_| AggregationError::MissingField("$lookup.localField required".into()))?;
    let foreign_field = lookup_doc
        .get_str("foreignField")
        .map_err(|_| AggregationError::MissingField("$lookup.foreignField required".into()))?;
    let as_field = lookup_doc
        .get_str("as")
        .map_err(|_| AggregationError::MissingField("$lookup.as required".into()))?;

    let resolver = resolver
        .ok_or_else(|| AggregationError::Other("$lookup requires a CollectionResolver".into()))?;

    let foreign_docs = resolver.resolve(from, None)?;
    let mut foreign_map: HashMap<Vec<u8>, Vec<&Document>> = HashMap::new();
    for fdoc in &foreign_docs {
        let key = canonical_bson_key(get_value(fdoc, foreign_field));
        foreign_map.entry(key).or_default().push(fdoc);
    }

    let mut results = Vec::with_capacity(docs.len());
    for doc in docs {
        let local_val = get_value(&doc, local_field);
        let local_key = canonical_bson_key(local_val);
        let matches: Vec<Bson> = foreign_map
            .get(&local_key)
            .map(|v| v.iter().map(|d| Bson::Document((*d).clone())).collect())
            .unwrap_or_default();

        let mut new_doc = doc;
        new_doc.insert(as_field.to_string(), Bson::Array(matches));
        results.push(new_doc);
    }

    Ok(results)
}

/// `$lookup` with `let` + `pipeline` (correlated subquery form).
fn stage_lookup_pipeline(
    docs: Vec<Document>,
    lookup_doc: &Document,
    resolver: Option<&dyn CollectionResolver>,
) -> AggregationResult<Vec<Document>> {
    let from = lookup_doc
        .get_str("from")
        .map_err(|_| AggregationError::MissingField("$lookup.from required".into()))?;
    let as_field = lookup_doc
        .get_str("as")
        .map_err(|_| AggregationError::MissingField("$lookup.as required".into()))?;
    let pipeline_bson = lookup_doc
        .get_array("pipeline")
        .map_err(|_| AggregationError::MissingField("$lookup.pipeline required".into()))?;
    let let_vars = lookup_doc.get_document("let").ok();

    let resolver = resolver
        .ok_or_else(|| AggregationError::Other("$lookup requires a CollectionResolver".into()))?;

    let sub_pipeline: Vec<Document> = pipeline_bson
        .iter()
        .filter_map(|s| s.as_document().cloned())
        .collect();

    let foreign_docs = resolver.resolve(from, None)?;

    // When there are no `let` variables, every row runs the same sub-pipeline
    // on the same foreign data — cache the result instead of re-running.
    let static_result: Option<Vec<Bson>> = if let_vars.is_none() {
        let matched =
            super::aggregate_with_resolver(foreign_docs.clone(), &sub_pipeline, Some(resolver))?;
        Some(matched.into_iter().map(Bson::Document).collect())
    } else {
        None
    };

    let mut results = Vec::with_capacity(docs.len());
    for doc in docs {
        let matched_bson = if let Some(ref cached) = static_result {
            cached.clone()
        } else {
            // `let_vars` is guaranteed `Some` here because `static_result`
            // is only `Some` when `let_vars.is_none()`.
            #[allow(clippy::unwrap_used)]
            let vars = let_vars.unwrap();
            let mut bound = Vec::new();
            for (var_name, var_expr) in vars {
                let val = evaluate_expression(&doc, var_expr)?;
                bound.push((var_name.clone(), val));
            }
            let resolved_pipeline: Vec<Document> = sub_pipeline
                .iter()
                .map(|stage| {
                    let mut s = Bson::Document(stage.clone());
                    for (name, val) in &bound {
                        s = substitute_var(&s, name, val);
                    }
                    s.as_document().cloned().unwrap_or_default()
                })
                .collect();

            let matched = super::aggregate_with_resolver(
                foreign_docs.clone(),
                &resolved_pipeline,
                Some(resolver),
            )?;
            matched.into_iter().map(Bson::Document).collect()
        };

        let mut new_doc = doc;
        new_doc.insert(as_field.to_string(), Bson::Array(matched_bson));
        results.push(new_doc);
    }

    Ok(results)
}

/// Replace `$$var_name` references in a BSON expression tree with a literal value.
fn substitute_var(expr: &Bson, var_name: &str, value: &Bson) -> Bson {
    let double_dollar = format!("$${}", var_name);
    match expr {
        Bson::String(s) if s == &double_dollar => value.clone(),
        Bson::String(s) if s.starts_with(&format!("$${}.", var_name)) => {
            let suffix = &s[double_dollar.len() + 1..];
            match value {
                Bson::Document(d) => get_value(d, suffix).cloned().unwrap_or(Bson::Null),
                _ => Bson::Null,
            }
        }
        Bson::Document(d) => {
            let mut new_doc = Document::new();
            for (k, v) in d {
                new_doc.insert(k.clone(), substitute_var(v, var_name, value));
            }
            Bson::Document(new_doc)
        }
        Bson::Array(arr) => Bson::Array(
            arr.iter()
                .map(|v| substitute_var(v, var_name, value))
                .collect(),
        ),
        other => other.clone(),
    }
}

// ---------------------------------------------------------------------------
// $graphLookup
// ---------------------------------------------------------------------------

pub fn stage_graph_lookup(
    docs: Vec<Document>,
    spec: &Bson,
    resolver: Option<&dyn CollectionResolver>,
) -> AggregationResult<Vec<Document>> {
    let gl_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$graphLookup requires document".into()))?;

    let from = gl_doc
        .get_str("from")
        .map_err(|_| AggregationError::MissingField("from required".into()))?;
    let start_with = gl_doc
        .get("startWith")
        .ok_or_else(|| AggregationError::MissingField("startWith required".into()))?;
    let connect_from = gl_doc
        .get_str("connectFromField")
        .map_err(|_| AggregationError::MissingField("connectFromField required".into()))?;
    let connect_to = gl_doc
        .get_str("connectToField")
        .map_err(|_| AggregationError::MissingField("connectToField required".into()))?;
    let as_field = gl_doc
        .get_str("as")
        .map_err(|_| AggregationError::MissingField("as required".into()))?;
    let max_depth = gl_doc
        .get("maxDepth")
        .and_then(|v| v.as_i64().or_else(|| v.as_i32().map(|i| i as i64)));
    let depth_field = gl_doc.get_str("depthField").ok();
    let restrict = gl_doc.get_document("restrictSearchWithMatch").ok();

    let resolver = resolver.ok_or_else(|| {
        AggregationError::Other("$graphLookup requires a CollectionResolver".into())
    })?;
    let foreign_docs = resolver.resolve(from, None)?;

    let mut results = Vec::with_capacity(docs.len());

    for doc in docs {
        let start_val = evaluate_expression(&doc, start_with)?;
        let start_vals = match start_val {
            Bson::Array(arr) => arr,
            other => vec![other],
        };

        let mut visited: std::collections::HashSet<Vec<u8>> = std::collections::HashSet::new();
        let mut queue: std::collections::VecDeque<(Bson, i64)> = std::collections::VecDeque::new();
        let mut found = Vec::new();

        for sv in start_vals {
            let key = canonical_bson_key(Some(&sv));
            if visited.insert(key) {
                queue.push_back((sv, 0));
            }
        }

        // Index foreign docs by connectToField for O(1) lookup per BFS step
        // instead of O(|foreign_docs|) linear scan.
        let mut connect_to_index: HashMap<Vec<u8>, Vec<usize>> = HashMap::new();
        for (i, fdoc) in foreign_docs.iter().enumerate() {
            match get_value(fdoc, connect_to) {
                Some(Bson::Array(arr)) => {
                    for item in arr {
                        connect_to_index
                            .entry(canonical_bson_key(Some(item)))
                            .or_default()
                            .push(i);
                    }
                }
                Some(v) => {
                    connect_to_index
                        .entry(canonical_bson_key(Some(v)))
                        .or_default()
                        .push(i);
                }
                None => {}
            }
        }

        while let Some((current_val, depth)) = queue.pop_front() {
            if let Some(md) = max_depth {
                if depth > md {
                    continue;
                }
            }

            let key = canonical_bson_key(Some(&current_val));
            let candidates = match connect_to_index.get(&key) {
                Some(idxs) => idxs.as_slice(),
                None => continue,
            };

            for &fi in candidates {
                let fdoc = &foreign_docs[fi];

                if let Some(restrict_filter) = restrict {
                    if !eval_query(fdoc, restrict_filter).unwrap_or(false) {
                        continue;
                    }
                }

                // Use canonical BSON key for visited set instead of Debug
                let fdoc_key = canonical_bson_key(Some(&Bson::Document(fdoc.clone())));
                if !visited.insert(fdoc_key) {
                    continue;
                }

                let mut found_doc = fdoc.clone();
                if let Some(df) = depth_field {
                    found_doc.insert(df.to_string(), Bson::Int64(depth));
                }
                found.push(found_doc);

                let next_vals = get_value(fdoc, connect_from).cloned();
                match next_vals {
                    Some(Bson::Array(arr)) => {
                        for nv in arr {
                            let nk = canonical_bson_key(Some(&nv));
                            if visited.contains(&nk) {
                                continue;
                            }
                            queue.push_back((nv, depth + 1));
                        }
                    }
                    Some(v) => {
                        let nk = canonical_bson_key(Some(&v));
                        if !visited.contains(&nk) {
                            queue.push_back((v, depth + 1));
                        }
                    }
                    None => {}
                }
            }
        }

        let mut new_doc = doc;
        new_doc.insert(
            as_field.to_string(),
            Bson::Array(found.into_iter().map(Bson::Document).collect()),
        );
        results.push(new_doc);
    }

    Ok(results)
}

// ---------------------------------------------------------------------------
// $facet
// ---------------------------------------------------------------------------

pub fn stage_facet(
    docs: Vec<Document>,
    spec: &Bson,
    resolver: Option<&dyn CollectionResolver>,
) -> AggregationResult<Vec<Document>> {
    let facet_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$facet requires document".into()))?;

    let mut result = Document::new();

    for (name, pipeline_bson) in facet_doc {
        let pipeline = pipeline_bson
            .as_array()
            .ok_or_else(|| {
                AggregationError::InvalidStage(format!("$facet.{} must be an array", name))
            })?
            .iter()
            .filter_map(|s| s.as_document().cloned())
            .collect::<Vec<_>>();

        let facet_result = super::aggregate_with_resolver(docs.clone(), &pipeline, resolver)?;
        result.insert(
            name.clone(),
            Bson::Array(facet_result.into_iter().map(Bson::Document).collect()),
        );
    }

    Ok(vec![result])
}

// ---------------------------------------------------------------------------
// $setWindowFields (simplified)
// ---------------------------------------------------------------------------

fn sort_keys_equal(sort_by: Option<&Document>, a: &Document, b: &Document) -> bool {
    let Some(sb) = sort_by else { return true };
    for (field, _) in sb {
        let va = get_value(a, field);
        let vb = get_value(b, field);
        if compare_bson(va, vb) != std::cmp::Ordering::Equal {
            return false;
        }
    }
    true
}

pub fn stage_set_window_fields(
    docs: Vec<Document>,
    spec: &Bson,
) -> AggregationResult<Vec<Document>> {
    let wf_doc = spec.as_document().ok_or_else(|| {
        AggregationError::InvalidStage("$setWindowFields requires document".into())
    })?;

    let sort_by = wf_doc.get_document("sortBy").ok();
    let output = wf_doc
        .get_document("output")
        .map_err(|_| AggregationError::MissingField("$setWindowFields.output required".into()))?;
    let partition_by = wf_doc.get("partitionBy");

    let mut sorted_docs = docs;
    if let Some(sb) = sort_by {
        sorted_docs = stage_sort(sorted_docs, &Bson::Document(sb.clone()))?;
    }

    let partitions: Vec<Vec<usize>> = if let Some(pb) = partition_by {
        let mut groups: HashMap<String, Vec<usize>> = HashMap::new();
        for (i, doc) in sorted_docs.iter().enumerate() {
            let key = evaluate_expression(doc, pb)?;
            let key_str = bson_to_key_string(&key);
            groups.entry(key_str).or_default().push(i);
        }
        groups.into_values().collect()
    } else {
        vec![(0..sorted_docs.len()).collect()]
    };

    for (field, window_spec_bson) in output {
        let empty_doc = Document::new();
        let window_spec = window_spec_bson.as_document().unwrap_or(&empty_doc);
        let (op, op_expr) = window_spec
            .iter()
            .find(|(k, _)| k.starts_with('$'))
            .ok_or_else(|| {
                AggregationError::InvalidStage(format!(
                    "$setWindowFields.output.{} needs an operator",
                    field
                ))
            })?;

        for partition in &partitions {
            match op.as_str() {
                "$rank" => {
                    let mut current_rank: i32 = 1;
                    for (pos, &idx) in partition.iter().enumerate() {
                        if pos > 0 {
                            let prev_idx = partition[pos - 1];
                            if !sort_keys_equal(sort_by, &sorted_docs[prev_idx], &sorted_docs[idx])
                            {
                                current_rank = (pos + 1) as i32;
                            }
                        }
                        sorted_docs[idx].insert(field.clone(), Bson::Int32(current_rank));
                    }
                }
                "$denseRank" => {
                    let mut current_rank: i32 = 1;
                    for (pos, &idx) in partition.iter().enumerate() {
                        if pos > 0 {
                            let prev_idx = partition[pos - 1];
                            if !sort_keys_equal(sort_by, &sorted_docs[prev_idx], &sorted_docs[idx])
                            {
                                current_rank += 1;
                            }
                        }
                        sorted_docs[idx].insert(field.clone(), Bson::Int32(current_rank));
                    }
                }
                "$documentNumber" => {
                    for (pos, &idx) in partition.iter().enumerate() {
                        sorted_docs[idx].insert(field.clone(), Bson::Int32((pos + 1) as i32));
                    }
                }
                "$count" => {
                    let val = Bson::Int32(partition.len() as i32);
                    for &idx in partition {
                        sorted_docs[idx].insert(field.clone(), val.clone());
                    }
                }
                "$first" => {
                    let first_idx = partition[0];
                    let val = evaluate_expression(&sorted_docs[first_idx], op_expr)?;
                    for &idx in partition {
                        sorted_docs[idx].insert(field.clone(), val.clone());
                    }
                }
                "$last" => {
                    let Some(&last_idx) = partition.last() else {
                        continue;
                    };
                    let val = evaluate_expression(&sorted_docs[last_idx], op_expr)?;
                    for &idx in partition {
                        sorted_docs[idx].insert(field.clone(), val.clone());
                    }
                }
                "$shift" => {
                    let shift_doc = op_expr.as_document().ok_or_else(|| {
                        AggregationError::InvalidStage(
                            "$shift requires a document with output and by".into(),
                        )
                    })?;
                    let output_expr = shift_doc.get("output").ok_or_else(|| {
                        AggregationError::MissingField("$shift.output required".into())
                    })?;
                    let by = shift_doc
                        .get_i32("by")
                        .or_else(|_| shift_doc.get_i64("by").map(|n| n as i32))
                        .unwrap_or(0);
                    let default_val = shift_doc.get("default").cloned().unwrap_or(Bson::Null);
                    let results: Vec<Bson> = partition
                        .iter()
                        .enumerate()
                        .map(|(pos, &_idx)| {
                            let shifted_pos = pos as i64 + by as i64;
                            if shifted_pos >= 0 && (shifted_pos as usize) < partition.len() {
                                let src_idx = partition[shifted_pos as usize];
                                evaluate_expression(&sorted_docs[src_idx], output_expr)
                                    .unwrap_or_else(|_| default_val.clone())
                            } else {
                                default_val.clone()
                            }
                        })
                        .collect();
                    for (pos, &idx) in partition.iter().enumerate() {
                        sorted_docs[idx].insert(field.clone(), results[pos].clone());
                    }
                }
                "$sum" | "$avg" | "$min" | "$max" => {
                    // Compute directly over partition indices, avoiding the
                    // previous O(partition_size) full-document clone.
                    let mut sum = 0.0f64;
                    let mut count = 0usize;
                    let mut min_val: Option<Bson> = None;
                    let mut max_val: Option<Bson> = None;
                    for &idx in partition {
                        let v = evaluate_expression(&sorted_docs[idx], op_expr)?;
                        if let Some(n) = bson_to_f64(&v) {
                            sum += n;
                            count += 1;
                            min_val = Some(match min_val {
                                Some(prev) => {
                                    if n < bson_to_f64(&prev).unwrap_or(f64::INFINITY) {
                                        v.clone()
                                    } else {
                                        prev
                                    }
                                }
                                None => v.clone(),
                            });
                            max_val = Some(match max_val {
                                Some(prev) => {
                                    if n > bson_to_f64(&prev).unwrap_or(f64::NEG_INFINITY) {
                                        v.clone()
                                    } else {
                                        prev
                                    }
                                }
                                None => v.clone(),
                            });
                        }
                    }
                    let val = match op.as_str() {
                        "$sum" => Bson::Double(sum),
                        "$avg" if count > 0 => Bson::Double(sum / count as f64),
                        "$avg" => Bson::Null,
                        "$min" => min_val.unwrap_or(Bson::Null),
                        "$max" => max_val.unwrap_or(Bson::Null),
                        _ => unreachable!(),
                    };
                    for &idx in partition {
                        sorted_docs[idx].insert(field.clone(), val.clone());
                    }
                }
                _ => {
                    return Err(AggregationError::InvalidOperator(format!(
                        "Unknown $setWindowFields operator: {}",
                        op
                    )));
                }
            }
        }
    }

    Ok(sorted_docs)
}

// ===========================================================================
// Streaming stage adapters
//
// Streaming stages return lazy iterator adapters that process one document
// at a time with constant memory overhead.  Blocking stages collect all
// input, delegate to the batch implementation above, and re-emit results.
// ===========================================================================

// --- Streaming stages (lazy iterator adapters) ---

pub fn stage_match_stream(input: DocStream, filter: &Bson) -> AggregationResult<DocStream> {
    let filter_doc = filter
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$match requires document".into()))?
        .clone();

    Ok(Box::new(input.filter_map(move |result| match result {
        Err(e) => Some(Err(e)),
        Ok(doc) => match eval_query(&doc, &filter_doc) {
            Ok(true) => Some(Ok(doc)),
            Ok(false) => None,
            Err(e) => Some(Err(AggregationError::Other(e))),
        },
    })))
}

pub fn stage_project_stream(input: DocStream, projection: &Bson) -> AggregationResult<DocStream> {
    let proj_doc = projection
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$project requires document".into()))?
        .clone();

    let has_exclusion = proj_doc.iter().any(|(k, v)| {
        k != "_id" && matches!(v, Bson::Int32(0) | Bson::Int64(0) | Bson::Boolean(false))
    });

    let id_excluded = matches!(
        proj_doc.get("_id"),
        Some(Bson::Int32(0)) | Some(Bson::Int64(0)) | Some(Bson::Boolean(false))
    );

    Ok(Box::new(input.map(move |result| {
        let doc = result?;
        let new_doc = if has_exclusion {
            let mut computed = Vec::new();
            for (field, value) in &proj_doc {
                if field == "_id" {
                    continue;
                }
                if !matches!(
                    value,
                    Bson::Int32(0) | Bson::Int64(0) | Bson::Boolean(false)
                ) {
                    computed.push((field.clone(), evaluate_expression(&doc, value)?));
                }
            }
            let mut nd = doc;
            for (field, value) in &proj_doc {
                if field == "_id" {
                    continue;
                }
                if matches!(
                    value,
                    Bson::Int32(0) | Bson::Int64(0) | Bson::Boolean(false)
                ) {
                    nd.remove(field);
                }
            }
            for (field, val) in computed {
                nd.insert(field, val);
            }
            if id_excluded {
                nd.remove("_id");
            }
            nd
        } else {
            let mut nd = Document::new();
            if !id_excluded {
                if let Some(id) = doc.get("_id") {
                    nd.insert("_id".to_string(), id.clone());
                }
            }
            for (field, value) in &proj_doc {
                if field == "_id" {
                    continue;
                }
                match value {
                    Bson::Int32(1) | Bson::Int64(1) | Bson::Boolean(true) => {
                        if let Some(val) = get_value(&doc, field) {
                            nd.insert(field.clone(), val.clone());
                        }
                    }
                    _ => {
                        let val = evaluate_expression(&doc, value)?;
                        nd.insert(field.clone(), val);
                    }
                }
            }
            nd
        };
        Ok(new_doc)
    })))
}

pub fn stage_limit_stream(input: DocStream, limit: &Bson) -> AggregationResult<DocStream> {
    let n = limit
        .as_i64()
        .or_else(|| limit.as_i32().map(|i| i as i64))
        .ok_or_else(|| AggregationError::InvalidStage("$limit requires number".into()))?
        as usize;
    Ok(Box::new(input.take(n)))
}

pub fn stage_skip_stream(input: DocStream, skip: &Bson) -> AggregationResult<DocStream> {
    let n = skip
        .as_i64()
        .or_else(|| skip.as_i32().map(|i| i as i64))
        .ok_or_else(|| AggregationError::InvalidStage("$skip requires number".into()))?
        as usize;
    Ok(Box::new(input.skip(n)))
}

pub fn stage_unwind_stream(input: DocStream, spec: &Bson) -> AggregationResult<DocStream> {
    let (path, preserve_null, include_index) = parse_unwind_spec(spec)?;

    Ok(Box::new(input.flat_map(move |result| match result {
        Err(e) => vec![Err(e)],
        Ok(doc) => unwind_single_doc(doc, &path, preserve_null, &include_index),
    })))
}

fn parse_unwind_spec(spec: &Bson) -> AggregationResult<(String, bool, Option<String>)> {
    match spec {
        Bson::String(s) => {
            let p = s.strip_prefix('$').unwrap_or(s);
            Ok((p.to_string(), false, None))
        }
        Bson::Document(d) => {
            let path = d
                .get_str("path")
                .map_err(|_| AggregationError::MissingField("$unwind requires path".into()))?;
            let p = path.strip_prefix('$').unwrap_or(path).to_string();
            let preserve = d.get_bool("preserveNullAndEmptyArrays").unwrap_or(false);
            let idx_field = d.get_str("includeArrayIndex").ok().map(String::from);
            Ok((p, preserve, idx_field))
        }
        _ => Err(AggregationError::InvalidStage(
            "$unwind requires string or document".into(),
        )),
    }
}

fn unwind_single_doc(
    doc: Document,
    path: &str,
    preserve_null: bool,
    include_index: &Option<String>,
) -> Vec<AggregationResult<Document>> {
    let val = get_value(&doc, path).cloned();

    match val {
        Some(Bson::Array(arr)) => {
            if arr.is_empty() {
                if preserve_null {
                    let mut new_doc = doc;
                    let _ = unset_value(&mut new_doc, path);
                    if let Some(ref idx_field) = include_index {
                        new_doc.insert(idx_field.clone(), Bson::Null);
                    }
                    vec![Ok(new_doc)]
                } else {
                    vec![]
                }
            } else {
                let len = arr.len();
                let mut results = Vec::with_capacity(len);
                let mut arr_iter = arr.into_iter().enumerate();
                for (i, item) in arr_iter.by_ref().take(len - 1) {
                    let mut new_doc = doc.clone();
                    let _ = set_value(&mut new_doc, path, item);
                    if let Some(ref idx_field) = include_index {
                        new_doc.insert(idx_field.clone(), Bson::Int64(i as i64));
                    }
                    results.push(Ok(new_doc));
                }
                if let Some((i, item)) = arr_iter.next() {
                    let mut last_doc = doc;
                    let _ = set_value(&mut last_doc, path, item);
                    if let Some(ref idx_field) = include_index {
                        last_doc.insert(idx_field.clone(), Bson::Int64(i as i64));
                    }
                    results.push(Ok(last_doc));
                }
                results
            }
        }
        Some(Bson::Null) | None => {
            if preserve_null {
                let mut new_doc = doc;
                if let Some(ref idx_field) = include_index {
                    new_doc.insert(idx_field.clone(), Bson::Null);
                }
                vec![Ok(new_doc)]
            } else {
                vec![]
            }
        }
        Some(scalar) => {
            let mut new_doc = doc;
            let _ = set_value(&mut new_doc, path, scalar);
            if let Some(ref idx_field) = include_index {
                new_doc.insert(idx_field.clone(), Bson::Null);
            }
            vec![Ok(new_doc)]
        }
    }
}

pub fn stage_add_fields_stream(
    input: DocStream,
    fields_spec: &Bson,
) -> AggregationResult<DocStream> {
    let fields = fields_spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$addFields requires document".into()))?
        .clone();

    Ok(Box::new(input.map(move |result| {
        let doc = result?;
        let evaluated: Vec<_> = fields
            .iter()
            .map(|(field, expr)| Ok((field.clone(), evaluate_expression(&doc, expr)?)))
            .collect::<AggregationResult<Vec<_>>>()?;
        let mut doc = doc;
        for (field, val) in evaluated {
            let _ = set_value(&mut doc, &field, val);
        }
        Ok(doc)
    })))
}

pub fn stage_unset_stream(input: DocStream, spec: &Bson) -> AggregationResult<DocStream> {
    let fields: Vec<String> = match spec {
        Bson::String(s) => vec![s.clone()],
        Bson::Array(arr) => arr
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect(),
        _ => {
            return Err(AggregationError::InvalidStage(
                "$unset requires string or array".into(),
            ))
        }
    };

    Ok(Box::new(input.map(move |result| {
        let mut doc = result?;
        for field in &fields {
            let _ = unset_value(&mut doc, field);
        }
        Ok(doc)
    })))
}

pub fn stage_replace_root_stream(input: DocStream, spec: &Bson) -> AggregationResult<DocStream> {
    let new_root_expr = match spec {
        Bson::Document(d) => d.get("newRoot").unwrap_or(spec).clone(),
        _ => spec.clone(),
    };

    Ok(Box::new(input.map(move |result| {
        let doc = result?;
        let val = evaluate_expression(&doc, &new_root_expr)?;
        match val {
            Bson::Document(d) => Ok(d),
            _ => Err(AggregationError::TypeError(
                "$replaceRoot expression must evaluate to a document".into(),
            )),
        }
    })))
}

pub fn stage_redact_stream(input: DocStream, expr: &Bson) -> AggregationResult<DocStream> {
    let expr_owned = expr.clone();
    Ok(Box::new(input.filter_map(move |result| match result {
        Err(e) => Some(Err(e)),
        Ok(doc) => match redact_doc(&doc, &expr_owned) {
            Ok(Some(redacted)) => Some(Ok(redacted)),
            Ok(None) => None,
            Err(e) => Some(Err(e)),
        },
    })))
}

// --- Memory-limited collect helper ---

pub(crate) fn estimate_doc_bytes(doc: &Document) -> usize {
    bson::to_vec(doc).map(|v| v.len()).unwrap_or(256)
}

/// Collect a streaming pipeline into a `Vec`, checking the estimated BSON
/// byte size against an optional memory limit.  Returns
/// [`AggregationError::MemoryLimitExceeded`] when the limit is breached.
pub(crate) fn collect_with_limit(
    input: DocStream,
    stage_name: &str,
    limit: Option<usize>,
) -> AggregationResult<Vec<Document>> {
    let docs: Vec<Document> = input.collect::<AggregationResult<Vec<_>>>()?;
    if let Some(max_bytes) = limit {
        let estimated: usize = docs.iter().map(estimate_doc_bytes).sum();
        if estimated > max_bytes {
            return Err(AggregationError::MemoryLimitExceeded {
                stage: stage_name.into(),
                used: estimated,
                limit: max_bytes,
            });
        }
    }
    Ok(docs)
}

// --- Blocking stages (collect, delegate to batch, re-emit) ---

pub fn stage_sort_stream(
    input: DocStream,
    sort_spec: &Bson,
    memory_limit: Option<usize>,
    _allow_disk_use: bool,
) -> AggregationResult<DocStream> {
    #[cfg(not(target_arch = "wasm32"))]
    if _allow_disk_use {
        let limit = memory_limit.unwrap_or(super::DEFAULT_MEMORY_LIMIT_BYTES);
        let results = super::disk_spill::external_sort(input, sort_spec, limit)?;
        return Ok(Box::new(results.into_iter().map(Ok)));
    }
    let docs = collect_with_limit(input, "$sort", memory_limit)?;
    let results = stage_sort(docs, sort_spec)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

/// Fused `$sort` + `$limit` stage using a BinaryHeap of size `limit`.
///
/// Complexity: O(n log k) where k = limit, instead of O(n log n) for a full
/// sort followed by truncation.
pub fn stage_sort_limit_stream(
    input: DocStream,
    sort_spec: &Bson,
    limit_spec: &Bson,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let sort_doc = sort_spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$sort requires document".into()))?;
    let limit = limit_spec
        .as_i64()
        .or_else(|| limit_spec.as_i32().map(|i| i as i64))
        .ok_or_else(|| AggregationError::InvalidStage("$limit requires number".into()))?
        as usize;

    if limit == 0 {
        return Ok(Box::new(std::iter::empty()));
    }

    let docs = collect_with_limit(input, "$sort", memory_limit)?;

    // Build a comparator closure based on the sort spec.
    let sort_fields: Vec<(String, i32)> = sort_doc
        .iter()
        .map(|(k, v)| (k.clone(), v.as_i32().unwrap_or(1)))
        .collect();

    let cmp_docs = |a: &Document, b: &Document| -> std::cmp::Ordering {
        for (field, dir) in &sort_fields {
            let va = crate::paths::get_value(a, field);
            let vb = crate::paths::get_value(b, field);
            let cmp = crate::aggregation::compare_bson(va, vb);
            let result = if *dir < 0 { cmp.reverse() } else { cmp };
            if result != std::cmp::Ordering::Equal {
                return result;
            }
        }
        std::cmp::Ordering::Equal
    };

    // We want the top-k "smallest" by sort order.  Use a max-heap so we
    // can evict the "largest" quickly.  OrdWrapper delegates to cmp_docs.
    // Since BinaryHeap needs Ord, we use an index-based approach.
    let mut indices: Vec<usize> = (0..docs.len()).collect();

    // Partial sort: keep only the top `limit` using select_nth_unstable_by
    // when the dataset is larger than limit.
    if indices.len() > limit {
        indices.select_nth_unstable_by(limit - 1, |&a, &b| cmp_docs(&docs[a], &docs[b]));
        indices.truncate(limit);
    }
    indices.sort_by(|&a, &b| cmp_docs(&docs[a], &docs[b]));

    let results: Vec<Document> = indices.into_iter().map(|i| docs[i].clone()).collect();
    Ok(Box::new(results.into_iter().map(Ok)))
}

pub fn stage_group_stream(
    input: DocStream,
    group_spec: &Bson,
    memory_limit: Option<usize>,
    _allow_disk_use: bool,
) -> AggregationResult<DocStream> {
    #[cfg(not(target_arch = "wasm32"))]
    if _allow_disk_use {
        let limit = memory_limit.unwrap_or(super::DEFAULT_MEMORY_LIMIT_BYTES);
        let results = super::disk_spill::external_group(input, group_spec, limit)?;
        return Ok(Box::new(results.into_iter().map(Ok)));
    }
    let docs = collect_with_limit(input, "$group", memory_limit)?;
    let results = stage_group(docs, group_spec)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

pub fn stage_count_stream(
    input: DocStream,
    field_name: &Bson,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let docs = collect_with_limit(input, "$count", memory_limit)?;
    let results = stage_count(docs, field_name)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

pub fn stage_sample_stream(
    input: DocStream,
    spec: &Bson,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let docs = collect_with_limit(input, "$sample", memory_limit)?;
    let results = stage_sample(docs, spec)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

pub fn stage_sort_by_count_stream(
    input: DocStream,
    expr: &Bson,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let docs = collect_with_limit(input, "$sortByCount", memory_limit)?;
    let results = stage_sort_by_count(docs, expr)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

pub fn stage_bucket_stream(
    input: DocStream,
    spec: &Bson,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let docs = collect_with_limit(input, "$bucket", memory_limit)?;
    let results = stage_bucket(docs, spec)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

pub fn stage_bucket_auto_stream(
    input: DocStream,
    spec: &Bson,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let docs = collect_with_limit(input, "$bucketAuto", memory_limit)?;
    let results = stage_bucket_auto(docs, spec)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

pub fn stage_lookup_stream(
    input: DocStream,
    spec: &Bson,
    resolver: Option<&dyn CollectionResolver>,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let docs = collect_with_limit(input, "$lookup", memory_limit)?;
    let results = stage_lookup(docs, spec, resolver)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

pub fn stage_graph_lookup_stream(
    input: DocStream,
    spec: &Bson,
    resolver: Option<&dyn CollectionResolver>,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let docs = collect_with_limit(input, "$graphLookup", memory_limit)?;
    let results = stage_graph_lookup(docs, spec, resolver)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

pub fn stage_facet_stream(
    input: DocStream,
    spec: &Bson,
    resolver: Option<&dyn CollectionResolver>,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let docs = collect_with_limit(input, "$facet", memory_limit)?;
    let results = stage_facet(docs, spec, resolver)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

pub fn stage_set_window_fields_stream(
    input: DocStream,
    spec: &Bson,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let docs = collect_with_limit(input, "$setWindowFields", memory_limit)?;
    let results = stage_set_window_fields(docs, spec)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

// ---------------------------------------------------------------------------
// $unionWith
// ---------------------------------------------------------------------------

pub fn stage_union_with_stream(
    input: DocStream,
    spec: &Bson,
    resolver: Option<&dyn CollectionResolver>,
    memory_limit: Option<usize>,
) -> AggregationResult<DocStream> {
    let docs = collect_with_limit(input, "$unionWith", memory_limit)?;
    let results = stage_union_with(docs, spec, resolver)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

fn stage_union_with(
    docs: Vec<Document>,
    spec: &Bson,
    resolver: Option<&dyn CollectionResolver>,
) -> AggregationResult<Vec<Document>> {
    let resolver = resolver.ok_or_else(|| {
        AggregationError::Other("$unionWith requires a CollectionResolver".into())
    })?;

    let (coll_name, sub_pipeline) = match spec {
        Bson::String(name) => (name.as_str(), Vec::new()),
        Bson::Document(d) => {
            let name = d
                .get_str("coll")
                .map_err(|_| AggregationError::MissingField("$unionWith.coll required".into()))?;
            let pipeline: Vec<Document> = d
                .get_array("pipeline")
                .unwrap_or(&Vec::new())
                .iter()
                .filter_map(|s| s.as_document().cloned())
                .collect();
            (name, pipeline)
        }
        _ => {
            return Err(AggregationError::InvalidStage(
                "$unionWith requires string or document".into(),
            ));
        }
    };

    let mut foreign_docs = resolver.resolve(coll_name, None)?;

    if !sub_pipeline.is_empty() {
        foreign_docs = super::aggregate_with_resolver(foreign_docs, &sub_pipeline, Some(resolver))?;
    }

    let mut result = docs;
    result.extend(foreign_docs);
    Ok(result)
}

// ---------------------------------------------------------------------------
// $out / $merge (streaming stubs — actual writes go through execute_out/execute_merge)
// ---------------------------------------------------------------------------

pub fn stage_out_stream(input: DocStream, _spec: &Bson) -> AggregationResult<DocStream> {
    Ok(input)
}

pub fn stage_merge_stream(input: DocStream, _spec: &Bson) -> AggregationResult<DocStream> {
    Ok(input)
}

pub fn execute_out(
    spec: &Bson,
    docs: &[Document],
    mutator: &dyn super::DatabaseMutator,
) -> AggregationResult<()> {
    let target = match spec {
        Bson::String(name) => name.as_str(),
        Bson::Document(d) => d.get_str("coll").or_else(|_| d.get_str("db")).unwrap_or(""),
        _ => {
            return Err(AggregationError::InvalidStage(
                "$out requires string or document".into(),
            ));
        }
    };
    if target.is_empty() {
        return Err(AggregationError::MissingField(
            "$out target collection required".into(),
        ));
    }
    mutator.drop_and_insert(target, docs)
}

pub fn execute_merge(
    spec: &Bson,
    docs: &[Document],
    mutator: &dyn super::DatabaseMutator,
) -> AggregationResult<()> {
    let merge_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$merge requires document".into()))?;

    let into = merge_doc
        .get("into")
        .ok_or_else(|| AggregationError::MissingField("$merge.into required".into()))?;
    let target = match into {
        Bson::String(s) => s.as_str(),
        Bson::Document(d) => d.get_str("coll").unwrap_or(""),
        _ => "",
    };
    if target.is_empty() {
        return Err(AggregationError::MissingField(
            "$merge target collection required".into(),
        ));
    }

    let on_fields: Vec<String> = match merge_doc.get("on") {
        Some(Bson::String(s)) => vec![s.clone()],
        Some(Bson::Array(arr)) => arr
            .iter()
            .filter_map(|v| v.as_str().map(String::from))
            .collect(),
        _ => vec!["_id".to_string()],
    };

    let when_matched = merge_doc.get_str("whenMatched").unwrap_or("replace");

    mutator.upsert(target, &on_fields, docs, when_matched)
}

// ---------------------------------------------------------------------------
// $vectorSearch
// ---------------------------------------------------------------------------

/// Streaming `$vectorSearch`: materializes candidates from the input stream,
/// scores them via [`super::vector::score_documents`] (HNSW or flat scan),
/// and returns the top-k results ranked by similarity.
///
/// Accepts all Atlas `$vectorSearch` fields (`index`, `exact`,
/// `numCandidates`, `filter`, `path`, `queryVector`, `limit`).
///
/// When `exact: true`, performs exhaustive brute-force search — optimal for
/// multi-tenant workloads where each tenant has < 10K vectors after
/// pre-filtering by `tenant_id`.
pub fn stage_vector_search_stream(input: DocStream, spec: &Bson) -> AggregationResult<DocStream> {
    let vs_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$vectorSearch requires document".into()))?;

    let s = super::vector::VectorSearchSpec::parse(vs_doc)?;
    let mql_filter = s.mql_filter.cloned();

    let mut candidates: Vec<Document> = Vec::new();
    for result in input {
        let doc = result?;
        if let Some(ref filter) = mql_filter {
            if !eval_query(&doc, filter).map_err(AggregationError::Other)? {
                continue;
            }
        }
        candidates.push(doc);
    }

    let scored = super::vector::score_documents(
        &candidates,
        s.path,
        &s.query_vec,
        s.limit,
        s.metric,
        s.exact,
    )?;

    let results: Vec<Document> = scored
        .into_iter()
        .map(|(mut doc, score)| {
            doc.insert(s.score_field.to_string(), Bson::Double(score as f64));
            doc
        })
        .collect();

    Ok(Box::new(results.into_iter().map(Ok)))
}

/// Index-aware `$vectorSearch`: tries the `IndexProvider` first (vendored
/// HNSW or flat scan depending on index type / `exact` flag), then falls
/// back to the streaming path.
pub fn stage_vector_search_stream_indexed(
    input: DocStream,
    spec: &Bson,
    idx_ctx: Option<&super::PipelineIndexCtx<'_>>,
) -> AggregationResult<DocStream> {
    if let (Some(ctx), Some(vs_doc)) = (idx_ctx, spec.as_document()) {
        if let Ok(s) = super::vector::VectorSearchSpec::parse(vs_doc) {
            if !s.path.is_empty() && !s.query_vec.is_empty() {
                if let Ok(Some(scored)) = ctx.provider.vector_search(
                    ctx.source_collection,
                    s.path,
                    &s.query_vec,
                    s.limit,
                    s.num_candidates,
                    s.metric,
                    s.mql_filter,
                    s.exact,
                ) {
                    let results: Vec<Document> = scored
                        .into_iter()
                        .map(|(mut doc, score)| {
                            doc.insert(s.score_field.to_string(), bson::Bson::Double(score as f64));
                            doc
                        })
                        .collect();
                    return Ok(Box::new(results.into_iter().map(Ok)));
                }
            }
        }
    }
    stage_vector_search_stream(input, spec)
}

// ---------------------------------------------------------------------------
// $geoNear
// ---------------------------------------------------------------------------

pub fn stage_geo_near_stream(input: DocStream, spec: &Bson) -> AggregationResult<DocStream> {
    let docs: Vec<Document> = input.collect::<Result<Vec<_>, _>>()?;
    let results = stage_geo_near(docs, spec)?;
    Ok(Box::new(results.into_iter().map(Ok)))
}

/// Index-aware `$geoNear`: tries the `IndexProvider` first for 2dsphere
/// index acceleration, then falls back to brute-force.
pub fn stage_geo_near_stream_indexed(
    input: DocStream,
    spec: &Bson,
    idx_ctx: Option<&super::PipelineIndexCtx<'_>>,
) -> AggregationResult<DocStream> {
    let gn_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$geoNear requires document".into()))?;

    if let Some(ctx) = idx_ctx {
        let near = gn_doc.get("near");
        let key = gn_doc.get_str("key").unwrap_or("location");
        let distance_field = gn_doc.get_str("distanceField").unwrap_or("dist");
        let distance_multiplier = gn_doc
            .get("distanceMultiplier")
            .and_then(|v| v.as_f64())
            .unwrap_or(1.0);
        let include_locs = gn_doc.get_str("includeLocs").ok();
        let max_distance = gn_doc
            .get("maxDistance")
            .and_then(|v| v.as_f64().or_else(|| v.as_i64().map(|i| i as f64)));
        let limit = gn_doc
            .get("limit")
            .and_then(|v| v.as_i64().or_else(|| v.as_i32().map(|i| i as i64)))
            .map(|l| l as usize);
        let query_filter = gn_doc.get_document("query").ok();

        if let Some((lon, lat)) = near.and_then(|n| crate::geo::extract_lon_lat(Some(n))) {
            if let Ok(Some(scored)) = ctx.provider.geo_near_indexed(
                ctx.source_collection,
                key,
                lon,
                lat,
                limit,
                max_distance,
                query_filter,
            ) {
                let results: Vec<Document> = scored
                    .into_iter()
                    .map(|(mut doc, dist)| {
                        let _ = set_value(
                            &mut doc,
                            distance_field,
                            Bson::Double(dist * distance_multiplier),
                        );
                        if let Some(locs_field) = include_locs {
                            if let Some(loc_val) = get_value(&doc, key).cloned() {
                                let _ = set_value(&mut doc, locs_field, loc_val);
                            }
                        }
                        doc
                    })
                    .collect();
                return Ok(Box::new(results.into_iter().map(Ok)));
            }
        }
    }

    stage_geo_near_stream(input, spec)
}

fn stage_geo_near(docs: Vec<Document>, spec: &Bson) -> AggregationResult<Vec<Document>> {
    let gn_doc = spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$geoNear requires document".into()))?;

    let near = gn_doc
        .get("near")
        .ok_or_else(|| AggregationError::MissingField("$geoNear.near required".into()))?;

    let (near_lon, near_lat) = crate::geo::extract_lon_lat(Some(near)).ok_or_else(|| {
        AggregationError::InvalidStage("$geoNear.near must be a GeoJSON Point or [lon, lat]".into())
    })?;

    let distance_field = gn_doc
        .get_str("distanceField")
        .map_err(|_| AggregationError::MissingField("$geoNear.distanceField required".into()))?;

    let key = gn_doc.get_str("key").unwrap_or("location");
    let max_distance = gn_doc
        .get("maxDistance")
        .and_then(|v| v.as_f64().or_else(|| v.as_i64().map(|i| i as f64)));
    let min_distance = gn_doc
        .get("minDistance")
        .and_then(|v| v.as_f64().or_else(|| v.as_i64().map(|i| i as f64)));
    let distance_multiplier = gn_doc
        .get("distanceMultiplier")
        .and_then(|v| v.as_f64())
        .unwrap_or(1.0);
    let include_locs = gn_doc.get_str("includeLocs").ok();
    let limit = gn_doc
        .get("limit")
        .and_then(|v| v.as_i64().or_else(|| v.as_i32().map(|i| i as i64)));
    let query_filter = gn_doc.get_document("query").ok();

    // When limit is specified, use a BinaryHeap-style top-k selection:
    // O(n log k) instead of O(n log n).  We store all prepared docs in a Vec
    // and keep only the k smallest-distance indices in a max-heap.
    use super::total_ord::TotalF64;
    use std::collections::BinaryHeap;

    let use_heap = limit.map(|l| l as usize);

    // (distance, seq) max-heap — seq breaks ties deterministically
    let mut heap: BinaryHeap<(TotalF64, usize)> = BinaryHeap::new();
    let mut prepared: Vec<(f64, Document)> = Vec::new();

    for doc in docs {
        if let Some(filter) = query_filter {
            if !eval_query(&doc, filter).unwrap_or(false) {
                continue;
            }
        }

        let loc = get_value(&doc, key);
        let coords = crate::geo::extract_lon_lat(loc);
        let Some((doc_lon, doc_lat)) = coords else {
            continue;
        };

        let dist = crate::geo::haversine_meters(near_lon, near_lat, doc_lon, doc_lat);

        if let Some(max_d) = max_distance {
            if dist > max_d {
                continue;
            }
        }
        if let Some(min_d) = min_distance {
            if dist < min_d {
                continue;
            }
        }

        let mut result_doc = doc;
        let _ = set_value(
            &mut result_doc,
            distance_field,
            Bson::Double(dist * distance_multiplier),
        );
        if let Some(locs_field) = include_locs {
            if let Some(loc_val) = get_value(&result_doc, key).cloned() {
                let _ = set_value(&mut result_doc, locs_field, loc_val);
            }
        }

        let idx = prepared.len();
        prepared.push((dist, result_doc));

        if let Some(k) = use_heap {
            let d = TotalF64(dist);
            if heap.len() < k {
                heap.push((d, idx));
            } else if let Some((max_dist, _)) = heap.peek() {
                if d < *max_dist {
                    heap.pop();
                    heap.push((d, idx));
                }
            }
        }
    }

    if let Some(_k) = use_heap {
        let mut top: Vec<(f64, usize)> = heap.into_iter().map(|(d, i)| (d.0, i)).collect();
        top.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
        Ok(top
            .into_iter()
            .map(|(_, i)| prepared[i].1.clone())
            .collect())
    } else {
        prepared.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
        Ok(prepared.into_iter().map(|(_, doc)| doc).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;

    #[test]
    fn test_set_window_fields_unknown_operator_errors() {
        let docs = vec![doc! { "x": 1 }, doc! { "x": 2 }];
        let spec = Bson::Document(doc! {
            "sortBy": { "x": 1 },
            "output": {
                "result": { "$bogusWindowOp": {} }
            }
        });
        let result = stage_set_window_fields(docs, &spec);
        assert!(result.is_err());
        let msg = format!("{}", result.unwrap_err());
        assert!(
            msg.contains("Unknown $setWindowFields operator: $bogusWindowOp"),
            "unexpected error message: {}",
            msg
        );
    }

    #[test]
    fn test_set_window_fields_document_number() {
        let docs = vec![doc! { "x": 3 }, doc! { "x": 1 }, doc! { "x": 2 }];
        let spec = Bson::Document(doc! {
            "sortBy": { "x": 1 },
            "output": { "rowNum": { "$documentNumber": {} } }
        });
        let result = stage_set_window_fields(docs, &spec).unwrap();
        assert_eq!(result[0].get_i32("rowNum").unwrap(), 1);
        assert_eq!(result[1].get_i32("rowNum").unwrap(), 2);
        assert_eq!(result[2].get_i32("rowNum").unwrap(), 3);
    }

    #[test]
    fn test_set_window_fields_first_last() {
        let docs = vec![doc! { "v": 10 }, doc! { "v": 20 }, doc! { "v": 30 }];
        let spec = Bson::Document(doc! {
            "sortBy": { "v": 1 },
            "output": {
                "earliest": { "$first": "$v" },
                "latest": { "$last": "$v" }
            }
        });
        let result = stage_set_window_fields(docs, &spec).unwrap();
        for d in &result {
            assert_eq!(d.get_i32("earliest").unwrap(), 10);
            assert_eq!(d.get_i32("latest").unwrap(), 30);
        }
    }

    #[test]
    fn test_set_window_fields_shift() {
        let docs = vec![doc! { "v": 1 }, doc! { "v": 2 }, doc! { "v": 3 }];
        let spec = Bson::Document(doc! {
            "sortBy": { "v": 1 },
            "output": {
                "prev": {
                    "$shift": { "output": "$v", "by": -1, "default": -1 }
                },
                "next": {
                    "$shift": { "output": "$v", "by": 1, "default": -1 }
                }
            }
        });
        let result = stage_set_window_fields(docs, &spec).unwrap();
        assert_eq!(result[0].get_i32("prev").unwrap(), -1);
        assert_eq!(result[0].get_i32("next").unwrap(), 2);
        assert_eq!(result[1].get_i32("prev").unwrap(), 1);
        assert_eq!(result[1].get_i32("next").unwrap(), 3);
        assert_eq!(result[2].get_i32("prev").unwrap(), 2);
        assert_eq!(result[2].get_i32("next").unwrap(), -1);
    }

    #[test]
    fn test_set_window_fields_rank_and_dense_rank() {
        let docs = vec![
            doc! { "score": 100 },
            doc! { "score": 90 },
            doc! { "score": 90 },
            doc! { "score": 80 },
        ];
        let spec = Bson::Document(doc! {
            "sortBy": { "score": 1 },
            "output": {
                "r": { "$rank": {} },
                "dr": { "$denseRank": {} }
            }
        });
        let result = stage_set_window_fields(docs, &spec).unwrap();
        let ranks: Vec<i32> = result.iter().map(|d| d.get_i32("r").unwrap()).collect();
        let dense: Vec<i32> = result.iter().map(|d| d.get_i32("dr").unwrap()).collect();
        assert_eq!(ranks, vec![1, 2, 2, 4]);
        assert_eq!(dense, vec![1, 2, 2, 3]);
    }
}
