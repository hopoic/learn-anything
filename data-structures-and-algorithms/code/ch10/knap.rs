// Rust: the same 1-D table; iterate capacity in reverse with .rev().
fn knapsack(items: &[(usize, u32)], cap: usize) -> u32 {
    let mut best = vec![0u32; cap + 1];
    for &(w, v) in items {
        for c in (w..=cap).rev() {
            best[c] = best[c].max(best[c - w] + v);
        }
    }
    best[cap]
}

fn main() {
    let items = [(5, 10), (4, 40), (6, 30), (3, 50)]; // (kg, score)
    println!("{}", knapsack(&items, 10)); // 90
}
