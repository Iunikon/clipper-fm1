/* ----------------------------------------------------------------- input --- */

async function favGo(i) { try { await rq(C.FAV_GO, [i]); } catch (e) { /* RELOAD brings the rest */ } }
async function listGo(n) { try { await rq(C.LIST_GO, u14(n)); } catch (e) { /* RELOAD brings the rest */ } }
async function favToggle() {
  const was = M.favCur >= 0;
  if (!was && M.favs.length >= 16) { toast(-1, "Los 16 favoritos están ocupados"); return; }
  try { await rq(C.FAV_SET, [was ? 0 : 1]); await readFavs(); renderBar(); toast(-1, was ? "Quitado de favoritos" : `<b>Favorito ${M.favs.length}</b> ${esc(M.list[entryNow()]?.name || "")}`); } catch (e) { toast(-1, "No se pudo cambiar el favorito"); }
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && B.open) { openBrowser(false); $("now").focus(); } });
$("scrim").addEventListener("click", () => openBrowser(false));
document.addEventListener("click", (e) => {
  const b = e.target.closest("#favh,#lrh,#now,#brx,[data-kind],[data-load],[data-favgo],[data-kstep],[data-qtog],[data-qstep],[data-qn],[data-tap],[data-panic],#prev,#next,#favt,#usb,#follow,[data-f]");
  if (!b) return;
  if (b.id === "now") openBrowser(!B.open);
  else if (b.id === "brx") openBrowser(false);
  else if (b.dataset.kind) { B.kind = b.dataset.kind; renderBrowser(); }
  else if (b.dataset.kstep) { const all = ["FAVS", "ALL", ...KINDS.filter((k) => M.list.some((x) => x.kind === k))], i = all.indexOf(B.kind); B.kind = all[(i + +b.dataset.kstep + all.length) % all.length]; renderBrowser(); }
  else if (b.dataset.load) listGo(+b.dataset.load);
  else if (b.dataset.favgo) favGo(+b.dataset.favgo);
  else if (b.dataset.qtog) quickToggle(b.dataset.qtog);
  else if (b.dataset.qstep) quickStep(b.dataset.qstep, +b.dataset.d);
  else if (b.dataset.qn) quickNudge(b.dataset.qn, +b.dataset.d);
  else if (b.dataset.tap) { tapTempo(); again(b, "pulse"); }
  else if (b.dataset.panic) panic();
  else if (b.id === "prev" || b.id === "next") {           /* (not a favourite now: next is the first, previous the last) */
    const n = M.favs.length, d = b.id === "next" ? 1 : -1;
    if (n) favGo(M.favCur < 0 ? (d > 0 ? 0 : n - 1) : (M.favCur + d + n) % n);
  }
  else if (b.id === "favt") { favToggle(); again(b, "pop"); }
  else if (b.id === "usb") usbAudio();
  else if (b.id === "favh" && isPhone()) phoneRail("r");
  else if (b.id === "lrh") phoneRail("l");
  else if (b.id === "favh") { const on = document.body.classList.toggle("nofav"); b.setAttribute("aria-pressed", !on); store.set("nofav", on); }
  else if (b.id === "follow") { S.follow = !S.follow; b.setAttribute("aria-pressed", S.follow); if (S.follow && M.page) followPage(); }
  else if (b.dataset.f === "ESTUDIO" && !(S.lock && S.folder === "LIVE")) openStudio();
  else if (b.dataset.f && S.lock && S.folder === "LIVE") toast(-1, "LIVE está bloqueado: toca el candado para moverte");
  else if (b.dataset.f) { if (/^(EDIT|ENV|LFO|FX|SEL|ARP|SEQ)$/.test(b.dataset.f) && !store.get("hlp")) { store.set("hlp", true); setTimeout(helpSheet, 300); }   /* la pista, solo la primera vez */
    CFG.edit = null; document.body.classList.remove("cfgediting"); S.folder = b.dataset.f; renderNav(); renderWork(); $("edit").scrollTop = 0; fade(); }
});


/* the quick panel's level bars: drag (or tap) along them */
let amtOn = null;
$("edit").addEventListener("pointerdown", (e) => { const a = e.target.closest("[data-amt]"); if (!a) return; amtOn = a; a.setPointerCapture(e.pointerId); amtAt(e); });
$("edit").addEventListener("pointermove", (e) => { if (amtOn) amtAt(e); });
$("edit").addEventListener("pointerup", () => { amtOn = null; });
$("edit").addEventListener("pointercancel", () => { amtOn = null; });
function amtAt(e) {
  const q = QSPEC.get(amtOn.dataset.amt), d = qd(q), r = amtOn.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  setVal(q.s || 0, q.id, d.min + f * (d.max - d.min));
  const v = qv(q), g = frac(d, v), z = q.kind === "bipolar" ? frac(d, 0) : 0, [t, u] = fmtValue(d, v);   /* (in place: the drag keeps its element) */
  const bar = amtOn.querySelector("b"); bar.style.left = Math.min(g, z) * 100 + "%"; bar.style.width = Math.abs(g - z) * 100 + "%";
  amtOn.querySelector("i").style.left = `calc(${g * 100}% - 1px)`;
  const tl = amtOn.closest(".tl"); tl.classList.toggle("on", qOn(q)); tl.querySelector(".tg")?.setAttribute("aria-checked", qOn(q));
  tl.querySelector(".v").innerHTML = `${esc(t)}${u ? `<small>${esc(u)}</small>` : ""}`;
}
$("edit").addEventListener("keydown", (e) => { const a = e.target.closest("[data-amt]"), st = { ArrowRight: 4, ArrowUp: 4, ArrowLeft: -4, ArrowDown: -4 }[e.key];
  if (a && st) { e.preventDefault(); const k = a.dataset.amt, q = QSPEC.get(k); qset(q, qv(q) + st); document.querySelector(`[data-amt="${k}"]`)?.focus(); } });

