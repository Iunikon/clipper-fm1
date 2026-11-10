/* SPDX-License-Identifier: GPL-3.0-only */
/* Live (a personal build, protocol v15): what web/live (Clipper Live, the tablet beside the FM-1) needs that v14 has
 * not: the page the device shows, and the favourites (SAVE > FAVS) to read, load and mark.
 *   97 PAGE           -> home (0/1), family, page (index in PAGES), title, then what the 4 knobs edit there: a scope
 *                        (0 the sound's p[], 1 song.g[], 2 none the editor can SET) and 4 ids (127: none). On HOME the
 *                        engine's four (home_param). Then HOME's four ids whatever the page (127: none, the drum
 *                        track). Also pushed while watched: the page shown changed
 *   98 FAVS           -> n, the favourite playing (127: none), then n x (engine (NENGINES: a user preset), preset or
 *                        user slot, kind, name)
 *   99 FAV_GO idx     -> idx, rc (0 loaded, 1 no such favourite). Loads it as SAVE > FAVS does
 *  100 FAV_SET add    -> n. Adds (1) or removes (0) the sound playing, as KNOB 4 on PRESETS
 *  101 FAVS_CHANGED   (push) the favourites changed on the device: read FAVS again
 *  102 LIST start count -> total, start, n, then n x (engine, preset or user slot, kind, name): the list PRESETS walks
 *                        (every factory sound by kind, then the user presets; no FAV rows). start and total: 2 x 7 bits
 *  103 LIST_GO n      -> n (2 x 7 bits), rc (0 loaded, 1 no such entry). Loads entry n of LIST
 *  105 TOOL id        -> id, rc: runs SAVE > TOOLS's CLRSQ (G_CLRSEQ), INIT (G_INITSND) or NEW (G_NEWPRJ) as its second
 *                        detent does (the editor confirms on its own). rc 0 done, 1 not one of them / the drum track has no
 *                        sound to init, 3 stop the song first
 *  104 EDITED         (push) edited (1) or as loaded (0): the sound changed since it was loaded (ui_synth.c hist_edited, not
 *                        while COMPARE shows the original). PAGE has the same byte after HOME's four, then the LIST entry
 *                        the selected part plays (2 x 7 bits; 16383: none: the drum track, a sound the list does not have)
 *  106 PLAY           -> playing (0/1), the step the selected part plays (2 x 7 bits; its index in its pattern). Also
 *                        pushed while watched when either changes (the sequencer's playhead)
 *  107 TRANSPORT on   -> playing: starts (1) or stops (0) the sequencer as the PLAY button does
 *  109 X_GET id       -> id, value v14, fmt, min v14, max v14, flags (1: names follow), label, unit, then the names: one of
 *                        the synth pages' values (ui_synth.c X_*: LAYER, LAYER 2, MORPH, RANDOM, UNDO, MATRIX, MOD SEQ,
 *                        TUNING, MIDI, MIDI 2, FMX's), its range as the knob sees it now (some move: UNDO, a layer's SOUND)
 *  110 X_SET id v14   -> as X_GET: the value set as KNOB n sets it on that page (its action too: SWAP, GO, BACK...)
 *  111 X_CHANGED      (push) the synth pages' values or the MOD SEQ's steps changed on the device: read them again
 *  112 STATE          -> cpu % (the audio load), late (2 x 7: halves rendered late since power-on), peak % (the worst
 *                        half lately), the scale's 12 notes (2 x 7, bit 0 the root), rec (bit 0 recording, 1 armed,
 *                        2 a free take, 3 the count-in runs), the REC screen's MODE (0 FREE 1 TEMPO), START (0 NOTE 1
 *                        COUNT), QUANT (0 ON 1 OFF), the project empty (1)
 *  113 REC op [v]     -> STATE: 0 the REC button (arm / record / stop recording), 1 MODE v, 2 START v, 3 QUANT v
 * PAGE's scope 3: a synth page, its 4 ids X_* (X_GET); PLAY ends with STATE's rec byte, and is pushed when it changes
 * Included by editor.c after ui.c (fav_list, preset_go, fav_toggle). */
enum { ED_PAGE = 97, ED_FAVS, ED_FAV_GO, ED_FAV_SET, ED_FAVS_CHANGED, ED_LIST, ED_LIST_GO, ED_EDITED, ED_TOOL, ED_PLAY, ED_TRANSPORT,
       ED_X_GET = 109, ED_X_SET, ED_X_CHANGED, ED_STATE, ED_REC };
#define ED_LV_EDITED ((uint8_t)(hist_edited && !hist_cmp_on))
static struct {
    uint8_t home, page, edited;
    uint32_t fsig, play, xsig;
} ed_lv;
#define ED_LV_REC ((uint32_t)(song.rec != 0u) | (uint32_t)rec_wait << 1 | (uint32_t)ft_on << 2 | (uint32_t)ci_on << 3)
#define ED_LV_PLAY (ED_LV_REC << 16 | (uint32_t)song.playing << 15 | (TSEL->seq_idx % trk_len(TSEL)))   /* rec, playing, step */

#if CLIPPER_SYNTH
UI_SMALL static uint32_t ed_lv_xsig(void);
#endif
UI_SMALL static uint32_t ed_lv_fsig(void)                          /* the favourites, in order */
{
    uint32_t i, h = 0;
    for (i = 0; i < FAV_N; i++)
        h = h * 31u + fav[i];
    return h;
}
UI_SMALL static uint32_t ed_lv_cur(void)                           /* the LIST entry playing; 16383: none */
{
    uint32_t total, k, n, e;
    if (is_drum(TSEL))
        return 16383u;
    n = base_pos(&total);
    if (n >= total)
        return 16383u;
    e = base_at(n, &k);
    if (e == NENGINES ? user_of(TSEL) == k : user_of(TSEL) >= UP_SLOTS && e == TSEL->eng_req && k == TSEL->preset)
        return n;
    return 16383u;
}
UI_SMALL static void ed_lv_page(void)
{
    const page_t *pg = cur_page();
    uint32_t k, sc = pg->scope == SC_GLOBAL ? 1u : pg->scope == SC_TRACK || pg->scope == SC_ENGINE ? 0u : pg->scope == SC_SYN ? 3u : 2u;
    int16_t *vp;
    ed_b(ui.home);
    ed_b(pg->fam);
    ed_b(ui.page);
    ed_str(pg->title, 12);
    if (ui.home)                                     /* (HOME: the engine's four; the drum track: two of them global) */
        sc = is_drum(TSEL) ? 2u : 0u;
    ed_b(sc);
    for (k = 0; k < 4u; k++) {
        if (ui.home && sc == 0u)
            home_param(k, &vp), ed_b((uint32_t)(vp - TSEL->p));
        else
            ed_b(sc == 2u || pg->id[k] == 0xFFu ? 127u : pg->id[k]);
    }
    for (k = 0; k < 4u; k++) {                       /* (HOME's four, for a view that always shows them) */
        if (is_drum(TSEL))
            ed_b(127u);
        else
            home_param(k, &vp), ed_b((uint32_t)(vp - TSEL->p));
    }
    ed_b(ED_LV_EDITED);
    k = ed_lv_cur();
    ed_b(k & 127u);
    ed_b(k >> 7);
}
UI_SMALL static void ed_lv_entry(uint32_t n)                   /* base list entry n: engine, preset or slot, kind, name */
{
    uint32_t k, e = base_at(n, &k);
    char nm[13];
    ed_b(e);
    ed_b(k);
    ed_str(base_kind(n), 4);
    if (e == NENGINES)
        up_name(k, nm);
    else
        str_cpy(nm, ENGINES[e]->presets[k].name, sizeof nm);
    ed_str(nm, 12);
}
UI_SMALL static void ed_lv_shadow(void)                            /* WATCH: in sync */
{
    ed_lv.home = ui.home;
    ed_lv.page = ui.page;
    ed_lv.fsig = ed_lv_fsig();
    ed_lv.edited = ED_LV_EDITED;
    ed_lv.play = ED_LV_PLAY;
#if CLIPPER_SYNTH
    ed_lv.xsig = ed_lv_xsig();
#endif
}
UI_SMALL static void ed_lv_play(uint32_t pl)
{
    ed_b((pl >> 15) & 1u);
    ed_b(pl & 127u);
    ed_b((pl >> 7) & 127u);
    ed_b(pl >> 16);                                  /* (STATE's rec byte) */
}
#if CLIPPER_SYNTH
UI_SMALL static uint32_t ed_lv_xsig(void)                          /* the synth pages' values, the MOD SEQ's steps */
{
    uint32_t i, h = syn_sig();
    int16_t *vp;
    for (i = 0; i < X_COUNT; i++)
        if (syn_desc(i, &vp) && vp)
            h = (h ^ (uint16_t)*vp) * 16777619u;
    for (i = 0; i < MSEQ_LANES * MSEQ_STEPS; i++)
        h = (h ^ (uint8_t)TSEL->ms[i / MSEQ_STEPS][i % MSEQ_STEPS]) * 16777619u;
    return h;                                        /* (not the step playing: that is no news) */
}
UI_SMALL static void ed_lv_x(uint32_t id)                          /* X_GET's reply */
{
    int16_t *vp;
    const param_desc_t *d = syn_desc(id, &vp);
    uint32_t i;
    ed_b(id);
    if (!d || !vp) {
        ed_v(0); ed_b(0); ed_v(0); ed_v(0); ed_b(0); ed_str("", 1); ed_str("", 1);
        return;
    }
    ed_v(*vp);
    ed_b(d->fmt);
    ed_v(d->min);
    ed_v(d->max);
    ed_b(d->names ? 1u : 0u);
    ed_str(d->label, 8);
    ed_str(d->unit ? d->unit : "", 8);
    if (d->names)
        for (i = 0; i <= (uint32_t)(d->max - d->min) && i < 64u; i++)
            ed_str(d->names[i], 8);
}
#endif
UI_SMALL static void ed_lv_state(void)
{
    uint32_t m = is_drum(TSEL) ? 0u : scale_mask(TSEL);
    ed_b(clamp((int32_t)(song.cpu_q8 * 100u / 256u), 0, 127));
    ed_b(diag_late & 127u);
    ed_b((diag_late >> 7) & 127u);
    ed_b(clamp((int32_t)diag_peak, 0, 127));
    ed_b(m & 127u);
    ed_b((m >> 7) & 127u);
    ed_b(ED_LV_REC);
    ed_b(rec_tempo);
    ed_b(rec_count);
    ed_b(rec_quant_off);
    ed_b((uint32_t)project_empty());
}
UI_SMALL static int ed_lv_sync(void)                               /* while watched: 1 = a push went out */
{
    uint32_t h;
    if (ui.home != ed_lv.home || ui.page != ed_lv.page) {
        ed_lv.home = ui.home;
        ed_lv.page = ui.page;
        ed_begin(ED_PAGE);
        ed_lv_page();
        ed_send();
        return 1;
    }
    if (ED_LV_EDITED != ed_lv.edited) {
        ed_lv.edited = ED_LV_EDITED;
        ed_begin(ED_EDITED);
        ed_b(ed_lv.edited);
        ed_send();
        return 1;
    }
    h = ED_LV_PLAY;
    if (h != ed_lv.play && (song.playing || (ed_lv.play >> 15 & 1u) || (h >> 16) != (ed_lv.play >> 16))) {   /* (stopped: the step it rests on is no news) */
        ed_lv.play = h;
        ed_begin(ED_PLAY);
        ed_lv_play(h);
        ed_send();
        return 1;
    }
    ed_lv.play = h;
#if CLIPPER_SYNTH
    h = ed_lv_xsig();
    if (h != ed_lv.xsig) {
        ed_lv.xsig = h;
        ed_begin(ED_X_CHANGED);
        ed_send();
        return 1;
    }
#endif
    h = ed_lv_fsig();
    if (h != ed_lv.fsig) {
        ed_lv.fsig = h;
        ed_begin(ED_FAVS_CHANGED);
        ed_send();
        return 1;
    }
    return 0;
}
UI_SMALL static int ed_lv_handle(uint32_t cmd, const uint8_t *a, uint32_t na)   /* 1: a Live command (reply built) */
{
    uint32_t b[FAV_N], nf, i, total, cur, k, n;
    switch (cmd) {
    case ED_PAGE:
        ed_lv_page();
        return 1;
    case ED_FAVS:
        nf = fav_list(b);
        cur = base_pos(&total);
        ed_b(nf);
        for (i = 0; i < nf && b[i] != cur; i++)
            ;
        ed_b(i < nf && !is_drum(TSEL) ? i : 127u);
        for (i = 0; i < nf; i++)
            ed_lv_entry(b[i]);
        return 1;
    case ED_FAV_GO:
        i = na ? a[0] : 127u;
        ed_b(i);
        if (i < fav_list(b) && !is_drum(TSEL)) {
            preset_go(i);
            ed_b(0);
        } else {
            ed_b(1);
        }
        return 1;
    case ED_LIST:                                   /* start (2 x 7), count -> total (2 x 7), start (2 x 7), n, entries */
        base_pos(&total);
        i = na >= 2u ? (uint32_t)(a[0] | a[1] << 7) : 0u;
        n = na >= 3u && a[2] && a[2] <= 16u ? a[2] : 16u;
        if (i > total)
            i = total;
        if (n > total - i)
            n = total - i;
        ed_b(total);
        ed_b(total >> 7);
        ed_b(i);
        ed_b(i >> 7);
        ed_b(n);
        for (k = 0; k < n; k++)
            ed_lv_entry(i + k);
        return 1;
    case ED_PLAY:                                   /* -> playing, step */
        ed_lv_play(ED_LV_PLAY);
        return 1;
    case ED_TRANSPORT:                              /* on -> playing (what was asked: the start waits for the next block) */
        i = na && (a[0] & 1u);
        if (i != song.playing)
            transport_req = i ? 1u : 2u;
        ed_b(i);
        return 1;
#if CLIPPER_SYNTH
    case ED_X_GET:                                  /* id -> id, value, desc */
    case ED_X_SET: {                                /* id, v14 -> as X_GET */
        int16_t *vp;
        const param_desc_t *d;
        i = na ? a[0] : 0xFFu;
        if (i >= X_COUNT)
            i = 0xFFu;
        if (cmd == ED_X_SET && i != 0xFFu && na >= 3u && (d = syn_desc(i, &vp)) != 0 && vp && d->max > d->min) {
            *vp = (int16_t)clamp((int32_t)(a[1] | a[2] << 7) - 8192, d->min, d->max);
            syn_changed(i, vp);                     /* (as KNOB n on the page; no whole redraw: the page's signatures) */
            ed_lv.xsig = ed_lv_xsig();              /* (the editor's own change: no push) */
        }
        ed_lv_x(i);
        return 1;
    }
#endif
    case ED_STATE:
        ed_lv_state();
        return 1;
    case ED_REC:                                    /* op [v] -> STATE */
        i = na ? a[0] : 0xFFu;
        if (i == 0u)
            rec_toggle();
        else if (i == 1u && na >= 2u)
            rec_tempo = (uint8_t)(a[1] & 1u), settings_later = 1;
        else if (i == 2u && na >= 2u)
            rec_count = (uint8_t)(a[1] & 1u), settings_later = 1;
        else if (i == 3u && na >= 2u)
            rec_quant_off = (uint8_t)(a[1] & 1u), settings_later = 1;
        ed_lv_state();
        return 1;
    case ED_TOOL:                                   /* id -> id, rc */
        i = na ? a[0] : 0u;
        ed_b(i);
        ed_b(i == G_CLRSEQ || i == G_INITSND || i == G_NEWPRJ ? (uint32_t)tool_go(i) : 1u);
        return 1;
    case ED_LIST_GO:                                /* n (2 x 7) -> n, rc */
        base_pos(&total);
        i = na >= 2u ? (uint32_t)(a[0] | a[1] << 7) : 0xFFFFu;
        ed_b(i);
        ed_b(i >> 7);
        if (i < total && !is_drum(TSEL)) {
            preset_go(fav_list(b) + i);
            ed_b(0);
        } else {
            ed_b(1);
        }
        return 1;
    case ED_FAV_SET:
        fav_toggle(na && (a[0] & 1u));
        ed_lv.fsig = ed_lv_fsig();                   /* (the editor's own change: no push) */
        ed_b(fav_list(b));
        return 1;
    }
    return 0;
}
