// Weighted graphs: Dijkstra (lazy deletion), Bellman-Ford, union-find, Kruskal's MST.
#include <algorithm>
#include <cstdio>
#include <functional>
#include <limits>
#include <numeric>
#include <queue>
#include <vector>

struct Edge { int to; double w; };
using WGraph = std::vector<std::vector<Edge>>;
constexpr double INF = std::numeric_limits<double>::infinity();

// O((V + E) log V). Requires every w >= 0.
std::vector<double> dijkstra(const WGraph& g, int src, std::vector<int>& parent) {
    std::vector<double> dist(g.size(), INF);
    parent.assign(g.size(), -1);
    using Item = std::pair<double, int>;                                // (distance, node)
    std::priority_queue<Item, std::vector<Item>, std::greater<>> pq;    // min-heap
    dist[src] = 0;
    pq.push({0, src});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;            // stale entry: skip (lazy deletion)
        for (auto [v, w] : g[u])
            if (dist[u] + w < dist[v]) {      // relax
                dist[v] = dist[u] + w;
                parent[v] = u;
                pq.push({dist[v], v});
            }
    }
    return dist;
}

struct WEdge { int u, v; double w; };

// O(V * E). Allows negative weights; returns false if a negative cycle is reachable.
bool bellman_ford(int n, const std::vector<WEdge>& edges, int src, std::vector<double>& dist) {
    dist.assign(n, INF);
    dist[src] = 0;
    for (int round = 0; round < n - 1; ++round) {
        bool changed = false;
        for (auto& e : edges)
            if (dist[e.u] + e.w < dist[e.v]) { dist[e.v] = dist[e.u] + e.w; changed = true; }
        if (!changed) return true;                       // converged early
    }
    for (auto& e : edges)
        if (dist[e.u] + e.w < dist[e.v]) return false;   // still improving => negative cycle
    return true;
}

struct DSU {
    std::vector<int> parent, size;
    explicit DSU(int n) : parent(n), size(n, 1) { std::iota(parent.begin(), parent.end(), 0); }
    int find(int x) {
        while (parent[x] != x) {
            parent[x] = parent[parent[x]];               // path halving
            x = parent[x];
        }
        return x;
    }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;                        // already connected
        if (size[a] < size[b]) std::swap(a, b);          // union by size
        parent[b] = a;
        size[a] += size[b];
        return true;
    }
};

// Kruskal: sort edges by weight; keep each edge that joins two different components.
double kruskal(int n, std::vector<WEdge> edges, std::vector<WEdge>& chosen) {
    std::sort(edges.begin(), edges.end(), [](const WEdge& a, const WEdge& b) { return a.w < b.w; });
    DSU dsu(n);
    double total = 0;
    for (auto& e : edges)
        if (dsu.unite(e.u, e.v)) { chosen.push_back(e); total += e.w; }
    return total;
}

int main() {
    // Charging stations and corridors, weights in meters.
    const char* name[] = {"dock", "A", "B", "C", "D"};
    std::vector<WEdge> corridors = {{0, 1, 4}, {0, 2, 1}, {2, 1, 2}, {1, 3, 5},
                                    {2, 3, 8}, {3, 4, 3}, {2, 4, 9}};
    WGraph g(5);
    for (auto& e : corridors) { g[e.u].push_back({e.v, e.w}); g[e.v].push_back({e.u, e.w}); }

    std::vector<int> parent;
    auto dist = dijkstra(g, 0, parent);
    std::vector<int> path;
    for (int v = 4; v != -1; v = parent[v]) path.push_back(v);
    std::printf("dock -> D: %.0f m via", dist[4]);
    for (auto it = path.rbegin(); it != path.rend(); ++it) std::printf(" %s", name[*it]);
    std::printf("\n");

    std::vector<WEdge> mst;
    std::printf("cable to connect all stations: %.0f m\n", kruskal(5, corridors, mst));

    std::vector<WEdge> directed = {{0, 1, 4}, {1, 2, -2}, {2, 3, 3}, {3, 1, -2}};
    std::vector<double> bf;
    std::printf("negative cycle: %s\n", bellman_ford(4, directed, 0, bf) ? "no" : "yes");
}
