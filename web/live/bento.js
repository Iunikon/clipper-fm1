/* ------------------------------------------------------------------ bento --- */
/* The folders, EDITAR and RÁPIDO as a bento grid (12 columns), not the device's pages of four: a page with a graph is a
   large module and the graph is the control (drag it), with what it draws under it; every other parameter is a tile of
   its own, sized by what it is (a switch small, a choice of up to four as its options, a value as a fader you slide
   sideways). A parameter keeps the colour of the knob that turns it on its page; its page's name is in its corner. */
const GRAPH = { ENV: "env", "ENV 2": "env", LFO: "lfo", "LFO 2": "lfo", "LFO 3": "lfo", FILTER: "filt", FX: "meters", MACROS: "meters",
  HOME: "arcs", DLY: "echo", REVERB: "verb", "EQ+COMP": "eq" };
/* what each graph draws (its page's knobs, by position): those are its readouts; the rest of the page, tiles */
const GUSE = { env: [0, 1, 2, 3], lfo: [0, 1, 2], filt: [0], meters: [0, 1, 2, 3], arcs: [0, 1, 2, 3], echo: [0, 1, 2, 3], verb: [1, 2, 3], eq: [0, 1, 2] };
const live = (ids) => ids.map((id, k) => ({ id, k })).filter((x) => x.id < 127);
const isOnOff = (d) => d && (d.fmt === F.ONOFF || (d.fmt === F.ENUM && d.names.length === 2 && d.names[0] === "OFF"));
const isEnum = (d) => d && d.fmt === F.ENUM;
const ff = (s, id) => (desc(s, id) ? frac(desc(s, id), val(s, id)) : 0);

/* ---- the graphs, drawn as the FM-1 draws them (ui_draw.c): its 240 x 100 strip stretched, one thin line in the curve's
   colour, no fill, a rule at the foot. The handles are HTML (so they stay square), small; their reach is larger */
const GW = 240, GH = 100;
const pts = (a) => a.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
const rule = (y) => `<line x1="0" y1="${y}" x2="${GW}" y2="${y}" class="axis"/>`;
const raw = (s, id) => (id < 127 && desc(s, id) ? val(s, id) : 0);
/* graph_adsr: attack linear; decay and release exponential (k^n = e^-4.6: ~99 % in the set time), as voice.c */
function envShape(A, D, S, R) {
  const a = 4 + A * 50 / 127, d = 6 + D * 50 / 127, r = 6 + R * 60 / 127, top = 8, bot = 90, sus = S / 127;
  const x1 = 6 + a, x3 = 232 - r, Y = (l) => bot - l * (bot - top), p = [[6, bot], [x1, top]];
  let e = 1, n = Math.ceil(d), l = 1;
  for (let i = 1; i <= n; i++) { e *= 1 - 4.6 / d; l = sus + (1 - sus) * e; p.push([x1 + Math.min(i, d), Y(l)]); }
  const xd = x1 + d, yd = Y(l);
  p.push([x3, Y(sus)]);
  e = 1; n = Math.ceil(r);
  for (let i = 1; i <= n; i++) { e *= 1 - 4.6 / r; p.push([x3 + Math.min(i, r), Y(sus * e)]); }
  return { p, x1, xd, yd, x3, ys: Y(sus), top, bot };
}
function gEnv(s, ids) {
  const g = envShape(raw(s, ids[0]), raw(s, ids[1]), raw(s, ids[2]), raw(s, ids[3]));
  return { svg: rule(g.bot + 1) + `<path d="${pts(g.p)}" class="line"/>`,
    handles: [["a", g.x1, g.top, 0], ["d", g.xd, g.yd, 1], ["s", (g.xd + g.x3) / 2, g.ys, 2], ["r", g.x3, g.ys, 3]] };
}
/* graph_lfo: two cycles across, from the LFO's PHASE; S&H a random step every 20 px (voice.c lfo_wave_n) */
function lfoAt(w, ph) {
  const u = ((ph % 1) + 1) % 1;
  return w === 1 ? (u < .5 ? u * 4 - 1 : 3 - u * 4) : w === 2 ? u * 2 - 1 : w === 3 ? (u < .5 ? 1 : -1) : Math.sin(u * 2 * Math.PI);
}
const phsOf = (s, ids) => (ids[2] < 127 && desc(s, ids[2]) && desc(s, ids[2]).label === "PHS" ? 2 : -1);
function gLfo(s, ids) {
  const w = raw(s, ids[1]), k = phsOf(s, ids), ph0 = k >= 0 ? raw(s, ids[k]) / 128 : 0, p = [];
  for (let x = 0; x < GW; x++) {
    const y = w === 4 ? (((Math.imul(Math.floor(x / 20), 2654435761 | 0) >>> 16) & 0xFFFF) - 32768) / 32768 : lfoAt(w, ph0 + x / 120);
    p.push([x, 50 - y * 38]);
  }
  return { svg: rule(50) + `<path d="${pts(p)}" class="line"/>`, handles: [] };
}
/* (the web's own, where the FM-1 shows big values: drawn the same way) */
function gFilt(s, ids) {
  const id = ids[0], v = raw(s, id), d = desc(s, id), f = d ? (v - d.min) / (d.max - d.min) : .5;
  const lp = v < 0 ? 1 + v / 64 : 1, hp = v > 0 ? v / 63 : 0, p = [];
  for (let i = 0; i <= 120; i++) { const x = i / 120; let y = .3; if (x > lp) y += (x - lp) * 2.6; if (x < hp) y += (hp - x) * 2.6; p.push([x * GW, Math.min(.9, y) * GH]); }
  return { svg: rule(91) + `<line x1="${GW / 2}" y1="4" x2="${GW / 2}" y2="${GH - 4}" class="axis"/><path d="${pts(p)}" class="line"/>`, handles: [["f", f * GW, 30, 0]] };
}
function gEcho(s, ids) {   /* the taps: graph_fx's thin bars, each a line and a cap */
  const t = ids[0] < 127 ? raw(s, ids[0]) : 1, fb = ff(s, ids[1]), mix = ids[3] < 127 ? ff(s, ids[3]) : .5, gap = 18 + (t % 8) * 6;
  let h = "";
  for (let i = 0, a = .9 * mix + .1; i < 14 && 8 + i * gap < GW; i++, a *= .25 + fb * .7) {
    const x = 8 + i * gap, y = 90 - a * 80;
    h += `<line x1="${x}" y1="10" x2="${x}" y2="90" class="axis"/><line x1="${x}" y1="${y}" x2="${x}" y2="90" class="line"/><line x1="${x - 3}" y1="${y}" x2="${x + 3}" y2="${y}" class="line"/>`;
  }
  return { svg: rule(91) + h, handles: [] };
}
function gVerb(s, ids) {
  const size = ff(s, ids[1]), damp = ff(s, ids[2]), pre = ids[3] < 127 ? ff(s, ids[3]) : 0, x0 = 6 + pre * 40, len = 60 + size * 170, p = [[0, 90], [x0, 90], [x0, 10]];
  for (let i = 1; i <= 80; i++) p.push([Math.min(GW, x0 + (i / 80) * len), 90 - 80 * Math.exp(-i / 80 * (2 + damp * 5))]);
  return { svg: rule(91) + `<path d="${pts(p)}" class="line"/>`, handles: [] };
}
function gEq(s, ids) {
  const b = [0, 1, 2].map((k) => { const d = ids[k] < 127 && desc(s, ids[k]); return d ? (val(s, ids[k]) - (d.min + d.max) / 2) / ((d.max - d.min) / 2) : 0; }), p = [];
  for (let i = 0; i <= 120; i++) { const x = i / 120; p.push([x * GW, 50 - 38 * (b[0] / (1 + Math.exp((x - .22) * 18)) + b[1] * Math.exp(-((x - .5) ** 2) * 40) + b[2] / (1 + Math.exp(-(x - .78) * 18)))]); }
  return { svg: rule(50) + `<path d="${pts(p)}" class="line"/>`, handles: [] };
}
/* graph_fx: a thin bar a send, a cap on its level; here a whole column takes the finger */
const FXPAGE = { 33: "FX", 34: "CHORUS", 35: "DLY", 36: "REVERB" };   /* (a send: the page that edits its effect) */
function gMeters(s, ids, toggles) {
  return live(ids).map(({ id, k }) => { const d = desc(s, id); if (!d) return ""; const f = frac(d, val(s, id)), z = zeroOf(d), [t, u] = fmtValue(d, val(s, id));
    const q = toggles && QSPEC.get(keyOf(s, id)), off = q && !qOn(q);
    return `<div class="mt${off ? " off" : ""}" style="--c:${KC[k]};--lo:${Math.min(f, z)};--hi:${Math.max(f, z)};--f:${f}" data-mt="${keyOf(s, id)}"><span class="mv num">${esc(t)}<small>${esc(u)}</small></span>
      <div class="mtr${z ? " bi" : ""}" data-drag="v" data-k="${keyOf(s, id)}"><i></i><b></b><s></s></div>
      ${q ? `<span class="mlw"><button class="ml" data-qtog="${keyOf(s, id)}" role="switch" aria-checked="${!off}">${esc(q.name)}</button><button class="mle" data-fxedit="${FXPAGE[id] || "FX"}" aria-label="Editar ${esc(q.name)}"><svg class="i"><use href="#i-edit"/></svg></button></span>` : `<span class="ml">${esc(d.label)}</span>`}</div>`; }).join("");
}
function gArcs(s, ids) {
  return live(ids).map(({ id, k }) => { const d = desc(s, id); if (!d) return ""; const v = val(s, id), a = frac(d, v), z = d.min < 0 && d.max > 0 ? -d.min / (d.max - d.min) : 0;
    const r = 38, c = 2 * Math.PI * r, sp = c * .75, lo = Math.min(a, z), hi = Math.max(a, z), [t, u] = fmtValue(d, v);
    return `<div class="arc" data-drag="v" data-k="${keyOf(s, id)}" style="--c:${KC[k]}"><svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="${r}" fill="none" stroke="var(--raised)" stroke-width="9" stroke-linecap="butt" stroke-dasharray="${sp} ${c}" transform="rotate(135 48 48)"/>
      <circle cx="48" cy="48" r="${r}" fill="none" stroke="${KH[k]}" stroke-width="9" stroke-linecap="butt" stroke-dasharray="${Math.max(.1, (hi - lo) * sp)} ${c}" stroke-dashoffset="${-lo * sp}" transform="rotate(135 48 48)"/></svg>
      <span class="av num">${esc(t)}<small>${esc(u)}</small></span><span class="al"><i></i>${esc(d.label)}</span></div>`; }).join("");
}
function graphHtml(kind, s, ids, opt = {}) {
  if (kind === "meters") return `<div class="meters">${gMeters(s, ids, opt.toggles)}</div>`;
  if (kind === "arcs") return `<div class="arcs">${gArcs(s, ids)}</div>`;
  const g = { env: gEnv, lfo: gLfo, filt: gFilt, echo: gEcho, verb: gVerb, eq: gEq }[kind](s, ids);
  return `<div class="gin"><svg class="gs" viewBox="0 0 ${GW} ${GH}" preserveAspectRatio="none">${g.svg}</svg>` +
    g.handles.map(([h, x, y, k]) => `<span class="hd" data-h="${h}" style="left:${x / GW * 100}%;top:${y / GH * 100}%;--c:${KC[k]}"></span>`).join("") + `</div>`;
}

/* ---- a value's fill: from its zero (the middle when it goes both ways) to where it is */
const zeroOf = (d) => (d.min < 0 && d.max > 0 ? -d.min / (d.max - d.min) : 0);
function fillVars(d, v) { const f = frac(d, v), z = zeroOf(d); return `--lo:${Math.min(f, z)};--hi:${Math.max(f, z)};--f:${f}`; }
const isChoice = (d) => isEnum(d) || isOnOff(d);
const nextOf = (d, v) => (v >= d.max ? d.min : v + 1);
const valHtml = (d, v) => { const [t, u] = fmtValue(d, v); return `${esc(t)}${u ? `<small>${esc(u)}</small>` : ""}`; };

/* a graph's readout: a value slides sideways, a choice steps on a tap */
function readout(s, id, k) {
  const d = desc(s, id); if (!d) return "";
  const v = val(s, id), key = keyOf(s, id), lab = `<span class="rl"><i></i>${esc(d.label)}</span>`;
  if (isChoice(d)) return `<button class="ro ch" style="--c:${KC[k]}" data-cell="${key}" data-ro="${k}" data-set="${key}" data-v="${nextOf(d, v)}" aria-label="${esc(d.label)}: ${esc(fmtValue(d, v)[0])}, tocar para cambiar">${lab}<span class="rv num">${valHtml(d, v)}</span></button>`;
  return `<div class="ro" style="--c:${KC[k]};${fillVars(d, v)}" data-cell="${key}" data-ro="${k}" data-fd="${key}" role="slider" tabindex="0" aria-label="${esc(d.label)}" aria-valuenow="${v}" aria-valuemin="${d.min}" aria-valuemax="${d.max}">${lab}<span class="rv num">${valHtml(d, v)}</span><span class="rf"></span></div>`;
}

/* a parameter's tile, by what it is */
function tileP(s, id, k, pt, tag = pt) {
  const d = desc(s, id); if (!d) return "";
  const v = val(s, id), key = keyOf(s, id), lv = devLive(S.folder, pt) ? " dev" : "", at = `style="--c:${KC[k]}${isChoice(d) ? "" : ";" + fillVars(d, v)}" data-cell="${key}" data-kk="${k}" data-title="${esc(pt)}" data-tag="${tag ? 1 : 0}"`;
  const top = `<span class="tt"><span class="tlb"><i></i>${esc(d.label)}</span>${tag ? `<span class="pg">${esc(pt)}</span>` : ""}</span>`;
  if (typeof isGo === "function" && isGo(d)) return `<button class="tp t-go${lv}" ${at} data-set="${key}" data-v="${d.max}"><span class="tt"><span class="tlb"><i></i>${esc(d.label)}</span></span><span class="tv">GO</span></button>`;   /* (RAND, BACK, SET A, SWAP…: an action) */
  if (isOnOff(d)) { const on = v !== d.min;
    return `<button class="tp t-sw${on ? " on" : ""}${lv}" ${at} role="switch" aria-checked="${on}" data-set="${key}" data-v="${on ? d.min : d.max}" aria-label="${esc(d.label)}">${top}<span class="tv num">${valHtml(d, v)}</span><span class="knob" aria-hidden="true"></span></button>`; }
  const opts = () => d.names.map((n, i) => `<button role="radio" aria-checked="${i + d.min === v}" data-set="${key}" data-v="${i + d.min}">${esc(n)}</button>`).join("");
  if (isEnum(d) && d.names.length <= 2) return `<div class="tp t-two${lv}" ${at}>${top}<div class="opts" role="radiogroup" aria-label="${esc(d.label)}">${opts()}</div></div>`;
  if (isEnum(d) && d.names.length <= 4) return `<div class="tp t-seg${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span><div class="opts" role="radiogroup" aria-label="${esc(d.label)}">${opts()}</div></div>`;
  if (isEnum(d)) return `<div class="tp t-arr${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span><span class="pos num">${v - d.min + 1}/${d.max - d.min + 1}</span>
    <div class="arw"><button data-set="${key}" data-v="${v <= d.min ? d.max : v - 1}" aria-label="${esc(d.label)}: anterior"><svg class="i"><use href="#i-prev"/></svg></button><button class="pkb" data-pick="${key}" aria-label="${esc(d.label)}: lista"><svg class="i"><use href="#i-list"/></svg></button><button data-set="${key}" data-v="${nextOf(d, v)}" aria-label="${esc(d.label)}: siguiente"><svg class="i"><use href="#i-next"/></svg></button></div></div>`;
  if (d.max <= d.min && d.label === "CPU" && M.state) return `<div class="tp${lv}" ${at}>${top}<span class="tv num">${M.state.cpu}<small>%</small></span><span class="pos2 num">LATE ${M.state.late}  PEAK ${M.state.peak}%</span></div>`;   /* (SYSTEM's reading: STATE) */
  if (d.max <= d.min) return `<div class="tp${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span></div>`;   /* (a reading) */
  return `<div class="tp t-fd${zeroOf(d) ? " t-bi" : ""}${lv}" ${at} data-fd="${key}" role="slider" tabindex="0" aria-label="${esc(d.label)}" aria-valuenow="${v}" aria-valuemin="${d.min}" aria-valuemax="${d.max}">${top}<span class="tv num">${valHtml(d, v)}</span><span class="fl" aria-hidden="true"></span></div>`;
}

/* ---- a module: a page's graph, large, and its readouts */
function devLive(folder, title) { return M.page && !M.page.home && FAM[M.page.fam] === folder && M.page.title === title; }
function module(p, kind, opt = {}) {
  const lv = opt.nolive ? false : p.folder === "HOME" ? !!(M.page && M.page.home) : devLive(p.folder, p.title);
  const ro = kind === "meters" || kind === "arcs" ? "" : `<div class="ros">${GUSE[kind].filter((k) => p.ids[k] < 127).map((k) => readout(p.s, p.ids[k], k)).join("")}</div>`;
  return `<section class="bx g-${kind}${lv ? " dev" : ""}${opt.cls ? " " + opt.cls : ""}" data-title="${esc(p.title)}" data-g="${kind}">
    ${opt.bare && !lv ? "" : `<header>${opt.bare ? "<span></span>" : `<h3><svg class="i"><use href="#i-${ICON[p.folder] || "edit"}"/></svg>${esc(opt.name || p.title)}</h3>`}${lv ? `<span class="live2">En el sinte</span>` : opt.hint ? `<span class="hint2">${esc(opt.hint)}</span>` : ""}</header>`}
    <div class="gr" data-gr="${kind}" data-s="${p.s}" data-ids="${p.ids.join(",")}"${opt.toggles ? ' data-toggles="1"' : ""}>${graphHtml(kind, p.s, p.ids, opt)}</div>${ro}</section>`;
}
function pagesOf(folder) {
  if (folder === "HOME") return [{ title: "HOME", folder: "HOME", s: 0, ids: M.homeIds }, ...["ENV", "FILTER", "LFO", "FX", "MACROS"].map((t) => { const x = LAYOUT.find((y) => y.title === t); return { title: t, folder: x.folder, s: x.scope, ids: x.ids }; })];
  return LAYOUT.filter((x) => x.folder === folder && pageOn(x)).map((x) => ({ title: x.title, folder, s: x.scope, ids: x.ids }));
}
/* a folder in blocks: an effect, an LFO, an envelope… each with its pages (named by its first, as on the device) */
const BLOCKS = {
  ENV: [["ENV", "ENV DEST"], ["ENV 2", "ENV 2 LOOP"]],
  LFO: [["LFO", "LFO DEST"], ["LFO 2"], ["LFO 3"], ["MOD", "MOD SEQ 2", "MATRIX", "MOD SEQ"]],
  FX: [["FX"], ["FILTER"], ["INSERT", "INSERT 2"], ["DLY", "DLY 2"], ["REVERB"], ["CHORUS"], ["EQ+COMP"]],
  EDIT: [["EDIT 1"], ["MACROS", "EDIT 2"], ["VOICE", "VOICE 2", "VOICE 3"], ["LAYER", "LAYER 2", "MORPH", "RANDOM", "UNDO"]],
  ARP: [["ARP", "ARP 2"], ["SPICE"]],
  GLO: [["GLOBAL"], ["MASTER"], ["SYSTEM", "TUNING", "MIDI", "MIDI 2"]],
};
function blocksOf(folder, pages) {
  const def = BLOCKS[folder] || [], seen = new Set(), out = [];
  def.forEach((titles) => { const ps = titles.map((t) => pages.find((p) => p.title === t)).filter(Boolean); ps.forEach((p) => seen.add(p)); if (ps.length) out.push(ps); });
  pages.filter((p) => !seen.has(p)).forEach((p) => out.push([p]));
  return out;
}
const isAway = (p) => p.scope === 2 || p.title === "TOOLS" || !live(p.ids).length;
function block(ps) {
  const mods = [], tiles = [], rows = [], awayAll = ps.filter(isAway).map((p) => p.title);
  const extras = awayAll.filter((t) => EXTRA[t]).map((t) => EXTRA[t]()).join("");
  const away = awayAll.filter((t) => !EXTRA[t] && !HIDE.has(t) && t !== "TOOLS");
  ps.filter((p) => !isAway(p)).forEach((p) => {
    const kind = GRAPH[p.title], used = kind ? GUSE[kind] : [];
    if (kind) mods.push(module(p, kind, { bare: p.title === ps[0].title }));
    live(p.ids).filter(({ k }) => !used.includes(k)).forEach(({ id, k }) => rows.push({ s: p.s, id, k, t: p.title }));
  });
  const pgs = [...new Set(rows.map((r) => r.t))], many = pgs.length > 1;   /* una sola página: su nombre va en la cabecera, no en cada baldosa */
  rows.forEach((r) => tiles.push(tileP(r.s, r.id, r.k, r.t, many)));
  const sub = !many && pgs.length && pgs[0] !== ps[0].title ? `<span class="bpg">${esc(pgs[0])}</span>` : "";
  const awayTxt = away.length ? `${esc(away.join(", "))}: solo en el sinte. El FM-1 no los publica y el editor tampoco tiene comando para ellos.` : "";
  if (awayTxt && (mods.length || rows.length)) tiles.push(`<section class="tp away"><p>${awayTxt}</p></section>`);
  if (!mods.length && !tiles.length) return extras + (awayTxt ? `<p class="pce">${awayTxt}</p>` : "");   /* sin contenido propio: una nota, no otra cabecera */
  const lay = mods.length && tiles.length ? "side" : mods.length ? "solo" : "flat";
  return `<section class="blk" data-blk="${esc(ps[0].title)}"><header class="bh"><h2><svg class="i"><use href="#i-${ICON[ps[0].folder] || "edit"}"/></svg>${esc(ps[0].title)}</h2>${sub}</header>
    <div class="bb ${lay}">${mods.join("")}${tiles.length ? `<div class="tz${tiles.length === 1 ? " one" : ""}">${tiles.join("")}</div>` : ""}</div></section>${extras}`;
}
/* ===================================================================== PC ====
   Lo que el editor de Estudio ya sabe pedir al FM-1 y Live todavía no. Los formatos están leídos del editor
   publicado (isod89.github.io/clipper-fm1/webapp/editor). Regla: las LECTURAS y las escrituras cuyo formato se
   leyó entero van conectadas; las escrituras con formato a medio leer quedan en PC.pend() — una escritura con un
   formato adivinado puede estropear datos de verdad en el sinte. Todo esto se prueba en casa con el FM-1. */
const CE = { UP_ERASE: 21, SMP_ERASE: 14, SMP_INFO: 15, TRACK: 27, TRACK_MIX: 28, BK_LIST: 34, DSYN_LIST: 72, DSYN_PLAY: 76,
  MSEQ_GET: 93, MSEQ_PUT: 94, TUNE_GET: 95, TUNE_PUT: 96, PROJECT: 9 };
const PCD = {};                                 /* lo leído: undefined sin pedir, "…" pidiendo, null no contestó, o los datos */
const u35 = (r) => { let v = 0; for (let i = 0; i < 5; i++) v += r.b() * 2 ** (7 * i); return v; };
const PCP = {                                   /* las respuestas, tal como las lee el editor */
  smp(a) { const r = new Reader(a), o = { nslots: r.b(), slotKiB: r.b(), slots: [] };
    for (let i = 0; i < o.nslots; i++) o.slots.push({ zones: r.b(), name: r.s(), kib: r.b() }); return o; },
  kits(a) { const r = new Reader(a), o = { factory: r.b(), user: r.b(), stored: !!r.b(), names: [], kits: [] };
    for (let i = 0; i < o.factory; i++) o.names.push(r.s());
    for (let i = 0; i < o.user; i++) o.kits.push({ name: r.s(), src: r.b() }); return o; },
  banks(a) { const r = new Reader(a), rc = r.b(), n = r.b(), items = [];
    for (let i = 0; i < n; i++) items.push({ id: r.b(), len: u35(r), crc: u35(r) }); return { rc, items }; },
  tracks(a) { const r = new Reader(a), o = { sel: r.b(), ntrk: r.b(), tracks: [] };
    for (let i = 0; i < o.ntrk; i++) o.tracks.push({ engine: r.b(), preset: r.b(), level: r.v(), mute: r.b(), armed: r.b() });
    o.solo = r.more ? r.b() : 0; return o; },
  mseq(a) { return { part: a[0], rc: a[1], steps: a[1] ? null : Array.from(a.slice(2, 66), (x) => x - 8) }; },
  tune(a) { const u21 = (k) => a[k] | (a[k + 1] << 7) | (a[k + 2] << 14), n = a[3] || 0;
    return { rc: a[0], sys: a[1], root: a[2], n, period: u21(4), deg: [0, ...Array.from({ length: Math.max(0, n - 1) }, (_, i) => u21(7 + 3 * i))] }; },
};
const PCV = new Set(["LFO", "GLO", "SEQ", "SAVE", "ESTUDIO"]);  /* las vistas que muestran algo de aquí */
const PC = {
  load(key, cmd, args, parse) {                 /* una vez por sesión; al llegar, se vuelve a pintar la vista */
    if (PCD[key] !== undefined) return PCD[key];
    PCD[key] = "…";
    let pr; try { pr = rq(cmd, args, { key: "pc-" + key, quiet: true, retries: 0, timeout: 650 }); } catch (e) { PCD[key] = null; return null; }
    pr.then((a) => { try { PCD[key] = parse(a); } catch (e) { PCD[key] = null; } }, () => { PCD[key] = null; })
      .finally(() => { if (PCV.has(S.folder)) renderWork(); });
    return "…";
  },
  again(key) { delete PCD[key]; renderWork(); },
  async act(cmd, args, ok) {                    /* escrituras con formato leído entero */
    try { await rq(cmd, args, { quiet: true, retries: 0, timeout: 900 }); if (ok) toast(-1, ok); return true; }
    catch (e) { toast(-1, "El FM-1 no contestó"); return false; }
  },
  pend(what) { toast(-1, `<b>Pendiente</b> ${esc(what)} — se termina en el PC`); },
};
/* el hueco honesto: pidiendo, o el sinte no contestó a esto */
const pcEmpty = (v, what) => v === "…" ? `<p class="pce">Leyendo ${esc(what)} del FM-1…</p>`
  : `<p class="pce">El FM-1 no contestó a esto. ${M.mock ? "El FM-1 de ejemplo no lo sabe hacer; " : ""}con el sinte de verdad sale aquí.</p>`;
const blk = (title, icon, body, cls = "") => `<section class="blk${cls ? " " + cls : ""}" data-blk="${esc(title)}">
  <header class="bh"><h2><svg class="i"><use href="#i-${icon}"/></svg>${esc(title)}</h2></header>${body}</section>`;

/* ---- MATRIX: 12 ranuras de origen → destino → cantidad. Ya están en pdesc y en el DUMP: funcionan ---- */
const MX = [60, 63, 66, 69, 72, 75, 100, 103, 106, 109, 112, 115];   /* el SRC de cada ranura; DST +1, AMT +2 */
function matrixBlock() {
  if (!desc(0, MX[0])) return "";
  const row = (src, i) => `<div class="mxr${val(0, src) ? "" : " off"}" data-src="${src}"><span class="mxn num">${String(i + 1).padStart(2, "0")}</span>
    ${tileP(0, src, 0, "MATRIX", false)}<span class="mxa" aria-hidden="true">→</span>${tileP(0, src + 1, 1, "MATRIX", false)}${tileP(0, src + 2, 2, "MATRIX", false)}</div>`;
  return blk("MATRIX", "lfo", `<div class="mx">${MX.map(row).join("")}</div>`, "wide");
}
/* ---- LAYER: LVL, TRIM, MUTE — los tres parámetros de sonido que no publica ninguna página ---- */
function layerBlock() {
  const ids = [[0, 0], [8, 1], [40, 3]].filter(([id]) => desc(0, id));
  if (!ids.length) return "";
  return blk("LAYER", "edit", `<div class="bb flat"><div class="tz">${ids.map(([id, k]) => tileP(0, id, k, "LAYER", false)).join("")}</div></div>`);
}
/* ---- MOD SEQ: 4 carriles de 16 pasos, de −8 a 7. Se pinta arrastrando el dedo; se manda al soltar (MSEQ_PUT) ---- */
const mssStyle = (x) => `--t:${x > 0 ? 50 - x / 8 * 50 : 50}%;--h:${Math.abs(x) / 8 * 50}%`;
function mseqBlock() {
  const v = PC.load("mseq", CE.MSEQ_GET, [0], PCP.mseq);
  if (!v || v === "…" || !v.steps) return blk("MOD SEQ", "lfo", pcEmpty(v && v.steps === null ? null : v, "la secuencia de modulación"), "wide");
  return blk("MOD SEQ", "lfo", `<div class="msq" data-msq="1">${[0, 1, 2, 3].map((l) => `<div class="msl" style="--c:${KC[l]}"><span class="msn num">${l + 1}</span>
      ${v.steps.slice(l * 16, l * 16 + 16).map((x, i) => `<div class="mss" data-l="${l}" data-i="${i}" style="${mssStyle(x)}"><i></i></div>`).join("")}</div>`).join("")}</div>
    <p class="msh">Arrastra el dedo por los pasos: arriba sube, abajo baja. Se manda al soltar.</p>`, "wide");
}
/* ---- TUNING: la raíz con ‹ ›, cada grado se arrastra en horizontal (1 cent por píxel); se manda al soltar (TUNE_PUT) ---- */
function tuningBlock() {
  const v = PC.load("tune", CE.TUNE_GET, [], PCP.tune);
  if (!v || v === "…" || v.rc) return blk("TUNING", "glo", pcEmpty(v && v.rc ? null : v, "la afinación"));
  const c = (x) => (x / 16).toFixed(1);
  return blk("TUNING", "glo", `<div class="tun">
    <div class="tnh"><span><small>Sistema</small><b class="num">${v.sys}</b></span>
      <span class="tnr"><small>Raíz</small><span class="arw"><button data-tune="-1" aria-label="Raíz anterior"><svg class="i"><use href="#i-prev"/></svg></button><b class="num">${NOTE_NAMES[v.root % 12]}</b><button data-tune="1" aria-label="Raíz siguiente"><svg class="i"><use href="#i-next"/></svg></button></span></span>
      <span><small>Grados</small><b class="num">${v.n}</b></span><span><small>Periodo</small><b class="num">${c(v.period)}<small>ct</small></b></span></div>
    <div class="tng">${v.deg.map((d, i) => `<div class="tnd${i ? "" : " fix"}" data-deg="${i}"><small class="num">${i + 1}</small><b class="num">${c(d)}</b></div>`).join("")}</div>
    <p class="msh">Arrastra un grado a izquierda o derecha para afinarlo. El primero es la raíz y no se mueve.</p></div>`);
}
const tunePut = (v) => { const u21 = (x) => [x & 127, (x >> 7) & 127, (x >> 14) & 127];
  return PC.act(CE.TUNE_PUT, [v.sys & 127, v.root & 127, v.deg.length & 127, ...u21(v.period), ...v.deg.slice(1).flatMap(u21)]); };

const EXTRA = { MATRIX: matrixBlock, "MOD SEQ": mseqBlock, LAYER: layerBlock, TUNING: tuningBlock };
const HIDE = new Set(["MIDI", "MIDI 2"]);      /* sus parámetros ya salen en SYSTEM: la tarjeta mentía */

/* ---- SEQ: las pistas (TRACK). Tocar una la elige y el secuenciador pasa a editarla; el nivel se arrastra; MUTE alterna (TRACK_MIX) ---- */
const trLv = (l) => Math.max(0, Math.min(1, (l + 64) / 127));
function tracksBlock() {
  const v = PC.load("tracks", CE.TRACK, [], PCP.tracks);
  if (!v || v === "…") return blk("PISTAS", "seq", pcEmpty(v, "las pistas"), "wide");
  return blk("PISTAS", "seq", `<div class="trk">${v.tracks.map((t, i) => `<div class="trr${t.mute ? " mute" : ""}${i === v.sel ? " sel" : ""}">
      <button class="trs" data-trk="${i}" aria-pressed="${i === v.sel}"><span class="trn num">${i + 1}</span><span class="tre"><b>${esc(M.info.engines[t.engine] || "—")}</b><small class="num">${t.preset + 1}</small></span></button>
      <div class="trl" data-trl="${i}" role="slider" aria-label="Nivel de la pista ${i + 1}" aria-valuenow="${t.level}" style="--f:${trLv(t.level)}"><i></i><span class="num">${t.level}</span></div>
      <button class="trm" data-trm="${i}" aria-pressed="${!!t.mute}">MUTE</button>${t.armed ? '<span class="tra">REC</span>' : "<span></span>"}</div>`).join("")}</div>
    <p class="msh">Toca una pista para editar sus pasos arriba. El nivel se arrastra en horizontal.</p>`, "wide");
}
async function trackMix(i, level, mute) {
  const v = PCD.tracks; if (!v || v === "…") return;
  const t = v.tracks[i]; t.level = level; t.mute = mute ? 1 : 0;
  try { await rq(CE.TRACK_MIX, [i & 127, ...v14(level), mute ? 1 : 0], { key: "trmix:" + i, quiet: true, retries: 0, timeout: 900 }); }
  catch (e) { toast(-1, "El FM-1 no contestó"); }
}
async function trackPick(i) {
  try {
    PCD.tracks = PCP.tracks(await rq(CE.TRACK, [i & 127], { quiet: true, retries: 0, timeout: 900 }));
    SQ.loaded = false; SQX.loaded = false; SQ.sel = 0; SQ.r0 = SQ.r1 = 0;
    toast(-1, `<b>Pista ${i + 1}</b> en el secuenciador`); renderWork();
  } catch (e) { toast(-1, "El FM-1 no contestó"); }
}
function songBlock() {          /* el formato de la canción (ARR: 16 pasos, hasta 64 compases) aún no tiene comando leído */
  return blk("CANCIÓN", "seq", `<div class="sng">${Array.from({ length: 16 }, (_, i) => `<button class="sgs" data-pend="la canción (ARR)"><span class="num">${i + 1}</span><b>—</b></button>`).join("")}</div>
    <p class="pce">Dieciséis pasos de canción, hasta 64 compases cada uno. Falta leer cómo la guarda el editor; la interfaz ya está.</p>`, "wide");
}

const SMP = { SLOT_SIZE: 0x14000, DATA_OFF: 512, RATE: 22050, HDR_LEN: 32 + 16 * 28, MAX_ZONES: 16 };
SMP.MAX_DATA = SMP.SLOT_SIZE - SMP.DATA_OFF;

/* groups of up to 7 bytes, each preceded by their top bits */
function pack7(b) {
  const out = [];
  for (let i = 0; i < b.length; i += 7) {
    const g = Array.from(b.slice(i, i + 7));
    out.push(g.reduce((m, x, j) => m | (((x >> 7) & 1) << j), 0));
    for (const x of g) out.push(x & 0x7F);
  }
  return out;
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

const IMA_STEP = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88,
  97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658,
  724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660,
  4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818,
  18500, 20350, 22385, 24623, 27086, 29794, 32767];
const IMA_IDX = [-1, -1, -1, -1, 2, 4, 6, 8];
/* IMA ADPCM, 4 bit, low nibble first, from predictor 0 / index 0 -> {data, pred, idx} (state at loopStart) */
function imaEncode(s, loopStart = 0) {
  let pred = 0, idx = 0, atLoop = [0, 0];
  const nib = new Uint8Array(s.length + (s.length & 1));
  for (let n = 0; n < s.length; n++) {
    if (n === loopStart) atLoop = [pred, idx];
    const step = IMA_STEP[idx];
    let diff = s[n] - pred, code = 0;
    if (diff < 0) { code = 8; diff = -diff; }
    let vd = step >> 3;
    if (diff >= step) { code |= 4; diff -= step; vd += step; }
    if (diff >= step >> 1) { code |= 2; diff -= step >> 1; vd += step >> 1; }
    if (diff >= step >> 2) { code |= 1; vd += step >> 2; }
    pred = Math.max(-32768, Math.min(32767, code & 8 ? pred - vd : pred + vd));
    idx = Math.max(0, Math.min(88, idx + IMA_IDX[code & 7]));
    nib[n] = code;
  }
  const out = new Uint8Array(nib.length >> 1);
  for (let k = 0; k < nib.length; k += 2) out[k >> 1] = nib[k] | (nib[k + 1] << 4);
  return { data: out, pred: atLoop[0], idx: atLoop[1] };
}

/* WAV: PCM 8/16/24/32 or float, any channel count, mixed to mono -> {sr, x} (gen_samples.read_any_wav) */
function parseWav(buf) {
  const d = new Uint8Array(buf), v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const id = (i) => String.fromCharCode(d[i], d[i + 1], d[i + 2], d[i + 3]);
  if (d.length < 12 || id(0) !== "RIFF" || id(8) !== "WAVE") throw new Error("not a WAV file");
  let i = 12, fmt = null, data = null, loop = null;
  while (i + 8 <= d.length) {
    const cid = id(i), n = v.getUint32(i + 4, true);
    if (cid === "fmt ") {
      let tag = v.getUint16(i + 8, true);
      const ch = v.getUint16(i + 10, true), sr = v.getUint32(i + 12, true), bits = v.getUint16(i + 22, true);
      if (tag === 0xFFFE) tag = v.getUint16(i + 32, true);
      fmt = { tag, ch, sr, bits };
    } else if (cid === "data") {
      data = [i + 8, Math.min(d.length, i + 8 + n)];
    } else if (cid === "smpl" && n >= 60 && i + 8 + 60 <= d.length && v.getUint32(i + 8 + 28, true)) {
      loop = [v.getUint32(i + 8 + 44, true), v.getUint32(i + 8 + 48, true)];   /* (0.7, after SLOOP 2.7) its first loop, frames */
    }
    i += 8 + n + (n & 1);
  }
  if (!fmt || !data) throw new Error("WAV without fmt/data");
  const { tag, ch, sr, bits } = fmt, bps = bits >> 3, frame = bps * ch;
  if (!(tag === 1 || tag === 3) || !bps || !ch) throw new Error("unsupported WAV format");
  const nfr = Math.floor((data[1] - data[0]) / frame), x = new Float64Array(nfr);
  for (let f = 0; f < nfr; f++) {
    let acc = 0;
    for (let c = 0; c < ch; c++) {
      const o = data[0] + f * frame + c * bps;
      let s;
      if (tag === 3) s = bps === 4 ? v.getFloat32(o, true) : v.getFloat64(o, true);
      else if (bps === 2) s = v.getInt16(o, true) / 32768;
      else if (bps === 3) s = (((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) << 8) >> 8) / 8388608;
      else if (bps === 4) s = v.getInt32(o, true) / 2147483648;
      else s = (d[o] - 128) / 128;
      acc += s;
    }
    x[f] = acc / ch;
  }
  return { sr, x, loop };
}

/* Clipper 0.2: a wavetable for WAVE (firmware eng_wave.c): a WAV of single cycles one after the other (Serum's 2048
   points a frame, its "clm " chunk says so; else 2048, 1024 or 256 by the length; a short file is one cycle), 16 frames
   picked evenly, each one's harmonics 1..128 (a DFT: the cosine and sine terms, Q15), normalised to a peak of 0.9 over
   the band-limited copies the firmware builds (as tools/gen_wavetables.py). Sent to a user slot as a sample is
   (SMP_BEGIN, SMP_WRITE at +512, SMP_END) with an "FWTB" header; SMP_INFO shows it as 127 zones. */
function resample(x, sr, to) {
  if (sr === to) return Array.from(x);
  if (sr > to) {
    const k = Math.max(1, pyRound(sr / to));
    if (k > 1) {
      const y = new Array(x.length);
      for (let i = 0; i < x.length; i++) { let s = 0; for (let j = i; j < Math.min(x.length, i + k); j++) s += x[j]; y[i] = s / k; }
      x = y;
    }
  }
  const step = sr / to, out = [];
  let p = 0;
  while (p < x.length - 1) { const i = Math.floor(p), f = p - i; out.push(x[i] * (1 - f) + x[i + 1] * f); p += step; }
  return out;
}
function pyRound(v) { const f = Math.floor(v), r = v - f; return r > 0.5 ? f + 1 : r < 0.5 ? f : (f % 2 ? f + 1 : f); }

/* mono float -> int16, peak normalised to 30000 */
function normalize(x) {
  let pk = 1e-9;
  for (const v of x) pk = Math.max(pk, Math.abs(v));
  return Int16Array.from(x, (v) => Math.max(-32768, Math.min(32767, Math.trunc(v / pk * 30000))));
}

/* root from a file name like "piano_C4" or "F#3" (C4 = 60), else 60 (sampleio.note_from_name) */
function rootFromName(name) {
  const m = /(?<![A-Za-z])([A-G])([#b]?)(-?\d)(?!\d)/.exec(name);
  if (!m) return 60;
  const n = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
  return Math.max(0, Math.min(127, n));
}

/* zones: [{s: Int16Array (22050 Hz), root, lo?, hi?}] -> {hdr (480 B), data, zones} (sampleio.user_slot) */
/* 0.7 (after SLOOP 2.7): a file's loop (the Samples page): 0 ONE SHOT; 1 LOOP, the whole file again while the key is
   held, let go it ends its round; 2 LOOP+TAIL, the start, then [ls, le] again while held, let go the rest to the end.
   Both are the zone's looped = 2 (SMP_LOOP_HELD, firmware eng_sample.c) */
const LOOP = {
  NAMES: ["ONE SHOT", "LOOP", "LOOP+TAIL"], MIN: 64, SNAP: 512,
  range(z) {                                          /* the loop's [ls, le] of a file of n samples */
    const n = z.s.length;
    if (z.loop === 1 || n < 2 * LOOP.MIN) return [0, n - 1];
    const ls = Math.max(0, Math.min(n - LOOP.MIN - 1, Math.round(z.ls ?? 0)));
    return [ls, Math.max(ls + LOOP.MIN - 1, Math.min(n - 1, Math.round(z.le ?? n - 1)))];
  },
  snap(s, i) {                                        /* the nearest rising zero crossing to i, within SNAP samples, else i */
    for (let d = 0; d <= LOOP.SNAP; d++)
      for (const j of d ? [i - d, i + d] : [i])
        if (j >= 1 && j < s.length && s[j - 1] < 0 && s[j] >= 0) return j;
    return i;
  },
  snapRange(s, ls, le) {                              /* both points on crossings: the jump back lands where the wave goes */
    const n = s.length, a = Math.max(0, Math.min(n - LOOP.MIN - 1, LOOP.snap(s, ls)));
    let b = LOOP.snap(s, le + 1) - 1;
    if (b < a + LOOP.MIN - 1 || b > n - 1) b = Math.max(a + LOOP.MIN - 1, Math.min(n - 1, le));
    return [a, b];
  },
  preview(z) {                                        /* what a held key plays: the start, the loop twice more, the tail */
    if (!z.loop) return z.s;
    const [a, b] = LOOP.range(z), seg = z.s.slice(a, b + 1);
    const out = new Int16Array((b + 1) + 2 * seg.length + (z.loop === 2 ? z.s.length - b - 1 : 0));
    out.set(z.s.slice(0, b + 1), 0);
    out.set(seg, b + 1);
    out.set(seg, b + 1 + seg.length);
    if (z.loop === 2) out.set(z.s.slice(b + 1), b + 1 + 2 * seg.length);
    return out;
  },
};

function buildSlot(name, zonesIn) {
  const zones = [], parts = [];
  let len = 0;
  for (const z of zonesIn) {
    const [ls, le] = z.loop ? LOOP.range(z) : [0, z.s.length - 1];
    const e = imaEncode(z.s, ls);                    /* (the decoder's state at the loop start) */
    zones.push({ off: len, n: z.s.length, ls, le, looped: z.loop ? 2 : 0, root: z.root, lo: z.lo ?? null, hi: z.hi ?? null,
      pred: e.pred, idx: e.idx });
    parts.push(e.data);
    len += e.data.length;
  }
  const data = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { data.set(p, o); o += p.length; }
  if (len > SMP.MAX_DATA) throw new Error(`too long: ${len} B (max ${SMP.MAX_DATA} B)`);
  if (!zones.length || zones.length > SMP.MAX_ZONES) throw new Error("1..16 files per slot");
  zones.sort((a, b) => a.root - b.root);
  zones.forEach((z, j) => {
    if (z.lo == null) {
      z.lo = j === 0 ? 0 : Math.floor((zones[j - 1].root + z.root) / 2) + 1;
      z.hi = j === zones.length - 1 ? 127 : Math.floor((z.root + zones[j + 1].root) / 2);
    }
  });
  const hdr = new Uint8Array(SMP.HDR_LEN), v = new DataView(hdr.buffer);
  v.setUint32(0, 0x504D5346, true);
  v.setUint16(4, 1, true);
  hdr[6] = zones.length;
  const nm = String(name).toUpperCase().replace(/[^\x20-\x7E]/g, "").slice(0, 8);
  for (let i = 0; i < nm.length; i++) hdr[8 + i] = nm.charCodeAt(i);
  v.setUint32(16, len, true);
  v.setUint32(20, crc32(data), true);
  const rate = pyRound(SMP.RATE / 44100 * 65536);
  zones.forEach((z, j) => {
    const b = 32 + j * 28;
    [z.off, z.n, z.ls, z.le, rate].forEach((x, k) => v.setUint32(b + k * 4, x >>> 0, true));
    v.setInt16(b + 20, z.root * 16, true);
    v.setInt16(b + 22, z.pred, true);
    hdr[b + 24] = z.idx; hdr[b + 25] = z.lo; hdr[b + 26] = z.hi; hdr[b + 27] = z.looped || 0;
  });
  return { hdr, data, zones };
}

/* ------------------------------------------------------------------- chop --- */
/* Chopping a recording into a slot (the CHOP block of the samples tab). All at SMP.RATE, positions
   in samples. These are pure: test_web.mjs runs them. */
/* ===================================================================== SAMPLES ====
   Subir un WAV a una ranura de usuario, como el editor de Estudio. Lo de arriba es su código sin cambios (parseWav,
   resample, normalize, rootFromName, LOOP, IMA ADPCM, crc32 y buildSlot): un archivo es una nota, a 22 050 Hz, y su raíz
   sale del nombre del archivo («PIANO A4» → A4). Luego SMP_BEGIN, la carga en trozos de 256 bytes (SMP_WRITE) y SMP_END. */
const SMPUP = { k: -1, done: 0, total: 0 };
async function smpDecode(f) {
  const buf = await f.arrayBuffer(); let x;
  try { const w = parseWav(buf); x = resample(w.x, w.sr, SMP.RATE); }
  catch (e) {                                       /* no es un WAV corriente: que lo descodifique el navegador */
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ab = await new Ctx(1, 1, SMP.RATE).decodeAudioData(buf.slice(0)); x = new Float64Array(ab.length);
    for (let c = 0; c < ab.numberOfChannels; c++) { const d = ab.getChannelData(c); for (let i = 0; i < d.length; i++) x[i] += d[i] / ab.numberOfChannels; }
  }
  if (!x.length) throw new Error("el archivo no tiene audio");
  return { s: normalize(x), root: rootFromName(f.name.replace(/\.[^.]*$/, "")) };
}
function smpProg() {
  const el = document.querySelector(`.dvs[data-smp="${SMPUP.k}"] small`);
  if (el) el.textContent = `Subiendo ${SMPUP.done} / ${SMPUP.total}`;
  const bar = document.querySelector(`.dvs[data-smp="${SMPUP.k}"] .upb i`); if (bar) bar.style.width = (SMPUP.done / SMPUP.total * 100) + "%";
}
async function smpUpload(k, file) {
  if (SMPUP.k >= 0) { toast(-1, "Ya hay una subida en marcha"); return; }
  const name = file.name.replace(/\.[^.]*$/, "").toUpperCase().replace(/[^\x20-\x7E]/g, "").slice(0, 8) || "SAMPLE";
  Object.assign(SMPUP, { k, done: 0, total: 1 }); renderWork();
  try {
    const z = await smpDecode(file), { hdr, data } = buildSlot(name, [z]);
    if (data.length > SMP.MAX_DATA) throw new Error(`no cabe: ${Math.round(data.length / 1024)} KiB de ${Math.round(SMP.MAX_DATA / 1024)}`);
    SMPUP.total = Math.ceil(data.length / 256); smpProg();
    const o = { quiet: true, retries: 0, timeout: 1500 };
    let r = await rq(11, [k & 127], o); if (r[1]) throw new Error(`el FM-1 no aceptó empezar (${r[1]})`);      /* SMP_BEGIN */
    for (let off = 0; off < data.length; off += 256) {                                                       /* SMP_WRITE */
      const a = SMP.DATA_OFF + off, w = await rq(12, [k & 127, a & 127, (a >> 7) & 127, (a >> 14) & 127, ...pack7(data.subarray(off, off + 256))], { ...o, retries: 1 });
      if (w[4]) throw new Error(`falló el trozo ${SMPUP.done + 1} (${w[4]})`);
      SMPUP.done++; smpProg();
    }
    r = await rq(13, [k & 127, ...pack7(hdr)], { ...o, timeout: 2500 });                                    /* SMP_END */
    if (r[1]) throw new Error(`el FM-1 no cerró la ranura (${r[1]})`);
    toast(-1, `<b>${esc(name)}</b> subido a S${String(k + 1).padStart(2, "0")}`);
  } catch (e) { toast(-1, "No se subió: " + esc(e.message || String(e))); }
  SMPUP.k = -1; PC.again("smp");
}
document.addEventListener("change", (e) => {
  const inp = e.target.closest && e.target.closest("[data-smpup]"); if (!inp || !inp.files || !inp.files[0]) return;
  smpUpload(+inp.dataset.smpup, inp.files[0]); inp.value = "";
});

/* ---- SAVE > Dispositivo: biblioteca, samples, kits y proyectos ---- */
const DEV = [["LIB", "Biblioteca"], ["PRJ", "Proyectos"]];   /* (the samples: in Estudio) */
const KIT = { k: 0 };
function devView(kind) {
  if (kind === "SMP") {
    const v = PC.load("smp", CE.SMP_INFO, [], PCP.smp);
    if (!v || v === "…") return pcEmpty(v, "los samples");
    const up = (i) => `<input type="file" accept="audio/*,.wav,.aif,.aiff,.mp3" data-smpup="${i}" hidden>`;
    return `<div class="dvc">${v.slots.map((x, i) => SMPUP.k === i
        ? `<div class="dvs busy" data-smp="${i}"><span class="num">S${String(i + 1).padStart(2, "0")}</span><b>Subiendo…</b><small class="num">${SMPUP.done} / ${SMPUP.total}</small><span class="upb"><i style="width:${SMPUP.done / SMPUP.total * 100}%"></i></span></div>`
      : x.name ? `<div class="dvs" data-smp="${i}"><span class="num">S${String(i + 1).padStart(2, "0")}</span><b>${esc(x.name)}</b>
        <small class="num">${x.zones} ${x.zones === 1 ? "zona" : "zonas"} · ${x.kib} KiB</small>
        <span class="dva"><button class="btn" data-pc="smp-repl" data-n="${i}">Reemplazar</button><button class="dsc" data-pc="smp-erase" data-n="${i}">Borrar</button></span>${up(i)}</div>`
      : `<div class="dvs free" data-smp="${i}"><span class="num">S${String(i + 1).padStart(2, "0")}</span><b>Libre</b><small class="num">${v.slotKiB} KiB</small>
        <span class="dva"><label class="btn">Subir WAV${up(i)}</label></span></div>`).join("")}</div>
      <p class="msh">Un archivo por ranura, mono a 22 050 Hz; la raíz sale del nombre del archivo (por ejemplo «PIANO A4»). Cabe hasta ${Math.round(SMP.MAX_DATA / 1024)} KiB comprimidos.</p>`;
  }
  if (kind === "KIT") {
    const v = PC.load("kits", CE.DSYN_LIST, [], PCP.kits);
    if (!v || v === "…") return pcEmpty(v, "los kits");
    const all = [...v.names.map((n, i) => ({ n, k: i })), ...v.kits.map((x, i) => ({ n: x.name || `USER ${i + 1}`, k: 64 + i }))];
    const cur = all.find((x) => x.k === KIT.k) || all[0];
    return `<div class="kts">${all.map((x) => `<button class="kf" data-pc="kit" data-n="${x.k}" aria-current="${cur && x.k === cur.k}"><span>${esc(x.n)}</span></button>`).join("")}</div>
      <div class="pads" role="group" aria-label="Pads de ${esc(cur ? cur.n : "")}">${Array.from({ length: 16 }, (_, l) => `<button class="pad" data-pc="pad" data-n="${l}" style="--c:${KC[l % 4]}"><span class="num">${l + 1}</span></button>`).join("")}</div>`;
  }
  if (kind === "LIB") return libView();                     /* (the tablet's: studio.js) */
  /* PROYECTOS: 4 ranuras (PROJECT: 2 consulta, 0 carga, 1 guarda) */
  const ps = [0, 1, 2, 3].map((k) => PC.load("prj" + k, CE.PROJECT, [2, k], (a) => ({ slot: a[1], used: !!a[2], busy: a[3] === 1 })));
  if (ps.some((p) => p === "…")) return pcEmpty("…", "los proyectos");
  if (ps.every((p) => p === null)) return pcEmpty(null, "los proyectos");
  return `<div class="dvc">${ps.map((p, k) => `<div class="dvs${p && p.used ? "" : " free"}"><span class="num">P${k + 1}</span><b>${p && p.used ? `Proyecto ${k + 1}` : "Libre"}</b>
      <small>${p && p.used ? "Ocupado" : "Vacío"}</small>
      <span class="dva">${p && p.used ? `<button class="btn" data-pc="prj-load" data-n="${k}">Cargar</button>` : ""}<button class="btn" data-pc="prj-save" data-n="${k}">${p && p.used ? "Guardar encima" : "Guardar aquí"}</button></span></div>`).join("")}</div>
    <p class="msh">Cargar sustituye el proyecto que suena. Guardar encima borra el que había. Las dos piden un segundo toque.</p>`;
}

/* las acciones: dos toques para borrar, un toque para sonar */
document.addEventListener("click", async (e) => {
  const pend = e.target.closest("[data-pend]"); if (pend) { PC.pend(pend.dataset.pend); return; }
  const b = e.target.closest("[data-pc]"); if (!b) return;
  const n = +b.dataset.n;
  if (b.dataset.pc === "kit") { KIT.k = n; renderWork(); }
  else if (b.dataset.pc === "pad") PC.act(76, [KIT.k & 127, n & 127, 110]);                       /* DSYN_PLAY */
  else if (b.dataset.pc === "smp-repl") {
    if (b.dataset.arm !== "1") { arm(b, "Reemplazar", "¿Seguro?"); return; }
    disarm(b, "Reemplazar"); document.querySelector(`input[data-smpup="${n}"]`)?.click();
  } else if (b.dataset.pc === "smp-erase") {
    if (b.dataset.arm !== "1") { arm(b, "Borrar", "¿Seguro?"); return; }
    disarm(b, "Borrar"); PC.act(CE.SMP_ERASE, [n & 127], "Sample borrado").then((ok) => ok && PC.again("smp"));
  } else if (b.dataset.pc === "up-erase") {
    if (b.dataset.arm !== "1") { arm(b, "Borrar", "¿Seguro?"); return; }
    disarm(b, "Borrar"); PC.act(CE.UP_ERASE, [n & 127], "Sonido de usuario borrado").then(async (ok) => { if (!ok) return; US.slots = null; try { await readList(); } catch (e) { /* (the next RELOAD) */ } reloadSoon(); });
  } else if (b.dataset.pc === "prj-load" || b.dataset.pc === "prj-save") {
    const load = b.dataset.pc === "prj-load", lab = load ? "Cargar" : b.textContent;
    if (b.dataset.arm !== "1") { arm(b, lab, "¿Seguro?"); return; }
    disarm(b, lab);
    if (load && !M.mock && !(await autoBackupProject())) return;
    PC.act(CE.PROJECT, [load ? 0 : 1, n & 3], load ? `Proyecto <b class="num">${n + 1}</b> cargado` : `Guardado en el proyecto <b class="num">${n + 1}</b>`)
      .then((ok) => { if (!ok) return; if (load) reloadSoon(); PC.again("prj" + n); });
  }
});

function bentoView(folder) {
  const pages = pagesOf(folder);
  if (folder === "SEQ") return `<div class="blks">${seqBlock()}${blocksOf(folder, pages.filter((p) => p.title !== "NOTES")).map(block).join("")}${tracksBlock()}${songBlock()}</div>`;   /* (NOTES: seq.js) */
  if (folder !== "HOME") return `<div class="blks">${blocksOf(folder, pages).map(block).join("")}</div>`;
  const out = [];                                          /* (HOME in EDITAR: one bento, a look at all of it) */
  pages.forEach((p) => {
    if (isAway(p)) return;
    const kind = GRAPH[p.title], used = kind ? GUSE[kind] : [];
    if (kind) out.push(module(p, kind));
    live(p.ids).filter(({ k }) => !used.includes(k)).forEach(({ id, k }) => out.push(tileP(p.s, id, k, p.title)));
  });
  return `<div class="bento">${out.join("")}</div>`;
}

/* ---- RÁPIDO as a bento: the sweep filter and the sends large, the switches around them */
function quickBento() {
  const T = (id, s = 0) => QSPEC.get(keyOf(s, id));
  const box = (q, size) => `<div class="qb ${size}">${tile(q)}</div>`;
  return `<div class="qhead"><h2>Live</h2><button class="more" data-f="HOME">Editar más<svg class="i"><use href="#i-next"/></svg></button></div>
  <div class="bento quick2">
    ${module({ title: "FILTER", folder: "FX", s: 0, ids: [50, 127, 127, 127] }, "filt", { cls: "q-filt", name: "Filtro", hint: "LP ← OFF → HP" })}
    ${module({ title: "FX", folder: "FX", s: 0, ids: [33, 34, 35, 36] }, "meters", { cls: "q-fx", name: "Efectos", hint: "Toca el nombre para encender o apagar", toggles: true })}
    ${box(T(17), "q-arp")}${box(T(28), "q-tr")}${box(T(0, 1), "q-tempo")}${box(T(-1), "q-panic")}
    ${box(T(23), "q-s")}${box(T(49), "q-s")}${box(T(27), "q-s")}${box(T(37), "q-s")}${box(T(38), "q-s")}${box(T(78), "q-s")}
  </div>`;
}

/* ---- painting: a value changed; what shows it redraws (a fader a finger holds only moves) */
let bdrag = null;
function paintCards(s, id) {
  const key = keyOf(s, id);
  document.querySelectorAll("#edit .gr[data-gr]").forEach((gr) => {
    const ids = gr.dataset.ids.split(",").map(Number);
    if (+gr.dataset.s !== s || !ids.includes(id)) return;
    if (gr.dataset.gr === "meters" || gr.dataset.gr === "arcs") {
      gr.querySelectorAll(gr.dataset.gr === "meters" ? ".mt" : ".arc").forEach((el) => {
        const kk = gr.dataset.gr === "meters" ? el.dataset.mt : el.dataset.k;
        if (kk !== key) return;
        const d = desc(s, id), f = frac(d, val(s, id));
        if (gr.dataset.gr === "meters") { const z = zeroOf(d); el.style.setProperty("--lo", Math.min(f, z)); el.style.setProperty("--hi", Math.max(f, z)); el.style.setProperty("--f", f); el.querySelector(".mv").innerHTML = valHtml(d, val(s, id)); const q = gr.dataset.toggles && QSPEC.get(kk); if (q) { el.classList.toggle("off", !qOn(q)); el.querySelector(".ml").setAttribute("aria-checked", qOn(q)); } }
        else { const tmp = document.createElement("div"); tmp.innerHTML = gArcs(s, ids.map((x) => (x === id ? x : 127))); const nn = tmp.querySelector(".arc"); el.querySelector("svg").replaceWith(nn.querySelector("svg")); el.querySelector(".av").innerHTML = nn.querySelector(".av").innerHTML; }
      });
    } else gr.innerHTML = graphHtml(gr.dataset.gr, s, ids);
  });
  document.querySelectorAll(`#edit [data-cell="${key}"]`).forEach((el) => {
    const d = desc(s, id), v = val(s, id);
    if (el.dataset.fd) {                                   /* a fader: in place, so a finger on it keeps it */
      const f = frac(d, v), z = zeroOf(d);
      el.style.setProperty("--lo", Math.min(f, z)); el.style.setProperty("--hi", Math.max(f, z)); el.style.setProperty("--f", f);
      el.querySelector(el.classList.contains("ro") ? ".rv" : ".tv").innerHTML = valHtml(d, v); el.setAttribute("aria-valuenow", v);
    } else el.outerHTML = el.classList.contains("ro") ? readout(s, id, +el.dataset.ro) : tileP(s, id, +el.dataset.kk, el.dataset.title, el.dataset.tag === "1");
  });
}

/* ---- touch. Faders and readouts slide sideways from where they are (a vertical swipe still scrolls the page); the
   graphs' handles, the meters and the dials take the finger outright */
$("edit").addEventListener("pointerdown", (e) => {
  const hd = e.target.closest(".hd"), gr = e.target.closest(".gr[data-gr]"), mtr = e.target.closest(".mtr[data-k]"), arc = e.target.closest(".arc[data-k]"), fd = e.target.closest("[data-fd]");
  if (hd || (gr && (gr.dataset.gr === "filt" || gr.dataset.gr === "lfo") && !fd)) {
    const g = (hd || gr).closest(".gr");
    bdrag = { el: g, kind: g.dataset.gr, h: hd ? hd.dataset.h : g.dataset.gr === "filt" ? "f" : "l", s: +g.dataset.s, ids: g.dataset.ids.split(",").map(Number), x0: e.clientX, v0: null, on: true };
    if (bdrag.h === "l") { const k = phsOf(bdrag.s, bdrag.ids); if (k < 0) { bdrag = null; return; } bdrag.v0 = val(bdrag.s, bdrag.ids[k]); }
    g.setPointerCapture(e.pointerId); g.classList.add("held"); e.preventDefault(); graphDrag(e); return;
  }
  const el = mtr || arc || fd; if (!el) return;
  const [s, id] = (el.dataset.k || el.dataset.fd).split(":").map(Number), d = desc(s, id); if (!d) return;
  bdrag = { el, dir: mtr ? "abs" : arc ? "v" : "h", s, id, d, x0: e.clientX, y0: e.clientY, v0: val(s, id), on: !fd, pid: e.pointerId };
  if (!fd) { el.setPointerCapture(e.pointerId); e.preventDefault(); }
});
/* fine: the finger held still a moment while dragging, the moves count a quarter from there (a badge says so) */
function fineArm(raw, eff) {
  clearTimeout(bdrag.ft);
  bdrag.ft = setTimeout(() => { if (!bdrag || bdrag.fine || !(bdrag.kind || bdrag.on)) return;
    bdrag.fine = { ax: raw.x, ay: raw.y, ex: eff.clientX, ey: eff.clientY }; bdrag.el.classList.add("fine"); document.body.classList.add("finemode"); }, 380);
}
function effPt(e) {
  const f = bdrag.fine; if (!f) return { clientX: e.clientX, clientY: e.clientY };
  return { clientX: f.ex + (e.clientX - f.ax) * 0.25, clientY: f.ey + (e.clientY - f.ay) * 0.25 };
}
$("edit").addEventListener("pointermove", (ev) => {
  if (!bdrag) return;
  const e = effPt(ev); fineArm({ x: ev.clientX, y: ev.clientY }, e);
  if (bdrag.kind) { graphDrag(e); return; }
  const dx = e.clientX - bdrag.x0, dy = bdrag.y0 - e.clientY;
  if (!bdrag.on) {                                       /* a fader: it is a slide once it goes sideways */
    if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
    bdrag.on = true; bdrag.x0 = e.clientX; bdrag.el.classList.add("held");
    try { bdrag.el.setPointerCapture(bdrag.pid); } catch (er) { /* (gone) */ }
    return;
  }
  const span = bdrag.d.max - bdrag.d.min;
  if (bdrag.dir === "abs") { if (!bdrag.armed) { if (Math.abs(dy) < 6) return; bdrag.armed = true; bdrag.el.classList.add("held"); } barAt(e); }
  else if (bdrag.dir === "v") setVal(bdrag.s, bdrag.id, bdrag.v0 + dy * span / 220);
  else setVal(bdrag.s, bdrag.id, bdrag.v0 + dx * span / Math.max(220, bdrag.el.getBoundingClientRect().width * 1.4));
});
const bend = () => { if (bdrag && bdrag.el) { bdrag.el.classList.remove("held", "fine"); clearTimeout(bdrag.ft); } document.body.classList.remove("finemode"); bdrag = null; };
$("edit").addEventListener("pointerup", bend); $("edit").addEventListener("pointercancel", bend);
function barAt(e) {
  const r = bdrag.el.getBoundingClientRect(), d = bdrag.d;
  setVal(bdrag.s, bdrag.id, d.min + Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)) * (d.max - d.min));
}
function graphDrag(e) {
  const r = (bdrag.el.querySelector(".gin") || bdrag.el).getBoundingClientRect(), x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * GW, y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * GH;
  const s = bdrag.s, ids = bdrag.ids, put = (k, f) => { const id = ids[k], d = id < 127 && desc(s, id); if (d) setVal(s, id, d.min + Math.max(0, Math.min(1, f)) * (d.max - d.min)); };
  const sus = (yy) => (90 - yy) / 82;
  if (bdrag.h === "f") put(0, x / GW);
  else if (bdrag.h === "l") { const k = phsOf(s, ids); if (k >= 0) setVal(s, ids[k], ((Math.round(bdrag.v0 - (e.clientX - bdrag.x0) / (r.width / 2) * 128) % 128) + 128) % 128); }
  else if (bdrag.h === "a") put(0, (x - 10) / 50);
  else if (bdrag.h === "d") { const x1 = 10 + raw(s, ids[0]) * 50 / 127; put(1, (x - x1 - 6) / 50); put(2, sus(y)); }
  else if (bdrag.h === "s") put(2, sus(y));
  else if (bdrag.h === "r") put(3, (232 - x - 6) / 60);
}
$("edit").addEventListener("click", (e) => {
  const b = e.target.closest("[data-set]"); if (!b) return;
  const [s, id] = b.dataset.set.split(":").map(Number);
  setVal(s, id, +b.dataset.v);
});
$("edit").addEventListener("keydown", (e) => {
  const el = e.target.closest("[data-fd]"), st = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 8, PageDown: -8 }[e.key];
  if (!el || !st) return; e.preventDefault();
  const [s, id] = el.dataset.fd.split(":").map(Number); setVal(s, id, val(s, id) + st);
});
