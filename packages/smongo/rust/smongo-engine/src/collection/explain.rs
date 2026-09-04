use bson::Document;

use super::{deserialize_document, Collection, CollectionError, CollectionResult};
use crate::explain::{ExecutionStats, ExplainResult};
use crate::planner::{plan_query, ExecutionPlan};
use crate::query::eval_query;
use crate::storage::{StorageCursor, StorageSession};

impl<S: StorageSession> Collection<S> {
    /// Explain how a find_one query would execute without running it
    ///
    /// # Arguments
    ///
    /// * `filter` - Query filter to explain
    ///
    /// # Returns
    ///
    /// ExplainResult showing execution plan and estimated statistics
    ///
    /// # Example
    ///
    /// ```ignore
    /// let explain = collection.explain_find_one(doc! { "email": "alice@example.com" })?;
    /// println!("Plan: {:?}", explain.execution_plan);
    /// println!("Index: {:?}", explain.index_used);
    /// println!("{}", explain.summary());
    /// ```
    pub fn explain_find_one(&self, filter: Document) -> CollectionResult<ExplainResult> {
        let indexes = self.list_indexes()?;
        let plan = plan_query(&filter, &indexes);

        let mut explain =
            ExplainResult::new(filter.clone(), plan.execution_plan.clone(), plan.reason);

        self.estimate_query_stats(&filter, &plan.execution_plan, &mut explain.execution_stats)?;

        Ok(explain)
    }

    /// Explain how a find query would execute without running it
    ///
    /// # Arguments
    ///
    /// * `filter` - Query filter to explain
    ///
    /// # Returns
    ///
    /// ExplainResult showing execution plan and estimated statistics
    ///
    /// # Example
    ///
    /// ```ignore
    /// let explain = collection.explain_find(doc! { "age": { "$gte": 18 } })?;
    /// println!("Would examine {} documents", explain.execution_stats.documents_examined);
    /// println!("Would return {} documents", explain.execution_stats.documents_returned);
    /// println!("Efficiency: {:.1}%", explain.efficiency() * 100.0);
    /// ```
    pub fn explain_find(&self, filter: Document) -> CollectionResult<ExplainResult> {
        let indexes = self.list_indexes()?;
        let plan = plan_query(&filter, &indexes);

        let mut explain =
            ExplainResult::new(filter.clone(), plan.execution_plan.clone(), plan.reason);

        self.estimate_query_stats(&filter, &plan.execution_plan, &mut explain.execution_stats)?;

        Ok(explain)
    }

    /// Explain how an aggregation pipeline's initial data fetch would execute.
    ///
    /// Runs the pipeline optimizer to extract any leading `$match` stages,
    /// then explains the resulting `find()` the same way `explain_find` does.
    /// This shows whether the pipeline benefits from index usage.
    ///
    /// # Example
    ///
    /// ```ignore
    /// let explain = collection.explain_aggregate(vec![
    ///     doc! { "$match": { "status": "active" } },
    ///     doc! { "$group": { "_id": "$dept", "count": { "$count": {} } } },
    /// ])?;
    /// println!("{}", explain.summary());
    /// ```
    pub fn explain_aggregate(&self, pipeline: Vec<Document>) -> CollectionResult<ExplainResult> {
        let (leading_match, _remaining) = crate::aggregation::optimize_pipeline(&pipeline);
        let filter = leading_match.unwrap_or_default();
        self.explain_find(filter)
    }

    /// Estimate query statistics by analyzing the collection
    fn estimate_query_stats(
        &self,
        filter: &Document,
        execution_plan: &ExecutionPlan,
        stats: &mut ExecutionStats,
    ) -> CollectionResult<()> {
        match execution_plan {
            ExecutionPlan::CollectionScan => {
                let mut cursor = self.cursor()?;
                if cursor.next().is_err() {
                    return Ok(());
                }

                loop {
                    stats.inc_documents_examined();

                    let doc_bytes = cursor.get_value_raw()?;
                    let doc = deserialize_document(&doc_bytes)?;

                    if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                        stats.inc_documents_returned();
                    }

                    if cursor.next().is_err() {
                        break;
                    }
                }
            }
            ExecutionPlan::IndexScan { index_name, .. }
            | ExecutionPlan::IndexSeek { index_name, .. }
            | ExecutionPlan::CoveringIndexScan { index_name, .. }
            | ExecutionPlan::SortedIndexScan { index_name, .. }
            | ExecutionPlan::GeoNear { index_name, .. }
            | ExecutionPlan::GeoCapWithin { index_name, .. }
            | ExecutionPlan::GeoCellCover { index_name, .. } => {
                let index_table_name = format!("{}.idx_{}", self.collection_name, index_name);
                let mut index_cursor = self.session.open_cursor(&index_table_name)?;

                if index_cursor.next().is_err() {
                    return Ok(());
                }

                let is_covering = matches!(execution_plan, ExecutionPlan::CoveringIndexScan { .. });

                loop {
                    stats.inc_index_entries_examined();

                    if !is_covering {
                        let id_str = index_cursor.get_value_str()?;

                        let mut data_cursor = self.cursor()?;
                        data_cursor.set_key_str(&id_str);
                        if data_cursor.search().is_ok() {
                            stats.inc_documents_examined();

                            let doc_bytes = data_cursor.get_value_raw()?;
                            let doc = deserialize_document(&doc_bytes)?;

                            if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                                stats.inc_documents_returned();
                            }
                        }
                    } else {
                        stats.inc_documents_returned();
                    }

                    if index_cursor.next().is_err() {
                        break;
                    }
                }
            }
            ExecutionPlan::OrUnionPlans { .. }
            | ExecutionPlan::VectorIndexSearch { .. }
            | ExecutionPlan::BitmapScan { .. }
            | ExecutionPlan::TextIndexScan { .. }
            | ExecutionPlan::PrefixIndexScan { .. } => {
                let docs = self.execute_plan(execution_plan, filter)?;
                for _ in docs {
                    stats.inc_documents_examined();
                    stats.inc_documents_returned();
                }
            }
        }

        Ok(())
    }
}
