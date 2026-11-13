/* -------------------------------------------------------------------- seq --- */
/* SEQ > NOTES, here: the selected part's pattern as a grid of steps (16 a row, as many rows as LEN needs), the step
   playing lit (PLAY, pushed while it plays), PLAY / STOP (TRANSPORT). A tap on an empty step puts a note there (the
   last one used) and picks it; a tap on the picked one empties it. The picked step's editor under the grid: its note,
   velocity, ACC, SLIDE, TIE, ratchets. STEP_GET / STEP_SET as editor.html; STEP_CHANGED brings a step changed on the
   device again */
const NOTE_N = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const noteName = (n) => NOTE_N[n % 12] + (Math.floor(n / 12) - 1);
const ST_NOTE = 0, ST_TIE = 1, ST_REST = 2, SF_ACC = 1, SF_SLIDE = 2;
const SQ = { steps: [], loaded: false, loading: null, sel: 0, playing: false, pos: -1, last: 60 };
const sqLenId = () => { const p = LAYOUT.find((x) => x.title === "PATTERN"); return p ? p.ids[0] : -1; };
const sqLen = () => { const id = sqLenId(); return id >= 0 && desc(0, id) ? Math.max(1, val(0, id)) : 16; };
const sqOn = (st) => st && st.time === ST_NOTE && st.n > 0;

async function sqLoad() {
  if (SQ.loading) return SQ.loading;
  SQ.loading = (async () => {
    try {
      const n = M.info.nstep, out = [];
      for (let i = 0; i < n; i++) out.push(P.step(await rq(C.STEP_GET, [i])));
      SQ.steps = out; SQ.loaded = true;
      const lastOn = out.slice(0, sqLen()).filter(sqOn).pop(); if (lastOn) SQ.last = lastOn.notes[0];   /* (a new note: the pattern's) */
      const p = await rq(C.PLAY); sqPlayFrom(p);
    } catch (e) { /* the next visit asks again */ }
    SQ.loading = null;
    if (S.folder === "SEQ" || S.folder === "ESTUDIO") renderWork();
  })();
  return SQ.loading;
}
function sqPlayFrom(a) { SQ.playing = !!a[0]; SQ.pos = SQ.playing ? a[1] | (a[2] << 7) : -1; }
function sqOnPlay(a) {
  sqPlayFrom(a);
  document.querySelectorAll(".sq.ph").forEach((x) => x.classList.remove("ph"));
  if (SQ.playing) document.querySelector(`.sq[data-sq="${SQ.pos}"]`)?.classList.add("ph");
  const b = document.querySelector("[data-sqplay]"); if (b) sqPlayBtn(b);
}
const sqPlayInner = () => (SQ.playing ? `<svg class="i"><use href="#i-stop"/></svg>STOP` : `<svg class="i"><use href="#i-play"/></svg>PLAY`);
function sqPlayBtn(b) { b.classList.toggle("on", SQ.playing); b.setAttribute("aria-pressed", SQ.playing); b.innerHTML = sqPlayInner(); }
async function sqStepChanged(i) {
  if (!SQ.loaded || i >= SQ.steps.length) return;
  try { SQ.steps[i] = P.step(await rq(C.STEP_GET, [i])); sqPaint(i); } catch (e) { /* (a RELOAD reads them all) */ }
}

/* a step to the device: the whole of it, the reply is what it keeps */
function sqSet(i, patch) {
  const st = { ...SQ.steps[i], ...patch, notes: (patch.notes || SQ.steps[i].notes).slice() };
  SQ.steps[i] = st; sqPaint(i);
  if (sqOn(st)) SQ.last = st.notes[0];
  const lvl = st.lvl | 0, rat = st.rat | 0;
  rq(C.STEP_SET, [i, st.n, ...st.notes.map((x) => x & 127), st.time, st.flags & 3, st.vel & 127, lvl & 127, ((lvl >> 7) & 1) | (((rat >> 7) & 1) << 1), rat & 127], { key: "step:" + i })
    .then((a) => { SQ.steps[i] = P.step(a); sqPaint(i); }).catch(() => {});
}
const sqEmpty = (st) => ({ n: 0, notes: [0, 0, 0, 0], time: ST_REST, flags: 0, vel: st ? st.vel : 100, lvl: 0, rat: 0 });

function sqCell(i, len) {
  const st = SQ.steps[i] || {}, on = sqOn(st), tie = st.time === ST_TIE;
  return `<button class="sq${on ? " on" : ""}${tie ? " tie" : ""}${i >= len ? " out" : ""}${i === SQ.sel ? " sel" : ""}${SQ.playing && SQ.pos === i ? " ph" : ""}${i % 4 === 0 ? " beat" : ""}${SQ.full && inRange(i) ? " rg" : ""}"
    data-sq="${i}" style="--v:${(st.vel | 0) / 127}" aria-label="Paso ${i + 1}: ${on ? noteName(st.notes[0]) : tie ? "ligado" : "vacío"}" aria-pressed="${i === SQ.sel}">
    <span class="si num">${i + 1}</span>${on ? `<span class="sn num">${noteName(st.notes[0])}</span>${st.n > 1 ? `<span class="ch num">+${st.n - 1}</span>` : ""}` : tie ? `<span class="sn num">—</span>` : ""}
    ${on ? `<span class="sv"></span>` : ""}${on && st.flags & SF_ACC ? `<i class="ac"></i>` : ""}${on && st.flags & SF_SLIDE ? `<i class="sl"></i>` : ""}${sqMarks(i)}</button>`;
}
function sqEditor() { const h = sqEditorBase(); return SQ.full && h ? h.replace(/<\/div>\s*$/, sqDetail() + "</div>") : h; }
function sqEditorBase() {
  const i = SQ.sel, st = SQ.steps[i]; if (!st) return "";
  const on = sqOn(st), tie = st.time === ST_TIE, n = on ? st.notes[0] : SQ.last, pc = n % 12, rat = (st.rat | 0) & 3;
  const tg = (k, lab, act) => `<button class="sqt2" data-sqf="${k}" aria-pressed="${act}">${lab}</button>`;
  return `<div class="sqe">
    <div class="sqh"><span class="c">Paso</span><b class="num">${i + 1}</b><span class="st">${on ? (st.n > 1 ? `Acorde de ${st.n} notas` : "Nota") : tie ? "Ligado al anterior" : "Vacío"}</span></div>
    ${on ? `<div class="sqn"><span class="nv num">${noteName(n)}</span>
      <div class="nud">${[-12, -1, 1, 12].map((d) => `<button data-sqd="${d}">${d > 0 ? "+" : "−"}${Math.abs(d)}</button>`).join("")}</div>
      <div class="pcs" role="radiogroup" aria-label="Nota">${NOTE_N.map((x, k) => `<button role="radio" aria-checked="${k === pc}" data-sqpc="${k}" class="${x.length > 1 ? "blk" : ""}">${x}</button>`).join("")}</div></div>
    <div class="sqx">
      <div class="sqvel" data-sqvel="1" role="slider" aria-label="Velocidad" aria-valuenow="${st.vel}" aria-valuemin="0" aria-valuemax="127" tabindex="0" style="--v:${st.vel / 127}"><span class="l">VEL</span><span class="v num">${st.vel}</span><span class="f"></span></div>
      ${tg("acc", "ACC", !!(st.flags & SF_ACC))}${tg("slide", "SLIDE", !!(st.flags & SF_SLIDE))}
      <div class="rat" role="radiogroup" aria-label="Ratchet">${[0, 1, 2, 3].map((r) => `<button role="radio" aria-checked="${r === rat}" data-sqr="${r}">x${r + 1}</button>`).join("")}</div>
      <button class="sqt2 del" data-sqf="rest">Vaciar</button></div>`
    : `<div class="sqx"><button class="btn pri" data-sqf="note">Poner ${noteName(SQ.last)}</button>${i > 0 ? tg("tie", "Ligar al anterior", tie) : ""}${tie ? `<button class="sqt2 del" data-sqf="rest">Vaciar</button>` : ""}</div>`}
  </div>`;
}
function seqBlock() {
  if (!SQ.loaded) { sqLoad(); return `<section class="blk"><header class="bh"><h2><svg class="i"><use href="#i-seq"/></svg>NOTES</h2></header><p class="sqw">Leyendo el patrón del FM-1…</p></section>`; }
  const len = sqLen(), rows = Math.ceil(Math.min(len, SQ.steps.length) / 16), cells = [];
  for (let i = 0; i < rows * 16 && i < SQ.steps.length; i++) cells.push(sqCell(i, len));
  const lv = M.page && !M.page.home && M.page.title === "NOTES";
  return `<section class="blk sqb${lv ? " dev" : ""}" data-title="NOTES"><header class="bh"><h2><svg class="i"><use href="#i-seq"/></svg>NOTES</h2>
      <span class="c num">${len} pasos</span>${S.folder === "SEQ" ? `<div class="seg sqmd" role="group" aria-label="Modo"><button data-sqm="adv" aria-pressed="${SQ.full}">Avanzado</button><button data-sqm="steps" aria-pressed="${!SQ.full}">Pasos</button></div>` : ""}${SQ.full ? "" : `<div class="seg sqvw" role="group" aria-label="Vista"><button data-sqbv="grid" aria-pressed="${SQ.bview !== "midi"}">Pasos</button><button data-sqbv="midi" aria-pressed="${SQ.bview === "midi"}">MIDI</button></div>`}<button class="sqp${SQ.playing ? " on" : ""}" data-sqplay="1" aria-pressed="${SQ.playing}">${sqPlayInner()}</button></header>
    ${SQ.full ? sqFullBody(len, cells.join("")) : SQ.bview === "midi" ? sqMidi(len) : `<div class="sqg" role="group" aria-label="Pasos">${cells.join("")}</div>`}${sqEditor()}${SQ.full ? sqLib() : ""}</section>`;
}
/* NOTES' MIDI view: the whole pattern as a piano roll, every note of it in sight (its range and a fifth around); a tap
   puts or takes a note there, as the roll of the advanced sequencer */
function sqMidi(len) {
  const ns = SQ.steps.slice(0, len).flatMap((st) => (sqOn(st) ? st.notes.slice(0, st.n) : []));
  let lo = ns.length ? Math.min(...ns) : SQ.last - 6, hi = ns.length ? Math.max(...ns) : SQ.last + 6;
  lo = Math.max(0, lo - 5); hi = Math.min(127, Math.max(hi + 5, lo + 23));
  const rows = [];
  for (let p = hi; p >= lo; p--) {
    const bk = NOTE_N[p % 12].length > 1;
    rows.push(`<div class="mr${bk ? " bk" : ""}${p % 12 === 0 ? " c" : ""}"><span class="mn num">${p % 12 === 0 || p === hi || p === lo ? noteName(p) : ""}</span>${Array.from({ length: len }, (_, i) => {
      const st = SQ.steps[i], on = sqOn(st) && st.notes.slice(0, st.n).includes(p), tie = st && st.time === ST_TIE && sqOn(SQ.steps[i - 1] || null) && SQ.steps[i - 1].notes.slice(0, SQ.steps[i - 1].n).includes(p);
      return `<button class="mc${on ? " on" : tie ? " tie" : ""}${i % 4 === 0 ? " beat" : ""}${i === SQ.sel ? " sel" : ""}${SQ.playing && SQ.pos === i ? " ph" : ""}" data-pr="${i}" data-p="${p}" aria-label="${noteName(p)}, paso ${i + 1}"></button>`; }).join("")}</div>`);
  }
  return `<div class="sqmidi" style="--cols:${len}"><div class="mhd"><span></span>${Array.from({ length: len }, (_, i) => `<span class="num">${i % 4 === 0 ? i + 1 : ""}</span>`).join("")}</div>${rows.join("")}</div>`;
}
function sqPaint(i) {
  const el = document.querySelector(`.sq[data-sq="${i}"]`); if (el) el.outerHTML = sqCell(i, sqLen());
  if (i === SQ.sel) { const e = document.querySelector(".sqe"); if (e) e.outerHTML = sqEditor(); }
  sqFullPaint();
}
function sqPick(i) {
  const prev = SQ.sel; SQ.sel = i; SQ.r0 = SQ.r1 = i;
  if (SQ.full) { SQ.page = Math.floor(i / 16); renderWork(); return; }
  sqPaint(prev); sqPaint(i);
}

