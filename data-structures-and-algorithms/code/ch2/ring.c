// C: single-producer / single-consumer ring buffer, the classic UART/DMA pattern.
// Capacity is a power of two so that "index & mask" replaces "% capacity".
#include <stdatomic.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>

#define RING_CAP 8u                      /* power of two */
#define RING_MASK (RING_CAP - 1u)

struct ring {
    uint8_t buf[RING_CAP];
    _Atomic uint32_t head;               /* written only by the producer (e.g. ISR) */
    _Atomic uint32_t tail;               /* written only by the consumer (e.g. task) */
};

/* head and tail run freely and wrap at 2^32; head - tail is always the fill level. */
static bool ring_push(struct ring *r, uint8_t v) {
    uint32_t h = atomic_load_explicit(&r->head, memory_order_relaxed);
    uint32_t t = atomic_load_explicit(&r->tail, memory_order_acquire);
    if (h - t == RING_CAP) return false;                           /* full */
    r->buf[h & RING_MASK] = v;
    atomic_store_explicit(&r->head, h + 1, memory_order_release);  /* publish the data */
    return true;
}

static bool ring_pop(struct ring *r, uint8_t *out) {
    uint32_t t = atomic_load_explicit(&r->tail, memory_order_relaxed);
    uint32_t h = atomic_load_explicit(&r->head, memory_order_acquire);
    if (h == t) return false;                                      /* empty */
    *out = r->buf[t & RING_MASK];
    atomic_store_explicit(&r->tail, t + 1, memory_order_release);  /* free the slot */
    return true;
}

int main(void) {
    static struct ring r;                /* static storage: zero-initialized */
    for (uint8_t i = 0; i < 10; ++i)
        printf("push %u -> %s\n", i, ring_push(&r, i) ? "ok" : "full");
    uint8_t v;
    while (ring_pop(&r, &v)) printf("pop %u\n", v);
    return 0;
}
