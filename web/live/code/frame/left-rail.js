/* ------------------------------------------- the left rail: the device's page --- */
/* its four knobs as the FM-1 shows them now (a tap on its name opens its folder here) */
/* an element's HTML, set only when it changed (a drag paints every frame; what did not change keeps its state) */
const setHtml = (el, h) => { if (el && el._h !== h) { el._h = h; el.innerHTML = h; } };
function renderDev() {
  const pg = M.page; if (!pg || !M.info) return;
  const s = pg.home ? 0 : pg.scope, ids = pg.home ? M.homeIds : pg.ids, folder = pg.home ? "HOME" : FAM[pg.fam] || "";
  const k4 = s < 2 ? ids.map((id, k) => { const d = id < 127 && desc(s, id); if (!d) return `<div class="dk off"><span class="l">KNOB ${k + 1}</span><span class="v">–</span></div>`;
    const v = val(s, id); return `<div class="dk" style="--c:${KC[k]};${fillVars(d, v)}"><span class="l"><i></i>${esc(d.label)}</span><span class="v num">${valHtml(d, v)}</span><span class="b"></span></div>`; }).join("") : "";
  setHtml($("dvp"), `<button class="dvh" data-f="${folder}" aria-label="Abrir ${esc(folder)}"><span class="c">En el sinte</span><b>${esc(pg.home ? "HOME" : pg.title)}</b><span class="f">${esc(folder)}</span></button>
    ${k4 ? `<div class="dvk">${k4}</div>` : `<p class="dvn">Esta página se usa en el sinte.</p>`}`);
}

/* -------------------------------------- the left rail: what changed, undoable --- */
const LOG = [];
let undoing = false;
const kOf = (s, id) => { const p = LAYOUT.find((x) => x.scope === s && x.ids.includes(id)); return p ? p.ids.indexOf(id) : 0; };
function logChange(s, id, old, v, src) {
  const now = performance.now(), top = LOG[0];
  if (top && top.s === s && top.id === id && top.src === src && now - top.t < 2500) { top.v = v; top.t = now; if (top.v === top.old) LOG.shift(); }
  else LOG.unshift({ s, id, old, v, src, t: now });
  if (LOG.length > 24) LOG.length = 24;
  if (!PV.lraf) PV.lraf = requestAnimationFrame(() => { PV.lraf = 0; renderLog(); });   /* (once a frame) */
}
function renderLog() {
  if (!M.info) return;
  $("chl").innerHTML = LOG.length ? LOG.map((e, i) => { const d = desc(e.s, e.id); if (!d) return ""; const a = fmtValue(d, e.old), b = fmtValue(d, e.v);
    return `<div class="lg" role="listitem" style="--c:${KC[kOf(e.s, e.id)]}"><span class="l"><i></i>${esc(d.label)}<em class="${e.src === "sinte" ? "sinte" : "tab"}">${e.src === "sinte" ? trUi("SINTE") : trUi("APP")}</em></span>
      <span class="vv num">${esc(a[0] + a[1])} → ${esc(b[0] + b[1])}</span><button class="ud" data-undo="${i}" aria-label="Deshacer ${esc(d.label)}: volver a ${esc(a[0] + a[1])}"><svg class="i"><use href="#i-undo"/></svg></button></div>`; }).join("")
    : `<p class="dvn">Lo que cambies, en el sinte o en la tablet, sale aquí. Toca <svg class="i"><use href="#i-undo"/></svg> para volver atrás.</p>`;
}
/* an action that can't be undone asks for a second tap (at least 0.4 s later); it stays armed until a tap elsewhere */
/* our own sheet instead of confirm() and prompt(): it looks like the rest and follows the language. With danger, red with
   ⚠ and a second tap (at least 0.4 s later). Resolves with true or the text typed, or null when cancelled */
function ask({ title, text = "", input = null, ok = "Aceptar", danger = false }) {
  return new Promise((res) => {
    const w = document.createElement("div"); w.className = "askw";
    w.innerHTML = `<div class="askb" role="dialog" aria-modal="true" aria-label="${esc(trUi(title))}"><h2>${esc(trUi(title))}</h2>${text ? `<p>${esc(trUi(text))}</p>` : ""}
      ${input != null ? `<input class="aski" aria-label="${esc(trUi(title))}" value="${esc(input)}">` : ""}
      <div class="askf"><button class="btn" data-askno="1">${esc(trUi("Cancelar"))}</button><button class="btn pri${danger ? " dng" : ""}" data-askok="1">${danger ? "⚠ " : ""}${esc(trUi(ok))}</button></div></div>`;
    document.body.appendChild(w);
    const inp = w.querySelector(".aski"), okb = w.querySelector("[data-askok]"); let armed = 0;
    const done = (v) => { w.remove(); document.removeEventListener("keydown", key, true); res(v); };
    const key = (e) => { if (e.key === "Escape") { e.preventDefault(); done(null); } else if (e.key === "Enter" && inp) { e.preventDefault(); okb.click(); } };
    document.addEventListener("keydown", key, true);
    w.addEventListener("click", (e) => {
      if (e.target === w || e.target.closest("[data-askno]")) { done(null); return; }
      if (!e.target.closest("[data-askok]")) return;
      if (danger) { const now = performance.now(); if (!armed) { armed = now; okb.textContent = "⚠ " + trUi("¿Seguro?"); return; } if (now - armed < 400) return; }
      done(inp ? inp.value : true);
    });
    setTimeout(() => (inp || okb).focus(), 30);
  });
}

/* the gestures' help: the first time a folder with values opens, and always from the bar's «?» button */
function helpSheet() {
  const w = document.createElement("div"); w.className = "askw";
  const li = (a, b) => `<li><b>${esc(trUi(a))}</b> ${esc(trUi(b))}</li>`;
  w.innerHTML = `<div class="askb hlp" role="dialog" aria-modal="true" aria-label="${esc(trUi("Cómo se toca"))}"><h2>${esc(trUi("Cómo se toca"))}</h2><ul>
    ${li("Arrastra en horizontal", "sobre una tarjeta para cambiar su valor; en vertical, la página se desplaza.")}
    ${li("Deja el dedo quieto", "un momento mientras arrastras: modo fino ×¼, hasta que lo levantes.")}
    ${li("Doble toque", "en un valor: vuelve a como se cargó el sonido.")}
    ${li("Lo que borra", "pide un segundo toque, en rojo con ⚠.")}
    ${li("En los pasos de SEQ:", "‹ › nudge (adelanta o retrasa), F fill, L lock, ' acento, ~ slide.")}
    ${li("Con ratón:", "arrastra en horizontal; Shift mientras arrastras = fino ×¼; Inicio / Fin = mínimo / máximo. La rueda solo desplaza la página.")}
  </ul><div class="askf"><button class="btn pri" data-askok="1">${esc(trUi("Entendido"))}</button></div></div>`;
  document.body.appendChild(w);
  const close = () => { w.remove(); document.removeEventListener("keydown", key, true); };
  const key = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key, true);
  w.addEventListener("click", (e) => { if (e.target === w || e.target.closest("[data-askok]")) close(); });
  setTimeout(() => w.querySelector("[data-askok]").focus(), 30);
}
setTimeout(() => { const f = $("favh"); if (!f) return; const b = document.createElement("button");   /* (after loading: trUi is defined at the end) */ b.className = f.className; b.id = "helpb";
  b.setAttribute("aria-label", trUi("Ayuda: cómo se toca")); b.innerHTML = '<b style="font: 800 18px var(--sans)">?</b>'; f.before(b);
  b.addEventListener("click", helpSheet); }, 0);
/* a second tap too soon on something armed does not count (0.4 s) */
document.addEventListener("click", (e) => {
  const b = e.target.closest && e.target.closest('[data-arm="1"]');
  if (b && b.dataset.armAt && performance.now() - +b.dataset.armAt < 400) { e.stopImmediatePropagation(); e.preventDefault(); }
}, true);
function disarm(b, txt) { b.dataset.arm = ""; b.textContent = txt; }
function arm(b, txt, ask) {
  document.querySelectorAll('[data-arm="1"]').forEach((o) => disarm(o, o.dataset.armTxt || txt));
  b.dataset.arm = "1"; b.dataset.armTxt = txt; b.dataset.armAt = performance.now(); b.textContent = ask;
  const off = (e) => { if (b.contains(e.target)) return;         /* disarmed by a tap elsewhere, not by a timer */
    disarm(b, txt); document.removeEventListener("pointerdown", off, true); };
  setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-undo],[data-discard],[data-skind],[data-svfav]"); if (!b) return;
  if (b.dataset.undo) { const i = +b.dataset.undo, x = LOG[i]; if (!x) return; LOG.splice(i, 1); undoing = true; setVal(x.s, x.id, x.old); undoing = false; renderLog(); }
  else if (b.dataset.discard) {
    if (b.dataset.arm !== "1") { arm(b, "Descartar", "¿Seguro?"); return; }
    disarm(b, "Descartar"); const n = entryNow(); if (n >= 0) { LOG.length = 0; listGo(n); toast(-1, "Lo editado se descartó"); } }
  else if (b.dataset.skind) { SV.kind = b.dataset.skind; renderWork(); $("edit").scrollTop = 0; }
  else if (b.dataset.svfav) favToggle();
});

