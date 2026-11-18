// Rust: sort() is stable (driftsort), sort_unstable() is in-place and usually faster
// (ipnsort). Both implementations shipped in Rust 1.81.
fn main() {
    let mut a = vec![42, 7, 19, 7, 88, 3, 56];
    a.sort_unstable();
    println!("{a:?}");

    match a.binary_search(&19) {
        Ok(i) => println!("19 found at {i}"),
        Err(i) => println!("19 would be inserted at {i}"),
    }
    // lower_bound / upper_bound
    let lo = a.partition_point(|&x| x < 7);
    let hi = a.partition_point(|&x| x <= 7);
    println!("count of 7 = {}", hi - lo);

    // Floats are not Ord (NaN). total_cmp gives a well-defined total order.
    let mut d = vec![2.5_f64, -1.0, 9.75, 0.0];
    d.sort_by(|x, y| x.total_cmp(y));
    println!("{d:?}");

    // Sort by a derived key, descending; the key is computed once per element.
    let mut names = vec!["amr-10", "amr-2", "amr-1"];
    names.sort_by_cached_key(|s| std::cmp::Reverse(s[4..].parse::<u32>().unwrap()));
    println!("{names:?}");
}
