// C: 0/1 knapsack with a 1-D table on the stack (capacity is small and known).
#include <stdio.h>

#define CAP 10

int main(void) {
    const int weight[] = {5, 4, 6, 3};
    const int value[]  = {10, 40, 30, 50};
    const int n = sizeof weight / sizeof weight[0];
    int best[CAP + 1] = {0};

    for (int k = 0; k < n; ++k)
        for (int c = CAP; c >= weight[k]; --c) {       /* downward: each item once */
            int take = best[c - weight[k]] + value[k];
            if (take > best[c]) best[c] = take;
        }
    printf("best value within %d kg: %d\n", CAP, best[CAP]);
    return 0;
}
