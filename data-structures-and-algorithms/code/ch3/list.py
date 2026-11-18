# Python: you rarely write a linked list. Pick the right built-in instead.
from collections import deque

stack = []                 # list: append/pop at the END are amortized O(1)
stack.append(1)
stack.append(2)
print(stack.pop())         # 2

queue = deque()            # deque: O(1) at both ends (list.pop(0) is O(n)!)
queue.append("a")
queue.append("b")
print(queue.popleft())     # a

# When you do need nodes (to learn, or to splice in O(1)):
class Node:
    __slots__ = ("value", "next")      # no per-object __dict__: less memory
    def __init__(self, value, next=None):
        self.value, self.next = value, next

def reverse(head):
    prev = None
    while head:
        head.next, prev, head = prev, head, head.next
    return prev

head = reverse(Node(1, Node(2, Node(3))))
out = []
while head:
    out.append(head.value)
    head = head.next
print(out)                 # [3, 2, 1]
