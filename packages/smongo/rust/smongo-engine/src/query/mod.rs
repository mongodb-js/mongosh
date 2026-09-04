//! MongoDB query predicate evaluation for BSON documents.
//!
//! This module provides pure Rust evaluation of MongoDB query predicates against
//! `bson::Document` types, implementing MongoDB's query semantics including:
//! - Comparison operators ($gt, $lt, $gte, $lte, $eq, $ne)
//! - Set operators ($in, $nin)
//! - Logical operators ($and, $or, $nor, $not)
//! - Existence/type operators ($exists, $type)
//! - Regex operator ($regex)
//! - Array operators ($all, $elemMatch, $size)
//! - Expression operator ($expr)
//! - Text search operator ($text)

use crate::aggregation::expressions::{evaluate_expression, is_truthy};
use crate::geo::{
    extract_lon_lat, haversine_meters, GeoQueryShape, DEFAULT_NEAR_MAX_DISTANCE_M,
    EARTH_RADIUS_METERS,
};
use crate::paths;
use bson::{Bson, Document};

/// Cheap deterministic byte key for BSON values, used for set membership
/// tests (e.g. `$all`, `$in`).  Wraps in `{"": val}` to get a stable
/// canonical encoding from the bson crate.
#[inline]
fn canonical_bson_key(val: &Bson) -> Vec<u8> {
    bson::to_vec(&bson::doc! { "": val.clone() }).unwrap_or_default()
}

/// Evaluate a MongoDB query predicate against a document.
///
/// Returns `true` if the document matches the query, `false` otherwise.
///
/// # Examples
///
/// ```
/// use bson::doc;
/// use smongo_engine::query::eval_query;
///
/// let doc = doc! { "name": "Alice", "age": 30 };
/// let query = doc! { "age": { "$gt": 25 } };
/// assert!(eval_query(&doc, &query).unwrap());
/// ```
pub fn eval_query(doc: &Document, query: &Document) -> Result<bool, String> {
    // Process each condition in the query
    // MongoDB treats multiple top-level keys as an implicit $and
    for (key, condition) in query {
        match key.as_str() {
            "$or" => {
                if !eval_or(doc, condition)? {
                    return Ok(false);
                }
            }
            "$and" => {
                if !eval_and(doc, condition)? {
                    return Ok(false);
                }
            }
            "$nor" => {
                if !eval_nor(doc, condition)? {
                    return Ok(false);
                }
            }
            "$expr" => {
                if !eval_expr(doc, condition)? {
                    return Ok(false);
                }
            }
            "$text" => {
                if !eval_text(doc, condition)? {
                    return Ok(false);
                }
            }
            "$comment" => {
                continue;
            }
            _ => {
                if !eval_field_condition(doc, key, condition)? {
                    return Ok(false);
                }
            }
        }
    }

    Ok(true)
}

/// Evaluate $or operator: at least one sub-query must match
fn eval_or(doc: &Document, condition: &Bson) -> Result<bool, String> {
    let queries = as_array(condition)?;

    for query_bson in queries {
        if let Bson::Document(sub_query) = query_bson {
            if eval_query(doc, sub_query)? {
                return Ok(true);
            }
        } else {
            return Err("$or requires array of objects".to_string());
        }
    }

    Ok(false)
}

/// Evaluate $and operator: all sub-queries must match
fn eval_and(doc: &Document, condition: &Bson) -> Result<bool, String> {
    let queries = as_array(condition)?;

    for query_bson in queries {
        if let Bson::Document(sub_query) = query_bson {
            if !eval_query(doc, sub_query)? {
                return Ok(false);
            }
        } else {
            return Err("$and requires array of objects".to_string());
        }
    }

    Ok(true)
}

/// Evaluate $nor operator: none of the sub-queries must match
fn eval_nor(doc: &Document, condition: &Bson) -> Result<bool, String> {
    let queries = as_array(condition)?;

    for query_bson in queries {
        if let Bson::Document(sub_query) = query_bson {
            if eval_query(doc, sub_query)? {
                return Ok(false);
            }
        } else {
            return Err("$nor requires array of objects".to_string());
        }
    }

    Ok(true)
}

/// Evaluate a condition on a specific field
fn eval_field_condition(doc: &Document, key: &str, condition: &Bson) -> Result<bool, String> {
    // Get the field value using dot-notation
    let value = paths::get_value(doc, key);

    match condition {
        Bson::Document(cond_doc) => {
            if cond_doc.contains_key("$near") || cond_doc.contains_key("$nearSphere") {
                return eval_near_family(value, cond_doc);
            }
            if cond_doc.contains_key("$geoWithin") {
                return eval_geo_within(value, cond_doc);
            }
            if cond_doc.contains_key("$geoIntersects") {
                return eval_geo_intersects(value, cond_doc);
            }
            // Operator-based condition (e.g., {"age": {"$gt": 25}})
            for (op, cond_val) in cond_doc {
                if !eval_operator(doc, key, value, op, cond_val)? {
                    return Ok(false);
                }
            }
            Ok(true)
        }
        _ => {
            // Direct equality check (e.g., {"name": "Alice"})
            Ok(bson_eq(value, Some(condition)))
        }
    }
}

/// Evaluate a single operator on a field value
fn eval_operator(
    doc: &Document,
    key: &str,
    value: Option<&Bson>,
    op: &str,
    cond_val: &Bson,
) -> Result<bool, String> {
    match op {
        "$gt" => Ok(bson_gt(value, cond_val)),
        "$gte" => Ok(bson_gte(value, cond_val)),
        "$lt" => Ok(bson_lt(value, cond_val)),
        "$lte" => Ok(bson_lte(value, cond_val)),
        "$eq" => Ok(bson_eq(value, Some(cond_val))),
        "$ne" => Ok(!bson_eq(value, Some(cond_val))),
        "$in" => eval_in(value, cond_val),
        "$nin" => eval_nin(value, cond_val),
        "$exists" => eval_exists(doc, key, cond_val),
        "$type" => eval_type(value, cond_val),
        "$regex" => eval_regex(value, cond_val),
        "$not" => eval_not(doc, key, value, cond_val),
        "$all" => eval_all(value, cond_val),
        "$elemMatch" => eval_elem_match(value, cond_val),
        "$size" => eval_size(value, cond_val),
        "$mod" => eval_mod(value, cond_val),
        "$bitsAllSet" => eval_bits(value, cond_val, BitsMode::AllSet),
        "$bitsAnySet" => eval_bits(value, cond_val, BitsMode::AnySet),
        "$bitsAllClear" => eval_bits(value, cond_val, BitsMode::AllClear),
        "$bitsAnyClear" => eval_bits(value, cond_val, BitsMode::AnyClear),
        "$options" => Ok(true), // Handled with $regex
        "$near" | "$nearSphere" | "$geoWithin" | "$geoIntersects" => Ok(true), // Handled in eval_field_condition
        _ => Err(format!("Unknown operator: {}", op)),
    }
}

fn as_f64_bson(b: &Bson) -> Option<f64> {
    match b {
        Bson::Double(d) => Some(*d),
        Bson::Int32(i) => Some(*i as f64),
        Bson::Int64(i) => Some(*i as f64),
        _ => None,
    }
}

fn eval_near_family(value: Option<&Bson>, cond_doc: &Document) -> Result<bool, String> {
    let outer_max = cond_doc.get("$maxDistance").and_then(as_f64_bson);
    let outer_min = cond_doc.get("$minDistance").and_then(as_f64_bson);
    let nv = cond_doc
        .get("$near")
        .or_else(|| cond_doc.get("$nearSphere"))
        .ok_or_else(|| "$near requires $geometry or legacy [lon, lat]".to_string())?;

    let (clon, clat, max_m, min_m) = match nv {
        Bson::Array(arr) => {
            if arr.len() < 2 {
                return Err("legacy $near array must be [longitude, latitude]".to_string());
            }
            let lon = as_f64_bson(&arr[0]).ok_or("longitude must be numeric")?;
            let lat = as_f64_bson(&arr[1]).ok_or("latitude must be numeric")?;
            (lon, lat, outer_max, outer_min)
        }
        Bson::Document(spec) => {
            let max_d = spec.get("$maxDistance").and_then(as_f64_bson).or(outer_max);
            let min_d = spec.get("$minDistance").and_then(as_f64_bson).or(outer_min);
            let geom = spec
                .get("$geometry")
                .and_then(|b| b.as_document())
                .ok_or_else(|| "$near requires $geometry".to_string())?;
            if geom.get_str("type").map_err(|e| e.to_string())? != "Point" {
                return Err("only GeoJSON Point is supported for $near".to_string());
            }
            let coords = geom
                .get("coordinates")
                .ok_or("$geometry requires coordinates")?;
            let (lon, lat) = parse_point_coords_near(coords)?;
            (lon, lat, max_d, min_d)
        }
        _ => return Err("$near must be array or document".to_string()),
    };

    let max_m = max_m.or(Some(DEFAULT_NEAR_MAX_DISTANCE_M));
    let Some((dlon, dlat)) = extract_lon_lat(value) else {
        return Ok(false);
    };
    let dist = haversine_meters(clon, clat, dlon, dlat);
    if let Some(m) = max_m {
        if dist > m {
            return Ok(false);
        }
    }
    if let Some(m) = min_m {
        if dist < m {
            return Ok(false);
        }
    }
    Ok(true)
}

fn parse_point_coords_near(coords: &Bson) -> Result<(f64, f64), String> {
    let Bson::Array(cl) = coords else {
        return Err("Point coordinates must be array".to_string());
    };
    if cl.len() < 2 {
        return Err("Point coordinates need [lon, lat]".to_string());
    }
    let lon = as_f64_bson(&cl[0]).ok_or("lon must be numeric")?;
    let lat = as_f64_bson(&cl[1]).ok_or("lat must be numeric")?;
    Ok((lon, lat))
}

fn eval_geo_within(value: Option<&Bson>, cond_doc: &Document) -> Result<bool, String> {
    let inner = cond_doc
        .get("$geoWithin")
        .and_then(|b| b.as_document())
        .ok_or_else(|| "$geoWithin requires object".to_string())?;

    if let Some(cs) = inner.get("$centerSphere") {
        let Bson::Array(a) = cs else {
            return Err("$centerSphere must be array".to_string());
        };
        if a.len() < 2 {
            return Err("$centerSphere must be [ [lon, lat], radiusRadians ]".to_string());
        }
        let Bson::Array(c) = &a[0] else {
            return Err("$centerSphere center must be [lon, lat]".to_string());
        };
        if c.len() < 2 {
            return Err("$centerSphere center must be [lon, lat]".to_string());
        }
        let clon = as_f64_bson(&c[0]).ok_or("longitude must be numeric")?;
        let clat = as_f64_bson(&c[1]).ok_or("latitude must be numeric")?;
        let rrad = as_f64_bson(&a[1]).ok_or("radius must be numeric")?;
        if rrad < 0.0 {
            return Err("$centerSphere radius must be >= 0".to_string());
        }
        let max_m = rrad * EARTH_RADIUS_METERS;
        let Some((dlon, dlat)) = extract_lon_lat(value) else {
            return Ok(false);
        };
        let dist = haversine_meters(clon, clat, dlon, dlat);
        return Ok(dist <= max_m);
    }

    let g = inner
        .get("$geometry")
        .and_then(|b| b.as_document())
        .ok_or_else(|| "$geoWithin requires $centerSphere or $geometry".to_string())?;
    let shape = GeoQueryShape::from_geometry_doc(g)?;
    let Some((dlon, dlat)) = extract_lon_lat(value) else {
        return Ok(false);
    };
    Ok(shape.contains_point_lonlat(dlon, dlat))
}

fn eval_geo_intersects(value: Option<&Bson>, cond_doc: &Document) -> Result<bool, String> {
    let inner = cond_doc
        .get("$geoIntersects")
        .and_then(|b| b.as_document())
        .ok_or_else(|| "$geoIntersects requires object".to_string())?;
    let g = inner
        .get("$geometry")
        .and_then(|b| b.as_document())
        .ok_or_else(|| "$geoIntersects requires $geometry".to_string())?;
    let shape = GeoQueryShape::from_geometry_doc(g)?;
    let Some((dlon, dlat)) = extract_lon_lat(value) else {
        return Ok(false);
    };
    Ok(shape.intersects_point_lonlat(dlon, dlat))
}

// Helper to extract array from Bson
fn as_array(bson: &Bson) -> Result<&Vec<Bson>, String> {
    match bson {
        Bson::Array(arr) => Ok(arr),
        _ => Err("Expected array".to_string()),
    }
}

// BSON type ordering (MongoDB comparison semantics)
// MinKey < Null < Numbers < String < Object < Array < Binary < ObjectId < Boolean < Date < Timestamp < Regex < MaxKey
fn bson_type_order(bson: &Bson) -> i32 {
    match bson {
        Bson::Null | Bson::Undefined => 0,
        Bson::Int32(_) | Bson::Int64(_) | Bson::Double(_) | Bson::Decimal128(_) => 1,
        Bson::String(_) | Bson::Symbol(_) => 2,
        Bson::Document(_) => 3,
        Bson::Array(_) => 4,
        Bson::Binary(_) => 5,
        Bson::ObjectId(_) => 6,
        Bson::Boolean(_) => 7,
        Bson::DateTime(_) => 8,
        Bson::Timestamp(_) => 9,
        Bson::RegularExpression(_) => 10,
        Bson::JavaScriptCode(_) | Bson::JavaScriptCodeWithScope(_) => 11,
        Bson::DbPointer(_) => 12,
        Bson::MaxKey => 127,
        Bson::MinKey => -128,
    }
}

// Compare two Bson values with MongoDB semantics
fn bson_cmp(a: &Bson, b: &Bson) -> std::cmp::Ordering {
    use std::cmp::Ordering;

    // First compare by type
    let type_order = bson_type_order(a).cmp(&bson_type_order(b));
    if type_order != Ordering::Equal {
        return type_order;
    }

    // Same type, compare values
    match (a, b) {
        (Bson::Null, Bson::Null) => Ordering::Equal,
        (Bson::Int32(a), Bson::Int32(b)) => a.cmp(b),
        (Bson::Int64(a), Bson::Int64(b)) => a.cmp(b),
        (Bson::Double(a), Bson::Double(b)) => a.partial_cmp(b).unwrap_or(Ordering::Equal),
        // Cross-number comparisons
        (Bson::Int32(a), Bson::Int64(b)) => (*a as i64).cmp(b),
        (Bson::Int64(a), Bson::Int32(b)) => a.cmp(&(*b as i64)),
        (Bson::Int32(a), Bson::Double(b)) => (*a as f64).partial_cmp(b).unwrap_or(Ordering::Equal),
        (Bson::Double(a), Bson::Int32(b)) => a.partial_cmp(&(*b as f64)).unwrap_or(Ordering::Equal),
        (Bson::Int64(a), Bson::Double(b)) => (*a as f64).partial_cmp(b).unwrap_or(Ordering::Equal),
        (Bson::Double(a), Bson::Int64(b)) => a.partial_cmp(&(*b as f64)).unwrap_or(Ordering::Equal),
        (Bson::String(a), Bson::String(b)) => a.cmp(b),
        (Bson::Boolean(a), Bson::Boolean(b)) => a.cmp(b),
        (Bson::DateTime(a), Bson::DateTime(b)) => a.cmp(b),
        (Bson::ObjectId(a), Bson::ObjectId(b)) => a.cmp(b),
        (Bson::Array(a), Bson::Array(b)) => {
            for (a_item, b_item) in a.iter().zip(b.iter()) {
                let cmp = bson_cmp(a_item, b_item);
                if cmp != Ordering::Equal {
                    return cmp;
                }
            }
            a.len().cmp(&b.len())
        }
        _ => Ordering::Equal, // Other types consider equal if same type
    }
}

fn bson_eq(a: Option<&Bson>, b: Option<&Bson>) -> bool {
    match (a, b) {
        (Some(a), Some(b)) => bson_cmp(a, b) == std::cmp::Ordering::Equal,
        (None, None) => true,
        _ => false,
    }
}

fn bson_gt(a: Option<&Bson>, b: &Bson) -> bool {
    match a {
        Some(a) => bson_cmp(a, b) == std::cmp::Ordering::Greater,
        None => false, // null is never greater than anything
    }
}

fn bson_gte(a: Option<&Bson>, b: &Bson) -> bool {
    match a {
        Some(a) => {
            let cmp = bson_cmp(a, b);
            cmp == std::cmp::Ordering::Greater || cmp == std::cmp::Ordering::Equal
        }
        None => false,
    }
}

fn bson_lt(a: Option<&Bson>, b: &Bson) -> bool {
    match a {
        Some(a) => bson_cmp(a, b) == std::cmp::Ordering::Less,
        None => false, // null is never less than anything (in MongoDB, it's treated specially)
    }
}

fn bson_lte(a: Option<&Bson>, b: &Bson) -> bool {
    match a {
        Some(a) => {
            let cmp = bson_cmp(a, b);
            cmp == std::cmp::Ordering::Less || cmp == std::cmp::Ordering::Equal
        }
        None => false,
    }
}

// Operator implementations

fn eval_in(value: Option<&Bson>, cond_val: &Bson) -> Result<bool, String> {
    let arr = as_array(cond_val)?;

    // Pre-sort the condition array for O(log m) binary search per probe
    // instead of O(m) linear scan.
    let mut sorted: Vec<&Bson> = arr.iter().collect();
    sorted.sort_by(|a, b| bson_cmp(a, b));

    let contains = |val: &Bson| -> bool {
        sorted
            .binary_search_by(|probe| bson_cmp(probe, val))
            .is_ok()
    };

    match value {
        Some(Bson::Array(val_arr)) => Ok(val_arr.iter().any(&contains)),
        Some(val) => Ok(contains(val)),
        None => Ok(false),
    }
}

fn eval_nin(value: Option<&Bson>, cond_val: &Bson) -> Result<bool, String> {
    Ok(!eval_in(value, cond_val)?)
}

fn eval_exists(doc: &Document, key: &str, cond_val: &Bson) -> Result<bool, String> {
    let present = paths::field_exists(doc, key);
    let want = match cond_val {
        Bson::Boolean(b) => *b,
        _ => true, // Truthy value
    };
    Ok(if want { present } else { !present })
}

fn eval_type(value: Option<&Bson>, cond_val: &Bson) -> Result<bool, String> {
    let value = match value {
        Some(v) => v,
        None => return Ok(false),
    };

    // $type can be number or string
    let type_name = match cond_val {
        Bson::Int32(n) => bson_type_number_to_name(*n),
        Bson::Int64(n) => bson_type_number_to_name(*n as i32),
        Bson::String(s) => Some(s.as_str()),
        _ => None,
    };

    let Some(type_name) = type_name else {
        return Ok(false);
    };

    Ok(bson_type_matches(value, type_name))
}

fn bson_type_number_to_name(n: i32) -> Option<&'static str> {
    match n {
        1 => Some("double"),
        2 => Some("string"),
        3 => Some("object"),
        4 => Some("array"),
        5 => Some("binData"),
        7 => Some("objectId"),
        8 => Some("bool"),
        9 => Some("date"),
        10 => Some("null"),
        11 => Some("regex"),
        16 => Some("int"),
        18 => Some("long"),
        19 => Some("decimal"),
        _ => None,
    }
}

fn bson_type_matches(value: &Bson, type_name: &str) -> bool {
    matches!(
        (value, type_name),
        (Bson::Double(_), "double")
            | (Bson::Double(_), "number")
            | (Bson::String(_), "string")
            | (Bson::Document(_), "object")
            | (Bson::Array(_), "array")
            | (Bson::Binary(_), "binData")
            | (Bson::ObjectId(_), "objectId")
            | (Bson::Boolean(_), "bool")
            | (Bson::DateTime(_), "date")
            | (Bson::Null, "null")
            | (Bson::RegularExpression(_), "regex")
            | (Bson::Int32(_), "int")
            | (Bson::Int32(_), "number")
            | (Bson::Int64(_), "long")
            | (Bson::Int64(_), "number")
            | (Bson::Decimal128(_), "decimal")
            | (Bson::Decimal128(_), "number")
    )
}

fn eval_regex(value: Option<&Bson>, cond_val: &Bson) -> Result<bool, String> {
    use std::cell::RefCell;
    use std::collections::HashMap;

    thread_local! {
        static CACHE: RefCell<HashMap<String, regex::Regex>> = RefCell::new(HashMap::new());
    }

    let value_str = match value {
        Some(Bson::String(s)) => s,
        _ => return Ok(false),
    };

    let pattern = match cond_val {
        Bson::String(s) => s,
        Bson::RegularExpression(re) => &re.pattern,
        _ => return Err("$regex requires string pattern".to_string()),
    };

    CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        let re = match cache.get(pattern) {
            Some(re) => re,
            None => {
                let compiled = regex::Regex::new(pattern)
                    .map_err(|e| format!("invalid regex pattern '{}': {}", pattern, e))?;
                cache.insert(pattern.to_string(), compiled);
                // SAFETY: we just inserted this key on the line above.
                #[allow(clippy::unwrap_used)]
                cache.get(pattern).unwrap()
            }
        };
        Ok(re.is_match(value_str))
    })
}

fn eval_not(
    doc: &Document,
    key: &str,
    value: Option<&Bson>,
    cond_val: &Bson,
) -> Result<bool, String> {
    match cond_val {
        Bson::Document(cond_doc) => {
            // $not: {$gt: 5} means NOT (value > 5)
            for (op, op_val) in cond_doc {
                if eval_operator(doc, key, value, op, op_val)? {
                    return Ok(false);
                }
            }
            Ok(true)
        }
        _ => Ok(false),
    }
}

fn eval_all(value: Option<&Bson>, cond_val: &Bson) -> Result<bool, String> {
    let val_arr = match value {
        Some(Bson::Array(arr)) => arr,
        _ => return Ok(false),
    };

    let cond_arr = as_array(cond_val)?;

    // Build a set of canonical keys for O(1) membership tests instead
    // of O(|val_arr|) per condition element.
    let val_keys: std::collections::HashSet<Vec<u8>> =
        val_arr.iter().map(canonical_bson_key).collect();

    for cond_item in cond_arr {
        if !val_keys.contains(&canonical_bson_key(cond_item)) {
            return Ok(false);
        }
    }

    Ok(true)
}

fn eval_elem_match(value: Option<&Bson>, cond_val: &Bson) -> Result<bool, String> {
    let val_arr = match value {
        Some(Bson::Array(arr)) => arr,
        _ => return Ok(false),
    };

    let query = match cond_val {
        Bson::Document(doc) => doc,
        _ => return Err("$elemMatch requires object".to_string()),
    };

    // Check if any array element matches the query
    for item in val_arr {
        if let Bson::Document(item_doc) = item {
            if eval_query(item_doc, query)? {
                return Ok(true);
            }
        }
    }

    Ok(false)
}

fn eval_size(value: Option<&Bson>, cond_val: &Bson) -> Result<bool, String> {
    let val_arr = match value {
        Some(Bson::Array(arr)) => arr,
        _ => return Ok(false),
    };

    let expected_size = match cond_val {
        Bson::Int32(n) => *n as usize,
        Bson::Int64(n) => *n as usize,
        _ => return Err("$size requires number".to_string()),
    };

    Ok(val_arr.len() == expected_size)
}

fn eval_mod(value: Option<&Bson>, cond_val: &Bson) -> Result<bool, String> {
    let arr = match cond_val {
        Bson::Array(a) if a.len() == 2 => a,
        _ => return Err("$mod requires a 2-element array [divisor, remainder]".to_string()),
    };

    let divisor = match &arr[0] {
        Bson::Int32(n) => *n as i64,
        Bson::Int64(n) => *n,
        Bson::Double(n) => *n as i64,
        _ => return Err("$mod divisor must be numeric".to_string()),
    };

    if divisor == 0 {
        return Err("$mod divisor cannot be zero".to_string());
    }

    let remainder = match &arr[1] {
        Bson::Int32(n) => *n as i64,
        Bson::Int64(n) => *n,
        Bson::Double(n) => *n as i64,
        _ => return Err("$mod remainder must be numeric".to_string()),
    };

    let field_val = match value {
        Some(Bson::Int32(n)) => *n as i64,
        Some(Bson::Int64(n)) => *n,
        Some(Bson::Double(n)) => *n as i64,
        _ => return Ok(false),
    };

    Ok(field_val % divisor == remainder)
}

enum BitsMode {
    AllSet,
    AnySet,
    AllClear,
    AnyClear,
}

fn eval_bits(value: Option<&Bson>, cond_val: &Bson, mode: BitsMode) -> Result<bool, String> {
    let field_val = match value {
        Some(Bson::Int32(n)) => *n as i64,
        Some(Bson::Int64(n)) => *n,
        Some(Bson::Double(n)) => *n as i64,
        _ => return Ok(false),
    };

    let mask: i64 = match cond_val {
        Bson::Int32(m) => *m as i64,
        Bson::Int64(m) => *m,
        Bson::Double(m) => *m as i64,
        Bson::Array(positions) => {
            let mut m: i64 = 0;
            for pos in positions {
                let p = match pos {
                    Bson::Int32(n) => *n as i64,
                    Bson::Int64(n) => *n,
                    _ => return Err("$bits position must be a non-negative integer".to_string()),
                };
                if !(0..=63).contains(&p) {
                    return Err(format!("$bits position out of range: {}", p));
                }
                m |= 1i64 << p;
            }
            m
        }
        _ => return Err("$bits requires a numeric bitmask or array of bit positions".to_string()),
    };

    match mode {
        BitsMode::AllSet => Ok((field_val & mask) == mask),
        BitsMode::AnySet => Ok((field_val & mask) != 0),
        BitsMode::AllClear => Ok((field_val & mask) == 0),
        BitsMode::AnyClear => Ok((field_val & mask) != mask),
    }
}

/// Evaluate `$expr`: run an aggregation expression and treat the result as a boolean.
fn eval_expr(doc: &Document, condition: &Bson) -> Result<bool, String> {
    let result = evaluate_expression(doc, condition).map_err(|e| e.to_string())?;
    Ok(is_truthy(&result))
}

/// Evaluate `$text`: tokenize the search string and check that every token
/// appears as a case-insensitive substring of the document's concatenated
/// string values. This mirrors smongo-py's `text_match` behaviour and works
/// without a dedicated text index.
fn eval_text(doc: &Document, condition: &Bson) -> Result<bool, String> {
    let search_str = match condition {
        Bson::Document(d) => match d.get("$search") {
            Some(Bson::String(s)) => s.clone(),
            Some(_) => return Err("$text.$search must be a string".to_string()),
            None => return Err("$text requires $search".to_string()),
        },
        Bson::String(s) => s.clone(),
        _ => return Err("$text requires a document with $search".to_string()),
    };

    let tokens: Vec<String> = search_str
        .to_lowercase()
        .split_whitespace()
        .map(String::from)
        .collect();

    if tokens.is_empty() {
        return Ok(true);
    }

    let all_text = extract_all_strings(doc);
    Ok(tokens.iter().all(|t| all_text.contains(t.as_str())))
}

/// Recursively collect every string value from a document (including nested
/// documents and arrays), join with spaces, and lowercase the result.
fn extract_all_strings(doc: &Document) -> String {
    let mut buf = Vec::new();
    for (_, v) in doc {
        collect_strings(v, &mut buf);
    }
    buf.join(" ").to_lowercase()
}

fn collect_strings(val: &Bson, out: &mut Vec<String>) {
    match val {
        Bson::String(s) => out.push(s.clone()),
        Bson::Document(d) => {
            for (_, v) in d {
                collect_strings(v, out);
            }
        }
        Bson::Array(arr) => {
            for v in arr {
                collect_strings(v, out);
            }
        }
        _ => {}
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;
    use bson::doc;

    #[test]
    fn test_eval_query_empty() {
        let doc = doc! { "name": "Alice" };
        let query = doc! {};
        assert!(eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_eval_query_simple_equality() {
        let doc = doc! { "name": "Alice", "age": 30 };
        let query = doc! { "name": "Alice" };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "name": "Bob" };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_eval_query_implicit_and() {
        let doc = doc! { "name": "Alice", "age": 30 };
        let query = doc! { "name": "Alice", "age": 30 };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "name": "Alice", "age": 25 };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    // Comparison operators
    #[test]
    fn test_comparison_operators() {
        let doc = doc! { "age": 30 };

        assert!(eval_query(&doc, &doc! { "age": { "$gt": 25 } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "age": { "$gt": 30 } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "age": { "$gt": 35 } }).unwrap());

        assert!(eval_query(&doc, &doc! { "age": { "$gte": 30 } }).unwrap());
        assert!(eval_query(&doc, &doc! { "age": { "$gte": 25 } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "age": { "$gte": 35 } }).unwrap());

        assert!(eval_query(&doc, &doc! { "age": { "$lt": 35 } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "age": { "$lt": 30 } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "age": { "$lt": 25 } }).unwrap());

        assert!(eval_query(&doc, &doc! { "age": { "$lte": 30 } }).unwrap());
        assert!(eval_query(&doc, &doc! { "age": { "$lte": 35 } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "age": { "$lte": 25 } }).unwrap());

        assert!(eval_query(&doc, &doc! { "age": { "$eq": 30 } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "age": { "$eq": 25 } }).unwrap());

        assert!(eval_query(&doc, &doc! { "age": { "$ne": 25 } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "age": { "$ne": 30 } }).unwrap());
    }

    // Logical operators
    #[test]
    fn test_logical_operators() {
        let doc = doc! { "name": "Alice", "age": 30 };

        // $or
        let query = doc! { "$or": [{ "name": "Bob" }, { "age": 30 }] };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "$or": [{ "name": "Bob" }, { "age": 25 }] };
        assert!(!eval_query(&doc, &query).unwrap());

        // $and
        let query = doc! { "$and": [{ "name": "Alice" }, { "age": 30 }] };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "$and": [{ "name": "Alice" }, { "age": 25 }] };
        assert!(!eval_query(&doc, &query).unwrap());

        // $nor
        let query = doc! { "$nor": [{ "name": "Bob" }, { "age": 25 }] };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "$nor": [{ "name": "Alice" }, { "age": 25 }] };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    // Set operators
    #[test]
    fn test_in_operator() {
        let doc = doc! { "status": "active" };

        let query = doc! { "status": { "$in": ["active", "pending"] } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "status": { "$in": ["inactive", "pending"] } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_nin_operator() {
        let doc = doc! { "status": "active" };

        let query = doc! { "status": { "$nin": ["inactive", "pending"] } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "status": { "$nin": ["active", "pending"] } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    // Existence operator
    #[test]
    fn test_exists_operator() {
        let doc = doc! { "name": "Alice", "age": 30 };

        let query = doc! { "name": { "$exists": true } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "email": { "$exists": true } };
        assert!(!eval_query(&doc, &query).unwrap());

        let query = doc! { "email": { "$exists": false } };
        assert!(eval_query(&doc, &query).unwrap());
    }

    // Type operator
    #[test]
    fn test_type_operator() {
        let doc = doc! { "name": "Alice", "age": 30, "active": true };

        let query = doc! { "name": { "$type": "string" } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "age": { "$type": "int" } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "active": { "$type": "bool" } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "name": { "$type": "int" } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    // Regex operator
    #[test]
    fn test_regex_operator() {
        let doc = doc! { "name": "Alice" };

        let query = doc! { "name": { "$regex": "^A" } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "name": { "$regex": "ice$" } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "name": { "$regex": "^B" } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    // Array operators
    #[test]
    fn test_all_operator() {
        let doc = doc! { "tags": ["red", "blue", "green"] };

        let query = doc! { "tags": { "$all": ["red", "blue"] } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "tags": { "$all": ["red", "yellow"] } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_elem_match_operator() {
        let doc = doc! {
            "items": [
                { "name": "apple", "qty": 5 },
                { "name": "banana", "qty": 10 }
            ]
        };

        let query = doc! { "items": { "$elemMatch": { "name": "apple", "qty": 5 } } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "items": { "$elemMatch": { "name": "apple", "qty": 10 } } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_size_operator() {
        let doc = doc! { "tags": ["red", "blue", "green"] };

        let query = doc! { "tags": { "$size": 3 } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "tags": { "$size": 2 } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    // $not operator
    #[test]
    fn test_not_operator() {
        let doc = doc! { "age": 30 };

        let query = doc! { "age": { "$not": { "$gt": 35 } } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "age": { "$not": { "$gt": 25 } } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    // Nested field queries
    #[test]
    fn test_nested_field_query() {
        let doc = doc! { "user": { "name": "Alice", "age": 30 } };

        let query = doc! { "user.name": "Alice" };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "user.age": { "$gt": 25 } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "user.email": { "$exists": false } };
        assert!(eval_query(&doc, &query).unwrap());
    }

    // $expr operator
    #[test]
    fn test_expr_field_comparison() {
        let doc = doc! { "a": 10, "b": 5 };
        let query = doc! { "$expr": { "$gt": ["$a", "$b"] } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "$expr": { "$lt": ["$a", "$b"] } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_expr_arithmetic() {
        let doc = doc! { "x": 3, "y": 7 };
        let query = doc! { "$expr": { "$eq": [{ "$add": ["$x", "$y"] }, 10] } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "$expr": { "$eq": [{ "$add": ["$x", "$y"] }, 11] } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_expr_truthy_field_ref() {
        let doc = doc! { "active": true };
        let query = doc! { "$expr": "$active" };
        assert!(eval_query(&doc, &query).unwrap());

        let doc = doc! { "active": false };
        assert!(!eval_query(&doc, &query).unwrap());

        let doc = doc! { "count": 0 };
        let query = doc! { "$expr": "$count" };
        assert!(!eval_query(&doc, &query).unwrap());

        let doc = doc! { "count": 42 };
        assert!(eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_expr_combined_with_field_filter() {
        let doc = doc! { "status": "active", "sold": 100, "restocked": 50 };
        let query = doc! { "status": "active", "$expr": { "$gt": ["$sold", "$restocked"] } };
        assert!(eval_query(&doc, &query).unwrap());

        let doc = doc! { "status": "inactive", "sold": 100, "restocked": 50 };
        assert!(!eval_query(&doc, &query).unwrap());

        let doc = doc! { "status": "active", "sold": 10, "restocked": 50 };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_expr_nested_cond() {
        let doc = doc! { "age": 25 };
        let query = doc! { "$expr": { "$cond": [{ "$gt": ["$age", 18] }, true, false] } };
        assert!(eval_query(&doc, &query).unwrap());

        let doc = doc! { "age": 10 };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    // $text operator
    #[test]
    fn test_text_single_token() {
        let doc = doc! { "title": "MongoDB is great" };
        let query = doc! { "$text": { "$search": "mongodb" } };
        assert!(eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_text_multi_token() {
        let doc = doc! { "title": "MongoDB is great" };
        let query = doc! { "$text": { "$search": "mongodb great" } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "$text": { "$search": "mongodb terrible" } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_text_case_insensitive() {
        let doc = doc! { "title": "Hello World" };
        let query = doc! { "$text": { "$search": "HELLO" } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "$text": { "$search": "hello world" } };
        assert!(eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_text_nested_strings() {
        let doc = doc! { "meta": { "author": "Alice", "tags": ["rust", "database"] } };
        let query = doc! { "$text": { "$search": "alice rust" } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "$text": { "$search": "alice python" } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_text_no_match() {
        let doc = doc! { "title": "MongoDB is great" };
        let query = doc! { "$text": { "$search": "postgres" } };
        assert!(!eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_text_empty_search() {
        let doc = doc! { "title": "anything" };
        let query = doc! { "$text": { "$search": "" } };
        assert!(eval_query(&doc, &query).unwrap());

        let query = doc! { "$text": { "$search": "   " } };
        assert!(eval_query(&doc, &query).unwrap());
    }

    #[test]
    fn test_mod_basic() {
        let doc = doc! { "qty": 10 };
        assert!(eval_query(&doc, &doc! { "qty": { "$mod": [3, 1] } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "qty": { "$mod": [3, 0] } }).unwrap());
    }

    #[test]
    fn test_mod_with_i64() {
        let doc = doc! { "qty": 100_i64 };
        assert!(eval_query(&doc, &doc! { "qty": { "$mod": [7, 2] } }).unwrap());
    }

    #[test]
    fn test_mod_missing_field() {
        let doc = doc! { "name": "Alice" };
        assert!(!eval_query(&doc, &doc! { "qty": { "$mod": [3, 1] } }).unwrap());
    }

    #[test]
    fn test_mod_zero_divisor() {
        let doc = doc! { "qty": 10 };
        assert!(eval_query(&doc, &doc! { "qty": { "$mod": [0, 0] } }).is_err());
    }

    #[test]
    fn test_mod_with_not() {
        let doc = doc! { "qty": 10 };
        assert!(
            eval_query(&doc, &doc! { "qty": { "$not": { "$mod": [5, 0] } } }).unwrap() == false
        );
        assert!(eval_query(&doc, &doc! { "qty": { "$not": { "$mod": [3, 0] } } }).unwrap() == true);
    }

    #[test]
    fn test_bits_all_set() {
        let doc = doc! { "flags": 0b1010_1010_i32 };
        assert!(eval_query(&doc, &doc! { "flags": { "$bitsAllSet": 0b0000_1010_i32 } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "flags": { "$bitsAllSet": 0b0000_0101_i32 } }).unwrap());
    }

    #[test]
    fn test_bits_any_set() {
        let doc = doc! { "flags": 0b1010_0000_i32 };
        assert!(eval_query(&doc, &doc! { "flags": { "$bitsAnySet": 0b1000_0001_i32 } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "flags": { "$bitsAnySet": 0b0000_0101_i32 } }).unwrap());
    }

    #[test]
    fn test_bits_all_clear() {
        let doc = doc! { "flags": 0b1010_0000_i32 };
        assert!(eval_query(
            &doc,
            &doc! { "flags": { "$bitsAllClear": 0b0000_0101_i32 } }
        )
        .unwrap());
        assert!(!eval_query(
            &doc,
            &doc! { "flags": { "$bitsAllClear": 0b1000_0001_i32 } }
        )
        .unwrap());
    }

    #[test]
    fn test_bits_any_clear() {
        let doc = doc! { "flags": 0b1010_0000_i32 };
        assert!(eval_query(
            &doc,
            &doc! { "flags": { "$bitsAnyClear": 0b1010_0001_i32 } }
        )
        .unwrap());
        assert!(!eval_query(
            &doc,
            &doc! { "flags": { "$bitsAnyClear": 0b1010_0000_i32 } }
        )
        .unwrap());
    }

    #[test]
    fn test_bits_with_position_array() {
        let doc = doc! { "flags": 0b0000_1010_i32 };
        assert!(eval_query(&doc, &doc! { "flags": { "$bitsAllSet": [1, 3] } }).unwrap());
        assert!(!eval_query(&doc, &doc! { "flags": { "$bitsAllSet": [0, 1] } }).unwrap());
    }

    #[test]
    fn test_bits_with_i64_value() {
        let doc = doc! { "flags": 0xFF_i64 };
        assert!(eval_query(&doc, &doc! { "flags": { "$bitsAllSet": 0x0F_i64 } }).unwrap());
        assert!(eval_query(&doc, &doc! { "flags": { "$bitsAllClear": 0x100_i64 } }).unwrap());
    }

    #[test]
    fn test_bits_missing_field_returns_false() {
        let doc = doc! { "name": "Alice" };
        assert!(!eval_query(&doc, &doc! { "flags": { "$bitsAllSet": 1 } }).unwrap());
    }

    #[test]
    fn test_bits_non_numeric_field_returns_false() {
        let doc = doc! { "flags": "not_a_number" };
        assert!(!eval_query(&doc, &doc! { "flags": { "$bitsAnySet": 1 } }).unwrap());
    }
}
