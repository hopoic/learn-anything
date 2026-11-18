# Python: sorted() / list.sort() are stable (Timsort, with Powersort merging since 3.11).
import bisect
from dataclasses import dataclass
from operator import attrgetter

@dataclass
class Job:
    robot: str
    priority: int
    eta: float

jobs = [Job("amr-2", 1, 30.0), Job("amr-1", 2, 12.5), Job("amr-3", 1, 8.0)]

# Multi-key sort through stability: secondary key first, then the primary key.
jobs.sort(key=attrgetter("eta"))
jobs.sort(key=attrgetter("priority"))
print([j.robot for j in jobs])       # ['amr-3', 'amr-2', 'amr-1']
# Same result in one pass: jobs.sort(key=lambda j: (j.priority, j.eta))

a = [3, 7, 7, 19, 42, 56, 88]
print(bisect.bisect_left(a, 7), bisect.bisect_right(a, 7))   # 1 3 -> two 7s
