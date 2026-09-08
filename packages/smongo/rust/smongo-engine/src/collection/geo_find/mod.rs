//! Geospatial index execution (`2dsphere`).

#[cfg(not(target_arch = "wasm32"))]
mod native;
#[cfg(not(target_arch = "wasm32"))]
pub(super) use native::materialize_geo_plan;

#[cfg(target_arch = "wasm32")]
use bson::Document;

#[cfg(target_arch = "wasm32")]
use crate::planner::ExecutionPlan;
#[cfg(target_arch = "wasm32")]
use crate::storage::StorageSession;

#[cfg(target_arch = "wasm32")]
use super::{Collection, CollectionError, CollectionResult};

#[cfg(target_arch = "wasm32")]
pub(in crate::collection) fn materialize_geo_plan<S: StorageSession>(
    _col: &Collection<S>,
    _plan: &ExecutionPlan,
    _filter: &Document,
) -> CollectionResult<Vec<Document>> {
    Err(CollectionError::Other(
        "2dsphere is not supported on wasm32".into(),
    ))
}
