//! Dot-notation path traversal, field existence, set, and unset for nested BSON documents.
//!
//! This module provides pure Rust equivalents of the PyO3-based path operations,
//! working directly with `bson::Document` and `bson::Bson` types.

use bson::{Bson, Document};

/// Traverse a document using a dot-notation path.
///
/// Returns `None` when any segment is missing, the value is `Null`,
/// or the intermediate type is neither `Document` nor `Array`.
///
/// # Examples
///
/// ```
/// use bson::{doc, Bson};
/// use smongo_engine::paths::get_value;
///
/// let doc = doc! { "user": { "name": "Alice", "age": 30 } };
/// let name = get_value(&doc, "user.name");
/// assert_eq!(name, Some(&Bson::String("Alice".to_string())));
/// ```
pub fn get_value<'a>(doc: &'a Document, key: &str) -> Option<&'a Bson> {
    let parts: Vec<&str> = key.split('.').collect();
    if parts.is_empty() {
        return None;
    }

    // Start with the first part
    let first = parts[0];
    let mut current = doc.get(first)?;

    // Traverse remaining parts
    for &part in &parts[1..] {
        match current {
            Bson::Null => return None,
            Bson::Document(d) => {
                current = d.get(part)?;
            }
            Bson::Array(arr) => {
                let idx = part.parse::<usize>().ok()?;
                current = arr.get(idx)?;
            }
            _ => return None,
        }
    }

    Some(current)
}

/// Check whether a dot-notation path exists in a document.
///
/// Unlike `get_value`, this distinguishes "field present with value Null"
/// from "field missing entirely", matching MongoDB `$exists` semantics.
pub fn field_exists(doc: &Document, key: &str) -> bool {
    let mut current = Bson::Document(doc.clone());

    for part in key.split('.') {
        match current {
            Bson::Document(d) => match d.get(part) {
                Some(val) => current = val.clone(),
                None => return false,
            },
            Bson::Array(arr) => {
                let Ok(idx) = part.parse::<usize>() else {
                    return false;
                };
                if idx >= arr.len() {
                    return false;
                }
                current = arr[idx].clone();
            }
            _ => return false,
        }
    }
    true
}

/// Set a value in a document using dot-notation, creating intermediate documents.
pub fn set_value(doc: &mut Document, key: &str, value: Bson) -> Result<(), String> {
    let parts: Vec<&str> = key.split('.').collect();

    if parts.is_empty() {
        return Err("empty key".to_string());
    }

    let mut current = doc;

    // Navigate to the parent of the final key, creating intermediate documents
    for &part in &parts[..parts.len() - 1] {
        let need_create = !matches!(current.get(part), Some(Bson::Document(_)));

        if need_create {
            current.insert(part, Bson::Document(Document::new()));
        }

        // Get mutable reference to the nested document
        let entry = current.get_mut(part).ok_or("path traversal failed")?;
        match entry {
            Bson::Document(ref mut d) => current = d,
            _ => return Err("intermediate value is not a document".to_string()),
        }
    }

    // Set the final value
    current.insert(parts[parts.len() - 1], value);
    Ok(())
}

/// Remove a field from a document using dot-notation.
pub fn unset_value(doc: &mut Document, key: &str) -> Result<(), String> {
    let parts: Vec<&str> = key.split('.').collect();

    if parts.is_empty() {
        return Ok(());
    }

    // Navigate to the parent of the final key
    let mut current = doc;

    for &part in &parts[..parts.len() - 1] {
        if !current.contains_key(part) {
            return Ok(()); // Path doesn't exist, nothing to unset
        }

        let entry = current.get_mut(part).ok_or("path traversal failed")?;
        match entry {
            Bson::Document(ref mut d) => current = d,
            _ => return Ok(()), // Not a document, can't traverse further
        }
    }

    // Remove the final key
    let last = parts[parts.len() - 1];
    current.remove(last);
    Ok(())
}

#[cfg(test)]
#[allow(clippy::unwrap_used)]
#[allow(clippy::panic)]
mod tests {
    use super::*;
    use bson::doc;

    // Tests for get_value
    #[test]
    fn test_get_value_simple() {
        let doc = doc! { "name": "Alice", "age": 30 };
        assert_eq!(
            get_value(&doc, "name"),
            Some(&Bson::String("Alice".to_string()))
        );
        assert_eq!(get_value(&doc, "age"), Some(&Bson::Int32(30)));
        assert_eq!(get_value(&doc, "missing"), None);
    }

    #[test]
    fn test_get_value_nested() {
        let doc = doc! { "user": { "name": "Bob", "age": 25 } };
        assert_eq!(
            get_value(&doc, "user.name"),
            Some(&Bson::String("Bob".to_string()))
        );
        assert_eq!(get_value(&doc, "user.age"), Some(&Bson::Int32(25)));
        assert_eq!(get_value(&doc, "user.missing"), None);
    }

    #[test]
    fn test_get_value_null() {
        let doc = doc! { "value": Bson::Null };
        // Getting a null value should return Some(&Bson::Null), not None
        assert_eq!(get_value(&doc, "value"), Some(&Bson::Null));
    }

    #[test]
    fn test_get_value_array() {
        let doc = doc! { "items": [10, 20, 30] };
        assert_eq!(get_value(&doc, "items.0"), Some(&Bson::Int32(10)));
        assert_eq!(get_value(&doc, "items.1"), Some(&Bson::Int32(20)));
        assert_eq!(get_value(&doc, "items.2"), Some(&Bson::Int32(30)));
        assert_eq!(get_value(&doc, "items.3"), None);
    }

    #[test]
    fn test_get_value_nested_array() {
        let doc = doc! { "data": { "items": [1, 2, 3] } };
        assert_eq!(get_value(&doc, "data.items.1"), Some(&Bson::Int32(2)));
    }

    #[test]
    fn test_get_value_deep_nesting() {
        let doc = doc! { "a": { "b": { "c": { "d": 42 } } } };
        assert_eq!(get_value(&doc, "a.b.c.d"), Some(&Bson::Int32(42)));
        assert_eq!(
            get_value(&doc, "a.b.c"),
            Some(&Bson::Document(doc! { "d": 42 }))
        );
    }

    // Tests for field_exists
    #[test]
    fn test_field_exists_simple() {
        let doc = doc! { "name": "Alice", "age": 30 };
        assert!(field_exists(&doc, "name"));
        assert!(field_exists(&doc, "age"));
        assert!(!field_exists(&doc, "missing"));
    }

    #[test]
    fn test_field_exists_null_value() {
        let doc = doc! { "name": Bson::Null };
        assert!(field_exists(&doc, "name")); // Field exists even if value is null
    }

    #[test]
    fn test_field_exists_nested() {
        let doc = doc! { "user": { "name": "Bob", "age": 25 } };
        assert!(field_exists(&doc, "user"));
        assert!(field_exists(&doc, "user.name"));
        assert!(field_exists(&doc, "user.age"));
        assert!(!field_exists(&doc, "user.missing"));
    }

    #[test]
    fn test_field_exists_array() {
        let doc = doc! { "items": [1, 2, 3] };
        assert!(field_exists(&doc, "items"));
        assert!(field_exists(&doc, "items.0"));
        assert!(field_exists(&doc, "items.1"));
        assert!(field_exists(&doc, "items.2"));
        assert!(!field_exists(&doc, "items.3"));
    }

    #[test]
    fn test_set_value_simple() {
        let mut doc = Document::new();
        set_value(&mut doc, "name", Bson::String("Alice".to_string())).unwrap();
        assert_eq!(doc.get("name"), Some(&Bson::String("Alice".to_string())));
    }

    #[test]
    fn test_set_value_nested_creates_intermediates() {
        let mut doc = Document::new();
        set_value(&mut doc, "user.name", Bson::String("Bob".to_string())).unwrap();

        assert!(doc.contains_key("user"));
        assert!(field_exists(&doc, "user.name"));

        if let Some(Bson::Document(user)) = doc.get("user") {
            assert_eq!(user.get("name"), Some(&Bson::String("Bob".to_string())));
        } else {
            panic!("Expected user to be a Document");
        }
    }

    #[test]
    fn test_set_value_deep_nesting() {
        let mut doc = Document::new();
        set_value(&mut doc, "a.b.c.d", Bson::Int32(42)).unwrap();
        assert!(field_exists(&doc, "a"));
        assert!(field_exists(&doc, "a.b"));
        assert!(field_exists(&doc, "a.b.c"));
        assert!(field_exists(&doc, "a.b.c.d"));
    }

    #[test]
    fn test_unset_value_simple() {
        let mut doc = doc! { "name": "Alice", "age": 30 };
        unset_value(&mut doc, "name").unwrap();
        assert!(!doc.contains_key("name"));
        assert!(doc.contains_key("age"));
    }

    #[test]
    fn test_unset_value_nested() {
        let mut doc = doc! { "user": { "name": "Bob", "age": 25 } };
        unset_value(&mut doc, "user.name").unwrap();

        assert!(doc.contains_key("user"));
        assert!(!field_exists(&doc, "user.name"));
        assert!(field_exists(&doc, "user.age"));
    }

    #[test]
    fn test_unset_value_missing_is_noop() {
        let mut doc = doc! { "name": "Alice" };
        unset_value(&mut doc, "missing.path").unwrap();
        assert!(doc.contains_key("name")); // Original data unchanged
    }

    // Comprehensive tests matching Python behavior
    #[test]
    fn test_get_value_null_returns_some() {
        // Python: get_value({"value": None}, "value") returns None (the Python object)
        // Rust: Should return Some(&Bson::Null)
        let doc = doc! { "value": Bson::Null };
        assert_eq!(get_value(&doc, "value"), Some(&Bson::Null));
    }

    #[test]
    fn test_get_value_traverse_through_null_returns_none() {
        // Can't traverse through a null value
        let doc = doc! { "value": Bson::Null };
        assert_eq!(get_value(&doc, "value.nested"), None);
    }

    #[test]
    fn test_get_value_traverse_through_scalar_returns_none() {
        // Can't traverse through a non-document/array
        let doc = doc! { "value": 42 };
        assert_eq!(get_value(&doc, "value.nested"), None);
    }

    #[test]
    fn test_get_value_nested_null() {
        // Test getting null nested field and trying to traverse through it
        let doc = doc! { "a": { "b": Bson::Null } };
        assert_eq!(get_value(&doc, "a.b"), Some(&Bson::Null));
        assert_eq!(get_value(&doc, "a.b.c"), None);
    }

    #[test]
    fn test_field_exists_null_vs_missing() {
        // This is the key difference: field_exists should return true for null values
        let doc = doc! { "value": Bson::Null };
        assert!(field_exists(&doc, "value"));
        assert!(!field_exists(&doc, "missing"));
    }
}
