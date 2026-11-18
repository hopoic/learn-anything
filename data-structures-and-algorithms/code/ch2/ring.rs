// Rust: const generics give a fixed-capacity ring with no heap allocation.
struct Ring<T: Copy + Default, const N: usize> {
    buf: [T; N],
    head: usize,
    tail: usize,
}

impl<T: Copy + Default, const N: usize> Ring<T, N> {
    // Evaluated at compile time: a non-power-of-two N fails the build.
    const MASK: usize = {
        assert!(N.is_power_of_two());
        N - 1
    };

    fn new() -> Self {
        Self { buf: [T::default(); N], head: 0, tail: 0 }
    }
    fn push(&mut self, v: T) -> Result<(), T> {
        if self.head.wrapping_sub(self.tail) == N {
            return Err(v); // hand the value back to the caller when full
        }
        self.buf[self.head & Self::MASK] = v;
        self.head = self.head.wrapping_add(1);
        Ok(())
    }
    fn pop(&mut self) -> Option<T> {
        if self.head == self.tail {
            return None;
        }
        let v = self.buf[self.tail & Self::MASK];
        self.tail = self.tail.wrapping_add(1);
        Some(v)
    }
}

fn main() {
    let mut r: Ring<u8, 4> = Ring::new();
    for i in 0..6u8 {
        println!("push {i}: {:?}", r.push(i));
    }
    while let Some(v) = r.pop() {
        println!("pop {v}");
    }
    // std::collections::VecDeque is the growable, general-purpose ring buffer.
}
