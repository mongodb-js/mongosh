//! Pure Rust JSON Schema (`$jsonSchema`) validation for `bson::Document`.
//!
//! Validates documents against MongoDB-style `$jsonSchema` specifications,
//! supporting `bsonType`, `required`, `properties`, `additionalProperties`,
//! numeric/string constraints, `enum`, and array validation.
//!
//! # Example
//!
//! ```ignore
//! use bson::doc;
//! use smongo_engine::schema::validate_document;
//!
//! let schema = doc! {
//!     "bsonType": "object",
//!     "required": ["email", "age"],
//!     "properties": {
//!         "email": { "bsonType": "string" },
//!         "age": { "bsonType": "int", "minimum": 0 }
//!     }
//! };
//!
//! let doc = doc! { "email": "alice@example.com", "age": 30 };
//! assert!(validate_document(&doc, &schema).is_ok());
//! ```

use bson::{Bson, Document};

const MAX_NESTING_DEPTH: usize = 100;
const MAX_REGEX_PATTERN_LEN: usize = 1024;

/// Error returned when a document fails schema validation.
#[derive(Debug, Clone)]
pub struct ValidationError {
    pub path: String,
    pub message: String,
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.path.is_empty() {
            write!(f, "Validation failed: {}", self.message)
        } else {
            write!(f, "Validation failed at '{}': {}", self.path, self.message)
        }
    }
}

impl std::error::Error for ValidationError {}

/// Validate a document against a `$jsonSchema`-style schema.
///
/// Returns `Ok(())` if validation passes, or a `ValidationError` describing
/// the first rule violation.
pub fn validate_document(doc: &Document, schema: &Document) -> Result<(), ValidationError> {
    if schema.is_empty() {
        return Ok(());
    }
    if let Some(type_spec) = schema.get("bsonType").or_else(|| schema.get("type")) {
        if !check_bson_type_name("object", type_spec) {
            return Err(ValidationError {
                path: String::new(),
                message: format!(
                    "Expected type {}, got \"object\"",
                    type_spec_label(type_spec)
                ),
            });
        }
    }
    validate_doc_fields(doc, schema, "", 0)
}

fn join_path(base: &str, field: &str) -> String {
    if base.is_empty() {
        field.to_string()
    } else {
        format!("{}.{}", base, field)
    }
}

fn check_bson_type(value: &Bson, type_name: &str) -> bool {
    match type_name {
        "string" => matches!(value, Bson::String(_)),
        "int" => matches!(value, Bson::Int32(_)) && !matches!(value, Bson::Boolean(_)),
        "long" => matches!(value, Bson::Int64(_)),
        "double" => matches!(value, Bson::Double(_)),
        "number" => {
            matches!(value, Bson::Int32(_) | Bson::Int64(_) | Bson::Double(_))
                && !matches!(value, Bson::Boolean(_))
        }
        "bool" | "boolean" => matches!(value, Bson::Boolean(_)),
        "object" => matches!(value, Bson::Document(_)),
        "array" => matches!(value, Bson::Array(_)),
        "null" => matches!(value, Bson::Null),
        "objectId" => matches!(value, Bson::ObjectId(_)),
        "date" => matches!(value, Bson::DateTime(_)),
        "regex" => matches!(value, Bson::RegularExpression(_)),
        "binData" => matches!(value, Bson::Binary(_)),
        _ => false,
    }
}

fn check_bson_type_name(actual_type: &str, type_spec: &Bson) -> bool {
    match type_spec {
        Bson::String(s) => s == actual_type,
        Bson::Array(arr) => arr.iter().any(|t| t.as_str() == Some(actual_type)),
        _ => true,
    }
}

fn check_type_spec(value: &Bson, type_spec: &Bson) -> bool {
    match type_spec {
        Bson::String(s) => check_bson_type(value, s),
        Bson::Array(arr) => arr.iter().any(|t| {
            if let Bson::String(s) = t {
                check_bson_type(value, s)
            } else {
                false
            }
        }),
        _ => true,
    }
}

fn type_spec_label(type_spec: &Bson) -> String {
    match type_spec {
        Bson::String(s) => s.clone(),
        Bson::Array(arr) => {
            let labels: Vec<String> = arr
                .iter()
                .filter_map(|t| t.as_str().map(String::from))
                .collect();
            format!("[{}]", labels.join(", "))
        }
        _ => "unknown".into(),
    }
}

fn bson_to_f64(value: &Bson) -> Option<f64> {
    match value {
        Bson::Int32(n) => Some(*n as f64),
        Bson::Int64(n) => Some(*n as f64),
        Bson::Double(n) => Some(*n),
        _ => None,
    }
}

fn is_numeric(value: &Bson) -> bool {
    matches!(value, Bson::Int32(_) | Bson::Int64(_) | Bson::Double(_))
        && !matches!(value, Bson::Boolean(_))
}

fn validate_object(
    value: &Bson,
    schema: &Document,
    path: &str,
    depth: usize,
) -> Result<(), ValidationError> {
    if depth > MAX_NESTING_DEPTH {
        return Err(ValidationError {
            path: path.to_string(),
            message: format!("Maximum nesting depth ({}) exceeded", MAX_NESTING_DEPTH),
        });
    }

    if let Some(type_spec) = schema.get("bsonType").or_else(|| schema.get("type")) {
        if !check_type_spec(value, type_spec) {
            if matches!(value, Bson::Null) {
                if let Bson::Array(arr) = type_spec {
                    if arr.iter().any(|t| t.as_str() == Some("null")) {
                        return Ok(());
                    }
                }
                if type_spec.as_str() == Some("null") {
                    return Ok(());
                }
            }
            return Err(ValidationError {
                path: path.to_string(),
                message: format!(
                    "Expected type {}, got {:?}",
                    type_spec_label(type_spec),
                    bson_type_name(value)
                ),
            });
        }
    }

    let doc = match value {
        Bson::Document(d) => d,
        Bson::Array(arr) => return validate_array(arr, schema, path, depth),
        _ => return validate_scalar(value, schema, path),
    };

    validate_doc_fields(doc, schema, path, depth)
}

fn validate_doc_fields(
    doc: &Document,
    schema: &Document,
    path: &str,
    depth: usize,
) -> Result<(), ValidationError> {
    if let Some(Bson::Array(required)) = schema.get("required") {
        for field in required {
            if let Bson::String(name) = field {
                if !doc.contains_key(name) {
                    return Err(ValidationError {
                        path: join_path(path, name),
                        message: format!("Required field '{}' is missing", name),
                    });
                }
            }
        }
    }

    if let Some(Bson::Document(properties)) = schema.get("properties") {
        for (field, sub_schema) in properties {
            if let Some(field_val) = doc.get(field) {
                if let Bson::Document(sub_doc) = sub_schema {
                    validate_value(field_val, sub_doc, &join_path(path, field), depth + 1)?;
                }
            }
        }
    }

    if let Some(Bson::Boolean(false)) = schema.get("additionalProperties") {
        if let Some(Bson::Document(properties)) = schema.get("properties") {
            for key in doc.keys() {
                if key == "_id" {
                    continue;
                }
                if !properties.contains_key(key) {
                    return Err(ValidationError {
                        path: join_path(path, key),
                        message: format!("Additional property '{}' not allowed", key),
                    });
                }
            }
        }
    }

    if let Some(min_props) = schema.get("minProperties").and_then(bson_to_f64) {
        if (doc.len() as f64) < min_props {
            return Err(ValidationError {
                path: path.to_string(),
                message: format!(
                    "Document has {} properties, minimum is {}",
                    doc.len(),
                    min_props as i64
                ),
            });
        }
    }

    if let Some(max_props) = schema.get("maxProperties").and_then(bson_to_f64) {
        if doc.len() as f64 > max_props {
            return Err(ValidationError {
                path: path.to_string(),
                message: format!(
                    "Document has {} properties, maximum is {}",
                    doc.len(),
                    max_props as i64
                ),
            });
        }
    }

    validate_combinators(&Bson::Document(doc.clone()), schema, path, depth)?;

    Ok(())
}

fn validate_value(
    value: &Bson,
    schema: &Document,
    path: &str,
    depth: usize,
) -> Result<(), ValidationError> {
    if matches!(value, Bson::Null) {
        if let Some(type_spec) = schema.get("bsonType").or_else(|| schema.get("type")) {
            if let Bson::Array(arr) = type_spec {
                if arr.iter().any(|t| t.as_str() == Some("null")) {
                    return Ok(());
                }
            }
            if type_spec.as_str() == Some("null") {
                return Ok(());
            }
        }
    }

    if let Some(type_spec) = schema.get("bsonType").or_else(|| schema.get("type")) {
        if !check_type_spec(value, type_spec) {
            return Err(ValidationError {
                path: path.to_string(),
                message: format!(
                    "Expected type {}, got {:?}",
                    type_spec_label(type_spec),
                    bson_type_name(value)
                ),
            });
        }
    }

    validate_combinators(value, schema, path, depth)?;

    match value {
        Bson::Document(_) => validate_object(value, schema, path, depth),
        Bson::Array(arr) => validate_array(arr, schema, path, depth),
        _ => validate_scalar(value, schema, path),
    }
}

fn validate_combinators(
    value: &Bson,
    schema: &Document,
    path: &str,
    depth: usize,
) -> Result<(), ValidationError> {
    if let Some(Bson::Array(schemas)) = schema.get("allOf") {
        for (i, sub) in schemas.iter().enumerate() {
            if let Bson::Document(sub_schema) = sub {
                validate_value(value, sub_schema, path, depth + 1).map_err(|e| {
                    ValidationError {
                        path: e.path,
                        message: format!("allOf[{}]: {}", i, e.message),
                    }
                })?;
            }
        }
    }

    if let Some(Bson::Array(schemas)) = schema.get("anyOf") {
        let mut matched = false;
        for sub in schemas {
            if let Bson::Document(sub_schema) = sub {
                if validate_value(value, sub_schema, path, depth + 1).is_ok() {
                    matched = true;
                    break;
                }
            }
        }
        if !matched {
            return Err(ValidationError {
                path: path.to_string(),
                message: "Value does not match any schema in anyOf".to_string(),
            });
        }
    }

    if let Some(Bson::Array(schemas)) = schema.get("oneOf") {
        let mut match_count = 0;
        for sub in schemas {
            if let Bson::Document(sub_schema) = sub {
                if validate_value(value, sub_schema, path, depth + 1).is_ok() {
                    match_count += 1;
                    if match_count > 1 {
                        break;
                    }
                }
            }
        }
        if match_count != 1 {
            return Err(ValidationError {
                path: path.to_string(),
                message: format!(
                    "Value must match exactly one schema in oneOf, but matched {}",
                    match_count
                ),
            });
        }
    }

    if let Some(Bson::Document(not_schema)) = schema.get("not") {
        if validate_value(value, not_schema, path, depth + 1).is_ok() {
            return Err(ValidationError {
                path: path.to_string(),
                message: "Value must not match the schema in 'not'".to_string(),
            });
        }
    }

    Ok(())
}

fn validate_scalar(value: &Bson, schema: &Document, path: &str) -> Result<(), ValidationError> {
    if is_numeric(value) {
        let n = bson_to_f64(value).unwrap_or(0.0);

        if let Some(min) = schema.get("minimum").and_then(bson_to_f64) {
            if n < min {
                return Err(ValidationError {
                    path: path.to_string(),
                    message: format!("Value {} is less than minimum {}", n, min),
                });
            }
        }
        if let Some(max) = schema.get("maximum").and_then(bson_to_f64) {
            if n > max {
                return Err(ValidationError {
                    path: path.to_string(),
                    message: format!("Value {} is greater than maximum {}", n, max),
                });
            }
        }
        if let Some(exc_min) = schema.get("exclusiveMinimum").and_then(bson_to_f64) {
            if n <= exc_min {
                return Err(ValidationError {
                    path: path.to_string(),
                    message: format!("Value {} must be greater than {}", n, exc_min),
                });
            }
        }
        if let Some(exc_max) = schema.get("exclusiveMaximum").and_then(bson_to_f64) {
            if n >= exc_max {
                return Err(ValidationError {
                    path: path.to_string(),
                    message: format!("Value {} must be less than {}", n, exc_max),
                });
            }
        }
    }

    if let Bson::String(s) = value {
        if let Some(min_len) = schema.get("minLength").and_then(bson_to_f64) {
            if (s.len() as f64) < min_len {
                return Err(ValidationError {
                    path: path.to_string(),
                    message: format!(
                        "String length {} is less than minLength {}",
                        s.len(),
                        min_len as i64
                    ),
                });
            }
        }
        if let Some(max_len) = schema.get("maxLength").and_then(bson_to_f64) {
            if s.len() as f64 > max_len {
                return Err(ValidationError {
                    path: path.to_string(),
                    message: format!(
                        "String length {} exceeds maxLength {}",
                        s.len(),
                        max_len as i64
                    ),
                });
            }
        }
        if let Some(Bson::String(pattern)) = schema.get("pattern") {
            if pattern.len() > MAX_REGEX_PATTERN_LEN {
                return Err(ValidationError {
                    path: path.to_string(),
                    message: format!(
                        "Pattern too long ({} chars, max {})",
                        pattern.len(),
                        MAX_REGEX_PATTERN_LEN
                    ),
                });
            }
            match regex::Regex::new(pattern) {
                Ok(re) => {
                    if !re.is_match(s) {
                        return Err(ValidationError {
                            path: path.to_string(),
                            message: format!("String '{}' does not match pattern '{}'", s, pattern),
                        });
                    }
                }
                Err(e) => {
                    return Err(ValidationError {
                        path: path.to_string(),
                        message: format!("Invalid regex pattern '{}': {}", pattern, e),
                    });
                }
            }
        }
    }

    if let Some(Bson::Array(enum_vals)) = schema.get("enum") {
        if !enum_vals.contains(value) {
            return Err(ValidationError {
                path: path.to_string(),
                message: format!("Value {:?} not in enum", value),
            });
        }
    }

    Ok(())
}

fn validate_array(
    arr: &[Bson],
    schema: &Document,
    path: &str,
    depth: usize,
) -> Result<(), ValidationError> {
    if let Some(min_items) = schema.get("minItems").and_then(bson_to_f64) {
        if (arr.len() as f64) < min_items {
            return Err(ValidationError {
                path: path.to_string(),
                message: format!(
                    "Array has {} items, minimum is {}",
                    arr.len(),
                    min_items as i64
                ),
            });
        }
    }

    if let Some(max_items) = schema.get("maxItems").and_then(bson_to_f64) {
        if arr.len() as f64 > max_items {
            return Err(ValidationError {
                path: path.to_string(),
                message: format!(
                    "Array has {} items, maximum is {}",
                    arr.len(),
                    max_items as i64
                ),
            });
        }
    }

    if let Some(Bson::Boolean(true)) = schema.get("uniqueItems") {
        for i in 0..arr.len() {
            for j in (i + 1)..arr.len() {
                if arr[i] == arr[j] {
                    return Err(ValidationError {
                        path: path.to_string(),
                        message: format!("Array items at index {} and {} are not unique", i, j),
                    });
                }
            }
        }
    }

    if let Some(Bson::Document(items_schema)) = schema.get("items") {
        for (i, item) in arr.iter().enumerate() {
            let item_path = format!("{}[{}]", path, i);
            validate_value(item, items_schema, &item_path, depth + 1)?;
        }
    }

    Ok(())
}

fn bson_type_name(value: &Bson) -> &'static str {
    match value {
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
        Bson::Binary(_) => "binData",
        _ => "unknown",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;

    #[test]
    fn test_empty_schema_passes() {
        let doc = doc! { "anything": "goes" };
        assert!(validate_document(&doc, &Document::new()).is_ok());
    }

    #[test]
    fn test_required_field_present() {
        let schema = doc! { "required": ["name"] };
        let d = doc! { "name": "Alice" };
        assert!(validate_document(&d, &schema).is_ok());
    }

    #[test]
    fn test_required_field_missing() {
        let schema = doc! { "required": ["name"] };
        let d = doc! { "age": 30 };
        let err = validate_document(&d, &schema).unwrap_err();
        assert!(err.message.contains("name"));
    }

    #[test]
    fn test_bson_type_string() {
        let schema = doc! {
            "properties": {
                "name": { "bsonType": "string" }
            }
        };
        let d = doc! { "name": "Alice" };
        assert!(validate_document(&d, &schema).is_ok());

        let bad = doc! { "name": 42 };
        assert!(validate_document(&bad, &schema).is_err());
    }

    #[test]
    fn test_bson_type_int() {
        let schema = doc! {
            "properties": {
                "age": { "bsonType": "int" }
            }
        };
        let d = doc! { "age": 30_i32 };
        assert!(validate_document(&d, &schema).is_ok());
    }

    #[test]
    fn test_bson_type_number() {
        let schema = doc! {
            "properties": {
                "val": { "bsonType": "number" }
            }
        };
        assert!(validate_document(&doc! { "val": 42_i32 }, &schema).is_ok());
        assert!(validate_document(&doc! { "val": 3.14 }, &schema).is_ok());
        assert!(validate_document(&doc! { "val": 100_i64 }, &schema).is_ok());
        assert!(validate_document(&doc! { "val": true }, &schema).is_err());
    }

    #[test]
    fn test_bson_type_array() {
        let schema = doc! {
            "properties": {
                "tags": { "bsonType": "array" }
            }
        };
        let d = doc! { "tags": ["a", "b"] };
        assert!(validate_document(&d, &schema).is_ok());
    }

    #[test]
    fn test_minimum_maximum() {
        let schema = doc! {
            "properties": {
                "age": { "bsonType": "int", "minimum": 0, "maximum": 120 }
            }
        };
        assert!(validate_document(&doc! { "age": 30 }, &schema).is_ok());
        assert!(validate_document(&doc! { "age": -1 }, &schema).is_err());
        assert!(validate_document(&doc! { "age": 121 }, &schema).is_err());
    }

    #[test]
    fn test_exclusive_minimum_maximum() {
        let schema = doc! {
            "properties": {
                "val": { "bsonType": "int", "exclusiveMinimum": 0, "exclusiveMaximum": 10 }
            }
        };
        assert!(validate_document(&doc! { "val": 5 }, &schema).is_ok());
        assert!(validate_document(&doc! { "val": 0 }, &schema).is_err());
        assert!(validate_document(&doc! { "val": 10 }, &schema).is_err());
    }

    #[test]
    fn test_min_max_length() {
        let schema = doc! {
            "properties": {
                "name": { "bsonType": "string", "minLength": 2, "maxLength": 10 }
            }
        };
        assert!(validate_document(&doc! { "name": "Alice" }, &schema).is_ok());
        assert!(validate_document(&doc! { "name": "A" }, &schema).is_err());
        assert!(validate_document(&doc! { "name": "Abcdefghijk" }, &schema).is_err());
    }

    #[test]
    fn test_pattern() {
        let schema = doc! {
            "properties": {
                "email": { "bsonType": "string", "pattern": r"^.+@.+$" }
            }
        };
        assert!(validate_document(&doc! { "email": "a@b.c" }, &schema).is_ok());
        assert!(validate_document(&doc! { "email": "invalid" }, &schema).is_err());
    }

    #[test]
    fn test_enum_values() {
        let schema = doc! {
            "properties": {
                "status": { "enum": ["active", "inactive"] }
            }
        };
        assert!(validate_document(&doc! { "status": "active" }, &schema).is_ok());
        assert!(validate_document(&doc! { "status": "deleted" }, &schema).is_err());
    }

    #[test]
    fn test_additional_properties_false() {
        let schema = doc! {
            "properties": {
                "name": { "bsonType": "string" }
            },
            "additionalProperties": false
        };
        assert!(validate_document(&doc! { "name": "Alice" }, &schema).is_ok());
        assert!(validate_document(&doc! { "name": "Alice", "extra": 1 }, &schema).is_err());
        assert!(validate_document(&doc! { "name": "Alice", "_id": "ok" }, &schema).is_ok());
    }

    #[test]
    fn test_min_max_properties() {
        let schema = doc! { "minProperties": 2, "maxProperties": 3 };
        assert!(validate_document(&doc! { "a": 1 }, &schema).is_err());
        assert!(validate_document(&doc! { "a": 1, "b": 2 }, &schema).is_ok());
        assert!(validate_document(&doc! { "a": 1, "b": 2, "c": 3, "d": 4 }, &schema).is_err());
    }

    #[test]
    fn test_nested_object_validation() {
        let schema = doc! {
            "properties": {
                "address": {
                    "bsonType": "object",
                    "required": ["city"],
                    "properties": {
                        "city": { "bsonType": "string" }
                    }
                }
            }
        };
        let good = doc! { "address": { "city": "NYC" } };
        assert!(validate_document(&good, &schema).is_ok());
        let bad = doc! { "address": { "state": "NY" } };
        assert!(validate_document(&bad, &schema).is_err());
    }

    #[test]
    fn test_array_items_validation() {
        let schema = doc! {
            "properties": {
                "scores": {
                    "bsonType": "array",
                    "items": { "bsonType": "int", "minimum": 0 }
                }
            }
        };
        assert!(validate_document(&doc! { "scores": [80, 90, 100] }, &schema).is_ok());
        assert!(validate_document(&doc! { "scores": [80, -1, 100] }, &schema).is_err());
    }

    #[test]
    fn test_array_min_max_items() {
        let schema = doc! {
            "properties": {
                "tags": { "bsonType": "array", "minItems": 1, "maxItems": 3 }
            }
        };
        let empty: Vec<String> = vec![];
        assert!(validate_document(&doc! { "tags": empty }, &schema).is_err());
        assert!(validate_document(&doc! { "tags": ["a", "b"] }, &schema).is_ok());
    }

    #[test]
    fn test_unique_items() {
        let schema = doc! {
            "properties": {
                "tags": { "bsonType": "array", "uniqueItems": true }
            }
        };
        assert!(validate_document(&doc! { "tags": ["a", "b", "c"] }, &schema).is_ok());
        assert!(validate_document(&doc! { "tags": ["a", "b", "a"] }, &schema).is_err());
    }

    #[test]
    fn test_null_with_type_allowing_null() {
        let schema = doc! {
            "properties": {
                "val": { "bsonType": ["string", "null"] }
            }
        };
        assert!(validate_document(&doc! { "val": "hello" }, &schema).is_ok());
        assert!(validate_document(&doc! { "val": bson::Bson::Null }, &schema).is_ok());
    }

    #[test]
    fn test_all_of_passes() {
        let schema = doc! {
            "properties": {
                "age": {
                    "allOf": [
                        { "bsonType": "int", "minimum": 0 },
                        { "maximum": 120 }
                    ]
                }
            }
        };
        assert!(validate_document(&doc! { "age": 25 }, &schema).is_ok());
    }

    #[test]
    fn test_all_of_fails() {
        let schema = doc! {
            "properties": {
                "age": {
                    "allOf": [
                        { "minimum": 0 },
                        { "maximum": 120 }
                    ]
                }
            }
        };
        assert!(validate_document(&doc! { "age": 200 }, &schema).is_err());
    }

    #[test]
    fn test_any_of_passes() {
        let schema = doc! {
            "properties": {
                "val": {
                    "anyOf": [
                        { "bsonType": "string" },
                        { "bsonType": "int" }
                    ]
                }
            }
        };
        assert!(validate_document(&doc! { "val": "hello" }, &schema).is_ok());
        assert!(validate_document(&doc! { "val": 42 }, &schema).is_ok());
    }

    #[test]
    fn test_any_of_fails() {
        let schema = doc! {
            "properties": {
                "val": {
                    "anyOf": [
                        { "bsonType": "string" },
                        { "bsonType": "int" }
                    ]
                }
            }
        };
        assert!(validate_document(&doc! { "val": true }, &schema).is_err());
    }

    #[test]
    fn test_one_of_exactly_one() {
        let schema = doc! {
            "properties": {
                "val": {
                    "oneOf": [
                        { "bsonType": "string" },
                        { "bsonType": "int" }
                    ]
                }
            }
        };
        assert!(validate_document(&doc! { "val": "hello" }, &schema).is_ok());
    }

    #[test]
    fn test_one_of_fails_none_match() {
        let schema = doc! {
            "properties": {
                "val": {
                    "oneOf": [
                        { "bsonType": "string" },
                        { "bsonType": "int" }
                    ]
                }
            }
        };
        assert!(validate_document(&doc! { "val": true }, &schema).is_err());
    }

    #[test]
    fn test_one_of_fails_multiple_match() {
        let schema = doc! {
            "properties": {
                "val": {
                    "oneOf": [
                        { "bsonType": "number" },
                        { "bsonType": "int" }
                    ]
                }
            }
        };
        let result = validate_document(&doc! { "val": 42 }, &schema);
        assert!(result.is_err());
        assert!(result.unwrap_err().message.contains("matched 2"));
    }

    #[test]
    fn test_not_passes() {
        let schema = doc! {
            "properties": {
                "status": {
                    "not": { "bsonType": "null" }
                }
            }
        };
        assert!(validate_document(&doc! { "status": "active" }, &schema).is_ok());
    }

    #[test]
    fn test_not_fails() {
        let schema = doc! {
            "properties": {
                "status": {
                    "not": { "bsonType": "string" }
                }
            }
        };
        assert!(validate_document(&doc! { "status": "active" }, &schema).is_err());
    }

    #[test]
    fn test_combinators_at_document_level() {
        let schema = doc! {
            "allOf": [
                { "required": ["name"] },
                { "required": ["age"] }
            ]
        };
        assert!(validate_document(&doc! { "name": "Alice", "age": 30 }, &schema).is_ok());
        assert!(validate_document(&doc! { "name": "Alice" }, &schema).is_err());
    }

    #[test]
    fn test_depth_limit() {
        fn make_nested(depth: usize) -> Document {
            if depth == 0 {
                doc! { "leaf": true }
            } else {
                doc! { "nested": make_nested(depth - 1) }
            }
        }
        fn make_schema(depth: usize) -> Document {
            if depth == 0 {
                doc! { "properties": { "leaf": { "bsonType": "bool" } } }
            } else {
                doc! { "properties": { "nested": make_schema(depth - 1) } }
            }
        }
        let deep_doc = make_nested(MAX_NESTING_DEPTH + 5);
        let deep_schema = make_schema(MAX_NESTING_DEPTH + 5);
        assert!(validate_document(&deep_doc, &deep_schema).is_err());
    }
}
