// Three sorts worth knowing by heart, plus a hand-written lower_bound.
#include <algorithm>
#include <cstdio>
#include <random>
#include <vector>

void insertion_sort(std::vector<int>& a, int lo, int hi) {   // sorts a[lo, hi)
    for (int i = lo + 1; i < hi; ++i) {
        int x = a[i], j = i;
        while (j > lo && a[j - 1] > x) { a[j] = a[j - 1]; --j; }   // shift, don't swap
        a[j] = x;
    }
}

void merge_sort(std::vector<int>& a, std::vector<int>& tmp, int lo, int hi) {   // a[lo, hi)
    if (hi - lo <= 16) { insertion_sort(a, lo, hi); return; }  // small runs: insertion wins
    int mid = lo + (hi - lo) / 2;
    merge_sort(a, tmp, lo, mid);
    merge_sort(a, tmp, mid, hi);
    if (a[mid - 1] <= a[mid]) return;                           // halves already in order
    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) tmp[k++] = a[j] < a[i] ? a[j++] : a[i++];  // ties take left: stable
    while (i < mid) tmp[k++] = a[i++];
    while (j < hi) tmp[k++] = a[j++];
    std::copy(tmp.begin() + lo, tmp.begin() + hi, a.begin() + lo);
}

int median_of_three(std::vector<int>& a, int lo, int hi) {     // hi inclusive
    int mid = lo + (hi - lo) / 2;
    if (a[mid] < a[lo]) std::swap(a[mid], a[lo]);
    if (a[hi] < a[lo]) std::swap(a[hi], a[lo]);
    if (a[hi] < a[mid]) std::swap(a[hi], a[mid]);
    return a[mid];
}

void quick_sort(std::vector<int>& a, int lo, int hi) {         // sorts a[lo, hi]
    while (hi - lo > 16) {
        int pivot = median_of_three(a, lo, hi);
        int i = lo, j = hi;
        while (i <= j) {                                         // Hoare-style partition
            while (a[i] < pivot) ++i;
            while (a[j] > pivot) --j;
            if (i <= j) std::swap(a[i++], a[j--]);
        }
        // Recurse into the smaller side, loop on the larger: O(log n) stack, always.
        if (j - lo < hi - i) { quick_sort(a, lo, j); lo = i; }
        else { quick_sort(a, i, hi); hi = j; }
    }
    insertion_sort(a, lo, hi + 1);
}

// First index i with a[i] >= x (a.size() if none). Half-open [lo, hi) never goes wrong.
int lower_bound(const std::vector<int>& a, int x) {
    int lo = 0, hi = static_cast<int>(a.size());
    while (lo < hi) {
        int mid = lo + (hi - lo) / 2;      // not (lo + hi) / 2: that can overflow
        if (a[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

int main() {
    std::mt19937 rng{1};
    std::vector<int> base(100000);
    for (int& v : base) v = static_cast<int>(rng() % 1000);  // many duplicates on purpose

    auto ref = base;
    std::sort(ref.begin(), ref.end());

    auto m = base, tmp = base;
    merge_sort(m, tmp, 0, static_cast<int>(m.size()));
    auto q = base;
    quick_sort(q, 0, static_cast<int>(q.size()) - 1);

    std::printf("merge ok: %d, quick ok: %d\n", m == ref, q == ref);
    int i = lower_bound(ref, 500);
    std::printf("lower_bound(500) = %d (std: %d)\n", i,
                static_cast<int>(std::lower_bound(ref.begin(), ref.end(), 500) - ref.begin()));
}
