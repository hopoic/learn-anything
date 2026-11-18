// Rust: Instant is monotonic; black_box stops the optimizer from deleting the work.
use std::hint::black_box;
use std::time::Instant;

fn main() {
    let n = 5_000_000usize;
    let v: Vec<i64> = (0..n as i64).collect();

    let t0 = Instant::now();
    let sum: i64 = black_box(&v).iter().sum();
    let dt = t0.elapsed();

    println!("sum={sum}  {:.2} ms", dt.as_secs_f64() * 1e3);
    // For real benchmarks use `cargo bench` (e.g. with criterion); one run is noisy.
}
