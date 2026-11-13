/* ===================================================================== GENERAR y MIDI ====
   El generador y los MIDI del editor de Estudio, sin cambios: PAT (euclídeo, aleatorio en escala, los 22 presets,
   humanizar), ROLL (los acordes y la división) y SMF (escribir y leer archivos MIDI). Arriba, lo poco que necesitan. */
const DRUM_LANES = [[36, "KICK"], [35, "KICK 2"], [38, "SNARE"], [39, "CLAP"], [42, "HAT"], [46, "OPEN HAT"], [44, "PEDAL"], [37, "RIM"],
  [40, "SNARE 2"], [43, "LOW TOM"], [48, "HI TOM"], [49, "CRASH"], [51, "RIDE"], [70, "SHAKER"], [63, "CONGA"], [56, "COWBELL"]];
const LV_ORDER = [1, 2, 0, 3];
const MICRO = { MIN: -32, MAX: 31 };
const fillGet = (bytes, i) => ((bytes[i >> 2] || 0) >> (2 * (i & 3))) & 3;

const ROLL = {
  DIV_PER_BAR: [4, 8, 16, 32, 12, 24, 2, 1, 0.5],     /* steps in a 4/4 bar for DIV (params.c N_SDIV) */
  LENGTHS: [["whole", 1], ["half", 1 / 2], ["quarter", 1 / 4], ["eighth", 1 / 8], ["sixteenth", 1 / 16]],
  /* a length (a fraction of a bar) in steps at DIV div: at least one step */
  steps: (frac, div) => Math.max(1, Math.round((ROLL.DIV_PER_BAR[div] ?? 16) * frac)),
  rest: () => ({ n: 0, notes: [0, 0, 0, 0], time: 2, flags: 0, vel: 0, lvl: 0, rat: 0 }),
  tie: () => ({ n: 0, notes: [0, 0, 0, 0], time: 1, flags: 0, vel: 0, lvl: 0, rat: 0 }),
  isNote: (s) => !!s && s.time === 0 && s.n > 0,
  /* the chords: {at, dur, notes[], vel} for every NOTE step, dur = 1 + the TIE steps after it (within len) */
  chords(steps, len) {
    const out = [];
    for (let i = 0; i < len; i++) {
      const s = steps[i];
      if (!ROLL.isNote(s)) continue;
      let d = 1;
      while (i + d < len && steps[i + d] && steps[i + d].time === 1) d++;
      out.push({ at: i, dur: d, notes: s.notes.slice(0, s.n), vel: s.vel, flags: s.flags });
    }
    return out;
  },
  /* the chord sounding at step i (its NOTE step), or -1 */
  owner(steps, i) {
    for (let k = i; k >= 0; k--) {
      const s = steps[k];
      if (ROLL.isNote(s)) return k;
      if (!s || s.time !== 1) return -1;
    }
    return -1;
  },
  /* the steps after a chord that ends at `end` and were holding it (TIE) become rests */
  _cutTies(steps, len, end, out) {
    for (let k = end; k < len && steps[k] && steps[k].time === 1 && !out.has(k); k++) out.set(k, ROLL.rest());
  },
  /* put note `pitch` at step `at` for `dur` steps. On a chord's first step: added to it (it keeps its length,
     at most 4 notes). Inside a held chord: that chord ends there and a new one starts. Elsewhere: a new chord. */
  place(steps, len, at, pitch, dur) {
    const out = new Map(), s = steps[at];
    if (at < 0 || at >= len) return out;
    if (ROLL.isNote(s)) {
      if (s.notes.slice(0, s.n).includes(pitch) || s.n >= 4) return out;
      const notes = s.notes.slice(0, s.n).concat(pitch);
      out.set(at, { ...s, n: notes.length, notes: notes.concat([0, 0, 0, 0]).slice(0, 4) });
      return out;
    }
    out.set(at, { n: 1, notes: [pitch, 0, 0, 0], time: 0, flags: 0, vel: 96, lvl: 0, rat: 0 });
    let k = 1;
    for (; k < dur && at + k < len; k++) {
      const x = steps[at + k];
      if (ROLL.isNote(x)) break;                       /* the next chord: this one stops before it */
      out.set(at + k, ROLL.tie());
    }
    ROLL._cutTies(steps, len, at + k, out);            /* (inside a long chord: its rest is silence now) */
    return out;
  },
  /* take note `pitch` off the chord starting at `at`; the last one leaves rests where the chord was */
  remove(steps, len, at, pitch) {
    const out = new Map(), s = steps[at];
    if (!ROLL.isNote(s)) return out;
    const notes = s.notes.slice(0, s.n).filter((n) => n !== pitch);
    if (notes.length === s.n) return out;
    if (notes.length) { out.set(at, { ...s, n: notes.length, notes: notes.concat([0, 0, 0, 0]).slice(0, 4) }); return out; }
    out.set(at, ROLL.rest());
    ROLL._cutTies(steps, len, at + 1, out);
    return out;
  },
  /* the chord at `at` lasts `dur` steps: shorter, the steps it leaves become rests; longer, it ties over
     the rests after it, up to the next chord */
  resize(steps, len, at, dur) {
    const out = new Map();
    if (!ROLL.isNote(steps[at])) return out;
    let cur = 1;
    while (at + cur < len && steps[at + cur] && steps[at + cur].time === 1) cur++;
    dur = Math.max(1, Math.min(dur, len - at));
    if (dur < cur) for (let k = dur; k < cur; k++) out.set(at + k, ROLL.rest());
    else for (let k = cur; k < dur; k++) { if (ROLL.isNote(steps[at + k])) break; out.set(at + k, ROLL.tie()); }
    return out;
  },
};
const PAT = {
  LOCK_MAX: 24,
  FILE: "clipper-pattern",
  HIST: 64,                                            /* undo steps kept */
  rest: () => ({ n: 0, notes: [0, 0, 0, 0], time: 2, flags: 0, vel: 0, lvl: 0, rat: 0 }),
  tie: () => ({ n: 0, notes: [0, 0, 0, 0], time: 1, flags: 0, vel: 0, lvl: 0, rat: 0 }),
  note: (notes, o = {}) => {
    const ns = notes.slice(0, 4).map((x) => Math.max(0, Math.min(127, Math.round(x))));
    return { n: ns.length, notes: ns.concat([0, 0, 0, 0]).slice(0, 4), time: 0, flags: o.flags | 0, vel: o.vel ?? 96, lvl: o.lvl | 0, rat: o.rat | 0 };
  },
  isNote: (s) => !!s && s.time === 0 && s.n > 0,
  /* a 2-bit value for all four notes of a step (the firmware keeps a level and a ratchet per note) */
  uni: (v) => (v & 3) * 0x55,
  cstep(s) {
    if (!s) return PAT.rest();
    const n = Math.max(0, Math.min(4, s.n | 0));
    return { n, notes: [0, 1, 2, 3].map((k) => ((s.notes && s.notes[k]) | 0) & 0x7F), time: Math.max(0, Math.min(2, s.time | 0)),
      flags: (s.flags | 0) & 3, vel: Math.max(0, Math.min(127, s.vel | 0)), lvl: (s.lvl | 0) & 0xFF, rat: (s.rat | 0) & 0xFF };
  },
  same: (x, y) => x.n === y.n && x.time === y.time && (x.flags & 3) === (y.flags & 3) && x.vel === y.vel && (x.lvl | 0) === (y.lvl | 0)
    && (x.rat | 0) === (y.rat | 0) && x.notes.every((v, k) => v === y.notes[k]),
  /* the editor's state (dev.steps, dev.micro, dev.fill packed bytes, dev.locks) as a P */
  make(steps, micro, fillBytes, locks, len) {
    const N = steps.length;
    return { len: Math.max(1, Math.min(N, len | 0)), steps: steps.map(PAT.cstep),
      micro: micro ? Array.from({ length: N }, (_, i) => micro[i] | 0) : null,
      fill: fillBytes ? Array.from({ length: N }, (_, i) => fillGet(fillBytes, i) % 3) : null,
      locks: locks ? locks.map((l) => ({ step: l.step, param: l.param, value: l.value })) : null };
  },
  clone: (P) => ({ len: P.len, steps: P.steps.map(PAT.cstep), micro: P.micro && P.micro.slice(), fill: P.fill && P.fill.slice(),
    locks: P.locks && P.locks.map((l) => ({ ...l })) }),
  range(P, a, b) {
    a = Math.max(0, Math.min(P.len - 1, Math.round(a) || 0));
    b = b == null ? P.len : Math.max(a + 1, Math.min(P.len, Math.round(b)));
    return [a, b];
  },
  /* the chords that start in [a, b): {at, dur} with dur = 1 + the TIEs after it, cut at b */
  chords(steps, a, b) {
    const out = [];
    for (let i = a; i < b; i++) {
      if (!PAT.isNote(steps[i])) continue;
      let d = 1;
      while (i + d < b && steps[i + d] && steps[i + d].time === 1) d++;
      out.push({ at: i, dur: d });
    }
    return out;
  },
  /* the TIEs from `from` on (a chord that no longer reaches them) become rests */
  _cut(Q, from) { for (let k = from; k < Q.len && Q.steps[k].time === 1; k++) Q.steps[k] = PAT.rest(); },
  _keepLocks(Q, dropped = 0) {                          /* at most 24 locks, the earliest steps first */
    if (!Q.locks) return Q;
    Q.locks.sort((x, y) => x.step - y.step || x.param - y.param);
    const seen = new Set();
    Q.locks = Q.locks.filter((l) => { const k = l.step * 256 + l.param; if (seen.has(k)) return false; seen.add(k); return true; });
    if (Q.locks.length > PAT.LOCK_MAX) { dropped += Q.locks.length - PAT.LOCK_MAX; Q.locks.length = PAT.LOCK_MAX; }
    Q.dropped = dropped;
    return Q;
  },
  /* move whole steps (notes, nudge, fill, locks) inside [a, b): step i goes to f(i) */
  _move(P, a, b, f) {
    const Q = PAT.clone(P);
    for (let i = a; i < b; i++) {
      const j = f(i);
      Q.steps[j] = PAT.cstep(P.steps[i]);
      if (Q.micro) Q.micro[j] = P.micro[i];
      if (Q.fill) Q.fill[j] = P.fill[i];
    }
    if (Q.locks) Q.locks = Q.locks.map((l) => (l.step >= a && l.step < b ? { ...l, step: f(l.step) } : l));
    return PAT._keepLocks(Q);
  },

  /* ---- transformations ---- */
  /* every note of the range up or down `semi` semitones (a note that would leave 0..127 moves by octaves instead) */
  transpose(P, semi, a, b) {
    [a, b] = PAT.range(P, a, b);
    const Q = PAT.clone(P);
    const fold = (n) => { while (n > 127) n -= 12; while (n < 0) n += 12; return n; };
    for (let i = a; i < b; i++) {
      const s = Q.steps[i];
      for (let k = 0; k < s.n; k++) s.notes[k] = fold(s.notes[k] + semi);
    }
    return Q;
  },
  /* shift the range by k steps, round (what leaves one end comes in at the other) */
  rotate(P, k, a, b) {
    [a, b] = PAT.range(P, a, b);
    const w = b - a;
    return PAT._move(P, a, b, (i) => a + ((((i - a + k) % w) + w) % w));
  },
  /* the range backwards: each chord keeps its length (it now ends where it started) */
  reverse(P, a, b) {
    [a, b] = PAT.range(P, a, b);
    const Q = PAT.clone(P), ch = PAT.chords(P.steps, a, b);
    const spill = ch.length && ch[ch.length - 1].at + ch[ch.length - 1].dur === b && b < P.len && P.steps[b].time === 1;
    for (let i = a; i < b; i++) { Q.steps[i] = PAT.rest(); if (Q.micro) Q.micro[i] = 0; if (Q.fill) Q.fill[i] = 0; }
    const map = new Map();
    for (const c of ch) {
      const ns = a + b - c.at - c.dur;
      map.set(c.at, ns);
      Q.steps[ns] = PAT.cstep(P.steps[c.at]);
      for (let k = 1; k < c.dur; k++) Q.steps[ns + k] = PAT.tie();
      if (Q.micro) Q.micro[ns] = P.micro[c.at];
      if (Q.fill) Q.fill[ns] = P.fill[c.at];
    }
    if (spill) PAT._cut(Q, b);                         /* (the last chord held past the range: not any more) */
    if (Q.locks) Q.locks = Q.locks.map((l) => (l.step >= a && l.step < b ? { ...l, step: map.has(l.step) ? map.get(l.step) : a + b - 1 - l.step } : l));
    return PAT._keepLocks(Q);
  },
  /* the pattern twice: LEN doubles (up to max steps) and the copy follows */
  double(P, max) {
    const len = P.len, nl = Math.max(len, Math.min(max ?? P.steps.length, P.steps.length, len * 2));
    const Q = PAT.clone(P);
    Q.len = nl;
    for (let i = len; i < nl; i++) {
      Q.steps[i] = PAT.cstep(P.steps[i - len]);
      if (Q.micro) Q.micro[i] = P.micro[i - len];
      if (Q.fill) Q.fill[i] = P.fill[i - len];
    }
    if (Q.locks) {
      Q.locks = Q.locks.filter((l) => l.step < len);
      for (const l of P.locks) if (l.step < len && l.step + len < nl) Q.locks.push({ ...l, step: l.step + len });
    }
    return PAT._keepLocks(Q);
  },
  /* the range as a clip (steps 0..), for paste */
  copy(P, a, b) {
    [a, b] = PAT.range(P, a, b);
    return { len: b - a, steps: P.steps.slice(a, b).map(PAT.cstep), micro: P.micro && P.micro.slice(a, b), fill: P.fill && P.fill.slice(a, b),
      locks: P.locks ? P.locks.filter((l) => l.step >= a && l.step < b).map((l) => ({ ...l, step: l.step - a })) : null };
  },
  /* a clip from step `at` on (cut at the pattern's length); the locks it covers are the clip's */
  paste(P, clip, at) {
    at = Math.max(0, Math.min(P.len - 1, at | 0));
    const Q = PAT.clone(P), end = Math.min(P.len, at + clip.len);
    for (let i = at; i < end; i++) {
      Q.steps[i] = PAT.cstep(clip.steps[i - at]);
      if (Q.micro) Q.micro[i] = clip.micro ? clip.micro[i - at] | 0 : 0;
      if (Q.fill) Q.fill[i] = clip.fill ? clip.fill[i - at] % 3 : 0;
    }
    if (end < P.len) PAT._cut(Q, end);               /* (an old chord's TIEs after the clip: not the clip's) */
    if (Q.locks) {
      Q.locks = Q.locks.filter((l) => l.step < at || l.step >= end);
      if (clip.locks) for (const l of clip.locks) if (at + l.step < end) Q.locks.push({ ...l, step: at + l.step });
    }
    return PAT._keepLocks(Q);
  },
  /* the range silent: rests, no nudge, fill or lock */
  clear(P, a, b) {
    [a, b] = PAT.range(P, a, b);
    const Q = PAT.clone(P);
    for (let i = a; i < b; i++) { Q.steps[i] = PAT.rest(); if (Q.micro) Q.micro[i] = 0; if (Q.fill) Q.fill[i] = 0; }
    PAT._cut(Q, b);
    if (Q.locks) Q.locks = Q.locks.filter((l) => l.step < a || l.step >= b);
    return Q;
  },

  /* ---- fine editing: one value of every NOTE step in the range ---- */
  /* the lanes: VEL 1..127, NUDGE MICRO.MIN..MAX, RATCHET 1..4 hits, LEVEL GHOST SOFT NORM HARD (1..4) */
  LANES: { vel: [1, 127], nudge: [-32, 31], rat: [1, 4], lvl: [1, 4] },
  laneGet(P, lane, i) {
    const s = P.steps[i];
    switch (lane) {
      case "vel": return s.vel || 96;
      case "nudge": return P.micro ? P.micro[i] | 0 : 0;
      case "rat": return 1 + (s.rat & 3);
      case "lvl": return 1 + LV_ORDER.indexOf(s.lvl & 3);
    }
    return 0;
  },
  laneSet(P, lane, i, v) {
    const [lo, hi] = PAT.LANES[lane];
    v = Math.max(lo, Math.min(hi, Math.round(v)));
    const s = P.steps[i];
    if (lane === "vel") s.vel = v;
    else if (lane === "nudge") { if (P.micro) P.micro[i] = v; }
    else if (lane === "rat") s.rat = PAT.uni(v - 1);
    else if (lane === "lvl") s.lvl = PAT.uni(LV_ORDER[v - 1]);
    return P;
  },
  /* set a lane over the range (only on NOTE steps) */
  setLane(P, lane, v, a, b) {
    [a, b] = PAT.range(P, a, b);
    const Q = PAT.clone(P);
    for (let i = a; i < b; i++) if (PAT.isNote(Q.steps[i])) PAT.laneSet(Q, lane, i, v);
    return Q;
  },
  /* the chords: intervals from the step's first note; "key3" / "key4" stack thirds of the scale */
  CHORDS: [["single", [0]], ["maj", [0, 4, 7]], ["min", [0, 3, 7]], ["dim", [0, 3, 6]], ["aug", [0, 4, 8]], ["sus2", [0, 2, 7]],
    ["sus4", [0, 5, 7]], ["7", [0, 4, 7, 10]], ["maj7", [0, 4, 7, 11]], ["m7", [0, 3, 7, 10]], ["add9", [0, 4, 7, 14]],
    ["5", [0, 7]], ["oct", [0, 12]], ["5oct", [0, 7, 12]], ["key3", null], ["key4", null]],
  chord(P, type, a, b, key = {}) {
    [a, b] = PAT.range(P, a, b);
    const Q = PAT.clone(P), c = PAT.CHORDS.find((x) => x[0] === type);
    if (!c) return Q;
    for (let i = a; i < b; i++) {
      const s = Q.steps[i];
      if (!PAT.isNote(s)) continue;
      const root = s.notes[0];
      let ns;
      if (c[1]) ns = c[1].map((x) => root + x);
      else {
        const sc = PAT.scaleNotes(key.root | 0, key.scale || "MAJ", 0, 128);
        let at = sc.indexOf(root);
        if (at < 0) at = sc.findIndex((n) => n > root) - 1;   /* (not in the key: from the scale note under it) */
        if (at < 0) at = 0;
        ns = [0, 2, 4, 6].slice(0, type === "key4" ? 4 : 3).map((d) => (at + d < sc.length ? sc[at + d] : root));
        ns[0] = root;
      }
      ns = ns.filter((n) => n <= 127);
      Object.assign(s, { n: ns.length, notes: ns.concat([0, 0, 0, 0]).slice(0, 4) });
    }
    return Q;
  },
  /* accents / slides on the range: on, off or every other */
  flag(P, bit, how, a, b) {
    [a, b] = PAT.range(P, a, b);
    const Q = PAT.clone(P);
    let k = 0;
    for (let i = a; i < b; i++) {
      const s = Q.steps[i];
      if (!PAT.isNote(s)) continue;
      const on = how === "on" || (how === "toggle" ? !(s.flags & bit) : false);
      s.flags = on ? s.flags | bit : s.flags & ~bit;
      k++;
    }
    return Q;
  },

  /* ---- generators ---- */
  rng(seed) {                                          /* mulberry32: the same seed, the same pattern */
    let a = (seed >>> 0) || 0x9E3779B9;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  },
  /* the device's 16 scales (params.c SCL) as semitones from the root */
  SCALES: { CHR: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], MAJ: [0, 2, 4, 5, 7, 9, 11], MIN: [0, 2, 3, 5, 7, 8, 10], DOR: [0, 2, 3, 5, 7, 9, 10],
    MIX: [0, 2, 4, 5, 7, 9, 10], PEN: [0, 2, 4, 7, 9], MPEN: [0, 3, 5, 7, 10], HARM: [0, 2, 3, 5, 7, 8, 11], PHRY: [0, 1, 3, 5, 7, 8, 10],
    LYD: [0, 2, 4, 6, 7, 9, 11], LOC: [0, 1, 3, 5, 6, 8, 10], MEL: [0, 2, 3, 5, 7, 9, 11], BLUES: [0, 3, 5, 6, 7, 10], WHOLE: [0, 2, 4, 6, 8, 10],
    DIMHW: [0, 1, 3, 4, 6, 7, 9, 10], DIMWH: [0, 2, 3, 5, 6, 8, 9, 11] },
  /* the notes of a scale in [lo, hi) */
  scaleNotes(root, scale, lo, hi) {
    const iv = PAT.SCALES[scale] || PAT.SCALES.MAJ, out = [];
    for (let n = Math.max(0, lo); n < Math.min(128, hi); n++) if (iv.includes((((n - root) % 12) + 12) % 12)) out.push(n);
    return out;
  },
  /* Euclid: k hits spread as evenly as can be over n steps, turned by rot (k = 3, n = 8: x..x..x.) */
  euclid(k, n, rot = 0) {
    n = Math.max(1, n | 0); k = Math.max(0, Math.min(n, k | 0));
    return Array.from({ length: n }, (_, i) => { const j = (((i - rot) % n) + n) % n; return (j * k) % n < k; });
  },
  /* the rhythm over the range, again every n steps: a hit plays the notes, the other steps rest (or stay as they
     were, merge) */
  genEuclid(P, o, a, b) {
    [a, b] = PAT.range(P, a, b);
    const Q = PAT.clone(P), hits = PAT.euclid(o.k, o.n, o.rot | 0), notes = o.notes && o.notes.length ? o.notes : [48];
    for (let i = a; i < b; i++) {
      if (hits[(i - a) % hits.length]) {
        Q.steps[i] = PAT.note(notes, { vel: o.vel ?? 96, flags: o.accent && (i - a) % hits.length === hits.indexOf(true) ? 1 : 0 });
        if (Q.micro) Q.micro[i] = 0;
      } else if (!o.merge) Q.steps[i] = PAT.rest();
    }
    if (!o.merge) PAT._cut(Q, b);
    return Q;
  },
  /* a melody in the key: density (0..100) of notes, motion (0..100: steps to leaps), ties, accents, slides and
     chords in % of the notes, over `oct` octaves from note `base` */
  genRandom(P, o, a, b) {
    [a, b] = PAT.range(P, a, b);
    const R = PAT.rng(o.seed), Q = PAT.clone(P), pc = (x) => R() * 100 < (x | 0);
    const base = o.base ?? 48, sc = PAT.scaleNotes(o.root | 0, o.scale || "MIN", base, base + 12 * Math.max(1, o.oct | 0) + 1);
    if (!sc.length) return Q;
    const full = PAT.scaleNotes(o.root | 0, o.scale || "MIN", 0, 128);   /* (a chord may go above the range) */
    const reach = 1 + Math.round(((o.motion ?? 30) / 100) * Math.max(1, sc.length - 1));
    let cur = sc.indexOf(sc.find((n) => n >= base + ((o.root | 0) % 12)));
    if (cur < 0) cur = 0;
    let held = false;
    for (let i = a; i < b; i++) {
      if (Q.micro) Q.micro[i] = 0;
      if (held && pc(o.ties)) { Q.steps[i] = PAT.tie(); continue; }
      held = false;
      if (i > a && !pc(o.density ?? 70)) { Q.steps[i] = PAT.rest(); continue; }
      if (i > a) cur = Math.max(0, Math.min(sc.length - 1, cur + Math.round((R() * 2 - 1) * reach)));
      let ns = [sc[cur]];
      if (pc(o.chords)) { const f = full.indexOf(sc[cur]); ns = [0, 2, 4].map((d) => full[Math.min(full.length - 1, f + d)]).filter((n, k, x) => x.indexOf(n) === k); }
      Q.steps[i] = PAT.note(ns, { vel: 80 + Math.floor(R() * 40), flags: (pc(o.accents) ? 1 : 0) | (pc(o.slides) ? 2 : 0) });
      held = true;
    }
    PAT._cut(Q, b);
    return Q;
  },
  /* small random moves of velocity (± vel) and nudge (± nudge) on the range's notes */
  humanize(P, o, a, b) {
    [a, b] = PAT.range(P, a, b);
    const R = PAT.rng(o.seed), Q = PAT.clone(P);
    for (let i = a; i < b; i++) {
      const s = Q.steps[i];
      if (!PAT.isNote(s)) continue;
      if (o.vel) s.vel = Math.max(1, Math.min(127, (s.vel || 96) + Math.round((R() * 2 - 1) * o.vel)));
      if (o.nudge && Q.micro) Q.micro[i] = Math.max(MICRO.MIN, Math.min(MICRO.MAX, Q.micro[i] + Math.round((R() * 2 - 1) * o.nudge)));
    }
    return Q;
  },
  /* ready-made patterns as text, one token a step: a scale degree (1 = the root, 8 = the root an octave up;
     ' an octave up, , an octave down), chords joined by +, then > accent and ~ slide; - holds (TIE), . rests */
  PRESETS: [
    ["bass", "Acid", "1 1' . 1~ 3' . 1 5,~ 1> . 1' 7,~ 1 . 3~ 1'>"],
    ["bass", "Octaves", "1 1' 1 1' 1 1' 1 1' 1 1' 1 1' 1 1' 1 1'"],
    ["bass", "Offbeat", ". . 1 . . . 1 . . . 1 . . . 1 ."],
    ["bass", "Rolling", ". 1 1 1 . 1 1 1 . 1 1 1 . 1 1 1"],
    ["bass", "Funk", "1> . . 1' . 1 . 7, . 1 . 5, 6, . 7,~ 1"],
    ["bass", "Sub pulse", "1 - - - . . 1 - . . 1 - - - . ."],
    ["bass", "Electro", "1> . . 1 . . 1 . . . 3 . 1 . 5, ."],
    ["bass", "Minimal", "1 . . . . . 1' . . 1 . . . . . ."],
    ["arp", "Up", "1 3 5 8 1 3 5 8 1 3 5 8 1 3 5 8"],
    ["arp", "Down", "8 5 3 1 8 5 3 1 8 5 3 1 8 5 3 1"],
    ["arp", "Up-down", "1 3 5 8 10 8 5 3 1 3 5 8 10 8 5 3"],
    ["arp", "Broken", "1 5 3 8 5 10 8 12 1 5 3 8 5 10 8 12"],
    ["arp", "Berlin", "1 5 8 5 3 5 8 5 1 5 8 5 3 5 10 5"],
    ["arp", "Pedal", "1 8 1 7 1 5 1 6 1 8 1 7 1 5 1 3"],
    ["arp", "Trance", "1 5 8 1' 1 5 8 1' 6, 3 6 3' 4, 1 4 1'"],
    ["chords", "Stabs", "1+3+5> . . 1+3+5 . . 1+3+5 . . . 1+3+5 . 6,+1+3 . . ."],
    ["chords", "Progression", "1+3+5 - - - 6,+1+3 - - - 4,+6,+1 - - - 5,+7,+2 - - -"],
    ["chords", "Gate", "1+5+8 . 1+5+8 1+5+8 . 1+5+8 . 1+5+8 1+5+8 . 1+5+8 . 1+5+8 1+5+8 . 1+5+8"],
    ["chords", "Dub", "1+3+5 - . . . . . . 1+3+5 - . . . . . ."],
    ["chords", "House", ". . 1+3+5+7 . . . 1+3+5+7 . . . 1+3+5+7 . . 1+3+5+7 . ."],
    ["lead", "Pluck", "1 . 3 5 . 8 . 7 5 . 3 . 2 . 1 ."],
    ["lead", "Call", "5 - 6 5 3 - 1 . 2 - 3 2 1 - . ."],
  ],
  /* one degree token ("3'", "5,") as a note */
  degNote(tok, key) {
    const m = /^(\d+)([',]*)$/.exec(tok);
    if (!m) return null;
    const iv = PAT.SCALES[key.scale] || PAT.SCALES.MIN, d = Math.max(1, +m[1]) - 1;
    let n = (key.base ?? 48) + (key.root | 0) + 12 * Math.floor(d / iv.length) + iv[d % iv.length];
    for (const c of m[2]) n += c === "'" ? 12 : -12;
    return n >= 0 && n <= 127 ? n : null;
  },
  /* pattern text -> steps (null on a bad token) */
  fromText(text, key) {
    const out = [];
    for (const tok of String(text).trim().split(/\s+/).filter(Boolean)) {
      if (tok === ".") { out.push(PAT.rest()); continue; }
      if (tok === "-") { out.push(PAT.tie()); continue; }
      const m = /^([0-9',+]+?)([>~]*)$/.exec(tok);
      if (!m) return null;
      const ns = m[1].split("+").map((x) => PAT.degNote(x, key));
      if (!ns.length || ns.length > 4 || ns.includes(null)) return null;
      out.push(PAT.note(ns, { flags: (m[2].includes(">") ? 1 : 0) | (m[2].includes("~") ? 2 : 0) }));
    }
    return out.length ? out : null;
  },
  /* the text's steps over the range, again and again */
  genText(P, text, key, a, b) {
    [a, b] = PAT.range(P, a, b);
    const st = PAT.fromText(text, key);
    if (!st) return null;
    const Q = PAT.clone(P);
    for (let i = a; i < b; i++) { Q.steps[i] = PAT.cstep(st[(i - a) % st.length]); if (Q.micro) Q.micro[i] = 0; }
    if (Q.steps[a].time === 1) Q.steps[a] = PAT.rest();   /* (nothing to hold at the start) */
    PAT._cut(Q, b);
    return Q;
  },

  /* ---- the device: what to send to go from A to B ---- */
  diff(A, B) {
    const N = Math.min(A.steps.length, B.steps.length), d = { steps: [], micro: [], fill: [], lockDel: [], lockSet: [], len: A.len !== B.len ? B.len : null };
    for (let i = 0; i < N; i++) if (!PAT.same(A.steps[i], B.steps[i])) d.steps.push(i);
    if (A.micro && B.micro) for (let i = 0; i < N; i++) if ((A.micro[i] | 0) !== (B.micro[i] | 0)) d.micro.push(i);
    if (A.fill && B.fill) for (let i = 0; i < N; i++) if ((A.fill[i] | 0) !== (B.fill[i] | 0)) d.fill.push(i);
    if (A.locks && B.locks) {
      const key = (l) => l.step * 256 + l.param, bk = new Map(B.locks.map((l) => [key(l), l])), ak = new Map(A.locks.map((l) => [key(l), l]));
      for (const l of A.locks) if (!bk.has(key(l))) d.lockDel.push({ step: l.step, param: l.param });
      for (const l of B.locks) { const o = ak.get(key(l)); if (!o || o.value !== l.value) d.lockSet.push({ ...l }); }
    }
    d.n = d.steps.length + d.micro.length + d.fill.length + d.lockDel.length + d.lockSet.length + (d.len != null ? 1 : 0);
    return d;
  },

  /* ---- files (.clipper-pattern.json) and the browser's pattern bank ---- */
  toFile(P, name = "") {
    const len = P.len, o = { format: PAT.FILE, version: 1, name: String(name).slice(0, 40), len,
      steps: P.steps.slice(0, len).map((s) => { const c = PAT.cstep(s); return [c.n, c.notes, c.time, c.flags, c.vel, c.lvl, c.rat]; }) };
    if (P.micro) o.micro = P.micro.slice(0, len);
    if (P.fill) o.fill = P.fill.slice(0, len);
    if (P.locks) o.locks = P.locks.filter((l) => l.step < len).map((l) => [l.step, l.param, l.value]);
    return o;
  },
  /* a file -> a P of N steps (the steps after its length rest); throws on what is not a pattern */
  fromFile(o, N = 64) {
    if (!o || o.format !== PAT.FILE || !Array.isArray(o.steps) || !o.steps.length) throw new Error("not a Clipper pattern");
    const int = (v, lo, hi) => { if (!Number.isFinite(+v)) throw new Error("bad value"); return Math.max(lo, Math.min(hi, Math.round(+v))); };
    const len = int(o.len ?? o.steps.length, 1, N);
    const steps = Array.from({ length: N }, (_, i) => {
      const s = o.steps[i];
      if (!s || i >= len) return PAT.rest();
      if (!Array.isArray(s) || !Array.isArray(s[1])) throw new Error("bad step " + (i + 1));
      return PAT.cstep({ n: int(s[0], 0, 4), notes: s[1].map((x) => int(x, 0, 127)), time: int(s[2], 0, 2), flags: int(s[3], 0, 3),
        vel: int(s[4], 0, 127), lvl: int(s[5] ?? 0, 0, 255), rat: int(s[6] ?? 0, 0, 255) });
    });
    const micro = Array.from({ length: N }, (_, i) => (Array.isArray(o.micro) && i < len ? int(o.micro[i] ?? 0, MICRO.MIN, MICRO.MAX) : 0));
    const fill = Array.from({ length: N }, (_, i) => (Array.isArray(o.fill) && i < len ? int(o.fill[i] ?? 0, 0, 2) : 0));
    const locks = (Array.isArray(o.locks) ? o.locks : []).filter((l) => Array.isArray(l) && +l[0] < len)
      .map((l) => ({ step: int(l[0], 0, N - 1), param: int(l[1], 0, 127), value: int(l[2], -8192, 8191) }));
    return PAT._keepLocks({ len, steps, micro, fill, locks });
  },
  /* the file's lock-able parts kept to what this device has (no micro / fill / locks on older firmware) */
  fitTo(P, like) {
    const Q = PAT.clone(P);
    if (!like.micro) Q.micro = null; else if (!Q.micro) Q.micro = new Array(Q.steps.length).fill(0);
    if (!like.fill) Q.fill = null; else if (!Q.fill) Q.fill = new Array(Q.steps.length).fill(0);
    if (!like.locks) Q.locks = null; else if (!Q.locks) Q.locks = [];
    return Q;
  },
  BANK_MAX: 128,
  /* the bank: [{name, at, pat}] by name (saving under a name that is there replaces it) */
  bankPut(list, name, file, at = Date.now()) {
    name = String(name).trim().slice(0, 40) || "pattern";
    const out = list.filter((x) => x.name !== name);
    out.push({ name, at, pat: { ...file, name } });
    out.sort((x, y) => x.name.localeCompare(y.name));
    if (out.length > PAT.BANK_MAX) throw new Error("bank full");
    return out;
  },
};
const SMF = {
  PPQ: 96,
  /* ticks of one step at DIV div (a quarter = ppq ticks) */
  stepTicks: (div, ppq = SMF.PPQ) => Math.round(ppq * 4 / (ROLL.DIV_PER_BAR[div] ?? 16)),
  vlq(n) { const a = [n & 0x7F]; while ((n >>= 7)) a.unshift(0x80 | (n & 0x7F)); return a; },
  /* a format 0 file: notes [{t, dur, key, vel}] on channel ch (0..15), the tempo, a track name */
  write(notes, { ppq = SMF.PPQ, bpm = 120, ch = 0, name = "" } = {}) {
    const ev = [];
    for (const n of notes) {
      ev.push({ t: n.t, o: 1, b: [0x90 | ch, n.key & 0x7F, Math.max(1, Math.min(127, n.vel | 0))] });
      ev.push({ t: n.t + Math.max(1, n.dur), o: 0, b: [0x80 | ch, n.key & 0x7F, 0] });
    }
    ev.sort((a, b) => a.t - b.t || a.o - b.o);           /* (a note-off before a note-on at the same tick) */
    const us = Math.round(60000000 / Math.max(1, bpm));
    const nm = Array.from(String(name), (c) => c.charCodeAt(0) & 0x7F);
    const tr = [0, 0xFF, 0x51, 3, (us >> 16) & 255, (us >> 8) & 255, us & 255, 0, 0xFF, 0x58, 4, 4, 2, 24, 8];
    if (nm.length) tr.push(0, 0xFF, 0x03, ...SMF.vlq(nm.length), ...nm);
    let last = 0;
    for (const e of ev) { tr.push(...SMF.vlq(e.t - last), ...e.b); last = e.t; }
    tr.push(0, 0xFF, 0x2F, 0);
    const u32 = (n) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255];
    return Uint8Array.from([0x4D, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, (ppq >> 8) & 255, ppq & 255,
      0x4D, 0x54, 0x72, 0x6B, ...u32(tr.length), ...tr]);
  },
  /* -> {format, ppq, bpm, tracks: [{name, notes: [{t, dur, key, vel, ch}]}]}; throws on a non-MIDI file */
  read(bytes) {
    const d = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
    const str = (o) => String.fromCharCode(d[o], d[o + 1], d[o + 2], d[o + 3]);
    const u32 = (o) => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;
    if (d.length < 14 || str(0) !== "MThd") throw new Error("not a MIDI file");
    const format = (d[8] << 8) | d[9], ntrk = (d[10] << 8) | d[11], div = (d[12] << 8) | d[13];
    if (div & 0x8000) throw new Error("SMPTE time is not supported");
    let o = 8 + u32(4), bpm = 0;
    const tracks = [];
    for (let k = 0; k < ntrk && o + 8 <= d.length; k++) {
      if (str(o) !== "MTrk") { o += 8 + u32(o + 4); k--; if (o >= d.length) break; continue; }
      const end = Math.min(d.length, o + 8 + u32(o + 4));
      let p = o + 8, t = 0, run = 0, name = "";
      const on = new Map(), notes = [];
      const vlq = () => { let n = 0, c; do { c = d[p++]; n = (n << 7) | (c & 0x7F); } while (c & 0x80 && p < end); return n; };
      const off = (ch, key) => {
        const q = on.get(ch * 128 + key);
        if (q && q.length) { const n = q.shift(); n.dur = Math.max(1, t - n.t); notes.push(n); }
      };
      while (p < end) {
        t += vlq();
        let st = d[p];
        if (st & 0x80) p++; else st = run;
        if (st === 0xFF) {
          const type = d[p++], len = vlq();
          if (type === 0x51 && len === 3 && !bpm) bpm = 60000000 / ((d[p] << 16) | (d[p + 1] << 8) | d[p + 2]);
          if (type === 0x03 && !name) name = String.fromCharCode(...d.subarray(p, p + len)).replace(/[^\x20-\x7E]/g, "");
          p += len;
          continue;
        }
        if (st === 0xF0 || st === 0xF7) { p += vlq(); continue; }
        run = st;
        const hi = st & 0xF0, ch = st & 15;
        const a = d[p++], b = hi === 0xC0 || hi === 0xD0 ? 0 : d[p++];
        if (hi === 0x90 && b) {
          const q = on.get(ch * 128 + a) || [];
          q.push({ t, dur: 0, key: a, vel: b, ch });
          on.set(ch * 128 + a, q);
        } else if (hi === 0x80 || (hi === 0x90 && !b)) off(ch, a);
      }
      for (const [k, q] of on) for (const n of q) { n.dur = Math.max(1, t - n.t); notes.push(n); }   /* (no note-off: to the end) */
      notes.sort((x, y) => x.t - y.t || x.key - y.key);
      tracks.push({ name, notes });
      o = end;
    }
    return { format, ppq: div || SMF.PPQ, bpm: Math.round(bpm || 120), tracks };
  },
  /* a synth track's steps -> notes (a chord's notes last its steps; the step's level as the device plays it) */
  fromSteps(steps, len, div, ppq = SMF.PPQ) {
    const tk = SMF.stepTicks(div, ppq), V = [0, 42, 72, 127], out = [];
    for (const c of ROLL.chords(steps, len)) {
      const s = steps[c.at], base = s.flags & 1 ? 127 : s.vel || 96;
      c.notes.forEach((key, i) => {
        const lv = (s.lvl >> (2 * i)) & 3;
        out.push({ t: c.at * tk, dur: c.dur * tk - Math.max(1, tk >> 4), key, vel: lv ? V[lv] : base });
      });
    }
    return out;
  },
  /* the drum track's steps -> GM notes on their lanes (a hit lasts a quarter of its step) */
  fromDrums(dsteps, len, div, ppq = SMF.PPQ) {
    const tk = SMF.stepTicks(div, ppq), V = [100, 42, 72, 127], out = [];
    for (let i = 0; i < len; i++) {
      const d = dsteps[i];
      if (!d) continue;
      for (let l = 0; l < 16; l++) if ((d.on >> l) & 1) out.push({ t: i * tk, dur: Math.max(1, tk >> 2), key: DRUM_LANES[l][0], vel: V[d.lvl[l] & 3] });
    }
    return out;
  },
  /* the GM drum note -> its lane (firmware drums.c LANE_OF_GM) */
  LANE_OF_GM: [1, 0, 7, 2, 3, 8, 9, 4, 9, 6, 9, 5, 10, 10, 11, 10, 12, 11, 12, 13, 11, 15, 11, 13, 12, 14, 14, 14, 14, 14,
    14, 14, 15, 15, 13, 13, 15, 15, 13, 13, 7, 7, 7, 14, 14, 15, 15],
  laneOf: (key) => (key < 35 ? 0 : key > 81 ? 13 : SMF.LANE_OF_GM[key - 35]),
  levelOf: (vel) => (vel < 56 ? 1 : vel < 88 ? 2 : vel < 116 ? 0 : 3),   /* (drums.c vel_lvl: GHOST, SOFT, NORM, HARD) */
  /* notes -> the steps of a track at DIV div, at most nstep. The report says what changed on the way:
     {notes, steps, moved (off the grid by more than a quarter step), chordCut (notes over 4 on a step),
      overlap (a chord cut short by the next one), dropped (past the last step), merged (on the same step)} */
  toSteps(notes, ppq, div, nstep, drum = false) {
    const tk = ppq * 4 / (ROLL.DIV_PER_BAR[div] ?? 16);
    const rep = { notes: notes.length, steps: 0, moved: 0, chordCut: 0, overlap: 0, dropped: 0, merged: 0 };
    const at = new Map();
    for (const n of notes) {
      const pos = n.t / tk, i = Math.round(pos);
      if (Math.abs(pos - i) > 0.25) rep.moved++;
      if (i >= nstep) { rep.dropped++; continue; }
      if (!at.has(i)) at.set(i, []);
      at.get(i).push({ ...n, end: Math.max(i + 1, Math.round((n.t + n.dur) / tk)) });
    }
    if (drum) {
      const ds = Array.from({ length: nstep }, emptyDrum);
      let last = -1;
      for (const [i, list] of at) {
        for (const n of list) {
          const l = SMF.laneOf(n.key);
          if ((ds[i].on >> l) & 1) { rep.merged++; continue; }
          ds[i].on |= 1 << l;
          ds[i].lvl[l] = SMF.levelOf(n.vel);
        }
        last = Math.max(last, i);
      }
      rep.steps = last + 1;
      return { dsteps: ds, len: Math.max(1, last + 1), report: rep };
    }
    const steps = Array.from({ length: nstep }, ROLL.rest);
    const starts = [...at.keys()].sort((a, b) => a - b);
    let last = -1;
    starts.forEach((i, k) => {
      let list = at.get(i);
      const keys = new Set();
      list = list.filter((n) => (keys.has(n.key) ? (rep.merged++, false) : keys.add(n.key)));
      if (list.length > 4) { rep.chordCut += list.length - 4; list = list.slice().sort((a, b) => b.vel - a.vel).slice(0, 4); }
      list.sort((a, b) => a.key - b.key);
      const vel = Math.max(...list.map((n) => n.vel));
      let end = Math.min(nstep, Math.max(...list.map((n) => n.end)));
      const next = k + 1 < starts.length ? starts[k + 1] : nstep;
      if (end > next) { rep.overlap++; end = next; }
      steps[i] = { n: list.length, notes: list.map((n) => n.key).concat([0, 0, 0, 0]).slice(0, 4), time: 0, flags: 0, vel, lvl: 0, rat: 0 };
      for (let j = i + 1; j < end; j++) steps[j] = ROLL.tie();
      last = Math.max(last, end - 1);
    });
    rep.steps = last + 1;
    return { steps, len: Math.max(1, last + 1), report: rep };
  },
};
const sqDiv = () => { const p = LAYOUT.find((x) => x.title === "PATTERN"); return p && desc(0, p.ids[1]) ? val(0, p.ids[1]) : 2; };
SQ.gen = { type: "euc", k: 5, n: 16, rot: 0, scale: "MIN", root: 0, dens: 70, seed: 1, preset: 0, hvel: 20, hnud: 4 };
SQ.undo = null;
const GEN_T = [["euc", "Euclídeo"], ["rnd", "Aleatorio"], ["pre", "Preset"], ["hum", "Humanizar"]];
const SCL = Object.keys(PAT.SCALES);
const sameStep = (x, y) => x.n === y.n && x.time === y.time && (x.flags & 3) === (y.flags & 3) && (x.vel | 0) === (y.vel | 0)
  && (x.lvl | 0) === (y.lvl | 0) && (x.rat | 0) === (y.rat | 0) && [0, 1, 2, 3].every((k) => (x.notes[k] | 0) === (y.notes[k] | 0));
function sqApplyAll(steps, micro) {                  /* manda solo los pasos y los nudges que cambian */
  steps.forEach((st, i) => { const cur = SQ.steps[i]; if (cur && !sameStep(cur, st)) sqSet(i, { n: st.n, notes: st.notes.slice(), time: st.time, flags: st.flags, vel: st.vel, lvl: st.lvl, rat: st.rat }); });
  if (micro && SQX.micro) micro.forEach((m, i) => { if (i < SQX.micro.length && (m | 0) !== (SQX.micro[i] | 0)) { SQX.micro[i] = m | 0;
    rq(C_MICRO_SET, [SQX.tr & 127, i & 127, ((m | 0) + 64) & 127], { key: "micro:" + i, quiet: true, retries: 0, timeout: 900 }).catch(() => {}); } });
}
const sqSnap = () => { SQ.undo = { steps: SQ.steps.map(cpStep), micro: SQX.micro ? SQX.micro.slice() : null, len: sqLen() }; };
function genRange() { const len = sqLen(), [a, b] = sqRange(); return a === b ? [0, len] : [a, b + 1]; }   /* un solo paso elegido: todo el patrón */
function genApply() {
  const len = sqLen(), [A, B] = genRange(), g = SQ.gen, P = PAT.make(SQ.steps, SQX.micro, null, [], len);
  let Q = null;
  if (g.type === "euc") Q = PAT.genEuclid(P, { k: g.k, n: g.n, rot: g.rot, notes: [SQ.last], vel: 100 }, A, B);
  else if (g.type === "rnd") Q = PAT.genRandom(P, { seed: g.seed, root: g.root, scale: g.scale, density: g.dens, motion: 40, oct: 1, base: Math.floor(SQ.last / 12) * 12 }, A, B);
  else if (g.type === "pre") Q = PAT.genText(P, PAT.PRESETS[g.preset][2], { root: g.root, scale: g.scale, base: Math.floor(SQ.last / 12) * 12 }, A, B);
  else Q = PAT.humanize(P, { seed: g.seed, vel: g.hvel, nudge: g.hnud }, A, B);
  if (!Q) { toast(-1, "No salió nada con estos ajustes"); return; }
  sqSnap(); sqApplyAll(Q.steps, Q.micro); toast(-1, `Generado en <b class="num">${A + 1}–${B}</b>`);
}
function genUndo() {
  const u = SQ.undo; if (!u) return; SQ.undo = null;
  const id = sqLenId(); if (id >= 0 && u.len !== sqLen()) setVal(0, id, u.len);
  sqApplyAll(u.steps, u.micro); toast(-1, "Deshecho");
}
function genStep(key, d) {
  const g = SQ.gen, lim = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  if (key === "type") { const i = GEN_T.findIndex((t) => t[0] === g.type); g.type = GEN_T[(i + d + GEN_T.length) % GEN_T.length][0]; }
  else if (key === "k") g.k = lim(g.k + d, 1, g.n);
  else if (key === "n") { g.n = lim(g.n + d, 2, 32); g.k = Math.min(g.k, g.n); }
  else if (key === "rot") g.rot = (g.rot + d + g.n) % g.n;
  else if (key === "scale") g.scale = SCL[(SCL.indexOf(g.scale) + d + SCL.length) % SCL.length];
  else if (key === "root") g.root = (g.root + d + 12) % 12;
  else if (key === "dens") g.dens = lim(g.dens + d * 10, 10, 100);
  else if (key === "seed") g.seed = 1 + Math.floor(Math.random() * 99999);
  else if (key === "preset") g.preset = (g.preset + d + PAT.PRESETS.length) % PAT.PRESETS.length;
  else if (key === "hvel") g.hvel = lim(g.hvel + d * 5, 0, 60);
  else if (key === "hnud") g.hnud = lim(g.hnud + d, 0, 16);
}
function sqGen() {
  const g = SQ.gen, [A, B] = genRange();
  const ar = (key, lab, txt) => `<span class="gnc"><small>${lab}</small><span class="arw"><button data-gen="${key}" data-d="-1" aria-label="${lab}: menos"><svg class="i"><use href="#i-prev"/></svg></button>
    <b class="num">${txt}</b><button data-gen="${key}" data-d="1" aria-label="${lab}: más"><svg class="i"><use href="#i-next"/></svg></button></span></span>`;
  const pr = PAT.PRESETS[g.preset];
  const body = g.type === "euc" ? ar("k", "Golpes", g.k) + ar("n", "Pasos", g.n) + ar("rot", "Giro", g.rot) + `<span class="gnc"><small>Nota</small><b class="num">${noteName(SQ.last)}</b></span>`
    : g.type === "rnd" ? ar("scale", "Escala", g.scale) + ar("root", "Raíz", NOTE_N[g.root]) + ar("dens", "Densidad", g.dens + "%") + `<button class="sqk" data-gen="seed">Otra tirada</button>`
    : g.type === "pre" ? ar("preset", `Preset ${g.preset + 1}/${PAT.PRESETS.length}`, `${esc(pr[1])} <small>${esc(pr[0])}</small>`) + ar("scale", "Escala", g.scale) + ar("root", "Raíz", NOTE_N[g.root])
    : ar("hvel", "Velocidad ±", g.hvel) + ar("hnud", "Nudge ±", g.hnud) + `<button class="sqk" data-gen="seed">Otra tirada</button>`;
  return `<div class="sqgen"><div class="sqlh"><b>Generar</b><div class="seg">${GEN_T.map(([k, t]) => `<button data-gentype="${k}" aria-pressed="${g.type === k}">${t}</button>`).join("")}</div></div>
    <div class="gnr">${body}</div>
    <div class="gnr"><button class="btn pri" data-gen="go">${g.type === "hum" ? "Humanizar" : "Generar"} en ${A + 1}–${B}</button>${SQ.undo ? `<button class="sqk" data-gen="undo">Deshacer</button>` : ""}
      <span class="sqsep"></span><b class="gnm">MIDI</b><button class="sqk" data-gen="midiout">Exportar .mid</button>
      <label class="sqk">Importar .mid<input type="file" accept=".mid,.midi,audio/midi" data-midiin="1" hidden></label></div></div>`;
}
function midiExport() {
  const len = sqLen(), notes = SMF.fromSteps(SQ.steps, len, sqDiv());
  if (!notes.length) { toast(-1, "El patrón no tiene notas"); return; }
  const bytes = SMF.write(notes, { bpm: val(1, 0) || 120, name: "CLIPPER" });
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/midi" })), a = document.createElement("a");
  const d = new Date(), f2 = (x) => String(x).padStart(2, "0");
  a.href = url; a.download = `clipper-patron-${d.getFullYear()}${f2(d.getMonth() + 1)}${f2(d.getDate())}-${f2(d.getHours())}${f2(d.getMinutes())}.mid`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(-1, `Exportadas <b class="num">${notes.length}</b> notas`);
}
async function midiImport(file) {
  try {
    const m = SMF.read(new Uint8Array(await file.arrayBuffer())), tr = m.tracks.find((t) => t.notes.length);
    if (!tr) { toast(-1, "El MIDI no tiene notas"); return; }
    const r = SMF.toSteps(tr.notes, m.ppq, sqDiv(), M.info.nstep), steps = r.steps.slice(0, M.info.nstep);
    while (steps.length < M.info.nstep) steps.push(PAT.rest());
    sqSnap(); const id = sqLenId(); if (id >= 0 && r.len) setVal(0, id, Math.min(M.info.nstep, r.len));
    sqApplyAll(steps, null);
    const rep = r.report || {}, avisos = [rep.moved && `${rep.moved} movidas a la rejilla`, rep.chordCut && `${rep.chordCut} notas de más en acordes`, rep.dropped && `${rep.dropped} fuera del patrón`].filter(Boolean);
    toast(-1, `Importado <b>${esc(file.name)}</b>${avisos.length ? " · " + avisos.join(", ") : ""}`);
  } catch (e) { toast(-1, "No es un MIDI que pueda leer"); }
}
document.addEventListener("click", (e) => {
  if (!SQ.full || (S.folder !== "SEQ" && S.folder !== "ESTUDIO")) return;
  const ty = e.target.closest("[data-gentype]"); if (ty) { SQ.gen.type = ty.dataset.gentype; renderWork(); return; }
  const b = e.target.closest("[data-gen]"); if (!b) return;
  const k = b.dataset.gen;
  if (k === "go") genApply(); else if (k === "undo") genUndo(); else if (k === "midiout") { midiExport(); return; }
  else genStep(k, +b.dataset.d || 0);
  renderWork();
});
document.addEventListener("change", (e) => {
  const inp = e.target.closest && e.target.closest("[data-midiin]"); if (!inp || !inp.files || !inp.files[0]) return;
  midiImport(inp.files[0]).then(() => renderWork()); inp.value = "";
});

