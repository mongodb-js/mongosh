//! Total-ordering newtypes for floating-point values.
//!
//! `BinaryHeap` requires `Ord`, but `f32`/`f64` only implement `PartialOrd`.
//! These wrappers delegate to [`f32::total_cmp`] / [`f64::total_cmp`] which
//! provide a total order (NaN sorts high, -0 < +0).

use std::cmp::Ordering;

/// `f32` with total ordering via [`f32::total_cmp`].
#[derive(Clone, Copy, Debug)]
pub struct TotalF32(pub f32);

impl PartialEq for TotalF32 {
    fn eq(&self, other: &Self) -> bool {
        self.0.total_cmp(&other.0) == Ordering::Equal
    }
}
impl Eq for TotalF32 {}

impl PartialOrd for TotalF32 {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for TotalF32 {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.total_cmp(&other.0)
    }
}

/// `f64` with total ordering via [`f64::total_cmp`].
#[derive(Clone, Copy, Debug)]
pub struct TotalF64(pub f64);

impl PartialEq for TotalF64 {
    fn eq(&self, other: &Self) -> bool {
        self.0.total_cmp(&other.0) == Ordering::Equal
    }
}
impl Eq for TotalF64 {}

impl PartialOrd for TotalF64 {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for TotalF64 {
    fn cmp(&self, other: &Self) -> Ordering {
        self.0.total_cmp(&other.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cmp::Reverse;
    use std::collections::BinaryHeap;

    #[test]
    fn test_total_f32_ordering() {
        let mut heap: BinaryHeap<Reverse<TotalF32>> = BinaryHeap::new();
        heap.push(Reverse(TotalF32(3.0)));
        heap.push(Reverse(TotalF32(1.0)));
        heap.push(Reverse(TotalF32(2.0)));
        assert_eq!(heap.pop().unwrap().0 .0, 1.0);
        assert_eq!(heap.pop().unwrap().0 .0, 2.0);
        assert_eq!(heap.pop().unwrap().0 .0, 3.0);
    }

    #[test]
    fn test_total_f64_ordering() {
        let mut heap: BinaryHeap<Reverse<TotalF64>> = BinaryHeap::new();
        heap.push(Reverse(TotalF64(5.0)));
        heap.push(Reverse(TotalF64(1.5)));
        heap.push(Reverse(TotalF64(3.3)));
        assert_eq!(heap.pop().unwrap().0 .0, 1.5);
    }

    #[test]
    fn test_nan_ordering() {
        assert!(TotalF64(f64::NAN) > TotalF64(f64::INFINITY));
        assert!(TotalF32(f32::NAN) > TotalF32(f32::INFINITY));
    }
}
