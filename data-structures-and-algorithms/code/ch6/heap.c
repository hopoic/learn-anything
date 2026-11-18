// C: a fixed-capacity timer heap with no malloc, typical for an RTOS or a driver.
#include <stdint.h>
#include <stdio.h>

#define MAX_TIMERS 16

struct timer { uint32_t deadline; int id; };

static struct timer heap[MAX_TIMERS];
static int n;

static void swap(struct timer *a, struct timer *b) { struct timer t = *a; *a = *b; *b = t; }

/* Wrap-safe compare for a free-running 32-bit tick counter.
   Valid while all pending deadlines are within 2^31 ticks of each other. */
static int before(uint32_t a, uint32_t b) { return (int32_t)(a - b) < 0; }

static int timer_add(uint32_t deadline, int id) {
    if (n == MAX_TIMERS) return -1;
    int i = n++;
    heap[i] = (struct timer){deadline, id};
    while (i > 0 && before(heap[i].deadline, heap[(i - 1) / 2].deadline)) {
        swap(&heap[i], &heap[(i - 1) / 2]);
        i = (i - 1) / 2;
    }
    return 0;
}

static struct timer timer_pop(void) {      /* caller checks n > 0 */
    struct timer top = heap[0];
    heap[0] = heap[--n];
    for (int i = 0;;) {
        int l = 2 * i + 1, r = l + 1, m = i;
        if (l < n && before(heap[l].deadline, heap[m].deadline)) m = l;
        if (r < n && before(heap[r].deadline, heap[m].deadline)) m = r;
        if (m == i) break;
        swap(&heap[i], &heap[m]);
        i = m;
    }
    return top;
}

int main(void) {
    uint32_t now = 0xFFFFFFF0u;            /* tick counter about to wrap */
    timer_add(now + 40, 1);                /* wraps past zero */
    timer_add(now + 5, 2);
    timer_add(now + 20, 3);                /* wraps past zero */
    while (n > 0) {
        struct timer t = timer_pop();
        printf("timer %d fires at tick %u\n", t.id, (unsigned)t.deadline);
    }
    return 0;
}
