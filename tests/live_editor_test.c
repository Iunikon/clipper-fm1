/* SPDX-License-Identifier: GPL-3.0-only */
/* Live (protocol v15, firmware/src/editor_live.c) on tests/editor_host.c: INFO says 15; PAGE, and its push while watched
 * when the page shown changes (HOME too); FAVS read empty, FAV_SET adds and removes the sound playing, FAV_GO loads a
 * favourite (and refuses one that is not there), a favourite marked on the device pushes FAVS_CHANGED, the editor's own
 * FAV_SET does not. Build as tests/editor_fuzz.sh builds editor_fuzz.c (CLIPPER_SYNTH=1). */
#include "editor_host.c"

static int fails;
static void check(int ok, const char *what)
{
    printf("live: %-74s %s\n", what, ok ? "ok" : "FAIL");
    fails += !ok;
}
static void ed(uint32_t cmd, const uint8_t *a, uint32_t na)
{
    uint8_t f[64];
    f[0] = ED_HDR0; f[1] = ED_HDR1; f[2] = ED_HDR2; f[3] = (uint8_t)cmd;
    memcpy(f + 4, a, na);
    usb_sysex(f, 4 + na);
}
static uint8_t *arg(void) { return rx_last + 5; }       /* the reply's arguments (after F0, the header and cmd) */
/* the frames the device pushed during n UI frames: how many had command cmd. Each frame on its own (rx_take keeps the
 * last one only: two pushes in one pass would hide the first). No request in between (usb_sysex would take the pushes
 * with its reply); WATCH lasts 3 s from the last request, far more than these frames */
static uint32_t frames_pushing(uint32_t n, uint32_t cmd, char *title)
{
    uint8_t f[256];
    uint32_t c = 0, i, fn = 0;
    for (i = 0; i < n; i++) {
        ui_frame();
        while (so_r != so_w) {
            uint32_t pkt = sx_out_q[so_r % SXQ], cin = pkt & 15u, k, nb = cin == 4u || cin == 7u ? 3u : cin == 6u ? 2u : 1u;
            so_r++;
            for (k = 0; k < nb; k++) {
                uint8_t b = (uint8_t)(pkt >> (8u * (k + 1u)));
                if (b == 0xF0u)
                    fn = 0;
                if (fn < sizeof f)
                    f[fn++] = b;
                if (b == 0xF7u && fn > 5u && f[4] == cmd) {
                    c++;
                    if (title && cmd == ED_PAGE)
                        snprintf(title, 13, "%s", (const char *)f + 8);
                }
            }
        }
    }
    return c;
}

int main(void)
{
    uint8_t a[4];
    char t[13] = "";
    uint32_t total, b[FAV_N], n0, n1, k;
    harness_init();
    for (k = 0; k < 4u; k++)
        ui_frame();

    ed(ED_INFO, a, 0);
    check(rx_n > 2u && rx_last[rx_n - 2] == 15u, "INFO: protocol 15 (Live)");

    go_home(); ui_frame();
    ed(ED_PAGE, a, 0);
    {
        const uint8_t *x = arg() + 3 + strlen((const char *)arg() + 3) + 1;   /* after the title: scope, 4 ids */
        int16_t *vp;
        home_param(1, &vp);
        check(rx_last[4] == ED_PAGE && arg()[0] == 1u && x[0] == 0u && x[2] == (uint32_t)(vp - TSEL->p),
              "PAGE: HOME, its knobs the engine's four (KNOB 2 as home_param)");
    }
    open_family(FAM_FX); ui_frame();
    ed(ED_PAGE, a, 0);
    {
        const uint8_t *x = arg() + 3 + strlen((const char *)arg() + 3) + 1;
        check(!strcmp((const char *)arg() + 3, "FX") && x[0] == 0u && x[1] == P_DIST && x[4] == P_REV,
              "PAGE: FX, the sound's DIST .. REV");
    }
    open_family(FAM_FX); ui_frame();                         /* FILTER: two knobs, the others none */
    ed(ED_PAGE, a, 0);
    {
        const uint8_t *x = arg() + 3 + strlen((const char *)arg() + 3) + 1;
        check(x[3] == 127u && x[4] == 127u, "PAGE: a knob with nothing to edit is 127");
    }
    go_home(); ui_frame();

    a[0] = 1; ed(ED_WATCH, a, 1);
    open_family(FAM_FX);                                     /* (FX opens on the page it was left on) */
    check(frames_pushing(3, ED_PAGE, t) == 1u && !strcmp(t, cur_page()->title), "PAGE pushed while watched: FX, once");
    {
        char t0[13];
        snprintf(t0, sizeof t0, "%s", t);
        open_family(FAM_FX);
        check(frames_pushing(3, ED_PAGE, t) == 1u && !strcmp(t, cur_page()->title) && strcmp(t, t0),
              "the next FX page: pushed with its title");
    }
    go_home();
    check(frames_pushing(3, ED_PAGE, 0) == 1u, "back on HOME: pushed");
    check(frames_pushing(10, ED_PAGE, 0) == 0u, "nothing changes: no push");

    while (fav_list(b)) { preset_go(0); fav_toggle(0); }    /* (no favourites to start) */
    frames_pushing(2, 0, 0);
    ed(ED_FAVS, a, 0);
    check(rx_last[4] == ED_FAVS && arg()[0] == 0u && arg()[1] == 127u, "FAVS: none, none playing");

    a[0] = 1; ed(ED_FAV_SET, a, 1);
    check(arg()[0] == 1u && fav_list(b) == 1u, "FAV_SET 1: the sound playing is a favourite");
    check(frames_pushing(3, ED_FAVS_CHANGED, 0) == 0u, "the editor's own FAV_SET: no push");
    n0 = base_pos(&total);
    ed(ED_FAVS, a, 0);
    {
        uint32_t e = arg()[2], kk = arg()[3], ee = base_at(n0, &k);
        const char *kind = (const char *)arg() + 4, *nm = kind + strlen(kind) + 1;
        check(arg()[0] == 1u && arg()[1] == 0u && e == ee && kk == k && !strcmp(kind, base_kind(n0)) &&
              !strcmp(nm, ENGINES[e]->presets[k].name), "FAVS: it, playing, with its engine, preset, kind and name");
    }

    preset_go(fav_list(b) + (n0 + 5u) % NBANK); ui_frame();   /* another sound (a factory one: the harness does not
                                                                 * take a user preset's load) */
    n1 = base_pos(&total);
    ed(ED_FAVS, a, 0);
    check(n1 != n0 && arg()[1] == 127u, "another sound: none of them playing");
    a[0] = 1; ed(ED_FAV_SET, a, 1);
    check(arg()[0] == 2u, "FAV_SET 1 again: two");
    a[0] = 0; ed(ED_FAV_GO, a, 1);
    k = arg()[1];                                          /* (the reply, before the pushes the load brings) */
    frames_pushing(2, 0, 0);
    check(k == 0u && base_pos(&total) == n0, "FAV_GO 0: the first favourite loaded");
    a[0] = 9; ed(ED_FAV_GO, a, 1);
    check(arg()[0] == 9u && arg()[1] == 1u && base_pos(&total) == n0, "FAV_GO 9: no such favourite, nothing loaded");

    preset_go(fav_list(b) + (n0 + 9u) % NBANK);
    fav_toggle(1);                                         /* marked on the device (KNOB 4 on PRESETS) */
    check(frames_pushing(3, ED_FAVS_CHANGED, 0) == 1u, "a favourite marked on the device: FAVS_CHANGED pushed");

    a[0] = 0; ed(ED_FAV_SET, a, 1);
    check(arg()[0] == 2u && !fav_has(fav_key()), "FAV_SET 0: the sound playing out again");
    ed(ED_PAGE, a, 0);
    {
        const uint8_t *x = arg() + 3 + strlen((const char *)arg() + 3) + 1 + 1 + 4 + 4 + 1;   /* after the edited byte */
        check((uint32_t)(x[0] | x[1] << 7) == base_pos(&total), "PAGE ends with the LIST entry playing");
    }

    while (fav_list(b)) { preset_go(0); fav_toggle(0); }

    /* LIST: the list PRESETS walks, 16 at a time; LIST_GO loads an entry; PAGE carries HOME's four on any page */
    {
        uint8_t q[3];
        uint32_t tot, n, i, ok = 1, e, kk;
        const uint8_t *x;
        base_pos(&total);
        q[0] = 0; q[1] = 0; q[2] = 16; ed(ED_LIST, q, 3);
        tot = arg()[0] | arg()[1] << 7;
        n = arg()[4];
        x = arg() + 5;
        for (i = 0; i < n; i++) {                            /* entry i as base_at(i), its kind and name */
            e = base_at(i, &kk);
            ok &= x[0] == e && x[1] == kk && !strcmp((const char *)x + 2, base_kind(i));
            x += 2 + strlen((const char *)x + 2) + 1;
            ok &= !strcmp((const char *)x, ENGINES[e]->presets[kk].name);
            x += strlen((const char *)x) + 1;
        }
        check(tot == total && n == 16u && ok, "LIST 0..15: the total and each entry's engine, preset, kind and name");
        q[0] = (uint8_t)((total - 2u) & 127u); q[1] = (uint8_t)((total - 2u) >> 7); q[2] = 16; ed(ED_LIST, q, 3);
        check(arg()[4] == 2u && (uint32_t)(arg()[2] | arg()[3] << 7) == total - 2u, "LIST at the end: what is left (2)");
        q[0] = 37; q[1] = 0; ed(ED_LIST_GO, q, 2);
        k = arg()[2];
        frames_pushing(2, 0, 0);
        check(k == 0u && base_pos(&total) == 37u, "LIST_GO 37: entry 37 loaded");
        q[0] = 127; q[1] = 127; ed(ED_LIST_GO, q, 2);
        check(arg()[2] == 1u && base_pos(&total) == 37u, "LIST_GO past the end: refused, nothing loaded");
        open_family(FAM_ENV); ui_frame();
        ed(ED_PAGE, a, 0);
        {
            const uint8_t *y = arg() + 3 + strlen((const char *)arg() + 3) + 1;   /* scope, 4 ids, then HOME's 4 */
            int16_t *vp;
            home_param(0, &vp);
            check(y[0] == 0u && y[1] == P_ATK && y[5] == (uint32_t)(vp - TSEL->p), "PAGE on ENV: its ids, and HOME's four after them");
        }
        go_home(); ui_frame();
    }
    /* EDITED: pushed when the sound turns edited and when it is as loaded again; PAGE ends with it */
    {
        uint8_t q[2];
        int16_t v0;
        q[0] = 10; q[1] = 0; ed(ED_LIST_GO, q, 2);
        frames_pushing(80, 0, 0);                            /* (the load settles: the history's rest) */
        v0 = TSEL->p[P_E0 + 4];
        TSEL->p[P_E0 + 4] = (int16_t)(v0 > 60 ? v0 - 30 : v0 + 30);
        check(frames_pushing(80, ED_EDITED, 0) == 1u && hist_edited, "a knob turned: EDITED (1) pushed once");
        ed(ED_PAGE, a, 0);
        check(rx_last[rx_n - 4] == 1u, "PAGE: the edited byte (1) before the entry playing");
        TSEL->p[P_E0 + 4] = v0;
        check(frames_pushing(80, ED_EDITED, 0) == 1u && !hist_edited, "back as loaded: EDITED (0) pushed");
    }
    /* TOOL: SAVE > TOOLS without its arming detent (the editor confirms); anything else refused */
    {
        uint8_t q[1];
        TSEL->step[0].time = ST_NOTE; TSEL->step[0].n = 1; TSEL->step[0].note[0] = 60;
        q[0] = G_CLRSEQ; ed(ED_TOOL, q, 1);
        check(arg()[0] == G_CLRSEQ && arg()[1] == 0u && !step_on(&TSEL->step[0]), "TOOL CLRSQ: done, the pattern cleared");
        q[0] = G_BPM; ed(ED_TOOL, q, 1);
        check(arg()[1] == 1u, "TOOL with another id: refused");
    }
    /* PLAY: the playhead, asked and pushed; TRANSPORT: start / stop as the PLAY button */
    {
        uint8_t q[1];
        ed(ED_PLAY, a, 0);
        check(rx_last[4] == ED_PLAY && arg()[0] == 0u, "PLAY: stopped");
        a[0] = 1; ed(ED_WATCH, a, 1);
        frames_pushing(2, 0, 0);
        song.playing = 1; TSEL->seq_idx = 5;
        check(frames_pushing(3, ED_PLAY, 0) == 1u, "playing, step 5: PLAY pushed once");
        TSEL->seq_idx = 6;
        check(frames_pushing(3, ED_PLAY, 0) == 1u, "the next step: pushed");
        song.playing = 0; TSEL->seq_idx = 0;
        check(frames_pushing(3, ED_PLAY, 0) == 1u && frames_pushing(5, ED_PLAY, 0) == 0u, "stopped: pushed once, then nothing");
        q[0] = 1; ed(ED_TRANSPORT, q, 1);
        check(arg()[0] == 1u && transport_req == 1u, "TRANSPORT 1: the start asked for");
        transport_req = 0;
    }
    /* X_GET / X_SET: the synth pages' values (MIDI's BEND here); X_CHANGED when the device changes one or a MOD SEQ step */
    {
        uint8_t q[3];
        a[0] = 1; ed(ED_WATCH, a, 1);
        frames_pushing(3, 0, 0);
        q[0] = X_MBEND; ed(ED_X_GET, q, 1);
        check(rx_last[4] == ED_X_GET && arg()[0] == X_MBEND && strlen((const char *)arg() + 9) > 0u, "X_GET BEND: its value and label");
        q[0] = X_MBEND; q[1] = (8192 + 12) & 127; q[2] = (8192 + 12) >> 7; ed(ED_X_SET, q, 3);
        check(midi_bend == 12u && (arg()[1] | arg()[2] << 7) == 8192 + 12, "X_SET BEND 12: set, as the knob");
        check(frames_pushing(3, ED_X_CHANGED, 0) == 0u, "the editor's own X_SET: no push");
        midi_bend = 2;
        check(frames_pushing(3, ED_X_CHANGED, 0) == 1u, "BEND changed on the device: X_CHANGED pushed");
        TSEL->ms[0][3] = (int8_t)(TSEL->ms[0][3] == 5 ? 4 : 5);
        check(frames_pushing(10, ED_X_CHANGED, 0) >= 1u, "a MOD SEQ step changed on the device: X_CHANGED pushed");
        q[0] = 120; ed(ED_X_GET, q, 1);
        check(arg()[0] == 0xFFu - 128u || arg()[0] == 127u, "X_GET of no such id: an empty reply");
    }
    /* STATE and REC: the REC button from the editor, arm and back */
    {
        uint8_t q[2];
        ed(ED_STATE, a, 0);
        check(rx_last[4] == ED_STATE && rx_n == 5u + 12u + 1u && arg()[0] <= 100u, "STATE: cpu, late, peak, scale, rec, the REC screen, empty");
        song.playing = 0; song.rec = 0; rec_wait = 0;
        q[0] = 0; ed(ED_REC, q, 1);
        check(rec_wait && (arg()[6] & 2u), "REC stopped: armed, as the button");
        q[0] = 0; ed(ED_REC, q, 1);
        check(!rec_wait && !(arg()[6] & 3u), "REC again: off");
        q[0] = 2; q[1] = 1; ed(ED_REC, q, 2);
        check(rec_count == 1u && arg()[8] == 1u, "REC START COUNT");
        q[1] = 0; ed(ED_REC, q, 2);
    }
    /* SCOPE: a frame of the trace HOME draws, then pushed while asked, never past 3 s */
    {
        uint8_t q[1];
        uint32_t k2, ok = 1;
        for (k2 = 0; k2 < SCOPE_N; k2++)
            scope_buf[k2] = (int16_t)((k2 % 64u) < 32u ? 8000 : -8000);
        q[0] = 0; ed(ED_SCOPE, q, 1);
        for (k2 = 0; k2 < 240u; k2++)
            ok &= arg()[3 + k2] <= 126u;
        check(rx_last[4] == ED_SCOPE && rx_n == 5u + 3u + 240u + 1u && ok && (arg()[1] | arg()[2] << 7) == 8000u, "SCOPE 0: one frame, 240 points 0..126, peak 8000");
        q[0] = 1; ed(ED_SCOPE, q, 1);
        q[0] = 1; ed(ED_SCOPE, q, 1);                       /* (the pushes themselves: 83 packets, more than the host's
                                                             * queue holds before the device's USB drains it) */
        check(ed_sc.on == 1u && arg()[0] != 0u, "SCOPE 1: on, a frame now, more while asked");
        q[0] = 2; ed(ED_SCOPE, q, 1);
        check(ed_sc.on == 0u, "SCOPE 2: off");
    }
    printf("live: %s\n", fails ? "FAILED" : "all passed");
    return fails != 0;
}
