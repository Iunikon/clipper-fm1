/* ---- for the stage (ideas from SLOOP's LIVE pro): MIDI learn, the set recorded from the FM-1's USB audio, the set's
   clock. All in the tablet: nothing of it is in the firmware */

/* MIDI learn: any value, action or scene of Live on a knob or a key of another MIDI controller. Learn: tap a control,
   then move the controller's knob or press its key. The links are kept in the tablet ("midimap"); a CC sets a value
   across its range, a note toggles a switch, triggers an action or goes to a scene. The FM-1's own port is left alone */
const ML = { on: false, target: null, map: store.get("midimap") || {}, ready: false };
const mlSave = () => store.set("midimap", ML.map);
const mlName = (t) => (t.s != null ? (desc(t.s, t.id) || {}).label || "?" : t.act ? (ACT[t.act] || [t.act])[0] : t.scn != null ? `S${t.scn + 1}` : "?");
const mlKeyName = (k) => { const [kind, ch, n] = k.split(":"); return kind === "cc" ? `CC ${n} · canal ${+ch + 1}` : `Nota ${n} · canal ${+ch + 1}`; };
async function mlAttach() {
  if (ML.ready || !navigator.requestMIDIAccess) return;
  let acc = M.access;
  try { if (!acc) acc = M.access = await navigator.requestMIDIAccess(); } catch (e) { toast(-1, "Sin permiso para MIDI"); return; }
  const hook = () => acc.inputs.forEach((inp) => { if (inp !== M.fmIn && inp.state !== "disconnected") inp.onmidimessage = mlMsg; });
  hook(); acc.addEventListener("statechange", hook); ML.ready = true;
}
function mlMsg(e) {
  const [st, a, b] = e.data, kind = st & 0xF0, ch = st & 15;
  if (kind !== 0xB0 && kind !== 0x90 && kind !== 0x80) return;
  const k = `${kind === 0xB0 ? "cc" : "nt"}:${ch}:${a}`, on = kind === 0x90 && b > 0;
  if (ML.on && ML.target) {
    if (kind === 0x80 || (kind === 0x90 && !b)) return;     /* (the key's release: not a new link) */
    for (const [kk, t] of Object.entries(ML.map)) if (JSON.stringify(t) === JSON.stringify(ML.target)) delete ML.map[kk];
    ML.map[k] = ML.target; mlSave();
    toast(-1, `<b>${esc(mlKeyName(k))}</b> → ${esc(mlName(ML.target))}`);
    ML.target = null; document.querySelectorAll(".lrn-t").forEach((x) => x.classList.remove("lrn-t")); return;
  }
  const t = ML.map[k]; if (!t || !M.link) return;
  if (t.s != null) {
    const d = desc(t.s, t.id); if (!d) return;
    if (kind === 0xB0) setVal(t.s, t.id, d.min + Math.round(b / 127 * (d.max - d.min)));
    else if (on) setVal(t.s, t.id, isGo(d) ? d.max : val(t.s, t.id) === d.min ? d.max : d.min);
  } else if (kind === 0xB0 ? b >= 64 && !(ML.hi || {})[k] : on) {
    if (t.act) runAct(t.act); else if (t.scn != null) scnGo(t.scn);
  }
  if (kind === 0xB0) (ML.hi = ML.hi || {})[k] = b >= 64;        /* (a CC as a button: once each time it crosses 64) */
}
function mlToggle() {
  ML.on = !ML.on; ML.target = null; document.body.classList.toggle("learning", ML.on);
  if (ML.on) { mlAttach(); toast(-1, "<b>MIDI learn</b>: toca un control y mueve tu controlador"); }
  document.querySelectorAll(".lrn-t").forEach((x) => x.classList.remove("lrn-t")); renderWork();
}
/* learning: a tap picks the control instead of using it */
const ML_SEL = "[data-fd],[data-cell],[data-act],[data-scn],.tl[data-tl]";
function mlPick(e) {
  if (!ML.on) return;
  const el = e.target.closest(ML_SEL); if (!el || e.target.closest("[data-mloff],.lrnbar,[data-act=learn]")) return;
  e.preventDefault(); e.stopPropagation();
  if (e.type !== "click") return;
  let t = null;
  const key = el.dataset.fd || el.dataset.cell;
  if (key) { const [s, id] = key.split(":").map(Number); t = { s, id }; }
  else if (el.dataset.act) t = el.dataset.act === "learn" ? null : { act: el.dataset.act };
  else if (el.dataset.scn != null) t = { scn: +el.dataset.scn };
  else if (el.dataset.tl) { const q = QSPEC.get(el.dataset.tl); if (q && q.id >= 0) t = { s: q.s || 0, id: q.id }; }
  if (!t) return;
  ML.target = t; document.querySelectorAll(".lrn-t").forEach((x) => x.classList.remove("lrn-t")); el.classList.add("lrn-t");
  toast(-1, `<b>${esc(mlName(t))}</b>: ahora mueve la perilla o pulsa la tecla`);
}
["pointerdown", "click"].forEach((ev) => document.addEventListener(ev, mlPick, true));
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-mloff]")) { mlToggle(); return; }
  const x = e.target.closest("[data-mldel]"); if (x) { delete ML.map[x.dataset.mldel]; mlSave(); renderWork(); }
});
ACT.learn = ["MIDI learn", "Tu controlador mueve Live", "◎"]; ACT.learn.run = mlToggle;
function mlBar() {                                 /* the strip while learning (on every view) */
  let el = document.querySelector(".lrnbar");
  if (!ML.on) { el?.remove(); return; }
  if (!el) { el = document.createElement("div"); el.className = "lrnbar"; el.setAttribute("role", "status"); document.body.append(el); }
  el.innerHTML = `<b>MIDI learn</b><span>${ML.target ? `${esc(mlName(ML.target))}: mueve la perilla o pulsa la tecla` : "Toca un control, una acción o una escena"}</span><button class="btn" data-mloff="1">Listo</button>`;
}
setInterval(mlBar, 300);
if (Object.keys(ML.map).length) document.addEventListener("click", () => mlAttach(), { once: true, capture: true });   /* (links kept: listen once Live is touched) */
function mlList() {                                /* Estudio > Sistema */
  const rows = Object.entries(ML.map);
  return `<div class="mll"><div class="syl"><span>MIDI learn</span><button class="btn" data-act="learn">${ML.on ? "Aprendiendo… (Listo)" : "Aprender"}</button></div>
    ${rows.length ? rows.map(([k, t]) => `<div class="mlr"><span class="num">${esc(mlKeyName(k))}</span><b>${esc(mlName(t))}</b><button class="dsc" data-mldel="${esc(k)}" aria-label="Quitar">×</button></div>`).join("") : `<p class="msh">Sin enlaces. Conecta un controlador MIDI, toca Aprender, luego un control de Live y mueve una perilla.</p>`}</div>`;
}

/* the set recorded: the FM-1's USB audio (the scope's input) to a file in the downloads, when you stop */
const RS = { rec: null, chunks: [], t0: 0 };
async function rsToggle() {
  if (RS.rec) { RS.rec.stop(); return; }
  if (!usbStream) await usbAudio();
  if (!usbStream) { toast(-1, "Sin audio USB del FM-1: no puedo grabar"); return; }
  if (!window.MediaRecorder) { toast(-1, "Este navegador no puede grabar"); return; }
  const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported?.(t)) || "";
  try { RS.rec = new MediaRecorder(usbStream, type ? { mimeType: type, audioBitsPerSecond: 192000 } : {}); } catch (e) { toast(-1, "No se pudo empezar a grabar"); return; }
  RS.chunks = []; RS.t0 = Date.now();
  RS.rec.ondataavailable = (ev) => { if (ev.data.size) RS.chunks.push(ev.data); };
  RS.rec.onstop = () => {
    const ext = /mp4/.test(RS.rec.mimeType) ? "m4a" : "webm", blob = new Blob(RS.chunks, { type: RS.rec.mimeType }), a = document.createElement("a"), url = URL.createObjectURL(blob);
    const d = new Date(RS.t0), f2 = (x) => String(x).padStart(2, "0");
    a.href = url; a.download = `clipper-set-${d.getFullYear()}${f2(d.getMonth() + 1)}${f2(d.getDate())}-${f2(d.getHours())}${f2(d.getMinutes())}.${ext}`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 8000);
    toast(-1, `<b>Set grabado</b>: ${clk(Date.now() - RS.t0)}, en tus descargas`);
    RS.rec = null; document.body.classList.remove("setrec"); paintSet();
  };
  RS.rec.start(1000); document.body.classList.add("setrec"); paintSet();
  toast(-1, "<b>Grabando el set</b> desde el audio USB del FM-1");
}
LXT.rs = { name: "Grabar set", w: 1, h: 1, html: () => `<button class="act rsb${RS.rec ? " on" : ""}" data-rs="1"><b>GRABAR SET</b><span class="v num" data-rst="1">${RS.rec ? clk(Date.now() - RS.t0) : "●"}</span><span class="s">${RS.rec ? "Toca para parar y guardar" : "El audio USB del FM-1 a un archivo"}</span></button>` };

/* the set's clock: the time, and how long the set has run (started and paused by hand; kept across a reload) */
const SC = Object.assign({ acc: 0, t0: 0, run: false }, store.get("setclock") || {});
const scSave = () => store.set("setclock", { acc: SC.acc, t0: SC.t0, run: SC.run });
const scNow = () => SC.acc + (SC.run ? Date.now() - SC.t0 : 0);
function clk(ms) { const s = Math.floor(ms / 1000), f2 = (x) => String(x).padStart(2, "0"); return `${s >= 3600 ? Math.floor(s / 3600) + ":" : ""}${f2(Math.floor(s / 60) % 60)}:${f2(s % 60)}`; }
const hhmm = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
LXT.clock = { name: "Reloj del set", w: 1, h: 1, html: () => `<div class="act clk"><b>RELOJ</b><span class="v num" data-clkh="1">${hhmm()}</span>
  <span class="clks"><span class="num" data-clks="1">${clk(scNow())}</span><button data-sc="go" aria-label="${SC.run ? "Pausar el set" : "Empezar el set"}">${SC.run ? "❚❚" : "▶"}</button><button data-sc="zero" aria-label="El set a cero">↺</button></span></div>` };
document.addEventListener("click", (e) => {
  if (CFG.edit || ML.on) return;
  if (e.target.closest("[data-rs]")) { rsToggle(); return; }
  const b = e.target.closest("[data-sc]"); if (!b) return;
  if (b.dataset.sc === "go") { if (SC.run) { SC.acc += Date.now() - SC.t0; SC.run = false; } else { SC.t0 = Date.now(); SC.run = true; } }
  else { SC.acc = 0; SC.t0 = Date.now(); }
  scSave(); renderWork();
});
function paintSet() {                              /* every second: only the numbers that are on screen */
  document.querySelectorAll("[data-clkh]").forEach((x) => { x.textContent = hhmm(); });
  document.querySelectorAll("[data-clks]").forEach((x) => { x.textContent = clk(scNow()); });
  document.querySelectorAll("[data-rst]").forEach((x) => { x.textContent = RS.rec ? clk(Date.now() - RS.t0) : "●"; });
  document.querySelectorAll(".rsb").forEach((x) => x.classList.toggle("on", !!RS.rec));
}
setInterval(() => { if (!document.hidden) paintSet(); }, 1000);
