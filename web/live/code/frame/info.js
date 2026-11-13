/* ---- after SHRUB's editor (13 nov): every value can say what it does, its range and the MIDI CC that moves it; the
   last change can be undone from anywhere; a status line says what state Live is in and what this folder takes.
   Long press (the finger still on a card, 0.55 s) or a right click opens a value's sheet. */

/* the CCs the FM-1 itself listens to on the sound's channel (firmware seq.c MIDI_CC_MAP and part_ctl_cc), by the
   scope-0 parameter id (core.h's P_* order): 5 GLIDE, 7 LEVEL, 10 PAN, 72 / 73 / 75 release / attack / decay, 76 / 77 / 78
   the LFO's rate, vibrato and delay, 91 / 93 / 94 the reverb, chorus and delay sends. 16..19 the macros, 71 the engine's
   resonance and 74 its cutoff (or the track FILTER) are found below */
const CC_OF = { 0: 7, 1: 73, 2: 75, 4: 72, 9: 76, 12: 78, 13: 77, 34: 93, 35: 94, 36: 91, 38: 5, 39: 10 };
const P_MAC1 = 96, P_E0 = 118, P_TFLT = 50;
const CC74_BY_ENGINE = { PHASE: 2, LOFI: 7, GRAIN: 7, FM6: 2, PHYS: 2, NOISE: 2, SLICE: 7, FMX: 2 };   /* (seq.c cc74_slot) */
function ccOf(s, id) {
  if (s !== 0) return null;
  if (CC_OF[id] != null) return CC_OF[id];
  const eng = M.info ? M.info.engines[M.engine] || "" : "", hy = eng === "HYBRID";
  if (!hy && id >= P_MAC1 && id < P_MAC1 + 4) return 16 + id - P_MAC1;
  if (hy && id >= P_E0 + 4 && id < P_E0 + 8) return 16 + id - P_E0 - 4;
  const ed = (k) => desc(0, P_E0 + k), ok = (d) => d && d.max > d.min && !(d.names && d.names.length);
  let cut = -1;
  for (let k = 0; k < 8 && cut < 0; k++) if (ok(ed(k)) && ed(k).label === "CUT") cut = k;
  if (cut < 0 && CC74_BY_ENGINE[eng] != null && ok(ed(CC74_BY_ENGINE[eng]))) cut = CC74_BY_ENGINE[eng];
  if (cut >= 0 ? id === P_E0 + cut : id === P_TFLT) return 74;
  for (let k = 0; k < 8; k++) { const d = ed(k); if (d && (d.label === "RES" || d.label === "Q")) return id === P_E0 + k ? 71 : null; }
  return null;
}

/* what a value does, in a line: the common ones, by scope-0 id; the engine's own by label */
const HELP = {
  0: "El volumen del sonido.", 1: "Cuánto tarda en sonar al tocar una nota.", 2: "Cuánto tarda en bajar hasta SUS.",
  3: "El nivel mientras mantienes la nota.", 4: "Cuánto sigue sonando al soltar la nota.",
  5: "Cuánto abre o cierra el filtro la envolvente.", 6: "Cuánto mueve la afinación la envolvente.", 7: "Cuánto cambia la forma de onda la envolvente.",
  9: "La velocidad del LFO.", 10: "La forma del LFO.", 12: "Cuánto tarda el LFO en entrar después de la nota.",
  13: "Cuánto mueve el LFO la afinación: vibrato.", 14: "Cuánto mueve el LFO el filtro.", 15: "Cuánto mueve el LFO la forma de onda.", 16: "Cuánto mueve el LFO el volumen: trémolo.",
  33: "Distorsión del sonido.", 34: "Cuánto va al chorus.", 35: "Cuánto va al delay.", 36: "Cuánto va a la reverb.",
  38: "Cuánto tarda en deslizarse de una nota a la siguiente.", 39: "Dónde suena, de izquierda a derecha.", 44: "Desafina las voces entre sí: más ancho.",
  50: "Filtro de la pista: abajo de la mitad quita agudos, arriba quita graves; en medio, apagado.",
  87: "Cuánto varían las notas del arpegiador y del secuenciador.", 88: "Qué variación usa SPICE.", 89: "Cada voz un poco distinta, como un sinte viejo.",
  91: "Reparte las voces de izquierda a derecha.",
  96: "Macro: más brillo o menos.", 97: "Macro: el timbre, a un lado o al otro.", 98: "Macro: cuánto se mueve el sonido.", 99: "Macro: cuánto espacio (reverb y delay).",
};
const HELP_LABEL = { CUT: "El corte del filtro del motor: más abierto, más brillante.", RES: "La resonancia del filtro: realza el corte.", Q: "La resonancia del filtro: realza el corte." };
const helpOf = (s, id, d) => (s === 0 && HELP[id]) || HELP_LABEL[d.label] || "";

/* the controller key MIDI learn tied to a value, if any */
function learnedOf(s, id) { for (const [k, t] of Object.entries(ML.map || {})) if (t && t.s === s && t.id === id) return mlKeyName(k); return null; }

function infoSheet(s, id, page) {
  const d = desc(s, id); if (!d || document.querySelector(".askw.inf")) return;
  const fv = (v) => { const a = fmtValue(d, v); return esc(a[0] + a[1]); };
  const cc = ccOf(s, id), lr = learnedOf(s, id), h = helpOf(s, id, d);
  const row = (a, b) => `<div class="ir"><dt>${esc(trUi(a))}</dt><dd class="num">${b}</dd></div>`;
  const w = document.createElement("div"); w.className = "askw inf";
  w.innerHTML = `<div class="askb" role="dialog" aria-modal="true" aria-label="${esc(d.label)}"><h2>${esc(d.label)}${page ? `<span class="ipg">${esc(page)}</span>` : ""}</h2>
    ${h ? `<p>${esc(trUi(h))}</p>` : ""}
    <dl class="idl">${row("Ahora", fv(val(s, id)))}${isEnum(d) ? row("Opciones", String(d.max - d.min + 1)) : row("Rango", `${fv(d.min)} – ${fv(d.max)}`)}
      ${cc != null ? row("En el FM-1", `MIDI CC ${cc}`) : ""}${lr ? row("Tu controlador", esc(trUi(lr))) : ""}</dl>
    <p class="ih">${esc(trUi(cc != null ? "El CC llega por el canal del sonido. Doble toque en la tarjeta: vuelve a como se cargó." : "Doble toque en la tarjeta: vuelve a como se cargó."))}</p>
    <div class="askf"><button class="btn pri" data-askok="1">${esc(trUi("Entendido"))}</button></div></div>`;
  document.body.appendChild(w);
  const close = () => { w.remove(); document.removeEventListener("keydown", key, true); };
  const key = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", key, true);
  w.addEventListener("click", (e) => { if (e.target === w || e.target.closest("[data-askok]")) close(); });
  setTimeout(() => w.querySelector("[data-askok]").focus(), 30);
}
const infoOfTile = (t) => { const [s, id] = t.dataset.cell.split(":").map(Number); infoSheet(s, id, t.dataset.title || ""); };

/* the long press: still (under 8 px), 0.55 s, not on what takes the finger outright (graphs, meters, dials) */
let lp = null, lpEat = 0;
document.addEventListener("pointerdown", (e) => {
  const t = e.button === 0 && e.target.closest("#edit .tp[data-cell]");
  if (!t || e.target.closest(".gr,.hd,.mtr,.arc")) return;
  clearTimeout(lp?.id);
  lp = { x: e.clientX, y: e.clientY, id: setTimeout(() => { lp = null; if (typeof bdrag !== "undefined" && bdrag && (bdrag.kind || bdrag.fine)) return;
    lpEat = performance.now(); buzz(10); infoOfTile(t); }, 550) };
}, true);
const lpOff = () => { if (lp) { clearTimeout(lp.id); lp = null; } };
document.addEventListener("pointermove", (e) => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8) lpOff(); }, true);
["pointerup", "pointercancel", "scroll"].forEach((ev) => document.addEventListener(ev, lpOff, true));
/* the tap that ends a long press does nothing else (a switch would flip) */
document.addEventListener("click", (e) => { if (performance.now() - lpEat < 700 && e.target.closest("#edit")) { e.stopPropagation(); e.preventDefault(); lpEat = 0; } }, true);
document.addEventListener("contextmenu", (e) => { const t = e.target.closest("#edit .tp[data-cell]"); if (!t) return; e.preventDefault(); if (performance.now() - lpEat > 700) infoOfTile(t); });

/* undo the last change: ⌘/Ctrl-Z, the status line's button and the phone's «⋯» */
/* the change a button showed, not whatever came after it (the synth can change values meanwhile) */
function undoLast(x = LOG[0]) {
  const i = LOG.indexOf(x), d = x && desc(x.s, x.id); if (i < 0) return;
  undoAt(i);
  if (d) { const a = fmtValue(d, x.old); toast(kOf(x.s, x.id), `${esc(trUi("Deshecho"))} <b>${esc(d.label)}</b> <span class="num">${esc(a[0] + a[1])}</span>`); }
}
document.addEventListener("keydown", (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z") return;
  if (e.target.closest && e.target.closest("input,textarea,[contenteditable]")) return;
  if (S.folder === "SEQ" || !LOG.length) return;          /* (SEQ's advanced view has its own undo) */
  e.preventDefault(); undoLast();
});

/* the status line (tablet and desktop; on the phone the «⋯» menu says it): the state, what this folder takes, undo */
const STL_HINT = {
  LIVE: "Arrastra de lado sobre una tarjeta. Mantén el dedo en una: qué hace y su CC.",
  SEQ: "Toca un paso para editarlo abajo. ‹ › nudge, F fill, L lock.",
  REC: "PLAY y REC mandan el transporte del FM-1.",
  SAVE: "Toca un sonido para escucharlo. Guardar lo escribe en una ranura USER.",
  ESTUDIO: "Cada acción dice si escribe en el FM-1 o se queda en este navegador.",
};
const stlHint = () => STL_HINT[S.folder] || "Arrastra de lado para cambiar un valor. Doble toque: como se cargó. Mantén el dedo: qué hace y su CC.";
function stlState() {
  if (!M.link) return ["off", "Sin conectar"];
  if (document.body.classList.contains("mute")) return ["mute", "No contesta: revisa el cable"];
  return M.mock ? ["demo", "Demo: un FM-1 de ejemplo, no suena"] : ["on", "Conectado"];
}
function stlHtml() {
  const [k, t] = stlState(), x = LOG[0], d = x && desc(x.s, x.id);
  return `<span class="st0 ${k}"><i></i><b>${esc(t)}</b></span><span class="st1">${esc(stlHint())}</span>`
    + (d ? `<button class="stu" data-stundo="1" data-k="${x.n}"><svg class="i"><use href="#i-undo"/></svg>${esc("Deshacer")} <b>${esc(d.label)}</b></button>` : "");
}
setInterval(() => { const el = $("stl"); if (!el || el.offsetParent === null) return; const h = stlHtml(); if (el._h !== h) { el._h = h; el.innerHTML = h; trNode(el); } }, 400);
const undoOfKey = (k) => LOG.find((x) => String(x.n) === k);
document.addEventListener("click", (e) => { const b = e.target.closest("[data-stundo],[data-moreundo]"); if (!b) return;
  const x = undoOfKey(b.dataset.k); if (x) undoLast(x); else toast(-1, esc(trUi("Ese cambio ya no está")));
  if (typeof moreOpen === "function") moreOpen(false); });
