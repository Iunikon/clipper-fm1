/* ----------------------------------------------------------------- studio --- */
/* ESTUDIO inside Live: the classic editor (everything else: backup, samples, the system, the advanced sequencer…), in
   this same file (gzip, base64), so it opens offline too. While it is open Live lets the FM-1 go (WATCH off, no PING,
   no STATE, its MIDI input unhooked) and the editor connects on its own; back to any folder, Live takes it again */
let studioHtml = null;
async function studioSrc() {
  if (studioHtml) return studioHtml;
  const b64 = ($("studiogz") || {}).textContent || "", bin = Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0));
  studioHtml = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  return studioHtml;
}
async function openStudio() {
  if (S.folder === "ESTUDIO") return;
  if (M.link && !M.mock && M.port) {
    try { await rq(C.WATCH, [0], { quiet: true, retries: 0, timeout: 400 }); } catch (e) { /* (it lets go anyway) */ }
    clearInterval(alive); M.port.input.onmidimessage = null; M.held = M.link; M.link = null;
  }
  S.folder = "ESTUDIO"; renderNav(); document.body.classList.add("studio");
  $("edit").dataset.folder = "ESTUDIO";
  $("edit").innerHTML = `<div class="stu"><div class="stub"><b>Estudio</b><span>Live está en pausa mientras estás aquí: el editor usa el FM-1. Toca <b>Conectar</b> en el editor.</span>
    <button class="more" data-f="LIVE">Volver a Live</button></div><iframe id="stuf" title="Estudio" allow="midi; fullscreen" sandbox="allow-scripts allow-same-origin allow-downloads allow-modals allow-popups allow-forms"></iframe></div>`;
  try { $("stuf").srcdoc = await studioSrc(); } catch (e) { $("stuf").replaceWith(Object.assign(document.createElement("p"), { className: "pce", textContent: "No pude abrir Estudio en este navegador." })); }
}
async function closeStudio() {
  document.body.classList.remove("studio");
  const f = $("stuf"); if (f) f.remove();                 /* (the editor's MIDI goes with it) */
  if (M.held && M.port) {
    M.link = M.held; M.held = null; M.port.input.onmidimessage = (e) => M.link && M.link.receive(e.data);
    try { await rq(C.WATCH, [3], { quiet: true }); keepAlive(); await readSound(false); await readFavs(); await readX(); SQ.loaded = false; renderAll(); } catch (e) { /* the next push */ }
  }
}
document.addEventListener("click", (e) => {
  const a = e.target.closest(`a[href="${STUDIO_URL}"]`); if (!a) return;
  e.preventDefault(); openStudio();
}, true);
