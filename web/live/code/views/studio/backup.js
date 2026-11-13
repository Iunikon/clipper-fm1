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
  catch (er) { STU.msg = "No se pudo: " + whyFailed(er); }
  STU.busy = false; renderWork();
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "bkf" || !e.target.files[0] || STU.busy || !M.link) return;
  const f = e.target.files[0]; let file;
  try { file = JSON.parse(await f.text()); } catch (er) { STU.msg = "Ese archivo no se puede leer."; renderWork(); return; }
  if (!(await ask({ title: `¿Restaurar «${f.name}»?`, text: "Se reemplaza todo lo que hay en el FM-1.", ok: "Restaurar", danger: true }))) return;
  STU.busy = true; STU.prog = 0; STU.msg = "Antes, una copia de lo que hay ahora (por si acaso)…"; renderWork();
  try { await backupSave(null, "antes-de-restaurar"); } catch (er) { STU.msg = "No pude hacer la copia de lo de ahora, así que no restauro: " + whyFailed(er); STU.busy = false; renderWork(); return; }
  STU.msg = "Comprobando la copia…"; bkStep(0);
  try { await backupRestore(file); STU.msg = "Restaurado. El FM-1 tiene ahora lo de la copia."; toast(-1, "<b>Restaurado</b>"); reloadSoon(); US.slots = null; }
  catch (er) { STU.msg = STU.prog > 0 ? "La restauración quedó a medias (" + whyFailed(er) + "). Conecta el FM-1 y restaura otra vez; la copia de antes está en tus descargas." : "No se pudo: " + whyFailed(er); }
  STU.busy = false; renderWork();
});

