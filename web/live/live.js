"use strict";
/* Clipper Live: the tablet beside the FM-1. Talks to it over Web MIDI with the editor's protocol (v15: PAGE, FAVS,
   LIST; web/EDITOR_PROTOCOL.md), or to a mock with the device's own descriptors (?mock=1, data from tools/live_dump.py).
   One request in flight at a time (Link, as the editor's); the device pushes CHANGED / RELOAD / PAGE / FAVS_CHANGED. */

/* ------------------------------------------------------------------ basics --- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const KC = ["var(--k1)", "var(--k2)", "var(--k3)", "var(--k4)"], KH = ["#287cff", "#1ecc70", "#ffc618", "#ff621a"];
const STUDIO_URL = "clipper-editor-1.3.1.html";      /* the classic editor, next to this file in the tablet's downloads */
const QS = new URLSearchParams(location.search);
const store = { get(k) { try { return JSON.parse(localStorage.getItem("clipperlive:" + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem("clipperlive:" + k, JSON.stringify(v)); } catch (e) { /* private mode: no cache */ } } };

/* formats, as editor.html fmtValue (firmware params.c F_*) */
const F = { INT: 0, PCT: 1, BIPCT: 2, TIME: 3, LFOHZ: 4, CUTOFF: 5, DB: 6, SEMI: 7, ENUM: 8, BPM: 9, NOTE: 10, ONOFF: 11, OCT: 12, STEPS: 13,
  SWING: 14, FILT: 15, CDB: 16, SPLIT: 17 };
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
function fmtValue(d, v) {
  const sign = (x) => (x > 0 ? "+" + x : String(x));
  switch (d.fmt) {
    case F.PCT: return [String(d.max > 0 ? Math.trunc((v * 100 + Math.trunc(d.max / 2)) / d.max) : v), "%"];
    case F.SWING: return [String(Math.max(0, Math.min(100, v))), ""];
    case F.CDB: return [sign(v - Math.trunc((d.min + d.max) / 2)), "dB"];
    case F.SPLIT: { const n = Math.max(0, v - 4); return [NOTE_NAMES[n % 12] + (Math.trunc(n / 12) - 1), ""]; }
    case F.FILT: return !v ? ["OFF", ""] : v < 0 ? ["LP" + Math.trunc((-v * 100 + 32) / 64), "%"] : ["HP" + Math.trunc((v * 100 + 31) / 63), "%"];
    case F.BIPCT: return [sign(Math.trunc(v * 100 / 64)), "%"];
    case F.TIME: {
      const ms10 = Math.round(10 * Math.pow(10000, (v & 127) / 127));
      if (ms10 < 100) return [(ms10 / 10).toFixed(1), "ms"];
      if (ms10 < 10000) return [String(Math.round(ms10 / 10)), "ms"];
      return [(ms10 / 10000).toFixed(2), "s"];
    }
    case F.LFOHZ: { const h = 0.05 * Math.pow(800, (v & 127) / 127); return [h < 10 ? h.toFixed(2) : h.toFixed(1), "Hz"]; }
    case F.CUTOFF: { const h = 30 * Math.pow(16000 / 30, (v & 127) / 127); return h < 1000 ? [String(Math.round(h)), "Hz"] : [(h / 1000).toFixed(1), "kHz"]; }
    case F.DB: return v <= 0 ? ["OFF", ""] : [((v - 112) / 2).toFixed(1), "dB"];
    case F.SEMI: return [sign(v), "st"];
    case F.ENUM: return [d.names[v - d.min] ?? String(v), d.unit || ""];
    case F.BPM: return [String(v), "BPM"];
    case F.NOTE: return [NOTE_NAMES[((v % 12) + 12) % 12], ""];
    case F.ONOFF: return [v ? "ON" : "OFF", ""];
    case F.STEPS: return [String(v), "STEP"];
    default: return [d.names && d.names[v - d.min] != null ? d.names[v - d.min] : String(v), d.unit || ""];
  }
}

/* ---------------------------------------------------------------- protocol --- */
const HDR = [0x7D, 0x46, 0x4C];
const C = { INFO: 1, GET: 2, SET: 3, DUMP: 4, DESC: 5, WATCH: 22, CHANGED: 23, RELOAD: 24, PING: 25, STEP_CHANGED: 26, TRACK_CHANGED: 32,
  PAGE: 97, FAVS: 98, FAV_GO: 99, FAV_SET: 100, FAVS_CHANGED: 101, LIST: 102, LIST_GO: 103 };
const PUSH = new Set([C.CHANGED, C.RELOAD, C.STEP_CHANGED, C.TRACK_CHANGED, C.FAVS_CHANGED]);
const v14 = (v) => { const u = Math.max(-8192, Math.min(8191, Math.round(v))) + 8192; return [u & 127, (u >> 7) & 127]; };
const u14 = (n) => [n & 127, (n >> 7) & 127];
const frame = (cmd, args) => [0xF0, ...HDR, cmd & 127, ...args, 0xF7];
function unframe(d) {
  if (!d || d.length < 6 || d[0] !== 0xF0 || d[d.length - 1] !== 0xF7 || d[1] !== HDR[0] || d[2] !== HDR[1] || d[3] !== HDR[2]) return null;
  return { cmd: d[4], a: Array.from(d.slice(5, d.length - 1)) };
}
class Reader {
  constructor(a) { this.a = a; this.i = 0; }
  b() { if (this.i >= this.a.length) throw new Error("short reply"); return this.a[this.i++]; }
  v() { const lo = this.b(); return (lo | (this.b() << 7)) - 8192; }
  u() { const lo = this.b(); return lo | (this.b() << 7); }
  s() { let s = ""; for (;;) { const c = this.b(); if (!c) return s; s += String.fromCharCode(c); } }
  get more() { return this.i < this.a.length; }
}
const P = {
  info(a) { const r = new Reader(a), o = { version: r.s(), nengines: r.b(), pcount: r.b(), gcount: r.b(), nstep: r.b(), pe0: r.b(), engines: [] };
    for (let i = 0; i < o.nengines; i++) o.engines.push(r.s()); o.ntrk = r.more ? r.b() : 0; o.proto = r.more ? r.b() : 0; return o; },
  desc(a) { const r = new Reader(a), o = { scope: r.b(), id: r.b(), fmt: r.b(), min: r.v(), max: r.v(), def: r.v(), label: r.s(), unit: r.s(), names: [] };
    if (o.fmt === F.ENUM) for (let i = 0; i <= o.max - o.min && i < 64 && r.more; i++) o.names.push(r.s()); return o; },
  dump(a, info) { const r = new Reader(a), o = { engine: r.b(), preset: r.b(), p: [], g: [] };
    for (let i = 0; i < info.pcount; i++) o.p.push(r.v()); for (let i = 0; i < info.gcount; i++) o.g.push(r.v()); return o; },
  set(a) { const r = new Reader(a); return { scope: r.b(), id: r.b(), value: r.v() }; },
  page(a) { const r = new Reader(a), o = { home: r.b(), fam: r.b(), page: r.b(), title: r.s(), scope: r.b(), ids: [r.b(), r.b(), r.b(), r.b()] };
    o.homeIds = r.more ? [r.b(), r.b(), r.b(), r.b()] : null; return o; },
  entry(r) { return { e: r.b(), k: r.b(), kind: r.s(), name: r.s() }; },
  favs(a) { const r = new Reader(a), n = r.b(), cur = r.b(), list = []; for (let i = 0; i < n; i++) list.push(P.entry(r)); return { cur: cur === 127 ? -1 : cur, list }; },
  list(a) { const r = new Reader(a), total = r.u(), start = r.u(), n = r.b(), items = []; for (let i = 0; i < n; i++) items.push(P.entry(r)); return { total, start, items }; },
};

/* strict request / response, one frame in flight (as editor.html's Link). PAGE is a reply when asked for, else a push */
class Link {
  constructor(send, opt = {}) { this.send = send; this.q = []; this.cur = null; this.closed = false; this.lastSent = 0;
    this.onPush = opt.onPush || (() => {}); this.onGap = opt.onGap || (() => {}); this.onTimeout = opt.onTimeout || (() => {}); }
  get idle() { return !this.cur && !this.q.length; }
  request([cmd, args], opt = {}) {
    if (this.closed) return Promise.reject(new Error("closed"));
    if (opt.key) { const old = this.q.find((x) => x.key === opt.key); if (old) { old.cmd = cmd; old.args = args; return old.promise; } }
    let res, rej; const promise = new Promise((a, b) => { res = a; rej = b; });
    this.q.push({ cmd, args, key: opt.key, res, rej, promise, timeout: opt.timeout || 400, retries: opt.retries ?? 1, quiet: !!opt.quiet });
    this.pump(); return promise;
  }
  pump() { if (this.cur || this.closed || !this.q.length) return; this.cur = this.q.shift(); this.fire(); }
  fire() {
    const c = this.cur, now = Date.now();
    if (this.lastSent && now - this.lastSent > 2500) this.onGap();
    this.lastSent = now;
    try { this.send(frame(c.cmd, c.args)); } catch (e) { this.finish(null, e); return; }
    c.timer = setTimeout(() => { if (this.cur !== c) return; if (c.retries-- > 0) { this.fire(); return; } if (!c.quiet) this.onTimeout(c.cmd); this.finish(null, new Error("timeout " + c.cmd)); }, c.timeout);
  }
  finish(v, err) { const c = this.cur; if (!c) return; clearTimeout(c.timer); this.cur = null; err ? c.rej(err) : c.res(v); this.pump(); }
  receive(data) {
    const f = unframe(data); if (!f) return;
    const c = this.cur;
    if (c && f.cmd === c.cmd) { this.finish(f.a); return; }
    if (PUSH.has(f.cmd) || f.cmd === C.PAGE) this.onPush(f);
  }
  close() { this.closed = true; const all = (this.cur ? [this.cur] : []).concat(this.q); if (this.cur) clearTimeout(this.cur.timer); this.cur = null; this.q = []; all.forEach((r) => r.rej(new Error("closed"))); }
}

/* ---------------------------------------------------------- the mock FM-1 --- */
/* The device's own data (tools/live_dump.py over the real firmware); answers frames as editor.c would, and now and then
   does what a player would on the FM-1: opens a page, turns a knob */
function makeMock(onFrame) {
  const D = JSON.parse($("mockdata").textContent), info = D.info, pe0 = info.pe0;
  const m = { p: D.dump.p.slice(), g: D.dump.g.slice(), engine: D.dump.engine, preset: D.dump.preset, n: 0, favs: [0, 6, 64, 120, 200, 290],
    page: { home: 1, fam: 0, page: 0, title: "HOME", scope: 0, ids: [] }, watch: false };
  const enc = { s: (t) => [...[...t].map((c) => c.charCodeAt(0) & 127), 0], entry: (n) => { const x = D.list[n]; return [x[0], x[1], ...enc.s(x[2]), ...enc.s(x[3])]; } };
  const homeIds = () => D.homeIds[m.engine] || [127, 127, 127, 127];
  const pageArgs = () => { const ids = m.page.home ? homeIds() : m.page.ids; return [m.page.home, m.page.fam, m.page.page, ...enc.s(m.page.title), m.page.scope, ...ids, ...homeIds()]; };
  const descOf = (s, id) => (s ? D.gdesc[id] : id >= pe0 && id < pe0 + 8 && D.engineDesc[m.engine] ? D.engineDesc[m.engine][id - pe0] : D.pdesc[id]);
  const push = (cmd, a) => setTimeout(() => onFrame(frame(cmd, a)), 4);
  const load = (n) => { m.n = n; m.engine = D.list[n][0]; m.preset = D.list[n][1];
    (D.engineDesc[m.engine] || []).forEach((d, k) => { m.p[pe0 + k] = d.def; }); if (m.watch) push(C.RELOAD, [m.engine, m.preset, 0]); };
  const FAMS = { ENV: 1, LFO: 2, FX: 3, SEL: 4, EDIT: 5, GLO: 6, ARP: 8 };
  function answer(cmd, a) {
    switch (cmd) {
      case C.INFO: return [...enc.s(info.version), info.nengines, info.pcount, info.gcount, info.nstep, pe0, ...info.engines.flatMap(enc.s), info.ntrk, info.proto];
      case C.DESC: { const d = descOf(a[0], a[1]); if (!d) return null;
        return [a[0], a[1], d.fmt, ...v14(d.min), ...v14(d.max), ...v14(d.def), ...enc.s(d.label), ...enc.s(d.unit), ...(d.fmt === F.ENUM ? d.names.flatMap(enc.s) : [])]; }
      case C.DUMP: return [m.engine, m.preset, ...m.p.flatMap(v14), ...m.g.flatMap(v14)];
      case C.SET: { const v = (a[2] | (a[3] << 7)) - 8192, d = descOf(a[0], a[1]), c = d ? Math.max(d.min, Math.min(d.max, v)) : v; (a[0] ? m.g : m.p)[a[1]] = c; return [a[0], a[1], ...v14(c)]; }
      case C.WATCH: m.watch = !!(a[0] & 1); return [a[0] & 3];
      case C.PING: return [0];
      case C.PAGE: return pageArgs();
      case C.FAVS: { const cur = m.favs.indexOf(m.n); return [m.favs.length, cur < 0 ? 127 : cur, ...m.favs.flatMap(enc.entry)]; }
      case C.FAV_GO: { const ok = a[0] < m.favs.length; if (ok) load(m.favs[a[0]]); return [a[0], ok ? 0 : 1]; }
      case C.FAV_SET: { const i = m.favs.indexOf(m.n); if (a[0] & 1) { if (i < 0 && m.favs.length < 16) m.favs.push(m.n); } else if (i >= 0) m.favs.splice(i, 1); return [m.favs.length]; }
      case C.LIST: { const st = Math.min(a[0] | (a[1] << 7), D.list.length), n = Math.min(a[2] || 16, 16, D.list.length - st);
        return [...u14(D.list.length), ...u14(st), n, ...Array.from({ length: n }, (_, i) => enc.entry(st + i)).flat()]; }
      case C.LIST_GO: { const n = a[0] | (a[1] << 7), ok = n < D.list.length; if (ok) load(n); return [...u14(n), ok ? 0 : 1]; }
      default: return null;
    }
  }
  /* the player on the FM-1: a page opened, then a knob of it turned */
  setInterval(() => {
    if (!m.watch) return;
    const pages = D.pages.filter((x) => x.scope < 2 && FAMS[x.folder] && x.ids.some((i) => i < 127));
    const pg = pages[Math.floor(Math.random() * pages.length)];
    m.page = { home: 0, fam: FAMS[pg.folder], page: 0, title: pg.title, scope: pg.scope, ids: pg.ids };
    push(C.PAGE, pageArgs());
    setTimeout(() => {
      const ids = pg.ids.filter((i) => i < 127), id = ids[Math.floor(Math.random() * ids.length)], d = descOf(pg.scope, id), arr = pg.scope ? m.g : m.p;
      if (!d) return;
      const step = Math.max(1, Math.round((d.max - d.min) / 9)), v = arr[id] + step > d.max ? d.min : arr[id] + step;
      arr[id] = v; push(C.CHANGED, [pg.scope, id, ...v14(v)]);
    }, 1400);
  }, 7000);
  return { send: (bytes) => { const f = unframe(bytes); if (!f) return; const r = answer(f.cmd, f.a); if (r) setTimeout(() => onFrame(frame(f.cmd, r)), 6); }, name: "FM-1 (ejemplo)" };
}

/* ----------------------------------------------------------- the state --- */
/* M: what the FM-1 says. S: what this screen shows */
const M = { link: null, info: null, pdesc: [], gdesc: [], p: [], g: [], engine: 0, preset: 0, list: [], favs: [], favCur: -1, page: null, homeIds: [127, 127, 127, 127], mock: false };
const S = { folder: "HOME", mode: "edit", follow: true, hot: new Map() };
const FAM = { 0: "HOME", 1: "ENV", 2: "LFO", 3: "FX", 4: "SEL", 5: "EDIT", 6: "GLO", 7: "SAVE", 8: "ARP", 9: "SEQ" };
const NAV = [["HOME", "home"], ["EDIT", "edit"], ["ENV", "env"], ["LFO", "lfo"], ["FX", "fx"], ["SEL", "sel"], ["ARP", "arp"], ["SEQ", "seq"], ["GLO", "glo"], ["SAVE", "save"], ["ESTUDIO", "studio"]];
const ICON = { HOME: "home", EDIT: "edit", ENV: "env", LFO: "lfo", FX: "fx", SEL: "sel", ARP: "arp", SEQ: "seq", GLO: "glo", SAVE: "save" };
const LAYOUT = JSON.parse($("mockdata").textContent).pages;     /* the device's pages (params.c PAGES), as the firmware lays them out */
/* HOME's rack: a row a page, the device's HOME first */
const HOME_ROWS = [["Home", "Las perillas en HOME", "HOME", 0, null, "home"], ["Envolvente", "ENV", "ENV", 0, [1, 2, 3, 4], "env"],
  ["LFO", "LFO", "LFO", 0, [9, 10, 11, 12], "lfo"], ["Efectos", "FX", "FX", 0, [33, 34, 35, 36], "bars"], ["Macros", "MACROS", "EDIT", 0, [96, 97, 98, 99], "faders"]];
const desc = (s, id) => (s ? M.gdesc[id] : M.pdesc[id]);
const val = (s, id) => (s ? M.g[id] : M.p[id]);
const keyOf = (s, id) => s + ":" + id;
const frac = (d, v) => (d && d.max > d.min ? (Math.max(d.min, Math.min(d.max, v)) - d.min) / (d.max - d.min) : 0);
const entryNow = () => M.list.findIndex((x) => x.e === M.engine && x.k === M.preset);

/* ------------------------------------------------------------ connecting --- */
function say(t, err) { $("msg").textContent = t; $("msg").classList.toggle("err", !!err); }
function progress(f) { $("prog").style.width = Math.round(f * 100) + "%"; }
const rq = (cmd, args = [], opt) => M.link.request([cmd, args], opt);

async function connectMidi() {
  if (!navigator.requestMIDIAccess) { say("Este navegador no tiene Web MIDI. Usa Chrome.", true); return; }
  say("Pidiendo permiso para MIDI…");
  let access;
  try { access = await navigator.requestMIDIAccess({ sysex: true }); } catch (e) { say("Sin permiso para MIDI. Permítelo en Chrome y vuelve a intentar.", true); return; }
  const live = (p) => p.state !== "disconnected" && /fm-1|felucca|sloop|clipper|kayo|composite|usb-midi/i.test(p.name || "");
  const ins = [...access.inputs.values()].filter(live), outs = [...access.outputs.values()].filter(live);
  const pairs = ins.map((input) => ({ input, output: outs.find((o) => o.name === input.name) || (outs.length === 1 ? outs[0] : null) })).filter((x) => x.output);
  if (!pairs.length) { say("No encuentro el FM-1. Revisa el cable USB y que esté encendido.", true); return; }
  for (const pr of pairs) {
    const link = new Link((d) => pr.output.send(d), { onPush, onGap: () => rewatch(), onTimeout: () => {} });
    pr.input.onmidimessage = (e) => link.receive(e.data);
    M.link = link;
    try { await rq(C.INFO, [], { timeout: 600, retries: 3, quiet: true }); }
    catch (e) { link.close(); pr.input.onmidimessage = null; continue; }
    access.onstatechange = (e) => { if (e.port === pr.input && e.port.state === "disconnected") lost(); };
    $("cname").textContent = pr.input.name.replace(/ MIDI.*$/, "") || "FM-1";
    return load();
  }
  M.link = null;
  say("El FM-1 no responde. ¿Tiene instalado Clipper Live (protocolo 15)?", true);
}
function connectMock() {
  M.mock = true;
  let link;
  const mock = makeMock((d) => link.receive(d));
  link = new Link(mock.send, { onPush });
  M.link = link;
  $("cname").textContent = mock.name;
  return load();
}
function lost() {
  if (M.link) M.link.close();
  M.link = null;
  $("gate").classList.remove("hide");
  say("Se perdió la conexión con el FM-1.", true);
  progress(0);
}

async function load() {
  try {
    say("Leyendo el FM-1…");
    M.info = P.info(await rq(C.INFO, [], { timeout: 600, retries: 3 }));
    if (M.info.proto < 15) { say(`Este FM-1 tiene protocolo ${M.info.proto}: Live necesita tu firmware con Live (15).`, true); return; }
    const pe0 = M.info.pe0, cache = store.get("desc:" + M.info.version);
    const total = M.info.pcount + M.info.gcount;
    let n = 0;
    for (let i = 0; i < M.info.gcount; i++) { M.gdesc[i] = cache ? cache.g[i] : await descOrNull(1, i); progress(++n / total * .8); }
    for (let i = 0; i < M.info.pcount; i++) { M.pdesc[i] = cache && (i < pe0 || i >= pe0 + 8) ? cache.p[i] : await descOrNull(0, i); progress(++n / total * .8); }
    store.set("desc:" + M.info.version, { p: M.pdesc, g: M.gdesc });
    say("Leyendo la lista de sonidos…");
    M.list = [];
    for (;;) { const r = P.list(await rq(C.LIST, [...u14(M.list.length), 16])); M.list.push(...r.items); progress(.8 + .15 * M.list.length / Math.max(1, r.total)); if (M.list.length >= r.total || !r.items.length) break; }
    await readSound(true);
    await readFavs();
    await rq(C.WATCH, [3]);
    progress(1);
    $("gate").classList.add("hide");
    $("cstate").textContent = M.mock ? "Datos de ejemplo" : "Conectado  USB MIDI";
    $("conn").classList.remove("off");
    keepAlive();
    if (NAV.some(([n]) => n === QS.get("folder"))) S.folder = QS.get("folder");   /* (?folder= ?mode=play ?br=1: to open a view straight away) */
    renderAll();
    if (QS.get("mode") === "play") document.querySelector('[data-mode="play"]').click();
    if (QS.get("br") === "1") openBrowser(true);
  } catch (e) {
    console.error(e);
    say(e.message === "closed" ? "Se cerró la conexión." : "No pude leer el FM-1: " + e.message, true);
  }
}
async function descOrNull(s, i) { try { return P.desc(await rq(C.DESC, [s, i])); } catch (e) { if (e.message === "closed") throw e; return null; } }
async function readSound(full) {
  const was = M.engine, pe0 = M.info.pe0, d = P.dump(await rq(C.DUMP), M.info);
  M.engine = d.engine; M.preset = d.preset; M.p = d.p; M.g = d.g;
  if (full || d.engine !== was) for (let k = 0; k < 8; k++) M.pdesc[pe0 + k] = await descOrNull(0, pe0 + k);
  M.page = P.page(await rq(C.PAGE));
  if (M.page.homeIds) M.homeIds = M.page.homeIds;
}
async function readFavs() { const r = P.favs(await rq(C.FAVS)); M.favs = r.list; M.favCur = r.cur; }
let alive = 0;
function keepAlive() {
  clearInterval(alive);
  alive = setInterval(() => { if (M.link && M.link.idle && Date.now() - M.link.lastSent > 900) rq(C.PING, [], { quiet: true }).catch(() => {}); }, 1000);
}
function rewatch() { if (M.link) rq(C.WATCH, [3], { quiet: true }).then(() => reloadSoon()).catch(() => {}); }

/* -------------------------------------------------------- what the FM-1 says --- */
let reloadT = 0;
function reloadSoon() { clearTimeout(reloadT); reloadT = setTimeout(async () => { try { await readSound(false); await readFavs(); renderAll(); } catch (e) { /* the next push tries again */ } }, 60); }
function onPush(f) {
  try {
    if (f.cmd === C.CHANGED) {
      const r = new Reader(f.a), s = r.b(), id = r.b(), v = r.v(), arr = s ? M.g : M.p;
      if (id >= arr.length || touched(keyOf(s, id))) return;
      const old = arr[id];
      arr[id] = v;
      paintValue(s, id);
      fromDevice(s, id, old, v);
    } else if (f.cmd === C.RELOAD) reloadSoon();
    else if (f.cmd === C.FAVS_CHANGED) readFavs().then(renderBar).catch(() => {});
    else if (f.cmd === C.PAGE) {
      M.page = P.page(f.a);
      if (M.page.homeIds) M.homeIds = M.page.homeIds;
      renderWhere();
      if (S.follow) followPage();
    }
  } catch (e) { console.warn("bad push", f, e); }
}
/* the device's page: its folder here, its row flashed */
function followPage() {
  const pg = M.page;
  if (pg.home) { if (S.folder !== "HOME") { S.folder = "HOME"; renderAll(); } flashRow("HOME"); return; }
  const folder = FAM[pg.fam];
  if (folder === "SAVE") { openBrowser(true, pg.title === "FAVS" ? "FAVS" : null); return; }
  if (!folder || folder === "HOME") return;
  if (S.folder !== folder) { S.folder = folder; renderAll(); } else renderNav();
  flashRow(pg.title);
}
function flashRow(title) {
  const r = document.querySelector(`.row[data-title="${CSS.escape(title)}"]`);
  if (!r) return;
  document.querySelectorAll(".row.dev").forEach((x) => x.classList.remove("dev"));
  r.classList.add("dev");
  r.classList.remove("flash"); void r.offsetWidth; r.classList.add("flash");
  r.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function fromDevice(s, id, old, v) {
  const d = desc(s, id); if (!d) return;
  const pg = M.page, k = pg && !pg.home && pg.scope === s ? pg.ids.indexOf(id) : pg && pg.home && !s ? M.homeIds.indexOf(id) : -1;
  const a = fmtValue(d, old), b = fmtValue(d, v);
  toast(k, `${k >= 0 ? `<b>KNOB ${k + 1}</b> ` : ""}${esc(d.label)} <span class="num">${esc(a[0] + a[1])} → ${esc(b[0] + b[1])}</span>`);
  document.querySelectorAll(`.kn[data-k="${keyOf(s, id)}"]`).forEach((el) => { el.classList.add("hot"); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove("hot"), 1600); });
}

/* ------------------------------------------------------------ what we send --- */
const sets = new Map();          /* key -> performance.now() of the last user change: the device's echo is not taken */
const touched = (k) => performance.now() - (sets.get(k) || 0) < 600;
function setVal(s, id, v) {
  const d = desc(s, id); if (!d || !M.link) return;
  v = Math.max(d.min, Math.min(d.max, Math.round(v)));
  if (val(s, id) === v) return;
  (s ? M.g : M.p)[id] = v;
  sets.set(keyOf(s, id), performance.now());
  paintValue(s, id);
  rq(C.SET, [s, id, ...v14(v)], { key: "set:" + keyOf(s, id) }).then((a) => {
    const r = P.set(a);
    if (!touched(keyOf(s, id)) && r.value !== val(s, id)) { (s ? M.g : M.p)[id] = r.value; paintValue(s, id); }
  }).catch(() => {});
}

/* ----------------------------------------------------------------- views --- */
function knobSvg(d, v, i) {
  const r = 20, c = 2 * Math.PI * r, s = c * .75, a = frac(d, v), z = d.min < 0 && d.max > 0 ? -d.min / (d.max - d.min) : 0, lo = Math.min(a, z), hi = Math.max(a, z);
  return `<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="${r}" fill="none" stroke="#232327" stroke-width="6" stroke-linecap="round" stroke-dasharray="${s} ${c}" transform="rotate(135 26 26)"/>
    <circle cx="26" cy="26" r="${r}" fill="none" stroke="${KH[i]}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${Math.max(.1, (hi - lo) * s)} ${c}" stroke-dashoffset="${-lo * s}" transform="rotate(135 26 26)"/></svg>`;
}
function knob(s, id, i) {
  const d = id < 127 ? desc(s, id) : null;
  if (!d) return `<div class="kn none"><span class="l"><i style="background:var(--line-2)"></i>--</span><span class="v">--</span></div>`;
  const v = val(s, id), [t, u] = fmtValue(d, v);
  return `<div class="kn" style="--c:${KC[i]}" data-k="${keyOf(s, id)}" data-s="${s}" data-id="${id}" data-i="${i}" tabindex="0" role="slider" aria-label="${esc(d.label)}"
    aria-valuemin="${d.min}" aria-valuemax="${d.max}" aria-valuenow="${v}" aria-valuetext="${esc(t + " " + u)}">${knobSvg(d, v, i)}
    <div class="tx"><span class="l"><i></i>${esc(d.label)}</span><span class="v">${esc(t)}<small>${esc(u)}</small></span></div></div>`;
}
function paintValue(s, id) {
  document.querySelectorAll(`.kn[data-k="${keyOf(s, id)}"]`).forEach((el) => {
    const d = desc(s, id), v = val(s, id), [t, u] = fmtValue(d, v);
    el.querySelector("svg").outerHTML = knobSvg(d, v, +el.dataset.i);
    el.querySelector(".v").innerHTML = `${esc(t)}<small>${esc(u)}</small>`;
    el.setAttribute("aria-valuenow", v); el.setAttribute("aria-valuetext", t + " " + u);
    const row = el.closest(".row"); if (row) { const sh = row.querySelector(".shape"); if (sh) sh.innerHTML = shape(row.dataset.shape, +row.dataset.s, JSON.parse(row.dataset.ids)); }
  });
  if (S.mode === "play") { drawXY(); drawFaders(); }
  if (id === 0 || id === 25 || id === 26) renderMeta();
}
/* a page's shape, from its values */
function shape(kind, s, ids) {
  const W = 160, H = 72, f = (k) => { const id = ids[k]; return id < 127 && desc(s, id) ? frac(desc(s, id), val(s, id)) : 0; };
  if (kind === "env") { const a = f(0) * 40, d = a + f(1) * 40, y = H - 4 - f(2) * (H - 8), r = 120 + f(3) * 38;
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="M0 ${H - 4} L${a} 4 L${d} ${y} L120 ${y} L${r} ${H - 4}" fill="none" stroke="#287cff" stroke-width="2" stroke-linejoin="round"/></svg>`; }
  if (kind === "lfo") { const w = ids[1] < 127 ? val(s, ids[1]) : 1, cyc = 1 + Math.round(f(0) * 5); let p = "";
    for (let i = 0; i <= 120; i++) { const t = (i / 120 * cyc) % 1, y = w === 0 ? Math.sin(t * 2 * Math.PI) : w === 1 ? (t < .5 ? t * 4 - 1 : 3 - t * 4) : w === 2 ? 1 - t * 2 : w === 3 ? (t < .5 ? 1 : -1) : [.6, -.2, .9, -.7, .3][Math.floor(i / 120 * cyc * 2) % 5]; p += `${i ? "L" : "M"}${i / 120 * W} ${H / 2 - y * (H / 2 - 6)}`; }
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${p}" fill="none" stroke="#ffc618" stroke-width="2" stroke-linejoin="round"/></svg>`; }
  if (kind === "faders") return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<rect x="${i * 42}" y="4" width="34" height="${H - 8}" rx="4" fill="#17171a"/><rect x="${i * 42}" y="${4 + (1 - f(i)) * (H - 8)}" width="34" height="${f(i) * (H - 8)}" rx="4" fill="${KH[i]}" opacity=".85"/>`).join("")}</svg>`;
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">${[0, 1, 2, 3].map((i) => ids[i] < 127 ? `<rect x="0" y="${i * 18 + 2}" width="${W}" height="10" rx="3" fill="#17171a"/><rect x="0" y="${i * 18 + 2}" width="${Math.max(4, f(i) * W)}" height="10" rx="3" fill="${KH[i]}"/>` : "").join("")}</svg>`;
}
/* a row: its title here, sub the device's page title (what PAGE says), folder the device's family */
function row(title, sub, folder, s, ids, kind) {
  const dt = folder === "HOME" ? "HOME" : sub;
  const live = M.page && (M.page.home ? dt === "HOME" : M.page.title === dt && FAM[M.page.fam] === folder);
  const go = S.folder === "HOME" ? (folder === "HOME" ? "" : `<button class="go" data-f="${folder}">Abrir ${esc(folder)}<svg class="i"><use href="#i-open"/></svg></button>`) : "";
  return `<section class="row${live ? " dev" : ""}" data-title="${esc(dt)}" data-shape="${kind}" data-s="${s}" data-ids="${JSON.stringify(ids)}">
    <div class="rh"><div><h3><svg class="i"><use href="#i-${ICON[folder] || "edit"}"/></svg>${esc(title)}</h3><span class="pg">${esc(sub)}</span></div>
    ${live ? `<span class="live">En el sinte</span>` : go}</div>
    ${ids.map((id, i) => knob(s, id, i)).join("")}<div class="shape">${shape(kind, s, ids)}</div></section>`;
}
function awayRow(title, dt, folder) {
  return `<section class="row away" data-title="${esc(dt)}"><div class="rh"><div><h3><svg class="i"><use href="#i-${ICON[folder] || "edit"}"/></svg>${esc(title)}</h3></div></div>
    <div class="awt"><span>Esta página se edita en el sinte o en Estudio.</span><a class="btn" href="${STUDIO_URL}">Abrir Estudio</a></div></section>`;
}
const PAGE_NAME = { "ENV": "Envolvente", "ENV DEST": "Destinos de envolvente", "ENV 2": "Envolvente 2", "ENV 2 LOOP": "Envolvente 2: bucle", "LFO": "LFO",
  "LFO DEST": "Destinos del LFO", "MOD": "Modulación", "LFO 2": "LFO 2", "LFO 3": "LFO 3", "MATRIX": "Matriz", "MOD SEQ": "Mod seq", "MOD SEQ 2": "Mod seq 2",
  "FX": "Efectos", "FILTER": "Filtro", "INSERT": "Insert", "INSERT 2": "Insert 2", "DLY": "Delay", "DLY 2": "Delay 2", "REVERB": "Reverb", "CHORUS": "Chorus",
  "EQ+COMP": "EQ y compresor", "SEL": "Escala", "SEL 2": "Acordes", "EDIT 1": "Motor 1", "EDIT 2": "Motor 2", "VOICE": "Voces", "VOICE 2": "Voces 2",
  "VOICE 3": "Voces 3", "MACROS": "Macros", "GLOBAL": "Global", "MASTER": "Master", "SYSTEM": "Sistema", "ARP": "Arpegiador", "ARP 2": "Arpegiador 2",
  "SPICE": "Spice", "PATTERN": "Patrón", "NOTES": "Notas" };
function renderWork() {
  let h = "";
  if (S.folder === "HOME") {
    h = HOME_ROWS.map(([t, sub, folder, s, ids, kind]) => row(t, sub, folder, s, ids || M.homeIds, kind)).join("");
  } else {
    const pages = LAYOUT.filter((x) => x.folder === S.folder);
    h = pages.map((x) => (x.scope === 2 || x.title === "TOOLS" || !x.ids.some((i) => i < 127) ? awayRow(PAGE_NAME[x.title] || x.title, x.title, S.folder)
      : row(PAGE_NAME[x.title] || x.title, x.title, S.folder, x.scope, x.ids, x.title.startsWith("ENV") && !x.title.includes("DEST") && !x.title.includes("LOOP") ? "env" : x.title === "LFO" ? "lfo" : x.title === "MACROS" ? "faders" : "bars"))).join("");
    if (S.folder === "SEQ") h += `<p class="note">Las notas del patrón se editan en Estudio, en el secuenciador.</p>`;
  }
  $("edit").innerHTML = h;
  if (M.page && S.folder !== "HOME" && FAM[M.page.fam] === S.folder) flashRowQuiet(M.page.title);
}
function flashRowQuiet(title) { const r = document.querySelector(`.row[data-title="${CSS.escape(title)}"]`); if (r) r.classList.add("dev"); }
function renderWhere() { $("where").textContent = !M.page ? "" : M.page.home ? "HOME" : M.page.title; renderNav(); }
function renderNav() {
  const dev = M.page ? (M.page.home ? "HOME" : FAM[M.page.fam]) : "";
  $("nav").innerHTML = NAV.map(([n, ic]) => `<button class="nb${n === dev ? " dev" : ""}${n === "ESTUDIO" ? " est" : ""}" ${n === S.folder ? 'aria-current="page"' : ""} data-f="${n}"><svg class="i"><use href="#i-${ic}"/></svg>${n}</button>`).join("");
}
function renderMeta() {
  const n = entryNow(), x = M.list[n], d = (s, id) => (desc(s, id) ? fmtValue(desc(s, id), val(s, id))[0] : "--"), fav = M.favCur >= 0;
  $("metal").innerHTML = `<dt>Motor</dt><dd>${esc(M.info.engines[M.engine] || "--")}</dd><dt>Tipo</dt><dd><span class="${fav ? "k" : ""}">${esc(x ? x.kind : "--")}</span></dd>
    <dt>En la lista</dt><dd class="num">${n >= 0 ? n + 1 : "--"}/${M.list.length}</dd><dt>Tonalidad</dt><dd>${esc(d(0, 25))} ${esc(d(0, 26))}</dd><dt>Tempo</dt><dd class="num">${esc(d(1, 0))} BPM</dd>`;
}
function renderBar() {
  const n = entryNow(), x = M.list[n], fav = M.favCur >= 0;
  $("name").textContent = x ? x.name : (M.info.engines[M.engine] || "") + " " + (M.preset + 1);
  $("meta").innerHTML = `<span class="${fav ? "k" : ""}">${esc(x ? x.kind : "USER")}</span><span>${esc(M.info.engines[M.engine] || "")}</span><span class="num">${n >= 0 ? n + 1 : "--"}/${M.list.length}</span>`;
  $("favt").classList.toggle("fav", fav); $("favt").setAttribute("aria-pressed", fav);
  $("favb").classList.toggle("on", fav);
  $("favb").querySelector("span").textContent = fav ? `Favorito ${M.favCur + 1} de ${M.favs.length}` : "Marcar como favorito";
  $("fcount").textContent = `${M.favs.length}/16`;
  $("favs").innerHTML = M.favs.map((f, i) => `<button class="fv" role="listitem" data-favgo="${i}" aria-current="${i === M.favCur}"><span class="i">${String(i + 1).padStart(2, "0")}</span>
    <span class="n">${esc(f.name)}</span><span class="k">${esc(f.kind)} <span>${esc(M.info.engines[f.e] || "USER")}</span></span></button>`).join("");
  renderMeta();
  if (B.open) renderBrowser();
}
function renderAll() { renderBar(); renderWhere(); renderWork(); if (S.mode === "play") renderPlay(); }

/* ------------------------------------------------------------- the browser --- */
const KINDS = ["BASS", "KEYS", "ORGN", "PAD", "LEAD", "PLCK", "STAB", "FX", "USER"];
const B = { kind: "BASS", open: false };
function renderBrowser() {
  const kinds = KINDS.filter((k) => M.list.some((x) => x.kind === k));
  const favKeys = new Set(M.favs.map((f) => f.e + ":" + f.k + ":" + f.name));
  const cnt = (k) => (k === "FAVS" ? M.favs.length : k === "ALL" ? M.list.length : M.list.filter((x) => x.kind === k).length);
  const kd = (k, label, cls = "") => `<button class="kd ${cls}" data-kind="${k}" aria-current="${B.kind === k}"><span>${label}</span><span class="n">${cnt(k)}</span></button>`;
  $("kinds").innerHTML = kd("FAVS", "Favoritos", "fv-k") + kd("ALL", "Todos") + kinds.map((k, i) => kd(k, k, i ? "" : "sep")).join("");
  const cur = entryNow();
  let items;
  if (B.kind === "FAVS") items = M.favs.map((f, i) => ({ fav: i, x: f, n: M.list.findIndex((y) => y.e === f.e && y.k === f.k && y.name === f.name) }));
  else items = M.list.map((x, n) => ({ x, n })).filter((o) => B.kind === "ALL" || o.x.kind === B.kind);
  $("brc").textContent = `${B.kind === "FAVS" ? "Favoritos" : B.kind === "ALL" ? "Todos" : B.kind}  ${items.length}`;
  $("snds").innerHTML = items.map((o) => { const f = favKeys.has(o.x.e + ":" + o.x.k + ":" + o.x.name);
    return `<button class="sd" role="listitem" ${o.fav != null ? `data-favgo="${o.fav}"` : `data-load="${o.n}"`} aria-current="${o.n === cur}"><span class="n">${esc(o.x.name)}</span><span class="x">${o.n >= 0 ? o.n + 1 : ""}</span>
      <span class="m">${B.kind === "ALL" || B.kind === "FAVS" ? `<span class="k">${esc(o.x.kind)}</span>` : ""}<span>${esc(M.info.engines[o.x.e] || "USER")}</span>${f ? '<svg class="i st"><use href="#i-star"/></svg>' : ""}</span></button>`; }).join("");
}
function openBrowser(on, kind) {
  B.open = on;
  if (on) { const x = M.list[entryNow()]; B.kind = kind || (x ? x.kind : "BASS"); renderBrowser(); }
  $("br").classList.toggle("on", on); $("scrim").classList.toggle("on", on); $("now").setAttribute("aria-expanded", on);
  if (on) setTimeout(() => ($("snds").querySelector('[aria-current="true"]') || $("snds").querySelector(".sd"))?.focus(), 50);
}

/* ---------------------------------------------------------------- TOCAR --- */
const playParams = () => HOME_ROWS.flatMap(([t, , , s, ids]) => (ids || M.homeIds).filter((id) => id < 127 && desc(s, id) && desc(s, id).fmt !== F.ENUM).map((id) => ({ s, id, name: `${t}  ${desc(s, id).label}` })));
function renderPlay() {
  const ps = playParams(), opts = ps.map((x, j) => `<option value="${j}">${esc(x.name)}</option>`).join("");
  const kx = $("xsel").value, ky = $("ysel").value;
  $("xsel").innerHTML = opts; $("ysel").innerHTML = opts;
  $("xsel").value = kx && +kx < ps.length ? kx : 0; $("ysel").value = ky && +ky < ps.length ? ky : Math.min(1, ps.length - 1);
  drawXY(); drawFaders();
}
const axis = (sel) => playParams()[+$(sel).value];
function drawXY() {
  const X = axis("xsel"), Y = axis("ysel"); if (!X || !Y) return;
  const fx = frac(desc(X.s, X.id), val(X.s, X.id)), fy = frac(desc(Y.s, Y.id), val(Y.s, Y.id));
  $("dot").style.left = $("cx").style.left = fx * 100 + "%"; $("dot").style.top = $("cy").style.top = (1 - fy) * 100 + "%";
  const a = fmtValue(desc(X.s, X.id), val(X.s, X.id)), b = fmtValue(desc(Y.s, Y.id), val(Y.s, Y.id));
  $("xr").innerHTML = `<span style="color:var(--k1)">${esc(desc(X.s, X.id).label)}</span> ${esc(a[0] + a[1])}`;
  $("yr").innerHTML = `<span style="color:var(--k2)">${esc(desc(Y.s, Y.id).label)}</span> ${esc(b[0] + b[1])}`;
}
const MACRO_IDS = [96, 97, 98, 99];
function drawFaders() {
  $("fdr").innerHTML = MACRO_IDS.map((id, i) => { const d = desc(0, id); if (!d) return ""; const f = frac(d, val(0, id)), [t] = fmtValue(d, val(0, id));
    return `<div class="fd" style="--c:${KC[i]}" data-i="${i}" role="slider" aria-label="${esc(d.label)}" aria-valuenow="${val(0, id)}"><span class="v">${esc(t)}</span>
      <div class="tr"><b style="height:${f * 100}%"></b><i style="bottom:calc(${f * 100}% - 1px)"></i></div><span class="l">${esc(d.label)}</span></div>`; }).join("");
}

/* ----------------------------------------------------------------- input --- */
let drag = null;
$("edit").addEventListener("pointerdown", (e) => {
  const k = e.target.closest(".kn[data-k]"); if (!k) return;
  const s = +k.dataset.s, id = +k.dataset.id, d = desc(s, id);
  drag = { k, s, id, d, y0: e.clientY, v0: val(s, id) }; k.setPointerCapture(e.pointerId); k.classList.add("drag");
});
$("edit").addEventListener("pointermove", (e) => { if (drag) setVal(drag.s, drag.id, drag.v0 + (drag.y0 - e.clientY) * (drag.d.max - drag.d.min) / 240); });
const endDrag = () => { if (drag) { drag.k.classList.remove("drag"); drag = null; } };
$("edit").addEventListener("pointerup", endDrag); $("edit").addEventListener("pointercancel", endDrag);
$("edit").addEventListener("dblclick", (e) => { const k = e.target.closest(".kn[data-k]"); if (k) { const s = +k.dataset.s, id = +k.dataset.id; setVal(s, id, desc(s, id).def); } });
$("edit").addEventListener("keydown", (e) => { const k = e.target.closest(".kn[data-k]"), st = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 8, PageDown: -8 }[e.key];
  if (k && st) { e.preventDefault(); const s = +k.dataset.s, id = +k.dataset.id; setVal(s, id, val(s, id) + st); } });
let xyOn = false;
const xyAt = (e) => { const r = $("xy").getBoundingClientRect(), X = axis("xsel"), Y = axis("ysel"); if (!X || !Y) return;
  const dx = desc(X.s, X.id), dy = desc(Y.s, Y.id);
  setVal(X.s, X.id, dx.min + Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (dx.max - dx.min));
  setVal(Y.s, Y.id, dy.min + Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)) * (dy.max - dy.min)); drawXY(); };
$("xy").addEventListener("pointerdown", (e) => { xyOn = true; $("xy").classList.add("on"); $("xy").setPointerCapture(e.pointerId); xyAt(e); });
$("xy").addEventListener("pointermove", (e) => { if (xyOn) xyAt(e); });
$("xy").addEventListener("pointerup", () => { xyOn = false; $("xy").classList.remove("on"); });
$("xsel").onchange = $("ysel").onchange = drawXY;
let fdOn = null;
$("fdr").addEventListener("pointerdown", (e) => { const f = e.target.closest(".fd"); if (!f) return; fdOn = +f.dataset.i; $("fdr").setPointerCapture(e.pointerId); fdAt(e); });
$("fdr").addEventListener("pointermove", (e) => { if (fdOn != null) fdAt(e); });
$("fdr").addEventListener("pointerup", () => { fdOn = null; });
function fdAt(e) { const tr = $("fdr").querySelectorAll(".tr")[fdOn]; if (!tr) return; const r = tr.getBoundingClientRect(), id = MACRO_IDS[fdOn], d = desc(0, id);
  setVal(0, id, d.min + Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)) * (d.max - d.min)); drawFaders(); }

async function favGo(i) { try { await rq(C.FAV_GO, [i]); } catch (e) { /* RELOAD brings the rest */ } }
async function listGo(n) { try { await rq(C.LIST_GO, u14(n)); } catch (e) { /* RELOAD brings the rest */ } }
async function favToggle() {
  const was = M.favCur >= 0;
  if (!was && M.favs.length >= 16) { toast(-1, "Los 16 favoritos están ocupados"); return; }
  try { await rq(C.FAV_SET, [was ? 0 : 1]); await readFavs(); renderBar(); toast(-1, was ? "Quitado de favoritos" : `<b>Favorito ${M.favs.length}</b> ${esc(M.list[entryNow()]?.name || "")}`); } catch (e) { toast(-1, "No se pudo cambiar el favorito"); }
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && B.open) { openBrowser(false); $("now").focus(); } });
$("scrim").addEventListener("click", () => openBrowser(false));
document.addEventListener("click", (e) => {
  const b = e.target.closest("#now,#brx,[data-kind],[data-load],[data-favgo],[data-kstep],[data-mode],#prev,#next,#favt,#favb,#usb,#follow,[data-f]");
  if (!b) return;
  if (b.id === "now") openBrowser(!B.open);
  else if (b.id === "brx") openBrowser(false);
  else if (b.dataset.kind) { B.kind = b.dataset.kind; renderBrowser(); }
  else if (b.dataset.kstep) { const all = ["FAVS", "ALL", ...KINDS.filter((k) => M.list.some((x) => x.kind === k))], i = all.indexOf(B.kind); B.kind = all[(i + +b.dataset.kstep + all.length) % all.length]; renderBrowser(); }
  else if (b.dataset.load) listGo(+b.dataset.load);
  else if (b.dataset.favgo) favGo(+b.dataset.favgo);
  else if (b.dataset.mode) { S.mode = b.dataset.mode; document.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", x === b)); $("edit").classList.toggle("hide", S.mode !== "edit"); $("play").classList.toggle("hide", S.mode !== "play"); if (S.mode === "play") renderPlay(); }
  else if (b.id === "prev" || b.id === "next") {           /* (not a favourite now: next is the first, previous the last) */
    const n = M.favs.length, d = b.id === "next" ? 1 : -1;
    if (n) favGo(M.favCur < 0 ? (d > 0 ? 0 : n - 1) : (M.favCur + d + n) % n);
  }
  else if (b.id === "favt" || b.id === "favb") favToggle();
  else if (b.id === "usb") usbAudio();
  else if (b.id === "follow") { S.follow = !S.follow; b.setAttribute("aria-pressed", S.follow); if (S.follow && M.page) followPage(); }
  else if (b.dataset.f === "ESTUDIO") location.href = STUDIO_URL;
  else if (b.dataset.f === "SAVE") openBrowser(true);
  else if (b.dataset.f) { S.folder = b.dataset.f; renderNav(); renderWork(); $("edit").scrollTop = 0; if (S.mode === "play") { S.mode = "edit"; document.querySelector('[data-mode="edit"]').click(); } }
});

/* ---------------------------------------------------------------- toasts --- */
let tt = 0;
function toast(i, html) {
  $("tq").style.background = i < 0 ? "var(--tx)" : KH[i]; $("tt").innerHTML = html; $("toast").classList.add("on");
  clearTimeout(tt); tt = setTimeout(() => $("toast").classList.remove("on"), 2200);
}

/* ------------------------------------------------- the scope: the FM-1's USB audio --- */
let an = null, buf = null;
async function usbAudio() {
  const l = $("src");
  if (!navigator.mediaDevices?.getUserMedia) { l.textContent = "Este navegador no da audio"; return; }
  try {
    const raw = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
    let st = await navigator.mediaDevices.getUserMedia({ audio: raw });
    const ins = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
    const fm1 = ins.find((d) => /felucca|clipper|fm-?1|sloop/i.test(d.label)) || ins.find((d) => /usb/i.test(d.label));
    if (fm1 && st.getAudioTracks()[0].getSettings().deviceId !== fm1.deviceId) { st.getTracks().forEach((t) => t.stop()); st = await navigator.mediaDevices.getUserMedia({ audio: { ...raw, deviceId: { exact: fm1.deviceId } } }); }
    const ctx = new AudioContext(); an = ctx.createAnalyser(); an.fftSize = 2048; buf = new Float32Array(an.fftSize); ctx.createMediaStreamSource(st).connect(an);
    l.textContent = (fm1 ? "" : "No encontré el FM-1: ") + (st.getAudioTracks()[0].label || "entrada");
  } catch (err) { l.textContent = err.name === "NotAllowedError" ? "Permiso de audio negado" : "No se pudo abrir el audio"; }
}
function drawScope(cv) {
  if (!cv || !an) return; const r = cv.getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  an.getFloatTimeDomainData(buf);
  let t = 0; for (let i = 1; i < buf.length - 240; i++) if (buf[i - 1] < 0 && buf[i] >= 0) { t = i; break; }
  const g = cv.getContext("2d"); g.clearRect(0, 0, w, h); g.fillStyle = "#232327"; g.fillRect(0, h >> 1, w, dpr);
  g.strokeStyle = "#f2f2f3"; g.lineWidth = 1.5 * dpr; g.lineJoin = "round"; g.beginPath();
  for (let i = 0; i < 240; i++) g.lineTo(i / 239 * w, h / 2 - (buf[t + i] || 0) * h * .85); g.stroke();
}
(function loop() { drawScope($("scope")); if (S.mode === "play") drawScope($("xyscope")); requestAnimationFrame(loop); })();

/* ------------------------------------------------------------------ start --- */
$("connect").onclick = () => connectMidi();
$("demo").onclick = () => connectMock();
$("conn").classList.add("off");
if (QS.get("mock") === "1") connectMock();
