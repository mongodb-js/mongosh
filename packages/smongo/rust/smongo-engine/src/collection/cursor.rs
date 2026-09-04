use bson::Document;
use std::marker::PhantomData;

use super::{deserialize_document, Collection, CollectionError, CollectionResult};
use crate::query::eval_query;
use crate::storage::{StorageCursor, StorageSession};

pub(super) enum FindCursorState<C: StorageCursor> {
    CollectionScan {
        cursor: C,
    },
    IndexScan {
        index_cursor: C,
        data_cursor: C,
    },
    IndexSeek {
        index_cursor: C,
        data_cursor: C,
        seek_key: Vec<u8>,
        positioned: bool,
    },
    /// Precomputed matches (geospatial `$or` unions, `$near` sort, etc.).
    Materialized {
        docs: Vec<Document>,
        next_ix: usize,
    },
}

/// Streaming cursor over query results. Yields matching documents one at a
/// time without materializing the full result set.
///
/// Created by [`Collection::find_iter`]. The lifetime parameter ensures the
/// cursor cannot outlive the `Collection` (and its underlying storage session).
pub struct FindCursor<'a, C: StorageCursor> {
    pub(super) state: FindCursorState<C>,
    pub(super) filter: Document,
    pub(super) _lifetime: PhantomData<&'a ()>,
}

impl<'a, C: StorageCursor> Iterator for FindCursor<'a, C> {
    type Item = CollectionResult<Document>;

    #[inline]
    fn next(&mut self) -> Option<Self::Item> {
        find_cursor_next(&mut self.state, &self.filter)
    }
}

/// Owned streaming iterator over query results.
///
/// Unlike [`FindCursor`] (which borrows its parent `Collection` via
/// `PhantomData`), this type **consumes** the `Collection` and holds the
/// cursor state directly -- no lifetime parameters, no `Box<dyn>`, no
/// type erasure.  The `Collection` is kept alive so the storage session
/// (which the cursors reference via `Arc`) remains valid.
///
/// This makes it safe to hand to FFI layers (e.g. PyO3 `#[pyclass]`) that
/// require owned, `Send`, `'static` types.
///
/// Created by [`Collection::find_into_iter`].
pub struct OwnedFindIter<S: StorageSession> {
    /// Keeps the session alive for the cursors inside `state`.
    pub(super) _collection: Collection<S>,
    pub(super) state: FindCursorState<S::Cursor>,
    pub(super) filter: Document,
}

impl<S: StorageSession> Iterator for OwnedFindIter<S> {
    type Item = CollectionResult<Document>;

    fn next(&mut self) -> Option<Self::Item> {
        find_cursor_next(&mut self.state, &self.filter)
    }
}

/// Shared iteration logic for both [`FindCursor`] and [`OwnedFindIter`].
fn find_cursor_next<C: StorageCursor>(
    state: &mut FindCursorState<C>,
    filter: &Document,
) -> Option<CollectionResult<Document>> {
    loop {
        match state {
            FindCursorState::CollectionScan { cursor } => {
                if cursor.next().is_err() {
                    return None;
                }
                let doc_bytes = match cursor.get_value_raw() {
                    Ok(b) => b,
                    Err(e) => return Some(Err(e.into())),
                };
                let doc = match deserialize_document(&doc_bytes) {
                    Ok(d) => d,
                    Err(e) => return Some(Err(e)),
                };
                match eval_query(&doc, filter) {
                    Ok(true) => return Some(Ok(doc)),
                    Ok(false) => continue,
                    Err(e) => return Some(Err(CollectionError::QueryError(e))),
                }
            }
            FindCursorState::IndexScan {
                index_cursor,
                data_cursor,
            } => {
                if index_cursor.next().is_err() {
                    return None;
                }
                let id_str = match index_cursor.get_value_str() {
                    Ok(s) => s,
                    Err(e) => return Some(Err(e.into())),
                };
                data_cursor.set_key_str(&id_str);
                if data_cursor.search().is_err() {
                    continue;
                }
                let doc_bytes = match data_cursor.get_value_raw() {
                    Ok(b) => b,
                    Err(e) => return Some(Err(e.into())),
                };
                let doc = match deserialize_document(&doc_bytes) {
                    Ok(d) => d,
                    Err(e) => return Some(Err(e)),
                };
                match eval_query(&doc, filter) {
                    Ok(true) => return Some(Ok(doc)),
                    Ok(false) => continue,
                    Err(e) => return Some(Err(CollectionError::QueryError(e))),
                }
            }
            FindCursorState::Materialized { docs, next_ix } => {
                if *next_ix < docs.len() {
                    let doc = docs[*next_ix].clone();
                    *next_ix += 1;
                    return Some(Ok(doc));
                }
                return None;
            }
            FindCursorState::IndexSeek {
                index_cursor,
                data_cursor,
                seek_key,
                positioned,
            } => {
                if !*positioned {
                    *positioned = true;
                    index_cursor.set_key_raw(seek_key);
                    match index_cursor.search_near() {
                        Ok(exact) => {
                            if exact < 0 && index_cursor.next().is_err() {
                                return None;
                            }
                        }
                        Err(_) => return None,
                    }
                } else if index_cursor.next().is_err() {
                    return None;
                }

                let index_key_raw = match index_cursor.get_key_raw() {
                    Ok(k) => k,
                    Err(e) => return Some(Err(e.into())),
                };
                if !index_key_raw.starts_with(seek_key) {
                    return None;
                }

                let id_str = match index_cursor.get_value_str() {
                    Ok(s) => s,
                    Err(e) => return Some(Err(e.into())),
                };
                data_cursor.set_key_str(&id_str);
                if data_cursor.search().is_err() {
                    continue;
                }
                let doc_bytes = match data_cursor.get_value_raw() {
                    Ok(b) => b,
                    Err(e) => return Some(Err(e.into())),
                };
                let doc = match deserialize_document(&doc_bytes) {
                    Ok(d) => d,
                    Err(e) => return Some(Err(e)),
                };
                match eval_query(&doc, filter) {
                    Ok(true) => return Some(Ok(doc)),
                    Ok(false) => continue,
                    Err(e) => return Some(Err(CollectionError::QueryError(e))),
                }
            }
        }
    }
}
