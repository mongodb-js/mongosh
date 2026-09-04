//! Expression evaluation for aggregation pipeline stages.

use bson::{Bson, Document};
use chrono::{Datelike, TimeZone, Timelike, Utc};

use super::{AggregationError, AggregationResult};
use crate::paths::get_value;

/// Evaluate an aggregation expression against a document.
///
/// Handles field references (`$fieldName`), literal values, and operator
/// expressions (`$add`, `$concat`, `$cond`, etc.).
pub fn evaluate_expression(doc: &Document, expr: &Bson) -> AggregationResult<Bson> {
    match expr {
        Bson::String(s) if s.starts_with("$$") => {
            let var = &s[2..];
            match var {
                "ROOT" | "CURRENT" => Ok(Bson::Document(doc.clone())),
                "REMOVE" => Ok(Bson::Null),
                _ => Ok(get_value(doc, var).cloned().unwrap_or(Bson::Null)),
            }
        }
        Bson::String(s) if s.starts_with('$') => {
            let field = &s[1..];
            Ok(get_value(doc, field).cloned().unwrap_or(Bson::Null))
        }
        Bson::Document(op_doc) => evaluate_operator_expression(doc, op_doc),
        other => Ok(other.clone()),
    }
}

fn evaluate_operator_expression(doc: &Document, op_doc: &Document) -> AggregationResult<Bson> {
    let (op, args) = match op_doc.iter().next() {
        Some(pair) => pair,
        None => return Ok(Bson::Document(Document::new())),
    };

    if !op.starts_with('$') {
        let mut result = Document::new();
        for (k, v) in op_doc {
            result.insert(k.clone(), evaluate_expression(doc, v)?);
        }
        return Ok(Bson::Document(result));
    }

    match op.as_str() {
        "$add" => expr_add(doc, args),
        "$subtract" => expr_subtract(doc, args),
        "$multiply" => expr_multiply(doc, args),
        "$divide" => expr_divide(doc, args),
        "$mod" => expr_mod(doc, args),
        "$concat" => expr_concat(doc, args),
        "$substr" | "$substrBytes" => expr_substr(doc, args),
        "$toUpper" => expr_to_upper(doc, args),
        "$toLower" => expr_to_lower(doc, args),
        "$cond" => expr_cond(doc, args),
        "$ifNull" => expr_if_null(doc, args),
        "$switch" => expr_switch(doc, args),
        "$arrayElemAt" => expr_array_elem_at(doc, args),
        "$size" => expr_size(doc, args),
        "$literal" => Ok(args.clone()),
        "$not" => expr_not(doc, args),
        "$and" => expr_and(doc, args),
        "$or" => expr_or(doc, args),
        "$eq" => expr_cmp_op(doc, args, |ord| ord == std::cmp::Ordering::Equal),
        "$ne" => expr_cmp_op(doc, args, |ord| ord != std::cmp::Ordering::Equal),
        "$gt" => expr_cmp_op(doc, args, |ord| ord == std::cmp::Ordering::Greater),
        "$gte" => expr_cmp_op(doc, args, |ord| ord != std::cmp::Ordering::Less),
        "$lt" => expr_cmp_op(doc, args, |ord| ord == std::cmp::Ordering::Less),
        "$lte" => expr_cmp_op(doc, args, |ord| ord != std::cmp::Ordering::Greater),
        "$abs" => expr_abs(doc, args),
        "$ceil" => expr_unary_f64(doc, args, f64::ceil),
        "$floor" => expr_unary_f64(doc, args, f64::floor),
        "$round" => expr_round(doc, args),
        "$type" => expr_type(doc, args),
        "$toString" => expr_to_string(doc, args),
        "$toInt" => expr_to_int(doc, args),
        "$toDouble" => expr_to_double(doc, args),
        "$toBool" => expr_to_bool(doc, args),
        "$in" => expr_in(doc, args),
        "$mergeObjects" => expr_merge_objects(doc, args),
        "$map" => expr_map(doc, args),
        "$filter" => expr_filter(doc, args),
        "$let" => expr_let(doc, args),
        "$meta" => expr_meta(doc, args),
        "$year" => expr_date_part(doc, args, |dt| dt.year()),
        "$month" => expr_date_part(doc, args, |dt| dt.month() as i32),
        "$dayOfMonth" => expr_date_part(doc, args, |dt| dt.day() as i32),
        "$hour" => expr_date_part(doc, args, |dt| dt.hour() as i32),
        "$minute" => expr_date_part(doc, args, |dt| dt.minute() as i32),
        "$second" => expr_date_part(doc, args, |dt| dt.second() as i32),
        "$dayOfWeek" => expr_date_part(doc, args, |dt| {
            dt.weekday().num_days_from_sunday() as i32 + 1
        }),
        "$dayOfYear" => expr_date_part(doc, args, |dt| dt.ordinal() as i32),
        "$objectToArray" => expr_object_to_array(doc, args),
        "$arrayToObject" => expr_array_to_object(doc, args),
        "$bsonSize" => expr_bson_size(doc, args),
        "$concatArrays" => expr_concat_arrays(doc, args),
        "$reduce" => expr_reduce(doc, args),
        "$slice" => expr_slice(doc, args),
        "$reverseArray" => expr_reverse_array(doc, args),
        "$isArray" => {
            let val = evaluate_expression(doc, args)?;
            Ok(Bson::Boolean(matches!(val, Bson::Array(_))))
        }
        "$sum" => expr_sum_expr(doc, args),
        _ => Err(AggregationError::InvalidOperator(format!(
            "Unknown expression operator: {}",
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

pub(crate) fn is_truthy(val: &Bson) -> bool {
    match val {
        Bson::Null => false,
        Bson::Boolean(b) => *b,
        Bson::Int32(n) => *n != 0,
        Bson::Int64(n) => *n != 0,
        Bson::Double(n) => *n != 0.0,
        Bson::String(s) => !s.is_empty(),
        _ => true,
    }
}

fn get_array_args(doc: &Document, args: &Bson) -> AggregationResult<Vec<Bson>> {
    match args {
        Bson::Array(arr) => {
            let mut result = Vec::with_capacity(arr.len());
            for a in arr {
                result.push(evaluate_expression(doc, a)?);
            }
            Ok(result)
        }
        _ => Ok(vec![evaluate_expression(doc, args)?]),
    }
}

fn expr_add(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    let mut sum = 0.0f64;
    let mut has_double = false;
    for v in &vals {
        match v {
            Bson::Int32(n) => sum += *n as f64,
            Bson::Int64(n) => sum += *n as f64,
            Bson::Double(n) => {
                sum += n;
                has_double = true;
            }
            Bson::Null => return Ok(Bson::Null),
            _ => return Ok(Bson::Null),
        }
    }
    if has_double {
        Ok(Bson::Double(sum))
    } else {
        Ok(Bson::Int64(sum as i64))
    }
}

fn expr_subtract(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    if vals.len() != 2 {
        return Ok(Bson::Null);
    }
    match (bson_to_f64(&vals[0]), bson_to_f64(&vals[1])) {
        (Some(a), Some(b)) => {
            if matches!(vals[0], Bson::Double(_)) || matches!(vals[1], Bson::Double(_)) {
                Ok(Bson::Double(a - b))
            } else {
                Ok(Bson::Int64((a - b) as i64))
            }
        }
        _ => Ok(Bson::Null),
    }
}

fn expr_multiply(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    let mut product = 1.0f64;
    let mut has_double = false;
    for v in &vals {
        match v {
            Bson::Int32(n) => product *= *n as f64,
            Bson::Int64(n) => product *= *n as f64,
            Bson::Double(n) => {
                product *= n;
                has_double = true;
            }
            Bson::Null => return Ok(Bson::Null),
            _ => return Ok(Bson::Null),
        }
    }
    if has_double {
        Ok(Bson::Double(product))
    } else {
        Ok(Bson::Int64(product as i64))
    }
}

fn expr_divide(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    if vals.len() != 2 {
        return Ok(Bson::Null);
    }
    match (bson_to_f64(&vals[0]), bson_to_f64(&vals[1])) {
        (Some(a), Some(b)) if b != 0.0 => Ok(Bson::Double(a / b)),
        _ => Ok(Bson::Null),
    }
}

fn expr_mod(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    if vals.len() != 2 {
        return Ok(Bson::Null);
    }
    match (bson_to_f64(&vals[0]), bson_to_f64(&vals[1])) {
        (Some(a), Some(b)) if b != 0.0 => {
            if matches!(vals[0], Bson::Double(_)) || matches!(vals[1], Bson::Double(_)) {
                Ok(Bson::Double(a % b))
            } else {
                Ok(Bson::Int64((a as i64) % (b as i64)))
            }
        }
        _ => Ok(Bson::Null),
    }
}

fn expr_concat(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    let mut result = String::new();
    for v in &vals {
        match v {
            Bson::String(s) => result.push_str(s),
            Bson::Null => return Ok(Bson::Null),
            _ => return Ok(Bson::Null),
        }
    }
    Ok(Bson::String(result))
}

fn expr_substr(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    if vals.len() != 3 {
        return Ok(Bson::Null);
    }
    let s = match &vals[0] {
        Bson::String(s) => s.as_str(),
        _ => return Ok(Bson::String(String::new())),
    };
    let start = bson_to_f64(&vals[1]).unwrap_or(0.0) as usize;
    let len = bson_to_f64(&vals[2]).unwrap_or(-1.0);
    if start >= s.len() {
        return Ok(Bson::String(String::new()));
    }
    let end = if len < 0.0 {
        s.len()
    } else {
        (start + len as usize).min(s.len())
    };
    Ok(Bson::String(s[start..end].to_string()))
}

fn expr_to_upper(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match val {
        Bson::String(s) => Ok(Bson::String(s.to_uppercase())),
        Bson::Null => Ok(Bson::Null),
        _ => Ok(Bson::Null),
    }
}

fn expr_to_lower(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match val {
        Bson::String(s) => Ok(Bson::String(s.to_lowercase())),
        Bson::Null => Ok(Bson::Null),
        _ => Ok(Bson::Null),
    }
}

fn expr_cond(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    match args {
        Bson::Array(arr) if arr.len() == 3 => {
            let cond = evaluate_expression(doc, &arr[0])?;
            if is_truthy(&cond) {
                evaluate_expression(doc, &arr[1])
            } else {
                evaluate_expression(doc, &arr[2])
            }
        }
        Bson::Document(d) => {
            let if_expr = d.get("if").unwrap_or(&Bson::Null);
            let then_expr = d.get("then").unwrap_or(&Bson::Null);
            let else_expr = d.get("else").unwrap_or(&Bson::Null);
            let cond = evaluate_expression(doc, if_expr)?;
            if is_truthy(&cond) {
                evaluate_expression(doc, then_expr)
            } else {
                evaluate_expression(doc, else_expr)
            }
        }
        _ => Ok(Bson::Null),
    }
}

fn expr_if_null(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    for v in &vals[..vals.len().saturating_sub(1)] {
        if !matches!(v, Bson::Null) {
            return Ok(v.clone());
        }
    }
    Ok(vals.last().cloned().unwrap_or(Bson::Null))
}

fn expr_switch(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let switch_doc = match args.as_document() {
        Some(d) => d,
        None => return Ok(Bson::Null),
    };
    if let Some(Bson::Array(branches)) = switch_doc.get("branches") {
        for branch in branches {
            if let Some(b) = branch.as_document() {
                let case_expr = b.get("case").unwrap_or(&Bson::Null);
                let then_expr = b.get("then").unwrap_or(&Bson::Null);
                let cond = evaluate_expression(doc, case_expr)?;
                if is_truthy(&cond) {
                    return evaluate_expression(doc, then_expr);
                }
            }
        }
    }
    if let Some(default_expr) = switch_doc.get("default") {
        evaluate_expression(doc, default_expr)
    } else {
        Ok(Bson::Null)
    }
}

fn expr_array_elem_at(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    if vals.len() != 2 {
        return Ok(Bson::Null);
    }
    let arr = match &vals[0] {
        Bson::Array(a) => a,
        _ => return Ok(Bson::Null),
    };
    let idx = bson_to_f64(&vals[1]).unwrap_or(0.0) as i64;
    let actual_idx = if idx < 0 { arr.len() as i64 + idx } else { idx } as usize;
    Ok(arr.get(actual_idx).cloned().unwrap_or(Bson::Null))
}

fn expr_size(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match val {
        Bson::Array(a) => Ok(Bson::Int32(a.len() as i32)),
        _ => Ok(Bson::Null),
    }
}

fn expr_not(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    let val = vals.first().unwrap_or(&Bson::Null);
    Ok(Bson::Boolean(!is_truthy(val)))
}

fn expr_and(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    for v in &vals {
        if !is_truthy(v) {
            return Ok(Bson::Boolean(false));
        }
    }
    Ok(Bson::Boolean(true))
}

fn expr_or(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    for v in &vals {
        if is_truthy(v) {
            return Ok(Bson::Boolean(true));
        }
    }
    Ok(Bson::Boolean(false))
}

fn expr_cmp_op(
    doc: &Document,
    args: &Bson,
    pred: fn(std::cmp::Ordering) -> bool,
) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    if vals.len() != 2 {
        return Ok(Bson::Boolean(false));
    }
    let ord = super::compare_bson(Some(&vals[0]), Some(&vals[1]));
    Ok(Bson::Boolean(pred(ord)))
}

fn expr_abs(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match val {
        Bson::Int32(n) => Ok(Bson::Int32(n.abs())),
        Bson::Int64(n) => Ok(Bson::Int64(n.abs())),
        Bson::Double(n) => Ok(Bson::Double(n.abs())),
        Bson::Null => Ok(Bson::Null),
        _ => Ok(Bson::Null),
    }
}

fn expr_unary_f64(doc: &Document, args: &Bson, f: fn(f64) -> f64) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match bson_to_f64(&val) {
        Some(n) => Ok(Bson::Double(f(n))),
        None => Ok(Bson::Null),
    }
}

fn expr_round(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    let num = bson_to_f64(vals.first().unwrap_or(&Bson::Null));
    let places = vals.get(1).and_then(bson_to_f64).unwrap_or(0.0) as i32;
    match num {
        Some(n) => {
            let factor = 10f64.powi(places);
            Ok(Bson::Double((n * factor).round() / factor))
        }
        None => Ok(Bson::Null),
    }
}

fn expr_type(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    let type_name = match val {
        Bson::Double(_) => "double",
        Bson::String(_) => "string",
        Bson::Document(_) => "object",
        Bson::Array(_) => "array",
        Bson::Boolean(_) => "bool",
        Bson::Null => "null",
        Bson::Int32(_) => "int",
        Bson::Int64(_) => "long",
        Bson::ObjectId(_) => "objectId",
        Bson::DateTime(_) => "date",
        Bson::RegularExpression(_) => "regex",
        _ => "unknown",
    };
    Ok(Bson::String(type_name.to_string()))
}

fn expr_to_string(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match val {
        Bson::String(s) => Ok(Bson::String(s)),
        Bson::Int32(n) => Ok(Bson::String(n.to_string())),
        Bson::Int64(n) => Ok(Bson::String(n.to_string())),
        Bson::Double(n) => Ok(Bson::String(n.to_string())),
        Bson::Boolean(b) => Ok(Bson::String(b.to_string())),
        Bson::ObjectId(oid) => Ok(Bson::String(oid.to_hex())),
        Bson::Null => Ok(Bson::Null),
        _ => Ok(Bson::Null),
    }
}

fn expr_to_int(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match val {
        Bson::Int32(n) => Ok(Bson::Int32(n)),
        Bson::Int64(n) => Ok(Bson::Int32(n as i32)),
        Bson::Double(n) => Ok(Bson::Int32(n as i32)),
        Bson::String(s) => s
            .parse::<i32>()
            .map(Bson::Int32)
            .ok()
            .ok_or_else(|| Bson::Null)
            .or(Ok(Bson::Null)),
        Bson::Boolean(b) => Ok(Bson::Int32(if b { 1 } else { 0 })),
        _ => Ok(Bson::Null),
    }
}

fn expr_to_double(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match bson_to_f64(&val) {
        Some(n) => Ok(Bson::Double(n)),
        None => match val {
            Bson::String(s) => Ok(s.parse::<f64>().map(Bson::Double).unwrap_or(Bson::Null)),
            Bson::Boolean(b) => Ok(Bson::Double(if b { 1.0 } else { 0.0 })),
            _ => Ok(Bson::Null),
        },
    }
}

fn expr_to_bool(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    Ok(Bson::Boolean(is_truthy(&val)))
}

fn expr_in(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    if vals.len() != 2 {
        return Ok(Bson::Boolean(false));
    }
    let needle = &vals[0];
    match &vals[1] {
        Bson::Array(arr) => Ok(Bson::Boolean(arr.contains(needle))),
        _ => Ok(Bson::Boolean(false)),
    }
}

fn expr_merge_objects(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let vals = get_array_args(doc, args)?;
    let mut merged = Document::new();
    for v in vals {
        if let Bson::Document(d) = v {
            for (k, val) in d {
                merged.insert(k, val);
            }
        }
    }
    Ok(Bson::Document(merged))
}

fn expr_map(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let map_doc = match args.as_document() {
        Some(d) => d,
        None => return Ok(Bson::Null),
    };
    let input = evaluate_expression(doc, map_doc.get("input").unwrap_or(&Bson::Null))?;
    let as_name = map_doc.get_str("as").unwrap_or("this");
    let in_expr = map_doc.get("in").unwrap_or(&Bson::Null);

    let arr = match input {
        Bson::Array(a) => a,
        Bson::Null => return Ok(Bson::Null),
        _ => return Ok(Bson::Null),
    };

    // Precompute variable substitution once, outside the per-element loop.
    let var_key = format!("$${}", as_name);
    let temp_field = format!("__{}", as_name);
    let in_replaced = replace_var_refs(in_expr, &var_key, &format!("${}", temp_field));

    let mut result = Vec::with_capacity(arr.len());
    for item in arr {
        let mut scoped_doc = doc.clone();
        scoped_doc.insert(temp_field.clone(), item);
        result.push(evaluate_expression(&scoped_doc, &in_replaced)?);
    }
    Ok(Bson::Array(result))
}

fn expr_filter(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let filter_doc = match args.as_document() {
        Some(d) => d,
        None => return Ok(Bson::Null),
    };
    let input = evaluate_expression(doc, filter_doc.get("input").unwrap_or(&Bson::Null))?;
    let as_name = filter_doc.get_str("as").unwrap_or("this");
    let cond_expr = filter_doc.get("cond").unwrap_or(&Bson::Null);

    let arr = match input {
        Bson::Array(a) => a,
        Bson::Null => return Ok(Bson::Null),
        _ => return Ok(Bson::Null),
    };

    // Precompute variable substitution once, outside the per-element loop.
    let var_key = format!("$${}", as_name);
    let temp_field = format!("__{}", as_name);
    let cond_replaced = replace_var_refs(cond_expr, &var_key, &format!("${}", temp_field));

    let mut result = Vec::new();
    for item in arr {
        let mut scoped_doc = doc.clone();
        scoped_doc.insert(temp_field.clone(), item.clone());
        let cond_val = evaluate_expression(&scoped_doc, &cond_replaced)?;
        if is_truthy(&cond_val) {
            result.push(item);
        }
    }
    Ok(Bson::Array(result))
}

fn expr_let(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let let_doc = match args.as_document() {
        Some(d) => d,
        None => return Ok(Bson::Null),
    };
    let vars = let_doc.get_document("vars").ok();
    let in_expr = let_doc.get("in").unwrap_or(&Bson::Null);

    let mut scoped_doc = doc.clone();
    let mut in_replaced = in_expr.clone();
    if let Some(vars) = vars {
        for (var_name, var_expr) in vars {
            let val = evaluate_expression(doc, var_expr)?;
            let temp_field = format!("__let_{}", var_name);
            scoped_doc.insert(temp_field.clone(), val);
            in_replaced = replace_var_refs(
                &in_replaced,
                &format!("$${}", var_name),
                &format!("${}", temp_field),
            );
        }
    }
    evaluate_expression(&scoped_doc, &in_replaced)
}

/// `{$meta: "vectorSearchScore"}` / `{$meta: "textScore"}` / etc.
///
/// Maps Atlas-style meta keywords to the hidden score fields that
/// `$vectorSearch` and `$geoNear` inject into each document.
fn expr_meta(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let keyword = match args.as_str() {
        Some(s) => s,
        None => return Ok(Bson::Null),
    };
    let field = match keyword {
        "vectorSearchScore" | "searchScore" => "_vectorScore",
        "textScore" => "_textScore",
        "geoNearDistance" | "indexKey" => "dist",
        _ => {
            return Err(AggregationError::InvalidOperator(format!(
                "Unknown $meta keyword: {}",
                keyword
            )))
        }
    };
    Ok(doc.get(field).cloned().unwrap_or(Bson::Null))
}

fn bson_to_chrono_utc(val: &Bson) -> Option<chrono::DateTime<Utc>> {
    match val {
        Bson::DateTime(dt) => {
            let millis = dt.timestamp_millis();
            Utc.timestamp_millis_opt(millis).single()
        }
        _ => None,
    }
}

fn expr_date_part<F>(doc: &Document, args: &Bson, extractor: F) -> AggregationResult<Bson>
where
    F: Fn(&chrono::DateTime<Utc>) -> i32,
{
    let val = evaluate_expression(doc, args)?;
    match bson_to_chrono_utc(&val) {
        Some(dt) => Ok(Bson::Int32(extractor(&dt))),
        None => Ok(Bson::Null),
    }
}

/// Simple variable reference substitution in expression trees.
fn replace_var_refs(expr: &Bson, from: &str, to: &str) -> Bson {
    match expr {
        Bson::String(s) if s == from => Bson::String(to.to_string()),
        Bson::String(s) if s.starts_with(&format!("{}.", from)) => {
            Bson::String(format!("{}.{}", to, &s[from.len() + 1..]))
        }
        Bson::Document(d) => {
            let mut new_doc = Document::new();
            for (k, v) in d {
                new_doc.insert(k.clone(), replace_var_refs(v, from, to));
            }
            Bson::Document(new_doc)
        }
        Bson::Array(arr) => {
            Bson::Array(arr.iter().map(|v| replace_var_refs(v, from, to)).collect())
        }
        other => other.clone(),
    }
}

pub(crate) fn bson_to_f64_pub(val: &Bson) -> Option<f64> {
    bson_to_f64(val)
}

fn expr_object_to_array(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match val {
        Bson::Document(d) => {
            let arr: Vec<Bson> = d
                .into_iter()
                .map(|(k, v)| Bson::Document(bson::doc! { "k": k, "v": v }))
                .collect();
            Ok(Bson::Array(arr))
        }
        Bson::Null => Ok(Bson::Null),
        _ => Ok(Bson::Null),
    }
}

fn expr_array_to_object(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match val {
        Bson::Array(arr) => {
            let mut result = Document::new();
            for item in arr {
                match item {
                    Bson::Document(d) => {
                        if let (Some(Bson::String(key)), Some(v)) = (d.get("k"), d.get("v")) {
                            result.insert(key.clone(), v.clone());
                        }
                    }
                    Bson::Array(pair) if pair.len() == 2 => {
                        if let Bson::String(key) = &pair[0] {
                            result.insert(key.clone(), pair[1].clone());
                        }
                    }
                    _ => {}
                }
            }
            Ok(Bson::Document(result))
        }
        Bson::Null => Ok(Bson::Null),
        _ => Ok(Bson::Null),
    }
}

fn expr_bson_size(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let val = evaluate_expression(doc, args)?;
    match val {
        Bson::Document(d) => {
            let raw = bson::to_vec(&d).unwrap_or_default();
            Ok(Bson::Int32(raw.len() as i32))
        }
        Bson::Null => Ok(Bson::Null),
        _ => Ok(Bson::Null),
    }
}

fn expr_concat_arrays(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let arrs = match args {
        Bson::Array(a) => a,
        _ => return Ok(Bson::Null),
    };
    let mut result = Vec::new();
    for item in arrs {
        match evaluate_expression(doc, item)? {
            Bson::Array(a) => result.extend(a),
            Bson::Null => return Ok(Bson::Null),
            _ => return Ok(Bson::Null),
        }
    }
    Ok(Bson::Array(result))
}

fn expr_reduce(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let spec = match args {
        Bson::Document(d) => d,
        _ => return Ok(Bson::Null),
    };
    let input = spec
        .get("input")
        .map(|v| evaluate_expression(doc, v))
        .transpose()?
        .unwrap_or(Bson::Null);
    let initial = spec
        .get("initialValue")
        .map(|v| evaluate_expression(doc, v))
        .transpose()?
        .unwrap_or(Bson::Null);
    let in_expr = match spec.get("in") {
        Some(expr) => expr,
        None => return Ok(initial),
    };

    let arr = match input {
        Bson::Array(a) => a,
        _ => return Ok(Bson::Null),
    };

    let mut accum = initial;
    for item in arr {
        let mut temp_doc = doc.clone();
        temp_doc.insert("__value__", accum.clone());
        temp_doc.insert("__this__", item);
        let replaced = replace_var_refs(in_expr, "$$value", "$__value__");
        let replaced = replace_var_refs(&replaced, "$$this", "$__this__");
        accum = evaluate_expression(&temp_doc, &replaced)?;
    }
    Ok(accum)
}

fn expr_slice(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    let params = match args {
        Bson::Array(a) => a,
        _ => return Ok(Bson::Null),
    };
    if params.len() < 2 {
        return Ok(Bson::Null);
    }
    let arr = match evaluate_expression(doc, &params[0])? {
        Bson::Array(a) => a,
        _ => return Ok(Bson::Null),
    };
    if params.len() == 2 {
        let n = bson_to_f64(&evaluate_expression(doc, &params[1])?)
            .map(|f| f as i64)
            .unwrap_or(0);
        if n >= 0 {
            Ok(Bson::Array(arr.into_iter().take(n as usize).collect()))
        } else {
            let skip = (arr.len() as i64 + n).max(0) as usize;
            Ok(Bson::Array(arr.into_iter().skip(skip).collect()))
        }
    } else {
        let pos = bson_to_f64(&evaluate_expression(doc, &params[1])?)
            .map(|f| f as i64)
            .unwrap_or(0);
        let n = bson_to_f64(&evaluate_expression(doc, &params[2])?)
            .map(|f| f as usize)
            .unwrap_or(0);
        let start = if pos >= 0 {
            pos as usize
        } else {
            (arr.len() as i64 + pos).max(0) as usize
        };
        Ok(Bson::Array(arr.into_iter().skip(start).take(n).collect()))
    }
}

fn expr_reverse_array(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    match evaluate_expression(doc, args)? {
        Bson::Array(mut a) => {
            a.reverse();
            Ok(Bson::Array(a))
        }
        Bson::Null => Ok(Bson::Null),
        _ => Ok(Bson::Null),
    }
}

fn expr_sum_expr(doc: &Document, args: &Bson) -> AggregationResult<Bson> {
    match args {
        Bson::Array(arr) => {
            let mut total = 0.0_f64;
            for item in arr {
                if let Some(n) = bson_to_f64(&evaluate_expression(doc, item)?) {
                    total += n;
                }
            }
            if total == (total as i64 as f64) {
                Ok(Bson::Int64(total as i64))
            } else {
                Ok(Bson::Double(total))
            }
        }
        _ => evaluate_expression(doc, args),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;

    #[test]
    fn test_field_ref() {
        let doc = doc! { "x": 42 };
        assert_eq!(
            evaluate_expression(&doc, &Bson::String("$x".into())).unwrap(),
            Bson::Int32(42)
        );
    }

    #[test]
    fn test_add() {
        let doc = doc! { "a": 10, "b": 20 };
        let expr = doc! { "$add": ["$a", "$b"] };
        assert_eq!(
            evaluate_expression(&doc, &Bson::Document(expr)).unwrap(),
            Bson::Int64(30)
        );
    }

    #[test]
    fn test_concat() {
        let doc = doc! { "first": "John", "last": "Doe" };
        let expr = doc! { "$concat": ["$first", " ", "$last"] };
        assert_eq!(
            evaluate_expression(&doc, &Bson::Document(expr)).unwrap(),
            Bson::String("John Doe".into())
        );
    }

    #[test]
    fn test_cond() {
        let d = doc! { "age": 20 };
        let expr =
            doc! { "$cond": { "if": { "$gte": ["$age", 18] }, "then": "adult", "else": "minor" } };
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(expr)).unwrap(),
            Bson::String("adult".into())
        );
    }

    #[test]
    fn test_if_null() {
        let d = doc! { "x": bson::Bson::Null };
        let expr = doc! { "$ifNull": ["$x", "default"] };
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(expr)).unwrap(),
            Bson::String("default".into())
        );
    }

    #[test]
    fn test_date_year() {
        let dt = bson::DateTime::from_millis(1704067200000); // 2024-01-01T00:00:00Z
        let d = doc! { "created": dt };
        let expr = doc! { "$year": "$created" };
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(expr)).unwrap(),
            Bson::Int32(2024)
        );
    }

    #[test]
    fn test_date_month() {
        let dt = bson::DateTime::from_millis(1711929600000); // 2024-04-01T00:00:00Z
        let d = doc! { "created": dt };
        let expr = doc! { "$month": "$created" };
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(expr)).unwrap(),
            Bson::Int32(4)
        );
    }

    #[test]
    fn test_date_day_of_month() {
        let dt = bson::DateTime::from_millis(1705363200000); // 2024-01-16T00:00:00Z
        let d = doc! { "created": dt };
        let expr = doc! { "$dayOfMonth": "$created" };
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(expr)).unwrap(),
            Bson::Int32(16)
        );
    }

    #[test]
    fn test_date_hour_minute_second() {
        let dt = bson::DateTime::from_millis(1704110523000); // 2024-01-01T12:02:03Z
        let d = doc! { "ts": dt };
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(doc! { "$hour": "$ts" })).unwrap(),
            Bson::Int32(12)
        );
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(doc! { "$minute": "$ts" })).unwrap(),
            Bson::Int32(2)
        );
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(doc! { "$second": "$ts" })).unwrap(),
            Bson::Int32(3)
        );
    }

    #[test]
    fn test_date_day_of_week() {
        // 2024-01-01 is a Monday -> MongoDB dayOfWeek: Monday = 2 (Sunday = 1)
        let dt = bson::DateTime::from_millis(1704067200000);
        let d = doc! { "ts": dt };
        let expr = doc! { "$dayOfWeek": "$ts" };
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(expr)).unwrap(),
            Bson::Int32(2)
        );
    }

    #[test]
    fn test_date_day_of_year() {
        // 2024-02-01 -> day 32 of the year
        let dt = bson::DateTime::from_millis(1706745600000);
        let d = doc! { "ts": dt };
        let expr = doc! { "$dayOfYear": "$ts" };
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(expr)).unwrap(),
            Bson::Int32(32)
        );
    }

    #[test]
    fn test_date_null_on_non_date() {
        let d = doc! { "x": 42 };
        let expr = doc! { "$year": "$x" };
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(expr)).unwrap(),
            Bson::Null
        );
    }

    #[test]
    fn test_date_null_on_missing_field() {
        let d = doc! {};
        let expr = doc! { "$month": "$missing" };
        assert_eq!(
            evaluate_expression(&d, &Bson::Document(expr)).unwrap(),
            Bson::Null
        );
    }

    #[test]
    fn test_meta_vector_search_score() {
        let d = doc! { "text": "hello", "_vectorScore": 0.95 };
        let expr = doc! { "$meta": "vectorSearchScore" };
        let result = evaluate_expression(&d, &Bson::Document(expr)).unwrap();
        assert_eq!(result, Bson::Double(0.95));
    }

    #[test]
    fn test_meta_missing_score_returns_null() {
        let d = doc! { "text": "hello" };
        let expr = doc! { "$meta": "vectorSearchScore" };
        let result = evaluate_expression(&d, &Bson::Document(expr)).unwrap();
        assert_eq!(result, Bson::Null);
    }

    #[test]
    fn test_unknown_expression_operator_errors() {
        let d = doc! { "x": 1 };
        let expr = doc! { "$bogus": "$x" };
        let result = evaluate_expression(&d, &Bson::Document(expr));
        assert!(result.is_err());
        let msg = format!("{}", result.unwrap_err());
        assert!(
            msg.contains("Unknown expression operator: $bogus"),
            "unexpected error message: {}",
            msg
        );
    }

    #[test]
    fn test_unknown_meta_keyword_errors() {
        let d = doc! { "x": 1 };
        let expr = doc! { "$meta": "unknownKeyword" };
        let result = evaluate_expression(&d, &Bson::Document(expr));
        assert!(result.is_err());
        let msg = format!("{}", result.unwrap_err());
        assert!(
            msg.contains("Unknown $meta keyword: unknownKeyword"),
            "unexpected error message: {}",
            msg
        );
    }
}
