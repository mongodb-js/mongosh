//! WASM32 stub: no `s2` / `libc`. Geospatial indexes and operators are disabled on this target.

use bson::{Bson, Document};

pub const EARTH_RADIUS_METERS: f64 = 6_371_000.0;
pub const DEFAULT_NEAR_MAX_DISTANCE_M: f64 = 20_000_000.0;

pub fn haversine_meters(lon1: f64, lat1: f64, lon2: f64, lat2: f64) -> f64 {
    let lat1_r = lat1.to_radians();
    let lat2_r = lat2.to_radians();
    let dlat = (lat2 - lat1).to_radians();
    let dlon = (lon2 - lon1).to_radians();
    let a = (dlat / 2.0).sin().powi(2) + lat1_r.cos() * lat2_r.cos() * (dlon / 2.0).sin().powi(2);
    EARTH_RADIUS_METERS * 2.0 * a.sqrt().asin()
}

pub fn cell_key_for_point(_lon_deg: f64, _lat_deg: f64) -> u64 {
    0
}

pub fn index_cells_for_point(lon: f64, lat: f64) -> Vec<u64> {
    vec![cell_key_for_point(lon, lat)]
}

pub fn query_cap_covering(_lon: f64, _lat: f64, _max_m: Option<f64>) -> Vec<u64> {
    Vec::new()
}

pub fn index_key_cell_id(key: &str) -> Option<u64> {
    let pipe = key.find('|')?;
    u64::from_str_radix(&key[..pipe], 16).ok()
}

#[derive(Clone, Debug)]
pub struct GeoQueryShape;

impl GeoQueryShape {
    pub fn from_geometry_doc(_g: &Document) -> Result<Self, String> {
        Err("2dsphere is not supported on wasm32".to_string())
    }

    pub fn covering_cell_ids(&self) -> Vec<u64> {
        Vec::new()
    }

    pub fn contains_point_lonlat(&self, _lon: f64, _lat: f64) -> bool {
        false
    }

    pub fn intersects_point_lonlat(&self, _lon: f64, _lat: f64) -> bool {
        false
    }
}

pub fn extract_lon_lat(value: Option<&Bson>) -> Option<(f64, f64)> {
    let v = value?;
    if let Bson::Document(dict) = v {
        let typ = dict.get("type").and_then(|t| t.as_str()).unwrap_or("");
        if typ != "Point" {
            return None;
        }
        let coords = dict.get("coordinates")?;
        let Bson::Array(cl) = coords else {
            return None;
        };
        if cl.len() < 2 {
            return None;
        }
        let lon = as_f64(&cl[0])?;
        let lat = as_f64(&cl[1])?;
        Some((lon, lat))
    } else if let Bson::Array(list) = v {
        if list.len() < 2 {
            return None;
        }
        let lon = as_f64(&list[0])?;
        let lat = as_f64(&list[1])?;
        Some((lon, lat))
    } else {
        None
    }
}

fn as_f64(b: &Bson) -> Option<f64> {
    match b {
        Bson::Double(d) => Some(*d),
        Bson::Int32(i) => Some(*i as f64),
        Bson::Int64(i) => Some(*i as f64),
        _ => None,
    }
}

pub fn cell_range_prefixes(cell: u64) -> (Vec<u8>, u64, u64) {
    (format!("{:016X}|", cell).into_bytes(), cell, cell)
}
