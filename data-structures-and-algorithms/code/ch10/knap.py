# Python: write the recurrence top-down first and memoize it; switch to bottom-up
# when recursion depth or speed becomes the problem.
from functools import lru_cache

weight = [5, 4, 6, 3]
value = [10, 40, 30, 50]

@lru_cache(maxsize=None)
def best(k: int, cap: int) -> int:
    """Best value using items k.. with remaining capacity cap."""
    if k == len(weight):
        return 0
    skip = best(k + 1, cap)
    if weight[k] > cap:
        return skip
    return max(skip, value[k] + best(k + 1, cap - weight[k]))

print(best(0, 10))                          # 90
print(best.cache_info().currsize, "states computed")

table = [0] * 11                            # bottom-up, O(cap) memory
for w, v in zip(weight, value):
    for c in range(10, w - 1, -1):
        table[c] = max(table[c], table[c - w] + v)
print(table[10])                            # 90
