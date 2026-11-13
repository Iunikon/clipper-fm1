/* ---- the system: what the FM-1 is and how it is doing */
function systemView() {
  const st = M.state, i = M.info || {}, users = M.list.filter((x) => x.kind === "USER").length;
  const row = (k, v) => `<div class="syr"><span>${k}</span><b class="num">${esc(String(v))}</b></div>`;
  return `<section class="blk"><header class="bh"><h2><svg class="i"><use href="#i-glo"/></svg>SISTEMA</h2></header>
    <div class="sys">${row("Firmware", i.version || "—")}${row("Protocolo", i.proto || "—")}${row("Motores", i.nengines || "—")}${row("Sonidos de fábrica", M.list.length - users)}
      ${row("Sonidos de usuario", `${users} de 32`)}${row("Favoritos", `${M.favs.length} de 16`)}${row("Pasos del patrón", i.nstep || "—")}
      ${st ? row("CPU", st.cpu + " %") + row("LATE", st.late) + row("PEAK", st.peak + " %") : ""}${row("Puerto MIDI", $("cname").textContent)}</div>
    <div class="syl"><span>Idioma · Language</span><button class="btn${LANG.cur !== "en" ? " pri" : ""}" data-lang="es">Español</button><button class="btn${LANG.cur === "en" ? " pri" : ""}" data-lang="en">English</button></div>
    <div class="syl"><span>Ajustes de Live</span><button class="btn" data-cfgio="out"><svg class="i"><use href="#i-dl"/></svg>Exportar</button><button class="btn" data-cfgio="in">Importar</button></div>
    <p class="msh">Las páginas de LIVE, HOME, la Biblioteca, el idioma y el resto de ajustes se guardan en este navegador, en este aparato: no en el FM-1. La página de Vercel y el archivo descargado guardan cada uno los suyos, y se pierden si borras los datos del sitio. Exporta para tener una copia o pasarlos a otro aparato.</p>
    <p class="msh">MIDI, sincronía y afinación se ajustan en GLO.</p></section>`;
}
/* every setting of Live (localStorage, "clipperlive:"), the parameters' cache left out, to a file and back. An import
   replaces what is here, then the app starts again with it */
const CSF = { FORMAT: "clipper-live-settings", VERSION: 1, PRE: "clipperlive:" };
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-cfgio]"); if (!b) return;
  if (b.dataset.cfgio === "out") {
    const data = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(CSF.PRE) && !k.startsWith(CSF.PRE + "desc:")) data[k.slice(CSF.PRE.length)] = localStorage.getItem(k); } } catch (er) { /* (what could be read) */ }   /* (each as it is kept: the language is plain text) */
    saveJson(`clipper-live-ajustes-${today()}.json`, { format: CSF.FORMAT, version: CSF.VERSION, exported: new Date().toISOString(), data });
    toast(-1, "<b>Ajustes</b> exportados"); return;
  }
  if (b.dataset.arm !== "1") { arm(b, "Importar", "¿Reemplazar los de aquí?"); return; }
  disarm(b, "Importar");
  let j; try { j = await pickJson(); } catch (er) { toast(-1, "Ese archivo no se puede leer"); return; }
  if (!j || j.format !== CSF.FORMAT || !j.data || typeof j.data !== "object") { toast(-1, "Ese archivo no son ajustes de Live"); return; }
  try { for (const [k, v] of Object.entries(j.data)) if (!k.startsWith("desc:") && typeof v === "string") localStorage.setItem(CSF.PRE + k, v); }
  catch (er) { toast(-1, "No se pudieron guardar los ajustes en este navegador"); return; }
  toast(-1, "<b>Ajustes</b> importados: vuelvo a empezar…"); setTimeout(() => location.reload(), 900);
});

/* before a project replaces the one playing: that one (and the settings) to a file first, so a wrong tap loses nothing */
async function autoBackupProject() {
  toast(-1, "Guardando el proyecto de ahora, por si acaso…");
  try { const kib = await backupSave([0, 1], "proyecto-antes-de-cargar"); toast(-1, `<b>Copia</b> del proyecto de ahora en tus descargas (${kib} KiB)`); return true; }
  catch (e) { toast(-1, "No pude copiar el proyecto de ahora: no cargo"); return false; }
}

