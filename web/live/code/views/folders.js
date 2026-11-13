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
function pageRow(p, prevKind) {
  const kind = SHARED.has(PGRAPH[p.title]) && PGRAPH[p.title] === prevKind ? null : PGRAPH[p.title], cells = pageCells(p), lv = devLive(p.folder, p.title);
  if (!cells.length && !kind) return "";
  const g = kind ? `<div class="pgr g-${kind}${kind === "env" ? " tall" : ""}">${graphPanel(p, kind)}</div>` : "";
  return `<section class="pgx${lv ? " dev" : ""}" data-title="${esc(p.title)}">
    <header class="pgh"><h3>${esc(p.title)}</h3>${lv ? `<span class="live2">En el sinte</span>` : ""}</header>${g}
    ${cells.length ? `<div class="prow" style="--n:${cells.length}">${cells.map(({ id, k }) => tileP(p.s, id, k, p.title, false)).join("")}</div>` : ""}</section>`;
}
function folderView(folder) {
  const pages = LAYOUT.filter((x) => x.folder === folder && pageOn(x) && !ESTUDIO_ONLY.has(x.title)).map((x) => ({ title: x.title, folder, s: x.scope, ids: x.ids }));
  const seen = new Set(), uniq = pages.filter((p) => !seen.has(p.title) && seen.add(p.title));   /* (FILTER, MASTER twice: the drum track's) */
  return `<div class="pgs">${uniq.map((p, i) => pageRow(p, i ? PGRAPH[uniq[i - 1].title] : null)).join("")}</div>`;
}

