# Python: deque for BFS; graphlib (3.9+) for topological sorting with cycle detection.
from collections import deque
from graphlib import CycleError, TopologicalSorter

def bfs(adj: dict, src):
    dist = {src: 0}
    q = deque([src])
    while q:
        u = q.popleft()
        for v in adj.get(u, ()):
            if v not in dist:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist

adj = {"driver": ["tf"], "tf": ["localization", "controller"],
       "map_server": ["localization", "planner"], "localization": ["planner"],
       "planner": ["controller"]}
print(bfs(adj, "driver")["controller"])        # 2

# TopologicalSorter wants predecessors: {node: {nodes that must come first}}
preds = {}
for u, vs in adj.items():
    for v in vs:
        preds.setdefault(v, set()).add(u)
print(list(TopologicalSorter(preds).static_order()))

preds["driver"] = {"controller"}               # introduce a cycle
try:
    list(TopologicalSorter(preds).static_order())
except CycleError as e:
    print("cycle:", e.args[1])
