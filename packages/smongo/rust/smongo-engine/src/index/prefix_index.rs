//! Prefix-truncated B-tree index for long string keys.
//!
//! Stores only the first `prefix_length` bytes of each index key, reducing
//! storage for collections with long string fields (URLs, file paths, etc.).
//! Seeks narrow the scan range but post-filtering is always required because
//! truncated keys may collide.

/// Truncate index key bytes to the configured prefix length.
pub fn truncate_key(key: &[u8], prefix_length: usize) -> Vec<u8> {
    if key.len() <= prefix_length {
        key.to_vec()
    } else {
        key[..prefix_length].to_vec()
    }
}

/// Build a prefix-truncated index key from the full key and options.
pub fn extract_prefix_key(
    doc: &bson::Document,
    keys: &bson::Document,
    prefix_length: usize,
) -> Vec<u8> {
    let full_key = super::extract_index_key(doc, keys);
    truncate_key(&full_key, prefix_length)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_truncate_key() {
        let key = b"hello world this is a long key".to_vec();
        let truncated = truncate_key(&key, 11);
        assert_eq!(truncated, b"hello world");
    }

    #[test]
    fn test_truncate_short_key() {
        let key = b"hi".to_vec();
        let truncated = truncate_key(&key, 10);
        assert_eq!(truncated, b"hi");
    }

    #[test]
    fn test_extract_prefix_key() {
        use bson::doc;
        let d = doc! { "url": "https://example.com/very/long/path/to/resource" };
        let keys = doc! { "url": 1 };
        let pk = extract_prefix_key(&d, &keys, 16);
        assert_eq!(pk.len(), 16);
    }
}
