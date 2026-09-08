//! GeoJSON query shapes: Polygon / MultiPolygon / Point + spherical predicates.

use bson::{Bson, Document};

use s2::cellid::CellID;
use s2::edgeutil::{distance_from_segment, simple_crossing};
use s2::latlng::LatLng;
use s2::point::Point;
use s2::rect::Rect;
use s2::region::RegionCoverer;

use super::s2_util::{cell_key_for_point, cell_key_prefix_u64};

/// On-edge tolerance (~1 m on Earth).
const BOUNDARY_ANGLE_RAD: f64 = 1e-7;

/// Point–point match uses Haversine below this (meters).
const POINT_MATCH_EPSILON_M: f64 = 1.0;

/// Each polygon: `rings[0]` exterior, `rings[1..]` holes (reversed winding for hole test).
#[derive(Clone, Debug)]
pub struct GeoQueryShape {
    pub polygons: Vec<Vec<Vec<Point>>>,
    /// When set, query is a degenerate Point (0-dim region).
    pub query_point: Option<(f64, f64)>,
}

impl GeoQueryShape {
    /// Build from GeoJSON-like `Document` (`type` + `coordinates`).
    pub fn from_geometry_doc(g: &Document) -> Result<Self, String> {
        let typ = g
            .get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let coords = g
            .get("coordinates")
            .ok_or_else(|| "$geometry requires coordinates".to_string())?;

        match typ.as_str() {
            "Point" => Self::from_point_coordinates(coords),
            "Polygon" => {
                let poly = parse_polygon_coordinates(coords)?;
                Ok(Self {
                    polygons: vec![poly],
                    query_point: None,
                })
            }
            "MultiPolygon" => {
                let Bson::Array(parts) = coords else {
                    return Err("MultiPolygon coordinates must be an array".to_string());
                };
                if parts.is_empty() {
                    return Err("MultiPolygon coordinates must be non-empty".to_string());
                }
                let mut polygons = Vec::new();
                for p in parts {
                    let poly = parse_polygon_coordinates(p)?;
                    polygons.push(poly);
                }
                Ok(Self {
                    polygons,
                    query_point: None,
                })
            }
            _ => Err(format!(
                "unsupported $geometry type for 2dsphere query: {typ} (expected Point, Polygon, or MultiPolygon)"
            )),
        }
    }

    fn from_point_coordinates(coords: &Bson) -> Result<Self, String> {
        let (lon, lat) = parse_lon_lat_pair(coords)?;
        Ok(Self {
            polygons: Vec::new(),
            query_point: Some((lon, lat)),
        })
    }

    /// S2 cells covering the query region (conservative superset for index narrowing).
    pub fn covering_cell_ids(&self) -> Vec<u64> {
        if let Some((lon, lat)) = self.query_point {
            return vec![cell_key_for_point(lon, lat)];
        }
        // Polygon / MultiPolygon: padded lat/lng bounding rect + RegionCoverer (conservative).
        // A tighter S2 cover tied to the actual polygon boundary is a future performance tweak.
        let mut rect = Rect::empty();
        for poly in &self.polygons {
            for ring in poly {
                for p in ring {
                    let ll = LatLng::from(*p);
                    rect = &rect + &ll.normalized();
                }
            }
        }
        if rect.is_empty() {
            return Vec::new();
        }
        let margin = LatLng::from_degrees(1e-4, 1e-4);
        let rect = rect.expanded(&margin);
        let coverer = RegionCoverer {
            min_level: 0,
            max_level: 30,
            level_mod: 1,
            max_cells: 512,
        };
        coverer.covering(&rect).0.into_iter().map(|c| c.0).collect()
    }

    pub fn contains_point_lonlat(&self, lon_deg: f64, lat_deg: f64) -> bool {
        if let Some((qlon, qlat)) = self.query_point {
            return haversine_meters_local(qlon, qlat, lon_deg, lat_deg) <= POINT_MATCH_EPSILON_M;
        }
        let ll = LatLng::from_degrees(lat_deg, lon_deg);
        let p = Point::from(ll.normalized());
        self.contains_point_s2(&p)
    }

    pub fn intersects_point_lonlat(&self, lon_deg: f64, lat_deg: f64) -> bool {
        self.contains_point_lonlat(lon_deg, lat_deg)
    }

    fn contains_point_s2(&self, p: &Point) -> bool {
        for poly in &self.polygons {
            if polygon_covers_point(poly, p) {
                return true;
            }
        }
        false
    }
}

fn haversine_meters_local(lon1: f64, lat1: f64, lon2: f64, lat2: f64) -> f64 {
    super::s2_util::haversine_meters(lon1, lat1, lon2, lat2)
}

fn polygon_covers_point(poly: &[Vec<Point>], p: &Point) -> bool {
    let Some(exterior) = poly.first() else {
        return false;
    };
    if !ring_contains_ccw(exterior, p) {
        return false;
    }
    for hole in poly.iter().skip(1) {
        if ring_contains_ccw(hole, p) {
            return false;
        }
    }
    true
}

fn ring_contains_ccw(verts: &[Point], p: &Point) -> bool {
    if verts.len() < 3 {
        return false;
    }
    let n = verts.len();
    let m = if verts[0].approx_eq(&verts[n - 1]) {
        n - 1
    } else {
        n
    };
    if m < 3 {
        return false;
    }
    for i in 0..m {
        let a = verts[i];
        let b = verts[(i + 1) % m];
        if distance_from_segment(p, &a, &b).rad() <= BOUNDARY_ANGLE_RAD {
            return true;
        }
    }
    let ref_pt = Point::origin();
    if p.approx_eq(&ref_pt) {
        return false;
    }
    let mut inside = false;
    for i in 0..m {
        let a = verts[i];
        let b = verts[(i + 1) % m];
        if simple_crossing(p, &ref_pt, &a, &b) {
            inside = !inside;
        }
    }
    inside
}

fn parse_polygon_coordinates(coords: &Bson) -> Result<Vec<Vec<Point>>, String> {
    let Bson::Array(rings_py) = coords else {
        return Err("Polygon coordinates must be an array of rings".to_string());
    };
    if rings_py.is_empty() {
        return Err("Polygon must have at least one linear ring".to_string());
    }
    let mut rings = Vec::new();
    for (ri, ring_any) in rings_py.iter().enumerate() {
        let ring = parse_linear_ring(ring_any)?;
        if ri > 0 {
            let mut rev = ring.clone();
            rev.reverse();
            rings.push(rev);
        } else {
            rings.push(ring);
        }
    }
    Ok(rings)
}

fn parse_linear_ring(ring_any: &Bson) -> Result<Vec<Point>, String> {
    let Bson::Array(list) = ring_any else {
        return Err("linear ring must be an array".to_string());
    };
    if list.len() < 4 {
        return Err("each linear ring must have at least 4 positions (closed)".to_string());
    }
    let mut pts = Vec::with_capacity(list.len());
    for item in list {
        let Bson::Array(pos) = item else {
            return Err("ring position must be [longitude, latitude]".to_string());
        };
        if pos.len() < 2 {
            return Err("ring position must be [longitude, latitude]".to_string());
        }
        let lon = pos[0]
            .as_f64()
            .ok_or_else(|| "longitude must be numeric".to_string())?;
        let lat = pos[1]
            .as_f64()
            .ok_or_else(|| "latitude must be numeric".to_string())?;
        if !(-180.0..=180.0).contains(&lon) || !(-90.0..=90.0).contains(&lat) {
            return Err(format!("invalid lon/lat: ({lon}, {lat})"));
        }
        let ll = LatLng::from_degrees(lat, lon);
        pts.push(Point::from(ll.normalized()));
    }
    if !pts[0].approx_eq(&pts[pts.len() - 1]) {
        return Err("linear ring must be closed (first position equals last)".to_string());
    }
    Ok(pts)
}

fn parse_lon_lat_pair(coords: &Bson) -> Result<(f64, f64), String> {
    let Bson::Array(cl) = coords else {
        return Err("Point coordinates must be [longitude, latitude]".to_string());
    };
    if cl.len() < 2 {
        return Err("Point coordinates need [lon, lat]".to_string());
    }
    let lon = cl[0]
        .as_f64()
        .ok_or_else(|| "longitude must be numeric".to_string())?;
    let lat = cl[1]
        .as_f64()
        .ok_or_else(|| "latitude must be numeric".to_string())?;
    if !(-180.0..=180.0).contains(&lon) || !(-90.0..=90.0).contains(&lat) {
        return Err(format!("invalid lon/lat: ({lon}, {lat})"));
    }
    Ok((lon, lat))
}

/// Extract GeoJSON Point or legacy `[lon, lat]` from a BSON value.
pub fn extract_lon_lat(value: Option<&Bson>) -> Option<(f64, f64)> {
    let v = value?;
    if let Bson::Document(dict) = v {
        let typ = dict.get("type").and_then(|t| t.as_str()).unwrap_or("");
        if typ != "Point" {
            return None;
        }
        let coords = dict.get("coordinates")?;
        parse_lon_lat_pair(coords).ok()
    } else if let Bson::Array(list) = v {
        if list.len() < 2 {
            return None;
        }
        let lon = list[0].as_f64()?;
        let lat = list[1].as_f64()?;
        Some((lon, lat))
    } else {
        None
    }
}

/// Prefix byte range for one S2 covering cell (for B-tree / redb seek).
pub fn cell_range_prefixes(cell: u64) -> (Vec<u8>, u64, u64) {
    let c = CellID(cell);
    let rmin = c.range_min().0;
    let rmax = c.range_max().0;
    (cell_key_prefix_u64(rmin).into_bytes(), rmin, rmax)
}
