//! Group accumulators for the `$group` aggregation stage.

use bson::{Bson, Document};
use std::collections::HashSet;

use super::expressions::evaluate_expression;
use super::{AggregationError, AggregationResult};

/// Evaluate a `$group` accumulator over a slice of grouped documents.
pub fn evaluate_accumulator(docs: &[Document], acc: &Bson) -> AggregationResult<Bson> {
    let acc_doc = acc
        .as_document()
        .ok_or_else(|| AggregationError::InvalidOperator("Accumulator must be document".into()))?;

    let (op, expr) = acc_doc
        .iter()
        .next()
        .ok_or_else(|| AggregationError::InvalidOperator("Empty accumulator".into()))?;

    match op.as_str() {
        "$sum" => accum_sum(docs, expr),
        "$avg" => accum_avg(docs, expr),
        "$count" => Ok(Bson::Int32(docs.len() as i32)),
        "$min" => accum_min(docs, expr),
        "$max" => accum_max(docs, expr),
        "$first" => accum_first(docs, expr),
        "$last" => accum_last(docs, expr),
        "$push" => accum_push(docs, expr),
        "$addToSet" => accum_add_to_set(docs, expr),
        "$mergeObjects" => accum_merge_objects(docs, expr),
        "$stdDevPop" => accum_stddev(docs, expr, true),
        "$stdDevSamp" => accum_stddev(docs, expr, false),
        "$top" => accum_top_bottom(docs, acc_doc, true, 1),
        "$bottom" => accum_top_bottom(docs, acc_doc, false, 1),
        "$topN" => {
            let n = extract_n(acc_doc)?;
            accum_top_bottom(docs, acc_doc, true, n)
        }
        "$bottomN" => {
            let n = extract_n(acc_doc)?;
            accum_top_bottom(docs, acc_doc, false, n)
        }
        "$firstN" => accum_first_n(docs, expr, acc_doc),
        "$lastN" => accum_last_n(docs, expr, acc_doc),
        _ => Err(AggregationError::InvalidOperator(format!(
            "Unknown accumulator: {}",
            op
        ))),
    }
}

fn bson_to_f64(val: &Bson) -> Option<f64> {
    match val {
        Bson::Int32(n) => Some(*n as f64),
        Bson::Int64(n) => Some(*n as f64),
        Bson::Double(n) => Some(*n),
        _ => None,
    }
}

fn accum_sum(docs: &[Document], expr: &Bson) -> AggregationResult<Bson> {
    let mut int_sum: i64 = 0;
    let mut has_double = false;
    let mut dbl_sum: f64 = 0.0;

    for doc in docs {
        let val = evaluate_expression(doc, expr)?;
        match val {
            Bson::Int32(n) => {
                int_sum += n as i64;
                dbl_sum += n as f64;
            }
            Bson::Int64(n) => {
                int_sum += n;
                dbl_sum += n as f64;
            }
            Bson::Double(n) => {
                has_double = true;
                dbl_sum += n;
            }
            _ => {}
        }
    }
    if has_double {
        Ok(Bson::Double(dbl_sum))
    } else {
        Ok(Bson::Int64(int_sum))
    }
}

fn accum_avg(docs: &[Document], expr: &Bson) -> AggregationResult<Bson> {
    let mut sum = 0.0;
    let mut count = 0u64;
    for doc in docs {
        let val = evaluate_expression(doc, expr)?;
        if let Some(n) = bson_to_f64(&val) {
            sum += n;
            count += 1;
        }
    }
    if count > 0 {
        Ok(Bson::Double(sum / count as f64))
    } else {
        Ok(Bson::Null)
    }
}

fn accum_min(docs: &[Document], expr: &Bson) -> AggregationResult<Bson> {
    let mut min: Option<Bson> = None;
    for doc in docs {
        let val = evaluate_expression(doc, expr)?;
        if matches!(val, Bson::Null) {
            continue;
        }
        min = Some(match min {
            None => val,
            Some(ref current) => {
                if super::compare_bson(Some(&val), Some(current)) == std::cmp::Ordering::Less {
                    val
                } else {
                    current.clone()
                }
            }
        });
    }
    Ok(min.unwrap_or(Bson::Null))
}

fn accum_max(docs: &[Document], expr: &Bson) -> AggregationResult<Bson> {
    let mut max: Option<Bson> = None;
    for doc in docs {
        let val = evaluate_expression(doc, expr)?;
        if matches!(val, Bson::Null) {
            continue;
        }
        max = Some(match max {
            None => val,
            Some(ref current) => {
                if super::compare_bson(Some(&val), Some(current)) == std::cmp::Ordering::Greater {
                    val
                } else {
                    current.clone()
                }
            }
        });
    }
    Ok(max.unwrap_or(Bson::Null))
}

fn accum_first(docs: &[Document], expr: &Bson) -> AggregationResult<Bson> {
    match docs.first() {
        Some(doc) => evaluate_expression(doc, expr),
        None => Ok(Bson::Null),
    }
}

fn accum_last(docs: &[Document], expr: &Bson) -> AggregationResult<Bson> {
    match docs.last() {
        Some(doc) => evaluate_expression(doc, expr),
        None => Ok(Bson::Null),
    }
}

fn accum_push(docs: &[Document], expr: &Bson) -> AggregationResult<Bson> {
    let mut result = Vec::with_capacity(docs.len());
    for doc in docs {
        result.push(evaluate_expression(doc, expr)?);
    }
    Ok(Bson::Array(result))
}

fn accum_add_to_set(docs: &[Document], expr: &Bson) -> AggregationResult<Bson> {
    let mut seen = HashSet::new();
    let mut result = Vec::new();
    for doc in docs {
        let val = evaluate_expression(doc, expr)?;
        let key = format!("{:?}", val);
        if seen.insert(key) {
            result.push(val);
        }
    }
    Ok(Bson::Array(result))
}

fn accum_merge_objects(docs: &[Document], expr: &Bson) -> AggregationResult<Bson> {
    let mut merged = Document::new();
    for doc in docs {
        let val = evaluate_expression(doc, expr)?;
        if let Bson::Document(d) = val {
            for (k, v) in d {
                merged.insert(k, v);
            }
        }
    }
    Ok(Bson::Document(merged))
}

fn accum_stddev(docs: &[Document], expr: &Bson, population: bool) -> AggregationResult<Bson> {
    let mut values = Vec::new();
    for doc in docs {
        let val = evaluate_expression(doc, expr)?;
        if let Some(n) = bson_to_f64(&val) {
            values.push(n);
        }
    }
    let n = values.len();
    if n == 0 || (!population && n < 2) {
        return Ok(Bson::Null);
    }
    let mean: f64 = values.iter().sum::<f64>() / n as f64;
    let variance: f64 = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>()
        / if population { n as f64 } else { (n - 1) as f64 };
    Ok(Bson::Double(variance.sqrt()))
}

/// `$top` / `$bottom` / `$topN` / `$bottomN` accumulators.
///
/// Spec shape: `{ sortBy: <doc>, output: <expr>, n?: <int> }`
fn accum_top_bottom(
    docs: &[Document],
    spec: &Document,
    ascending: bool,
    n: usize,
) -> AggregationResult<Bson> {
    let sort_by = spec
        .get_document("sortBy")
        .map_err(|_| AggregationError::MissingField("sortBy required".into()))?;
    let default_output = Bson::String("$$ROOT".into());
    let output_expr = spec.get("output").unwrap_or(&default_output);

    let mut indexed: Vec<(usize, &Document)> = docs.iter().enumerate().collect();
    indexed.sort_by(|(_, a), (_, b)| {
        for (field, direction) in sort_by {
            let dir = direction.as_i32().unwrap_or(1);
            let val_a = crate::paths::get_value(a, field);
            let val_b = crate::paths::get_value(b, field);
            let cmp = super::compare_bson(val_a, val_b);
            let result = if dir < 0 { cmp.reverse() } else { cmp };
            if result != std::cmp::Ordering::Equal {
                return result;
            }
        }
        std::cmp::Ordering::Equal
    });

    if !ascending {
        indexed.reverse();
    }

    let selected: Vec<Bson> = indexed
        .into_iter()
        .take(n)
        .map(|(_, doc)| evaluate_expression(doc, output_expr))
        .collect::<AggregationResult<Vec<_>>>()?;

    if n == 1 {
        Ok(selected.into_iter().next().unwrap_or(Bson::Null))
    } else {
        Ok(Bson::Array(selected))
    }
}

fn extract_n(spec: &Document) -> AggregationResult<usize> {
    spec.get("n")
        .and_then(|v| match v {
            Bson::Int32(n) => Some(*n as usize),
            Bson::Int64(n) => Some(*n as usize),
            _ => None,
        })
        .ok_or_else(|| AggregationError::MissingField("n required".into()))
}

fn accum_first_n(docs: &[Document], expr: &Bson, spec: &Document) -> AggregationResult<Bson> {
    let n = extract_n(spec)?;
    let mut result = Vec::with_capacity(n);
    for doc in docs.iter().take(n) {
        result.push(evaluate_expression(doc, expr)?);
    }
    Ok(Bson::Array(result))
}

fn accum_last_n(docs: &[Document], expr: &Bson, spec: &Document) -> AggregationResult<Bson> {
    let n = extract_n(spec)?;
    let start = docs.len().saturating_sub(n);
    let mut result = Vec::with_capacity(n);
    for doc in docs.iter().skip(start) {
        result.push(evaluate_expression(doc, expr)?);
    }
    Ok(Bson::Array(result))
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;

    fn make_docs(values: &[i32]) -> Vec<Document> {
        values.iter().map(|v| doc! { "x": v }).collect()
    }

    #[test]
    fn test_sum_int() {
        let docs = make_docs(&[10, 20, 30]);
        let acc = doc! { "$sum": "$x" };
        assert_eq!(
            evaluate_accumulator(&docs, &Bson::Document(acc)).unwrap(),
            Bson::Int64(60)
        );
    }

    #[test]
    fn test_sum_double() {
        let docs = vec![doc! { "x": 1.5 }, doc! { "x": 2.5 }];
        let acc = doc! { "$sum": "$x" };
        assert_eq!(
            evaluate_accumulator(&docs, &Bson::Document(acc)).unwrap(),
            Bson::Double(4.0)
        );
    }

    #[test]
    fn test_avg() {
        let docs = make_docs(&[10, 20, 30]);
        let acc = doc! { "$avg": "$x" };
        assert_eq!(
            evaluate_accumulator(&docs, &Bson::Document(acc)).unwrap(),
            Bson::Double(20.0)
        );
    }

    #[test]
    fn test_min_max() {
        let docs = make_docs(&[30, 10, 20]);
        let min_acc = doc! { "$min": "$x" };
        let max_acc = doc! { "$max": "$x" };
        assert_eq!(
            evaluate_accumulator(&docs, &Bson::Document(min_acc)).unwrap(),
            Bson::Int32(10)
        );
        assert_eq!(
            evaluate_accumulator(&docs, &Bson::Document(max_acc)).unwrap(),
            Bson::Int32(30)
        );
    }

    #[test]
    fn test_first_last() {
        let docs = make_docs(&[1, 2, 3]);
        let first = doc! { "$first": "$x" };
        let last = doc! { "$last": "$x" };
        assert_eq!(
            evaluate_accumulator(&docs, &Bson::Document(first)).unwrap(),
            Bson::Int32(1)
        );
        assert_eq!(
            evaluate_accumulator(&docs, &Bson::Document(last)).unwrap(),
            Bson::Int32(3)
        );
    }

    #[test]
    fn test_push() {
        let docs = make_docs(&[1, 2, 3]);
        let acc = doc! { "$push": "$x" };
        assert_eq!(
            evaluate_accumulator(&docs, &Bson::Document(acc)).unwrap(),
            Bson::Array(vec![Bson::Int32(1), Bson::Int32(2), Bson::Int32(3)])
        );
    }

    #[test]
    fn test_add_to_set() {
        let docs = vec![doc! { "x": 1 }, doc! { "x": 2 }, doc! { "x": 1 }];
        let acc = doc! { "$addToSet": "$x" };
        let result = evaluate_accumulator(&docs, &Bson::Document(acc)).unwrap();
        let arr = result.as_array().unwrap();
        assert_eq!(arr.len(), 2);
    }

    #[test]
    fn test_count() {
        let docs = make_docs(&[1, 2, 3]);
        let acc = doc! { "$count": {} };
        assert_eq!(
            evaluate_accumulator(&docs, &Bson::Document(acc)).unwrap(),
            Bson::Int32(3)
        );
    }
}
