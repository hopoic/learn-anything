// Binary min-heap in an array: parent(i) = (i-1)/2, children 2i+1 and 2i+2.
#include <cstddef>
#include <cstdio>
#include <functional>
#include <utility>
#include <vector>

template <class T, class Less = std::less<T>>
class MinHeap {
    std::vector<T> a_;
    Less less_;

    void sift_up(std::size_t i) {
        while (i > 0) {
            std::size_t p = (i - 1) / 2;
            if (!less_(a_[i], a_[p])) break;      // heap property holds: stop
            std::swap(a_[i], a_[p]);
            i = p;
        }
    }
    void sift_down(std::size_t i) {
        const std::size_t n = a_.size();
        for (;;) {
            std::size_t l = 2 * i + 1, r = l + 1, m = i;
            if (l < n && less_(a_[l], a_[m])) m = l;
            if (r < n && less_(a_[r], a_[m])) m = r;
            if (m == i) break;
            std::swap(a_[i], a_[m]);
            i = m;
        }
    }

public:
    MinHeap() = default;
    // Floyd's heapify: sift down from the last parent. O(n), not O(n log n).
    explicit MinHeap(std::vector<T> v) : a_(std::move(v)) {
        for (std::size_t i = a_.size() / 2; i-- > 0;) sift_down(i);
    }
    void push(T v) { a_.push_back(std::move(v)); sift_up(a_.size() - 1); }
    const T& top() const { return a_.front(); }
    void pop() {
        if (a_.size() > 1) a_.front() = std::move(a_.back());   // last leaf to the root
        a_.pop_back();
        if (!a_.empty()) sift_down(0);
    }
    bool empty() const { return a_.empty(); }
    std::size_t size() const { return a_.size(); }
};

struct Timer {
    double deadline_ms;
    const char* name;
    bool operator<(const Timer& o) const { return deadline_ms < o.deadline_ms; }
};

int main() {
    MinHeap<Timer> timers;
    timers.push({50.0, "publish /odom"});
    timers.push({10.0, "watchdog kick"});
    timers.push({33.3, "camera frame"});
    timers.push({12.5, "imu read"});
    while (!timers.empty()) {
        std::printf("%6.1f ms  %s\n", timers.top().deadline_ms, timers.top().name);
        timers.pop();
    }

    MinHeap<int> h({9, 4, 7, 1, 8, 2});   // O(n) build
    std::printf("min = %d\n", h.top());
}
