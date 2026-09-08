use super::{Collection, CollectionError, CollectionResult};
use crate::storage::StorageSession;

impl<S: StorageSession> Collection<S> {
    /// Begin a transaction on this collection's storage session.
    ///
    /// All subsequent CRUD operations will be part of the transaction
    /// until [`commit_transaction`] or [`rollback_transaction`] is called.
    pub fn begin_transaction(&self) -> CollectionResult<()> {
        self.session
            .begin_transaction()
            .map_err(CollectionError::from)
    }

    /// Commit the active transaction, making all writes durable.
    pub fn commit_transaction(&self) -> CollectionResult<()> {
        self.session
            .commit_transaction()
            .map_err(CollectionError::from)
    }

    /// Roll back the active transaction, discarding all writes.
    pub fn rollback_transaction(&self) -> CollectionResult<()> {
        self.session
            .rollback_transaction()
            .map_err(CollectionError::from)
    }

    /// Execute `f` inside a transaction. Commits on `Ok`, rolls back on `Err`.
    pub fn with_transaction<F, R>(&self, f: F) -> CollectionResult<R>
    where
        F: FnOnce() -> CollectionResult<R>,
    {
        self.begin_transaction()?;
        match f() {
            Ok(result) => {
                self.commit_transaction()?;
                Ok(result)
            }
            Err(e) => {
                let _ = self.rollback_transaction();
                Err(e)
            }
        }
    }
}
