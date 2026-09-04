//! `2dsphere` index planning from BSON query filters.

use bson::{Bson, Document};

use crate::geo::GeoQueryShape;
use crate::index::{is_2dsphere_keys, twodsphere_field, IndexSpec};

use super::{ExecutionPlan, QueryPlan};

pub(super) fn evaluate_2dsphere_plan(query: &Document, idx: &IndexSpec) -> Option<QueryPlan> {
    if !is_2dsphere_keys(&idx.keys) {
        return None;
    }
    let field = twodsphere_field(&idx.keys)?;
    let fc = collect_field_conditions(query);
    let cond = fc.get(&field)?;
    let inner = cond.as_document()?;

    if let Some((lon, lat, max_m, min_m)) = parse_field_near_spec(inner) {
        let max_d = max_m.or(Some(crate::geo::DEFAULT_NEAR_MAX_DISTANCE_M));
        return Some(QueryPlan {
            execution_plan: ExecutionPlan::GeoNear {
                index_name: idx.name.clone(),
                field: field.clone(),
                lon,
                lat,
                max_distance_m: max_d,
                min_distance_m: min_m,
            },
            estimated_cost: 50,
            reason: format!("$near / $nearSphere on 2dsphere field '{field}'"),
        });
    }

    if let Some(shape) = parse_geo_intersects_block(inner) {
        let cells = shape.covering_cell_ids();
        return Some(QueryPlan {
            execution_plan: ExecutionPlan::GeoCellCover {
                index_name: idx.name.clone(),
                field: field.clone(),
                cell_ids: cells,
            },
            estimated_cost: 58,
            reason: format!("$geoIntersects on 2dsphere field '{field}'"),
        });
    }

    if let Some(gw) = inner.get("$geoWithin").and_then(|b| b.as_document()) {
        if let Some((lon, lat, rrad)) = parse_center_sphere(gw) {
            let radius_m = rrad * crate::geo::EARTH_RADIUS_METERS;
            return Some(QueryPlan {
                execution_plan: ExecutionPlan::GeoCapWithin {
                    index_name: idx.name.clone(),
                    field: field.clone(),
                    lon,
                    lat,
                    radius_m,
                },
                estimated_cost: 55,
                reason: format!("$geoWithin $centerSphere on 2dsphere field '{field}'"),
            });
        }
        if let Some(g) = gw.get("$geometry").and_then(|b| b.as_document()) {
            if let Ok(shape) = GeoQueryShape::from_geometry_doc(g) {
                let cells = shape.covering_cell_ids();
                return Some(QueryPlan {
                    execution_plan: ExecutionPlan::GeoCellCover {
                        index_name: idx.name.clone(),
                        field: field.clone(),
                        cell_ids: cells,
                    },
                    estimated_cost: 58,
                    reason: format!("$geoWithin $geometry on 2dsphere field '{field}'"),
                });
            }
        }
    }

    None
}

/// Top-level fields plus one-level `$and` conjuncts (same heuristic as smongo-py).
fn collect_field_conditions(query: &Document) -> Document {
    let mut out = Document::new();
    for (k, v) in query {
        match k.as_str() {
            "$and" => {
                if let Bson::Array(arr) = v {
                    for item in arr {
                        if let Bson::Document(d) = item {
                            for (k2, v2) in d {
                                if !k2.starts_with('$') {
                                    out.insert(k2.clone(), v2.clone());
                                }
                            }
                        }
                    }
                }
            }
            s if !s.starts_with('$') => {
                out.insert(k.clone(), v.clone());
            }
            _ => {}
        }
    }
    out
}

fn as_f64_bson(b: &Bson) -> Option<f64> {
    match b {
        Bson::Double(d) => Some(*d),
        Bson::Int32(i) => Some(*i as f64),
        Bson::Int64(i) => Some(*i as f64),
        _ => None,
    }
}

fn parse_field_near_spec(cond: &Document) -> Option<(f64, f64, Option<f64>, Option<f64>)> {
    let outer_max = cond.get("$maxDistance").and_then(as_f64_bson);
    let outer_min = cond.get("$minDistance").and_then(as_f64_bson);
    let nv = cond.get("$near").or_else(|| cond.get("$nearSphere"))?;
    match nv {
        Bson::Array(arr) => {
            if arr.len() < 2 {
                return None;
            }
            let lon = as_f64_bson(&arr[0])?;
            let lat = as_f64_bson(&arr[1])?;
            Some((lon, lat, outer_max, outer_min))
        }
        Bson::Document(spec) => {
            let max_d = spec.get("$maxDistance").and_then(as_f64_bson).or(outer_max);
            let min_d = spec.get("$minDistance").and_then(as_f64_bson).or(outer_min);
            let geom = spec.get("$geometry")?.as_document()?;
            if geom.get_str("type").ok()? != "Point" {
                return None;
            }
            let coords = geom.get("coordinates")?;
            let (lon, lat) = parse_point_coords(coords)?;
            Some((lon, lat, max_d, min_d))
        }
        _ => None,
    }
}

fn parse_point_coords(coords: &Bson) -> Option<(f64, f64)> {
    let Bson::Array(cl) = coords else {
        return None;
    };
    if cl.len() < 2 {
        return None;
    }
    let lon = as_f64_bson(&cl[0])?;
    let lat = as_f64_bson(&cl[1])?;
    Some((lon, lat))
}

fn parse_center_sphere(gw: &Document) -> Option<(f64, f64, f64)> {
    let cs = gw.get("$centerSphere")?;
    let Bson::Array(a) = cs else {
        return None;
    };
    if a.len() < 2 {
        return None;
    }
    let Bson::Array(c) = &a[0] else {
        return None;
    };
    if c.len() < 2 {
        return None;
    }
    let lon = as_f64_bson(&c[0])?;
    let lat = as_f64_bson(&c[1])?;
    let rad = as_f64_bson(&a[1])?;
    if rad < 0.0 {
        return None;
    }
    Some((lon, lat, rad))
}

fn parse_geo_intersects_block(cond: &Document) -> Option<GeoQueryShape> {
    let nested = cond.get("$geoIntersects")?.as_document()?;
    let g = nested.get("$geometry")?.as_document()?;
    GeoQueryShape::from_geometry_doc(g).ok()
}
