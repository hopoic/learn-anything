# Python port of the planner core: same algorithm, handy for prototyping and plotting.
import heapq
import math

SQRT2 = math.sqrt(2)
MOVES = [(1, 0, 1.0), (-1, 0, 1.0), (0, 1, 1.0), (0, -1, 1.0),
         (1, 1, SQRT2), (1, -1, SQRT2), (-1, 1, SQRT2), (-1, -1, SQRT2)]

def octile(dx, dy):
    dx, dy = abs(dx), abs(dy)
    return dx + dy + (SQRT2 - 2) * min(dx, dy)

def astar(rows, start, goal, w=1.0):
    H, W = len(rows), len(rows[0])
    def free(x, y):
        return 0 <= x < W and 0 <= y < H and rows[y][x] != "#"

    g, parent, closed = {start: 0.0}, {start: None}, set()
    open_ = [(w * octile(goal[0] - start[0], goal[1] - start[1]), start)]
    while open_:
        _, u = heapq.heappop(open_)
        if u in closed:
            continue
        closed.add(u)
        if u == goal:
            break
        ux, uy = u
        for dx, dy, step in MOVES:
            vx, vy = ux + dx, uy + dy
            if not free(vx, vy):
                continue
            if dx and dy and not (free(ux + dx, uy) and free(ux, uy + dy)):
                continue                                   # no corner cutting
            ng = g[u] + step
            if ng < g.get((vx, vy), math.inf):
                g[(vx, vy)] = ng
                parent[(vx, vy)] = u
                heapq.heappush(open_, (ng + w * octile(goal[0] - vx, goal[1] - vy), (vx, vy)))
    if goal not in g:
        return None, len(closed)
    path, v = [], goal
    while v is not None:
        path.append(v)
        v = parent[v]
    return (g[goal], path[::-1]), len(closed)

ROWS = ["S.........#.........",
        "..........#.........",
        "....####..#..#####..",
        ".......#.....#......",
        ".......#.....#......",
        "..######.....#..###.",
        ".............#....#.",
        "..........####....#G"]

(cost, path), expanded = astar(ROWS, (0, 0), (19, 7))
print(f"cost {cost:.2f}, {len(path)} cells, expanded {expanded}")
