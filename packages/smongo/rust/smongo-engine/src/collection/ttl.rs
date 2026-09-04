use super::{deserialize_document, now_epoch_millis, Collection, CollectionResult};
use crate::storage::{StorageCursor, StorageSession};

impl<S: StorageSession> Collection<S> {
    /// Delete documents that have expired according to TTL indexes.
    ///
    /// Scans each TTL index for entries whose date field is older than
    /// `now - expire_after_seconds`, and removes the corresponding documents.
    /// Returns the total number of deleted documents.
    ///
    /// This is a synchronous, caller-driven operation (no background thread).
    pub fn reap_expired(&self) -> CollectionResult<u64> {
        let indexes = self.list_indexes()?;
        let mut total_deleted = 0u64;

        for index_spec in &indexes {
            let expire_secs = match index_spec.options.expire_after_seconds {
                Some(s) => s,
                None => continue,
            };
            if index_spec.keys.len() != 1 {
                continue;
            }

            let now_millis = now_epoch_millis();
            let cutoff_millis = now_millis - (expire_secs as i64 * 1000);

            let index_table = format!("{}.idx_{}", self.collection_name, index_spec.name);
            let mut index_cursor = self.session.open_cursor(&index_table)?;

            let mut expired_ids = Vec::new();
            while index_cursor.next().is_ok() {
                let key_raw = index_cursor.get_key_raw()?;
                if key_raw.len() >= 8 {
                    let date_bytes: [u8; 8] = key_raw[..8].try_into().unwrap_or_default();
                    let date_millis = i64::from_be_bytes(date_bytes);
                    if date_millis > cutoff_millis {
                        break;
                    }
                    expired_ids.push(index_cursor.get_value_str()?);
                }
            }
            drop(index_cursor);

            for id_str in expired_ids {
                let mut data_cursor = self.cursor()?;
                data_cursor.set_key_str(&id_str);
                if data_cursor.search().is_ok() {
                    let doc_bytes = data_cursor.get_value_raw()?;
                    let doc = deserialize_document(&doc_bytes)?;
                    self.remove_from_indexes(&doc)?;
                    data_cursor.set_key_str(&id_str);
                    if data_cursor.search().is_ok() {
                        data_cursor.remove()?;
                        total_deleted += 1;
                    }
                }
            }
        }

        Ok(total_deleted)
    }
}
