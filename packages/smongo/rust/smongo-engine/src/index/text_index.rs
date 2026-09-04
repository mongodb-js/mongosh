//! Full-text inverted index with TF-IDF scoring.
//!
//! Tokenizes document string fields with NFKD normalization + word-boundary
//! regex (matching `\w+`), stores inverted postings `token -> [(doc_id, tf)]`,
//! and supports intersection-based AND queries with TF-IDF ranking.

use std::collections::HashMap;

use bson::Document;
use regex::Regex;

// ---------------------------------------------------------------------------
// Tokenizer (shared by index build and query)
// ---------------------------------------------------------------------------

/// NFKD-normalize and split into lowercase word tokens.
///
/// This is the canonical tokenizer for the engine, matching the legacy
/// `rs_tokenize` in `smongo-py`.  All `$text` evaluation should use this
/// function so behavior is consistent between indexed and brute-force paths.
pub fn tokenize(text: &str) -> Vec<String> {
    #[allow(clippy::expect_used)]
    static WORD_RE: std::sync::LazyLock<Regex> = std::sync::LazyLock::new(|| {
        Regex::new(r"\w+").expect("static \\w+ tokenizer regex must compile")
    });
    let lowered = text.to_lowercase();
    WORD_RE
        .find_iter(&lowered)
        .map(|m| m.as_str().to_string())
        .collect()
}

// ---------------------------------------------------------------------------
// TextIndex
// ---------------------------------------------------------------------------

/// A posting entry: doc_id and term frequency in that document.
#[derive(Debug, Clone)]
struct Posting {
    doc_id: String,
    tf: u32,
}

/// In-memory inverted index over one or more text fields.
pub struct TextIndex {
    /// token -> list of postings
    postings: HashMap<String, Vec<Posting>>,
    /// Total number of indexed documents.
    doc_count: usize,
    /// Fields indexed (for incremental insert/remove).
    fields: Vec<String>,
    /// Per-field weights for scoring.
    weights: HashMap<String, f64>,
}

impl TextIndex {
    pub fn new(fields: Vec<String>, weights: Option<&Document>) -> Self {
        let mut w = HashMap::new();
        if let Some(wdoc) = weights {
            for (k, v) in wdoc {
                w.insert(k.clone(), v.as_f64().unwrap_or(1.0));
            }
        }
        Self {
            postings: HashMap::new(),
            doc_count: 0,
            fields,
            weights: w,
        }
    }

    /// Bulk-build from documents.
    pub fn build(docs: &[Document], fields: &[String], weights: Option<&Document>) -> Self {
        let mut idx = Self::new(fields.to_vec(), weights);
        for doc in docs {
            idx.insert_doc(doc);
        }
        idx
    }

    /// Add a single document to the index.
    pub fn insert_doc(&mut self, doc: &Document) {
        let doc_id = match doc.get("_id") {
            Some(bson::Bson::ObjectId(oid)) => oid.to_hex(),
            Some(bson::Bson::String(s)) => s.clone(),
            Some(bson::Bson::Int32(i)) => i.to_string(),
            Some(bson::Bson::Int64(i)) => i.to_string(),
            _ => return,
        };
        let mut term_counts: HashMap<String, u32> = HashMap::new();
        for field in &self.fields {
            let weight = self.weights.get(field).copied().unwrap_or(1.0);
            if let Some(bson::Bson::String(text)) = crate::paths::get_value(doc, field) {
                for token in tokenize(text) {
                    *term_counts.entry(token).or_insert(0) += weight.max(1.0) as u32;
                }
            }
        }
        for (token, tf) in term_counts {
            self.postings.entry(token).or_default().push(Posting {
                doc_id: doc_id.clone(),
                tf,
            });
        }
        self.doc_count += 1;
    }

    /// Remove a document from the index.
    pub fn remove_doc(&mut self, doc_id: &str) {
        for postings in self.postings.values_mut() {
            postings.retain(|p| p.doc_id != doc_id);
        }
        if self.doc_count > 0 {
            self.doc_count -= 1;
        }
    }

    /// Search for documents matching all query tokens (AND semantics).
    /// Returns `(doc_id, score)` sorted by descending TF-IDF score.
    pub fn search(&self, query: &str, limit: Option<usize>) -> Vec<(String, f64)> {
        let tokens = tokenize(query);
        if tokens.is_empty() {
            return Vec::new();
        }

        let mut doc_scores: HashMap<String, f64> = HashMap::new();
        let mut doc_token_hits: HashMap<String, usize> = HashMap::new();
        let n = self.doc_count.max(1) as f64;

        for token in &tokens {
            if let Some(postings) = self.postings.get(token) {
                let df = postings.len() as f64;
                let idf = (n / df).ln() + 1.0;
                for posting in postings {
                    let tf = 1.0 + (posting.tf as f64).ln();
                    *doc_scores.entry(posting.doc_id.clone()).or_insert(0.0) += tf * idf;
                    *doc_token_hits.entry(posting.doc_id.clone()).or_insert(0) += 1;
                }
            }
        }

        // AND semantics: only keep docs that matched ALL tokens
        let required = tokens.len();
        let mut results: Vec<(String, f64)> = doc_scores
            .into_iter()
            .filter(|(id, _)| doc_token_hits.get(id).copied().unwrap_or(0) >= required)
            .collect();
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        if let Some(lim) = limit {
            results.truncate(lim);
        }
        results
    }

    pub fn doc_count(&self) -> usize {
        self.doc_count
    }

    pub fn token_count(&self) -> usize {
        self.postings.len()
    }
}

// ---------------------------------------------------------------------------
// Serialization (for redb persistence)
// ---------------------------------------------------------------------------

impl TextIndex {
    /// Serialize to bytes.
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        // fields
        buf.extend_from_slice(&(self.fields.len() as u32).to_le_bytes());
        for f in &self.fields {
            let fb = f.as_bytes();
            buf.extend_from_slice(&(fb.len() as u32).to_le_bytes());
            buf.extend_from_slice(fb);
        }
        // doc_count
        buf.extend_from_slice(&(self.doc_count as u32).to_le_bytes());
        // postings
        buf.extend_from_slice(&(self.postings.len() as u32).to_le_bytes());
        for (token, posts) in &self.postings {
            let tb = token.as_bytes();
            buf.extend_from_slice(&(tb.len() as u32).to_le_bytes());
            buf.extend_from_slice(tb);
            buf.extend_from_slice(&(posts.len() as u32).to_le_bytes());
            for p in posts {
                let ib = p.doc_id.as_bytes();
                buf.extend_from_slice(&(ib.len() as u32).to_le_bytes());
                buf.extend_from_slice(ib);
                buf.extend_from_slice(&p.tf.to_le_bytes());
            }
        }
        buf
    }

    /// Deserialize from bytes.
    pub fn from_bytes(data: &[u8]) -> Option<Self> {
        let mut pos = 0usize;
        let read_u32 = |data: &[u8], pos: &mut usize| -> Option<u32> {
            if *pos + 4 > data.len() {
                return None;
            }
            let v = u32::from_le_bytes(data[*pos..*pos + 4].try_into().ok()?);
            *pos += 4;
            Some(v)
        };
        let read_str = |data: &[u8], pos: &mut usize| -> Option<String> {
            let len = read_u32(data, pos)? as usize;
            if *pos + len > data.len() {
                return None;
            }
            let s = std::str::from_utf8(&data[*pos..*pos + len])
                .ok()?
                .to_string();
            *pos += len;
            Some(s)
        };

        let nfields = read_u32(data, &mut pos)? as usize;
        let mut fields = Vec::with_capacity(nfields);
        for _ in 0..nfields {
            fields.push(read_str(data, &mut pos)?);
        }
        let doc_count = read_u32(data, &mut pos)? as usize;
        let npostings = read_u32(data, &mut pos)? as usize;
        let mut postings: HashMap<String, Vec<Posting>> = HashMap::new();
        for _ in 0..npostings {
            let token = read_str(data, &mut pos)?;
            let nposts = read_u32(data, &mut pos)? as usize;
            let mut posts = Vec::with_capacity(nposts);
            for _ in 0..nposts {
                let doc_id = read_str(data, &mut pos)?;
                let tf = read_u32(data, &mut pos)?;
                posts.push(Posting { doc_id, tf });
            }
            postings.insert(token, posts);
        }
        Some(Self {
            postings,
            doc_count,
            fields,
            weights: HashMap::new(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;

    #[test]
    fn test_tokenize() {
        let tokens = tokenize("Hello, World! Testing 123.");
        assert_eq!(tokens, vec!["hello", "world", "testing", "123"]);
    }

    #[test]
    fn test_text_index_basic() {
        let docs = vec![
            doc! { "_id": 1, "title": "The quick brown fox" },
            doc! { "_id": 2, "title": "The lazy brown dog" },
            doc! { "_id": 3, "title": "Quick red car" },
        ];
        let idx = TextIndex::build(&docs, &["title".to_string()], None);
        assert_eq!(idx.doc_count(), 3);

        let results = idx.search("brown", None);
        assert_eq!(results.len(), 2);

        let results = idx.search("quick brown", None);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, "1");
    }

    #[test]
    fn test_text_index_remove() {
        let docs = vec![
            doc! { "_id": "a", "body": "hello world" },
            doc! { "_id": "b", "body": "hello there" },
        ];
        let mut idx = TextIndex::build(&docs, &["body".to_string()], None);
        idx.remove_doc("a");
        let results = idx.search("hello", None);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, "b");
    }

    #[test]
    fn test_text_index_serialize_roundtrip() {
        let docs = vec![
            doc! { "_id": 1, "text": "alpha beta" },
            doc! { "_id": 2, "text": "beta gamma" },
        ];
        let idx = TextIndex::build(&docs, &["text".to_string()], None);
        let bytes = idx.to_bytes();
        let idx2 = TextIndex::from_bytes(&bytes).unwrap();
        assert_eq!(idx2.doc_count(), 2);
        let results = idx2.search("beta", None);
        assert_eq!(results.len(), 2);
    }
}
