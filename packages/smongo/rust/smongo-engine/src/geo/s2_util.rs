//! S2 cell keys and spherical caps for `2dsphere` indexes (aligned with smongo-py `geo_s2.rs`).

use s2::cap::Cap;
use s2::cellid::CellID;
use s2::latlng::LatLng;
use s2::point::Point;
use s2::region::Region;
use s2::s1::{Angle, Rad};

/// Earth radius in meters (WGS84-ish; matches historical smongo `geo.py`).
pub const EARTH_RADIUS_METERS: f64 = 6_371_000.0;

/// When `$maxDistance` is omitted for `$near`, cap probes at this radius (meters).
pub const DEFAULT_NEAR_MAX_DISTANCE_M: f64 = 20_000_000.0;

/// Great-circle distance in meters between two WGS84 (lon, lat) degree pairs.
pub fn haversine_meters(lon1: f64, lat1: f64, lon2: f64, lat2: f64) -> f64 {
    let lat1_r = lat1.to_radians();
    let lat2_r = lat2.to_radians();
    let dlat = (lat2 - lat1).to_radians();
    let dlon = (lon2 - lon1).to_radians();
    let a = (dlat / 2.0).sin().powi(2) + lat1_r.cos() * lat2_r.cos() * (dlon / 2.0).sin().powi(2);
    EARTH_RADIUS_METERS * 2.0 * a.sqrt().asin()
}

/// Leaf S2 cell id (u64) for a GeoJSON Point (lon, lat degrees).
pub fn cell_key_for_point(lon_deg: f64, lat_deg: f64) -> u64 {
    let ll = LatLng::from_degrees(lat_deg, lon_deg);
    CellID::from(&ll.normalized()).0
}

/// Fixed-width uppercase hex + `|` prefix for index keys (lex order = Hilbert cell order).
pub fn cell_key_prefix_u64(cell: u64) -> String {
    format!("{:016X}|", cell)
}

/// Parse cell id from index key `HEX|doc_id`.
pub fn index_key_cell_id(key: &str) -> Option<u64> {
    let pipe = key.find('|')?;
    u64::from_str_radix(&key[..pipe], 16).ok()
}

/// One index row per point: leaf-level cell only (level 30).
pub fn index_cells_for_point(lon_deg: f64, lat_deg: f64) -> Vec<u64> {
    vec![cell_key_for_point(lon_deg, lat_deg)]
}

/// Spherical cap covering for `$near` / `$nearSphere` / `$centerSphere` index narrowing.
pub fn query_cap_covering(lon_deg: f64, lat_deg: f64, max_distance_m: Option<f64>) -> Vec<u64> {
    let ll = LatLng::from_degrees(lat_deg, lon_deg);
    let p = Point::from(ll.normalized());
    let cap = if let Some(max_m) = max_distance_m {
        if max_m <= 0.0 {
            Cap::from(&p)
        } else {
            let angle_rad = (max_m / EARTH_RADIUS_METERS).min(std::f64::consts::PI);
            let angle = Angle::from(Rad(angle_rad));
            Cap::from_center_angle(&p, &angle)
        }
    } else {
        Cap::full()
    };
    cap.cell_union_bound().into_iter().map(|c| c.0).collect()
}
