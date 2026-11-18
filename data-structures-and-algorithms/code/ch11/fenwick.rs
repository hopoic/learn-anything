// Rust: i & i.wrapping_neg() is the lowest set bit of an unsigned integer.
struct Fenwick {
    t: Vec<i64>,
}

impl Fenwick {
    fn new(n: usize) -> Self {
        Fenwick { t: vec![0; n + 1] }
    }
    fn add(&mut self, i: usize, d: i64) {
        let mut i = i + 1;
        while i < self.t.len() {
            self.t[i] += d;
            i += i & i.wrapping_neg();
        }
    }
    fn prefix(&self, mut i: usize) -> i64 {
        let mut s = 0;
        while i > 0 {
            s += self.t[i];
            i -= i & i.wrapping_neg();
        }
        s
    }
}

fn main() {
    let hits = [3, 0, 5, 2, 7, 1, 0, 4, 6, 2, 0, 0, 1, 3, 2, 5];
    let mut f = Fenwick::new(hits.len());
    for (i, &h) in hits.iter().enumerate() {
        f.add(i, h);
    }
    println!("{}", f.prefix(8) - f.prefix(4)); // 12
}
