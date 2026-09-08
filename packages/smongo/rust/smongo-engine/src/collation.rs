//! MongoDB-compatible collation support.
//!
//! Implements the subset of ICU collation rules that matters for an embedded
//! engine: case sensitivity (`strength` 1–2 = case-insensitive), diacritics
//! (currently coerced to base characters only at strength 1), and
//! `numericOrdering` (sort "file10" after "file2").

use bson::{Bson, Document};
use std::cmp::Ordering;

/// Parsed collation options.  Constructed from a BSON document matching the
/// [MongoDB collation specification](https://www.mongodb.com/docs/manual/reference/collation/).
#[derive(Debug, Clone)]
pub struct Collation {
    pub locale: String,
    /// ICU strength level (1–5).
    /// 1 = base characters only (case + diacritic insensitive)
    /// 2 = case-insensitive, diacritic-sensitive
    /// 3 = case-sensitive (default)
    pub strength: u8,
    /// When `true`, strings that look like numbers compare numerically.
    pub numeric_ordering: bool,
    /// "upper" | "lower" | "off" — controls case-first ordering.
    pub case_first: CaseFirst,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CaseFirst {
    Upper,
    Lower,
    Off,
}

impl Default for Collation {
    fn default() -> Self {
        Self {
            locale: "simple".to_string(),
            strength: 3,
            numeric_ordering: false,
            case_first: CaseFirst::Off,
        }
    }
}

impl Collation {
    /// Parse a collation from a BSON document.
    pub fn from_doc(doc: &Document) -> Self {
        let locale = doc.get_str("locale").unwrap_or("simple").to_string();
        let strength = doc
            .get("strength")
            .and_then(|v| match v {
                Bson::Int32(n) => Some(*n as u8),
                Bson::Int64(n) => Some(*n as u8),
                _ => None,
            })
            .unwrap_or(3);
        let numeric_ordering = doc.get_bool("numericOrdering").unwrap_or(false);
        let case_first = match doc.get_str("caseFirst").unwrap_or("off") {
            "upper" => CaseFirst::Upper,
            "lower" => CaseFirst::Lower,
            _ => CaseFirst::Off,
        };
        Self {
            locale,
            strength,
            numeric_ordering,
            case_first,
        }
    }

    /// Whether this collation treats strings case-insensitively.
    #[inline]
    pub fn case_insensitive(&self) -> bool {
        self.strength <= 2
    }

    /// Transform a string for comparison according to this collation.
    ///
    /// At strength 1–2, the string is lowercased (simple Unicode case fold).
    /// At strength 1, basic ASCII diacritics are also stripped (approximate).
    pub fn sort_key(&self, s: &str) -> String {
        if self.strength >= 3 {
            s.to_string()
        } else if self.strength == 1 {
            strip_diacritics(&s.to_lowercase())
        } else {
            s.to_lowercase()
        }
    }

    /// Compare two strings under this collation.
    pub fn compare_str(&self, a: &str, b: &str) -> Ordering {
        if self.numeric_ordering {
            return numeric_string_cmp(a, b, self.case_insensitive());
        }

        let ka = self.sort_key(a);
        let kb = self.sort_key(b);
        ka.cmp(&kb)
    }

    /// Compare two BSON values under this collation (delegates to the default
    /// comparison for non-string types).
    pub fn compare_bson(&self, a: Option<&Bson>, b: Option<&Bson>) -> Ordering {
        match (a, b) {
            (Some(Bson::String(sa)), Some(Bson::String(sb))) => self.compare_str(sa, sb),
            // numericOrdering: treat numeric-looking strings as numbers
            (Some(Bson::String(sa)), Some(nb)) if self.numeric_ordering && is_numeric_bson(nb) => {
                match sa.parse::<f64>() {
                    Ok(fa) => fa
                        .partial_cmp(&bson_as_f64(nb).unwrap_or(0.0))
                        .unwrap_or(Ordering::Equal),
                    Err(_) => Ordering::Greater, // non-numeric string > number
                }
            }
            _ => crate::aggregation::compare_bson(a, b),
        }
    }

    /// Transform a string value for index key encoding.
    /// Returns the byte representation that should be stored in the B-tree.
    pub fn index_key_bytes(&self, s: &str) -> Vec<u8> {
        if self.numeric_ordering {
            if let Ok(n) = s.parse::<f64>() {
                return n.to_be_bytes().to_vec();
            }
        }
        self.sort_key(s).into_bytes()
    }
}

fn is_numeric_bson(b: &Bson) -> bool {
    matches!(b, Bson::Int32(_) | Bson::Int64(_) | Bson::Double(_))
}

fn bson_as_f64(b: &Bson) -> Option<f64> {
    match b {
        Bson::Int32(n) => Some(*n as f64),
        Bson::Int64(n) => Some(*n as f64),
        Bson::Double(n) => Some(*n),
        _ => None,
    }
}

/// Compare two strings with numeric awareness.
///
/// Splits each string into alternating text/number segments and compares them
/// pairwise.  Number segments compare by value (so "file2" < "file10").
fn numeric_string_cmp(a: &str, b: &str, case_insensitive: bool) -> Ordering {
    let segs_a = split_numeric(a);
    let segs_b = split_numeric(b);

    for (sa, sb) in segs_a.iter().zip(segs_b.iter()) {
        let ord = match (sa, sb) {
            (Segment::Number(na), Segment::Number(nb)) => {
                na.partial_cmp(nb).unwrap_or(Ordering::Equal)
            }
            (Segment::Text(ta), Segment::Text(tb)) => {
                if case_insensitive {
                    ta.to_lowercase().cmp(&tb.to_lowercase())
                } else {
                    ta.cmp(tb)
                }
            }
            (Segment::Number(_), Segment::Text(_)) => Ordering::Less,
            (Segment::Text(_), Segment::Number(_)) => Ordering::Greater,
        };
        if ord != Ordering::Equal {
            return ord;
        }
    }
    segs_a.len().cmp(&segs_b.len())
}

#[derive(Debug)]
enum Segment {
    Text(String),
    Number(f64),
}

fn split_numeric(s: &str) -> Vec<Segment> {
    let mut segments = Vec::new();
    let mut chars = s.chars().peekable();

    while chars.peek().is_some() {
        let Some(&c) = chars.peek() else { break };
        if c.is_ascii_digit() || (c == '-' && segments.is_empty()) {
            let mut num_str = String::new();
            while let Some(&nc) = chars.peek() {
                if nc.is_ascii_digit() || nc == '.' {
                    num_str.push(nc);
                    chars.next();
                } else {
                    break;
                }
            }
            if let Ok(n) = num_str.parse::<f64>() {
                segments.push(Segment::Number(n));
            } else {
                segments.push(Segment::Text(num_str));
            }
        } else {
            let mut text = String::new();
            while let Some(&nc) = chars.peek() {
                if nc.is_ascii_digit() {
                    break;
                }
                text.push(nc);
                chars.next();
            }
            segments.push(Segment::Text(text));
        }
    }
    segments
}

/// Approximate ASCII diacritic stripping.
fn strip_diacritics(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'à' | 'á' | 'â' | 'ã' | 'ä' | 'å' => 'a',
            'è' | 'é' | 'ê' | 'ë' => 'e',
            'ì' | 'í' | 'î' | 'ï' => 'i',
            'ò' | 'ó' | 'ô' | 'õ' | 'ö' => 'o',
            'ù' | 'ú' | 'û' | 'ü' => 'u',
            'ñ' => 'n',
            'ç' => 'c',
            _ => c,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn case_insensitive_strength_2() {
        let c = Collation {
            strength: 2,
            ..Default::default()
        };
        assert_eq!(c.compare_str("ABC", "abc"), Ordering::Equal);
        assert_eq!(c.compare_str("Abc", "aBc"), Ordering::Equal);
    }

    #[test]
    fn case_sensitive_default() {
        let c = Collation::default();
        assert_ne!(c.compare_str("ABC", "abc"), Ordering::Equal);
    }

    #[test]
    fn numeric_ordering() {
        let c = Collation {
            numeric_ordering: true,
            ..Default::default()
        };
        assert_eq!(c.compare_str("file2", "file10"), Ordering::Less);
        assert_eq!(c.compare_str("file10", "file2"), Ordering::Greater);
        assert_eq!(c.compare_str("file10", "file10"), Ordering::Equal);
    }

    #[test]
    fn strength_1_strips_diacritics() {
        let c = Collation {
            strength: 1,
            ..Default::default()
        };
        assert_eq!(c.compare_str("café", "cafe"), Ordering::Equal);
        assert_eq!(c.compare_str("naïve", "naive"), Ordering::Equal);
    }

    #[test]
    fn from_doc() {
        let doc = bson::doc! {
            "locale": "en",
            "strength": 2,
            "numericOrdering": true,
            "caseFirst": "upper"
        };
        let c = Collation::from_doc(&doc);
        assert_eq!(c.locale, "en");
        assert_eq!(c.strength, 2);
        assert!(c.numeric_ordering);
        assert_eq!(c.case_first, CaseFirst::Upper);
    }

    #[test]
    fn index_key_bytes_case_insensitive() {
        let c = Collation {
            strength: 2,
            ..Default::default()
        };
        assert_eq!(c.index_key_bytes("Hello"), c.index_key_bytes("hello"));
    }

    #[test]
    fn index_key_bytes_numeric() {
        let c = Collation {
            numeric_ordering: true,
            ..Default::default()
        };
        let k2 = c.index_key_bytes("2");
        let k10 = c.index_key_bytes("10");
        assert!(k2 < k10, "2 should sort before 10 in numeric ordering");
    }
}
