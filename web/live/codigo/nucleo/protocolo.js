/* ---------------------------------------------------------------- protocol --- */
const HDR = [0x7D, 0x46, 0x4C];
const C = { INFO: 1, GET: 2, SET: 3, DUMP: 4, DESC: 5, STEP_GET: 6, STEP_SET: 7, UP_LIST: 16, UP_PUT: 18, UP_STORE: 19, WATCH: 22, CHANGED: 23, RELOAD: 24, PING: 25, STEP_CHANGED: 26, TRACK_CHANGED: 32,
  HY_GET: 77, HY_PUT: 78, PAGE: 97, FAVS: 98, FAV_GO: 99, FAV_SET: 100, FAVS_CHANGED: 101, LIST: 102, LIST_GO: 103, EDITED: 104, TOOL: 105, PLAY: 106, TRANSPORT: 107,
  SCOPE: 108, X_GET: 109, X_SET: 110, X_CHANGED: 111, STATE: 112, REC: 113, CURSOR: 114 };
const PUSH = new Set([C.CHANGED, C.RELOAD, C.STEP_CHANGED, C.TRACK_CHANGED, C.FAVS_CHANGED, C.EDITED, C.SCOPE, C.X_CHANGED, C.CURSOR]);
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
  favs(a) { const r = new Reader(a), n = r.b(), cur = r.b(), at = []; for (let i = 0; i < n; i++) at.push(r.b() | (r.b() << 7)); return { cur: cur === 127 ? -1 : cur, at }; },   /* (each favourite: its place in LIST) */
  x(a) { if (a.length < 3) return { id: 127 }; const r = new Reader(a), o = { id: r.b(), v: r.v(), fmt: r.b(), min: r.v(), max: r.v(), names: [] }; const has = r.b();   /* (Live 109) a synth page's value */
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

