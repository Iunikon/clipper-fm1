/* SPDX-License-Identifier: GPL-3.0-only */
/* The FM-1's editor protocol on stdin / stdout, on the real firmware (tests/editor_host.c): for tools/live_dump.py,
 * which reads what web/live.html needs from the device as it is built (descriptors, names, the list, the pages).
 * One command a line:
 *   S <hex>      a frame, the bytes between F0 and F7: prints "R <hex>" (the reply, F0..F7; "R" alone: none)
 *   U <n>        n UI frames (~16 ms each): prints "P <hex>" for each frame the device pushed, then "."
 *   F <family>   open_family (the button of that family, as on the panel), then "."
 *   H            HOME, then "."
 * Build as tests/editor_fuzz.sh builds editor_fuzz.c (CLIPPER_SYNTH=1). */
#include "editor_host.c"

static void hex(const char *tag, const uint8_t *b, uint32_t n)
{
    uint32_t i;
    printf("%s", tag);
    if (n)
        putchar(' ');
    for (i = 0; i < n; i++)
        printf("%02x", b[i]);
    putchar('\n');
}
static void pushes(void)                               /* the frames queued since, one by one */
{
    uint8_t f[1024];
    uint32_t fn = 0;
    while (so_r != so_w) {
        uint32_t pkt = sx_out_q[so_r % SXQ], cin = pkt & 15u, k, nb = cin == 4u || cin == 7u ? 3u : cin == 6u ? 2u : 1u;
        so_r++;
        for (k = 0; k < nb; k++) {
            uint8_t b = (uint8_t)(pkt >> (8u * (k + 1u)));
            if (b == 0xF0u)
                fn = 0;
            if (fn < sizeof f)
                f[fn++] = b;
            if (b == 0xF7u)
                hex("P", f, fn);
        }
    }
}

int main(void)
{
    char line[4096];
    uint32_t k;
    harness_init();
    for (k = 0; k < 4u; k++)
        ui_frame();
    pushes();
    setvbuf(stdout, NULL, _IOLBF, 0);
    while (fgets(line, sizeof line, stdin)) {
        if (line[0] == 'S') {
            uint8_t f[1024];
            uint32_t n = 0;
            const char *p = line + 1;
            while (*p == ' ')
                p++;
            while (p[0] && p[1] && p[0] != '\n' && n < sizeof f) {
                unsigned v;
                sscanf(p, "%2x", &v);
                f[n++] = (uint8_t)v;
                p += 2;
            }
            pushes();                                  /* (anything pending first: not this reply) */
            usb_sysex(f, n);
            hex("R", rx_last, rx_n);
        } else if (line[0] == 'U') {
            uint32_t n = (uint32_t)atoi(line + 1);
            for (k = 0; k < n; k++) {
                ui_frame();
                pushes();
            }
            puts(".");
        } else if (line[0] == 'F') {
            open_family((uint32_t)atoi(line + 1));
            ui_frame();
            pushes();
            puts(".");
        } else if (line[0] == 'H') {
            go_home();
            ui_frame();
            pushes();
            puts(".");
        }
    }
    return 0;
}
