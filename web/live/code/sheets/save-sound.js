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
document.addEventListener("keydown", (e) => {                 /* focus does not leave the open dialog */
  if (e.key !== "Tab") return;
  const dlg = SVE.open ? $("sh") : B.open ? $("br") : null; if (!dlg) return;
  const f = [...dlg.querySelectorAll('button,input,[tabindex="0"]')].filter((x) => x.offsetParent && !x.disabled);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
$("scrim").addEventListener("click", () => { if (SVE.open) openSave(false); });

