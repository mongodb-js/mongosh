//! Geospatial index probing (S2 cell range scans). Native targets only.

use std::collections::HashSet;

use s2::cellid::CellID;

use crate::geo::{extract_lon_lat, haversine_meters, query_cap_covering};
use crate::planner::ExecutionPlan;
use crate::query::eval_query;
use crate::storage::{StorageCursor, StorageSession};

use super::super::{Collection, CollectionError, CollectionResult};

/// Collect distinct `_id` strings from a `2dsphere` index for Hilbert ranges of each covering cell.
pub(super) fn collect_ids_geo_cells<S: StorageSession>(
    col: &Collection<S>,
    index_name: &str,
    cell_u64s: &[u64],
) -> CollectionResult<HashSet<String>> {
    let index_table = format!("{}.idx_{}", col.collection_name(), index_name);
    let mut cursor = col
        .session()
        .open_cursor(&index_table)
        .map_err(CollectionError::from)?;
    let mut seen = HashSet::new();

    for raw in cell_u64s {
        let cell = CellID(*raw);
        let rmin = cell.range_min().0;
        let rmax = cell.range_max().0;
        let start_key = format!("{:016X}|", rmin);
        cursor.set_key_str(&start_key);
        match cursor.search_near() {
            Ok(exact) => {
                if exact < 0 && cursor.next().is_err() {
                    continue;
                }
            }
            Err(_) => continue,
        }
        loop {
            let key_str = cursor.get_key_str()?;
            let Some(cid) = crate::geo::index_key_cell_id(&key_str) else {
                if cursor.next().is_err() {
                    break;
                }
                continue;
            };
            if cid < rmin {
                if cursor.next().is_err() {
                    break;
                }
                continue;
            }
            if cid > rmax {
                break;
            }
            let doc_id = cursor.get_value_str().map_err(CollectionError::from)?;
            seen.insert(doc_id);
            if cursor.next().is_err() {
                break;
            }
        }
    }

    Ok(seen)
}

pub(in crate::collection) fn materialize_geo_plan<S: StorageSession>(
    col: &Collection<S>,
    plan: &ExecutionPlan,
    filter: &bson::Document,
) -> CollectionResult<Vec<bson::Document>> {
    match plan {
        ExecutionPlan::GeoNear {
            index_name,
            field,
            lon,
            lat,
            max_distance_m,
            min_distance_m,
        } => {
            let cells = query_cap_covering(*lon, *lat, *max_distance_m);
            let ids = collect_ids_geo_cells(col, index_name, &cells)?;
            let mut scored: Vec<(f64, bson::Document)> = Vec::new();
            for id in ids {
                let Some(doc) = col.fetch_doc_by_id_str(&id)? else {
                    continue;
                };
                if !eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                    continue;
                }
                let val = crate::paths::get_value(&doc, field);
                let Some((dlon, dlat)) = extract_lon_lat(val) else {
                    continue;
                };
                let d = haversine_meters(*lon, *lat, dlon, dlat);
                if let Some(m) = min_distance_m {
                    if d < *m {
                        continue;
                    }
                }
                if let Some(m) = max_distance_m {
                    if d > *m {
                        continue;
                    }
                }
                scored.push((d, doc));
            }
            scored.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
            Ok(scored.into_iter().map(|(_, d)| d).collect())
        }
        ExecutionPlan::GeoCapWithin {
            index_name,
            field: _,
            lon,
            lat,
            radius_m,
        } => {
            let cells = query_cap_covering(*lon, *lat, Some(*radius_m));
            let ids = collect_ids_geo_cells(col, index_name, &cells)?;
            let mut out = Vec::new();
            for id in ids {
                let Some(doc) = col.fetch_doc_by_id_str(&id)? else {
                    continue;
                };
                if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                    out.push(doc);
                }
            }
            Ok(out)
        }
        ExecutionPlan::GeoCellCover {
            index_name,
            field: _,
            cell_ids,
        } => {
            let ids = collect_ids_geo_cells(col, index_name, cell_ids)?;
            let mut out = Vec::new();
            for id in ids {
                let Some(doc) = col.fetch_doc_by_id_str(&id)? else {
                    continue;
                };
                if eval_query(&doc, filter).map_err(CollectionError::QueryError)? {
                    out.push(doc);
                }
            }
            Ok(out)
        }
        _ => Err(CollectionError::Other(
            "internal: not a geospatial execution plan".into(),
        )),
    }
}
