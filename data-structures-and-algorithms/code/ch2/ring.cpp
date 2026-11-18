// C++: the same ring as a template; std::optional makes "empty" explicit.
#include <array>
#include <cstddef>
#include <cstdio>
#include <optional>

template <class T, std::size_t N>
class Ring {
    static_assert(N && (N & (N - 1)) == 0, "N must be a power of two");
public:
    bool push(const T& v) {
        if (head_ - tail_ == N) return false;
        buf_[head_++ & (N - 1)] = v;
        return true;
    }
    std::optional<T> pop() {
        if (head_ == tail_) return std::nullopt;
        return buf_[tail_++ & (N - 1)];
    }
    std::size_t size() const { return head_ - tail_; }
private:
    std::array<T, N> buf_{};
    std::size_t head_ = 0, tail_ = 0;    // single-threaded; see the C tab for SPSC atomics
};

int main() {
    Ring<int, 4> r;
    for (int i = 0; i < 6; ++i) std::printf("push %d: %s\n", i, r.push(i) ? "ok" : "full");
    while (auto v = r.pop()) std::printf("pop %d\n", *v);
}
