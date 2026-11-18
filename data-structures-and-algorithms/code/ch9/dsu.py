# Python: union-find in a few lines. The loop-based find avoids RecursionError.
class DSU:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.size = [1] * n

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]   # path halving
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> bool:
        a, b = self.find(a), self.find(b)
        if a == b:
            return False
        if self.size[a] < self.size[b]:
            a, b = b, a
        self.parent[b] = a
        self.size[a] += self.size[b]
        return True

d = DSU(8)
for a, b in [(0, 1), (2, 3), (1, 3), (5, 6)]:
    d.union(a, b)
print(d.find(0) == d.find(3), d.find(0) == d.find(5))   # True False
print(len({d.find(i) for i in range(8)}), "components")  # 4 components
