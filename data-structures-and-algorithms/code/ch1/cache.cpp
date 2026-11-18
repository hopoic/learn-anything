// Same O(n) traversal, very different constants: contiguous vs node-based memory.
#include <algorithm>
#include <chrono>
#include <cstdio>
#include <list>
#include <numeric>
#include <vector>

template <class F>
double time_ms(F&& f, int reps = 5) {
    double best = 1e300;
    for (int r = 0; r < reps; ++r) {
        auto t0 = std::chrono::steady_clock::now();
        f();
        auto t1 = std::chrono::steady_clock::now();
        best = std::min(best, std::chrono::duration<double, std::milli>(t1 - t0).count());
    }
    return best;  // best-of-N filters out scheduler noise
}

int main() {
    const int n = 5'000'000;
    std::vector<int> vec(n);
    std::iota(vec.begin(), vec.end(), 0);
    std::list<int> lst(vec.begin(), vec.end());   // one heap node (~24 bytes) per int

    long long s1 = 0, s2 = 0;
    double tv = time_ms([&] { s1 = std::accumulate(vec.begin(), vec.end(), 0LL); });
    double tl = time_ms([&] { s2 = std::accumulate(lst.begin(), lst.end(), 0LL); });

    // Print the sums so the compiler cannot delete the loops.
    std::printf("vector: %.2f ms  list: %.2f ms  (x%.1f)  sums %lld %lld\n",
                tv, tl, tl / tv, s1, s2);
}
