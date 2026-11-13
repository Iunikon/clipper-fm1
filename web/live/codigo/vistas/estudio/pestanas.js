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

