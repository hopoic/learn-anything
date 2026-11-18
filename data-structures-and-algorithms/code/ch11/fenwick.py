# Python: the same few lines. If the data never changes, itertools.accumulate
# (or numpy.cumsum) is simpler; Fenwick wins when updates and queries interleave.
class Fenwick:
    def __init__(self, n: int):
        self.t = [0] * (n + 1)

    def add(self, i: int, d: int) -> None:
        i += 1
        while i < len(self.t):
            self.t[i] += d
            i += i & -i

    def prefix(self, i: int) -> int:      # sum of a[0:i]
        s = 0
        while i > 0:
            s += self.t[i]
            i -= i & -i
        return s

hits = [3, 0, 5, 2, 7, 1, 0, 4, 6, 2, 0, 0, 1, 3, 2, 5]
f = Fenwick(len(hits))
for i, h in enumerate(hits):
    f.add(i, h)
print(f.prefix(8) - f.prefix(4))   # 12
