/* ---- the phone's «⋯» (13 nov): its bar keeps the sound, the favourite and PLAY / REC; the rest of the bar (Save, the
   favourites panel, MIDI learn, help, full screen, Seguir) is in this menu. Each item taps the bar's own button, hidden
   on the phone, so the behaviour stays in one place */
const MORE = [["saveb", "Guardar"], ["favh", "Favoritos"], ["mlb", "MIDI learn"], ["helpb", "Cómo se toca"], ["fs", "Pantalla completa"], ["follow", "Seguir al sinte"]];
function moreOpen(on) {
  const m = $("morem"), b = $("more"); if (!m || !b) return;
  if (on) {
    m.innerHTML = MORE.filter(([id]) => $(id) && !$(id).hidden).map(([id, t]) => {
      const el = $(id), st = el.getAttribute("aria-pressed");
      return `<button role="menuitem" data-more="${id}">${esc(trUi(t))}${st != null && id !== "favh" ? `<span class="ms">${st === "true" ? "ON" : "OFF"}</span>` : ""}</button>`;
    }).join("");
  }
  m.hidden = !on; b.setAttribute("aria-expanded", on);
  if (on) m.querySelector("button")?.focus();
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#more")) { moreOpen($("morem").hidden); return; }
  const it = e.target.closest("[data-more]");
  if (it) { moreOpen(false); $(it.dataset.more)?.click(); return; }
  if (!$("morem")?.hidden && !e.target.closest("#morem")) moreOpen(false);
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("morem") && !$("morem").hidden) { moreOpen(false); $("more").focus(); } });
