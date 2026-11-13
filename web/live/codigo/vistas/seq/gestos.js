/* ---- los gestos de lo nuevo: carriles y mod seq se pintan; grados de tuning y nivel de pista se arrastran en horizontal ---- */
let LD = null, MD = null, HD = null;
function laneDraw(e) {
  const r = LD.el.getBoundingClientRect(), cols = LD.el.children.length; if (!cols) return;
  const j = Math.max(0, Math.min(cols - 1, Math.floor((e.clientX - r.left) / r.width * cols)));
  const i = SQ.page * 16 + j, fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)), st = SQ.steps[i]; if (!st) return;
  if (SQ.lane === "vel") st.vel = Math.max(1, Math.round((1 - fy) * 127));
  else if (SQ.lane === "rat") st.rat = (Math.min(3, Math.floor((1 - fy) * 4)) & 3) * 0x55;             /* 2 bits por nota: las 4 iguales */
  else if (SQ.lane === "lvl") st.lvl = (LV_UP[Math.min(3, Math.floor((1 - fy) * 4))] & 3) * 0x55;
  else { if (!SQX.micro) return; SQX.micro[i] = Math.max(-32, Math.min(31, Math.round((0.5 - fy) * 64))); }
  LD.dirty.add(i);
  const c = LD.el.querySelector(`[data-lc="${i}"]`); if (c) c.outerHTML = sqLaneCell(i);
}
function msqPaint(e) {
  const c = document.elementFromPoint(e.clientX, e.clientY)?.closest(".mss"); if (!c || !MD.el.contains(c)) return;
  const r = c.getBoundingClientRect(), fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
  const v = Math.max(-8, Math.min(7, Math.round(7 - fy * 15))), k = +c.dataset.l * 16 + +c.dataset.i, st = PCD.mseq.steps;
  if (st[k] !== v) { st[k] = v; c.style.cssText = mssStyle(v); MD.changed = true; }
}
document.addEventListener("pointerdown", (e) => {
  const ln = e.target.closest("[data-sqdraw]");
  if (ln) { LD = { el: ln, dirty: new Set() }; try { ln.setPointerCapture(e.pointerId); } catch (er) { /* (sin captura, se dibuja igual) */ } e.preventDefault(); laneDraw(e); return; }
  const ms = e.target.closest("[data-msq]");
  if (ms && PCD.mseq && PCD.mseq.steps) { MD = { el: ms, changed: false }; try { ms.setPointerCapture(e.pointerId); } catch (er) { /* (ídem) */ } e.preventDefault(); msqPaint(e); return; }
  const dg = e.target.closest(".tnd[data-deg]:not(.fix)");
  if (dg && PCD.tune && PCD.tune.deg) { const i = +dg.dataset.deg; HD = { kind: "deg", el: dg, i, x0: e.clientX, v0: PCD.tune.deg[i], on: false, pid: e.pointerId }; return; }
  const tl = e.target.closest("[data-trl]");
  if (tl && PCD.tracks && PCD.tracks.tracks) { const i = +tl.dataset.trl; HD = { kind: "trl", el: tl, i, x0: e.clientX, v0: PCD.tracks.tracks[i].level, on: false, pid: e.pointerId }; }
});
document.addEventListener("pointermove", (e) => {
  if (LD) { laneDraw(e); return; }
  if (MD) { msqPaint(e); return; }
  if (!HD) return;
  const dx = e.clientX - HD.x0;
  if (!HD.on) { if (Math.abs(dx) < 6) return; HD.on = true; HD.x0 = e.clientX; try { HD.el.setPointerCapture(HD.pid); } catch (er) { /* (ya no está) */ } return; }
  if (HD.kind === "deg") {
    const v = PCD.tune, x = Math.max(0, Math.min(v.period, Math.round(HD.v0 + dx * 16)));
    v.deg[HD.i] = x; HD.el.querySelector("b").textContent = (x / 16).toFixed(1); HD.el.classList.add("held");
  } else {
    const t = PCD.tracks.tracks[HD.i], w = HD.el.getBoundingClientRect().width || 200, l = Math.max(-64, Math.min(63, Math.round(HD.v0 + dx * 127 / w)));
    t.level = l; HD.el.style.setProperty("--f", trLv(l)); HD.el.querySelector("span").textContent = l; HD.el.classList.add("held");
  }
});
function ptrEnd() {
  if (LD) {
    const d = LD; LD = null;
    d.dirty.forEach((i) => {
      if (SQ.lane === "nud") rq(C_MICRO_SET, [SQX.tr & 127, i & 127, (SQX.micro[i] + 64) & 127], { key: "micro:" + i, quiet: true, retries: 0, timeout: 900 }).catch(() => {});
      else { const st = SQ.steps[i]; sqSet(i, { vel: st.vel, rat: st.rat, lvl: st.lvl }); }
    });
    if (d.dirty.size && SQ.lane === "nud") d.dirty.forEach((i) => { const el = document.querySelector(`.sq[data-sq="${i}"]`); if (el) el.outerHTML = sqCell(i, sqLen()); });   /* la marca del nudge en la rejilla */
  }
  if (MD) { const d = MD; MD = null; if (d.changed) PC.act(CE.MSEQ_PUT, [0, ...PCD.mseq.steps.map((v) => Math.max(0, Math.min(15, v + 8)))]); }
  if (HD) {
    const d = HD; HD = null; d.el.classList.remove("held");
    if (d.on && d.kind === "deg") tunePut(PCD.tune);
    if (d.on && d.kind === "trl") { const t = PCD.tracks.tracks[d.i]; trackMix(d.i, t.level, t.mute); }
  }
}
document.addEventListener("pointerup", ptrEnd); document.addEventListener("pointercancel", ptrEnd);
document.addEventListener("click", (e) => {
  const tn = e.target.closest("[data-tune]");
  if (tn && PCD.tune && PCD.tune.deg) { const v = PCD.tune; v.root = (v.root + +tn.dataset.tune + 12) % 12; tunePut(v); renderWork(); return; }
  const tk = e.target.closest("[data-trk]"); if (tk) { trackPick(+tk.dataset.trk); return; }
  const tm = e.target.closest("[data-trm]");
  if (tm && PCD.tracks && PCD.tracks.tracks) { const i = +tm.dataset.trm, t = PCD.tracks.tracks[i]; trackMix(i, t.level, !t.mute).then(() => renderWork()); }
});


document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-sq],[data-sqplay],[data-sqd],[data-sqpc],[data-sqf],[data-sqr]"); if (!b || !SQ.loaded) return;
  const i = SQ.sel, st = SQ.steps[i];
  if (b.dataset.sqplay) { rq(C.TRANSPORT, [SQ.playing ? 0 : 1]).then((a) => { SQ.playing = !!a[0]; sqPlayBtn(b); }).catch(() => {}); return; }
  if (b.dataset.sq) {
    const k = +b.dataset.sq, s2 = SQ.steps[k];
    if (k !== SQ.sel) { sqPick(k); if (!sqOn(s2) && s2.time !== ST_TIE) sqSet(k, { n: 1, notes: [SQ.last, 0, 0, 0], time: ST_NOTE, vel: s2.vel || 100 }); }
    else if (sqOn(s2) || s2.time === ST_TIE) sqSet(k, sqEmpty(s2));
    else sqSet(k, { n: 1, notes: [SQ.last, 0, 0, 0], time: ST_NOTE, vel: s2.vel || 100 });
    return;
  }
  if (b.dataset.sqd) { const n = Math.max(0, Math.min(127, st.notes[0] + +b.dataset.sqd)); sqSet(i, { notes: [n, ...st.notes.slice(1)] }); }
  else if (b.dataset.sqpc) { const n = Math.min(127, st.notes[0] - (st.notes[0] % 12) + +b.dataset.sqpc); sqSet(i, { notes: [n, ...st.notes.slice(1)] }); }
  else if (b.dataset.sqr) sqSet(i, { rat: ((st.rat | 0) & ~3) | +b.dataset.sqr });
  else if (b.dataset.sqf === "acc") sqSet(i, { flags: st.flags ^ SF_ACC });
  else if (b.dataset.sqf === "slide") sqSet(i, { flags: st.flags ^ SF_SLIDE });
  else if (b.dataset.sqf === "rest") sqSet(i, sqEmpty(st));
  else if (b.dataset.sqf === "note") sqSet(i, { n: 1, notes: [SQ.last, 0, 0, 0], time: ST_NOTE, vel: st.vel || 100 });
  else if (b.dataset.sqf === "tie") sqSet(i, st.time === ST_TIE ? sqEmpty(st) : { n: 0, time: ST_TIE });
});
/* the velocity: slide along it */
let sqv = null;
const sqVelAt = (e) => { const r = sqv.getBoundingClientRect(), v = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 127);
  sqv.style.setProperty("--v", v / 127); sqv.querySelector(".v").textContent = v; sqv.setAttribute("aria-valuenow", v);
  const i = SQ.sel; SQ.steps[i].vel = v; const c = document.querySelector(`.sq[data-sq="${i}"]`); if (c) c.style.setProperty("--v", v / 127);
  clearTimeout(sqv._t); sqv._t = setTimeout(() => sqSet(i, { vel: v }), 40); };
document.addEventListener("pointerdown", (e) => { const v = e.target.closest("[data-sqvel]"); if (!v) return; sqv = v; v.setPointerCapture(e.pointerId); sqVelAt(e); });
document.addEventListener("pointermove", (e) => { if (sqv) sqVelAt(e); });
document.addEventListener("pointerup", () => { sqv = null; });
document.addEventListener("keydown", (e) => {
  const v = e.target.closest && e.target.closest("[data-sqvel]"), d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
  if (!v || !d) return; e.preventDefault(); const st = SQ.steps[SQ.sel]; sqSet(SQ.sel, { vel: Math.max(0, Math.min(127, st.vel + d)) });
});

