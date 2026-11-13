/* ==================================================================== SEQ completo ====
   El secuenciador del editor de Estudio, dentro de Live: rango (copiar, pegar, borrar, transponer, mover, invertir,
   duplicar, ACC, SLIDE), piano roll, carriles dibujables con el dedo (VEL, NUDGE, ROLL, NIVEL), y por paso su nudge,
   su fill y sus locks; más una biblioteca de patrones en la tablet. Un botón cambia entre Básico y Completo.
   VEL, ROLL y NIVEL van por STEP_SET, como el básico. NUDGE por MICRO_SET, FILL por FILL_SET, LOCKS por LOCK_SET:
   formatos leídos del editor publicado, a probar con el FM-1. */
const unpack7 = (a) => { const out = []; for (let i = 0; i < a.length; i += 8) { const top = a[i];
  for (let j = 0; j < 7 && i + 1 + j < a.length; j++) out.push(a[i + 1 + j] | (((top >> j) & 1) << 7)); } return out; };
const SQX = { loaded: false, loading: false, tr: 0, micro: null, fill: null, locks: null };
const sqTr = () => (PCD.tracks && PCD.tracks !== "…" ? PCD.tracks.sel : 0) || 0;
const sqPref = (() => { try { return JSON.parse(localStorage.getItem("clipper.sq") || "{}"); } catch (e) { return {}; } })();
Object.assign(SQ, { bview: (() => { try { return new URLSearchParams(location.search).get("sqbv") || localStorage.getItem("clipper.sqbv") || "grid"; } catch (e) { return "grid"; } })(), full: false, view: sqPref.view || "grid", lane: sqPref.lane || "vel", r0: 0, r1: 0, ext: false, clip: null, page: 0, oct: null });
const sqPrefSave = () => { try { localStorage.setItem("clipper.sq", JSON.stringify({ full: SQ.full, view: SQ.view, lane: SQ.lane })); } catch (e) { /* (solo comodidad) */ } };
const C_MICRO_GET = 39, C_MICRO_SET = 40, C_FILL_GET = 41, C_FILL_SET = 42, C_LOCK_GET = 37, C_LOCK_SET = 38;

async function sqxLoad() {
  if (SQX.loading) return; SQX.loading = true; SQX.tr = sqTr();
  const q = (cmd) => rq(cmd, [SQX.tr & 127], { quiet: true, retries: 0, timeout: 700 }).catch(() => null);
  const m = await q(C_MICRO_GET); SQX.micro = m ? m.slice(1).map((x) => x - 64) : null;
  const f = await q(C_FILL_GET); SQX.fill = f ? unpack7(f.slice(1)) : null;
  const l = await q(C_LOCK_GET);
  if (l) { const r = new Reader(l), o = []; r.b(); const n = r.b(); for (let i = 0; i < n; i++) o.push({ step: r.b(), param: r.b(), value: r.v() }); SQX.locks = o; }
  else SQX.locks = null;
  SQX.loaded = true; SQX.loading = false;
  if (S.folder === "SEQ" || S.folder === "ESTUDIO") renderWork();
}
const sqFill = (i) => (SQX.fill ? ((SQX.fill[i >> 2] || 0) >> (2 * (i & 3))) & 3 : 0);
const sqRange = () => { const len = sqLen(); return [Math.max(0, Math.min(SQ.r0, SQ.r1)), Math.min(len - 1, Math.max(SQ.r0, SQ.r1))]; };
const inRange = (i) => { const [a, b] = sqRange(); return i >= a && i <= b; };
const cpStep = (st) => ({ ...st, notes: st.notes.slice() });
function sqMarks(i) {
  if (!SQ.full) return "";
  const m = SQX.micro ? SQX.micro[i] || 0 : 0, f = sqFill(i), lk = SQX.locks && SQX.locks.some((l) => l.step === i);
  return `${m ? `<i class="mk nud">${m > 0 ? "›" : "‹"}</i>` : ""}${f ? `<i class="mk fil">${f === 1 ? "F" : "×"}</i>` : ""}${lk ? `<i class="mk lck">L</i>` : ""}`;
}

/* ---- la barra de herramientas ---- */
function sqTools(len) {
  const [a, b] = sqRange(), pages = Math.ceil(len / 16);
  const k = (op, lab, extra = "") => `<button class="sqk" data-sqop="${op}"${extra}>${lab}</button>`;
  return `<div class="sqtb">
    <div class="seg"><button data-sqview="grid" aria-pressed="${SQ.view === "grid"}">Rejilla</button><button data-sqview="roll" aria-pressed="${SQ.view === "roll"}">Piano roll</button></div>
    <span class="sqrg"><small>RANGO</small><b class="num">${a + 1}–${b + 1}</b></span>
    <button class="sqk${SQ.ext ? " on" : ""}" data-sqop="ext">${SQ.ext ? "Toca el final" : "Extender"}</button>${k("all", "Todo")}
    <span class="sqsep"></span>${k("copy", "Copiar")}${k("paste", "Pegar", SQ.clip ? "" : " disabled")}${k("clear", "Borrar")}
    <span class="sqsep"></span>${[-12, -1, 1, 12].map((d) => `<button class="sqk num" data-sqop="tr" data-d="${d}">${d > 0 ? "+" : "−"}${Math.abs(d)}</button>`).join("")}
    <span class="sqsep"></span><button class="sqk ico" data-sqop="shift" data-d="-1" aria-label="Mover el rango a la izquierda"><svg class="i"><use href="#i-prev"/></svg></button><button class="sqk ico" data-sqop="shift" data-d="1" aria-label="Mover el rango a la derecha"><svg class="i"><use href="#i-next"/></svg></button>
    ${k("rev", "Invertir")}${k("dbl", "Duplicar")}${k("acc", "ACC")}${k("slide", "SLIDE")}
  </div>${pages > 1 ? `<div class="sqpg" role="group" aria-label="Página de 16 pasos">${Array.from({ length: pages }, (_, p) =>
    `<button data-sqpg="${p}" aria-pressed="${p === SQ.page}">${p * 16 + 1}–${Math.min(len, p * 16 + 16)}</button>`).join("")}<span class="c">El piano roll y los carriles muestran esta página</span></div>` : ""}`;
}

/* ---- piano roll: una octava a la vista, 16 pasos; tocar pone o quita esa nota (hasta 4 por paso: acorde) ---- */
function sqRoll(len) {
  const p0 = SQ.page * 16, cols = Math.max(1, Math.min(16, len - p0));
  if (SQ.oct == null) SQ.oct = Math.max(0, Math.min(115, Math.floor(SQ.last / 12) * 12));
  const rows = [];
  for (let k = 11; k >= 0; k--) {
    const p = SQ.oct + k, bk = NOTE_N[p % 12].length > 1;
    rows.push(`<div class="prr${bk ? " bk" : ""}"><span class="prn num">${noteName(p)}</span>${Array.from({ length: cols }, (_, j) => {
      const i = p0 + j, st = SQ.steps[i], on = sqOn(st) && st.notes.slice(0, st.n).includes(p);
      return `<button class="prc${on ? " on" : ""}${i === SQ.sel ? " sel" : ""}${j % 4 === 0 ? " beat" : ""}${inRange(i) ? " rg" : ""}" data-pr="${i}" data-p="${p}" aria-label="${noteName(p)}, paso ${i + 1}${on ? ", suena" : ""}"></button>`; }).join("")}</div>`);
  }
  return `<div class="sqroll"><div class="pro"><button class="sqk" data-sqop="oct" data-d="-12">Octava −</button><span class="num">${noteName(SQ.oct)} – ${noteName(SQ.oct + 11)}</span><button class="sqk" data-sqop="oct" data-d="12">Octava +</button></div>
    <div class="prg" style="--cols:${cols}">${rows.join("")}</div></div>`;
}

/* ---- carriles: se dibujan con el dedo de un paso a otro ---- */
const LANES = [["vel", "VEL"], ["nud", "NUDGE"], ["rat", "ROLL"], ["lvl", "NIVEL"]];
const LV_UP = [1, 2, 0, 3], LV_N = ["NORM", "GHOST", "SOFT", "HARD"];        /* de menos a más: GHOST, SOFT, NORM, HARD */
function laneVal(i) {
  const st = SQ.steps[i] || {};
  if (SQ.lane === "vel") return (st.vel | 0) / 127;
  if (SQ.lane === "rat") return (((st.rat | 0) & 3) + 1) / 4;
  if (SQ.lane === "lvl") return (LV_UP.indexOf((st.lvl | 0) & 3) + 1) / 4;
  return ((SQX.micro && SQX.micro[i]) || 0) / 32;
}
function laneTxt(i) {
  const st = SQ.steps[i] || {};
  if (SQ.lane === "vel") return st.vel | 0;
  if (SQ.lane === "rat") return "x" + (((st.rat | 0) & 3) + 1);
  if (SQ.lane === "lvl") return LV_N[(st.lvl | 0) & 3];
  const m = (SQX.micro && SQX.micro[i]) || 0; return (m > 0 ? "+" : "") + m;
}
function sqLaneCell(i) {
  const v = laneVal(i), on = sqOn(SQ.steps[i]);
  const style = SQ.lane === "nud" ? `--t:${v > 0 ? 50 - v * 50 : 50}%;--h:${Math.abs(v) * 50}%` : `--t:${100 - v * 100}%;--h:${v * 100}%`;
  return `<div class="sqlc${on ? "" : " off"}${i === SQ.sel ? " sel" : ""}" data-lc="${i}" style="${style}"><i></i><span class="num">${laneTxt(i)}</span></div>`;
}
const LANE_HINT = { vel: "Velocidad de cada paso, 0–127", nud: "Adelanta o retrasa el paso, en 1/64 de paso", rat: "Repeticiones dentro del paso, x1–x4", lvl: "Nivel del golpe: GHOST, SOFT, NORM, HARD" };
function sqLanes(len) {
  const p0 = SQ.page * 16, cols = Math.max(1, Math.min(16, len - p0));
  const ok = SQ.lane !== "nud" || (SQX.micro && SQX.micro.length);
  return `<div class="sqlw"><div class="sqlh"><div class="seg">${LANES.map(([k, t]) => `<button data-sqlane="${k}" aria-pressed="${SQ.lane === k}">${t}</button>`).join("")}</div>
      <span class="c">${LANE_HINT[SQ.lane]}. Arrastra el dedo por encima.</span></div>
    ${ok ? `<div class="sqlane${SQ.lane === "nud" ? " bi" : ""}" data-sqdraw="1" style="--cols:${cols}">${Array.from({ length: cols }, (_, j) => sqLaneCell(p0 + j)).join("")}</div>`
      : `<p class="pce">El FM-1 no contestó a los nudges (MICRO_GET). ${M.mock ? "" : "Puede que este firmware no los tenga."}</p>`}</div>`;
}

/* ---- el paso elegido, además de lo del básico: nudge, fill y locks ---- */
function sqDetail() {
  const i = SQ.sel, f = sqFill(i), m = SQX.micro && SQX.micro.length ? SQX.micro[i] || 0 : null;
  const locks = (SQX.locks || []).filter((l) => l.step === i), last = typeof LOG !== "undefined" && LOG.find((e) => !e.s && desc(0, e.id));
  return `<div class="sqd">
    <div class="sqdi"><small>NUDGE</small><b class="num">${m == null ? "—" : (m > 0 ? "+" : "") + m}<small>/64</small></b></div>
    <div class="sqdi"><small>FILL</small><div class="seg">${["Normal", "Solo con fill", "Sin fill"].map((t, k) => `<button data-sqfill="${k}" aria-pressed="${f === k}"${SQX.fill ? "" : " disabled"}>${t}</button>`).join("")}</div></div>
    <div class="sqdl"><small>LOCKS ${SQX.locks ? `<span class="num">${locks.length}</span>` : ""}</small><div class="lks">
      ${locks.map((l) => { const d = desc(0, l.param); return `<button class="lk" data-sqlock="${l.param}">${esc(d ? d.label : "#" + l.param)} <b class="num">${d ? esc(fmtValue(d, l.value).join("")) : l.value}</b><span class="x">✕</span></button>`; }).join("")}
      ${SQX.locks ? (last ? `<button class="sqk" data-sqop="lockadd" data-id="${last.id}">+ Lock ${esc(desc(0, last.id).label)}</button>` : `<span class="c">Mueve un parámetro del sonido y vuelve: se fija aquí su valor para este paso.</span>`) : `<span class="c">El FM-1 no contestó a los locks.</span>`}</div></div>
  </div>`;
}

/* ---- patrones guardados en la tablet ---- */
const LIB_KEY = "clipper.patrones";
const libGet = () => { try { return JSON.parse(localStorage.getItem(LIB_KEY) || "[]"); } catch (e) { return []; } };
const libPut = (a) => { try { localStorage.setItem(LIB_KEY, JSON.stringify(a)); return true; } catch (e) { return false; } };
function sqLib() {
  const L = libGet();
  return `${sqGen()}<div class="sqlib"><div class="sqlh"><b>Patrones en esta tablet</b><span class="sqsep"></span>
      <button class="sqk" data-sqop="libsave">Guardar este</button></div>
    ${L.length ? `<div class="lib">${L.map((p, k) => `<div class="lbi"><b>${esc(p.name)}</b><small class="num">${p.len} pasos</small>
        <button class="sqk" data-sqop="libload" data-n="${k}">Cargar</button><button class="sqk" data-sqop="libdel" data-n="${k}">Borrar</button></div>`).join("")}</div>`
      : `<p class="pce">Aún no hay patrones guardados aquí. «Guardar este» copia el patrón del FM-1 a la tablet, para volver a él cuando quieras.</p>`}</div>`;
}

/* ---- lo de dentro del bloque NOTES, según el modo ---- */
function sqFullBody(len, cells) {
  if (!SQX.loaded) sqxLoad();
  return `${sqTools(len)}${SQ.view === "roll" ? sqRoll(len) : `<div class="sqg" role="group" aria-label="Pasos">${cells}</div>`}${sqLanes(len)}`;
}
function sqFullPaint() {
  if (!SQ.full) return; const len = sqLen();
  const lw = document.querySelector(".sqlw"); if (lw) lw.outerHTML = sqLanes(len);
  const ro = document.querySelector(".sqroll"); if (ro) ro.outerHTML = sqRoll(len);
}

/* ---- las operaciones de rango: se calcula el resultado y se manda solo lo que cambia (STEP_SET por paso) ---- */
function sqApply(a, arr) { arr.forEach((st, k) => { const i = a + k, cur = SQ.steps[i]; if (cur && JSON.stringify(cur) !== JSON.stringify(st)) sqSet(i, st); }); }
function sqOp(op, d, el) {
  const len = sqLen(), [a, b] = sqRange(), arr = SQ.steps.slice(a, b + 1).map(cpStep), on = (s) => sqOn(s);
  switch (op) {
    case "ext": SQ.ext = !SQ.ext; break;
    case "all": SQ.r0 = 0; SQ.r1 = len - 1; SQ.ext = false; break;
    case "copy": SQ.clip = arr; toast(-1, `Copiados <b class="num">${arr.length}</b> pasos`); break;
    case "paste": if (SQ.clip) sqApply(a, SQ.clip.slice(0, len - a).map(cpStep)); break;
    case "clear": if (el.dataset.arm !== "1") { arm(el, "Borrar", "¿Seguro?"); return; }   /* borra pasos: segundo toque con ⚠ */
      disarm(el, "Borrar"); sqApply(a, arr.map((s) => ({ ...sqEmpty(s), notes: [0, 0, 0, 0] }))); break;
    case "tr": sqApply(a, arr.map((s) => on(s) ? { ...s, notes: s.notes.map((x, k) => k < s.n ? Math.max(0, Math.min(127, x + d)) : x) } : s)); break;
    case "shift": if (arr.length > 1) sqApply(a, d > 0 ? [arr[arr.length - 1], ...arr.slice(0, -1)] : [...arr.slice(1), arr[0]]); break;
    case "rev": sqApply(a, arr.slice().reverse()); break;
    case "dbl": {
      const n = arr.length, dst = b + 1, room = Math.min(n, M.info.nstep - dst);
      if (room <= 0) { toast(-1, "No caben más pasos"); break; }
      sqApply(dst, arr.slice(0, room)); const id = sqLenId();
      if (id >= 0 && dst + room > len) setVal(0, id, Math.min(M.info.nstep, dst + room));
      SQ.r0 = a; SQ.r1 = dst + room - 1; break;
    }
    case "acc": case "slide": {
      const bit = op === "acc" ? SF_ACC : SF_SLIDE, all = arr.filter(on).every((s) => s.flags & bit);
      sqApply(a, arr.map((s) => on(s) ? { ...s, flags: all ? s.flags & ~bit : s.flags | bit } : s)); break;
    }
    case "oct": SQ.oct = Math.max(0, Math.min(115, (SQ.oct || 48) + d)); break;
    case "lockadd": {
      const id = +el.dataset.id;
      rq(C_LOCK_SET, [SQX.tr & 127, SQ.sel & 127, id & 127, ...v14(val(0, id))], { quiet: true, retries: 0, timeout: 900 })
        .then(() => { SQX.locks = (SQX.locks || []).filter((l) => !(l.step === SQ.sel && l.param === id)).concat({ step: SQ.sel, param: id, value: val(0, id) }); toast(-1, `Lock en el paso <b class="num">${SQ.sel + 1}</b>`); renderWork(); })
        .catch(() => toast(-1, "El FM-1 no contestó")); return;
    }
    case "libsave": {
      const L = libGet(), t = new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
      L.push({ name: `P${String(L.length + 1).padStart(2, "0")} · ${t}`, len, steps: SQ.steps.slice(0, len).map(cpStep) });
      toast(-1, libPut(L) ? "Patrón guardado en la tablet" : "No pude guardar en la tablet"); break;
    }
    case "libload": case "libdel": {
      if (el.dataset.arm !== "1") { arm(el, op === "libload" ? "Cargar" : "Borrar", "¿Seguro?"); return; }
      const L = libGet(), p = L[+el.dataset.n]; if (!p) break;
      if (op === "libdel") { L.splice(+el.dataset.n, 1); libPut(L); break; }
      const id = sqLenId(); if (id >= 0 && p.len !== len) setVal(0, id, p.len);
      sqApply(0, p.steps.map(cpStep)); toast(-1, `Cargado <b>${esc(p.name)}</b>`); break;
    }
  }
  renderWork();
}
function sqRollTap(i, p) {
  const st = SQ.steps[i]; if (!st) return;
  if (sqOn(st)) {
    const ns = st.notes.slice(0, st.n), k = ns.indexOf(p);
    if (k >= 0) { ns.splice(k, 1); sqSet(i, ns.length ? { n: ns.length, notes: [...ns, 0, 0, 0, 0].slice(0, 4) } : sqEmpty(st)); }
    else if (ns.length < 4) { ns.push(p); sqSet(i, { n: ns.length, notes: [...ns, 0, 0, 0, 0].slice(0, 4) }); }
    else sqSet(i, { notes: [p, ...ns.slice(1)] });
  } else sqSet(i, { n: 1, notes: [p, 0, 0, 0], time: ST_NOTE, vel: st.vel || 100 });
  SQ.last = p; const prev = SQ.sel; SQ.sel = i; SQ.r0 = SQ.r1 = i; sqCursorTo(i); sqPaint(prev); sqPaint(i);
}

/* ---- los toques del modo completo (fase de captura: van antes que los del básico) ---- */
document.addEventListener("click", (e) => {
  const t = e.target;
  const bv = t.closest("[data-sqbv]"); if (bv) { SQ.bview = bv.dataset.sqbv; try { localStorage.setItem("clipper.sqbv", SQ.bview); } catch (er) { /* (comfort) */ } renderWork(); return; }
  if (!SQ.full) { const pr = t.closest("[data-pr]"); if (pr) { sqRollTap(+pr.dataset.pr, +pr.dataset.p); if (SQ.bview === "midi") renderWork(); return; } }
  const mode = t.closest("[data-sqmode]");
  if (mode) { SQ.full = mode.dataset.sqmode === "c"; sqPrefSave(); renderWork(); return; }
  if (!SQ.full || (S.folder !== "SEQ" && S.folder !== "ESTUDIO")) return;
  const stepB = t.closest("[data-sq]");
  if (stepB && SQ.ext) { SQ.r1 = +stepB.dataset.sq; SQ.ext = false; e.stopPropagation(); renderWork(); return; }
  const v = t.closest("[data-sqview]"); if (v) { SQ.view = v.dataset.sqview; sqPrefSave(); renderWork(); return; }
  const ln = t.closest("[data-sqlane]"); if (ln) { SQ.lane = ln.dataset.sqlane; sqPrefSave(); renderWork(); return; }
  const pg = t.closest("[data-sqpg]"); if (pg) { SQ.page = +pg.dataset.sqpg; renderWork(); return; }
  const pr = t.closest("[data-pr]"); if (pr) { sqRollTap(+pr.dataset.pr, +pr.dataset.p); return; }
  const op = t.closest("[data-sqop]"); if (op && !op.disabled) { sqOp(op.dataset.sqop, +op.dataset.d || 0, op); return; }
  const fl = t.closest("[data-sqfill]");
  if (fl && !fl.disabled) {
    const c = +fl.dataset.sqfill, i = SQ.sel;
    rq(C_FILL_SET, [SQX.tr & 127, i & 127, c], { quiet: true, retries: 0, timeout: 900 }).then(() => {
      const k = i >> 2, sh = 2 * (i & 3); SQX.fill[k] = (SQX.fill[k] & ~(3 << sh)) | (c << sh); renderWork(); }).catch(() => toast(-1, "El FM-1 no contestó"));
    return;
  }
  const lk = t.closest("[data-sqlock]");
  if (lk) {
    if (lk.dataset.arm !== "1") { lk.dataset.arm = "1"; lk.dataset.armAt = performance.now(); lk.classList.add("arm"); return; }
    if (performance.now() - +lk.dataset.armAt < 400) return;
    const id = +lk.dataset.sqlock, i = SQ.sel;
    rq(C_LOCK_SET, [SQX.tr & 127, i & 127, id & 127], { quiet: true, retries: 0, timeout: 900 })
      .then(() => { SQX.locks = SQX.locks.filter((l) => !(l.step === i && l.param === id)); renderWork(); }).catch(() => toast(-1, "El FM-1 no contestó"));
  }
}, true);

