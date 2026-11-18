// Dynamic programming: define the state, write the recurrence, choose the fill order.
#include <algorithm>
#include <cstdio>
#include <string>
#include <vector>

// LCS: dp[i][j] = length of the LCS of a[0..i) and b[0..j).
std::string lcs(const std::string& a, const std::string& b) {
    const int n = a.size(), m = b.size();
    std::vector<std::vector<int>> dp(n + 1, std::vector<int>(m + 1, 0));
    for (int i = 1; i <= n; ++i)
        for (int j = 1; j <= m; ++j)
            dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1
                                            : std::max(dp[i - 1][j], dp[i][j - 1]);
    // Walk back from the bottom-right corner to recover one optimal answer.
    std::string out;
    for (int i = n, j = m; i > 0 && j > 0;) {
        if (a[i - 1] == b[j - 1]) { out += a[i - 1]; --i; --j; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) --i;
        else --j;
    }
    std::reverse(out.begin(), out.end());
    return out;
}

// 0/1 knapsack with a 1-D table. Capacity goes DOWNWARD so each item is used at most once.
int knapsack(const std::vector<int>& weight, const std::vector<int>& value, int cap) {
    std::vector<int> best(cap + 1, 0);
    for (std::size_t k = 0; k < weight.size(); ++k)
        for (int c = cap; c >= weight[k]; --c)
            best[c] = std::max(best[c], best[c - weight[k]] + value[k]);
    return best[cap];
}

// Longest strictly increasing subsequence in O(n log n).
// tails[k] = smallest tail of any increasing subsequence of length k + 1.
int lis(const std::vector<int>& a) {
    std::vector<int> tails;
    for (int x : a) {
        auto it = std::lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    return static_cast<int>(tails.size());
}

int main() {
    std::printf("LCS(ALGORITHM, LOGARITHM) = %s\n", lcs("ALGORITHM", "LOGARITHM").c_str());
    // Payload planning: weights in kg, value = mission score, 10 kg limit.
    std::printf("knapsack = %d\n", knapsack({5, 4, 6, 3}, {10, 40, 30, 50}, 10));
    std::printf("LIS = %d\n", lis({3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5}));
}
