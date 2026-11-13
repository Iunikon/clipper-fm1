/* ---- touch. Faders and readouts slide sideways from where they are (a vertical swipe still scrolls the page); the
   graphs' handles, the meters and the dials take the finger outright */
$("edit").addEventListener("pointerdown", (e) => {
  const hd = e.target.closest(".hd"), gr = e.target.closest(".gr[data-gr]"), mtr = e.target.closest(".mtr[data-k]"), arc = e.target.closest(".arc[data-k]"), fd = e.target.closest("[data-fd]");
  if (hd || (gr && (gr.dataset.gr === "filt" || gr.dataset.gr === "lfo") && !fd)) {
    const g = (hd || gr).closest(".gr");
    bdrag = { el: g, kind: g.dataset.gr, h: hd ? hd.dataset.h : g.dataset.gr === "filt" ? "f" : "l", s: +g.dataset.s, ids: g.dataset.ids.split(",").map(Number), x0: e.clientX, v0: null, on: true };
    if (bdrag.h === "l") { const k = phsOf(bdrag.s, bdrag.ids); if (k < 0) { bdrag = null; return; } bdrag.v0 = val(bdrag.s, bdrag.ids[k]); }
    g.setPointerCapture(e.pointerId); g.classList.add("held"); e.preventDefault(); graphDrag(e); return;
  }
  const el = mtr || arc || fd; if (!el) return;
  const [s, id] = (el.dataset.k || el.dataset.fd).split(":").map(Number), d = desc(s, id); if (!d) return;
  bdrag = { el, dir: mtr ? "abs" : arc ? "v" : "h", s, id, d, x0: e.clientX, y0: e.clientY, v0: val(s, id), on: !fd, pid: e.pointerId };
  if (!fd) { el.setPointerCapture(e.pointerId); e.preventDefault(); }
});
/* fine: the finger held still a moment while dragging, the moves count a quarter from there (a badge says so) */
function fineArm(raw, eff) {
  clearTimeout(bdrag.ft);
  bdrag.ft = setTimeout(() => { if (!bdrag || bdrag.fine || !(bdrag.kind || bdrag.on)) return;
    bdrag.fine = { ax: raw.x, ay: raw.y, ex: eff.clientX, ey: eff.clientY }; bdrag.el.classList.add("fine"); document.body.classList.add("finemode"); buzz(15); }, 380);
}
function effPt(e) {
  const f = bdrag.fine; if (!f) return { clientX: e.clientX, clientY: e.clientY };
  return { clientX: f.ex + (e.clientX - f.ax) * 0.25, clientY: f.ey + (e.clientY - f.ay) * 0.25 };
}
$("edit").addEventListener("pointermove", (ev) => {
  if (!bdrag) return;
  if (ev.shiftKey && !bdrag.fine && (bdrag.kind || bdrag.on)) {           /* with a mouse: Shift = fine ×¼ */
    bdrag.fine = { ax: ev.clientX, ay: ev.clientY, ex: ev.clientX, ey: ev.clientY }; bdrag.el.classList.add("fine"); document.body.classList.add("finemode"); }
  const e = effPt(ev); fineArm({ x: ev.clientX, y: ev.clientY }, e);
  if (bdrag.kind) { graphDrag(e); return; }
  const dx = e.clientX - bdrag.x0, dy = bdrag.y0 - e.clientY;
  if (!bdrag.on) {                                       /* a fader: it is a slide once it goes sideways */
    if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
    bdrag.on = true; bdrag.x0 = e.clientX; bdrag.el.classList.add("held");
    try { bdrag.el.setPointerCapture(bdrag.pid); } catch (er) { /* (gone) */ }
    return;
  }
  const span = bdrag.d.max - bdrag.d.min;
  if (bdrag.dir === "abs") { if (!bdrag.armed) { if (Math.abs(dy) < 6) return; bdrag.armed = true; bdrag.el.classList.add("held"); } barAt(e); return; }
  if (bdrag.w == null) bdrag.w = bdrag.el.getBoundingClientRect().width;    /* (measured once a drag, not once a move) */
  const want = bdrag.dir === "v" ? bdrag.v0 + dy * span / 220 : bdrag.v0 + (bdrag.el.classList.contains("tgd") ? dx / 4 : dx * span / Math.max(220, bdrag.w * 1.4));
  edgeAt(want < bdrag.d.min ? -1 : want > bdrag.d.max ? 1 : 0);
  setVal(bdrag.s, bdrag.id, want);
});
/* ---- small answers to a hand: a tick under the finger (Android, a touch screen), a bump at the end of a range */
const COARSE = matchMedia("(pointer: coarse)");
const buzz = (ms) => { if (COARSE.matches && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* (not allowed yet) */ } };
function edgeAt(side) {                                   /* a drag past its end: once, until it comes back */
  if (!bdrag || side === (bdrag.edge || 0)) return;
  bdrag.edge = side; if (!side) return;
  buzz(12); const el = bdrag.el; el.style.setProperty("--edx", side * 2 + "px"); el.classList.remove("edge"); void el.offsetWidth; el.classList.add("edge");
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-set],[data-pick],[data-tool],[data-tplay],[data-trec],[data-tap],[data-panic],[data-f],[data-lp],[data-stab],[data-skind]")) buzz(6);
}, true);
const bend = () => { if (bdrag && bdrag.el) { bdrag.el.classList.remove("held", "fine"); clearTimeout(bdrag.ft); } document.body.classList.remove("finemode"); bdrag = null; };
$("edit").addEventListener("pointerup", bend); $("edit").addEventListener("pointercancel", bend);
function barAt(e) {
  const r = bdrag.el.getBoundingClientRect(), d = bdrag.d;
  setVal(bdrag.s, bdrag.id, d.min + Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)) * (d.max - d.min));
}
function graphDrag(e) {
  const r = (bdrag.el.querySelector(".gin") || bdrag.el).getBoundingClientRect(), x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * GW, y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * GH;
  const s = bdrag.s, ids = bdrag.ids, put = (k, f) => { const id = ids[k], d = id < 127 && desc(s, id); if (d) setVal(s, id, d.min + Math.max(0, Math.min(1, f)) * (d.max - d.min)); };
  const sus = (yy) => (90 - yy) / 82;
  if (bdrag.h === "f") put(0, x / GW);
  else if (bdrag.h === "l") { const k = phsOf(s, ids); if (k >= 0) setVal(s, ids[k], ((Math.round(bdrag.v0 - (e.clientX - bdrag.x0) / (r.width / 2) * 128) % 128) + 128) % 128); }
  else if (bdrag.h === "a") put(0, (x - 10) / 50);
  else if (bdrag.h === "d") { const x1 = 10 + raw(s, ids[0]) * 50 / 127; put(1, (x - x1 - 6) / 50); put(2, sus(y)); }
  else if (bdrag.h === "s") put(2, sus(y));
  else if (bdrag.h === "r") put(3, (232 - x - 6) / 60);
}
$("edit").addEventListener("click", (e) => {
  const b = e.target.closest("[data-set]"); if (!b) return;
  const [s, id] = b.dataset.set.split(":").map(Number);
  setVal(s, id, +b.dataset.v);
});
$("edit").addEventListener("keydown", (e) => {   /* ← → (Shift: one by one), PgUp / PgDn, Home / End */
  const el = e.target.closest("[data-fd]"); if (!el) return;
  const [s, id] = el.dataset.fd.split(":").map(Number), d = desc(s, id); if (!d) return;
  const big = Math.max(1, Math.round((d.max - d.min) / 64)), one = e.shiftKey ? 1 : big;
  const st = { ArrowRight: one, ArrowUp: one, ArrowLeft: -one, ArrowDown: -one, PageUp: 8 * big, PageDown: -8 * big }[e.key];
  if (e.key === "Home" || e.key === "End") { e.preventDefault(); setVal(s, id, e.key === "Home" ? d.min : d.max); return; }
  if (!st) return; e.preventDefault(); setVal(s, id, val(s, id) + st);
});
/* landscape only: where the browser can't lock the rotation, a notice when upright */
(() => { const d = document.createElement("div"); d.className = "rot"; d.setAttribute("role", "alert");
  d.innerHTML = `<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20"/><path d="M3 12a9 9 0 0 1 9-9M21 12a9 9 0 0 1-9 9"/></svg><b>Gira el aparato</b><span>Clipper Live se usa en horizontal.</span>`;
  document.body.appendChild(d); })();
/* (no wheel: scrolling the page with it edited whatever card was under the pointer; with a mouse, drag) */


