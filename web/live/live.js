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
const C = { INFO: 1, GET: 2, SET: 3, DUMP: 4, DESC: 5, STEP_GET: 6, STEP_SET: 7, UP_LIST: 16, UP_STORE: 19, WATCH: 22, CHANGED: 23, RELOAD: 24, PING: 25, STEP_CHANGED: 26, TRACK_CHANGED: 32,
  PAGE: 97, FAVS: 98, FAV_GO: 99, FAV_SET: 100, FAVS_CHANGED: 101, LIST: 102, LIST_GO: 103, EDITED: 104, TOOL: 105, PLAY: 106, TRANSPORT: 107,
  SCOPE: 108, X_GET: 109, X_SET: 110, X_CHANGED: 111, STATE: 112, REC: 113 };
const PUSH = new Set([C.CHANGED, C.RELOAD, C.STEP_CHANGED, C.TRACK_CHANGED, C.FAVS_CHANGED, C.EDITED, C.SCOPE, C.X_CHANGED]);
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
    o.homeIds = r.more ? [r.b(), r.b(), r.b(), r.b()] : null; o.edited = r.more ? r.b() : 0;
    o.cur = r.more ? r.u() : null; if (o.cur === 16383) o.cur = -1; return o; },          /* (cur: the LIST entry playing) */
  entry(r) { return { e: r.b(), k: r.b(), kind: r.s(), name: r.s() }; },
  favs(a) { const r = new Reader(a), n = r.b(), cur = r.b(), list = []; for (let i = 0; i < n; i++) list.push(P.entry(r)); return { cur: cur === 127 ? -1 : cur, list }; },
  x(a) { const r = new Reader(a), o = { id: r.b(), v: r.v(), fmt: r.b(), min: r.v(), max: r.v(), names: [] }; const has = r.b();   /* (Live 109) a synth page's value */
    o.label = r.s(); o.unit = r.s(); if (has) while (r.more && o.names.length <= o.max - o.min) o.names.push(r.s());
    if (o.names.length) o.fmt = F.ENUM; o.def = o.min; return o; },
  state(a) { return { cpu: a[0], late: a[1] | a[2] << 7, peak: a[3], scale: a[4] | a[5] << 7, rec: a[6], mode: a[7], start: a[8], quant: a[9], empty: a[10], oct: a.length > 11 ? a[11] - 8 : 0 }; },
  step(a) { const r = new Reader(a), o = { index: r.b(), n: r.b(), notes: [r.b(), r.b(), r.b(), r.b()], time: r.b(), flags: r.b(), vel: r.b(), lvl: 0, rat: 0 };
    if (r.more) { const lo = r.b(), hi = r.b(), ra = r.b(); o.lvl = lo | (hi & 1) << 7; o.rat = ra | ((hi >> 1) & 1) << 7; } return o; },
  list(a) { const r = new Reader(a), total = r.u(), start = r.u(), n = r.b(), items = []; for (let i = 0; i < n; i++) items.push(P.entry(r)); return { total, start, items }; },
  uplist(a) { const r = new Reader(a), start = r.b(), n = r.b(), total = r.b(), items = []; for (let i = 0; i < n; i++) items.push({ used: !!r.b(), e: r.b(), name: r.s() }); return { start, total, items }; },
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
    if (PUSH.has(f.cmd) || f.cmd === C.PAGE || f.cmd === C.PLAY) this.onPush(f);
  }
  close() { this.closed = true; const all = (this.cur ? [this.cur] : []).concat(this.q); if (this.cur) clearTimeout(this.cur.timer); this.cur = null; this.q = []; all.forEach((r) => r.rej(new Error("closed"))); }
}

/* ---------------------------------------------------------- the mock FM-1 --- */
/* The device's own data (tools/live_dump.py over the real firmware); answers frames as editor.c would, and now and then
   does what a player would on the FM-1: opens a page, turns a knob */
function makeMock(onFrame) {
  const D = JSON.parse($("mockdata").textContent), info = D.info, pe0 = info.pe0;
  const ups = Array.from({ length: 32 }, () => null), NE = info.nengines;
  const steps = Array.from({ length: info.nstep }, (_, i) => { const on = [0, 3, 6, 8, 10, 12, 14].includes(i), n = [36, 36, 48, 39, 36, 41, 43][[0, 3, 6, 8, 10, 12, 14].indexOf(i)];
    return { n: on ? 1 : 0, notes: [on ? n : 0, 0, 0, 0], time: on ? 0 : i === 7 ? 1 : 2, flags: i === 6 ? 1 : i === 10 ? 2 : 0, vel: 100, lvl: 0, rat: 0 }; });
  const stepArgs = (i) => { const st = steps[i]; return [i, st.n, ...st.notes, st.time, st.flags, st.vel, st.lvl & 127, ((st.lvl >> 7) & 1) | (((st.rat >> 7) & 1) << 1), st.rat & 127]; };
  const sq = { playing: 0, pos: 0, t: 0 }, mrec = { rec: 0, mode: 0, start: 0, quant: 0 };
  const playArgs = () => [sq.playing, sq.pos & 127, sq.pos >> 7, mrec.rec];
  const relist = () => { D.list = D.list.filter((x) => x[0] < NE).concat(ups.map((u, k) => u && [NE, k, "USER", u.name]).filter(Boolean)); };
  const m = { p: D.dump.p.slice(), g: D.dump.g.slice(), engine: D.dump.engine, preset: D.dump.preset, n: 0, favs: [0, 6, 64, 120, 200, 290],
    page: { home: 1, fam: 0, page: 0, title: "HOME", scope: 0, ids: [] }, watch: false, edited: 0 };
  const enc = { s: (t) => [...[...t].map((c) => c.charCodeAt(0) & 127), 0], entry: (n) => { const x = D.list[n]; return [x[0], x[1], ...enc.s(x[2]), ...enc.s(x[3])]; } };
  const homeIds = () => D.homeIds[m.engine] || [127, 127, 127, 127];
  const pageArgs = () => { const ids = m.page.home ? homeIds() : m.page.ids; return [m.page.home, m.page.fam, m.page.page, ...enc.s(m.page.title), m.page.scope, ...ids, ...homeIds(), m.edited, ...u14(m.n)]; };
  const descOf = (s, id) => (s ? D.gdesc[id] : id >= pe0 && id < pe0 + 8 && D.engineDesc[m.engine] ? D.engineDesc[m.engine][id - pe0] : D.pdesc[id]);
  const push = (cmd, a) => setTimeout(() => onFrame(frame(cmd, a)), 4);
  const load = (n) => { m.n = n; if (D.list[n][0] === NE) m.engine = ups[D.list[n][1]].engine; else { m.engine = D.list[n][0]; m.preset = D.list[n][1]; } if (m.edited && m.watch) push(C.EDITED, [0]); m.edited = 0;
    (D.engineDesc[m.engine] || []).forEach((d, k) => { m.p[pe0 + k] = d.def; }); if (m.watch) push(C.RELOAD, [m.engine, m.preset, 0]); };
  const FAMS = { ENV: 1, LFO: 2, FX: 3, SEL: 4, EDIT: 5, GLO: 6, ARP: 8 };
  const u21e = (v) => [v & 127, (v >> 7) & 127, (v >> 14) & 127];
  const u35e = (v) => Array.from({ length: 5 }, (_, i) => Math.floor(v / 2 ** (7 * i)) & 127);
  const smp = [{ z: 1, n: "KICK 909", k: 48 }, { z: 4, n: "VOX CHOP", k: 210 }, ...Array.from({ length: 6 }, () => ({ z: 0, n: "", k: 0 }))];
  const pack7 = (b) => { const out = []; for (let i = 0; i < b.length; i += 7) { const g = b.slice(i, i + 7); out.push(g.reduce((m2, x, j) => m2 | (((x >> 7) & 1) << j), 0)); g.forEach((x) => out.push(x & 127)); } return out; };
  const NS = info.nstep || 64, trk = { sel: 0, lv: [40, 20, 0, -12, 8, -30, 16, 0], mute: [0, 0, 0, 1, 0, 0, 0, 0] };
  const xs = Array.from({ length: 8 }, () => ({ micro: Array.from({ length: NS }, (_, i) => (i % 8 === 4 ? 6 : 0)), fill: Array(16).fill(0),
    locks: [{ step: 2, param: 33, value: 90 }] }));
  xs[0].fill[3] = 1 << 0;                              /* (el paso 12, solo con fill) */
  const tune = { sys: 0, root: 0, n: 12, period: 19200, deg: Array.from({ length: 12 }, (_, i) => 1600 * i) };
  let mseqSt = Array.from({ length: 64 }, (_, i) => { const l = i >> 4, k = i & 15; return l === 0 ? (k % 8) - 4 : l === 1 ? (k % 2 ? 6 : -6) : l === 3 && k % 4 === 0 ? 7 : 0; });
  const prj = [1, 1, 0, 0];
  function answer(cmd, a) {
    switch (cmd) {
      case C.INFO: return [...enc.s(info.version), info.nengines, info.pcount, info.gcount, info.nstep, pe0, ...info.engines.flatMap(enc.s), info.ntrk, info.proto];
      case C.DESC: { const d = descOf(a[0], a[1]); if (!d) return null;
        return [a[0], a[1], d.fmt, ...v14(d.min), ...v14(d.max), ...v14(d.def), ...enc.s(d.label), ...enc.s(d.unit), ...(d.fmt === F.ENUM ? d.names.flatMap(enc.s) : [])]; }
      case C.DUMP: return [m.engine, m.preset, ...m.p.flatMap(v14), ...m.g.flatMap(v14)];
      case C.SET: { const v = (a[2] | (a[3] << 7)) - 8192, d = descOf(a[0], a[1]), c = d ? Math.max(d.min, Math.min(d.max, v)) : v; (a[0] ? m.g : m.p)[a[1]] = c;
        if (!a[0] && !m.edited) { m.edited = 1; if (m.watch) push(C.EDITED, [1]); } return [a[0], a[1], ...v14(c)]; }
      case C.WATCH: m.watch = !!(a[0] & 1); return [a[0] & 3];
      case C.PING: return [0];
      case C.TOOL: return [a[0], [22, 23, 31].includes(a[0]) ? 0 : 1];
      case C.X_GET: case C.X_SET: { const d = (D.xdesc || {})[a[0]]; if (!d) return [127, ...v14(0), 0, ...v14(0), ...v14(0), 0, 0, 0];
        if (cmd === C.X_SET) { const v = (a[1] | (a[2] << 7)) - 8192; d.v = d.names[1] === "GO" ? 0 : Math.max(d.min, Math.min(d.max, v)); }
        return [a[0], ...v14(d.v), d.fmt, ...v14(d.min), ...v14(d.max), d.names.length ? 1 : 0, ...enc.s(d.label), ...enc.s(d.unit || ""), ...d.names.flatMap(enc.s)]; }
      case C.STATE: return [12 + (Date.now() / 1500 % 7 | 0), 0, 0, 30, 0b10110101 & 127, (0b101011010101 >> 7) & 127, mrec.rec, mrec.mode, mrec.start, mrec.quant, 0, 8];
      case C.REC: if (a[0] === 0) mrec.rec = mrec.rec ? 0 : sq.playing ? 1 : 2; else if (a[0] === 1) mrec.mode = a[1] & 1; else if (a[0] === 2) mrec.start = a[1] & 1; else if (a[0] === 3) mrec.quant = a[1] & 1;
        return answer(C.STATE, []);
      case C.STEP_GET: return a[0] < steps.length ? stepArgs(a[0]) : null;
      case C.STEP_SET: { const i = a[0]; if (i >= steps.length) return null;
        steps[i] = { n: Math.min(4, a[1]), notes: a.slice(2, 6), time: Math.min(2, a[6]), flags: a[7] & 3, vel: a[8], lvl: a.length > 9 ? a[9] | (a[10] & 1) << 7 : 0, rat: a.length > 9 ? a[11] | ((a[10] >> 1) & 1) << 7 : 0 };
        return stepArgs(i); }
      case C.PLAY: return playArgs();
      case C.TRANSPORT: sq.playing = a[0] & 1; clearInterval(sq.t);
        if (sq.playing) sq.t = setInterval(() => { sq.pos = (sq.pos + 1) % Math.max(1, m.p[29] || 16); if (m.watch) push(C.PLAY, playArgs()); }, 125);
        else { sq.pos = 0; if (m.watch) push(C.PLAY, playArgs()); }
        return [sq.playing];
      case C.UP_LIST: { const st = Math.min(a[0], 32), n = Math.min(a[1], 16, 32 - st); return [st, n, 32, ...Array.from({ length: n }, (_, i) => { const u = ups[st + i]; return [u ? 1 : 0, u ? u.engine : 0, ...enc.s(u ? u.name : "")]; }).flat()]; }
      case C.UP_STORE: { const k = a[0], nm = String.fromCharCode(...a.slice(1, a.indexOf(0, 1) < 0 ? a.length : a.indexOf(0, 1))); if (k >= 32 || nm.length > 12) return [k, 1];
        ups[k] = { engine: m.engine, name: nm || `${info.engines[m.engine]} ${String(k + 1).padStart(2, "0")}` }; relist(); return [k, 0]; }
      case C.PAGE: return pageArgs();
      case C.FAVS: { const cur = m.favs.indexOf(m.n); return [m.favs.length, cur < 0 ? 127 : cur, ...m.favs.flatMap(enc.entry)]; }
      case C.FAV_GO: { const ok = a[0] < m.favs.length; if (ok) load(m.favs[a[0]]); return [a[0], ok ? 0 : 1]; }
      case C.FAV_SET: { const i = m.favs.indexOf(m.n); if (a[0] & 1) { if (i < 0 && m.favs.length < 16) m.favs.push(m.n); } else if (i >= 0) m.favs.splice(i, 1); return [m.favs.length]; }
      case C.LIST: { const st = Math.min(a[0] | (a[1] << 7), D.list.length), n = Math.min(a[2] || 16, 16, D.list.length - st);
        return [...u14(D.list.length), ...u14(st), n, ...Array.from({ length: n }, (_, i) => enc.entry(st + i)).flat()]; }
      case C.LIST_GO: { const n = a[0] | (a[1] << 7), ok = n < D.list.length; if (ok) load(n); return [...u14(n), ok ? 0 : 1]; }
      /* ---- lo de Estudio, para ver su interfaz en el FM-1 de ejemplo: datos de ejemplo, como todo lo demás aquí ---- */
      case 27: { const nt = info.ntrk || 4; if (a.length) trk.sel = Math.min(nt - 1, a[0]);                 /* TRACK (con elegir) */
        return [trk.sel, nt, ...Array.from({ length: nt }, (_, i) => { const x = D.list[(m.n + i * 37) % D.list.length];
          return [i ? x[0] % info.nengines : m.engine, i ? x[1] & 127 : m.preset, ...v14(trk.lv[i % 8]), trk.mute[i % 8], i === trk.sel ? 1 : 0]; }).flat(), 0]; }
      case 28: { const i = a[0] % 8; if (a.length > 1) { trk.lv[i] = (a[1] | (a[2] << 7)) - 8192; trk.mute[i] = a[3] & 1; }   /* TRACK_MIX */
        return [a[0], ...v14(trk.lv[i]), trk.mute[i]]; }
      case 39: { const x = xs[a[0] % 8]; return [a[0], ...x.micro.map((v) => v + 64)]; }                            /* MICRO_GET */
      case 40: { const x = xs[a[0] % 8]; x.micro[a[1]] = a[2] - 64; return [a[0], a[1], a[2]]; }                    /* MICRO_SET */
      case 41: return [a[0], ...pack7(xs[a[0] % 8].fill)];                                                          /* FILL_GET */
      case 42: { const f = xs[a[0] % 8].fill, k = a[1] >> 2, sh = 2 * (a[1] & 3); f[k] = (f[k] & ~(3 << sh)) | ((a[2] % 3) << sh); return [a[0], a[1], a[2] % 3]; }   /* FILL_SET */
      case 37: { const L = xs[a[0] % 8].locks; return [a[0], L.length, ...L.flatMap((l) => [l.step, l.param, ...v14(l.value)])]; }   /* LOCK_GET */
      case 38: { const x = xs[a[0] % 8]; x.locks = x.locks.filter((l) => !(l.step === a[1] && l.param === a[2]));      /* LOCK_SET */
        const has = a.length > 3, v = has ? (a[3] | (a[4] << 7)) - 8192 : 0; if (has) x.locks.push({ step: a[1], param: a[2], value: v });
        return [a[0], a[1], a[2], 0, has ? 1 : 0, ...v14(v)]; }
      case 9: { const op = a[0], k = a[1] & 3; if (op === 1) prj[k] = 1; return [op, k, prj[k], 0]; }              /* PROJECT */
      case 15: return [smp.length, 512, ...smp.flatMap((x) => [x.z, ...enc.s(x.n), x.k])];                            /* SMP_INFO */
      case 14: { if (a[0] < smp.length) smp[a[0]] = { z: 0, n: "", k: 0 }; return [a[0], 0]; }                      /* SMP_ERASE */
      case 11: return [a[0], a[0] < smp.length ? 0 : 1];                                                             /* SMP_BEGIN */
      case 12: return [a[0], a[1], a[2], a[3], 0];                                                                   /* SMP_WRITE */
      case 13: { const h = unpack7(a.slice(1)), len = h[16] | (h[17] << 8) | (h[18] << 16);                          /* SMP_END */
        smp[a[0]] = { z: h[6], n: String.fromCharCode(...h.slice(8, 16).filter((c) => c)).trim(), k: Math.ceil((len + 512) / 1024) }; return [a[0], 0]; }
      case 72: return [4, 2, 1, ...["808", "909", "LOFI", "PERC"].flatMap(enc.s), ...enc.s("MI KIT"), 0, ...enc.s(""), 0];   /* DSYN_LIST */
      case 76: return [0];                                                                                          /* DSYN_PLAY */
      case 34: return [0, 6, ...[0, 1, 2, 3, 4, 5].flatMap((id) => [id, ...u35e(1464 * (id + 1)), ...u35e(0x1234 * (id + 3))])];   /* BK_LIST */
      case 93: return [a[0] || 0, 0, ...mseqSt.map((v) => v + 8)];                                                   /* MSEQ_GET */
      case 94: mseqSt = a.slice(1, 65).map((v) => v - 8); return [a[0], 0];                                         /* MSEQ_PUT */
      case 95: { const u = (v) => [v & 127, (v >> 7) & 127, (v >> 14) & 127];                                       /* TUNE_GET */
        return [0, tune.sys, tune.root, tune.n, ...u(tune.period), ...tune.deg.slice(1).flatMap(u)]; }
      case 96: { const u = (k) => a[k] | (a[k + 1] << 7) | (a[k + 2] << 14);                                         /* TUNE_PUT */
        tune.sys = a[0]; tune.root = a[1]; tune.n = a[2]; tune.period = u(3); tune.deg = [0, ...Array.from({ length: tune.n - 1 }, (_, i) => u(6 + 3 * i))]; return [0]; }
      case 21: { if (a[0] < 32 && ups[a[0]]) { ups[a[0]] = null; relist(); } return [a[0], 0]; }                    /* UP_ERASE */
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
      if (!pg.scope && !m.edited) { m.edited = 1; push(C.EDITED, [1]); }
    }, 1400);
  }, 7000);
  return { send: (bytes) => { const f = unframe(bytes); if (!f) return; const r = answer(f.cmd, f.a); if (r) setTimeout(() => onFrame(frame(f.cmd, r)), 6); }, name: "FM-1 (ejemplo)" };
}

/* ----------------------------------------------------------- the state --- */
/* M: what the FM-1 says. S: what this screen shows */
const M = { edited: false, link: null, info: null, pdesc: [], gdesc: [], xdesc: [], x: [], state: null, rec: 0, p: [], g: [], engine: 0, preset: 0, list: [], favs: [], favCur: -1, page: null, homeIds: [127, 127, 127, 127], mock: false };
const S = { folder: "LIVE", follow: true, hot: new Map() };
const FAM = { 0: "HOME", 1: "ENV", 2: "LFO", 3: "FX", 4: "SEL", 5: "EDIT", 6: "GLO", 7: "SAVE", 8: "ARP", 9: "SEQ" };
const NAV = [["LIVE", "play"], ["HOME", "home"], ["EDIT", "edit"], ["ENV", "env"], ["LFO", "lfo"], ["FX", "fx"], ["SEL", "sel"], ["ARP", "arp"], ["SEQ", "seq"], ["REC", "rec"], ["GLO", "glo"], ["SAVE", "save"], ["ESTUDIO", "studio"]];
const ICON = { HOME: "home", EDIT: "edit", ENV: "env", LFO: "lfo", FX: "fx", SEL: "sel", ARP: "arp", SEQ: "seq", GLO: "glo", SAVE: "save" };
const LAYOUT = JSON.parse($("mockdata").textContent).pages;     /* the device's pages (params.c PAGES), as the firmware lays them out */
const desc = (s, id) => (s === 3 ? M.xdesc[id] : s ? M.gdesc[id] : M.pdesc[id]);   /* (3: a synth page's X_*) */
const val = (s, id) => (s === 3 ? M.x[id] : s ? M.g[id] : M.p[id]);
const keyOf = (s, id) => s + ":" + id;
const frac = (d, v) => (d && d.max > d.min ? (Math.max(d.min, Math.min(d.max, v)) - d.min) / (d.max - d.min) : 0);
const entryNow = () => (M.page && M.page.cur != null ? M.page.cur : M.list.findIndex((x) => x.e === M.engine && x.k === M.preset));

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
    M.midiOut = pr.output;                           /* (the panic's all notes off: plain MIDI on the same port) */
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
  $("gate").classList.remove("hide"); document.body.classList.add("off"); $("cstate").textContent = "Sin conectar";
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
    await readList();
    await readSound(true);
    await readX();
    try { sqPlayFrom(await rq(C.PLAY, [], { quiet: true, retries: 0, timeout: 500 })); } catch (e) { /* (older firmware) */ }
    await readFavs();
    await rq(C.WATCH, [3]);
    progress(1);
    $("gate").classList.add("hide"); document.body.classList.remove("off");
    $("cstate").textContent = M.mock ? "Datos de ejemplo" : "Conectado  USB MIDI";
    $("conn").classList.remove("off");
    keepAlive();
    if (NAV.some(([n]) => n === QS.get("folder"))) S.folder = QS.get("folder");   /* (?folder= ?mode=edit ?br=1 ?save=1: to open a view straight away) */
    if (QS.get("stab")) STU.tab = QS.get("stab");                                   /* (captures: an Estudio tab) */
    renderAll(); renderTransport(); pollState();
    if (QS.get("mode") === "edit") { S.folder = "HOME"; renderNav(); renderWork(); }   /* (compatibilidad con el enlace viejo) */
    if (QS.get("br") === "1") openBrowser(true);
    if (QS.get("follow") === "0") { S.follow = false; $("follow").setAttribute("aria-pressed", "false"); }   /* (captures: the example FM-1 turns pages) */
    if (QS.get("at")) setTimeout(() => document.querySelector(`#edit [data-title="${CSS.escape(QS.get("at"))}"]`)?.scrollIntoView({ block: "start" }), 600);   /* (captures: a page of the folder) */
    if (QS.get("save") === "1") openSave(true);
  } catch (e) {
    console.error(e);
    say(e.message === "closed" ? "Se cerró la conexión." : "No pude leer el FM-1: " + e.message, true);
  }
}
async function descOrNull(s, i) { try { return P.desc(await rq(C.DESC, [s, i])); } catch (e) { if (e.message === "closed") throw e; return null; } }
async function readSound(full) {
  const was = M.engine, pe0 = M.info.pe0, d = P.dump(await rq(C.DUMP), M.info);
  if (d.engine !== was || d.preset !== M.preset) LOG.length = 0;
  M.engine = d.engine; M.preset = d.preset; M.p = d.p; M.g = d.g;
  if (full || d.engine !== was) for (let k = 0; k < 8; k++) M.pdesc[pe0 + k] = await descOrNull(0, pe0 + k);
  M.page = P.page(await rq(C.PAGE));
  if (M.page.homeIds) M.homeIds = M.page.homeIds;
  M.edited = !!M.page.edited;
  if (!M.edited || !M.orig || d.engine !== was || d.preset !== M.orig.preset) M.orig = { preset: d.preset, p: M.p.slice() };   /* (the sound as loaded: double tap) */
}
async function readList() {
  const list = [];
  for (;;) { const r = P.list(await rq(C.LIST, [...u14(list.length), 16])); list.push(...r.items); progress(.8 + .15 * list.length / Math.max(1, r.total)); if (list.length >= r.total || !r.items.length) break; }
  M.list = list;
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
      logChange(s, id, old, v, "sinte");
    } else if (f.cmd === C.RELOAD) { SQ.loaded = false; reloadSoon(); xSoon(); }
    else if (f.cmd === C.STEP_CHANGED) sqStepChanged(f.a[0]);
    else if (f.cmd === C.PLAY) { sqOnPlay(f.a); if (f.a.length > 3) M.rec = f.a[3]; renderTransport(); if (S.folder === "REC") paintRec(); }
    else if (f.cmd === C.X_CHANGED) xSoon();
    else if (f.cmd === C.FAVS_CHANGED) readFavs().then(renderBar).catch(() => {});
    else if (f.cmd === C.EDITED) { M.edited = !!f.a[0]; renderBar(); }
    else if (f.cmd === C.SCOPE) scopeFrame(f.a);
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
  if (S.folder === "LIVE") { renderNav(); return; }   /* LIVE se queda: el riel y la barra ya dicen qué abrió el sinte */
  if (pg.home) { if (S.folder !== "HOME") { S.folder = "HOME"; renderAll(); } flashRow("HOME"); return; }
  const folder = FAM[pg.fam];
  if (folder === "SAVE") { const k = pg.title === "FAVS" ? "FAVS" : pg.title === "USER" ? "USER" : null; if (k) SV.kind = k; if (S.folder !== "SAVE") { S.folder = "SAVE"; renderAll(); } else renderWork(); return; }
  if (!folder || folder === "HOME") return;
  if (S.folder !== folder) { S.folder = folder; renderAll(); } else renderNav();
  flashRow(pg.title);
}
function flashRow(title) {
  const all = document.querySelectorAll(`#edit [data-title="${CSS.escape(title)}"]`), r = all[0];   /* (a page: its module, its tiles) */
  document.querySelectorAll("#edit .dev").forEach((x) => x.classList.remove("dev"));
  if (!r) return;
  all.forEach((x) => { x.classList.add("dev"); x.classList.remove("flash"); void x.offsetWidth; x.classList.add("flash"); });
  r.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function fromDevice(s, id, old, v) {
  const d = desc(s, id); if (!d) return;
  const pg = M.page, k = pg && !pg.home && pg.scope === s ? pg.ids.indexOf(id) : pg && pg.home && !s ? M.homeIds.indexOf(id) : -1;
  const a = fmtValue(d, old), b = fmtValue(d, v);
  toast(k, `${k >= 0 ? `<b>KNOB ${k + 1}</b> ` : ""}${esc(d.label)} <span class="num">${esc(a[0] + a[1])} → ${esc(b[0] + b[1])}</span>`);
  document.querySelectorAll(`.tl[data-tl="${keyOf(s, id)}"],[data-cell="${keyOf(s, id)}"],.mt[data-mt="${keyOf(s, id)}"],.arc[data-k="${keyOf(s, id)}"]`).forEach((el) => { el.classList.add("hot"); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove("hot"), 1600); });
}

/* ------------------------------------------------------------ what we send --- */
const sets = new Map();          /* key -> performance.now() of the last user change: the device's echo is not taken */
const touched = (k) => performance.now() - (sets.get(k) || 0) < 600;
function setVal(s, id, v) {
  const d = desc(s, id); if (!d || !M.link) return;
  v = Math.max(d.min, Math.min(d.max, Math.round(v)));
  if (val(s, id) === v && !(s === 3 && isGo(d))) return;
  if (s === 3) { setX(id, v); return; }
  if (!undoing) logChange(s, id, val(s, id), v, "tablet");
  (s ? M.g : M.p)[id] = v;
  sets.set(keyOf(s, id), performance.now());
  paintValue(s, id);
  rq(C.SET, [s, id, ...v14(v)], { key: "set:" + keyOf(s, id) }).then((a) => {
    const r = P.set(a);
    if (!touched(keyOf(s, id)) && r.value !== val(s, id)) { (s ? M.g : M.p)[id] = r.value; paintValue(s, id); }
  }).catch(() => {});
}

/* ---- the synth pages (X_*, Live 109..111): read them all (a few dozen), again when the device says they changed */
const isGo = (d) => d && d.names && d.names.length === 2 && d.names[1] === "GO";
const xIds = () => [...new Set(LAYOUT.filter((p) => p.scope === 3).flatMap((p) => p.ids.filter((i) => i < 127)))];
async function readX() {
  for (const i of xIds()) { try { const o = P.x(await rq(C.X_GET, [i], { quiet: true, retries: 0, timeout: 500 })); if (o.id === i) { M.xdesc[i] = o; M.x[i] = o.v; } } catch (e) { if (e.message === "closed") throw e; } }
  const snd = M.xdesc[1];                                  /* (LAYER's SOUND: a place in the list, shown by its name) */
  if (snd && snd.label === "SOUND" && M.list.length) { snd.names = M.list.slice(0, snd.max - snd.min + 1).map((x) => x.name); snd.fmt = F.ENUM; }
}
let xT = 0;
function xSoon() { clearTimeout(xT); xT = setTimeout(async () => { try { await readX(); delete PCD.mseq; renderWork(); renderDev(); } catch (e) { /* the next push */ } }, 90); }
function setX(id, v) {
  M.x[id] = v; sets.set(keyOf(3, id), performance.now()); paintValue(3, id);
  rq(C.X_SET, [id, ...v14(v)], { key: "x:" + id }).then((a) => { const o = P.x(a); if (o.id === id) { M.xdesc[id] = o; M.x[id] = o.v; } xSoon(); }).catch(() => {});
}
/* the device's state, every 1.5 s: CPU, LATE, PEAK, the scale's notes, REC */
async function pollState() {
  if (!M.link || !M.info) return;
  try { const st = P.state(await rq(C.STATE, [], { key: "state", quiet: true, retries: 0, timeout: 500 })); const scaleCh = !M.state || M.state.scale !== st.scale;
    M.state = st; M.rec = st.rec; renderTransport(); if (scaleCh && (S.folder === "SEL")) renderWork(); if (S.folder === "REC") paintRec(); } catch (e) { /* (an older firmware: no STATE) */ }
}
setInterval(pollState, 1500);

/* ----------------------------------------------------------------- views --- */
function paintValue(s, id) {
  if (!s && MX.includes(id)) document.querySelector(`.mxr[data-src="${id}"]`)?.classList.toggle("off", !val(0, id));
  paintTile(s, id);
  paintCards(s, id);
  renderDev();
  renderTransport();                                       /* (the bar: BPM, TRN) */
}
/* RÁPIDO: what a player reaches for. Each tile's colour: the knob that turns it on its page of the FM-1. s: 0 the sound, 1 global.
   kind: toggle (its off value <-> the last value it had), amount (0 <-> the last level; a bar), bipolar (0 <-> the last; a bar from
   the centre), nudge (buttons that add; 0 <-> the last), choice (arrows only), tempo (- TAP +), panic (all notes off) */
const QUICK = [
  ["Interpretación", [
    { id: 17, name: "Arpegiador", kind: "toggle", on: 1, k: 0, step: true, page: "ARP" },
    { id: 18, name: "Velocidad", kind: "choice", k: 1, note: () => "Del arpegio" },
    { id: 23, name: "Latch", kind: "toggle", on: 1, k: 2, note: () => (val(0, 17) ? "Mantiene el arpegio" : "Mantiene las notas") },
    { id: 49, name: "Acordes", kind: "toggle", on: 1, k: 3, step: true, page: "SEL" },
    { id: 27, name: "Escala", kind: "toggle", on: 2, k: 2, step: true, note: () => `${fmtValue(desc(0, 25), val(0, 25))[0]} ${fmtValue(desc(0, 26), val(0, 26))[0]}` },
    { id: 28, name: "Transponer", kind: "nudge", on: 12, k: 0, steps: [-12, -1, 1, 12], note: () => "Octava y semitono" }]],
  ["Sonido y efectos", [
    { id: 50, name: "Filtro", kind: "bipolar", on: -24, k: 0, note: () => "LP ← OFF → HP" },
    { id: 33, name: "Distorsión", kind: "amount", on: 40, k: 0, page: "FX" },
    { id: 34, name: "Chorus", kind: "amount", on: 50, k: 1, page: "FX" },
    { id: 35, name: "Delay", kind: "amount", on: 40, k: 2, page: "FX" },
    { id: 36, name: "Reverb", kind: "amount", on: 50, k: 3, page: "FX" },
    { id: 78, name: "Insert", kind: "toggle", on: 1, k: 0, step: true, page: "INSERT" }]],
  ["Global", [
    { id: 37, name: "Voces", kind: "choice", k: 0, page: "VOICE" },
    { id: 38, name: "Glide", kind: "amount", on: 40, k: 1, page: "VOICE" },
    { id: 0, s: 1, name: "Tempo", kind: "tempo", k: 0, note: () => "Toca TAP al pulso" },
    { id: -1, name: "Pánico", kind: "panic", k: 3, note: () => "Corta las notas colgadas" }]],
];
const qkey = (q) => keyOf(q.s || 0, q.id);
const QSPEC = new Map(QUICK.flatMap(([, items]) => items.map((q) => [qkey(q), q])));
const remember = new Map();                          /* key -> the value it had before it was switched off */
const qd = (q) => desc(q.s || 0, q.id), qv = (q) => val(q.s || 0, q.id);
const qRest = (q) => (q.kind === "amount" || q.kind === "bipolar" || q.kind === "nudge" ? 0 : qd(q).min);
const qOn = (q) => q.kind === "choice" || q.kind === "tempo" || (q.kind !== "panic" && qd(q) && qv(q) !== qRest(q));
function tileInner(q) {
  if (q.kind === "panic") return `<button class="tg" data-panic="1" aria-label="Pánico: cortar todas las notas"><span class="t"><b>${esc(q.name)}</b></span>
    <span class="v">STOP</span><span class="s">${esc(q.note())}</span></button>`;
  const d = qd(q); if (!d) return "";
  const v = qv(q), on = qOn(q), [t, u] = fmtValue(d, v), key = qkey(q), note = q.note ? q.note(on) : q.page || "";
  let foot = "";
  if (q.kind === "amount" || q.kind === "bipolar") {
    const f = frac(d, v), z = q.kind === "bipolar" ? frac(d, 0) : 0, lo = Math.min(f, z), hi = Math.max(f, z);
    foot = `<div class="amt${q.kind === "bipolar" ? " bi" : ""}" data-amt="${key}" role="slider" aria-label="${esc(q.name)}: nivel" aria-valuenow="${v}" aria-valuemin="${d.min}" aria-valuemax="${d.max}" tabindex="0">
      <b style="left:${lo * 100}%;width:${(hi - lo) * 100}%"></b><i style="left:calc(${f * 100}% - 1px)"></i></div>`;
  } else if (q.kind === "nudge") {
    foot = `<div class="stp">${q.steps.map((n) => `<button data-qn="${key}" data-d="${n}" aria-label="${esc(q.name)} ${n > 0 ? "+" : ""}${n}">${n > 0 ? "+" : "−"}${Math.abs(n)}</button>`).join("")}</div>`;
  } else if (q.kind === "tempo") {
    foot = `<div class="stp"><button data-qn="${key}" data-d="-1" aria-label="Tempo −1">−</button><button class="tap" data-tap="1">TAP</button><button data-qn="${key}" data-d="1" aria-label="Tempo +1">+</button></div>`;
  } else if (q.kind === "choice" || q.step) {
    foot = `<div class="stp"><button data-qstep="${key}" data-d="-1" aria-label="${esc(q.name)}: anterior"><svg class="i"><use href="#i-prev"/></svg></button>
      <button data-qstep="${key}" data-d="1" aria-label="${esc(q.name)}: siguiente"><svg class="i"><use href="#i-next"/></svg></button></div>`;
  }
  const top = `<span class="t"><b>${esc(q.name)}</b>${q.kind === "choice" || q.kind === "tempo" ? "" : `<i class="led" aria-hidden="true"></i>`}</span>
    <span class="v">${esc(t)}${u ? `<small>${esc(u)}</small>` : ""}</span><span class="s">${esc(note)}</span>`;
  return (q.kind === "choice" || q.kind === "tempo" ? `<div class="tg">${top}</div>` : `<button class="tg" role="switch" aria-checked="${on}" data-qtog="${key}" aria-label="${esc(q.name)}: ${on ? "encendido" : "apagado"}">${top}</button>`) + foot;
}
const tile = (q) => `<section class="tl${qOn(q) ? " on" : ""}${q.kind === "panic" ? " panic" : ""}" style="--c:${KC[q.k]}" data-tl="${qkey(q)}">${tileInner(q)}</section>`;
function paintTile(s, id) {
  const keys = [keyOf(s, id)];
  if (!s && id === 17) keys.push(keyOf(0, 23));
  if (!s && (id === 25 || id === 26)) keys.push(keyOf(0, 27));
  keys.forEach((k) => { const el = document.querySelector(`.tl[data-tl="${k}"]`), q = QSPEC.get(k); if (!el || !q || (amtOn && el.contains(amtOn))) return;
    el.classList.toggle("on", qOn(q)); el.innerHTML = tileInner(q); });
}
const qset = (q, v) => { setVal(q.s || 0, q.id, v); paintTile(q.s || 0, q.id); };
function quickToggle(key) {
  const q = QSPEC.get(key); if (!q || !qd(q)) return;
  if (qOn(q)) { remember.set(key, qv(q)); qset(q, qRest(q)); } else qset(q, remember.get(key) ?? q.on);
}
function quickStep(key, dir) {
  const q = QSPEC.get(key), d = q && qd(q); if (!d) return;
  const lo = q.kind === "toggle" ? d.min + 1 : d.min;              /* (a switch's choices: never its OFF) */
  let v = qv(q);
  v = v < lo ? lo : v + dir > d.max ? lo : v + dir < lo ? d.max : v + dir;
  qset(q, v);
}
function quickNudge(key, n) { const q = QSPEC.get(key); if (q && qd(q)) qset(q, qv(q) + n); }
/* tap tempo: the mean of the last taps (a pause of 2 s starts over) */
const taps = [];
function tapTempo() {
  const now = performance.now();
  if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
  taps.push(now); if (taps.length > 5) taps.shift();
  if (taps.length < 2) { toast(-1, "Sigue tocando TAP al pulso"); return; }
  const bpm = Math.round(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
  const q = QSPEC.get(keyOf(1, 0)); qset(q, bpm);
  toast(-1, `<b>Tempo</b> <span class="num">${qv(q)} BPM</span>`);
}
/* all notes off on every channel (MIDI, not the editor's SysEx): what a stuck note needs */
function panic() {
  if (M.midiOut) for (let ch = 0; ch < 16; ch++) { M.midiOut.send([0xB0 | ch, 123, 0]); M.midiOut.send([0xB0 | ch, 120, 0]); }
  toast(-1, "<b>Pánico</b> todas las notas cortadas");
}

const again = (el, c) => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };
const fade = () => { again($("edit"), "fade"); setTimeout(() => $("edit").classList.remove("fade"), 240); };
function renderWork() {
  $("edit").dataset.folder = S.folder;   /* (no data-f: la barra de abajo busca [data-f] hacia arriba y se comería todos los toques) */
  const f = S.folder;
  if (f !== "ESTUDIO") SQ.full = false;                     /* (the advanced sequencer: Estudio's) */
  $("edit").innerHTML = f === "ESTUDIO" ? studioView() : f === "SAVE" ? soundsView() : f === "LIVE" ? cfgView("live", "Live") : f === "HOME" ? homeView() : f === "REC" ? recView()
    : f === "SEQ" ? `<div class="pgs">${seqBlock()}${LAYOUT.filter((x) => x.title === "PATTERN").map((x) => pageRow({ title: x.title, folder: "SEQ", s: x.scope, ids: x.ids })).join("")}</div>`
    : folderView(f);
}
function flashRowQuiet(title) { document.querySelectorAll(`#edit [data-title="${CSS.escape(title)}"]`).forEach((r) => r.classList.add("dev")); }
function renderWhere() { $("where").textContent = !M.page ? "" : M.page.home ? "HOME" : M.page.title; renderNav(); renderDev(); }
function renderNav() {
  const dev = M.page ? (M.page.home ? "HOME" : FAM[M.page.fam]) : "";
  $("nav").innerHTML = NAV.map(([n, ic]) => `<button class="nb${n === dev ? " dev" : ""}${n === "ESTUDIO" ? " est" : ""}" ${n === S.folder ? 'aria-current="page"' : ""} data-f="${n}"><svg class="i"><use href="#i-${ic}"/></svg>${n}</button>`).join("");
}
function renderMeta() {                                   /* (the sound edited: keep it or go back, by the changes) */
  const n = entryNow();
  $("metal").innerHTML = M.edited ? `<span class="edtx">Editado</span><button class="btn" data-save="1"><svg class="i"><use href="#i-disk"/></svg>Guardar</button>${n >= 0 ? `<button class="btn" data-discard="1"><svg class="i"><use href="#i-undo"/></svg>Descartar</button>` : ""}` : "";
}
function renderBar() {
  const n = entryNow(), x = M.list[n], fav = M.favCur >= 0;
  $("name").textContent = x ? x.name : (M.info.engines[M.engine] || "") + " " + (M.preset + 1);
  $("now").classList.toggle("edited", M.edited); $("saveb").classList.toggle("ed", M.edited);
  $("now").setAttribute("aria-label", `${$("name").textContent}${M.edited ? ", editado" : ""}: abrir sonidos`);
  $("meta").innerHTML = `<span class="k">${esc(x ? x.kind : "USER")}</span><span class="e">${esc(M.info.engines[M.engine] || "")}</span><span class="num">${n >= 0 ? n + 1 : "--"}/${M.list.length}</span>`;
  $("favt").classList.toggle("fav", fav); $("favt").setAttribute("aria-pressed", fav);
  $("fcount").textContent = `${M.favs.length}/16`;
  $("favs").innerHTML = M.favs.map((f, i) => `<button class="fv" role="listitem" data-favgo="${i}" aria-current="${i === M.favCur}"><span class="i">${String(i + 1).padStart(2, "0")}</span>
    <span class="n">${esc(f.name)}</span><span class="k">${esc(f.kind)} <span class="e">${esc(M.info.engines[f.e] || "USER")}</span></span></button>`).join("");
  renderMeta(); renderLog();
  if (B.open) renderBrowser();
  if (S.folder === "SAVE") renderWork();
}
function renderAll() { renderBar(); renderWhere(); renderWork(); }

/* ------------------------------------------------------------- the browser --- */
const KINDS = ["BASS", "KEYS", "ORGN", "PAD", "LEAD", "PLCK", "STAB", "FX", "USER"];
const B = { kind: "BASS", open: false };
function renderBrowser() {
  const kinds = KINDS.filter((k) => k === "USER" || M.list.some((x) => x.kind === k));   /* (USER always, even empty) */
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
      <span class="m">${B.kind === "ALL" || B.kind === "FAVS" ? `<span class="k">${esc(o.x.kind)}</span>` : ""}<span class="e">${esc(M.info.engines[o.x.e] || "USER")}</span>${f ? '<svg class="i st"><use href="#i-star"/></svg>' : ""}</span></button>`; }).join("");
  if (!items.length && B.kind === "USER") $("snds").innerHTML = `<p class="pce">Todavía no hay sonidos de usuario. Guarda uno con <b>Guardar</b>: el FM-1 tiene 32 ranuras.</p>`;
}
function openBrowser(on, kind) {
  B.open = on;
  if (on) { const x = M.list[entryNow()]; B.kind = kind || (x ? x.kind : "BASS"); renderBrowser(); }
  $("br").classList.toggle("on", on); $("scrim").classList.toggle("on", on); $("now").setAttribute("aria-expanded", on);
  if (on) setTimeout(() => ($("snds").querySelector('[aria-current="true"]') || $("snds").querySelector(".sd"))?.focus(), 50);
}

/* ------------------------------------------------- SAVE: the sounds, a view --- */
/* Every folder at once down the side; the sound that plays on top with what can be done to it (a favourite, its edits
   discarded, the one before or after it in its folder); the folder's sounds as cards. Favourites: the 16 slots, the
   free ones too */
const SV = { kind: null }, US = { slots: null, busy: false };   /* (USER: the 32 slots, read when shown) */
const favKey = (x) => x.e + ":" + x.k + ":" + x.name;
function svItems(kind) {
  if (kind === "FAVS") return M.favs.map((f, i) => ({ fav: i, x: f, n: M.list.findIndex((y) => favKey(y) === favKey(f)) }));
  return M.list.map((x, n) => ({ x, n })).filter((o) => kind === "ALL" || o.x.kind === kind);
}
function soundsView() {
  const n = entryNow(), x = M.list[n], fav = M.favCur >= 0;
  if (!SV.kind) SV.kind = x ? x.kind : "FAVS";
  const kinds = ["FAVS", "ALL", ...KINDS.filter((k) => k !== "USER" && M.list.some((y) => y.kind === k)), "USER"];   /* (USER always: its 32 slots) */
  if (SV.kind === "USER" && !US.slots && !US.busy) { US.busy = true; readSlots().then((v) => { US.slots = v; }, () => { US.slots = []; }).finally(() => { US.busy = false; if (S.folder === "SAVE") renderWork(); }); }
  const cnt = (k) => (k === "FAVS" ? `${M.favs.length}/16` : k === "USER" ? `${M.list.filter((y) => y.kind === "USER").length}/32` : svItems(k).length);
  const items = svItems(SV.kind), favs = new Set(M.favs.map(favKey)), inKind = x ? svItems(x.kind) : [], at = inKind.findIndex((o) => o.n === n);
  const name = x ? x.name : (M.info.engines[M.engine] || "") + " " + (M.preset + 1);
  const card = (o) => { const f = favs.has(favKey(o.x)), cur = o.n === n && n >= 0;
    return `<button class="sc${cur ? " cur" : ""}" role="listitem" ${o.fav != null ? `data-favgo="${o.fav}"` : `data-load="${o.n}"`} aria-current="${cur}">
      <span class="sn">${o.fav != null ? `<span class="fi num">${String(o.fav + 1).padStart(2, "0")}</span>` : ""}${esc(o.x.name)}${f && o.fav == null ? '<svg class="i st" aria-label="favorito"><use href="#i-star"/></svg>' : ""}</span>
      <span class="sm">${SV.kind === "ALL" || SV.kind === "FAVS" ? `<span class="k">${esc(o.x.kind)}</span>` : ""}<span class="e">${esc(M.info.engines[o.x.e] || "USER")}</span><span class="num">${o.n >= 0 ? o.n + 1 : ""}</span></span></button>`; };
  const uslot = (u, k) => { const m = M.list.findIndex((y) => y.e === M.info.nengines && y.k === k), cur = m === n && n >= 0;
    return u.used ? `<button class="sc${cur ? " cur" : ""}" role="listitem" ${m >= 0 ? `data-load="${m}"` : ""} aria-current="${cur}"><span class="sn"><span class="fi num">${upLabel(k)}</span>${esc(u.name)}</span><span class="sm"><span class="e">${esc(M.info.engines[u.e] || "")}</span></span></button>`
      : `<div class="sc free" role="listitem"><span class="sn"><span class="fi num">${upLabel(k)}</span>Libre</span><span class="sm">Guarda aquí con Guardar</span></div>`; };
  const userBody = SV.kind === "USER" ? (US.slots ? US.slots.map(uslot).join("") : `<p class="pce">Leyendo las ranuras de usuario del FM-1…</p>`) : null;
  const free = SV.kind === "FAVS" ? Array.from({ length: 16 - M.favs.length }, (_, i) => `<div class="sc free" role="listitem"><span class="sn"><span class="fi num">${String(M.favs.length + i + 1).padStart(2, "0")}</span>Libre</span><span class="sm">Carga un sonido y márcalo con la estrella</span></div>`).join("") : "";
  return `<div class="sv">
    <div class="svl"><nav class="svk" aria-label="Carpetas de sonidos">${kinds.map((k) => `<button class="kf${k === "FAVS" ? " fk" : ""}" data-skind="${k}" aria-current="${SV.kind === k}"><span>${k === "FAVS" ? "Favoritos" : k === "ALL" ? "Todos" : k}</span><span class="num">${cnt(k)}</span></button>`).join("")}</nav>
      <h3 class="svg2">Dispositivo</h3>
      <nav class="svk" aria-label="Dispositivo">${DEV.map(([k, t]) => `<button class="kf" data-skind="${k}" aria-current="${SV.kind === k}"><span>${t}</span></button>`).join("")}</nav>
      ${toolsHtml()}</div>
    <div class="svm">
      <section class="svc${M.edited ? " edited" : ""}"><div class="svn"><span class="c">Suena ahora</span><b>${esc(name)}</b>
        <span class="m">${x ? `<span class="k">${esc(x.kind)}</span>` : ""}<span class="e">${esc(M.info.engines[M.engine] || "USER")}</span><span class="num">${n >= 0 ? `${n + 1}/${M.list.length}` : ""}</span>${M.edited ? '<span class="edtx">Editado</span>' : ""}</span></div>
        <div class="sva">
          <button class="btn pri2${M.edited ? " ed" : ""}" data-save="1"><svg class="i"><use href="#i-disk"/></svg>Guardar</button>
          <button class="btn${fav ? " on" : ""}" data-svfav="1"><svg class="i"><use href="#i-star"/></svg>${fav ? `Favorito ${M.favCur + 1}: quitar` : "Marcar como favorito"}</button>
          ${M.edited && n >= 0 ? `<button class="btn" data-discard="1"><svg class="i"><use href="#i-undo"/></svg>Descartar lo editado</button>` : ""}
          <div class="alg">${at >= 0 ? `<button class="btn" data-load="${inKind[(at - 1 + inKind.length) % inKind.length].n}"><svg class="i"><use href="#i-prev"/></svg>Anterior en ${esc(x.kind)}</button><button class="btn" data-load="${inKind[(at + 1) % inKind.length].n}">Siguiente<svg class="i"><use href="#i-next"/></svg></button>` : ""}</div>
          ${x && x.e === M.info.nengines
            ? `<button class="btn" data-save="1"><svg class="i"><use href="#i-edit"/></svg>Renombrar</button>`
            : ""}
          ${x && x.e === M.info.nengines ? `<button class="btn dsc2" data-pc="up-erase" data-n="${x.k}">Borrar</button>` : ""}</div></section>
      ${DEV.some(([k]) => k === SV.kind)
        ? `<header class="svh"><h2>${DEV.find(([k]) => k === SV.kind)[1]}</h2></header>${devView(SV.kind)}`
        : `<header class="svh"><h2>${SV.kind === "FAVS" ? "Favoritos" : SV.kind === "ALL" ? "Todos los sonidos" : SV.kind === "USER" ? "Sonidos de usuario" : esc(SV.kind)}</h2><span class="c num">${SV.kind === "FAVS" ? `${M.favs.length} de 16` : SV.kind === "USER" ? `${items.length} de 32` : `${items.length} sonidos`}</span></header>
      <div class="scs" role="list">${userBody != null ? userBody : items.map(card).join("") + free}</div>`}
    </div></div>`;
}

/* SAVE > TOOLS, as on the device (CLRSQ, INIT, NEW), each a second tap within 3 s to act (the device's two detents) */
const TOOLS = [["CLRSQ", "Borrar el patrón"], ["INIT", "Iniciar el sonido"], ["NEW", "Proyecto nuevo"]];
const toolArm = { id: -1, t: 0 };
function toolsHtml() {
  const pg = LAYOUT.find((x) => x.title === "TOOLS"); if (!pg) return "";
  const lv = M.page && !M.page.home && M.page.title === "TOOLS";
  const btn = ([lab, what]) => { const id = pg.ids.find((i) => i < 127 && desc(1, i) && desc(1, i).label === lab); if (id == null) return "";
    const arm = toolArm.id === id; return `<button class="tool${arm ? " arm" : ""}" data-tool="${id}"><b>${lab}</b><span>${arm ? "Toca otra vez para confirmar" : what}</span></button>`; };
  return `<section class="tools${lv ? " dev" : ""}" data-title="TOOLS" aria-label="TOOLS"><h3>TOOLS</h3>${TOOLS.map(btn).join("")}</section>`;
}
async function toolTap(id) {
  if (toolArm.id !== id) {
    toolArm.id = id; clearTimeout(toolArm.t);
    const off = (e) => { if (e.target.closest(`[data-tool="${id}"]`)) return;
      toolArm.id = -1; document.removeEventListener("pointerdown", off, true); if (S.folder === "SAVE") renderWork(); };
    setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
    renderWork(); return;
  }
  toolArm.id = -1; clearTimeout(toolArm.t); renderWork();
  const lab = desc(1, id).label;
  try {
    const r = await rq(C.TOOL, [id], { timeout: 2000, retries: 0 });
    toast(-1, r[1] === 0 ? `<b>${esc(lab)}</b> hecho` : r[1] === 3 ? "Para la reproducción primero" : r[1] === 1 && lab === "INIT" ? "La pista de batería no tiene sonido que iniciar" : "El FM-1 no lo hizo");
  } catch (e) { toast(-1, "El FM-1 no contestó"); }
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-tool]"); if (b) toolTap(+b.dataset.tool); });

/* ------------------------------------------- the left rail: the device's page --- */
/* its four knobs as the FM-1 shows them now (a tap on its name opens its folder here) */
function renderDev() {
  const pg = M.page; if (!pg || !M.info) return;
  const s = pg.home ? 0 : pg.scope, ids = pg.home ? M.homeIds : pg.ids, folder = pg.home ? "HOME" : FAM[pg.fam] || "";
  const k4 = s < 2 ? ids.map((id, k) => { const d = id < 127 && desc(s, id); if (!d) return `<div class="dk off"><span class="l">KNOB ${k + 1}</span><span class="v">–</span></div>`;
    const v = val(s, id); return `<div class="dk" style="--c:${KC[k]};${fillVars(d, v)}"><span class="l"><i></i>${esc(d.label)}</span><span class="v num">${valHtml(d, v)}</span><span class="b"></span></div>`; }).join("") : "";
  $("dvp").innerHTML = `<button class="dvh" data-f="${folder}" aria-label="Abrir ${esc(folder)}"><span class="c">En el sinte</span><b>${esc(pg.home ? "HOME" : pg.title)}</b><span class="f">${esc(folder)}</span></button>
    ${k4 ? `<div class="dvk">${k4}</div>` : `<p class="dvn">Esta página se usa en el sinte.</p>`}`;
}

/* -------------------------------------- the left rail: what changed, undoable --- */
const LOG = [];
let undoing = false;
const kOf = (s, id) => { const p = LAYOUT.find((x) => x.scope === s && x.ids.includes(id)); return p ? p.ids.indexOf(id) : 0; };
function logChange(s, id, old, v, src) {
  const now = performance.now(), top = LOG[0];
  if (top && top.s === s && top.id === id && top.src === src && now - top.t < 2500) { top.v = v; top.t = now; if (top.v === top.old) LOG.shift(); }
  else LOG.unshift({ s, id, old, v, src, t: now });
  if (LOG.length > 24) LOG.length = 24;
  renderLog();
}
function renderLog() {
  if (!M.info) return;
  $("chl").innerHTML = LOG.length ? LOG.map((e, i) => { const d = desc(e.s, e.id); if (!d) return ""; const a = fmtValue(d, e.old), b = fmtValue(d, e.v);
    return `<div class="lg" role="listitem" style="--c:${KC[kOf(e.s, e.id)]}"><span class="l"><i></i>${esc(d.label)}<em>${e.src === "sinte" ? "en el sinte" : "aquí"}</em></span>
      <span class="vv num">${esc(a[0] + a[1])} → ${esc(b[0] + b[1])}</span><button class="ud" data-undo="${i}" aria-label="Deshacer ${esc(d.label)}: volver a ${esc(a[0] + a[1])}"><svg class="i"><use href="#i-undo"/></svg></button></div>`; }).join("")
    : `<p class="dvn">Lo que cambies, en el sinte o en la tablet, sale aquí. Toca <svg class="i"><use href="#i-undo"/></svg> para volver atrás.</p>`;
}
/* una acción que no se puede deshacer pide un segundo toque; se desarma sola a los 3 s */
function disarm(b, txt) { b.dataset.arm = ""; b.textContent = txt; }
function arm(b, txt, ask) {
  document.querySelectorAll('[data-arm="1"]').forEach((o) => disarm(o, o.dataset.armTxt || txt));
  b.dataset.arm = "1"; b.dataset.armTxt = txt; b.textContent = ask;
  const off = (e) => { if (b.contains(e.target)) return;         /* se desarma al tocar en otro sitio, no por reloj */
    disarm(b, txt); document.removeEventListener("pointerdown", off, true); };
  setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-undo],[data-discard],[data-skind],[data-svfav]"); if (!b) return;
  if (b.dataset.undo) { const i = +b.dataset.undo, x = LOG[i]; if (!x) return; LOG.splice(i, 1); undoing = true; setVal(x.s, x.id, x.old); undoing = false; renderLog(); }
  else if (b.dataset.discard) {
    if (b.dataset.arm !== "1") { arm(b, "Descartar", "¿Seguro?"); return; }
    disarm(b, "Descartar"); const n = entryNow(); if (n >= 0) { LOG.length = 0; listGo(n); toast(-1, "Lo editado se descartó"); } }
  else if (b.dataset.skind) { SV.kind = b.dataset.skind; renderWork(); $("edit").scrollTop = 0; }
  else if (b.dataset.svfav) favToggle();
});

/* -------------------------------------------------- Guardar: a user preset --- */
/* The sound as it sounds now into one of the 32 user slots (UP_STORE, as SAVE > USER on the device), then loaded from
   there: the list has it, the edited dot goes. A user preset playing offers its own slot; else the first free one */
const SVE = { open: false, slots: [], slot: 0, busy: false };
const upLabel = (k) => "U" + String(k + 1).padStart(2, "0");
const cleanName = (t) => t.toUpperCase().replace(/[^\x20-\x7E]/g, "").replace(/^\s+/, "").replace(/\s{2,}/g, " ").slice(0, 12);
async function readSlots() {
  const out = [];
  for (;;) { const r = P.uplist(await rq(C.UP_LIST, [out.length, 16])); out.push(...r.items); if (out.length >= r.total || !r.items.length) return out; }
}
async function openSave(on = true) {
  SVE.open = on;
  $("sh").classList.toggle("on", on); $("scrim").classList.toggle("on", on || B.open);
  if (!on) { $("saveb").focus(); return; }
  const x = M.list[entryNow()], user = x && x.e === M.info.nengines;
  $("shn").value = cleanName(x ? x.name : "");
  $("slots").innerHTML = ""; $("shgo").disabled = true; $("shl").textContent = "Leyendo las ranuras del FM-1…"; $("shw").textContent = "";
  try { SVE.slots = await readSlots(); } catch (e) { $("shl").textContent = "No pude leer las ranuras. Prueba otra vez."; return; }
  const free = SVE.slots.findIndex((u) => !u.used);
  SVE.slot = user ? x.k : free >= 0 ? free : 0;
  renderSave();
  setTimeout(() => { const t = $("slots").querySelector('[aria-checked="true"]') || $("shn");
    t?.scrollIntoView({ block: "nearest" }); t?.focus(); }, 30);
}
function renderSave() {
  const x = M.list[entryNow()], mine = x && x.e === M.info.nengines ? x.k : -1, u = SVE.slots[SVE.slot] || {};
  $("slots").innerHTML = SVE.slots.map((s, k) => `<button class="slt${s.used ? " used" : ""}" role="radio" aria-checked="${k === SVE.slot}" data-slot="${k}"><span class="num">${upLabel(k)}</span>
    <span class="n">${s.used ? esc(s.name) : "Libre"}</span>${k === mine ? '<span class="me">suena</span>' : ""}</button>`).join("");
  $("shl").textContent = `Hasta 12 letras. Sin nombre se llama ${M.info.engines[M.engine] || ""} ${upLabel(SVE.slot).slice(1)}.`;
  $("shw").textContent = u.used ? (SVE.slot === mine ? `Guarda encima de ${u.name}, el que suena.` : `Se reemplaza ${u.name}.`) : "";
  $("shgo").textContent = SVE.busy ? "Guardando…" : u.used ? `Reemplazar ${upLabel(SVE.slot)}` : `Guardar en ${upLabel(SVE.slot)}`;
  $("shgo").classList.toggle("warn", !!u.used); $("shgo").disabled = SVE.busy;
}
async function doSave() {
  if (SVE.busy) return;
  const slot = SVE.slot, name = cleanName($("shn").value).trim();
  SVE.busy = true; renderSave();
  try {
    const r = await rq(C.UP_STORE, [slot, ...[...name].map((c) => c.charCodeAt(0)), 0], { timeout: 3000, retries: 0 });
    const rc = r[1];
    if (rc) { $("shw").textContent = { 1: "Esta pista no tiene un sonido que guardar (la de batería).", 2: "No se pudo escribir la memoria del FM-1.", 3: "Para la reproducción y vuelve a guardar." }[rc] || "No se pudo guardar."; return; }
    await readList(); US.slots = null;
    const n = M.list.findIndex((x) => x.e === M.info.nengines && x.k === slot);
    if (n >= 0) await rq(C.LIST_GO, u14(n));          /* (the device plays it from its slot: RELOAD brings the rest) */
    openSave(false);
    toast(-1, `<b>Guardado</b> ${esc(n >= 0 ? M.list[n].name : name)} en ${upLabel(slot)}`);
  } catch (e) { $("shw").textContent = "El FM-1 no contestó. Mira en SAVE > USER si se guardó."; }
  finally { SVE.busy = false; if (SVE.open) renderSave(); }
}
$("shn").addEventListener("input", () => { const v = cleanName($("shn").value); if (v !== $("shn").value) $("shn").value = v; });
$("shn").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("shn").blur(); } });
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-save],#shx,#shc,#shgo,[data-slot]"); if (!b) return;
  if (b.dataset.save) openSave(true);
  else if (b.id === "shx" || b.id === "shc") openSave(false);
  else if (b.id === "shgo") doSave();
  else if (b.dataset.slot) { SVE.slot = +b.dataset.slot; renderSave(); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && SVE.open) openSave(false); });
document.addEventListener("keydown", (e) => {                 /* el foco no se sale del diálogo abierto */
  if (e.key !== "Tab") return;
  const dlg = SVE.open ? $("sh") : B.open ? $("br") : null; if (!dlg) return;
  const f = [...dlg.querySelectorAll('button,input,[tabindex="0"]')].filter((x) => x.offsetParent && !x.disabled);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
$("scrim").addEventListener("click", () => { if (SVE.open) openSave(false); });

/* ----------------------------------------------------------------- input --- */

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
  const b = e.target.closest("#favh,#now,#brx,[data-kind],[data-load],[data-favgo],[data-kstep],[data-qtog],[data-qstep],[data-qn],[data-tap],[data-panic],#prev,#next,#favt,#usb,#follow,[data-f]");
  if (!b) return;
  if (b.id === "now") openBrowser(!B.open);
  else if (b.id === "brx") openBrowser(false);
  else if (b.dataset.kind) { B.kind = b.dataset.kind; renderBrowser(); }
  else if (b.dataset.kstep) { const all = ["FAVS", "ALL", ...KINDS.filter((k) => M.list.some((x) => x.kind === k))], i = all.indexOf(B.kind); B.kind = all[(i + +b.dataset.kstep + all.length) % all.length]; renderBrowser(); }
  else if (b.dataset.load) listGo(+b.dataset.load);
  else if (b.dataset.favgo) favGo(+b.dataset.favgo);
  else if (b.dataset.qtog) quickToggle(b.dataset.qtog);
  else if (b.dataset.qstep) quickStep(b.dataset.qstep, +b.dataset.d);
  else if (b.dataset.qn) quickNudge(b.dataset.qn, +b.dataset.d);
  else if (b.dataset.tap) { tapTempo(); again(b, "pulse"); }
  else if (b.dataset.panic) panic();
  else if (b.id === "prev" || b.id === "next") {           /* (not a favourite now: next is the first, previous the last) */
    const n = M.favs.length, d = b.id === "next" ? 1 : -1;
    if (n) favGo(M.favCur < 0 ? (d > 0 ? 0 : n - 1) : (M.favCur + d + n) % n);
  }
  else if (b.id === "favt") { favToggle(); again(b, "pop"); }
  else if (b.id === "usb") usbAudio();
  else if (b.id === "favh") { const on = document.body.classList.toggle("nofav"); b.setAttribute("aria-pressed", !on); store.set("nofav", on); }
  else if (b.id === "follow") { S.follow = !S.follow; b.setAttribute("aria-pressed", S.follow); if (S.follow && M.page) followPage(); }
  else if (b.dataset.f === "ESTUDIO") openStudio();
  else if (b.dataset.f) { S.folder = b.dataset.f; renderNav(); renderWork(); $("edit").scrollTop = 0; fade(); }
});


/* the quick panel's level bars: drag (or tap) along them */
let amtOn = null;
$("edit").addEventListener("pointerdown", (e) => { const a = e.target.closest("[data-amt]"); if (!a) return; amtOn = a; a.setPointerCapture(e.pointerId); amtAt(e); });
$("edit").addEventListener("pointermove", (e) => { if (amtOn) amtAt(e); });
$("edit").addEventListener("pointerup", () => { amtOn = null; });
$("edit").addEventListener("pointercancel", () => { amtOn = null; });
function amtAt(e) {
  const q = QSPEC.get(amtOn.dataset.amt), d = qd(q), r = amtOn.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  setVal(q.s || 0, q.id, d.min + f * (d.max - d.min));
  const v = qv(q), g = frac(d, v), z = q.kind === "bipolar" ? frac(d, 0) : 0, [t, u] = fmtValue(d, v);   /* (in place: the drag keeps its element) */
  const bar = amtOn.querySelector("b"); bar.style.left = Math.min(g, z) * 100 + "%"; bar.style.width = Math.abs(g - z) * 100 + "%";
  amtOn.querySelector("i").style.left = `calc(${g * 100}% - 1px)`;
  const tl = amtOn.closest(".tl"); tl.classList.toggle("on", qOn(q)); tl.querySelector(".tg")?.setAttribute("aria-checked", qOn(q));
  tl.querySelector(".v").innerHTML = `${esc(t)}${u ? `<small>${esc(u)}</small>` : ""}`;
}
$("edit").addEventListener("keydown", (e) => { const a = e.target.closest("[data-amt]"), st = { ArrowRight: 4, ArrowUp: 4, ArrowLeft: -4, ArrowDown: -4 }[e.key];
  if (a && st) { e.preventDefault(); const k = a.dataset.amt, q = QSPEC.get(k); qset(q, qv(q) + st); document.querySelector(`[data-amt="${k}"]`)?.focus(); } });

/* ---------------------------------------------------------------- toasts --- */
let tt = 0;
function toast(i, html) {
  $("tq").style.background = i < 0 ? "var(--tx)" : KH[i]; $("tt").innerHTML = html; $("toast").classList.add("on");
  clearTimeout(tt); tt = setTimeout(() => $("toast").classList.remove("on"), 2200);
}

/* ------------------------------------------------- the scope: the FM-1's own trace, or its USB audio --- */
/* Protocolo 16, comando SCOPE (108). El sinte manda la traza que él mismo dibuja (ui_draw.c graph_scope):
   240 puntos de 0 a 126, donde 63 es el cero. No son muestras de audio: es su pantalla, así que la tablet
   dibuja exactamente la misma onda. Mientras el firmware no lo tenga, el recuadro usa el audio USB; si
   tampoco lo hay, no se dibuja nada: aquí no se inventa ninguna onda. */
const SCOPE_N = 240;
let scTrace = null, scAt = 0, scPeak = 0, scOk = null, scFail = 0;   /* scOk: null sin probar, true lo manda, false no lo tiene */
function scopeFrame(a) {
  if (!a || a.length < 3 + SCOPE_N) return;
  scPeak = a[1] | (a[2] << 7);
  scTrace = Uint8Array.from(a.slice(3, 3 + SCOPE_N));
  scAt = performance.now(); scOk = true; scFail = 0;
}
/* la suscripción se renueva sola: si la tablet se va, el sinte deja de mandar al tercer segundo */
async function scopeKeep() {
  if (!M.link || scOk === false || document.hidden) return;
  try { scopeFrame(await rq(C.SCOPE, [1], { key: "scope", quiet: true, retries: 0, timeout: 700 })); }
  catch (e) { if (scOk !== true && ++scFail >= 3) scOk = false; }    /* firmware sin el comando: se deja de pedir */
}
setInterval(scopeKeep, 2000);

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
    document.querySelector(".scope").classList.add("on");
  } catch (err) { l.textContent = err.name === "NotAllowedError" ? "Permiso de audio negado" : "No se pudo abrir el audio"; }
}
/* as the FM-1 draws it (ui_draw.c graph_scope): the output at 22.05 kHz (audio.c keeps every other sample), 240 of them
   from a rising zero crossing, scaled to the loudest (never above 1500 / 32768), a thin line in the curve's colour */
function drawScope(cv) {
  if (!cv) return; const r = cv.getBoundingClientRect(); if (!r.width) return;
  const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, w, h); g.fillStyle = "#1e1e23"; g.fillRect(0, h >> 1, w, dpr);
  const propia = scTrace && performance.now() - scAt < 400;        /* la del sinte manda mientras llegue */
  const caja = document.querySelector(".scope");
  if (caja) caja.classList.toggle("on", !!(propia || an));
  if (propia) {                                                    /* su traza, punto por punto, tal cual la dibuja él */
    $("snone").textContent = "Onda del FM-1"; caja?.classList.add("fm1");   /* (its own trace: no USB audio, no permission) */
    g.strokeStyle = KH[0]; g.lineWidth = dpr; g.lineJoin = "miter"; g.beginPath();
    for (let x = 0; x < SCOPE_N; x++) g.lineTo(x / (SCOPE_N - 1) * w, scTrace[x] / 126 * h);
    g.stroke(); return;
  }
  if (!an) return;                               /* sin la salida del FM-1 no se dibuja onda ninguna: nunca una simulada */
  an.getFloatTimeDomainData(buf);
  const step = an.context.sampleRate / 22050, at = (i) => buf[Math.round(i * step)] || 0, n = Math.floor(buf.length / step);
  let peak = 1500 / 32768, t = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(at(i)));
  for (let i = 1; i < n - 240; i++) if (at(i - 1) < 0 && at(i) >= 0) { t = i; break; }
  g.strokeStyle = KH[0]; g.lineWidth = dpr; g.lineJoin = "miter"; g.beginPath();
  for (let x = 0; x < 240; x++) g.lineTo(x / 239 * w, h / 2 - at(t + x) / peak * h * .44);
  g.stroke();
}
(function loop() { drawScope($("scope")); requestAnimationFrame(loop); })();

/* ------------------------------------------------------------------ start --- */
$("connect").onclick = () => connectMidi();
if (/^https?:$/.test(location.protocol)) $("dl").hidden = false;
/* full screen: the tablet's whole 3:2 screen, without Chrome's bars */
if (document.fullscreenEnabled) $("fs").hidden = false;
$("fs").onclick = () => (document.fullscreenElement ? document.exitFullscreen()
  : document.documentElement.requestFullscreen().then(() => screen.orientation?.lock?.("landscape"))).catch(() => {});   /* (always landscape) */
document.addEventListener("fullscreenchange", () => $("fs").setAttribute("aria-pressed", !!document.fullscreenElement));   /* (served, as on Vercel: the same file to keep offline) */
$("conn").classList.add("off");
if (store.get("nofav")) { document.body.classList.add("nofav"); $("favh").setAttribute("aria-pressed", "false"); }
renderNav();                                        /* (empty until the FM-1 is connected: Conectar in the middle) */
if (QS.get("mock") === "1") connectMock();
