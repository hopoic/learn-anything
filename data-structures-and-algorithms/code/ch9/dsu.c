// C: union-find over plain int arrays. "Are these two cells/robots connected?" in ~O(1).
#include <stdio.h>

#define N 8
static int parent[N], sz[N];

static void dsu_init(void) { for (int i = 0; i < N; ++i) { parent[i] = i; sz[i] = 1; } }

static int find(int x) {
    while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; }  /* path halving */
    return x;
}

static int unite(int a, int b) {
    a = find(a); b = find(b);
    if (a == b) return 0;
    if (sz[a] < sz[b]) { int t = a; a = b; b = t; }      /* union by size */
    parent[b] = a;
    sz[a] += sz[b];
    return 1;
}

int main(void) {
    dsu_init();
    unite(0, 1); unite(2, 3); unite(1, 3); unite(5, 6);
    printf("0~3: %s\n", find(0) == find(3) ? "connected" : "separate");
    printf("0~5: %s\n", find(0) == find(5) ? "connected" : "separate");
    printf("size of 0's group: %d\n", sz[find(0)]);
    return 0;
}
