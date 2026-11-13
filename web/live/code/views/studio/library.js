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
  else if (w === "tags") { ask({ title: "Etiquetas, separadas por comas", input: p.tags.join(", "), ok: "Guardar" }).then((t) => { if (t == null) return; p.tags = libTags(t); p.modified = new Date().toISOString(); libKeep(all); renderWork(); }); }
  else if (w === "ren") { ask({ title: "Nombre (hasta 12 letras)", input: p.name, ok: "Guardar" }).then((t) => { if (t == null) return; p.name = cleanName(t).slice(0, 12) || p.name; p.modified = new Date().toISOString(); libKeep(all); renderWork(); }); }
  else if (w === "del") { if (b.dataset.arm !== "1") { arm(b, "Borrar", "¿Seguro?"); return; } all.splice(n, 1); libKeep(all); LIBV.slotFor = -1; renderWork(); toast(-1, `<b>${esc(p.name)}</b> fuera de la biblioteca`); }
  else if (w === "put") {
    const k = +b.dataset.k, u = US.slots && US.slots[k];
    if (u && u.used && b.dataset.arm !== "1") { arm(b, `${upLabel(k)} ${u.name}`, `${upLabel(k)} ¿encima?`); return; }
    LIBV.busy = true; toast(-1, `Escribiendo <b>${esc(p.name)}</b> en ${upLabel(k)}…`);
    try { await libToSlot(p, k); toast(-1, `<b>${esc(p.name)}</b> en <span class="num">${upLabel(k)}</span>`); LIBV.slotFor = -1; US.slots = null; try { await readList(); } catch (er) { /* the next RELOAD */ } }
    catch (er) { toast(-1, "No se pudo: " + esc(whyFailed(er))); }
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

