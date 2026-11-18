# Python: the same O(n) loop, but each step is an interpreter dispatch on a boxed int.
import timeit

n = 5_000_000
data = list(range(n))

def manual_sum(xs):
    total = 0
    for x in xs:
        total += x
    return total

t_loop = min(timeit.repeat(lambda: manual_sum(data), number=1, repeat=3))
t_builtin = min(timeit.repeat(lambda: sum(data), number=1, repeat=3))
print(f"for-loop: {t_loop*1e3:.1f} ms   built-in sum(): {t_builtin*1e3:.1f} ms")
# Rule of thumb: push hot loops into built-ins, comprehensions, or NumPy (C underneath).
