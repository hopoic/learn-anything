// C: POSIX <search.h> tsearch/tfind/twalk give you a balanced binary tree
// (glibc implements it as a red-black tree). There is no lower_bound, though.
#define _GNU_SOURCE
#include <search.h>
#include <stdio.h>

static int cmp_int(const void *a, const void *b) {
    int x = *(const int *)a, y = *(const int *)b;
    return (x > y) - (x < y);          /* never "x - y": it can overflow */
}

static void print_node(const void *nodep, VISIT which, int depth) {
    (void)depth;
    if (which == postorder || which == leaf)    /* "postorder" here means in-order */
        printf("%d ", **(int *const *)nodep);
}

static void noop_free(void *p) { (void)p; }   /* keys are static: nothing to free */

int main(void) {
    static int keys[] = {50, 20, 80, 10, 30, 70, 90};
    void *root = NULL;
    for (size_t i = 0; i < sizeof keys / sizeof keys[0]; ++i)
        tsearch(&keys[i], &root, cmp_int);       /* stores the pointer, not a copy */

    int probe = 30;
    printf("30 %s\n", tfind(&probe, &root, cmp_int) ? "found" : "missing");
    twalk(root, print_node);
    printf("\n");
    tdestroy(root, noop_free);                 /* GNU extension: frees the tree nodes */
    return 0;
}
