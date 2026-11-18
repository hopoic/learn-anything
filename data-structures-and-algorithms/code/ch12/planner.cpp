// mini_planner.cpp - grid path planner: A* with an octile heuristic on an 8-connected map.
// Build: g++ -O2 -std=c++17 mini_planner.cpp -o planner && ./planner
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <functional>
#include <queue>
#include <string>
#include <vector>

struct Grid {
    int w = 0, h = 0;
    std::vector<std::string> rows;
    bool free(int x, int y) const {
        return x >= 0 && y >= 0 && x < w && y < h && rows[y][x] != '#';
    }
    int id(int x, int y) const { return y * w + x; }
};

struct Result {
    std::vector<int> path;     // cell ids from start to goal; empty if unreachable
    double cost = 0;
    int expanded = 0;          // nodes taken off the open list: the real cost of a search
};

constexpr double SQRT2 = 1.41421356237309504880;

// Octile distance: the exact cost on an obstacle-free 8-connected grid,
// so it never overestimates (admissible) and is consistent.
double octile(int dx, int dy) {
    dx = std::abs(dx);
    dy = std::abs(dy);
    return (dx + dy) + (SQRT2 - 2) * std::min(dx, dy);
}

// h_weight = 0 -> Dijkstra, 1 -> A*, > 1 -> weighted A* (faster, not optimal).
Result astar(const Grid& g, int sx, int sy, int gx, int gy, double h_weight = 1.0) {
    const int n = g.w * g.h;
    std::vector<double> gcost(n, INFINITY);
    std::vector<int> parent(n, -1);
    std::vector<char> closed(n, 0);
    using Item = std::pair<double, int>;                          // (f = g + h, cell id)
    std::priority_queue<Item, std::vector<Item>, std::greater<>> open;

    auto h = [&](int x, int y) { return h_weight * octile(gx - x, gy - y); };
    const int s = g.id(sx, sy), t = g.id(gx, gy);
    gcost[s] = 0;
    open.push({h(sx, sy), s});

    static const int DX[8] = {1, -1, 0, 0, 1, 1, -1, -1};
    static const int DY[8] = {0, 0, 1, -1, 1, -1, 1, -1};
    Result r;
    while (!open.empty()) {
        int u = open.top().second;
        open.pop();
        if (closed[u]) continue;                                  // stale duplicate entry
        closed[u] = 1;
        ++r.expanded;
        if (u == t) break;                                        // goal popped: g is final
        const int ux = u % g.w, uy = u / g.w;
        for (int k = 0; k < 8; ++k) {
            const int vx = ux + DX[k], vy = uy + DY[k];
            if (!g.free(vx, vy)) continue;
            const bool diag = k >= 4;
            // No corner cutting: a diagonal step needs both side cells free.
            if (diag && (!g.free(ux + DX[k], uy) || !g.free(ux, uy + DY[k]))) continue;
            const int v = g.id(vx, vy);
            const double ng = gcost[u] + (diag ? SQRT2 : 1.0);
            if (ng < gcost[v]) {
                gcost[v] = ng;
                parent[v] = u;
                open.push({ng + h(vx, vy), v});
            }
        }
    }
    if (gcost[t] == INFINITY) return r;
    r.cost = gcost[t];
    for (int v = t; v != -1; v = parent[v]) r.path.push_back(v);
    std::reverse(r.path.begin(), r.path.end());
    return r;
}

int main() {
    Grid g;
    g.rows = {
        "S.........#.........",
        "..........#.........",
        "....####..#..#####..",
        ".......#.....#......",
        ".......#.....#......",
        "..######.....#..###.",
        ".............#....#.",
        "..........####....#G",
    };
    g.h = (int)g.rows.size();
    g.w = (int)g.rows[0].size();
    const int sx = 0, sy = 0, gx = 19, gy = 7;

    struct Run { const char* name; double w; };
    for (const Run& run : {Run{"Dijkstra (h=0)", 0.0}, Run{"A* (octile)", 1.0}, Run{"Weighted A* (2h)", 2.0}}) {
        Result r = astar(g, sx, sy, gx, gy, run.w);
        std::printf("%-17s cost %6.2f  expanded %3d / %d cells\n", run.name, r.cost, r.expanded, g.w * g.h);
    }

    Result best = astar(g, sx, sy, gx, gy);
    auto out = g.rows;
    for (int v : best.path) {
        char& c = out[v / g.w][v % g.w];
        if (c == '.') c = '*';
    }
    for (auto& row : out) std::printf("%s\n", row.c_str());
}
