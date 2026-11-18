// Three structures that turn O(n) queries into O(log n) or O(length).
#include <algorithm>
#include <climits>
#include <cstdio>
#include <map>
#include <string>
#include <vector>

// Fenwick (binary indexed) tree: prefix sums with point updates, both O(log n).
struct Fenwick {
    std::vector<long long> t;                     // 1-indexed internally
    explicit Fenwick(int n) : t(n + 1, 0) {}
    void add(int i, long long delta) {            // a[i] += delta, i is 0-based
        for (++i; i < (int)t.size(); i += i & -i) t[i] += delta;   // i & -i: lowest set bit
    }
    long long prefix(int i) const {               // sum of a[0, i)
        long long s = 0;
        for (; i > 0; i -= i & -i) s += t[i];
        return s;
    }
    long long range(int l, int r) const { return prefix(r) - prefix(l); }   // [l, r)
};

// Iterative segment tree for range minimum. Any associative op works (max, sum, gcd...).
struct SegTree {
    int n;
    std::vector<int> t;
    explicit SegTree(const std::vector<int>& a) : n((int)a.size()), t(2 * a.size()) {
        std::copy(a.begin(), a.end(), t.begin() + n);              // leaves live at [n, 2n)
        for (int i = n - 1; i > 0; --i) t[i] = std::min(t[2 * i], t[2 * i + 1]);
    }
    void set(int i, int v) {
        for (t[i += n] = v; i > 1; i >>= 1) t[i >> 1] = std::min(t[i], t[i ^ 1]);
    }
    int query(int l, int r) const {               // min over [l, r)
        int res = INT_MAX;
        for (l += n, r += n; l < r; l >>= 1, r >>= 1) {
            if (l & 1) res = std::min(res, t[l++]);
            if (r & 1) res = std::min(res, t[--r]);
        }
        return res;
    }
};

// Trie: prefix lookup in O(length of prefix), independent of how many keys exist.
struct Trie {
    struct Node { std::map<char, int> next; bool end = false; };
    std::vector<Node> nodes{1};                   // node 0 is the root; indices, not pointers

    void insert(const std::string& s) {
        int cur = 0;
        for (char c : s) {
            auto it = nodes[cur].next.find(c);
            if (it != nodes[cur].next.end()) { cur = it->second; continue; }
            int fresh = (int)nodes.size();
            nodes[cur].next[c] = fresh;
            nodes.emplace_back();                 // may reallocate: never hold Node& across this
            cur = fresh;
        }
        nodes[cur].end = true;
    }
    void collect(int u, std::string& prefix, std::vector<std::string>& out) const {
        if (nodes[u].end) out.push_back(prefix);
        for (auto& [c, v] : nodes[u].next) {
            prefix.push_back(c);
            collect(v, prefix, out);
            prefix.pop_back();
        }
    }
    std::vector<std::string> starts_with(std::string prefix) const {
        int cur = 0;
        for (char c : prefix) {
            auto it = nodes[cur].next.find(c);
            if (it == nodes[cur].next.end()) return {};
            cur = it->second;
        }
        std::vector<std::string> out;
        collect(cur, prefix, out);
        return out;
    }
};

int main() {
    // Lidar returns per 22.5-degree sector, updated as scans arrive.
    std::vector<int> hits = {3, 0, 5, 2, 7, 1, 0, 4, 6, 2, 0, 0, 1, 3, 2, 5};
    Fenwick f((int)hits.size());
    for (int i = 0; i < (int)hits.size(); ++i) f.add(i, hits[i]);
    std::printf("sectors [4, 8): %lld hits\n", f.range(4, 8));
    f.add(5, 10);
    std::printf("after update:   %lld hits\n", f.range(4, 8));

    // Battery levels of 8 robots: lowest battery in a group, with live updates.
    SegTree battery({80, 64, 15, 92, 55, 71, 38, 99});
    std::printf("min battery robots 0..3: %d\n", battery.query(0, 4));
    battery.set(2, 100);                          // robot 2 finished charging
    std::printf("min battery robots 0..3: %d\n", battery.query(0, 4));

    Trie topics;
    for (auto t : {"/amr1/odom", "/amr1/scan", "/amr2/odom", "/amr2/cmd_vel", "/map"}) topics.insert(t);
    std::printf("topics under /amr2:");
    for (auto& s : topics.starts_with("/amr2")) std::printf(" %s", s.c_str());
    std::printf("\n");
}
