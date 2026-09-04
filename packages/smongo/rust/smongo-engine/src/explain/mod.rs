//! Query execution explanation and statistics.
//!
//! This module provides explain functionality to show how queries are executed,
//! which indexes are used, and performance statistics.

use bson::Document;
use serde::{Deserialize, Serialize};

use crate::planner::ExecutionPlan;

/// Execution statistics for a query
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ExecutionStats {
    /// Number of documents examined during execution
    pub documents_examined: u64,
    /// Number of documents returned as results
    pub documents_returned: u64,
    /// Number of index entries examined (if index used)
    pub index_entries_examined: u64,
    /// Execution time in microseconds (if measured)
    pub execution_time_micros: Option<u64>,
}

impl ExecutionStats {
    /// Create new empty execution stats
    pub fn new() -> Self {
        Self::default()
    }

    /// Increment documents examined counter
    pub fn inc_documents_examined(&mut self) {
        self.documents_examined += 1;
    }

    /// Increment documents returned counter
    pub fn inc_documents_returned(&mut self) {
        self.documents_returned += 1;
    }

    /// Increment index entries examined counter
    pub fn inc_index_entries_examined(&mut self) {
        self.index_entries_examined += 1;
    }

    /// Set execution time
    pub fn set_execution_time_micros(&mut self, micros: u64) {
        self.execution_time_micros = Some(micros);
    }
}

/// Explanation of query execution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplainResult {
    /// The query filter that was explained
    pub query_filter: Document,
    /// Execution plan used
    pub execution_plan: ExecutionPlanExplain,
    /// Execution statistics
    pub execution_stats: ExecutionStats,
    /// Index used (if any)
    pub index_used: Option<String>,
    /// Reason for plan selection
    pub plan_reason: String,
}

/// Simplified execution plan for explain output
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ExecutionPlanExplain {
    #[serde(rename = "COLLSCAN")]
    CollectionScan,
    #[serde(rename = "IXSCAN")]
    IndexScan { index_name: String },
    #[serde(rename = "IXSEEK")]
    IndexSeek { index_name: String },
    #[serde(rename = "IXSCAN_COVERING")]
    CoveringIndexScan { index_name: String },
    #[serde(rename = "IXSCAN_SORTED")]
    SortedIndexScan { index_name: String },
    #[serde(rename = "VECTOR_SEARCH")]
    VectorIndexSearch { index_name: String },
    #[serde(rename = "BITMAP_SCAN")]
    BitmapScan { index_name: String },
    #[serde(rename = "TEXT_SCAN")]
    TextIndexScan { index_name: String },
    #[serde(rename = "PREFIX_SCAN")]
    PrefixIndexScan { index_name: String },
    #[serde(rename = "GEO")]
    Geo { index_name: String },
    #[serde(rename = "OR_UNION")]
    OrUnion,
}

impl From<&ExecutionPlan> for ExecutionPlanExplain {
    fn from(plan: &ExecutionPlan) -> Self {
        match plan {
            ExecutionPlan::CollectionScan => ExecutionPlanExplain::CollectionScan,
            ExecutionPlan::IndexScan { index_name, .. } => ExecutionPlanExplain::IndexScan {
                index_name: index_name.clone(),
            },
            ExecutionPlan::IndexSeek { index_name, .. } => ExecutionPlanExplain::IndexSeek {
                index_name: index_name.clone(),
            },
            ExecutionPlan::CoveringIndexScan { index_name, .. } => {
                ExecutionPlanExplain::CoveringIndexScan {
                    index_name: index_name.clone(),
                }
            }
            ExecutionPlan::SortedIndexScan { index_name, .. } => {
                ExecutionPlanExplain::SortedIndexScan {
                    index_name: index_name.clone(),
                }
            }
            ExecutionPlan::VectorIndexSearch { index_name, .. } => {
                ExecutionPlanExplain::VectorIndexSearch {
                    index_name: index_name.clone(),
                }
            }
            ExecutionPlan::BitmapScan { index_name, .. } => ExecutionPlanExplain::BitmapScan {
                index_name: index_name.clone(),
            },
            ExecutionPlan::TextIndexScan { index_name, .. } => {
                ExecutionPlanExplain::TextIndexScan {
                    index_name: index_name.clone(),
                }
            }
            ExecutionPlan::PrefixIndexScan { index_name, .. } => {
                ExecutionPlanExplain::PrefixIndexScan {
                    index_name: index_name.clone(),
                }
            }
            ExecutionPlan::GeoNear { index_name, .. }
            | ExecutionPlan::GeoCapWithin { index_name, .. }
            | ExecutionPlan::GeoCellCover { index_name, .. } => ExecutionPlanExplain::Geo {
                index_name: index_name.clone(),
            },
            ExecutionPlan::OrUnionPlans { .. } => ExecutionPlanExplain::OrUnion,
        }
    }
}

impl ExplainResult {
    /// Create a new explain result
    pub fn new(query_filter: Document, execution_plan: ExecutionPlan, plan_reason: String) -> Self {
        let index_used = match &execution_plan {
            ExecutionPlan::CollectionScan | ExecutionPlan::OrUnionPlans { .. } => None,
            ExecutionPlan::IndexScan { index_name, .. }
            | ExecutionPlan::IndexSeek { index_name, .. }
            | ExecutionPlan::CoveringIndexScan { index_name, .. }
            | ExecutionPlan::SortedIndexScan { index_name, .. }
            | ExecutionPlan::VectorIndexSearch { index_name, .. }
            | ExecutionPlan::BitmapScan { index_name, .. }
            | ExecutionPlan::TextIndexScan { index_name, .. }
            | ExecutionPlan::PrefixIndexScan { index_name, .. }
            | ExecutionPlan::GeoNear { index_name, .. }
            | ExecutionPlan::GeoCapWithin { index_name, .. }
            | ExecutionPlan::GeoCellCover { index_name, .. } => Some(index_name.clone()),
        };

        Self {
            query_filter,
            execution_plan: ExecutionPlanExplain::from(&execution_plan),
            execution_stats: ExecutionStats::new(),
            index_used,
            plan_reason,
        }
    }

    /// Get efficiency ratio (returned / examined)
    pub fn efficiency(&self) -> f64 {
        if self.execution_stats.documents_examined == 0 {
            return 1.0;
        }
        self.execution_stats.documents_returned as f64
            / self.execution_stats.documents_examined as f64
    }

    /// Check if query is efficient (> 10% efficiency)
    pub fn is_efficient(&self) -> bool {
        self.efficiency() > 0.1
    }

    /// Get a human-readable summary
    pub fn summary(&self) -> String {
        let plan_str = match &self.execution_plan {
            ExecutionPlanExplain::CollectionScan => "COLLSCAN (full collection scan)".to_string(),
            ExecutionPlanExplain::IndexScan { index_name } => {
                format!("IXSCAN (index scan on '{index_name}')")
            }
            ExecutionPlanExplain::IndexSeek { index_name } => {
                format!("IXSEEK (index seek on '{index_name}')")
            }
            ExecutionPlanExplain::CoveringIndexScan { index_name } => {
                format!("IXSCAN_COVERING (covering index on '{index_name}' - no doc fetch)")
            }
            ExecutionPlanExplain::SortedIndexScan { index_name } => {
                format!("IXSCAN_SORTED (sorted index walk on '{index_name}')")
            }
            ExecutionPlanExplain::VectorIndexSearch { index_name } => {
                format!("VECTOR_SEARCH (vector index '{index_name}')")
            }
            ExecutionPlanExplain::BitmapScan { index_name } => {
                format!("BITMAP_SCAN (bitmap index '{index_name}')")
            }
            ExecutionPlanExplain::TextIndexScan { index_name } => {
                format!("TEXT_SCAN (text index '{index_name}')")
            }
            ExecutionPlanExplain::PrefixIndexScan { index_name } => {
                format!("PREFIX_SCAN (prefix index '{index_name}')")
            }
            ExecutionPlanExplain::Geo { index_name } => {
                format!("GEO (2dsphere index '{index_name}')")
            }
            ExecutionPlanExplain::OrUnion => "OR_UNION (union of branch plans)".to_string(),
        };

        format!(
            "Plan: {} | Examined: {} docs | Returned: {} docs | Efficiency: {:.1}%",
            plan_str,
            self.execution_stats.documents_examined,
            self.execution_stats.documents_returned,
            self.efficiency() * 100.0
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bson::doc;

    #[test]
    fn test_execution_stats_new() {
        let stats = ExecutionStats::new();
        assert_eq!(stats.documents_examined, 0);
        assert_eq!(stats.documents_returned, 0);
        assert_eq!(stats.index_entries_examined, 0);
        assert_eq!(stats.execution_time_micros, None);
    }

    #[test]
    fn test_execution_stats_increment() {
        let mut stats = ExecutionStats::new();
        stats.inc_documents_examined();
        stats.inc_documents_examined();
        stats.inc_documents_returned();

        assert_eq!(stats.documents_examined, 2);
        assert_eq!(stats.documents_returned, 1);
    }

    #[test]
    fn test_execution_plan_explain_from_plan() {
        let plan = ExecutionPlan::CollectionScan;
        let explain = ExecutionPlanExplain::from(&plan);
        assert_eq!(explain, ExecutionPlanExplain::CollectionScan);

        let plan = ExecutionPlan::IndexScan {
            index_name: "email_1".to_string(),
            index_keys: doc! {},
        };
        let explain = ExecutionPlanExplain::from(&plan);
        assert!(matches!(explain, ExecutionPlanExplain::IndexScan { .. }));
    }

    #[test]
    fn test_explain_result_new() {
        let query = doc! { "email": "alice@example.com" };
        let plan = ExecutionPlan::IndexSeek {
            index_name: "email_1".to_string(),
            index_keys: doc! { "email": 1 },
            seek_values: doc! { "email": "alice@example.com" },
        };

        let result = ExplainResult::new(query.clone(), plan, "Equality query".to_string());

        assert_eq!(result.query_filter, query);
        assert_eq!(result.index_used, Some("email_1".to_string()));
        assert!(matches!(
            result.execution_plan,
            ExecutionPlanExplain::IndexSeek { .. }
        ));
    }

    #[test]
    fn test_efficiency_calculation() {
        let mut result = ExplainResult::new(
            doc! {},
            ExecutionPlan::CollectionScan,
            "No index".to_string(),
        );

        result.execution_stats.documents_examined = 100;
        result.execution_stats.documents_returned = 10;

        assert_eq!(result.efficiency(), 0.1);
        assert!(!result.is_efficient()); // Exactly 10%, needs > 10%

        result.execution_stats.documents_returned = 20;
        assert_eq!(result.efficiency(), 0.2);
        assert!(result.is_efficient());
    }

    #[test]
    fn test_efficiency_with_zero_examined() {
        let result = ExplainResult::new(
            doc! {},
            ExecutionPlan::CollectionScan,
            "Empty collection".to_string(),
        );

        // Zero examined should return 1.0 (100% efficiency) to avoid division by zero
        assert_eq!(result.efficiency(), 1.0);
    }

    #[test]
    fn test_summary_formatting() {
        let mut result = ExplainResult::new(
            doc! { "age": { "$gte": 18 } },
            ExecutionPlan::IndexScan {
                index_name: "age_1".to_string(),
                index_keys: doc! { "age": 1 },
            },
            "Range query".to_string(),
        );

        result.execution_stats.documents_examined = 50;
        result.execution_stats.documents_returned = 10;

        let summary = result.summary();
        assert!(summary.contains("IXSCAN"));
        assert!(summary.contains("age_1"));
        assert!(summary.contains("50 docs"));
        assert!(summary.contains("10 docs"));
    }
}
