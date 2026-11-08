/* SPDX-License-Identifier: GPL-3.0-only */
/* Live (a personal build, protocol v15): what web/live (Clipper Live, the tablet beside the FM-1) needs that v14 has
 * not: the page the device shows, and the favourites (SAVE > FAVS) to read, load and mark.
 *   97 PAGE           -> home (0/1), family, page (index in PAGES), title, then what the 4 knobs edit there: a scope
 *                        (0 the sound's p[], 1 song.g[], 2 none the editor can SET) and 4 ids (127: none). On HOME the
 *                        engine's four (home_param). Also pushed while watched: the page shown changed
 *   98 FAVS           -> n, the favourite playing (127: none), then n x (engine (NENGINES: a user preset), preset or
 *                        user slot, kind, name)
 *   99 FAV_GO idx     -> idx, rc (0 loaded, 1 no such favourite). Loads it as SAVE > FAVS does
 *  100 FAV_SET add    -> n. Adds (1) or removes (0) the sound playing, as KNOB 4 on PRESETS
 *  101 FAVS_CHANGED   (push) the favourites changed on the device: read FAVS again
 * Included by editor.c after ui.c (fav_list, preset_go, fav_toggle). */
enum { ED_PAGE = 97, ED_FAVS, ED_FAV_GO, ED_FAV_SET, ED_FAVS_CHANGED };
static struct {
    uint8_t home, page;
    uint32_t fsig;
} ed_lv;

UI_SMALL static uint32_t ed_lv_fsig(void)                          /* the favourites, in order */
{
    uint32_t i, h = 0;
    for (i = 0; i < FAV_N; i++)
        h = h * 31u + fav[i];
    return h;
}
UI_SMALL static void ed_lv_page(void)
{
    const page_t *pg = cur_page();
    uint32_t k, sc = pg->scope == SC_GLOBAL ? 1u : pg->scope == SC_TRACK || pg->scope == SC_ENGINE ? 0u : 2u;
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
}
UI_SMALL static void ed_lv_shadow(void)                            /* WATCH: in sync */
{
    ed_lv.home = ui.home;
    ed_lv.page = ui.page;
    ed_lv.fsig = ed_lv_fsig();
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
    uint32_t b[FAV_N], nf, i, total, cur, k, e;
    char nm[13];
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
        for (i = 0; i < nf; i++) {
            e = base_at(b[i], &k);
            ed_b(e);
            ed_b(k);
            ed_str(base_kind(b[i]), 4);
            if (e == NENGINES)
                up_name(k, nm);
            else
                str_cpy(nm, ENGINES[e]->presets[k].name, sizeof nm);
            ed_str(nm, 12);
        }
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
    case ED_FAV_SET:
        fav_toggle(na && (a[0] & 1u));
        ed_lv.fsig = ed_lv_fsig();                   /* (the editor's own change: no push) */
        ed_b(fav_list(b));
        return 1;
    }
    return 0;
}
