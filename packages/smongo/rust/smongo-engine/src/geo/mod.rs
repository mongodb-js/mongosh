//! Spherical geospatial helpers for MongoDB-style `2dsphere` indexes and operators.
//!
//! On `wasm32`, the `s2` stack is omitted; [`crate::planner`] does not emit geo plans and
//! [`crate::collection::Collection::create_index`] rejects `2dsphere` keys.

#[cfg(not(target_arch = "wasm32"))]
mod s2_util;
#[cfg(not(target_arch = "wasm32"))]
mod shape;

#[cfg(not(target_arch = "wasm32"))]
pub use s2_util::{
    cell_key_for_point, haversine_meters, index_cells_for_point, index_key_cell_id,
    query_cap_covering, DEFAULT_NEAR_MAX_DISTANCE_M, EARTH_RADIUS_METERS,
};
#[cfg(not(target_arch = "wasm32"))]
pub use shape::{cell_range_prefixes, extract_lon_lat, GeoQueryShape};

#[cfg(target_arch = "wasm32")]
mod stub;
#[cfg(target_arch = "wasm32")]
pub use stub::{
    cell_key_for_point, cell_range_prefixes, extract_lon_lat, haversine_meters,
    index_cells_for_point, index_key_cell_id, query_cap_covering, GeoQueryShape,
    DEFAULT_NEAR_MAX_DISTANCE_M, EARTH_RADIUS_METERS,
};
