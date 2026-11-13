/* ---------------------------------------------------------- the mock FM-1 --- */
/* The device's own data (tools/live_dump.py over the real firmware); answers frames as editor.c would, and now and then
   does what a player would on the FM-1: opens a page, turns a knob */
function makeMock(onFrame) {
  const D = JSON.parse($("mockdata").textContent), info = D.info, pe0 = info.pe0;
  let mhy = null;
  const xd = (id, label, fmt, min, max, v, names = [], unit = "") => [id, { id, v, fmt, min, max, names, label, unit }];
  const FMXD = Object.fromEntries([   /* (ui_synth.c X_F*: the FMX pages a dump on another engine leaves out) */
    xd(19, "OP", 0, 1, 6, 1), xd(20, "WAVE", 8, 0, 9, 0, ["SINE", "TRI", "SAW", "SQR", "HALF", "ABS", "QUART", "PULSE", "SIN8", "NOISE"]),
    xd(21, "MODE", 8, 0, 2, 0, ["PM", "FM", "RING"]), xd(22, "RATIO", 8, 0, 31, 1, ["0.5", ...Array.from({ length: 31 }, (_, i) => String(i + 1))]),
    xd(23, "FINE", 0, 0, 99, 0), xd(24, "LEVEL", 0, 0, 127, 127), xd(25, "VEL", 1, 0, 127, 0), xd(26, "KSC", 1, 0, 127, 0),
    xd(27, "ATK", 3, 0, 127, 0), xd(28, "DEC", 3, 0, 127, 70), xd(29, "SUS", 1, 0, 127, 127), xd(30, "REL", 3, 0, 127, 40),
    xd(31, "TO", 0, 1, 6, 1), xd(32, "FROM", 0, 1, 6, 2), xd(33, "AMT", 0, 0, 127, 0), xd(34, "OUT", 0, 0, 127, 0),
    xd(35, "DTN", 0, -7, 7, 0), xd(36, "FREQ", 8, 0, 1, 0, ["RATIO", "FIX"]), xd(37, "PEG", 2, -64, 63, 0), xd(38, "PTIM", 3, 0, 127, 40),
    xd(39, "SLOT", 0, 1, 27, 1), xd(40, "STORE", 8, 0, 1, 0, ["--", "GO"])]);
  const ups = Array.from({ length: 32 }, () => null), NE = info.nengines;
  const steps = Array.from({ length: info.nstep }, (_, i) => { const on = [0, 3, 6, 8, 10, 12, 14].includes(i), n = [36, 36, 48, 39, 36, 41, 43][[0, 3, 6, 8, 10, 12, 14].indexOf(i)];
    return { n: on ? 1 : 0, notes: [on ? n : 0, 0, 0, 0], time: on ? 0 : i === 7 ? 1 : 2, flags: i === 6 ? 1 : i === 10 ? 2 : 0, vel: 100, lvl: 0, rat: 0 }; });
  const stepArgs = (i) => { const st = steps[i]; return [i, st.n, ...st.notes, st.time, st.flags, st.vel, st.lvl & 127, ((st.lvl >> 7) & 1) | (((st.rat >> 7) & 1) << 1), st.rat & 127]; };
  const sq = { playing: 0, pos: 0, t: 0, cur: 0 }, mrec = { rec: 0, mode: 0, start: 0, quant: 0 };
  const playArgs = () => [sq.playing, sq.pos & 127, sq.pos >> 7, mrec.rec];
  const relist = () => { D.list = D.list.filter((x) => x[0] < NE).concat(ups.map((u, k) => u && [NE, k, "USER", u.name]).filter(Boolean)); };
  const m = { p: D.dump.p.slice(), g: D.dump.g.slice(), engine: D.dump.engine, preset: D.dump.preset, n: 0, favs: [0, 6, 64, 120, 200, 290],
    page: { home: 1, fam: 0, page: 0, title: "HOME", scope: 0, ids: [] }, watch: false, edited: 0 };
  const enc = { s: (t) => [...[...t].map((c) => c.charCodeAt(0) & 127), 0], entry: (n) => { const x = D.list[n]; return [x[0], x[1], ...enc.s(x[2]), ...enc.s(x[3])]; } };
  const homeIds = () => D.homeIds[m.engine] || [127, 127, 127, 127];
  const pageArgs = () => { const ids = m.page.home ? homeIds() : m.page.ids; return [m.page.home, m.page.fam, m.page.page, ...enc.s(m.page.title), m.page.scope, ...ids, ...homeIds(), m.edited, ...u14(m.n)]; };
  const descOf = (s, id) => (s ? D.gdesc[id] : id >= pe0 && id < pe0 + 8 && D.engineDesc[m.engine] ? D.engineDesc[m.engine][id - pe0] : D.pdesc[id]);
  const push = (cmd, a) => setTimeout(() => onFrame(frame(cmd, a)), 4);
  let touchedAt = 0; document.addEventListener("pointerdown", () => { touchedAt = Date.now(); }, true);
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
  xs[0].fill[3] = 1 << 0;                              /* (step 12, only with fill) */
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
      case C.X_GET: case C.X_SET: { const d = (D.xdesc || {})[a[0]] || FMXD[a[0]]; if (!d) return [127, ...v14(0), 0, ...v14(0), ...v14(0), 0, 0, 0];
        if (cmd === C.X_SET) { const v = (a[1] | (a[2] << 7)) - 8192; d.v = d.names[1] === "GO" ? 0 : Math.max(d.min, Math.min(d.max, v)); }
        return [a[0], ...v14(d.v), d.fmt, ...v14(d.min), ...v14(d.max), d.names.length ? 1 : 0, ...enc.s(d.label), ...enc.s(d.unit || ""), ...d.names.flatMap(enc.s)]; }
      case C.HY_GET: { if (a[0] === 1) { const f = HY.init(); f.name = "F" + (a[1] + 1); f.osc[1] = { type: 6, coarse: 12, level: 90, shape: 40 }; return [1, a[1], 0, ...pack7(HY.pack(f))]; }
        if (!mhy) { const f = HY.init(); f.name = "CLIPPER"; f.osc[1] = { type: 2, coarse: -12, level: 100, shape: 64 }; f.mod[0] = { src: 4, dst: 12, amt: 20 }; mhy = HY.pack(f); }
        return [0, a[1], 0, ...pack7(Array.from(mhy))]; }
      case C.HY_PUT: mhy = Uint8Array.from(unpack7(a.slice(2)).slice(0, 128)); return [0, a[1], 0];
      case C.STATE: return [12 + (Date.now() / 1500 % 7 | 0), 0, 0, 30, 0b10110101 & 127, (0b101011010101 >> 7) & 127, mrec.rec, mrec.mode, mrec.start, mrec.quant, 0, 8];
      case C.REC: if (a[0] === 0) mrec.rec = mrec.rec ? 0 : sq.playing ? 1 : 2; else if (a[0] === 1) mrec.mode = a[1] & 1; else if (a[0] === 2) mrec.start = a[1] & 1; else if (a[0] === 3) mrec.quant = a[1] & 1;
        return answer(C.STATE, []);
      case C.STEP_GET: return a[0] < steps.length ? stepArgs(a[0]) : null;
      case C.STEP_SET: { const i = a[0]; if (i >= steps.length) return null;
        steps[i] = { n: Math.min(4, a[1]), notes: a.slice(2, 6), time: Math.min(2, a[6]), flags: a[7] & 3, vel: a[8], lvl: a.length > 9 ? a[9] | (a[10] & 1) << 7 : 0, rat: a.length > 9 ? a[11] | ((a[10] >> 1) & 1) << 7 : 0 };
        return stepArgs(i); }
      case C.PLAY: return playArgs();
      case C.CURSOR: if (a.length) sq.cur = a[0] % Math.max(1, m.p[29] || 16); return [sq.cur];
      case C.TRANSPORT: sq.playing = a[0] & 1; clearInterval(sq.t);
        if (sq.playing) sq.t = setInterval(() => { sq.pos = (sq.pos + 1) % Math.max(1, m.p[29] || 16); if (m.watch) push(C.PLAY, playArgs()); }, 125);
        else { sq.pos = 0; if (m.watch) push(C.PLAY, playArgs()); }
        return [sq.playing];
      case C.UP_LIST: { const st = Math.min(a[0], 32), n = Math.min(a[1], 16, 32 - st); return [st, n, 32, ...Array.from({ length: n }, (_, i) => { const u = ups[st + i]; return [u ? 1 : 0, u ? u.engine : 0, ...enc.s(u ? u.name : "")]; }).flat()]; }
      case C.UP_PUT: { const k = a[0], z = a.indexOf(0, 2), nm = String.fromCharCode(...a.slice(2, z)); if (k >= 32 || !nm || nm.length > 12) return [k, 1]; ups[k] = { engine: a[1], name: nm }; return [k, 0]; }
      case C.UP_STORE: { const k = a[0], nm = String.fromCharCode(...a.slice(1, a.indexOf(0, 1) < 0 ? a.length : a.indexOf(0, 1))); if (k >= 32 || nm.length > 12) return [k, 1];
        ups[k] = { engine: m.engine, name: nm || `${info.engines[m.engine]} ${String(k + 1).padStart(2, "0")}` }; relist(); return [k, 0]; }
      case C.PAGE: return pageArgs();
      case C.FAVS: { const cur = m.favs.indexOf(m.n); return [m.favs.length, cur < 0 ? 127 : cur, ...m.favs.flatMap(u14)]; }
      case C.FAV_SET: { const i = m.favs.indexOf(m.n); if (a[0] & 1) { if (i < 0 && m.favs.length < 16) m.favs.push(m.n); } else if (i >= 0) m.favs.splice(i, 1); return [m.favs.length]; }
      case C.LIST: { const st = Math.min(a[0] | (a[1] << 7), D.list.length), n = Math.min(a[2] || 16, 16, D.list.length - st);
        return [...u14(D.list.length), ...u14(st), n, ...Array.from({ length: n }, (_, i) => enc.entry(st + i)).flat()]; }
      case C.LIST_GO: { const n = a[0] | (a[1] << 7), ok = n < D.list.length; if (ok) load(n); return [...u14(n), ok ? 0 : 1]; }
      /* ---- Studio's, to see its interface on the example FM-1: example data, as everything else here ---- */
      case 27: { const nt = info.ntrk || 4; if (a.length) trk.sel = Math.min(nt - 1, a[0]);                 /* TRACK (with a pick) */
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
  /* the player on the FM-1: a page opened, then a knob of it turned; the SEQ cursor moved a step */
  setInterval(() => {
    if (!m.watch) return;
    if (Date.now() - touchedAt > 15000 && Math.random() < .35) { sq.cur = (sq.cur + 1) % Math.max(1, m.p[29] || 16); push(C.CURSOR, [sq.cur]); }   /* (not under the finger of whoever tries it) */
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

