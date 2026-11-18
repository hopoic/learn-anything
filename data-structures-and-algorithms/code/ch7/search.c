// C: qsort and bsearch call the comparator through a function pointer (no inlining),
// and bsearch only answers "is it there", not "where would it go".
#include <stdio.h>
#include <stdlib.h>

static int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a, y = *(const int *)b;
    return (x > y) - (x < y);
}

/* lower_bound: first index with a[i] >= x */
static size_t lower_bound(const int *a, size_t n, int x) {
    size_t lo = 0, hi = n;
    while (lo < hi) {
        size_t mid = lo + (hi - lo) / 2;
        if (a[mid] < x) lo = mid + 1; else hi = mid;
    }
    return lo;
}

int main(void) {
    int a[] = {42, 7, 19, 7, 88, 3, 56};
    size_t n = sizeof a / sizeof a[0];
    qsort(a, n, sizeof a[0], cmp_int);
    for (size_t i = 0; i < n; ++i) printf("%d ", a[i]);
    printf("\n");

    int key = 19;
    int *hit = bsearch(&key, a, n, sizeof a[0], cmp_int);
    printf("bsearch(19): %s\n", hit ? "found" : "missing");
    printf("lower_bound(20) = %zu\n", lower_bound(a, n, 20));   /* insert position */
    return 0;
}
