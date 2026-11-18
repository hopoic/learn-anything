// C: Linux-kernel-style intrusive list. The link lives inside your struct:
// one allocation per object, O(1) removal given the object, no separate node type.
#include <stddef.h>
#include <stdio.h>

struct list_head { struct list_head *next, *prev; };

#define LIST_HEAD_INIT(name) { &(name), &(name) }
#define container_of(ptr, type, member) \
    ((type *)((char *)(ptr) - offsetof(type, member)))
#define list_for_each(pos, head) \
    for (pos = (head)->next; pos != (head); pos = pos->next)

static void list_add_tail(struct list_head *n, struct list_head *head) {
    n->prev = head->prev;
    n->next = head;
    head->prev->next = n;
    head->prev = n;
}

static void list_del(struct list_head *n) {
    n->prev->next = n->next;
    n->next->prev = n->prev;
    n->next = n->prev = NULL;
}

struct robot {
    int id;
    int battery;
    struct list_head link;        /* membership in the "active" list */
};

int main(void) {
    struct list_head active = LIST_HEAD_INIT(active);
    struct robot r[3] = { {1, 80, {0}}, {2, 15, {0}}, {3, 64, {0}} };
    for (int i = 0; i < 3; ++i) list_add_tail(&r[i].link, &active);

    list_del(&r[1].link);         /* O(1): no search, we already hold the object */

    struct list_head *pos;
    list_for_each(pos, &active) {
        struct robot *rb = container_of(pos, struct robot, link);
        printf("robot %d battery %d%%\n", rb->id, rb->battery);
    }
    return 0;
}
