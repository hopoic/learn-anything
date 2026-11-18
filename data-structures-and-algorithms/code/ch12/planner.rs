// Rust port: f64 is not Ord, so the heap item implements Ord through total_cmp.
use std::cmp::Ordering;
use std::collections::BinaryHeap;
use std::f64::consts::SQRT_2;

struct Item {
    f: f64,
    id: usize,
}
impl Ord for Item {
    fn cmp(&self, o: &Self) -> Ordering {
        o.f.total_cmp(&self.f) // reversed: BinaryHeap is a max-heap
    }
}
impl PartialOrd for Item {
    fn partial_cmp(&self, o: &Self) -> Option<Ordering> {
        Some(self.cmp(o))
    }
}
impl PartialEq for Item {
    fn eq(&self, o: &Self) -> bool {
        self.cmp(o) == Ordering::Equal
    }
}
impl Eq for Item {}

fn octile(dx: i32, dy: i32) -> f64 {
    let (dx, dy) = (dx.abs() as f64, dy.abs() as f64);
    dx + dy + (SQRT_2 - 2.0) * dx.min(dy)
}

fn astar(rows: &[&str], s: (i32, i32), t: (i32, i32)) -> Option<(f64, Vec<(i32, i32)>)> {
    let (h, w) = (rows.len() as i32, rows[0].len() as i32);
    let free = |x: i32, y: i32| {
        x >= 0 && y >= 0 && x < w && y < h && rows[y as usize].as_bytes()[x as usize] != b'#'
    };
    let id = |x: i32, y: i32| (y * w + x) as usize;
    let n = (w * h) as usize;
    let (mut g, mut parent, mut closed) = (vec![f64::INFINITY; n], vec![usize::MAX; n], vec![false; n]);
    let mut open = BinaryHeap::new();
    let (start, goal) = (id(s.0, s.1), id(t.0, t.1));
    g[start] = 0.0;
    open.push(Item { f: octile(t.0 - s.0, t.1 - s.1), id: start });

    while let Some(Item { id: u, .. }) = open.pop() {
        if std::mem::replace(&mut closed[u], true) {
            continue; // already expanded
        }
        if u == goal {
            break;
        }
        let (ux, uy) = (u as i32 % w, u as i32 / w);
        for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)] {
            let (vx, vy) = (ux + dx, uy + dy);
            let diag = dx != 0 && dy != 0;
            if !free(vx, vy) || (diag && !(free(ux + dx, uy) && free(ux, uy + dy))) {
                continue;
            }
            let v = id(vx, vy);
            let ng = g[u] + if diag { SQRT_2 } else { 1.0 };
            if ng < g[v] {
                g[v] = ng;
                parent[v] = u;
                open.push(Item { f: ng + octile(t.0 - vx, t.1 - vy), id: v });
            }
        }
    }
    if g[goal].is_infinite() {
        return None;
    }
    let mut path = Vec::new();
    let mut v = goal;
    while v != usize::MAX {
        path.push((v as i32 % w, v as i32 / w));
        v = parent[v];
    }
    path.reverse();
    Some((g[goal], path))
}

fn main() {
    let rows = [
        "S.........#.........",
        "..........#.........",
        "....####..#..#####..",
        ".......#.....#......",
        ".......#.....#......",
        "..######.....#..###.",
        ".............#....#.",
        "..........####....#G",
    ];
    match astar(&rows, (0, 0), (19, 7)) {
        Some((cost, path)) => println!("cost {cost:.2}, {} cells", path.len()),
        None => println!("no path"),
    }
}
