// Rust: BinaryHeap is a MAX-heap. Wrap keys in Reverse for a min-heap,
// or implement Ord yourself (f64 is not Ord because of NaN).
use std::cmp::{Ordering, Reverse};
use std::collections::BinaryHeap;

#[derive(Debug, PartialEq, Eq)]
struct Timer {
    deadline_us: u64, // integer time: Ord for free, no NaN surprises
    name: &'static str,
}

impl Ord for Timer {
    fn cmp(&self, other: &Self) -> Ordering {
        // Reversed so that the earliest deadline sits on top of the max-heap.
        other
            .deadline_us
            .cmp(&self.deadline_us)
            .then_with(|| other.name.cmp(self.name))
    }
}
impl PartialOrd for Timer {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

fn main() {
    let mut timers = BinaryHeap::new();
    timers.push(Timer { deadline_us: 50_000, name: "publish /odom" });
    timers.push(Timer { deadline_us: 10_000, name: "watchdog kick" });
    timers.push(Timer { deadline_us: 33_300, name: "camera frame" });
    while let Some(t) = timers.pop() {
        println!("{:>6} us  {}", t.deadline_us, t.name);
    }

    let mut h: BinaryHeap<Reverse<i32>> = [9, 4, 7, 1, 8, 2].into_iter().map(Reverse).collect();
    println!("min = {}", h.pop().unwrap().0);
}
