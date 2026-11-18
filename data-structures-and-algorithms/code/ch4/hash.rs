// Rust: HashMap is a SwissTable (hashbrown) hashed with randomly seeded SipHash-1-3
// by default, which resists HashDoS. The entry API avoids a second lookup.
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
struct Cell {
    x: i32,
    y: i32,
}

fn main() {
    let mut counts: HashMap<&str, u32> = HashMap::new();
    for w in ["nav", "power", "nav", "dds", "nav"] {
        *counts.entry(w).or_insert(0) += 1; // one hash, one probe
    }
    println!("nav = {}", counts["nav"]);

    let mut cost: HashMap<Cell, f64> = HashMap::with_capacity(1024); // reserve up front
    cost.insert(Cell { x: 3, y: 4 }, 2.5);
    if let Some(c) = cost.get(&Cell { x: 3, y: 4 }) {
        println!("cost = {c}");
    }
    // Iteration order is unspecified and changes between runs. Sort, or use BTreeMap,
    // when order matters (logs, tests, deterministic replay).
}
