/* ----------------------------------------------------------------- studio --- */
/* ESTUDIO, Live's own: what the device's pages do not reach, in tabs. The advanced sequencer (seq.js, its full mode),
   the samples, drum kits, library and projects (bento.js devView), the complete backup (BK_LIST / BK_GET / BK_PUT and
   the sample slots, as editor.html backupCapture / backupRestore: the same file, either way), the system */
const STU = { tab: "seq", busy: false, prog: 0, msg: "" };
const STABS = [["seq", "Secuenciador avanzado", "seq"], ["hy", "HYBRID", "edit"], ["SMP", "Samples", "save"], ["LIB", "Biblioteca", "save"],
  ["PRJ", "Proyectos", "save"], ["bak", "Copia de seguridad", "save"], ["sys", "Sistema", "glo"]];
function studioView() {
  const t = STU.tab;
  let body;
  if (t === "seq") { SQ.full = true; body = seqBlock(); }
  else if (t === "hy") body = hyView();
  else if (t === "bak") body = backupView();
  else if (t === "sys") body = systemView();
  else body = devView(t);
  return `<div class="stv"><nav class="stt" aria-label="Estudio">${STABS.map(([k, n, ic]) => `<button data-stab="${k}" aria-current="${k === t}"><svg class="i"><use href="#i-${ic}"/></svg>${n}</button>`).join("")}</nav>
    <div class="stb">${body}</div></div>`;
}
function openStudio(tab) { if (tab) STU.tab = tab; S.folder = "ESTUDIO"; renderNav(); renderWork(); $("edit").scrollTop = 0; }
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-stab]"); if (b) { if (b.dataset.stgo) openStudio(b.dataset.stab); else { STU.tab = b.dataset.stab; renderWork(); } return; }
  const a = e.target.closest(`a[href="${STUDIO_URL}"]`); if (a) { e.preventDefault(); openStudio(); }
}, true);

/* ---- the complete backup: projects, the user presets, the samples, the settings, in one file (the editor's format) */
const BKX = { FORMAT: "sloop-backup", VERSION: 1, SAMPLES: [32, 33, 34, 35], RESTORE: [6, 7, 12, 13, 8, 9, 2, 3, 4, 5, 0, 14, 1] };
const u35e = (v) => { v >>>= 0; return [0, 1, 2, 3, 4].map((k) => Math.floor(v / 2 ** (7 * k)) & 0x7F); };
const b64e = (b) => { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = (s) => Uint8Array.from(atob(String(s).replace(/[^A-Za-z0-9+/=]/g, "")), (c) => c.charCodeAt(0));
const projFmt = (d) => (d && d.length >= 4 && d[1] === 0x4E && d[2] === 0x55 && d[3] === 0x46 ? d[0] - 0x30 : 0);
const fwAtLeast = (v, want) => { const m = /(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(v || "")); if (!m) return false; const a = [+m[1], +m[2], +(m[3] || 0)];
  for (let i = 0; i < 3; i++) if (a[i] !== want[i]) return a[i] > want[i]; return true; };
const devFmt = (info) => (/clipper/i.test(info.version || "") ? (fwAtLeast(info.version, [0, 4, 1]) ? 6 : 5) : info.pcount >= 71 ? 6 : info.pcount >= 61 ? 5 : 4);
function bkStep(p, msg) { STU.prog = p; if (msg) STU.msg = msg; const el = $("bkp"); if (el) { el.style.width = Math.round(p * 100) + "%"; $("bkm").textContent = STU.msg; } }
async function backupSave(only, tag) {                 /* (only: the object ids to keep — 0 and 1, the project playing and the settings) */
  const o = { quiet: true, retries: 2, timeout: 1500 };
  const a = await rq(34, [], { quiet: true, retries: 0, timeout: 5000 }), r = new Reader(a), rc = r.b(), n = r.b(), items = [];
  if (rc) throw new Error(rc === 4 ? "este FM-1 no tiene memoria flash" : `el FM-1 no dio la lista (${rc})`);
  for (let i = 0; i < n; i++) { const id = r.b(); let len = 0, crc = 0; for (let k = 0; k < 5; k++) len += r.b() * 2 ** (7 * k); for (let k = 0; k < 5; k++) crc += r.b() * 2 ** (7 * k); items.push({ id, len, crc: crc >>> 0 }); }
  if (only) items.splice(0, items.length, ...items.filter((it) => only.includes(it.id)));
  const total = items.reduce((s, it) => s + it.len, 0) || 1, objects = []; let done = 0;
  for (const it of items) {
    const data = new Uint8Array(it.len);
    for (let off = 0; off < it.len; off += 256) {
      const m = Math.min(256, it.len - off), g = await rq(35, [it.id & 127, ...u35e(off), m & 127, (m >> 7) & 127], o), gr = new Reader(g);
      gr.b(); const grc = gr.b(); if (grc) throw new Error(grc === 5 ? "el FM-1 cambió mientras leía: vuelve a intentarlo" : `lectura ${it.id} (${grc})`);
      for (let k = 0; k < 5; k++) gr.b(); gr.b(); gr.b();
      const d = unpack7(g.slice(gr.i)); if (d.length !== m) throw new Error(`lectura ${it.id}: ${d.length} bytes`);
      data.set(d, off); done += m; bkStep(done / total, `Leyendo ${Math.round(done / 1024)} de ${Math.round(total / 1024)} KiB…`);
    }
    if (crc32(data) >>> 0 !== it.crc) throw new Error(`el objeto ${it.id} llegó dañado: vuelve a intentarlo`);
    objects.push({ id: it.id, len: it.len, crc: it.crc, data: b64e(data) });
  }
  const file = { format: BKX.FORMAT, version: BKX.VERSION, firmware: M.info.version, date: new Date().toISOString(), objects };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: "application/json" })), aa = document.createElement("a");
  aa.href = url; aa.download = `clipper-backup-${tag ? tag + "-" : ""}${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`; document.body.append(aa); aa.click(); aa.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  return Math.round(total / 1024);
}
async function backupRestore(file) {
  if (!file || file.format !== BKX.FORMAT || !Array.isArray(file.objects)) throw new Error("ese archivo no es una copia de Clipper o SLOOP");
  const m = new Map();
  for (const ob of file.objects) { const d = b64d(ob.data || ""); if (![...BKX.RESTORE, ...BKX.SAMPLES].includes(ob.id) || d.length !== ob.len || crc32(d) >>> 0 !== ob.crc >>> 0) throw new Error(`el objeto ${ob.id} del archivo está dañado`); m.set(ob.id, d); }
  if (!m.has(0) || !m.has(1)) throw new Error("la copia está incompleta");
  const newest = Math.max(0, ...[0, 2, 3, 4, 5].filter((id) => m.has(id)).map((id) => projFmt(m.get(id))));
  if (newest > devFmt(M.info)) throw new Error(`la copia es de un firmware más nuevo (${file.firmware || "?"}) que el del FM-1`);
  const total = [...m.values()].reduce((s, d) => s + d.length, 0) || 1, o = { quiet: true, retries: 1, timeout: 1500 }; let done = 0;
  const put = async (args, opt = o) => { const a = await rq(36, args, opt); return a[2]; };
  for (const id of BKX.RESTORE) {
    if (!m.has(id)) continue;
    const d = m.get(id);
    let rc = await put([0, id & 127, ...u35e(d.length), ...u35e(crc32(d) >>> 0)]);
    if ((rc === 1 || rc === 5) && [8, 9, 12, 13, 14].includes(id)) continue;          /* (an older device without that object) */
    if (rc) throw new Error(rc === 3 ? "para la reproducción y vuelve a intentarlo" : `no se pudo empezar a escribir ${id} (${rc})`);
    for (let off = 0; off < d.length; off += 256) {
      rc = await put([1, id & 127, ...u35e(off), ...pack7(d.subarray(off, off + 256))]); if (rc) throw new Error(`escritura ${id} (${rc})`);
      done += Math.min(256, d.length - off); bkStep(done / total, `Escribiendo ${Math.round(done / 1024)} de ${Math.round(total / 1024)} KiB…`);
    }
    rc = await put([2, id & 127], { quiet: true, retries: 0, timeout: 5000 }); if (rc) throw new Error(rc === 3 ? "para la reproducción y vuelve a intentarlo" : `no se pudo cerrar ${id} (${rc})`);
  }
  for (const id of BKX.SAMPLES) {
    if (!m.has(id)) continue;
    const d = m.get(id), k = id - 32;
    if (!d.length) { const e = await rq(14, [k & 127], { quiet: true, retries: 0, timeout: 2500 }); if (e[1]) throw new Error(`no se pudo vaciar USR${k + 1}`); continue; }
    let r = await rq(11, [k & 127], { quiet: true, retries: 0, timeout: 1000 }); if (r[1]) throw new Error(`USR${k + 1}: no empezó (${r[1]})`);
    const data = d.subarray(512);
    for (let off = 0; off < data.length; off += 256) {
      const ofs = 512 + off, w = await rq(12, [k & 127, ofs & 127, (ofs >> 7) & 127, (ofs >> 14) & 127, ...pack7(data.subarray(off, off + 256))], { quiet: true, retries: 1, timeout: 1000 });
      if (w[4]) throw new Error(`USR${k + 1}: escritura (${w[4]})`);
      done += Math.min(256, data.length - off); bkStep(done / total, `Escribiendo samples ${Math.round(done / 1024)} de ${Math.round(total / 1024)} KiB…`);
    }
    r = await rq(13, [k & 127, ...pack7(d.subarray(0, 32 + 16 * 28))], { quiet: true, retries: 0, timeout: 2500 }); if (r[1]) throw new Error(`USR${k + 1}: no cerró (${r[1]})`);
  }
}
function backupView() {
  return `<section class="blk"><header class="bh"><h2><svg class="i"><use href="#i-save"/></svg>COPIA DE SEGURIDAD</h2></header>
    <p class="msh">Todo el FM-1 en un archivo: los proyectos, los sonidos de usuario, los samples y los ajustes. Es el mismo archivo que hace el editor clásico.</p>
    <div class="bkr"><button class="btn pri" data-bk="save"${STU.busy ? " disabled" : ""}><svg class="i"><use href="#i-dl"/></svg>Guardar una copia</button>
      <label class="btn${STU.busy ? " dis" : ""}"><svg class="i"><use href="#i-undo"/></svg>Restaurar desde un archivo<input type="file" accept=".json,application/json" id="bkf" hidden${STU.busy ? " disabled" : ""}></label></div>
    <div class="bar2 bkbar"><b id="bkp" style="width:${Math.round(STU.prog * 100)}%"></b></div><p class="bkm" id="bkm">${esc(STU.msg)}</p>
    <p class="pce">Restaurar reemplaza todo lo del FM-1 por lo del archivo. Pide confirmación y el sinte tiene que estar parado.</p></section>`;
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-bk]"); if (!b || STU.busy || !M.link) return;
  STU.busy = true; STU.prog = 0; STU.msg = "Pidiendo la lista al FM-1…"; renderWork();
  try { const kib = await backupSave(); STU.msg = `Copia guardada: ${kib} KiB. Está en tus descargas.`; toast(-1, "<b>Copia guardada</b>"); }
  catch (er) { STU.msg = "No se pudo: " + er.message; }
  STU.busy = false; renderWork();
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "bkf" || !e.target.files[0] || STU.busy || !M.link) return;
  const f = e.target.files[0]; let file;
  try { file = JSON.parse(await f.text()); } catch (er) { STU.msg = "Ese archivo no se puede leer."; renderWork(); return; }
  if (!confirm(`¿Restaurar «${f.name}»? Se reemplaza todo lo que hay en el FM-1.`)) return;
  STU.busy = true; STU.prog = 0; STU.msg = "Antes, una copia de lo que hay ahora (por si acaso)…"; renderWork();
  try { await backupSave(null, "antes-de-restaurar"); } catch (er) { STU.msg = "No pude hacer la copia de lo de ahora, así que no restauro: " + er.message; STU.busy = false; renderWork(); return; }
  STU.msg = "Comprobando la copia…"; bkStep(0);
  try { await backupRestore(file); STU.msg = "Restaurado. El FM-1 tiene ahora lo de la copia."; toast(-1, "<b>Restaurado</b>"); reloadSoon(); US.slots = null; }
  catch (er) { STU.msg = "No se pudo: " + er.message; }
  STU.busy = false; renderWork();
});

/* ---- the system: what the FM-1 is and how it is doing */
function systemView() {
  const st = M.state, i = M.info || {}, users = M.list.filter((x) => x.kind === "USER").length;
  const row = (k, v) => `<div class="syr"><span>${k}</span><b class="num">${esc(String(v))}</b></div>`;
  return `<section class="blk"><header class="bh"><h2><svg class="i"><use href="#i-glo"/></svg>SISTEMA</h2></header>
    <div class="sys">${row("Firmware", i.version || "—")}${row("Protocolo", i.proto || "—")}${row("Motores", i.nengines || "—")}${row("Sonidos de fábrica", M.list.length - users)}
      ${row("Sonidos de usuario", `${users} de 32`)}${row("Favoritos", `${M.favs.length} de 16`)}${row("Pasos del patrón", i.nstep || "—")}
      ${st ? row("CPU", st.cpu + " %") + row("LATE", st.late) + row("PEAK", st.peak + " %") : ""}${row("Puerto MIDI", $("cname").textContent)}</div>
    <div class="syl"><span>Idioma · Language</span><button class="btn${LANG.cur !== "en" ? " pri" : ""}" data-lang="es">Español</button><button class="btn${LANG.cur === "en" ? " pri" : ""}" data-lang="en">English</button></div>
    <p class="msh">MIDI, sincronía y afinación se ajustan en GLO.</p></section>`;
}

/* before a project replaces the one playing: that one (and the settings) to a file first, so a wrong tap loses nothing */
async function autoBackupProject() {
  toast(-1, "Guardando el proyecto de ahora, por si acaso…");
  try { const kib = await backupSave([0, 1], "proyecto-antes-de-cargar"); toast(-1, `<b>Copia</b> del proyecto de ahora en tus descargas (${kib} KiB)`); return true; }
  catch (e) { toast(-1, "No pude copiar el proyecto de ahora: no cargo"); return false; }
}

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

/* ---- the library: sounds kept on the tablet, with tags; the file is editor.html's (felucca-library v1), so either
   reads the other's. A sound goes back to the FM-1 into a USER slot (UP_PUT: slot, engine, name, every parameter,
   the 16-step pattern) */
const LIBX = { FORMAT: "felucca-library", VERSION: 1, PAT: 16 };
const LIBV = { tag: "", q: "", slotFor: -1, busy: false };
const libAll = () => store.get("lib") || [];
const libKeep = (a) => store.set("lib", a);
function libKeys() {                             /* each parameter's key (editor.html paramKeys): a label, #2 when repeated, E0..E7 */
  const seen = {}, out = [];
  for (let i = 0; i < M.info.pcount; i++) {
    if (i >= M.info.pe0) { out.push("E" + (i - M.info.pe0)); continue; }
    const l = (M.pdesc[i] && M.pdesc[i].label) || "P" + i; seen[l] = (seen[l] || 0) + 1; out.push(seen[l] > 1 ? `${l}#${seen[l]}` : l);
  }
  return out;
}
const libTags = (s) => [...new Set(String(s || "").split(/[,;]+/).map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
function libNow() {                              /* the sound playing, as a library entry */
  const x = M.list[entryNow()], t = new Date().toISOString();
  return { name: cleanName(x ? x.name : M.info.engines[M.engine]) || "PATCH", engine: M.engine, engineName: M.info.engines[M.engine],
    params: M.p.slice(0, M.info.pcount), pattern: null, tags: x && x.kind && x.kind !== "USER" ? [x.kind.toLowerCase()] : [], created: t, modified: t };
}
function libFile(list) {
  return { format: LIBX.FORMAT, version: LIBX.VERSION, kind: "library", firmware: M.info.version || "", pCount: M.info.pcount, pE0: M.info.pe0,
    paramLabels: libKeys(), engines: M.info.engines, exported: new Date().toISOString(),
    patches: list.map((p) => ({ name: p.name, engine: p.engine, engineName: p.engineName, params: p.params, pattern: p.pattern, tags: p.tags, created: p.created, modified: p.modified })) };
}
function libRead(j) {                            /* a file -> entries, the parameters by key, the engines by name */
  if (!j || j.format !== LIBX.FORMAT || !Array.isArray(j.patches)) throw new Error("no es una biblioteca de Felucca");
  const to = libKeys(), from = Array.isArray(j.paramLabels) ? j.paramLabels : null, at = from && new Map(from.map((k, i) => [k, i])), t = new Date().toISOString();
  return j.patches.filter((p) => p && Array.isArray(p.params)).map((p) => {
    const e = p.engineName && M.info.engines.includes(p.engineName) ? M.info.engines.indexOf(p.engineName) : p.engine | 0;
    return { name: cleanName(p.name) || "PATCH", engine: e, engineName: M.info.engines[e] || p.engineName || "",
      params: from ? to.map((k) => (at.has(k) ? p.params[at.get(k)] ?? null : null)) : p.params.slice(0, M.info.pcount),
      pattern: Array.isArray(p.pattern) ? p.pattern.slice(0, LIBX.PAT) : null, tags: libTags((p.tags || []).join(",")), created: p.created || t, modified: p.modified || t };
  });
}
async function libToSlot(p, slot) {              /* UP_PUT; unknown values: the global's default, the engine's own if it plays */
  const ps = Array.from({ length: M.info.pcount }, (_, i) => { const v = p.params[i]; if (v != null) return v; const d = M.pdesc[i];
    return d && (i < M.info.pe0 || p.engine === M.engine) ? d.def ?? 0 : 0; });
  const pat = Array.from({ length: LIBX.PAT }, (_, i) => { const x = (p.pattern || [])[i] || [0, 0]; return [x[0] & 127, x[1] & 7]; }).flat();
  const a = await rq(C.UP_PUT, [slot & 127, p.engine & 127, ...[...cleanName(p.name).slice(0, 12)].map((c) => c.charCodeAt(0) & 127), 0, ...ps.flatMap(v14), ...pat], { timeout: 2500, retries: 0 });
  if (a[1]) throw new Error(a[1] === 3 ? "el FM-1 está tocando: para la canción y prueba otra vez" : "el FM-1 dijo que no (" + a[1] + ")");
}
function libView() {
  const all = libAll(), tags = [...new Set(all.flatMap((p) => p.tags))].sort(), q = LIBV.q.trim().toLowerCase();
  const list = all.map((p, i) => ({ p, i })).filter(({ p }) => (!LIBV.tag || p.tags.includes(LIBV.tag)) && (!q || p.name.toLowerCase().includes(q) || p.engineName.toLowerCase().includes(q)));
  const slots = LIBV.slotFor >= 0 ? US.slots : null;
  if (LIBV.slotFor >= 0 && !US.slots && !US.busy) { US.busy = true; readSlots().then((v) => { US.slots = v; }, () => { US.slots = []; }).finally(() => { US.busy = false; renderWork(); }); }
  const pickSlots = (i) => `<div class="lsl"><span class="c">¿En qué ranura USER?</span>${!slots ? `<span class="c">Leyendo las ranuras…</span>` : slots.map((u, k) =>
    `<button class="btn${u.used ? " used" : ""}" data-lib="put" data-n="${i}" data-k="${k}"><span class="num">${upLabel(k)}</span><small>${u.used ? esc(u.name) : "Libre"}</small></button>`).join("")}
    <button class="btn" data-lib="nosl">Cancelar</button></div>`;
  const row = ({ p, i }) => `<div class="lrow"><b>${esc(p.name)}</b><span class="e">${esc(p.engineName)}</span>
      <span class="ltg">${p.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</span><small class="num">${esc((p.modified || "").slice(0, 10))}</small>
      <span class="dva"><button class="btn" data-lib="slot" data-n="${i}" aria-expanded="${LIBV.slotFor === i}">A USER…</button><button class="btn" data-lib="tags" data-n="${i}">Etiquetas</button>
        <button class="btn" data-lib="ren" data-n="${i}">Renombrar</button><button class="dsc" data-lib="del" data-n="${i}">Borrar</button></span>
      ${LIBV.slotFor === i ? pickSlots(i) : ""}</div>`;
  return `<section class="blk tlib"><header class="bh"><h2><svg class="i"><use href="#i-save"/></svg>BIBLIOTECA</h2><span class="c">${all.length} ${all.length === 1 ? "sonido" : "sonidos"} en esta tablet</span>
      <span class="hyt"><button class="btn pri" data-lib="add"${M.link ? "" : " disabled"}><svg class="i"><use href="#i-disk"/></svg>Guardar el sonido actual</button>
        <button class="btn" data-lib="export"${all.length ? "" : " disabled"}><svg class="i"><use href="#i-dl"/></svg>Exportar</button>
        <label class="btn">Importar<input type="file" accept=".json,application/json" id="libf" hidden></label></span></header>
    <div class="lflt"><input class="lq" id="libq" type="search" placeholder="Buscar por nombre o motor" value="${esc(LIBV.q)}" autocomplete="off" spellcheck="false">
      <button class="tg2${LIBV.tag ? "" : " on"}" data-libtag="">Todas</button>${tags.map((t) => `<button class="tg2${LIBV.tag === t ? " on" : ""}" data-libtag="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    ${list.length ? `<div class="lrows">${list.map(row).join("")}</div>` : `<p class="msh">${all.length ? "Ningún sonido con eso." : "Aún no hay nada. Guarda el sonido que suena o importa una biblioteca del editor."}</p>`}
    <p class="msh">Se guarda en esta tablet, no en el FM-1. «A USER…» lo escribe en una ranura de usuario del sinte; desde ahí lo cargas en SAVE.</p></section>`;
}
document.addEventListener("click", async (e) => {
  const tg = e.target.closest("[data-libtag]"); if (tg) { LIBV.tag = tg.dataset.libtag; renderWork(); return; }
  const b = e.target.closest("[data-lib]"); if (!b || LIBV.busy) return;
  const w = b.dataset.lib, n = +b.dataset.n, all = libAll(), p = all[n];
  if (w === "add") { const x = libNow(); all.unshift(x); libKeep(all); renderWork(); toast(-1, `<b>${esc(x.name)}</b> en la biblioteca`); }
  else if (w === "export") {
    const blob = new Blob([JSON.stringify(libFile(all), null, 1)], { type: "application/json" }), aa = document.createElement("a"), url = URL.createObjectURL(blob);
    aa.href = url; aa.download = `felucca-library-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(aa); aa.click(); aa.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  } else if (w === "nosl") { LIBV.slotFor = -1; renderWork(); }
  else if (!p) return;
  else if (w === "slot") { LIBV.slotFor = LIBV.slotFor === n ? -1 : n; US.slots = null; renderWork(); }
  else if (w === "tags") { const t = prompt(trUi("Etiquetas, separadas por comas"), p.tags.join(", ")); if (t == null) return; p.tags = libTags(t); p.modified = new Date().toISOString(); libKeep(all); renderWork(); }
  else if (w === "ren") { const t = prompt(trUi("Nombre (hasta 12 letras)"), p.name); if (t == null) return; p.name = cleanName(t).slice(0, 12) || p.name; p.modified = new Date().toISOString(); libKeep(all); renderWork(); }
  else if (w === "del") { if (b.dataset.arm !== "1") { arm(b, "Borrar", "¿Seguro?"); return; } all.splice(n, 1); libKeep(all); LIBV.slotFor = -1; renderWork(); toast(-1, `<b>${esc(p.name)}</b> fuera de la biblioteca`); }
  else if (w === "put") {
    const k = +b.dataset.k, u = US.slots && US.slots[k];
    if (u && u.used && b.dataset.arm !== "1") { arm(b, `${upLabel(k)} ${u.name}`, `${upLabel(k)} ¿encima?`); return; }
    LIBV.busy = true; toast(-1, `Escribiendo <b>${esc(p.name)}</b> en ${upLabel(k)}…`);
    try { await libToSlot(p, k); toast(-1, `<b>${esc(p.name)}</b> en <span class="num">${upLabel(k)}</span>`); LIBV.slotFor = -1; US.slots = null; try { await readList(); } catch (er) { /* the next RELOAD */ } }
    catch (er) { toast(-1, "No se pudo: " + esc(er.message)); }
    LIBV.busy = false; renderWork();
  }
});
document.addEventListener("input", (e) => { if (e.target.id !== "libq") return; LIBV.q = e.target.value; const at = e.target.selectionStart; renderWork(); const q = $("libq"); if (q) { q.focus(); q.setSelectionRange(at, at); } });
document.addEventListener("change", async (e) => {
  if (e.target.id !== "libf" || !e.target.files[0]) return;
  try { const got = libRead(JSON.parse(await e.target.files[0].text())), all = libAll(); libKeep([...got, ...all]); toast(-1, `<b>${got.length}</b> ${got.length === 1 ? "sonido importado" : "sonidos importados"}`); }
  catch (er) { toast(-1, "Ese archivo no se puede leer: " + esc(er.message)); }
  e.target.value = ""; renderWork();
});
