use bson::Document;

use super::{Collection, CollectionError, CollectionResult};
use crate::storage::StorageSession;

impl<S: StorageSession> Collection<S> {
    /// Execute aggregation pipeline as a streaming iterator.
    ///
    /// Returns a lazy iterator that processes documents through the pipeline
    /// with constant memory for consecutive streaming stages.  Blocking
    /// stages materialize only at their own boundary.
    ///
    /// # Example
    ///
    /// ```ignore
    /// let mut stream = collection.aggregate_stream(vec![
    ///     doc! { "$match": { "status": "active" } },
    ///     doc! { "$project": { "name": 1 } },
    ///     doc! { "$limit": 10 },
    /// ])?;
    /// while let Some(result) = stream.next() {
    ///     let doc = result?;
    ///     println!("{:?}", doc);
    /// }
    /// ```
    pub fn aggregate_stream(
        &self,
        pipeline: Vec<Document>,
    ) -> CollectionResult<crate::aggregation::DocStream> {
        let (leading_match, remaining_pipeline) = crate::aggregation::optimize_pipeline(&pipeline);

        let docs = match leading_match {
            Some(filter) => self.find(filter)?,
            None => self.find(Document::new())?,
        };

        crate::aggregation::aggregate_stream(docs, &remaining_pipeline)
            .map_err(|e| CollectionError::Other(format!("Aggregation error: {}", e)))
    }

    /// Execute aggregation pipeline, collecting all results.
    ///
    /// Internally delegates to the streaming pipeline and collects results.
    ///
    /// # Arguments
    ///
    /// * `pipeline` - Array of aggregation stages
    ///
    /// # Returns
    ///
    /// Vector of documents after pipeline execution
    ///
    /// # Example
    ///
    /// ```ignore
    /// let results = collection.aggregate(vec![
    ///     doc! { "$match": { "age": { "$gte": 18 } } },
    ///     doc! { "$group": { "_id": "$status", "count": { "$count": {} } } },
    ///     doc! { "$sort": { "count": -1 } },
    /// ])?;
    /// ```
    pub fn aggregate(&self, pipeline: Vec<Document>) -> CollectionResult<Vec<Document>> {
        let stream = self.aggregate_stream(pipeline)?;
        stream
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| CollectionError::Other(format!("Aggregation error: {}", e)))
    }
}
