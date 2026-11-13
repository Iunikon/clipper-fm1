/* ----------------------------------------------------------------- views --- */
/* a value changed: drawn once a frame, however many came (a finger dragging sends dozens a second) */
const PV = { keys: new Set(), raf: 0 };
function paintValue(s, id) {
  PV.keys.add(keyOf(s, id));
  if (!PV.raf) PV.raf = requestAnimationFrame(paintFlush);
}
function paintFlush() {
  PV.raf = 0; const keys = [...PV.keys]; PV.keys.clear();
  for (const k of keys) {
    const [s, id] = k.split(":").map(Number);
    if (!s && MX.includes(id)) document.querySelector(`.mxr[data-src="${id}"]`)?.classList.toggle("off", !val(0, id));
    paintTile(s, id);
    paintCards(s, id);
  }
  renderDev();
  renderTransport();                                       /* (the bar: BPM, TRN) */
}
/* RÁPIDO: what a player reaches for. Each tile's colour: the knob that turns it on its page of the FM-1. s: 0 the sound, 1 global.
   kind: toggle (its off value <-> the last value it had), amount (0 <-> the last level; a bar), bipolar (0 <-> the last; a bar from
   the centre), nudge (buttons that add; 0 <-> the last), choice (arrows only), tempo (- TAP +), panic (all notes off) */
const QUICK = [
  ["Interpretación", [
    { id: 17, name: "Arpegiador", kind: "toggle", on: 1, k: 0, step: true, page: "ARP" },
    { id: 18, name: "Velocidad", kind: "choice", k: 1, note: () => "Del arpegio" },
    { id: 23, name: "Latch", kind: "toggle", on: 1, k: 2, note: () => (val(0, 17) ? "Mantiene el arpegio" : "Mantiene las notas") },
    { id: 49, name: "Acordes", kind: "toggle", on: 1, k: 3, step: true, page: "SEL" },
    { id: 27, name: "Escala", kind: "toggle", on: 2, k: 2, step: true, note: () => `${fmtValue(desc(0, 25), val(0, 25))[0]} ${fmtValue(desc(0, 26), val(0, 26))[0]}` },
    { id: 28, name: "Transponer", kind: "nudge", on: 12, k: 0, steps: [-12, -1, 1, 12], note: () => "Octava y semitono" }]],
  ["Sonido y efectos", [
    { id: 50, name: "Filtro", kind: "bipolar", on: -24, k: 0, note: () => "LP ← OFF → HP" },
    { id: 33, name: "Distorsión", kind: "amount", on: 40, k: 0, page: "FX" },
    { id: 34, name: "Chorus", kind: "amount", on: 50, k: 1, page: "FX" },
    { id: 35, name: "Delay", kind: "amount", on: 40, k: 2, page: "FX" },
    { id: 36, name: "Reverb", kind: "amount", on: 50, k: 3, page: "FX" },
    { id: 78, name: "Insert", kind: "toggle", on: 1, k: 0, step: true, page: "INSERT" }]],
  ["Global", [
    { id: 37, name: "Voces", kind: "choice", k: 0, page: "VOICE" },
    { id: 38, name: "Glide", kind: "amount", on: 40, k: 1, page: "VOICE" },
    { id: 0, s: 1, name: "Tempo", kind: "tempo", k: 0, note: () => "Toca TAP al pulso" },
    { id: -1, name: "Pánico", kind: "panic", k: 3, note: () => "Corta las notas colgadas" }]],
];
const qkey = (q) => keyOf(q.s || 0, q.id);
const QSPEC = new Map(QUICK.flatMap(([, items]) => items.map((q) => [qkey(q), q])));
const remember = new Map();                          /* key -> the value it had before it was switched off */
const qd = (q) => desc(q.s || 0, q.id), qv = (q) => val(q.s || 0, q.id);
const qRest = (q) => (q.kind === "amount" || q.kind === "bipolar" || q.kind === "nudge" ? 0 : qd(q).min);
const qOn = (q) => q.kind === "choice" || q.kind === "tempo" || (q.kind !== "panic" && qd(q) && qv(q) !== qRest(q));
function tileInner(q) {
  if (q.kind === "panic") return `<button class="tg" data-panic="1" aria-label="Pánico: cortar todas las notas"><span class="t"><b>${esc(q.name)}</b></span>
    <span class="v">STOP</span><span class="s">${esc(q.note())}</span></button>`;
  const d = qd(q); if (!d) return "";
  const v = qv(q), on = qOn(q), [t, u] = fmtValue(d, v), key = qkey(q), note = q.note ? q.note(on) : q.page || "";
  let foot = "";
  if (q.kind === "amount" || q.kind === "bipolar") {
    const f = frac(d, v), z = q.kind === "bipolar" ? frac(d, 0) : 0, lo = Math.min(f, z), hi = Math.max(f, z);
    foot = `<div class="amt${q.kind === "bipolar" ? " bi" : ""}" data-amt="${key}" role="slider" aria-label="${esc(q.name)}: nivel" aria-valuenow="${v}" aria-valuemin="${d.min}" aria-valuemax="${d.max}" tabindex="0">
      <b style="left:${lo * 100}%;width:${(hi - lo) * 100}%"></b><i style="left:calc(${f * 100}% - 1px)"></i></div>`;
  } else if (q.kind === "nudge") {
    foot = `<div class="stp">${q.steps.map((n) => `<button data-qn="${key}" data-d="${n}" aria-label="${esc(q.name)} ${n > 0 ? "+" : ""}${n}">${n > 0 ? "+" : "−"}${Math.abs(n)}</button>`).join("")}</div>`;
  } else if (q.kind === "tempo") {
    foot = `<div class="stp"><button class="tap" data-tap="1">TAP</button></div>`;
  } else if (q.kind === "choice" || q.step) {
    foot = `<div class="stp"><button data-qstep="${key}" data-d="-1" aria-label="${esc(q.name)}: anterior"><svg class="i"><use href="#i-prev"/></svg></button>
      ${d.names && d.names.length > 4 ? `<button class="pkb" data-pick="${key}" aria-label="${esc(q.name)}: lista"><svg class="i"><use href="#i-list"/></svg></button>` : ""}<button data-qstep="${key}" data-d="1" aria-label="${esc(q.name)}: siguiente"><svg class="i"><use href="#i-next"/></svg></button></div>`;
  }
  const top = `<span class="t"><b>${esc(q.name)}</b>${q.kind === "choice" || q.kind === "tempo" ? "" : `<i class="led" aria-hidden="true"></i>`}</span>
    <span class="v">${esc(t)}${u ? `<small>${esc(u)}</small>` : ""}</span><span class="s">${esc(note)}</span>`;
  return (q.kind === "tempo" ? `<div class="tg tgd" data-fd="${key}" role="slider" tabindex="0" aria-label="${esc(q.name)}">${top}</div>` : q.kind === "choice" ? `<div class="tg">${top}</div>` : `<button class="tg" role="switch" aria-checked="${on}" data-qtog="${key}" aria-label="${esc(q.name)}: ${on ? "encendido" : "apagado"}">${top}</button>`) + foot;
}
const tile = (q) => `<section class="tl${qOn(q) ? " on" : ""}${q.kind === "panic" ? " panic" : ""}" style="--c:${KC[q.k]}" data-tl="${qkey(q)}">${tileInner(q)}</section>`;
function paintTile(s, id) {
  const keys = [keyOf(s, id)];
  if (!s && id === 17) keys.push(keyOf(0, 23));
  if (!s && (id === 25 || id === 26)) keys.push(keyOf(0, 27));
  keys.forEach((k) => { const el = document.querySelector(`.tl[data-tl="${k}"]`), q = QSPEC.get(k); if (!el || !q || (amtOn && el.contains(amtOn))) return;
    el.classList.toggle("on", qOn(q)); el.innerHTML = tileInner(q); });
}
const qset = (q, v) => { setVal(q.s || 0, q.id, v); paintTile(q.s || 0, q.id); };
function quickToggle(key) {
  const q = QSPEC.get(key); if (!q || !qd(q)) return;
  if (qOn(q)) { remember.set(key, qv(q)); qset(q, qRest(q)); } else qset(q, remember.get(key) ?? q.on);
}
function quickStep(key, dir) {
  const q = QSPEC.get(key), d = q && qd(q); if (!d) return;
  const lo = q.kind === "toggle" ? d.min + 1 : d.min;              /* (a switch's choices: never its OFF) */
  let v = qv(q);
  v = v < lo ? lo : v + dir > d.max ? lo : v + dir < lo ? d.max : v + dir;
  qset(q, v);
}
function quickNudge(key, n) { const q = QSPEC.get(key); if (q && qd(q)) qset(q, qv(q) + n); }
/* tap tempo: the mean of the last taps (a pause of 2 s starts over) */
const taps = [];
function tapTempo() {
  const now = performance.now();
  if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
  taps.push(now); if (taps.length > 5) taps.shift();
  if (taps.length < 2) { toast(-1, "Sigue tocando TAP al pulso"); return; }
  const bpm = Math.round(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
  const q = QSPEC.get(keyOf(1, 0)); qset(q, bpm);
  toast(-1, `<b>Tempo</b> <span class="num">${qv(q)} BPM</span>`);
}
/* all notes off on every channel (MIDI, not the editor's SysEx): what a stuck note needs */
function panic() {
  if (M.midiOut) for (let ch = 0; ch < 16; ch++) { M.midiOut.send([0xB0 | ch, 123, 0]); M.midiOut.send([0xB0 | ch, 120, 0]); }
  toast(-1, "<b>Pánico</b> todas las notas cortadas");
}

const again = (el, c) => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };
const fade = () => { again($("edit"), "fade"); setTimeout(() => $("edit").classList.remove("fade"), 240); };
function renderWork() {
  $("edit").dataset.folder = S.folder;   /* (no data-f: the bottom bar looks up for [data-f] and would eat every tap) */
  const f = S.folder;
  SQ.full = f === "ESTUDIO" || (f === "SEQ" && S.seqMode !== "steps");   /* (SEQ: the advanced one first, Pasos the second; Estudio: always) */
  $("edit").innerHTML = f === "ESTUDIO" ? studioView() : f === "SAVE" ? soundsView() : f === "LIVE" ? cfgView("live", "Live") : f === "HOME" ? homeView() : f === "REC" ? recView()
    : f === "SEQ" ? seqView()
    : folderView(f);
}
function flashRowQuiet(title) { document.querySelectorAll(`#edit [data-title="${CSS.escape(title)}"]`).forEach((r) => r.classList.add("dev")); }
function renderWhere() { $("where").textContent = !M.page ? "" : M.page.home ? "HOME" : M.page.title; renderNav(); renderDev(); }
/* the phone, landscape (a screen under 540 px tall): the two rails are panels over the work, one at a time, from the
   bar's two buttons; a tap outside, or a folder, closes them */
const PHONE = matchMedia("(max-height: 540px)");
const isPhone = () => PHONE.matches;
function phoneRail(side) {
  const b = document.body, k = side === "l" ? "lopen" : "ropen", on = !b.classList.contains(k);
  b.classList.remove("lopen", "ropen"); if (on) b.classList.add(k);
  $("lrh").setAttribute("aria-pressed", b.classList.contains("lopen")); if (isPhone()) $("favh").setAttribute("aria-pressed", b.classList.contains("ropen"));
}
document.addEventListener("pointerdown", (e) => {
  if (!document.body.matches(".lopen, .ropen") || e.target.closest(".rail, #lrh, #favh, .sh, .br, .pick")) return;
  document.body.classList.remove("lopen", "ropen"); $("lrh").setAttribute("aria-pressed", "false");
}, true);
PHONE.addEventListener("change", () => { document.body.classList.remove("lopen", "ropen"); renderWork(); });
function renderNav() {
  const dev = M.page ? (M.page.home ? "HOME" : FAM[M.page.fam]) : "";
  $("nav").innerHTML = NAV.map(([n, ic]) => `<button class="nb${n === dev ? " dev" : ""}${n === "ESTUDIO" ? " est" : ""}" ${n === S.folder ? 'aria-current="page"' : ""} data-f="${n}"><svg class="i"><use href="#i-${ic}"/></svg>${n}</button>`).join("");
}
function renderMeta() {                                   /* (the sound edited: keep it or go back, by the changes) */
  const n = entryNow();
  $("metal").innerHTML = M.edited ? `<span class="edtx" title="Editado">EDIT</span><button class="btn" data-save="1"><svg class="i"><use href="#i-disk"/></svg>Guardar</button>${n >= 0 ? `<button class="btn" data-discard="1"><svg class="i"><use href="#i-undo"/></svg>Descartar</button>` : ""}` : "";
}
function renderBar() {
  const n = entryNow(), x = M.list[n], fav = M.favCur >= 0;
  $("name").textContent = x ? x.name : (M.info.engines[M.engine] || "") + " " + (M.preset + 1);
  $("now").classList.toggle("edited", M.edited); $("saveb").classList.toggle("ed", M.edited);
  $("now").setAttribute("aria-label", `${$("name").textContent}${M.edited ? ", editado" : ""}: abrir sonidos`);
  $("meta").innerHTML = `<span class="k">${esc(x ? x.kind : "USER")}</span><span class="e">${esc(M.info.engines[M.engine] || "")}</span><span class="num">${n >= 0 ? n + 1 : "--"}/${M.list.length}</span>`;
  $("favt").classList.toggle("fav", fav); $("favt").setAttribute("aria-pressed", fav);
  $("fcount").textContent = `${M.favs.length}/16`;
  $("favs").innerHTML = M.favs.map((f, i) => `<button class="fv" role="listitem" data-favgo="${i}" aria-current="${i === M.favCur}"><span class="i">${String(i + 1).padStart(2, "0")}</span>
    <span class="n">${esc(f.name)}</span><span class="k">${esc(f.kind)} <span class="e">${esc(M.info.engines[f.e] || "USER")}</span></span></button>`).join("");
  renderMeta(); renderLog();
  if (B.open) renderBrowser();
  if (S.folder === "SAVE") renderWork();
}
function renderAll() { renderBar(); renderWhere(); renderWork(); }

