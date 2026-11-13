/* ---- a double tap on a value: back to the sound as it was loaded (a global: its default) */
const DT = { key: "", t: 0, x: 0, y: 0, down: 0 };
document.addEventListener("pointerdown", (e) => { DT.down = performance.now(); DT.x0 = e.clientX; DT.y0 = e.clientY; }, true);
document.addEventListener("pointerup", (e) => {
  const el = e.target.closest && e.target.closest("#edit [data-cell], #edit .mt[data-mt], #edit .arc[data-k]"); if (!el || !M.link || CFG.edit) return;
  if (performance.now() - DT.down > 280 || Math.hypot(e.clientX - DT.x0, e.clientY - DT.y0) > 12) { DT.key = ""; return; }   /* (a drag is no tap) */
  const key = el.dataset.cell || el.dataset.mt || el.dataset.k, now = performance.now();
  if (key === DT.key && now - DT.t < 320) {
    DT.key = ""; const [s, id] = key.split(":").map(Number), d = desc(s, id); if (!d) return;
    const back = s === 0 && M.orig && M.orig.p[id] != null ? M.orig.p[id] : d.def != null ? d.def : d.min;
    setVal(s, id, back); const [t, u] = fmtValue(d, back);
    toast(-1, `<b>${esc(d.label)}</b> ${s === 0 ? "como se cargó" : "por defecto"} <span class="num">${esc(t + u)}</span>`);
    return;
  }
  DT.key = key; DT.t = now;
}, true);

/* SEQ: the device's two pages, NOTES (the steps or the MIDI roll) and PATTERN */
function seqView() {
  const sp = S.seqPage || "NOTES", pat = LAYOUT.find((x) => x.title === "PATTERN");
  return `<div class="pgs"><nav class="stt" aria-label="SEQ">${["NOTES", "PATTERN"].map((t) => `<button data-seqp="${t}" aria-current="${t === sp}"><svg class="i"><use href="#i-seq"/></svg>${t}</button>`).join("")}</nav>
    ${sp === "PATTERN" && pat ? pageRow({ title: pat.title, folder: "SEQ", s: pat.scope, ids: pat.ids }) : seqBlock()}</div>`;
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-seqp]"); if (b) { S.seqPage = b.dataset.seqp; renderWork(); } });

