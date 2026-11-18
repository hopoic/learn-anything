# Python: heapq turns a plain list into a MIN-heap. There is no heap class.
import heapq
import itertools

timers = []
seq = itertools.count()    # tie-breaker: equal deadlines pop in insertion order,
                           # and the payload itself is never compared
for deadline, name in [(50.0, "publish /odom"), (10.0, "watchdog kick"),
                       (33.3, "camera frame"), (10.0, "imu read")]:
    heapq.heappush(timers, (deadline, next(seq), name))

while timers:
    deadline, _, name = heapq.heappop(timers)
    print(f"{deadline:6.1f} ms  {name}")

data = [9, 4, 7, 1, 8, 2]
heapq.heapify(data)                     # O(n), in place
print(heapq.nsmallest(3, [9, 4, 7, 1, 8, 2]))   # [1, 2, 4]
# Max-heap of numbers: push negated keys, e.g. heapq.heappush(h, -priority).
