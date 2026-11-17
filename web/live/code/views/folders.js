/* ------------------------------------------------------------------ pages --- */
/* A folder as the FM-1 lays it out: its pages in the device's order, one line each, with as many columns as the page
   has knobs (3 knobs, 3 columns); a page the device draws (or one whose shape helps: DLY, REVERB, FILTER, EQ) has its
   graph above its line, wide. The synth pages (LAYER, MORPH, RANDOM, UNDO, MATRIX, MOD SEQ, TUNING, MIDI…) are scope 3:
   their X_* values (Live 109..111), turned here or by the knobs on the device */
const PGRAPH = { ENV: "env", "ENV 2": "env", LFO: "lfo", "LFO 2": "lfo", "LFO 3": "lfo", FX: "meters", FILTER: "filt", DLY: "echo",
  REVERB: "verb", "EQ+COMP": "eq", MACROS: "meters", SEL: "scale", "SEL 2": "scale", LAYER: "layer", "LAYER 2": "layer",
  MORPH: "morph", UNDO: "hist", MATRIX: "matrix", "MOD SEQ": "mseq", "OP ENV": "env", ENV2: "env", ENV3: "env" };
const ESTUDIO_ONLY = new Set(["TRACKS", "SONG", "DRUMS", "SLICER", "PRESETS", "USER", "FAVS", "PROJECT", "TOOLS", "NOTES", "REV/CHO"]);

function pageCells(p) { return p.ids.map((id, k) => ({ id, k })).filter((x) => x.id < 127 && desc(p.s, x.id)); }
const SHARED = new Set(["scale", "layer"]);    /* (SEL and SEL 2, LAYER and LAYER 2: one graph on the device, two pages of knobs) */
/* a bar graph (FX 1's sends, MACROS) is the control: its values are not tiles as well (tablet note 28, 14 nov) */
const BARS = new Set(["meters"]);
/* a page of one or two values right after its sibling (INSERT 2, VOICE 3, ENV 2 LOOP, MIDI 2…) joins its grid instead of a
   row of its own; each tile keeps its page's name and the synth's frame stays on that page's tiles (tablet note 30) */
const joins = (p, grp) => !PGRAPH[p.title] && pageCells(p).length <= 2 && p.title.split(" ")[0] === grp[0].title.split(" ")[0]
  && grp.reduce((n, q) => n + pageCells(q).length, 0) + pageCells(p).length <= 6;
function pageRow(arg, prevKind) {
  const grp = Array.isArray(arg) ? arg : [arg], p = grp[0], kind = SHARED.has(PGRAPH[p.title]) && PGRAPH[p.title] === prevKind ? null : PGRAPH[p.title], lv = grp.some((q) => devLive(q.folder, q.title));
  const cells = grp.flatMap((q, j) => pageCells(q).filter(({ k }) => !(j === 0 && BARS.has(PGRAPH[q.title]) && (GUSE[PGRAPH[q.title]] || []).includes(k))).map((c) => ({ ...c, q })));
  if (!cells.length && !kind) return "";
  const g = kind ? `<div class="pgr g-${kind}${kind === "env" ? " tall" : ""}">${graphPanel(p, kind)}</div>` : "";
  return `<section class="pgx${lv ? " dev" : ""}" data-title="${esc(p.title)}">
    <header class="pgh"><h3>${grp.map((q) => esc(q.title)).join(" · ")}</h3>${lv ? `<span class="live2">En el sinte</span>` : ""}</header>${g}
    ${cells.length ? `<div class="prow" style="--n:${cells.length}">${cells.map(({ id, k, q }) => tileP(q.s, id, k, q.title, grp.length > 1 && q !== grp[0])).join("")}</div>` : ""}</section>`;
}
/* ENV and LFO: the envelopes (ENV 1 · 2 · 3) and the LFOs (LFO 1 · 2 · 3) as tabs over one place, the graph and its values
   where they were, only the data changing (after SHRUB; tablet note 20, 14 nov). A page's tab comes from its title (ENV DEST
   goes with ENV 1, ENV 2 LOOP with ENV 2); the pages of no tab (MOD, MATRIX, MOD SEQ…) stay under it. With «Seguir», the
   synth's page picks its tab; the last tab of each folder is remembered */
const TABBED = { ENV: /^ENV ?(\d)?(?: |$)/, LFO: /^LFO ?(\d)?(?: |$)/ };
const PGTAB = store.get("pgtab") || {};
function tabOf(folder, title) { const re = TABBED[folder], m = re && title.match(re); return m ? `${folder} ${m[1] || 1}` : null; }
function tabSync(folder, title) { const t = tabOf(folder, title); if (!t || PGTAB[folder] === t) return false; PGTAB[folder] = t; store.set("pgtab", PGTAB); return true; }
function folderView(folder) {
  const pages = LAYOUT.filter((x) => x.folder === folder && pageOn(x) && !ESTUDIO_ONLY.has(x.title)).map((x) => ({ title: x.title, folder, s: x.scope, ids: x.ids }));
  const seen = new Set(), uniq0 = pages.filter((p) => !seen.has(p.title) && seen.add(p.title));   /* (FILTER, MASTER twice: the drum track's) */
  const tabs = [...new Set(uniq0.map((p) => tabOf(folder, p.title)).filter(Boolean))];
  let bar = "", uniq = uniq0;
  if (tabs.length > 1) {
    const cur = tabs.includes(PGTAB[folder]) ? PGTAB[folder] : tabs[0];
    const onSynth = M.page && !M.page.home ? tabOf(folder, M.page.title) : null;
    bar = `<nav class="pgtabs" role="tablist" aria-label="${esc(folder)}">${tabs.map((t) => `<button role="tab" data-pgtab="${esc(t)}" aria-selected="${t === cur}"${t === onSynth ? ' class="dev"' : ""}>${esc(t)}</button>`).join("")}</nav>`;
    uniq = [...uniq0.filter((p) => tabOf(folder, p.title) === cur), ...uniq0.filter((p) => !tabOf(folder, p.title))];   /* (the tab first, then MOD, MATRIX…) */
  }
  const grps = []; uniq.forEach((p) => { const last = grps[grps.length - 1]; if (last && joins(p, last)) last.push(p); else grps.push([p]); });
  return `<div class="pgs">${bar}${grps.map((g, i) => pageRow(g, i ? PGRAPH[grps[i - 1][0].title] : null)).join("")}</div>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-pgtab]"); if (!b) return;
  PGTAB[S.folder] = b.dataset.pgtab; store.set("pgtab", PGTAB);
  const y = $("edit").scrollTop; renderWork(); $("edit").scrollTop = y;   /* (the place stays: only the data changes) */
});
