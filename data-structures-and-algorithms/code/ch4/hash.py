# Python: dict is an open-addressing hash table; insertion order is guaranteed (3.7+).
from collections import Counter, defaultdict
from dataclasses import dataclass

counts = Counter(["nav", "power", "nav", "dds", "nav"])
print(counts.most_common(2))           # [('nav', 3), ('power', 1)]

by_service = defaultdict(list)
by_service["nav"].append("amr-001")    # no KeyError on first access

# Custom keys need consistent __eq__ and __hash__. frozen=True generates both
# and makes the object immutable, which is exactly what a key should be.
@dataclass(frozen=True)
class Cell:
    x: int
    y: int

cost = {Cell(0, 0): 1.0, Cell(3, 4): 2.5}
print(cost[Cell(3, 4)])                # 2.5

# Mutable objects (list, dict, set) are unhashable on purpose:
try:
    {[1, 2]: "x"}
except TypeError as e:
    print("TypeError:", e)
