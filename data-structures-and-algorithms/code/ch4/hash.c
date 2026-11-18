// C: separate chaining with FNV-1a. With no standard map, this pattern is everywhere
// in firmware and kernels (often a fixed bucket array and no rehashing at all).
#define _POSIX_C_SOURCE 200809L   /* strdup */
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define NBUCKETS 64u   /* power of two */

struct entry {
    char *key;
    int value;
    struct entry *next;
};

static struct entry *table[NBUCKETS];

static uint32_t fnv1a(const char *s) {
    uint32_t h = 2166136261u;
    while (*s) { h ^= (uint8_t)*s++; h *= 16777619u; }
    return h;
}

static struct entry *lookup(const char *key) {
    for (struct entry *e = table[fnv1a(key) & (NBUCKETS - 1)]; e; e = e->next)
        if (strcmp(e->key, key) == 0) return e;
    return NULL;
}

static int put(const char *key, int value) {
    struct entry *e = lookup(key);
    if (e) { e->value = value; return 0; }
    e = malloc(sizeof *e);
    if (!e || !(e->key = strdup(key))) { free(e); return -1; }
    uint32_t b = fnv1a(key) & (NBUCKETS - 1);
    e->value = value;
    e->next = table[b];           /* push at the head of the bucket chain */
    table[b] = e;
    return 0;
}

int main(void) {
    put("amr-001", 80);
    put("amr-002", 15);
    put("amr-001", 77);           /* update in place */
    struct entry *e = lookup("amr-001");
    printf("amr-001 -> %d\n", e ? e->value : -1);
    printf("amr-404 -> %s\n", lookup("amr-404") ? "found" : "missing");
    return 0;
}
