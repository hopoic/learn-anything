# Python: collections.deque(maxlen=N) is a ring that silently drops the oldest item.
from collections import deque

log = deque(maxlen=4)
for i in range(6):
    log.append(i)
print(list(log))          # [2, 3, 4, 5]  oldest entries were overwritten

# If you need "reject when full" semantics instead, write it explicitly:
class Ring:
    def __init__(self, cap: int):
        self.buf = [None] * cap
        self.head = self.tail = 0
        self.cap = cap

    def push(self, v) -> bool:
        if self.head - self.tail == self.cap:
            return False
        self.buf[self.head % self.cap] = v
        self.head += 1
        return True

    def pop(self):
        if self.head == self.tail:
            return None
        v = self.buf[self.tail % self.cap]
        self.tail += 1
        return v

r = Ring(4)
print([r.push(i) for i in range(6)])   # [True, True, True, True, False, False]
print([r.pop() for _ in range(5)])     # [0, 1, 2, 3, None]
