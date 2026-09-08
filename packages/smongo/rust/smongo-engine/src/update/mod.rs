//! MongoDB update operations for pure Rust BSON documents.
//!
//! This module implements MongoDB's update operators, allowing modification
//! of documents using the standard MongoDB update syntax.
//!
//! # Supported Operators
//!
//! - **Field operators**: `$set`, `$unset`
//! - **Numeric operators**: `$inc`, `$mul`, `$min`, `$max`
//! - **Array operators**: `$push`, `$pull`, `$pop`, `$addToSet`
//! - **Other operators**: `$rename`, `$currentDate`
//!
//! # Example
//!
//! ```
//! use bson::{doc, Document};
//! use smongo_engine::update::apply_update;
//!
//! let mut doc = doc! { "name": "Alice", "age": 30 };
//! let update = doc! { "$set": { "age": 31 }, "$inc": { "score": 10 } };
//! apply_update(&mut doc, &update).unwrap();
//! ```

use crate::paths::{get_value, set_value, unset_value};
use bson::{Bson, Document};

/// Apply a MongoDB update specification to a document.
///
/// The update document should contain MongoDB update operators as top-level keys.
/// Each operator key (starting with `$`) maps to a document specifying which fields
/// to update and how.
///
/// # Arguments
///
/// * `doc` - The document to update (modified in place)
/// * `update` - The update specification containing operators
///
/// # Returns
///
/// `Ok(())` if the update was successful, or an error message if validation fails.
///
/// # Example
///
/// ```
/// use bson::{doc, Document};
/// use smongo_engine::update::apply_update;
///
/// let mut doc = doc! { "name": "Alice", "age": 30 };
/// let update = doc! { "$set": { "age": 31 } };
/// apply_update(&mut doc, &update).unwrap();
/// assert_eq!(doc.get_i32("age").unwrap(), 31);
/// ```
pub fn apply_update(doc: &mut Document, update: &Document) -> Result<(), String> {
    apply_update_impl(doc, update, false, &[])
}

/// Like `apply_update`, but when `is_upsert_insert` is true the `$setOnInsert`
/// operator is also applied (it is skipped for normal updates).
pub fn apply_update_for_upsert(doc: &mut Document, update: &Document) -> Result<(), String> {
    apply_update_impl(doc, update, true, &[])
}

/// Apply a MongoDB update with `arrayFilters` support for positional `$[]` and
/// `$[<identifier>]` operators in field paths.
///
/// Each element of `array_filters` is a filter document whose top-level keys
/// are prefixed with the identifier name (e.g. `{"elem.status": "active"}`
/// matches the `$[elem]` positional).
pub fn apply_update_with_array_filters(
    doc: &mut Document,
    update: &Document,
    array_filters: &[Document],
) -> Result<(), String> {
    apply_update_impl(doc, update, false, array_filters)
}

fn apply_update_impl(
    doc: &mut Document,
    update: &Document,
    is_upsert_insert: bool,
    array_filters: &[Document],
) -> Result<(), String> {
    for key in update.keys() {
        if !key.starts_with('$') {
            return Err(format!(
                "Update keys must be operators starting with $, found: {}",
                key
            ));
        }
    }

    let filter_map = parse_array_filters(array_filters);

    let operator_order = [
        "$set",
        "$setOnInsert",
        "$unset",
        "$inc",
        "$mul",
        "$min",
        "$max",
        "$currentDate",
        "$rename",
        "$addToSet",
        "$push",
        "$pull",
        "$pop",
    ];

    for operator in &operator_order {
        if let Some(spec) = update.get(*operator) {
            let spec_doc = match spec {
                Bson::Document(d) => d,
                _ => return Err(format!("{} must be a document", operator)),
            };

            if !filter_map.is_empty() && has_positional_paths(spec_doc) {
                let (positional, normal) = split_positional_paths(spec_doc);
                if !normal.is_empty() {
                    apply_operator(doc, operator, &normal, is_upsert_insert)?;
                }
                for (path, value) in &positional {
                    apply_positional_operator(doc, path, value, operator, &filter_map)?;
                }
            } else {
                apply_operator(doc, operator, spec_doc, is_upsert_insert)?;
            }
        }
    }

    Ok(())
}

fn apply_operator(
    doc: &mut Document,
    operator: &str,
    spec_doc: &Document,
    is_upsert_insert: bool,
) -> Result<(), String> {
    match operator {
        "$set" => apply_set(doc, spec_doc),
        "$setOnInsert" => {
            if is_upsert_insert {
                apply_set(doc, spec_doc)
            } else {
                Ok(())
            }
        }
        "$unset" => apply_unset(doc, spec_doc),
        "$inc" => apply_inc(doc, spec_doc),
        "$mul" => apply_mul(doc, spec_doc),
        "$min" => apply_min(doc, spec_doc),
        "$max" => apply_max(doc, spec_doc),
        "$currentDate" => apply_current_date(doc, spec_doc),
        "$rename" => apply_rename(doc, spec_doc),
        "$addToSet" => apply_add_to_set(doc, spec_doc),
        "$push" => apply_push(doc, spec_doc),
        "$pull" => apply_pull(doc, spec_doc),
        "$pop" => apply_pop(doc, spec_doc),
        _ => Ok(()),
    }
}

// ---------------------------------------------------------------------------
// arrayFilters / positional operator support
// ---------------------------------------------------------------------------

use std::collections::HashMap;

/// Parse `arrayFilters` into a map of identifier -> filter document.
///
/// MongoDB `arrayFilters` use conventions like `[{"elem.status": "active"}]`
/// where `elem` is derived from the first dot-segment of the filter's keys.
fn parse_array_filters(filters: &[Document]) -> HashMap<String, Document> {
    let mut map = HashMap::new();
    for filter in filters {
        if let Some(first_key) = filter.keys().next() {
            let identifier = first_key.split('.').next().unwrap_or(first_key);
            map.insert(identifier.to_string(), filter.clone());
        }
    }
    map
}

fn has_positional_paths(spec: &Document) -> bool {
    spec.keys().any(|k| k.contains("$["))
}

fn split_positional_paths(spec: &Document) -> (Vec<(String, Bson)>, Document) {
    let mut positional = Vec::new();
    let mut normal = Document::new();
    for (key, value) in spec {
        if key.contains("$[") {
            positional.push((key.clone(), value.clone()));
        } else {
            normal.insert(key.clone(), value.clone());
        }
    }
    (positional, normal)
}

/// Apply a single update operator to array elements matching positional filters.
fn apply_positional_operator(
    doc: &mut Document,
    path: &str,
    value: &Bson,
    operator: &str,
    filter_map: &HashMap<String, Document>,
) -> Result<(), String> {
    use crate::query::eval_query;

    let parts: Vec<&str> = path.split('.').collect();
    let pos_idx = parts
        .iter()
        .position(|p| p.starts_with("$["))
        .ok_or_else(|| format!("no positional operator in path: {}", path))?;

    let positional = parts[pos_idx];
    let prefix = parts[..pos_idx].join(".");
    let suffix = if pos_idx + 1 < parts.len() {
        Some(parts[pos_idx + 1..].join("."))
    } else {
        None
    };

    let mut arr = match get_value(doc, &prefix) {
        Some(Bson::Array(a)) => a.clone(),
        _ => return Ok(()),
    };

    let is_all = positional == "$[]";
    let identifier = if !is_all && positional.len() > 3 {
        Some(&positional[2..positional.len() - 1])
    } else {
        None
    };

    let filter = identifier.and_then(|id| filter_map.get(id));

    for elem in arr.iter_mut() {
        let matches = if is_all {
            true
        } else if let Some(f) = filter {
            if let Bson::Document(elem_doc) = elem {
                let rewritten = rewrite_filter_for_element(f, identifier.unwrap_or(""));
                eval_query(elem_doc, &rewritten).unwrap_or(false)
            } else {
                false
            }
        } else {
            false
        };

        if !matches {
            continue;
        }

        match operator {
            "$set" | "$setOnInsert" => {
                if let Some(ref sfx) = suffix {
                    if let Bson::Document(ref mut d) = elem {
                        set_value(d, sfx, value.clone())?;
                    }
                } else {
                    *elem = value.clone();
                }
            }
            "$unset" => {
                if let Some(ref sfx) = suffix {
                    if let Bson::Document(ref mut d) = elem {
                        unset_value(d, sfx)?;
                    }
                }
            }
            "$inc" => {
                if let Some(ref sfx) = suffix {
                    if let Bson::Document(ref mut d) = elem {
                        let current = get_value(d, sfx);
                        let new_val = add_numbers(current, value)?;
                        set_value(d, sfx, new_val)?;
                    }
                } else {
                    *elem = add_numbers(Some(elem), value)?;
                }
            }
            "$mul" => {
                if let Some(ref sfx) = suffix {
                    if let Bson::Document(ref mut d) = elem {
                        let current = get_value(d, sfx);
                        let new_val = multiply_numbers(current, value)?;
                        set_value(d, sfx, new_val)?;
                    }
                } else {
                    *elem = multiply_numbers(Some(elem), value)?;
                }
            }
            "$min" => {
                if let Some(ref sfx) = suffix {
                    if let Bson::Document(ref mut d) = elem {
                        let should_set = match get_value(d, sfx) {
                            Some(cur) => {
                                compare_numbers(value, cur) == Some(std::cmp::Ordering::Less)
                            }
                            None => true,
                        };
                        if should_set {
                            set_value(d, sfx, value.clone())?;
                        }
                    }
                }
            }
            "$max" => {
                if let Some(ref sfx) = suffix {
                    if let Bson::Document(ref mut d) = elem {
                        let should_set = match get_value(d, sfx) {
                            Some(cur) => {
                                compare_numbers(value, cur) == Some(std::cmp::Ordering::Greater)
                            }
                            None => true,
                        };
                        if should_set {
                            set_value(d, sfx, value.clone())?;
                        }
                    }
                }
            }
            _ => {}
        }
    }

    set_value(doc, &prefix, Bson::Array(arr))
}

/// Rewrite filter keys from `identifier.field` to just `field` so they can be
/// evaluated directly against array elements.
fn rewrite_filter_for_element(filter: &Document, identifier: &str) -> Document {
    let prefix = format!("{}.", identifier);
    let mut rewritten = Document::new();
    for (key, value) in filter {
        if key == identifier {
            rewritten.insert(key.clone(), value.clone());
        } else if let Some(rest) = key.strip_prefix(&prefix) {
            rewritten.insert(rest.to_string(), value.clone());
        } else {
            rewritten.insert(key.clone(), value.clone());
        }
    }
    rewritten
}

// Field operators

fn apply_set(doc: &mut Document, spec: &Document) -> Result<(), String> {
    for (key, value) in spec {
        set_value(doc, key, value.clone())?;
    }
    Ok(())
}

fn apply_unset(doc: &mut Document, spec: &Document) -> Result<(), String> {
    for (key, _) in spec {
        unset_value(doc, key)?;
    }
    Ok(())
}

// Numeric operators

/// Helper to extract a numeric value as f64 from a Bson value
fn bson_to_number(val: &Bson) -> Option<f64> {
    match val {
        Bson::Int32(n) => Some(*n as f64),
        Bson::Int64(n) => Some(*n as f64),
        Bson::Double(n) => Some(*n),
        _ => None,
    }
}

/// Helper to add two numeric Bson values, preserving the target's type when possible
fn add_numbers(current: Option<&Bson>, increment: &Bson) -> Result<Bson, String> {
    let inc_val = bson_to_number(increment)
        .ok_or_else(|| format!("$inc value must be numeric, got: {:?}", increment))?;

    match current {
        Some(Bson::Int32(n)) => {
            // Try to keep as Int32 if possible
            let result = (*n as f64) + inc_val;
            if result >= i32::MIN as f64 && result <= i32::MAX as f64 && result.fract() == 0.0 {
                Ok(Bson::Int32(result as i32))
            } else {
                Ok(Bson::Double(result))
            }
        }
        Some(Bson::Int64(n)) => {
            let result = (*n as f64) + inc_val;
            if result >= i64::MIN as f64 && result <= i64::MAX as f64 && result.fract() == 0.0 {
                Ok(Bson::Int64(result as i64))
            } else {
                Ok(Bson::Double(result))
            }
        }
        Some(Bson::Double(n)) => Ok(Bson::Double(n + inc_val)),
        None => {
            // Field doesn't exist, create with increment value's type
            Ok(increment.clone())
        }
        Some(other) => Err(format!(
            "Cannot apply numeric operation to non-numeric field: {:?}",
            other
        )),
    }
}

/// Helper to multiply two numeric Bson values
fn multiply_numbers(current: Option<&Bson>, multiplier: &Bson) -> Result<Bson, String> {
    let mul_val = bson_to_number(multiplier)
        .ok_or_else(|| format!("$mul value must be numeric, got: {:?}", multiplier))?;

    match current {
        Some(Bson::Int32(n)) => {
            let result = (*n as f64) * mul_val;
            if result >= i32::MIN as f64 && result <= i32::MAX as f64 && result.fract() == 0.0 {
                Ok(Bson::Int32(result as i32))
            } else {
                Ok(Bson::Double(result))
            }
        }
        Some(Bson::Int64(n)) => {
            let result = (*n as f64) * mul_val;
            if result >= i64::MIN as f64 && result <= i64::MAX as f64 && result.fract() == 0.0 {
                Ok(Bson::Int64(result as i64))
            } else {
                Ok(Bson::Double(result))
            }
        }
        Some(Bson::Double(n)) => Ok(Bson::Double(n * mul_val)),
        None => {
            // Field doesn't exist, create as 0
            Ok(Bson::Int32(0))
        }
        Some(other) => Err(format!(
            "Cannot apply $mul to non-numeric field: {:?}",
            other
        )),
    }
}

/// Compare two numeric Bson values
fn compare_numbers(a: &Bson, b: &Bson) -> Option<std::cmp::Ordering> {
    let a_num = bson_to_number(a)?;
    let b_num = bson_to_number(b)?;
    a_num.partial_cmp(&b_num)
}

fn apply_inc(doc: &mut Document, spec: &Document) -> Result<(), String> {
    for (key, increment) in spec {
        let current = get_value(doc, key);
        let new_value = add_numbers(current, increment)?;
        set_value(doc, key, new_value)?;
    }
    Ok(())
}

fn apply_mul(doc: &mut Document, spec: &Document) -> Result<(), String> {
    for (key, multiplier) in spec {
        let current = get_value(doc, key);
        let new_value = multiply_numbers(current, multiplier)?;
        set_value(doc, key, new_value)?;
    }
    Ok(())
}

fn apply_min(doc: &mut Document, spec: &Document) -> Result<(), String> {
    for (key, min_val) in spec {
        if let Some(current) = get_value(doc, key) {
            // Only update if new value is less than current
            if let Some(std::cmp::Ordering::Less) = compare_numbers(min_val, current) {
                set_value(doc, key, min_val.clone())?;
            }
        } else {
            // Field doesn't exist, set it
            set_value(doc, key, min_val.clone())?;
        }
    }
    Ok(())
}

fn apply_max(doc: &mut Document, spec: &Document) -> Result<(), String> {
    for (key, max_val) in spec {
        if let Some(current) = get_value(doc, key) {
            // Only update if new value is greater than current
            if let Some(std::cmp::Ordering::Greater) = compare_numbers(max_val, current) {
                set_value(doc, key, max_val.clone())?;
            }
        } else {
            // Field doesn't exist, set it
            set_value(doc, key, max_val.clone())?;
        }
    }
    Ok(())
}

// Array operators

fn apply_push(doc: &mut Document, spec: &Document) -> Result<(), String> {
    use crate::aggregation::compare_bson;

    for (key, value_spec) in spec {
        let mut arr = match get_value(doc, key) {
            Some(Bson::Array(a)) => a.clone(),
            None => Vec::new(),
            Some(other) => {
                return Err(format!(
                    "Cannot apply $push to non-array field: {:?}",
                    other
                ))
            }
        };

        if let Bson::Document(modifiers) = value_spec {
            if let Some(Bson::Array(elements)) = modifiers.get("$each") {
                // Step 1: Insert elements (respecting $position if present)
                let position = modifiers.get("$position").and_then(|v| match v {
                    Bson::Int32(n) => Some(*n as i64),
                    Bson::Int64(n) => Some(*n),
                    _ => None,
                });

                match position {
                    Some(pos) => {
                        let idx = if pos < 0 {
                            let from_end = (-pos) as usize;
                            arr.len().saturating_sub(from_end)
                        } else {
                            (pos as usize).min(arr.len())
                        };
                        for (i, elem) in elements.iter().enumerate() {
                            arr.insert(idx + i, elem.clone());
                        }
                    }
                    None => {
                        for elem in elements {
                            arr.push(elem.clone());
                        }
                    }
                }

                // Step 2: $sort the entire array
                if let Some(sort_spec) = modifiers.get("$sort") {
                    match sort_spec {
                        Bson::Int32(_) | Bson::Int64(_) => {
                            let d = match sort_spec {
                                Bson::Int32(n) => *n as i64,
                                Bson::Int64(n) => *n,
                                _ => 1,
                            };
                            arr.sort_by(|a, b| {
                                let cmp = compare_bson(Some(a), Some(b));
                                if d < 0 {
                                    cmp.reverse()
                                } else {
                                    cmp
                                }
                            });
                        }
                        Bson::Document(sort_doc) => {
                            arr.sort_by(|a, b| {
                                for (field, direction) in sort_doc {
                                    let dir = match direction {
                                        Bson::Int32(n) => *n as i64,
                                        Bson::Int64(n) => *n,
                                        _ => 1,
                                    };
                                    let val_a = if let Bson::Document(da) = a {
                                        get_value(da, field).cloned()
                                    } else {
                                        None
                                    };
                                    let val_b = if let Bson::Document(db) = b {
                                        get_value(db, field).cloned()
                                    } else {
                                        None
                                    };
                                    let cmp = compare_bson(val_a.as_ref(), val_b.as_ref());
                                    let result = if dir < 0 { cmp.reverse() } else { cmp };
                                    if result != std::cmp::Ordering::Equal {
                                        return result;
                                    }
                                }
                                std::cmp::Ordering::Equal
                            });
                        }
                        _ => return Err("$sort must be 1, -1, or a document".to_string()),
                    }
                }

                // Step 3: $slice the array
                if let Some(slice_val) = modifiers.get("$slice") {
                    let n = match slice_val {
                        Bson::Int32(n) => *n as i64,
                        Bson::Int64(n) => *n,
                        _ => return Err("$slice must be numeric".to_string()),
                    };

                    if n == 0 {
                        arr.clear();
                    } else if n > 0 {
                        arr.truncate(n as usize);
                    } else {
                        let keep = (-n) as usize;
                        if keep < arr.len() {
                            arr = arr.split_off(arr.len() - keep);
                        }
                    }
                }
            } else {
                arr.push(value_spec.clone());
            }
        } else {
            arr.push(value_spec.clone());
        }

        set_value(doc, key, Bson::Array(arr))?;
    }
    Ok(())
}

fn apply_pull(doc: &mut Document, spec: &Document) -> Result<(), String> {
    use crate::query::eval_query;

    for (key, condition) in spec {
        let arr = match get_value(doc, key) {
            Some(Bson::Array(a)) => a.clone(),
            None => continue,    // Field doesn't exist, nothing to pull
            Some(_) => continue, // Not an array, skip
        };

        let filtered: Vec<Bson> = if let Bson::Document(query_doc) = condition {
            // Complex query condition
            arr.into_iter()
                .filter(|elem| {
                    if let Bson::Document(elem_doc) = elem {
                        !eval_query(elem_doc, query_doc).unwrap_or(false)
                    } else {
                        true // Keep non-document elements
                    }
                })
                .collect()
        } else {
            // Simple equality check
            arr.into_iter().filter(|elem| elem != condition).collect()
        };

        set_value(doc, key, Bson::Array(filtered))?;
    }
    Ok(())
}

fn apply_pop(doc: &mut Document, spec: &Document) -> Result<(), String> {
    for (key, direction) in spec {
        let mut arr = match get_value(doc, key) {
            Some(Bson::Array(a)) => a.clone(),
            None => continue,    // Field doesn't exist, nothing to pop
            Some(_) => continue, // Not an array, skip
        };

        if arr.is_empty() {
            continue;
        }

        // Get direction: -1 for first element, 1 for last element
        let dir = match direction {
            Bson::Int32(n) => *n,
            Bson::Int64(n) => *n as i32,
            _ => {
                return Err(format!(
                    "$pop direction must be -1 or 1, got: {:?}",
                    direction
                ))
            }
        };

        if dir == -1 {
            arr.remove(0); // Remove first element
        } else if dir == 1 {
            arr.pop(); // Remove last element
        } else {
            return Err(format!("$pop direction must be -1 or 1, got: {}", dir));
        }

        set_value(doc, key, Bson::Array(arr))?;
    }
    Ok(())
}

fn apply_add_to_set(doc: &mut Document, spec: &Document) -> Result<(), String> {
    for (key, value_spec) in spec {
        // Get current array or create new one
        let mut arr = match get_value(doc, key) {
            Some(Bson::Array(a)) => a.clone(),
            None => Vec::new(),
            Some(other) => {
                return Err(format!(
                    "Cannot apply $addToSet to non-array field: {:?}",
                    other
                ))
            }
        };

        // Check if value_spec contains $each modifier
        if let Bson::Document(modifiers) = value_spec {
            if let Some(Bson::Array(elements)) = modifiers.get("$each") {
                // Add multiple elements (only if not already present)
                for elem in elements {
                    if !arr.contains(elem) {
                        arr.push(elem.clone());
                    }
                }
            } else {
                // Treat as document to add
                if !arr.contains(value_spec) {
                    arr.push(value_spec.clone());
                }
            }
        } else {
            // Simple value to add
            if !arr.contains(value_spec) {
                arr.push(value_spec.clone());
            }
        }

        set_value(doc, key, Bson::Array(arr))?;
    }
    Ok(())
}

// Other operators

fn apply_rename(doc: &mut Document, spec: &Document) -> Result<(), String> {
    for (old_name, new_name_bson) in spec {
        let new_name = match new_name_bson {
            Bson::String(s) => s.as_str(),
            _ => {
                return Err(format!(
                    "$rename target must be a string, got: {:?}",
                    new_name_bson
                ))
            }
        };

        // Check if source field exists
        if let Some(value) = get_value(doc, old_name) {
            let value_clone = value.clone();
            // Remove old field
            unset_value(doc, old_name)?;
            // Set new field
            set_value(doc, new_name, value_clone)?;
        }
        // If source doesn't exist, do nothing (MongoDB behavior)
    }
    Ok(())
}

fn apply_current_date(doc: &mut Document, spec: &Document) -> Result<(), String> {
    use bson::DateTime;

    for (key, type_spec) in spec {
        let value = match type_spec {
            Bson::Boolean(true) => {
                // Default: set to current date
                Bson::DateTime(DateTime::now())
            }
            Bson::Document(opts) => {
                // Check $type option
                match opts.get("$type") {
                    Some(Bson::String(s)) if s == "timestamp" => {
                        // Timestamp type - use current DateTime (BSON DateTime is MongoDB timestamp)
                        Bson::DateTime(DateTime::now())
                    }
                    Some(Bson::String(s)) if s == "date" => {
                        // Date type - use DateTime
                        Bson::DateTime(DateTime::now())
                    }
                    _ => Bson::DateTime(DateTime::now()),
                }
            }
            _ => Bson::DateTime(DateTime::now()),
        };

        set_value(doc, key, value)?;
    }
    Ok(())
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
mod tests {
    use super::*;
    use crate::paths::field_exists;
    use bson::doc;

    #[test]
    fn test_apply_update_validates_operators() {
        let mut doc = doc! { "name": "Alice" };
        let update = doc! { "name": "Bob" }; // Missing $ prefix
        assert!(apply_update(&mut doc, &update).is_err());
    }

    #[test]
    fn test_set_simple() {
        let mut doc = doc! { "name": "Alice", "age": 30 };
        let update = doc! { "$set": { "age": 31, "city": "NYC" } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("age").unwrap(), 31);
        assert_eq!(doc.get_str("city").unwrap(), "NYC");
    }

    #[test]
    fn test_set_nested() {
        let mut doc = doc! { "user": { "name": "Alice" } };
        let update = doc! { "$set": { "user.age": 30 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(get_value(&doc, "user.age"), Some(&Bson::Int32(30)));
    }

    #[test]
    fn test_unset_simple() {
        let mut doc = doc! { "name": "Alice", "age": 30 };
        let update = doc! { "$unset": { "age": "" } };
        apply_update(&mut doc, &update).unwrap();
        assert!(!doc.contains_key("age"));
        assert_eq!(doc.get_str("name").unwrap(), "Alice");
    }

    #[test]
    fn test_unset_nested() {
        let mut doc = doc! { "user": { "name": "Alice", "age": 30 } };
        let update = doc! { "$unset": { "user.age": "" } };
        apply_update(&mut doc, &update).unwrap();
        assert!(!field_exists(&doc, "user.age"));
        assert!(field_exists(&doc, "user.name"));
    }

    #[test]
    fn test_multiple_operators() {
        let mut doc = doc! { "name": "Alice", "age": 30 };
        let update = doc! { "$set": { "city": "NYC" }, "$unset": { "age": "" } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_str("city").unwrap(), "NYC");
        assert!(!doc.contains_key("age"));
    }

    // Numeric operator tests

    #[test]
    fn test_inc_basic() {
        let mut doc = doc! { "score": 10 };
        let update = doc! { "$inc": { "score": 5 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 15);
    }

    #[test]
    fn test_inc_creates_field() {
        let mut doc = doc! { "name": "Alice" };
        let update = doc! { "$inc": { "score": 10 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 10);
    }

    #[test]
    fn test_inc_negative() {
        let mut doc = doc! { "score": 20 };
        let update = doc! { "$inc": { "score": -5 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 15);
    }

    #[test]
    fn test_inc_double() {
        let mut doc = doc! { "value": 10.5 };
        let update = doc! { "$inc": { "value": 2.5 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_f64("value").unwrap(), 13.0);
    }

    #[test]
    fn test_mul_basic() {
        let mut doc = doc! { "score": 10 };
        let update = doc! { "$mul": { "score": 3 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 30);
    }

    #[test]
    fn test_mul_creates_zero() {
        let mut doc = doc! { "name": "Alice" };
        let update = doc! { "$mul": { "score": 5 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 0);
    }

    #[test]
    fn test_min_updates_when_less() {
        let mut doc = doc! { "score": 100 };
        let update = doc! { "$min": { "score": 50 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 50);
    }

    #[test]
    fn test_min_no_update_when_greater() {
        let mut doc = doc! { "score": 100 };
        let update = doc! { "$min": { "score": 150 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 100);
    }

    #[test]
    fn test_min_creates_field() {
        let mut doc = doc! { "name": "Alice" };
        let update = doc! { "$min": { "score": 50 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 50);
    }

    #[test]
    fn test_max_updates_when_greater() {
        let mut doc = doc! { "score": 100 };
        let update = doc! { "$max": { "score": 150 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 150);
    }

    #[test]
    fn test_max_no_update_when_less() {
        let mut doc = doc! { "score": 100 };
        let update = doc! { "$max": { "score": 50 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 100);
    }

    #[test]
    fn test_max_creates_field() {
        let mut doc = doc! { "name": "Alice" };
        let update = doc! { "$max": { "score": 150 } };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_i32("score").unwrap(), 150);
    }

    // Array operator tests

    #[test]
    fn test_push_simple() {
        let mut doc = doc! { "tags": ["red", "blue"] };
        let update = doc! { "$push": { "tags": "green" } };
        apply_update(&mut doc, &update).unwrap();
        if let Some(Bson::Array(arr)) = doc.get("tags") {
            assert_eq!(arr.len(), 3);
            assert_eq!(arr[2], Bson::String("green".to_string()));
        } else {
            panic!("Expected array");
        }
    }

    #[test]
    fn test_push_creates_array() {
        let mut doc = doc! { "name": "Alice" };
        let update = doc! { "$push": { "tags": "new" } };
        apply_update(&mut doc, &update).unwrap();
        if let Some(Bson::Array(arr)) = doc.get("tags") {
            assert_eq!(arr.len(), 1);
            assert_eq!(arr[0], Bson::String("new".to_string()));
        } else {
            panic!("Expected array");
        }
    }

    #[test]
    fn test_push_each() {
        let mut doc = doc! { "tags": ["red"] };
        let update = doc! { "$push": { "tags": { "$each": ["blue", "green"] } } };
        apply_update(&mut doc, &update).unwrap();
        if let Some(Bson::Array(arr)) = doc.get("tags") {
            assert_eq!(arr.len(), 3);
            assert_eq!(arr[1], Bson::String("blue".to_string()));
            assert_eq!(arr[2], Bson::String("green".to_string()));
        } else {
            panic!("Expected array");
        }
    }

    #[test]
    fn test_pull_simple() {
        let mut doc = doc! { "tags": ["red", "blue", "green", "blue"] };
        let update = doc! { "$pull": { "tags": "blue" } };
        apply_update(&mut doc, &update).unwrap();
        if let Some(Bson::Array(arr)) = doc.get("tags") {
            assert_eq!(arr.len(), 2);
            assert_eq!(arr[0], Bson::String("red".to_string()));
            assert_eq!(arr[1], Bson::String("green".to_string()));
        } else {
            panic!("Expected array");
        }
    }

    #[test]
    fn test_pop_last() {
        let mut doc = doc! { "tags": ["red", "blue", "green"] };
        let update = doc! { "$pop": { "tags": 1 } };
        apply_update(&mut doc, &update).unwrap();
        if let Some(Bson::Array(arr)) = doc.get("tags") {
            assert_eq!(arr.len(), 2);
            assert_eq!(arr[0], Bson::String("red".to_string()));
            assert_eq!(arr[1], Bson::String("blue".to_string()));
        } else {
            panic!("Expected array");
        }
    }

    #[test]
    fn test_pop_first() {
        let mut doc = doc! { "tags": ["red", "blue", "green"] };
        let update = doc! { "$pop": { "tags": -1 } };
        apply_update(&mut doc, &update).unwrap();
        if let Some(Bson::Array(arr)) = doc.get("tags") {
            assert_eq!(arr.len(), 2);
            assert_eq!(arr[0], Bson::String("blue".to_string()));
            assert_eq!(arr[1], Bson::String("green".to_string()));
        } else {
            panic!("Expected array");
        }
    }

    #[test]
    fn test_add_to_set_new_value() {
        let mut doc = doc! { "tags": ["red", "blue"] };
        let update = doc! { "$addToSet": { "tags": "green" } };
        apply_update(&mut doc, &update).unwrap();
        if let Some(Bson::Array(arr)) = doc.get("tags") {
            assert_eq!(arr.len(), 3);
            assert!(arr.contains(&Bson::String("green".to_string())));
        } else {
            panic!("Expected array");
        }
    }

    #[test]
    fn test_add_to_set_existing_value() {
        let mut doc = doc! { "tags": ["red", "blue"] };
        let update = doc! { "$addToSet": { "tags": "blue" } };
        apply_update(&mut doc, &update).unwrap();
        if let Some(Bson::Array(arr)) = doc.get("tags") {
            assert_eq!(arr.len(), 2); // Should not add duplicate
        } else {
            panic!("Expected array");
        }
    }

    #[test]
    fn test_add_to_set_each() {
        let mut doc = doc! { "tags": ["red"] };
        let update = doc! { "$addToSet": { "tags": { "$each": ["blue", "red", "green"] } } };
        apply_update(&mut doc, &update).unwrap();
        if let Some(Bson::Array(arr)) = doc.get("tags") {
            assert_eq!(arr.len(), 3); // red already exists, only blue and green added
            assert!(arr.contains(&Bson::String("blue".to_string())));
            assert!(arr.contains(&Bson::String("green".to_string())));
        } else {
            panic!("Expected array");
        }
    }

    #[test]
    fn test_rename_simple() {
        let mut doc = doc! { "name": "Alice", "age": 30 };
        let update = doc! { "$rename": { "name": "fullName" } };
        apply_update(&mut doc, &update).unwrap();
        assert!(!doc.contains_key("name"));
        assert_eq!(doc.get_str("fullName").unwrap(), "Alice");
        assert_eq!(doc.get_i32("age").unwrap(), 30);
    }

    #[test]
    fn test_rename_nested() {
        let mut doc = doc! { "user": { "name": "Alice", "age": 30 } };
        let update = doc! { "$rename": { "user.name": "user.fullName" } };
        apply_update(&mut doc, &update).unwrap();
        assert!(!field_exists(&doc, "user.name"));
        assert_eq!(
            get_value(&doc, "user.fullName"),
            Some(&Bson::String("Alice".to_string()))
        );
    }

    #[test]
    fn test_rename_missing_field() {
        let mut doc = doc! { "name": "Alice" };
        let update = doc! { "$rename": { "missing": "other" } };
        apply_update(&mut doc, &update).unwrap();
        // Should not create new field
        assert!(!doc.contains_key("other"));
        assert_eq!(doc.get_str("name").unwrap(), "Alice");
    }

    #[test]
    fn test_current_date_simple() {
        let mut doc = doc! { "name": "Alice" };
        let update = doc! { "$currentDate": { "lastModified": true } };
        apply_update(&mut doc, &update).unwrap();
        // Should have created a date field
        assert!(matches!(doc.get("lastModified"), Some(Bson::DateTime(_))));
    }

    #[test]
    fn test_current_date_with_type() {
        let mut doc = doc! { "name": "Alice" };
        let update = doc! { "$currentDate": { "lastModified": { "$type": "date" } } };
        apply_update(&mut doc, &update).unwrap();
        assert!(matches!(doc.get("lastModified"), Some(Bson::DateTime(_))));
    }

    #[test]
    fn test_push_each_with_position() {
        let mut doc = doc! { "scores": [50, 60, 70] };
        let update = doc! { "$push": { "scores": { "$each": [10, 20], "$position": 1 } } };
        apply_update(&mut doc, &update).unwrap();
        let arr = doc.get_array("scores").unwrap();
        assert_eq!(
            arr,
            &vec![
                Bson::Int32(50),
                Bson::Int32(10),
                Bson::Int32(20),
                Bson::Int32(60),
                Bson::Int32(70)
            ]
        );
    }

    #[test]
    fn test_push_each_with_position_zero() {
        let mut doc = doc! { "scores": [50, 60] };
        let update = doc! { "$push": { "scores": { "$each": [10], "$position": 0 } } };
        apply_update(&mut doc, &update).unwrap();
        let arr = doc.get_array("scores").unwrap();
        assert_eq!(arr[0], Bson::Int32(10));
        assert_eq!(arr[1], Bson::Int32(50));
    }

    #[test]
    fn test_push_each_with_negative_position() {
        let mut doc = doc! { "scores": [50, 60, 70] };
        let update = doc! { "$push": { "scores": { "$each": [10], "$position": -1 } } };
        apply_update(&mut doc, &update).unwrap();
        let arr = doc.get_array("scores").unwrap();
        // -1 means insert before the last element
        assert_eq!(
            arr,
            &vec![
                Bson::Int32(50),
                Bson::Int32(60),
                Bson::Int32(10),
                Bson::Int32(70)
            ]
        );
    }

    #[test]
    fn test_push_each_with_slice_positive() {
        let mut doc = doc! { "scores": [50, 60] };
        let update = doc! { "$push": { "scores": { "$each": [70, 80, 90], "$slice": 3 } } };
        apply_update(&mut doc, &update).unwrap();
        let arr = doc.get_array("scores").unwrap();
        assert_eq!(arr.len(), 3);
        assert_eq!(
            arr,
            &vec![Bson::Int32(50), Bson::Int32(60), Bson::Int32(70)]
        );
    }

    #[test]
    fn test_push_each_with_slice_negative() {
        let mut doc = doc! { "scores": [50, 60] };
        let update = doc! { "$push": { "scores": { "$each": [70, 80, 90], "$slice": -3 } } };
        apply_update(&mut doc, &update).unwrap();
        let arr = doc.get_array("scores").unwrap();
        assert_eq!(arr.len(), 3);
        assert_eq!(
            arr,
            &vec![Bson::Int32(70), Bson::Int32(80), Bson::Int32(90)]
        );
    }

    #[test]
    fn test_push_each_with_slice_zero() {
        let mut doc = doc! { "scores": [50, 60] };
        let update = doc! { "$push": { "scores": { "$each": [70], "$slice": 0 } } };
        apply_update(&mut doc, &update).unwrap();
        let arr = doc.get_array("scores").unwrap();
        assert!(arr.is_empty());
    }

    #[test]
    fn test_push_each_with_sort_ascending() {
        let mut doc = doc! { "scores": [60, 30] };
        let update = doc! { "$push": { "scores": { "$each": [50, 10], "$sort": 1 } } };
        apply_update(&mut doc, &update).unwrap();
        let arr = doc.get_array("scores").unwrap();
        assert_eq!(
            arr,
            &vec![
                Bson::Int32(10),
                Bson::Int32(30),
                Bson::Int32(50),
                Bson::Int32(60)
            ]
        );
    }

    #[test]
    fn test_push_each_with_sort_descending() {
        let mut doc = doc! { "scores": [60, 30] };
        let update = doc! { "$push": { "scores": { "$each": [50, 10], "$sort": -1 } } };
        apply_update(&mut doc, &update).unwrap();
        let arr = doc.get_array("scores").unwrap();
        assert_eq!(
            arr,
            &vec![
                Bson::Int32(60),
                Bson::Int32(50),
                Bson::Int32(30),
                Bson::Int32(10)
            ]
        );
    }

    #[test]
    fn test_push_each_with_sort_by_field() {
        let mut doc = doc! { "items": [{ "name": "b", "score": 20 }] };
        let update = doc! {
            "$push": {
                "items": {
                    "$each": [{ "name": "a", "score": 30 }, { "name": "c", "score": 10 }],
                    "$sort": { "score": 1 }
                }
            }
        };
        apply_update(&mut doc, &update).unwrap();
        let arr = doc.get_array("items").unwrap();
        assert_eq!(arr.len(), 3);
        if let Bson::Document(d) = &arr[0] {
            assert_eq!(d.get_i32("score").unwrap(), 10);
        } else {
            panic!("expected document");
        }
        if let Bson::Document(d) = &arr[2] {
            assert_eq!(d.get_i32("score").unwrap(), 30);
        } else {
            panic!("expected document");
        }
    }

    #[test]
    fn test_set_on_insert_during_upsert() {
        let mut doc = doc! { "_id": "new" };
        let update = doc! {
            "$set": { "name": "Alice" },
            "$setOnInsert": { "createdAt": "2024-01-01", "defaults": 42 }
        };
        super::apply_update_for_upsert(&mut doc, &update).unwrap();
        assert_eq!(doc.get_str("name").unwrap(), "Alice");
        assert_eq!(doc.get_str("createdAt").unwrap(), "2024-01-01");
        assert_eq!(doc.get_i32("defaults").unwrap(), 42);
    }

    #[test]
    fn test_set_on_insert_ignored_for_normal_update() {
        let mut doc = doc! { "_id": "existing", "name": "Bob" };
        let update = doc! {
            "$set": { "name": "Alice" },
            "$setOnInsert": { "createdAt": "2024-01-01" }
        };
        apply_update(&mut doc, &update).unwrap();
        assert_eq!(doc.get_str("name").unwrap(), "Alice");
        assert!(doc.get("createdAt").is_none());
    }

    #[test]
    fn test_push_each_sort_then_slice() {
        let mut doc = doc! { "scores": [90] };
        let update = doc! {
            "$push": { "scores": { "$each": [40, 70, 20], "$sort": -1, "$slice": 3 } }
        };
        apply_update(&mut doc, &update).unwrap();
        let arr = doc.get_array("scores").unwrap();
        assert_eq!(
            arr,
            &vec![Bson::Int32(90), Bson::Int32(70), Bson::Int32(40)]
        );
    }
}
