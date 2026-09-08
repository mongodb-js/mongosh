//! Spill-to-disk support for memory-intensive aggregation stages.
//!
//! When `allow_disk_use` is enabled and intermediate data exceeds
//! `memory_limit_bytes`, `$sort` and `$group` write temporary sorted
//! runs / hash-partitions to disk and merge them on read.
//!
//! Only compiled on non-WASM targets (no filesystem on wasm32).

use std::collections::BinaryHeap;
use std::io::{BufReader, BufWriter, Read, Write};

use bson::{Bson, Document};
use tempfile::NamedTempFile;

use super::expressions::evaluate_expression;
use super::stages::estimate_doc_bytes;
use super::{bson_to_key_string, compare_bson, AggregationError, AggregationResult, DocStream};
use crate::paths::get_value;

const NUM_PARTITIONS: usize = 64;

// ---------------------------------------------------------------------------
// Spill file I/O — raw BSON documents written back-to-back
// ---------------------------------------------------------------------------

struct SpillWriter {
    writer: BufWriter<NamedTempFile>,
    doc_count: usize,
}

impl SpillWriter {
    fn new() -> AggregationResult<Self> {
        let tmp = NamedTempFile::new()
            .map_err(|e| AggregationError::Other(format!("disk spill: create temp file: {e}")))?;
        Ok(Self {
            writer: BufWriter::new(tmp),
            doc_count: 0,
        })
    }

    fn write_doc(&mut self, doc: &Document) -> AggregationResult<()> {
        let bytes = bson::to_vec(doc)
            .map_err(|e| AggregationError::Other(format!("disk spill: serialize: {e}")))?;
        self.writer
            .write_all(&bytes)
            .map_err(|e| AggregationError::Other(format!("disk spill: write: {e}")))?;
        self.doc_count += 1;
        Ok(())
    }

    fn flush_and_reopen(self) -> AggregationResult<SpillReader> {
        let mut writer = self.writer;
        writer
            .flush()
            .map_err(|e| AggregationError::Other(format!("disk spill: flush: {e}")))?;
        let tmp = writer
            .into_inner()
            .map_err(|e| AggregationError::Other(format!("disk spill: into_inner: {e}")))?;
        let file = tmp
            .reopen()
            .map_err(|e| AggregationError::Other(format!("disk spill: reopen: {e}")))?;
        Ok(SpillReader {
            reader: BufReader::new(file),
            remaining: self.doc_count,
        })
    }
}

struct SpillReader {
    reader: BufReader<std::fs::File>,
    remaining: usize,
}

impl SpillReader {
    fn read_doc(&mut self) -> AggregationResult<Option<Document>> {
        if self.remaining == 0 {
            return Ok(None);
        }
        let mut len_buf = [0u8; 4];
        match self.reader.read_exact(&mut len_buf) {
            Ok(()) => {}
            Err(e) if e.kind() == std::io::ErrorKind::UnexpectedEof => return Ok(None),
            Err(e) => {
                return Err(AggregationError::Other(format!(
                    "disk spill: read length: {e}"
                )))
            }
        }
        let doc_len = i32::from_le_bytes(len_buf) as usize;
        let mut buf = vec![0u8; doc_len];
        buf[..4].copy_from_slice(&len_buf);
        self.reader
            .read_exact(&mut buf[4..])
            .map_err(|e| AggregationError::Other(format!("disk spill: read doc: {e}")))?;
        let doc = bson::from_slice(&buf)
            .map_err(|e| AggregationError::Other(format!("disk spill: deserialize: {e}")))?;
        self.remaining -= 1;
        Ok(Some(doc))
    }

    fn read_all(mut self) -> AggregationResult<Vec<Document>> {
        let mut docs = Vec::with_capacity(self.remaining);
        while let Some(doc) = self.read_doc()? {
            docs.push(doc);
        }
        Ok(docs)
    }
}

// ---------------------------------------------------------------------------
// External merge sort for $sort
// ---------------------------------------------------------------------------

/// Comparator wrapper for the k-way merge heap. BinaryHeap is a max-heap,
/// so we reverse the ordering to get a min-heap.
struct MergeEntry {
    doc: Document,
    run_idx: usize,
    sort_fields: std::sync::Arc<Vec<(String, i32)>>,
}

impl PartialEq for MergeEntry {
    fn eq(&self, other: &Self) -> bool {
        self.cmp(other) == std::cmp::Ordering::Equal
    }
}

impl Eq for MergeEntry {}

impl PartialOrd for MergeEntry {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for MergeEntry {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // Reversed for min-heap behaviour in BinaryHeap (which is max-heap).
        let fwd = cmp_by_sort_fields(&self.doc, &other.doc, &self.sort_fields);
        fwd.reverse()
    }
}

fn cmp_by_sort_fields(
    a: &Document,
    b: &Document,
    sort_fields: &[(String, i32)],
) -> std::cmp::Ordering {
    for (field, dir) in sort_fields {
        let va = get_value(a, field);
        let vb = get_value(b, field);
        let cmp = compare_bson(va, vb);
        let result = if *dir < 0 { cmp.reverse() } else { cmp };
        if result != std::cmp::Ordering::Equal {
            return result;
        }
    }
    std::cmp::Ordering::Equal
}

/// External merge sort: reads docs from `input`, writes sorted runs when
/// memory is exceeded, then k-way merges all runs into a single stream.
pub(crate) fn external_sort(
    input: DocStream,
    sort_spec: &Bson,
    memory_limit: usize,
) -> AggregationResult<Vec<Document>> {
    let sort_doc = sort_spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$sort requires document".into()))?;

    let sort_fields: Vec<(String, i32)> = sort_doc
        .iter()
        .map(|(k, v)| (k.clone(), v.as_i32().unwrap_or(1)))
        .collect();

    let mut buffer: Vec<Document> = Vec::new();
    let mut buffer_bytes: usize = 0;
    let mut spill_runs: Vec<SpillReader> = Vec::new();

    for result in input {
        let doc = result?;
        let size = estimate_doc_bytes(&doc);
        buffer.push(doc);
        buffer_bytes += size;

        if buffer_bytes >= memory_limit {
            buffer.sort_by(|a, b| cmp_by_sort_fields(a, b, &sort_fields));
            let mut writer = SpillWriter::new()?;
            for d in &buffer {
                writer.write_doc(d)?;
            }
            spill_runs.push(writer.flush_and_reopen()?);
            buffer.clear();
            buffer_bytes = 0;
        }
    }

    if spill_runs.is_empty() {
        buffer.sort_by(|a, b| cmp_by_sort_fields(a, b, &sort_fields));
        return Ok(buffer);
    }

    // Flush remaining buffer as the last run.
    if !buffer.is_empty() {
        buffer.sort_by(|a, b| cmp_by_sort_fields(a, b, &sort_fields));
        let mut writer = SpillWriter::new()?;
        for d in &buffer {
            writer.write_doc(d)?;
        }
        spill_runs.push(writer.flush_and_reopen()?);
        drop(buffer);
    }

    // K-way merge using a min-heap.
    let sf = std::sync::Arc::new(sort_fields);
    let mut heap: BinaryHeap<MergeEntry> = BinaryHeap::new();

    for (i, run) in spill_runs.iter_mut().enumerate() {
        if let Some(doc) = run.read_doc()? {
            heap.push(MergeEntry {
                doc,
                run_idx: i,
                sort_fields: sf.clone(),
            });
        }
    }

    let mut merged = Vec::new();
    while let Some(entry) = heap.pop() {
        let run_idx = entry.run_idx;
        merged.push(entry.doc);
        if let Some(next_doc) = spill_runs[run_idx].read_doc()? {
            heap.push(MergeEntry {
                doc: next_doc,
                run_idx,
                sort_fields: sf.clone(),
            });
        }
    }

    Ok(merged)
}

// ---------------------------------------------------------------------------
// External hash-partition group for $group
// ---------------------------------------------------------------------------

fn hash_group_key(key: &str) -> usize {
    let mut h: u64 = 5381;
    for b in key.as_bytes() {
        h = h.wrapping_mul(31).wrapping_add(*b as u64);
    }
    h as usize % NUM_PARTITIONS
}

/// External hash-partition $group: when in-memory data exceeds the limit,
/// partitions documents by group-key hash to temp files, then processes
/// each partition independently with the in-memory grouper.
pub(crate) fn external_group(
    input: DocStream,
    group_spec: &Bson,
    memory_limit: usize,
) -> AggregationResult<Vec<Document>> {
    let group_doc = group_spec
        .as_document()
        .ok_or_else(|| AggregationError::InvalidStage("$group requires document".into()))?;

    let id_expr = group_doc
        .get("_id")
        .ok_or_else(|| AggregationError::MissingField("_id required in $group".into()))?
        .clone();

    let mut buffer: Vec<Document> = Vec::new();
    let mut buffer_bytes: usize = 0;
    let mut spilled = false;
    let mut partition_writers: Option<Vec<SpillWriter>> = None;

    for result in input {
        let doc = result?;
        let size = estimate_doc_bytes(&doc);

        if !spilled {
            buffer.push(doc);
            buffer_bytes += size;

            if buffer_bytes >= memory_limit {
                spilled = true;
                let mut writers: Vec<SpillWriter> = Vec::new();
                for _ in 0..NUM_PARTITIONS {
                    writers.push(SpillWriter::new()?);
                }
                for buffered_doc in buffer.drain(..) {
                    let key = evaluate_expression(&buffered_doc, &id_expr)?;
                    let key_str = bson_to_key_string(&key);
                    let partition = hash_group_key(&key_str);
                    writers[partition].write_doc(&buffered_doc)?;
                }
                partition_writers = Some(writers);
            }
        } else {
            let key = evaluate_expression(&doc, &id_expr)?;
            let key_str = bson_to_key_string(&key);
            let partition = hash_group_key(&key_str);
            partition_writers.as_mut().ok_or_else(|| {
                AggregationError::Other("disk spill: missing partition writers".into())
            })?[partition]
                .write_doc(&doc)?;
        }
    }

    if !spilled {
        return super::stages::stage_group(buffer, group_spec);
    }

    let writers = partition_writers
        .ok_or_else(|| AggregationError::Other("disk spill: missing partition writers".into()))?;
    let mut all_results: Vec<Document> = Vec::new();

    for writer in writers {
        if writer.doc_count == 0 {
            continue;
        }
        let reader = writer.flush_and_reopen()?;
        let partition_docs = reader.read_all()?;
        let mut grouped = super::stages::stage_group(partition_docs, group_spec)?;
        all_results.append(&mut grouped);
    }

    Ok(all_results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;

    fn docs_to_stream(docs: Vec<Document>) -> DocStream {
        Box::new(docs.into_iter().map(Ok))
    }

    #[test]
    fn test_external_sort_fits_in_memory() {
        let docs = vec![doc! {"v": 3}, doc! {"v": 1}, doc! {"v": 2}];
        let sort_spec = Bson::Document(doc! {"v": 1});
        let result = external_sort(docs_to_stream(docs), &sort_spec, 1024 * 1024).unwrap();
        assert_eq!(result[0].get_i32("v").unwrap(), 1);
        assert_eq!(result[1].get_i32("v").unwrap(), 2);
        assert_eq!(result[2].get_i32("v").unwrap(), 3);
    }

    #[test]
    fn test_external_sort_spills() {
        let docs: Vec<Document> = (0..200).rev().map(|i| doc! {"v": i}).collect();
        let sort_spec = Bson::Document(doc! {"v": 1});
        // Tiny limit forces multiple spill runs.
        let result = external_sort(docs_to_stream(docs), &sort_spec, 512).unwrap();
        assert_eq!(result.len(), 200);
        for (i, d) in result.iter().enumerate() {
            assert_eq!(d.get_i32("v").unwrap(), i as i32);
        }
    }

    #[test]
    fn test_external_sort_descending() {
        let docs: Vec<Document> = (0..100).map(|i| doc! {"v": i}).collect();
        let sort_spec = Bson::Document(doc! {"v": -1});
        let result = external_sort(docs_to_stream(docs), &sort_spec, 256).unwrap();
        assert_eq!(result.len(), 100);
        assert_eq!(result[0].get_i32("v").unwrap(), 99);
        assert_eq!(result[99].get_i32("v").unwrap(), 0);
    }

    #[test]
    fn test_external_group_fits_in_memory() {
        let docs = vec![
            doc! {"dept": "eng", "salary": 100},
            doc! {"dept": "eng", "salary": 200},
            doc! {"dept": "hr", "salary": 150},
        ];
        let spec = Bson::Document(doc! {
            "_id": "$dept",
            "total": {"$sum": "$salary"},
        });
        let result = external_group(docs_to_stream(docs), &spec, 1024 * 1024).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_external_group_spills() {
        let docs: Vec<Document> = (0..200)
            .map(|i| doc! {"key": format!("k{}", i % 20), "v": 1})
            .collect();
        let spec = Bson::Document(doc! {
            "_id": "$key",
            "total": {"$sum": "$v"},
        });
        // Tiny limit forces spill.
        let mut result = external_group(docs_to_stream(docs), &spec, 512).unwrap();
        assert_eq!(result.len(), 20);
        result.sort_by(|a, b| {
            let ka = a.get_str("_id").unwrap_or("");
            let kb = b.get_str("_id").unwrap_or("");
            ka.cmp(kb)
        });
        for d in &result {
            assert_eq!(d.get_i64("total").unwrap(), 10);
        }
    }
}
