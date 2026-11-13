/* ---- scenes (an idea from SLOOP's LIVE pro): 8 snapshots of the sound, kept in the tablet. A tap goes to one, at once
   or morphing there over 1..16 bars at the synth's tempo; the A / B crossfader slides between two. A scene keeps the
   sound's parameters (not the pattern's: LEN DIV SWG GATE), the engine's own ones (E0..E7) only for the same engine.
   Its changes do not fill Cambios (a scene is one deliberate jump: a toast says which) */
const SCN = Object.assign({ slots: new Array(8).fill(null), bars: 0, a: 0, b: 1, x: 0 }, store.get("scenes") || {});
SCN.run = null; SCN.keep = false; SCN.cur = -1;
const SCN_BARS = [0, 1, 2, 4, 8, 16];
const scnSave = () => store.set("scenes", { slots: SCN.slots, bars: SCN.bars, a: SCN.a, b: SCN.b, x: SCN.x });
const scnCont = (d) => !!d && !isChoice(d) && d.max - d.min > 4;           /* (glides; a list or a switch changes at once) */
function scnIds(sc) {
  const skip = new Set((LAYOUT.find((x) => x.title === "PATTERN") || { ids: [] }).ids);
  return Object.keys(sc.p).map(Number).filter((id) => !skip.has(id) && desc(0, id) && (id < M.info.pe0 || sc.engine === M.engine));
}
function scnSet(id, v) { const u = undoing; undoing = true; setVal(0, id, v); undoing = u; }
function scnStop() { if (SCN.run) { clearInterval(SCN.run.timer); SCN.run = null; } paintScn(); }
function scnCapture(n) {
  const x = M.list[entryNow()], p = {};
  M.p.forEach((v, id) => { if (id < M.info.pcount && desc(0, id)) p[id] = v; });
  SCN.slots[n] = { engine: M.engine, sound: x ? x.name : M.info.engines[M.engine] || "", p, at: new Date().toISOString() };
  scnSave(); renderWork(); toast(-1, `<b>S${n + 1}</b> guardada: ${esc(SCN.slots[n].sound)}`);
}
function scnGo(n) {
  const sc = SCN.slots[n]; if (!sc || !M.link) return;
  scnStop();
  const ids = scnIds(sc), from = Object.fromEntries(ids.map((id) => [id, val(0, id)]));
  const bpm = desc(1, 0) ? val(1, 0) : 120, dur = SCN.bars ? SCN.bars * 4 * 60000 / Math.max(20, bpm) : 0;
  ids.forEach((id) => { if (!dur || !scnCont(desc(0, id))) scnSet(id, sc.p[id]); });
  SCN.cur = n;
  if (dur) {
    const t0 = performance.now();
    SCN.run = { n, t0, dur, f: 0, timer: setInterval(() => {
      const f = Math.min(1, (performance.now() - t0) / dur);
      ids.forEach((id) => { if (scnCont(desc(0, id))) scnSet(id, from[id] + (sc.p[id] - from[id]) * f); });
      SCN.run.f = f; paintScn();
      if (f >= 1) scnStop();
    }, 60) };
  }
  paintScn();
  toast(-1, `<b>S${n + 1}</b> ${dur ? `en ${SCN.bars} ${SCN.bars === 1 ? "compás" : "compases"}` : ""}: ${esc(sc.sound)}`);
}
function scnFade(x) {                              /* the crossfader: A (0) .. B (1) */
  const A = SCN.slots[SCN.a], B = SCN.slots[SCN.b]; SCN.x = x; if (!A || !B || !M.link) return;
  scnStop();
  scnIds(A).filter((id) => B.p[id] != null && (id < M.info.pe0 || B.engine === M.engine)).forEach((id) => {
    const d = desc(0, id); scnSet(id, scnCont(d) ? A.p[id] + (B.p[id] - A.p[id]) * x : x < .5 ? A.p[id] : B.p[id]);
  });
}
const scnNext = (k) => { const used = SCN.slots.map((s, i) => (s ? i : -1)).filter((i) => i >= 0); if (!used.length) return k; return used[(used.indexOf(k) + 1) % used.length]; };
function scnHtml() {
  const run = SCN.run;
  const pads = SCN.slots.map((s, i) => `<button class="scp${s ? "" : " free"}${SCN.cur === i ? " cur" : ""}" data-scn="${i}" aria-label="Escena ${i + 1}${s ? ": " + esc(s.sound) : ", libre"}">
      <b class="num">S${i + 1}</b><span>${s ? esc(s.sound) : SCN.keep ? "Guardar aquí" : "Libre"}</span></button>`).join("");
  return `<section class="scn${SCN.keep ? " keep" : ""}"><header><h3>Escenas</h3>
      <button class="sck${SCN.keep ? " on" : ""}" data-scnkeep="1" aria-pressed="${SCN.keep}">Guardar</button></header>
    <div class="scps">${pads}</div>
    <div class="scb" role="radiogroup" aria-label="Morph">${SCN_BARS.map((b) => `<button role="radio" aria-checked="${SCN.bars === b}" data-scnbars="${b}">${b ? b : "Ya"}</button>`).join("")}<span>${SCN.bars ? "compases" : "de golpe"}</span></div>
    <div class="scx"><button data-scnab="a" class="num">S${SCN.a + 1}</button>
      <div class="scf" data-scnx="1" role="slider" tabindex="0" aria-label="Crossfader A / B" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(SCN.x * 100)}" style="--f:${SCN.x}"><i></i></div>
      <button data-scnab="b" class="num">S${SCN.b + 1}</button></div>
    <div class="scr" style="--f:${run ? run.f : 0}"${run ? "" : " hidden"}><i></i><button data-scnstop="1">Parar</button></div></section>`;
}
function paintScn() {                              /* (in place: the run's bar, the scene playing) */
  document.querySelectorAll(".scn").forEach((el) => {
    const r = el.querySelector(".scr"); if (r) { r.hidden = !SCN.run; r.style.setProperty("--f", SCN.run ? SCN.run.f : 0); }
    el.querySelectorAll("[data-scn]").forEach((b) => b.classList.toggle("cur", +b.dataset.scn === SCN.cur));
  });
}
LXT.sc = { name: "Escenas", w: 2, h: 2, html: scnHtml };
document.addEventListener("click", (e) => {
  if (CFG.edit) return;
  const b = e.target.closest("[data-scn],[data-scnkeep],[data-scnbars],[data-scnab],[data-scnstop]"); if (!b) return;
  if (b.dataset.scnkeep) { SCN.keep = !SCN.keep; renderWork(); return; }
  if (b.dataset.scnbars != null) { SCN.bars = +b.dataset.scnbars; scnSave(); renderWork(); return; }
  if (b.dataset.scnstop) { scnStop(); return; }
  if (b.dataset.scnab) { const k = b.dataset.scnab; SCN[k] = scnNext(SCN[k]); scnSave(); renderWork(); return; }
  const n = +b.dataset.scn;
  if (SCN.keep) {
    if (SCN.slots[n] && b.dataset.arm !== "1") { arm(b, b.textContent, `S${n + 1}: ¿encima?`); return; }
    SCN.keep = false; scnCapture(n); return;
  }
  if (SCN.slots[n]) scnGo(n);
});
/* the crossfader: dragged sideways (the whole bar takes the finger) */
let scnDrag = null;
document.addEventListener("pointerdown", (e) => {
  const f = !CFG.edit && e.target.closest("[data-scnx]"); if (!f) return;
  scnDrag = f; f.setPointerCapture?.(e.pointerId); scnAt(e); e.preventDefault();
});
document.addEventListener("pointermove", (e) => { if (scnDrag) scnAt(e); });
document.addEventListener("pointerup", () => { if (scnDrag) { scnDrag = null; scnFade(SCN.fx); scnSave(); } });
function scnAt(e) {
  const r = scnDrag.getBoundingClientRect(), x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  scnDrag.style.setProperty("--f", x); scnDrag.setAttribute("aria-valuenow", Math.round(x * 100));
  SCN.fx = x;
  if (!SCN.raf) SCN.raf = requestAnimationFrame(() => { SCN.raf = 0; scnFade(SCN.fx); });   /* (once a frame) */
}
