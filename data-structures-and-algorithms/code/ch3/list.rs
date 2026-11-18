// Rust: a singly linked stack. Option<Box<Node>> is a "nullable owning pointer".
// A doubly linked list needs two owners per node and fights the borrow checker.
struct Node<T> {
    value: T,
    next: Option<Box<Node<T>>>,
}

pub struct Stack<T> {
    head: Option<Box<Node<T>>>,
}

impl<T> Stack<T> {
    pub fn new() -> Self {
        Stack { head: None }
    }

    pub fn push(&mut self, value: T) {
        let old = self.head.take(); // move out, leaving None behind
        self.head = Some(Box::new(Node { value, next: old }));
    }

    pub fn pop(&mut self) -> Option<T> {
        self.head.take().map(|node| {
            self.head = node.next;
            node.value
        })
    }

    pub fn reverse(&mut self) {
        let mut prev: Option<Box<Node<T>>> = None;
        let mut cur = self.head.take();
        while let Some(mut node) = cur {
            cur = node.next.take();
            node.next = prev;
            prev = Some(node);
        }
        self.head = prev;
    }
}

impl<T> Drop for Stack<T> {
    // Same issue as in C++: the default drop recurses per node. Unlink iteratively.
    fn drop(&mut self) {
        let mut cur = self.head.take();
        while let Some(mut node) = cur {
            cur = node.next.take();
        }
    }
}

fn main() {
    let mut s = Stack::new();
    for i in 1..=5 {
        s.push(i);
    }
    s.reverse();
    while let Some(v) = s.pop() {
        print!("{v} ");
    }
    println!();

    let mut big = Stack::new();
    for i in 0..1_000_000 {
        big.push(i); // dropped safely at the end of main
    }
}
