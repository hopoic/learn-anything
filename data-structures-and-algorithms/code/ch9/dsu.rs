// Rust: indices instead of pointers, so union-find needs no unsafe and no Rc.
struct Dsu {
    parent: Vec<usize>,
    size: Vec<usize>,
}

impl Dsu {
    fn new(n: usize) -> Self {
        Dsu { parent: (0..n).collect(), size: vec![1; n] }
    }
    fn find(&mut self, mut x: usize) -> usize {
        while self.parent[x] != x {
            self.parent[x] = self.parent[self.parent[x]]; // path halving
            x = self.parent[x];
        }
        x
    }
    fn union(&mut self, a: usize, b: usize) -> bool {
        let (mut a, mut b) = (self.find(a), self.find(b));
        if a == b {
            return false;
        }
        if self.size[a] < self.size[b] {
            std::mem::swap(&mut a, &mut b);
        }
        self.parent[b] = a;
        self.size[a] += self.size[b];
        true
    }
}

fn main() {
    let mut d = Dsu::new(8);
    for (a, b) in [(0, 1), (2, 3), (1, 3), (5, 6)] {
        d.union(a, b);
    }
    let (r0, r3, r5) = (d.find(0), d.find(3), d.find(5));
    println!("0~3 {} / 0~5 {}", r0 == r3, r0 == r5); // true / false
}
