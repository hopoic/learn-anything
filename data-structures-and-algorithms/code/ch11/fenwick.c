// C: Fenwick tree over a static array. i & -i isolates the lowest set bit.
#include <stdio.h>

#define N 16
static long long tree[N + 1];           /* 1-indexed */

static void add(int i, long long d) { for (++i; i <= N; i += i & -i) tree[i] += d; }
static long long prefix(int i) { long long s = 0; for (; i > 0; i -= i & -i) s += tree[i]; return s; }

int main(void) {
    int hits[N] = {3, 0, 5, 2, 7, 1, 0, 4, 6, 2, 0, 0, 1, 3, 2, 5};
    for (int i = 0; i < N; ++i) add(i, hits[i]);
    printf("sectors [4, 8): %lld hits\n", prefix(8) - prefix(4));   /* 12 */
    add(5, 10);
    printf("sectors [4, 8): %lld hits\n", prefix(8) - prefix(4));   /* 22 */
    return 0;
}
