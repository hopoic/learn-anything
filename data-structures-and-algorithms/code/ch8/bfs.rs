// Rust: VecDeque as the BFS queue; adjacency as Vec<Vec<usize>>.
use std::collections::VecDeque;

fn bfs(adj: &[Vec<usize>], src: usize) -> Vec<Option<u32>> {
    let mut dist = vec![None; adj.len()];
    let mut q = VecDeque::new();
    dist[src] = Some(0);
    q.push_back(src);
    while let Some(u) = q.pop_front() {
        let du = dist[u].unwrap();
        for &v in &adj[u] {
            if dist[v].is_none() {
                dist[v] = Some(du + 1);
                q.push_back(v);
            }
        }
    }
    dist
}

fn main() {
    // 0 driver, 1 tf, 2 localization, 3 map_server, 4 planner, 5 controller
    let mut adj = vec![Vec::new(); 6];
    for (u, v) in [(0, 1), (1, 2), (3, 2), (2, 4), (3, 4), (4, 5), (1, 5)] {
        adj[u].push(v);
    }
    let d = bfs(&adj, 0);
    println!("{d:?}"); // map_server (3) is unreachable from driver: None
}
