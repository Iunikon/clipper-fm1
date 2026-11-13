/* ---- HYBRID: the sound's whole patch (editor_hybrid.c: HY_GET [0, part] / [1, factory], HY_PUT [0, part, 128 bytes
   packed]; the layout of editor.html HY). The device shows eight values of it; here every oscillator, filter, envelope,
   LFO and matrix slot, as scope 4: the same tiles, drag, double tap and lists as the device's pages. Each change goes
   to the FM-1 (at most every 80 ms) and stays the sound's patch until PTCH turns or another sound loads. */
const HY = (() => {
  const OSC = ["OFF", "SAW", "PULSE", "TRI", "SINE", "MORPH", "SUPER", "FM", "SYNC", "FOLD", "NOISE"];
  const FLT = ["OFF", "LP12", "LP24", "BP", "HP", "NOTCH", "PEAK", "MOOG"];
  const ROUTE = ["SER", "PAR", "SPLIT"];
  const LFOW = ["SINE", "TRI", "SAW", "SQR", "S&H", "SMTH"];
  const SRC = ["--", "ENV2", "ENV3", "AENV", "LFO1", "LFO2", "LFO3", "VEL", "KEY", "MW", "AT", "BEND", "EXPR", "RAND", "M1", "M2", "M3", "M4", "ONE"];
  const DST = ["--", "PITCH", "P1", "P2", "P3", "SHP1", "SHP2", "SHP3", "LVL1", "LVL2", "LVL3", "RING", "CUT", "CUT1", "CUT2", "RES1", "RES2", "DRIVE", "AMP", "LFO2", "LFO3", "FBAL"];
  const SHAPE = ["", "", "WIDTH", "", "FDBK", "MORPH", "DETUNE", "FM", "SYNC", "FOLD", "DARK"];   /* (what SHAPE does on each type: eng_hybrid.c) */
  const SYNC = ["1/32", "1/16T", "1/16", "1/8T", "1/8", "1/4T", "1/4", "1/2T", "1/2", "1/2.", "1 bar", "1.5 bars", "2 bars", "4 bars", "8 bars"];
  const SIZE = 128, NSLOT = 16;
  const s8 = (x) => (x > 127 ? x - 256 : x), cl = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(+v || 0)));
  const pick = (v, names) => (v < names.length ? cl(v, 0, names.length - 1) : 0);
  function unpack(b) {
    const o = { osc: [], flt: [], lfo: [], mod: [] };
    for (let k = 0; k < 3; k++) { const i = k * 6; o.osc.push({ type: b[i], coarse: s8(b[i + 1]), fine: s8(b[i + 2]), level: b[i + 3], shape: b[i + 4], reset: !!(b[i + 5] & 1), fixed: !!(b[i + 5] & 2) }); }
    [o.ring, o.drift, o.drive, o.route, o.fbal] = [b[18], b[19], b[20], b[21], b[22]];
    for (let k = 0; k < 2; k++) { const i = 23 + k * 6; o.flt.push({ type: b[i], cut: b[i + 1], res: b[i + 2], env: s8(b[i + 3]), key: s8(b[i + 4]), vel: b[i + 5] }); }
    o.env2 = Array.from(b.slice(35, 39)); o.env3 = Array.from(b.slice(39, 43));
    for (let k = 0; k < 2; k++) { const i = 43 + k * 4; o.lfo.push({ wave: b[i], rate: b[i + 1], key: !!(b[i + 2] & 1), sync: !!(b[i + 2] & 2), fade: b[i + 3] }); }
    for (let k = 0; k < NSLOT; k++) { const i = 51 + k * 4; o.mod.push({ src: b[i], via: b[i + 1], dst: b[i + 2], amt: s8(b[i + 3]) }); }
    o.bend = b[115]; o.level = b[116];
    o.name = String.fromCharCode(...Array.from(b.slice(118, 128)).filter((c) => c >= 32 && c <= 126)).trimEnd();
    return sanitize(o);
  }
  function sanitize(o) {
    const n = { osc: [], flt: [], lfo: [], mod: [] };
    for (let k = 0; k < 3; k++) { const x = (o.osc && o.osc[k]) || {};
      n.osc.push({ type: pick(x.type, OSC), coarse: cl(x.coarse, -48, 48), fine: cl(x.fine, -64, 63), level: cl(x.level, 0, 127), shape: cl(x.shape, 0, 127), reset: !!x.reset, fixed: !!x.fixed }); }
    n.ring = cl(o.ring, 0, 127); n.drift = cl(o.drift, 0, 127); n.drive = cl(o.drive, 0, 127); n.route = pick(o.route, ROUTE); n.fbal = cl(o.fbal, 0, 127);
    for (let k = 0; k < 2; k++) { const x = (o.flt && o.flt[k]) || {};
      n.flt.push({ type: pick(x.type, FLT), cut: cl(x.cut, 0, 127), res: cl(x.res, 0, 127), env: cl(x.env, -64, 63), key: cl(x.key, -64, 63), vel: cl(x.vel, 0, 127) }); }
    n.env2 = [0, 1, 2, 3].map((i) => cl((o.env2 || [])[i], 0, 127)); n.env3 = [0, 1, 2, 3].map((i) => cl((o.env3 || [])[i], 0, 127));
    for (let k = 0; k < 2; k++) { const x = (o.lfo && o.lfo[k]) || {}; n.lfo.push({ wave: pick(x.wave, LFOW), rate: cl(x.rate, 0, 127), key: !!x.key, sync: !!x.sync, fade: cl(x.fade, 0, 127) }); }
    for (let k = 0; k < NSLOT; k++) { const x = (o.mod && o.mod[k]) || {}; n.mod.push({ src: pick(x.src, SRC), via: pick(x.via, SRC), dst: pick(x.dst, DST), amt: cl(x.amt, -64, 63) }); }
    n.bend = cl(o.bend, 0, 24); n.level = cl(o.level, 0, 127);
    n.name = String(o.name || "").replace(/[^\x20-\x7E]/g, " ").slice(0, 10).toUpperCase();
    return n;
  }
  function pack(o) {
    const x = sanitize(o), b = new Uint8Array(SIZE);
    x.osc.forEach((v, k) => b.set([v.type, v.coarse & 255, v.fine & 255, v.level, v.shape, (v.reset ? 1 : 0) | (v.fixed ? 2 : 0)], k * 6));
    b.set([x.ring, x.drift, x.drive, x.route, x.fbal], 18);
    x.flt.forEach((v, k) => b.set([v.type, v.cut, v.res, v.env & 255, v.key & 255, v.vel], 23 + k * 6));
    b.set(x.env2, 35); b.set(x.env3, 39);
    x.lfo.forEach((v, k) => b.set([v.wave, v.rate, (v.key ? 1 : 0) | (v.sync ? 2 : 0), v.fade], 43 + k * 4));
    x.mod.forEach((v, k) => b.set([v.src, v.via, v.dst, v.amt & 255], 51 + k * 4));
    b[115] = x.bend; b[116] = x.level;
    for (let i = 0; i < 10; i++) b[118 + i] = i < x.name.length ? x.name.charCodeAt(i) : 0;   /* (C: NUL-padded) */
    return b;
  }
  const init = () => sanitize({ osc: [{ type: 1, level: 127 }, {}, {}], flt: [{ type: 1, cut: 100 }, {}], env2: [0, 64, 64, 64], env3: [0, 64, 64, 64],
    lfo: [{ rate: 60 }, { rate: 60 }], bend: 2, level: 100, name: "INIT" });
  const lfoHz = (v) => 0.05 * Math.pow(800, v / 127);
  const rateText = (l) => (l.sync ? [SYNC[Math.floor(l.rate * SYNC.length / 128)], ""] : [lfoHz(l.rate).toFixed(2), "Hz"]);
  return { OSC, FLT, ROUTE, LFOW, SRC, DST, SHAPE, SIZE, NSLOT, unpack, pack, sanitize, init, rateText };
})();
const HYV = { v: null, orig: null, key: "", busy: false, err: "", t: 0, all: false };
const hyOn = () => !!M.info && M.info.engines[M.engine] === "HYBRID";
const hyKey = () => `${M.engine}:${M.preset}:${M.p[M.info.pe0 + 3]}`;   /* (PTCH turned or another sound: another patch) */
const HYD = [];                                 /* scope 4's ids: each a field of the patch, with its get and set */
function hyF(label, get, set, min, max, o = {}) {
  HYD.push({ id: HYD.length, label, get, set, min, max, fmt: o.names ? F.ENUM : o.fmt ?? F.INT, names: o.names || [], unit: o.unit || "", txt: o.txt, re: !!o.re });
  return HYD.length - 1;
}
const hySign = (v) => [v > 0 ? "+" + v : String(v), ""];
const HYG = (() => {                            /* the pages: [title, ids] */
  const g = [], OO = ["OFF", "ON"], b = (x) => (x ? 1 : 0);
  for (let k = 0; k < 3; k++) {
    const o = (v) => v.osc[k];
    g.push([`OSC ${k + 1}`, [hyF("TYPE", (v) => o(v).type, (v, x) => { o(v).type = x; }, 0, HY.OSC.length - 1, { names: HY.OSC, re: true }),
      hyF("COARSE", (v) => o(v).coarse, (v, x) => { o(v).coarse = x; }, -48, 48, { fmt: F.SEMI }),
      hyF("FINE", (v) => o(v).fine, (v, x) => { o(v).fine = x; }, -64, 63, { txt: (x) => [hySign(x)[0], "ct"] }),
      hyF("LEVEL", (v) => o(v).level, (v, x) => { o(v).level = x; }, 0, 127),
      hyF("SHAPE", (v) => o(v).shape, (v, x) => { o(v).shape = x; }, 0, 127, { txt: (x) => [String(x), HY.SHAPE[HYV.v ? HYV.v.osc[k].type : 0] || ""] }),
      hyF("RESET", (v) => b(o(v).reset), (v, x) => { o(v).reset = !!x; }, 0, 1, { names: OO }),
      hyF("FIXED", (v) => b(o(v).fixed), (v, x) => { o(v).fixed = !!x; }, 0, 1, { names: OO })]]);
  }
  g.push(["MIX", [hyF("RING 1×2", (v) => v.ring, (v, x) => { v.ring = x; }, 0, 127), hyF("DRIFT", (v) => v.drift, (v, x) => { v.drift = x; }, 0, 127),
    hyF("DRIVE", (v) => v.drive, (v, x) => { v.drive = x; }, 0, 127), hyF("ROUTE", (v) => v.route, (v, x) => { v.route = x; }, 0, 2, { names: HY.ROUTE, re: true }),
    hyF("BAL F1↔F2", (v) => v.fbal, (v, x) => { v.fbal = x; }, 0, 127)]]);
  for (let k = 0; k < 2; k++) {
    const f = (v) => v.flt[k];
    g.push([`FILTER ${k + 1}`, [hyF("TYPE", (v) => f(v).type, (v, x) => { f(v).type = x; }, 0, HY.FLT.length - 1, { names: HY.FLT }),
      hyF("CUT", (v) => f(v).cut, (v, x) => { f(v).cut = x; }, 0, 127, { fmt: F.CUTOFF }), hyF("RES", (v) => f(v).res, (v, x) => { f(v).res = x; }, 0, 127),
      hyF("ENV2", (v) => f(v).env, (v, x) => { f(v).env = x; }, -64, 63, { txt: hySign }),
      hyF("KEY", (v) => f(v).key, (v, x) => { f(v).key = x; }, -64, 63, { txt: (x) => [String(Math.round(x * 100 / 64)), "%"] }),
      hyF("VEL", (v) => f(v).vel, (v, x) => { f(v).vel = x; }, 0, 127)]]);
  }
  for (const [n, e] of [["ENV2", "env2"], ["ENV3", "env3"]])
    g.push([n, ["A", "D", "S", "R"].map((l, i) => hyF(l, (v) => v[e][i], (v, x) => { v[e][i] = x; }, 0, 127, { fmt: i === 2 ? F.PCT : F.TIME }))]);
  for (let k = 0; k < 2; k++) {
    const l = (v) => v.lfo[k];
    g.push([`LFO${k + 2}`, [hyF("WAVE", (v) => l(v).wave, (v, x) => { l(v).wave = x; }, 0, HY.LFOW.length - 1, { names: HY.LFOW }),
      hyF("RATE", (v) => l(v).rate, (v, x) => { l(v).rate = x; }, 0, 127, { txt: (x) => HY.rateText({ rate: x, sync: HYV.v && HYV.v.lfo[k].sync }) }),
      hyF("KEY", (v) => b(l(v).key), (v, x) => { l(v).key = !!x; }, 0, 1, { names: OO }),
      hyF("SYNC", (v) => b(l(v).sync), (v, x) => { l(v).sync = !!x; }, 0, 1, { names: OO, re: true }),
      hyF("FADE", (v) => l(v).fade, (v, x) => { l(v).fade = x; }, 0, 127, { fmt: F.TIME })]]);
  }
  for (let k = 0; k < HY.NSLOT; k++) {
    const m = (v) => v.mod[k];
    g.push([`MOD ${k + 1}`, [hyF("SOURCE", (v) => m(v).src, (v, x) => { m(v).src = x; }, 0, HY.SRC.length - 1, { names: HY.SRC, re: true }),
      hyF("× VIA", (v) => m(v).via, (v, x) => { m(v).via = x; }, 0, HY.SRC.length - 1, { names: HY.SRC }),
      hyF("→ DEST", (v) => m(v).dst, (v, x) => { m(v).dst = x; }, 0, HY.DST.length - 1, { names: HY.DST, re: true }),
      hyF("AMOUNT", (v) => m(v).amt, (v, x) => { m(v).amt = x; }, -64, 63, { txt: hySign })]]);
  }
  g.push(["GLOBAL", [hyF("BEND", (v) => v.bend, (v, x) => { v.bend = x; }, 0, 24, { txt: (x) => ["±" + x, "st"] }), hyF("LEVEL", (v) => v.level, (v, x) => { v.level = x; }, 0, 127)]]);
  return g;
})();
const hyDesc = (id) => (HYV.v ? HYD[id] : null);
const hyVal = (id) => (HYV.v && HYD[id] ? HYD[id].get(HYV.v) : 0);
function hyTook(v) {                            /* a patch read (or loaded): it, and what a double tap goes back to */
  HYV.v = v; HYV.orig = JSON.parse(JSON.stringify(v)); HYD.forEach((d) => { d.def = d.get(HYV.orig); });
}
async function hyRead() {
  if (HYV.busy || !M.link) return;
  HYV.busy = true; HYV.err = "";
  try { const a = await rq(C.HY_GET, [0, 0], { timeout: 800 }); if (a[2]) throw new Error("el FM-1 dijo que no (" + a[2] + ")");
    hyTook(HY.unpack(unpack7(a.slice(3)).slice(0, HY.SIZE))); HYV.key = hyKey(); }
  catch (e) { HYV.err = e.message; HYV.key = hyKey(); }
  HYV.busy = false; if (S.folder === "ESTUDIO" && STU.tab === "hy") renderWork();
}
function hySend() {
  clearTimeout(HYV.t);
  HYV.t = setTimeout(() => rq(C.HY_PUT, [0, 0, ...pack7(HY.pack(HYV.v))], { key: "hy", timeout: 800 })
    .then((a) => { if (a[2]) toast(-1, "El FM-1 no aceptó el patch HYBRID"); }).catch(() => {}), 80);
}
function hySet(id, v) {
  const d = HYD[id]; if (!HYV.v || !d) return;
  d.set(HYV.v, v); hySend();
  if (d.re) renderWork(); else paintValue(4, id);
}
function hyView() {
  if (!hyOn()) return `<section class="blk"><header class="bh"><h2><svg class="i"><use href="#i-edit"/></svg>HYBRID</h2></header>
    <p class="msh">Este sonido usa ${esc(M.info ? M.info.engines[M.engine] : "")}. Carga un sonido HYBRID para editar sus osciladores, filtros y matriz aquí.</p></section>`;
  if (HYV.key !== hyKey() && !HYV.busy) { HYV.v = null; setTimeout(hyRead, 0); }
  if (!HYV.v) return `<section class="blk"><header class="bh"><h2><svg class="i"><use href="#i-edit"/></svg>HYBRID</h2></header><p class="msh">${HYV.err ? "No pude leer el patch: " + esc(HYV.err) : "Leyendo el patch…"}</p></section>`;
  const fn = (M.pdesc[M.info.pe0 + 3] && M.pdesc[M.info.pe0 + 3].names) || [];
  const used = (k) => HYV.v.mod[k].src || HYV.v.mod[k].dst, last = HYV.v.mod.reduce((n, m, k) => (used(k) ? k : n), -1);
  const pages = HYG.filter(([t]) => { const m = /^MOD (\d+)$/.exec(t); return !m || HYV.all || +m[1] - 1 <= last + 1; });
  const row = ([title, ids]) => pageRow({ title, folder: "ESTUDIO", s: 4, ids }, null);
  const sec = (h, rows) => `${h ? `<h3 class="hyh">${h}</h3>` : ""}${rows.map(row).join("")}`;
  const by = (re) => pages.filter(([t]) => re.test(t));
  return `<section class="blk hyb"><header class="bh"><h2><svg class="i"><use href="#i-edit"/></svg>HYBRID</h2>
      <input class="hyn" id="hyname" maxlength="10" value="${esc(HYV.v.name)}" aria-label="Nombre del patch" spellcheck="false" autocomplete="off">
      <span class="hyt">
        <select class="btn" id="hyfact" aria-label="Cargar un patch de fábrica"><option value="">Fábrica…</option>${fn.map((n, i) => `<option value="${i}">${i + 1} ${esc(n)}</option>`).join("")}</select>
        <button class="btn" data-hy="init">INIT</button><button class="btn" data-hy="read"><svg class="i"><use href="#i-undo"/></svg>Volver a leer</button>
        <button class="btn" data-hy="export"><svg class="i"><use href="#i-dl"/></svg>Exportar</button>
        <label class="btn">Importar<input type="file" accept=".json,application/json" id="hyfile" hidden></label></span></header>
    <p class="msh">Cada cambio suena ya en el FM-1. Es el patch del sonido hasta que gires PTCH o cargues otro; guárdalo con Guardar.</p>
    <div class="pgs">${sec("Osciladores", by(/^(OSC|MIX)/))}${sec("Filtros", by(/^FILTER/))}${sec("Envolventes y LFO", by(/^(ENV|LFO)/))}
      ${sec("Matriz", by(/^MOD /))}<button class="btn hyall" data-hy="all">${HYV.all ? "Solo las que se usan" : `Ver las ${HY.NSLOT}`}</button>${sec("", by(/^GLOBAL/))}</div></section>`;
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-hy]"); if (!b || !M.link) return;
  const w = b.dataset.hy;
  if (w === "all") { HYV.all = !HYV.all; renderWork(); return; }
  if (w === "read") { HYV.key = ""; renderWork(); return; }
  if (w === "init") { HYV.v = HY.init(); hySend(); renderWork(); toast(-1, "<b>INIT</b> en el FM-1"); return; }
  if (w === "export") {
    const blob = new Blob([JSON.stringify({ format: "clipper-hybrid", version: 1, patch: HY.sanitize(HYV.v) }, null, 1)], { type: "application/json" });
    const aa = document.createElement("a"), url = URL.createObjectURL(blob);
    aa.href = url; aa.download = `${(HYV.v.name || "hybrid").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.clipper.json`; document.body.append(aa); aa.click(); aa.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
});
document.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.id === "hyname" && HYV.v) { HYV.v.name = HY.sanitize({ ...HYV.v, name: t.value }).name; t.value = HYV.v.name; hySend(); return; }
  if (t.id === "hyfact" && t.value !== "") {
    const i = +t.value;
    try { const a = await rq(C.HY_GET, [1, i], { timeout: 800 }); if (a[2]) throw new Error(String(a[2]));
      HYV.v = HY.unpack(unpack7(a.slice(3)).slice(0, HY.SIZE)); hySend(); renderWork(); toast(-1, `<b>${esc(HYV.v.name)}</b> en el FM-1`); }
    catch (er) { toast(-1, "No pude leer ese patch de fábrica"); }
    return;
  }
  if (t.id === "hyfile" && t.files[0]) {
    try { const j = JSON.parse(await t.files[0].text()); if (!j || j.format !== "clipper-hybrid" || !j.patch) throw new Error("format");
      HYV.v = HY.sanitize(j.patch); hySend(); renderWork(); toast(-1, `<b>${esc(HYV.v.name)}</b> importado`); }
    catch (er) { toast(-1, "Ese archivo no es un patch HYBRID"); }
    t.value = "";
  }
});

