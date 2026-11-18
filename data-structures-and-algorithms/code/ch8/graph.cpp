// Graph basics on an adjacency list: BFS (fewest hops), iterative DFS, Kahn's topo sort.
#include <cstdio>
#include <queue>
#include <stack>
#include <vector>

using Graph = std::vector<std::vector<int>>;

std::vector<int> bfs(const Graph& g, int src) {
    std::vector<int> dist(g.size(), -1);
    std::queue<int> q;
    dist[src] = 0;
    q.push(src);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int v : g[u])
            if (dist[v] == -1) {          // mark when ENQUEUED, not when popped
                dist[v] = dist[u] + 1;
                q.push(v);
            }
    }
    return dist;
}

std::vector<int> dfs_order(const Graph& g, int src) {
    std::vector<int> order;
    std::vector<bool> seen(g.size());
    std::stack<int> st;                   // explicit stack: no recursion depth limit
    st.push(src);
    while (!st.empty()) {
        int u = st.top(); st.pop();
        if (seen[u]) continue;            // a node may be pushed more than once
        seen[u] = true;
        order.push_back(u);
        for (auto it = g[u].rbegin(); it != g[u].rend(); ++it)   // reversed: visit in list order
            if (!seen[*it]) st.push(*it);
    }
    return order;
}

// Order in which every edge u->v has u before v; empty if the graph has a cycle.
std::vector<int> topo_sort(const Graph& g) {
    std::vector<int> indeg(g.size()), order;
    for (const auto& adj : g) for (int v : adj) ++indeg[v];
    std::queue<int> q;
    for (int u = 0; u < (int)g.size(); ++u) if (indeg[u] == 0) q.push(u);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (int v : g[u]) if (--indeg[v] == 0) q.push(v);
    }
    if (order.size() != g.size()) order.clear();   // leftover nodes sit on a cycle
    return order;
}

int main() {
    const char* name[] = {"driver", "tf", "localization", "map_server", "planner", "controller"};
    Graph deps(6);
    auto edge = [&](int u, int v) { deps[u].push_back(v); };   // u must start before v
    edge(0, 1); edge(1, 2); edge(3, 2); edge(2, 4); edge(3, 4); edge(4, 5); edge(1, 5);

    std::printf("start order:");
    for (int u : topo_sort(deps)) std::printf(" %s", name[u]);
    std::printf("\n");

    auto d = bfs(deps, 0);
    std::printf("hops from driver to controller: %d\n", d[5]);

    std::printf("dfs from map_server:");
    for (int u : dfs_order(deps, 3)) std::printf(" %s", name[u]);
    std::printf("\n");
}
