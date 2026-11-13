/* ===================================================================== PC ====
   What the Studio editor already asks the FM-1 for and Live did not yet. The formats are read from the published
   editor (isod89.github.io/clipper-fm1/webapp/editor). Rule: READS, and writes whose format was read in full, are
   wired; writes whose format is only half known stay in PC.pend(): a write with a guessed format can damage real data
   on the synth. All of this is to be tried at home with the FM-1. */
const CE = { UP_ERASE: 21, SMP_ERASE: 14, SMP_INFO: 15, TRACK: 27, TRACK_MIX: 28, BK_LIST: 34, DSYN_LIST: 72, DSYN_PLAY: 76,
  MSEQ_GET: 93, MSEQ_PUT: 94, TUNE_GET: 95, TUNE_PUT: 96, PROJECT: 9 };
const PCD = {};                                 /* what was read: undefined not asked, "…" asking, null no answer, or the data */
const u35 = (r) => { let v = 0; for (let i = 0; i < 5; i++) v += r.b() * 2 ** (7 * i); return v; };
const PCP = {                                   /* the replies, as the editor reads them */
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
const PCV = new Set(["LFO", "GLO", "SEQ", "SAVE", "ESTUDIO"]);  /* the views that show something from here */
const PC = {
  load(key, cmd, args, parse) {                 /* once a session; when it arrives, the view is drawn again */
    if (PCD[key] !== undefined) return PCD[key];
    PCD[key] = "…";
    let pr; try { pr = rq(cmd, args, { key: "pc-" + key, quiet: true, retries: 0, timeout: 650 }); } catch (e) { PCD[key] = null; return null; }
    pr.then((a) => { try { PCD[key] = parse(a); } catch (e) { PCD[key] = null; } }, () => { PCD[key] = null; })
      .finally(() => { if (PCV.has(S.folder)) renderWork(); });
    return "…";
  },
  again(key) { delete PCD[key]; renderWork(); },
  async act(cmd, args, ok) {                    /* writes whose format was read in full */
    try { await rq(cmd, args, { quiet: true, retries: 0, timeout: 900 }); if (ok) toast(-1, ok); return true; }
    catch (e) { toast(-1, "El FM-1 no contestó"); return false; }
  },
  pend(what) { toast(-1, `<b>Pendiente</b> ${esc(what)} — se termina en el PC`); },
};
/* the honest gap: asking, or the synth didn't answer this */
const pcEmpty = (v, what) => v === "…" ? `<p class="pce">Leyendo ${esc(what)} del FM-1…</p>`
  : `<p class="pce">El FM-1 no contestó a esto. ${M.mock ? "El FM-1 de ejemplo no lo sabe hacer; " : ""}con el sinte de verdad sale aquí.</p>`;
const blk = (title, icon, body, cls = "") => `<section class="blk${cls ? " " + cls : ""}" data-blk="${esc(title)}">
  <header class="bh"><h2><svg class="i"><use href="#i-${icon}"/></svg>${esc(title)}</h2></header>${body}</section>`;

/* ---- MATRIX: 12 slots of source → destination → amount. Already in pdesc and the DUMP: they work ---- */
const MX = [60, 63, 66, 69, 72, 75, 100, 103, 106, 109, 112, 115];   /* each slot's SRC; DST +1, AMT +2 */
function matrixBlock() {
  if (!desc(0, MX[0])) return "";
  const row = (src, i) => `<div class="mxr${val(0, src) ? "" : " off"}" data-src="${src}"><span class="mxn num">${String(i + 1).padStart(2, "0")}</span>
    ${tileP(0, src, 0, "MATRIX", false)}<span class="mxa" aria-hidden="true">→</span>${tileP(0, src + 1, 1, "MATRIX", false)}${tileP(0, src + 2, 2, "MATRIX", false)}</div>`;
  return blk("MATRIX", "lfo", `<div class="mx">${MX.map(row).join("")}</div>`, "wide");
}
/* ---- LAYER: LVL, TRIM, MUTE, the three sound parameters no page publishes ---- */
function layerBlock() {
  const ids = [[0, 0], [8, 1], [40, 3]].filter(([id]) => desc(0, id));
  if (!ids.length) return "";
  return blk("LAYER", "edit", `<div class="bb flat"><div class="tz">${ids.map(([id, k]) => tileP(0, id, k, "LAYER", false)).join("")}</div></div>`);
}
/* ---- MOD SEQ: 4 lanes of 16 steps, −8 to 7. Painted by dragging a finger; sent on release (MSEQ_PUT) ---- */
const mssStyle = (x) => `--t:${x > 0 ? 50 - x / 8 * 50 : 50}%;--h:${Math.abs(x) / 8 * 50}%`;
function mseqBlock() {
  const v = PC.load("mseq", CE.MSEQ_GET, [0], PCP.mseq);
  if (!v || v === "…" || !v.steps) return blk("MOD SEQ", "lfo", pcEmpty(v && v.steps === null ? null : v, "la secuencia de modulación"), "wide");
  return blk("MOD SEQ", "lfo", `<div class="msq" data-msq="1">${[0, 1, 2, 3].map((l) => `<div class="msl" style="--c:${KC[l]}"><span class="msn num">${l + 1}</span>
      ${v.steps.slice(l * 16, l * 16 + 16).map((x, i) => `<div class="mss" data-l="${l}" data-i="${i}" style="${mssStyle(x)}"><i></i></div>`).join("")}</div>`).join("")}</div>
    <p class="msh">Arrastra el dedo por los pasos: arriba sube, abajo baja. Se manda al soltar.</p>`, "wide");
}
/* ---- TUNING: the root with ‹ ›, each degree dragged sideways (1 cent a pixel); sent on release (TUNE_PUT) ---- */
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
const HIDE = new Set(["MIDI", "MIDI 2"]);      /* its parameters already show in SYSTEM: the card was lying */

/* ---- SEQ: the tracks (TRACK). A tap picks one and the sequencer edits it; the level is dragged; MUTE toggles (TRACK_MIX) ---- */
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
function songBlock() {          /* the song's format (ARR: 16 steps, up to 64 bars) has no command read yet */
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

