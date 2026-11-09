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
function gMeters(s, ids, toggles) {
  return live(ids).map(({ id, k }) => { const d = desc(s, id); if (!d) return ""; const f = frac(d, val(s, id)), z = zeroOf(d), [t, u] = fmtValue(d, val(s, id));
    const q = toggles && QSPEC.get(keyOf(s, id)), off = q && !qOn(q);
    return `<div class="mt${off ? " off" : ""}" style="--c:${KC[k]};--lo:${Math.min(f, z)};--hi:${Math.max(f, z)};--f:${f}" data-mt="${keyOf(s, id)}"><span class="mv num">${esc(t)}<small>${esc(u)}</small></span>
      <div class="mtr${z ? " bi" : ""}" data-drag="v" data-k="${keyOf(s, id)}"><i></i><b></b><s></s></div>
      ${q ? `<button class="ml" data-qtog="${keyOf(s, id)}" role="switch" aria-checked="${!off}">${esc(q.name)}</button>` : `<span class="ml">${esc(d.label)}</span>`}</div>`; }).join("");
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
  if (isOnOff(d)) { const on = v !== d.min;
    return `<button class="tp t-sw${on ? " on" : ""}${lv}" ${at} role="switch" aria-checked="${on}" data-set="${key}" data-v="${on ? d.min : d.max}" aria-label="${esc(d.label)}">${top}<span class="tv num">${valHtml(d, v)}</span><span class="knob" aria-hidden="true"></span></button>`; }
  const opts = () => d.names.map((n, i) => `<button role="radio" aria-checked="${i + d.min === v}" data-set="${key}" data-v="${i + d.min}">${esc(n)}</button>`).join("");
  if (isEnum(d) && d.names.length <= 2) return `<div class="tp t-two${lv}" ${at}>${top}<div class="opts" role="radiogroup" aria-label="${esc(d.label)}">${opts()}</div></div>`;
  if (isEnum(d) && d.names.length <= 4) return `<div class="tp t-seg${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span><div class="opts" role="radiogroup" aria-label="${esc(d.label)}">${opts()}</div></div>`;
  if (isEnum(d)) return `<div class="tp t-arr${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span><span class="pos num">${v - d.min + 1}/${d.max - d.min + 1}</span>
    <div class="arw"><button data-set="${key}" data-v="${v <= d.min ? d.max : v - 1}" aria-label="${esc(d.label)}: anterior"><svg class="i"><use href="#i-prev"/></svg></button><button data-set="${key}" data-v="${nextOf(d, v)}" aria-label="${esc(d.label)}: siguiente"><svg class="i"><use href="#i-next"/></svg></button></div></div>`;
  if (d.max <= d.min) return `<div class="tp${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span></div>`;   /* (a reading: CPU) */
  return `<div class="tp t-fd${zeroOf(d) ? " t-bi" : ""}${lv}" ${at} data-fd="${key}" role="slider" tabindex="0" aria-label="${esc(d.label)}" aria-valuenow="${v}" aria-valuemin="${d.min}" aria-valuemax="${d.max}">${top}<span class="tv num">${valHtml(d, v)}</span><span class="fl" aria-hidden="true"></span></div>`;
}

/* ---- a module: a page's graph, large, and its readouts */
function devLive(folder, title) { return M.page && !M.page.home && FAM[M.page.fam] === folder && M.page.title === title; }
function module(p, kind, opt = {}) {
  const lv = p.folder === "HOME" ? !!(M.page && M.page.home) : devLive(p.folder, p.title);
  const ro = kind === "meters" || kind === "arcs" ? "" : `<div class="ros">${GUSE[kind].filter((k) => p.ids[k] < 127).map((k) => readout(p.s, p.ids[k], k)).join("")}</div>`;
  return `<section class="bx g-${kind}${lv ? " dev" : ""}${opt.cls ? " " + opt.cls : ""}" data-title="${esc(p.title)}" data-g="${kind}">
    ${opt.bare && !lv ? "" : `<header>${opt.bare ? "<span></span>" : `<h3><svg class="i"><use href="#i-${ICON[p.folder] || "edit"}"/></svg>${esc(opt.name || p.title)}</h3>`}${lv ? `<span class="live2">En el sinte</span>` : opt.hint ? `<span class="hint2">${esc(opt.hint)}</span>` : ""}</header>`}
    <div class="gr" data-gr="${kind}" data-s="${p.s}" data-ids="${p.ids.join(",")}"${opt.toggles ? ' data-toggles="1"' : ""}>${graphHtml(kind, p.s, p.ids, opt)}</div>${ro}</section>`;
}
function pagesOf(folder) {
  if (folder === "HOME") return [{ title: "HOME", folder: "HOME", s: 0, ids: M.homeIds }, ...["ENV", "FILTER", "LFO", "FX", "MACROS"].map((t) => { const x = LAYOUT.find((y) => y.title === t); return { title: t, folder: x.folder, s: x.scope, ids: x.ids }; })];
  return LAYOUT.filter((x) => x.folder === folder).map((x) => ({ title: x.title, folder, s: x.scope, ids: x.ids }));
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
  const mods = [], tiles = [], away = ps.filter(isAway).map((p) => p.title), many = ps.filter((p) => !isAway(p)).length > 1;
  ps.filter((p) => !isAway(p)).forEach((p) => {
    const kind = GRAPH[p.title], used = kind ? GUSE[kind] : [];
    if (kind) mods.push(module(p, kind, { bare: p.title === ps[0].title }));
    live(p.ids).filter(({ k }) => !used.includes(k)).forEach(({ id, k }) => tiles.push(tileP(p.s, id, k, p.title, many)));
  });
  if (away.length) tiles.push(`<section class="tp away"><span class="tt"><span class="tlb">${esc(away.join(", "))}</span></span><p>${away.length > 1 ? "Se editan" : "Se edita"} en el sinte o en Estudio.</p>
    <a class="go2" href="${STUDIO_URL}">Abrir Estudio<svg class="i"><use href="#i-next"/></svg></a></section>`);
  const lay = mods.length && tiles.length ? "side" : mods.length ? "solo" : "flat";
  return `<section class="blk" data-blk="${esc(ps[0].title)}"><header class="bh"><h2><svg class="i"><use href="#i-${ICON[ps[0].folder] || "edit"}"/></svg>${esc(ps[0].title)}</h2></header>
    <div class="bb ${lay}">${mods.join("")}${tiles.length ? `<div class="tz${tiles.length === 1 ? " one" : ""}">${tiles.join("")}</div>` : ""}</div></section>`;
}
function bentoView(folder) {
  const pages = pagesOf(folder);
  if (folder === "SEQ") return `<div class="blks">${seqBlock()}${blocksOf(folder, pages.filter((p) => p.title !== "NOTES")).map(block).join("")}</div>`;   /* (NOTES: seq.js) */
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
  return `<div class="qhead"><h2>Rápido</h2><button class="more" data-mode-go="edit">Editar más<svg class="i"><use href="#i-next"/></svg></button></div>
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
  if (!fd) { el.setPointerCapture(e.pointerId); e.preventDefault(); if (mtr) barAt(e); }
});
$("edit").addEventListener("pointermove", (e) => {
  if (!bdrag) return;
  if (bdrag.kind) { graphDrag(e); return; }
  const dx = e.clientX - bdrag.x0, dy = bdrag.y0 - e.clientY;
  if (!bdrag.on) {                                       /* a fader: it is a slide once it goes sideways */
    if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
    bdrag.on = true; bdrag.x0 = e.clientX; bdrag.el.classList.add("held");
    try { bdrag.el.setPointerCapture(bdrag.pid); } catch (er) { /* (gone) */ }
    return;
  }
  const span = bdrag.d.max - bdrag.d.min;
  if (bdrag.dir === "abs") barAt(e);
  else if (bdrag.dir === "v") setVal(bdrag.s, bdrag.id, bdrag.v0 + dy * span / 220);
  else setVal(bdrag.s, bdrag.id, bdrag.v0 + dx * span / Math.max(220, bdrag.el.getBoundingClientRect().width * 1.4));
});
const bend = () => { if (bdrag && bdrag.el) bdrag.el.classList.remove("held"); bdrag = null; };
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
