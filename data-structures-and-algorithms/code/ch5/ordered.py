# Python has no built-in sorted map. A sorted list + bisect covers read-heavy cases;
# for frequent inserts use the third-party sortedcontainers.SortedDict.
import bisect

times = [100, 250, 900]                 # kept sorted
names = ["boot", "localize", "dock"]

def insert(t, name):
    i = bisect.bisect_left(times, t)    # O(log n) search ...
    times.insert(i, t)                  # ... but O(n) shift: fine up to ~1e5 items
    names.insert(i, name)

insert(400, "plan")
i = bisect.bisect_left(times, 300)      # lower_bound: first t >= 300
print(times[i], names[i])               # 400 plan

lo, hi = bisect.bisect_left(times, 200), bisect.bisect_left(times, 500)
print(list(zip(times[lo:hi], names[lo:hi])))   # range [200, 500)
