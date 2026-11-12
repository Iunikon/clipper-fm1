/* ----------------------------------------------------------------- studio --- */
/* ESTUDIO, Live's own: what the device's pages do not reach, in tabs. The advanced sequencer (seq.js, its full mode),
   the samples, drum kits, library and projects (bento.js devView), the complete backup (BK_LIST / BK_GET / BK_PUT and
   the sample slots, as editor.html backupCapture / backupRestore: the same file, either way), the system */
const STU = { tab: "seq", busy: false, prog: 0, msg: "" };
const STABS = [["seq", "Secuenciador avanzado", "seq"], ["SMP", "Samples", "save"], ["KIT", "Drum kits", "seq"], ["LIB", "Biblioteca", "save"],
  ["PRJ", "Proyectos", "save"], ["bak", "Copia de seguridad", "save"], ["sys", "Sistema", "glo"]];
function studioView() {
  const t = STU.tab;
  let body;
  if (t === "seq") { SQ.full = true; body = seqBlock(); }
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
async function backupSave() {
  const o = { quiet: true, retries: 2, timeout: 1500 };
  const a = await rq(34, [], { quiet: true, retries: 0, timeout: 5000 }), r = new Reader(a), rc = r.b(), n = r.b(), items = [];
  if (rc) throw new Error(rc === 4 ? "este FM-1 no tiene memoria flash" : `el FM-1 no dio la lista (${rc})`);
  for (let i = 0; i < n; i++) { const id = r.b(); let len = 0, crc = 0; for (let k = 0; k < 5; k++) len += r.b() * 2 ** (7 * k); for (let k = 0; k < 5; k++) crc += r.b() * 2 ** (7 * k); items.push({ id, len, crc: crc >>> 0 }); }
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
  aa.href = url; aa.download = `clipper-backup-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(aa); aa.click(); aa.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
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
  STU.busy = true; STU.prog = 0; STU.msg = "Comprobando la copia…"; renderWork();
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
