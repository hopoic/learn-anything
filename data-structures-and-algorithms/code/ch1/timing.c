// C: measure with a monotonic clock; never time() or gettimeofday() for this.
#define _POSIX_C_SOURCE 199309L
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

static double now_ms(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1e3 + ts.tv_nsec / 1e6;
}

int main(void) {
    const size_t n = 5000000;
    int *a = malloc(n * sizeof *a);
    if (!a) return 1;
    for (size_t i = 0; i < n; ++i) a[i] = (int)i;

    double t0 = now_ms();
    long long sum = 0;
    for (size_t i = 0; i < n; ++i) sum += a[i];
    double t1 = now_ms();

    printf("sum=%lld  %.2f ms\n", sum, t1 - t0);  /* print sum so the loop survives -O2 */
    free(a);
    return 0;
}
