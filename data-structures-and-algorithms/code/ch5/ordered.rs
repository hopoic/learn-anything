// Rust: BTreeMap is a B-tree (many keys per node => cache friendly), always ordered.
use std::collections::BTreeMap;

fn main() {
    let mut timeline = BTreeMap::new();
    timeline.insert(100, "boot");
    timeline.insert(250, "localize");
    timeline.insert(900, "dock");
    timeline.insert(400, "plan");

    // lower_bound: first key >= 300
    if let Some((t, e)) = timeline.range(300..).next() {
        println!("next event after t=300: {e} at {t}");
    }
    // Range query [200, 500)
    for (t, e) in timeline.range(200..500) {
        println!("{t}: {e}");
    }
    println!("first = {:?}, last = {:?}", timeline.first_key_value(), timeline.last_key_value());
}
