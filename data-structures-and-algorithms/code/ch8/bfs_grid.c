// C: BFS on an occupancy grid with a flat array queue. No allocation in the loop.
#include <stdio.h>
#include <string.h>

#define W 10
#define H 6

static const char *map[H] = {
    "S...#.....",
    ".##.#.###.",
    ".#..#...#.",
    ".#.####.#.",
    ".#......#G",
    "...######.",
};

int main(void) {
    int dist[H][W];
    int queue[W * H];                      /* each cell is enqueued at most once */
    int head = 0, tail = 0;
    memset(dist, -1, sizeof dist);         /* all bytes 0xFF => -1 for int */

    int sx = 0, sy = 0, gx = 9, gy = 4;
    dist[sy][sx] = 0;
    queue[tail++] = sy * W + sx;

    static const int dx[4] = {1, -1, 0, 0}, dy[4] = {0, 0, 1, -1};
    while (head < tail) {
        int cur = queue[head++], x = cur % W, y = cur / W;
        for (int k = 0; k < 4; ++k) {
            int nx = x + dx[k], ny = y + dy[k];
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            if (map[ny][nx] == '#' || dist[ny][nx] != -1) continue;
            dist[ny][nx] = dist[y][x] + 1;
            queue[tail++] = ny * W + nx;
        }
    }
    printf("shortest path S->G: %d steps\n", dist[gy][gx]);
    return 0;
}
