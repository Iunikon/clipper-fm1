/* ------------------------------------------------------------------ pages --- */
/* A folder as the FM-1 lays it out: its pages in the device's order, one line each, with as many columns as the page
   has knobs (3 knobs, 3 columns); a page the device draws (or one whose shape helps: DLY, REVERB, FILTER, EQ) has its
   graph above its line, wide. The synth pages (LAYER, MORPH, RANDOM, UNDO, MATRIX, MOD SEQ, TUNING, MIDI…) are scope 3:
   their X_* values (Live 109..111), turned here or by the knobs on the device */
const PGRAPH = { ENV: "env", "ENV 2": "env", LFO: "lfo", "LFO 2": "lfo", "LFO 3": "lfo", FX: "meters", FILTER: "filt", DLY: "echo",
  REVERB: "verb", "EQ+COMP": "eq", MACROS: "meters", SEL: "scale", "SEL 2": "scale", LAYER: "layer", "LAYER 2": "layer",
  MORPH: "morph", UNDO: "hist", MATRIX: "matrix", "MOD SEQ": "mseq" };
const ESTUDIO_ONLY = new Set(["TRACKS", "SONG", "DRUMS", "SLICER", "OP", "OP 2", "OP ENV", "ROUTE", "FMX", "STORE", "PRESETS", "USER", "FAVS", "PROJECT", "TOOLS", "NOTES", "REV/CHO"]);

function pageCells(p) { return p.ids.map((id, k) => ({ id, k })).filter((x) => x.id < 127 && desc(p.s, x.id)); }
function pageRow(p) {
  const kind = PGRAPH[p.title], cells = pageCells(p), lv = devLive(p.folder, p.title);
  if (!cells.length && !kind) return "";
  const g = kind ? `<div class="pgr g-${kind}${kind === "env" ? " tall" : ""}">${graphPanel(p, kind)}</div>` : "";
  return `<section class="pgx${lv ? " dev" : ""}" data-title="${esc(p.title)}">
    <header class="pgh"><h3>${esc(p.title)}</h3>${lv ? `<span class="live2">En el sinte</span>` : ""}</header>${g}
    ${cells.length ? `<div class="prow" style="--n:${cells.length}">${cells.map(({ id, k }) => tileP(p.s, id, k, p.title, false)).join("")}</div>` : ""}</section>`;
}
function folderView(folder) {
  const pages = LAYOUT.filter((x) => x.folder === folder && !ESTUDIO_ONLY.has(x.title)).map((x) => ({ title: x.title, folder, s: x.scope, ids: x.ids }));
  const seen = new Set(), uniq = pages.filter((p) => !seen.has(p.title) && seen.add(p.title));   /* (FILTER, MASTER twice: the drum track's) */
  return `<div class="pgs">${uniq.map(pageRow).join("")}</div>`;
}

/* ---- the graphs of those pages, as the device draws them */
function graphPanel(p, kind) {
  if (kind === "scale") return gScale(p);
  if (kind === "layer") return gLayer();
  if (kind === "morph") return gMorph();
  if (kind === "hist") return gHist();
  if (kind === "matrix") return gMatrix();
  if (kind === "mseq") return gMseq();
  return `<div class="gr" data-gr="${kind}" data-s="${p.s}" data-ids="${p.ids.join(",")}">${graphHtml(kind, p.s, p.ids)}</div>`;
}
/* SEL: the 12 keys (graph_scale), the scale's lit, the root white; the scale's notes come with STATE */
function gScale(p) {
  const sel = LAYOUT.find((x) => x.title === "SEL"), root = sel ? val(0, sel.ids[0]) | 0 : 0, mask = M.state ? M.state.scale : 0xFFF;
  const BL = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  let h = "";
  for (let i = 0; i < 12; i++) {
    const deg = (i + 12 - root) % 12, on = (mask >> deg) & 1, c = on ? (deg === 0 ? "var(--tx)" : "var(--k1)") : "var(--line-2)", x = 6 + i * 19, y = BL[i] ? 10 : 40;
    h += `<rect x="${x}" y="${y}" width="16" height="2" fill="${c}"/><rect x="${x + 7}" y="${y}" width="2" height="40" fill="${c}"/><text x="${x + 8}" y="${y + 52}" class="gtx" fill="${on ? c : "var(--tx-3)"}">${NOTE_N[i]}</text>`;
  }
  return `<div class="gfx"><svg viewBox="0 0 240 104" preserveAspectRatio="xMidYMid meet">${h}</svg></div>`;
}
/* LAYER: the mode, the layer's sound, where each sound plays on the keys C2..C7 (graph_layer) */
function gLayer() {
  const mode = val(3, 0) | 0, snd = val(3, 1) | 0, sp = (val(3, 2) | 0) - 4, d = desc(3, 0), x = M.list[snd];
  const MN = d && d.names ? d.names : ["OFF", "LAYER", "SPLIT", "MULTI"];
  let k1 = "", k2 = "";
  for (let i = 0; i < 61; i++) {
    const n = 36 + i, on2 = mode === 1 || mode === 3 || (mode === 2 && n < sp), on1 = mode !== 2 || n >= sp;
    k1 += `<i class="${on1 ? "on" : ""}${n % 12 === 0 ? " c" : ""}"></i>`; k2 += `<i class="${on2 && mode ? "on2" : ""}${n % 12 === 0 ? " c" : ""}"></i>`;
  }
  return `<div class="gfx glay"><div class="gl1"><span class="gt">${mode ? "LAYER " + esc(MN[mode] || "") : "LAYER OFF"}</span><b>${esc(x ? x.name : "—")}</b><span class="gt">${esc(x ? (M.info.engines[x.e] || "USER") : "")}</span></div>
    <div class="keys"><span class="kl">1</span><div class="kr">${k1}</div><span class="kl k2">2</span><div class="kr">${k2}</div></div></div>`;
}
/* MORPH: A to B, where the sound is between them (graph_morph) */
function gMorph() {
  const m = (val(3, 8) | 0) / 127;
  return `<div class="gfx gmor"><span class="ab">A</span><div class="mtrk"><i style="left:${m * 100}%"></i></div><span class="ab">B</span>
    <p class="gt">SET A y SET B guardan el sonido de ahora en cada lado; MORPH va de uno a otro.</p></div>`;
}
/* UNDO: the sound's steps, the newest on top, the one playing lit (graph_hist); a tap goes there */
function gHist() {
  const d = desc(3, 41), v = val(3, 41) | 0, cmp = val(3, 42) | 0;
  if (cmp) return `<div class="gfx ghis"><p class="gt">COMPARANDO</p><b>EL SONIDO COMO SE CARGÓ</b><p class="gt">CMP EDIT: vuelven tus cambios</p></div>`;
  const n = d ? -d.min : 0, rows = [];
  for (let i = 0; i >= -n && rows.length < 7; i--) rows.push(`<button class="hrow${i === v ? " now" : ""}" data-set="3:41" data-v="${i}"><span class="num">${i === 0 ? "+0" : i}</span>${i === v ? "<b>AHORA</b>" : i === -n ? "(EL MÁS ANTIGUO)" : ""}</button>`);
  return `<div class="gfx ghis">${n ? rows.join("") : `<p class="gt">Sin pasos todavía: cada cambio del sonido es un paso.</p>`}</div>`;
}
/* MATRIX: the six slots of the selected one (graph_matrix), source > destination and amount; a tap picks the slot */
function gMatrix() {
  const sel = Math.max(1, val(3, 15) | 0) - 1, k0 = Math.floor(sel / 6) * 6, rows = [];
  for (let k = k0; k < k0 + 6; k++) {
    const id = MX[k], ds = desc(0, id), dd = desc(0, id + 1), da = desc(0, id + 2); if (!ds || !dd || !da) continue;
    const sr = val(0, id) | 0, dt = val(0, id + 1) | 0, a = val(0, id + 2) | 0, on = sr && dt && a;
    rows.push(`<button class="mrow${k === sel ? " sel" : ""}${on ? " on" : ""}" data-set="3:15" data-v="${k + 1}"><span class="num">${k + 1}</span><span>${esc(fmtValue(ds, sr)[0])}</span><span class="ar">›</span><span>${esc(fmtValue(dd, dt)[0])}</span>
      <span class="num">${esc(fmtValue(da, a).join(""))}</span><span class="mb"><i style="${a < 0 ? `right:50%;width:${-a / 64 * 50}%` : `left:50%;width:${a / 64 * 50}%`}"></i></span></button>`);
  }
  return `<div class="gfx gmat">${rows.join("")}</div>`;
}
/* MOD SEQ: the selected lane large (paint it with a finger), the four small under it (graph_mseq) */
function gMseq() {
  const v = PC.load("mseq", CE.MSEQ_GET, [0], PCP.mseq);
  if (!v || v === "…" || !v.steps) return `<div class="gfx">${pcEmpty(v && v.steps === null ? null : v, "la secuencia de modulación")}</div>`;
  const lane = Math.max(1, Math.min(4, val(3, 43) | 0)) - 1, st = Math.max(1, val(3, 44) | 0) - 1;
  const big = v.steps.slice(lane * 16, lane * 16 + 16).map((x, i) => `<div class="mss${i === st ? " cur" : ""}" data-l="${lane}" data-i="${i}" style="${mssStyle(x)}"><i></i></div>`).join("");
  const small = [0, 1, 2, 3].map((l) => `<button class="msm${l === lane ? " sel" : ""}" data-set="3:43" data-v="${l + 1}" style="--c:${KC[l]}"><span class="num">S${l + 1}</span>${v.steps.slice(l * 16, l * 16 + 16).map((x) => `<i style="${mssStyle(x)}"></i>`).join("")}</button>`).join("");
  return `<div class="gfx gmsq"><div class="msq big" data-msq="1" style="--c:${KC[lane]}">${big}</div><div class="msmall">${small}</div></div>`;
}

/* ---- the transport in the bar: PLAY (bar.beat) and REC, always in sight; a tap acts as the device's buttons */
function renderTransport() {
  const t = $("trn"); if (!t) return;
  const rec = M.rec | 0, recOn = rec & 1, armed = rec & 2, free = rec & 4, ci = rec & 8, pos = SQ.playing && SQ.pos >= 0 ? `${Math.floor(SQ.pos / 16) + 1}.${Math.floor((SQ.pos % 16) / 4) + 1}` : "";
  t.innerHTML = `<button class="tbt${SQ.playing ? " on" : ""}" data-tplay="1" aria-pressed="${SQ.playing}"><svg class="i"><use href="#i-${SQ.playing ? "stop" : "play"}"/></svg><span class="num">${SQ.playing ? pos : "PLAY"}</span></button>
    <button class="tbt rec${recOn || free ? " on" : armed || ci ? " arm" : ""}" data-trec="1" aria-pressed="${!!(recOn || armed)}"><i></i><span>${free ? "TOMA" : ci ? "CUENTA" : armed ? "ARMADO" : "REC"}</span></button>`;
  const sel2 = LAYOUT.find((x) => x.title === "SEL 2"), trn = sel2 && desc(0, sel2.ids[0]) ? val(0, sel2.ids[0]) | 0 : 0, oct = M.state ? M.state.oct | 0 : 0, bpm = desc(1, 0) ? val(1, 0) : null;
  const tb = $("tmp"); if (tb) tb.innerHTML = `${bpm != null ? `<b class="num">${bpm}</b><small>BPM</small>` : ""}${oct ? `<span class="tag2 num">OCT ${oct > 0 ? "+" : ""}${oct}</span>` : ""}${trn ? `<span class="tag2 num">TRN ${trn > 0 ? "+" : ""}${trn}</span>` : ""}`;
  const c = $("cpu"); if (c && M.state) { c.innerHTML = `CPU <b class="num">${M.state.cpu}%</b>${M.state.late ? ` LATE <b class="num">${M.state.late}</b>` : ""}`; c.classList.toggle("hot", M.state.cpu > 85 || M.state.late > 0); }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tplay],[data-trec]"); if (!b || !M.link) return;
  if (b.dataset.tplay) rq(C.TRANSPORT, [SQ.playing ? 0 : 1]).then((a) => { SQ.playing = !!a[0]; renderTransport(); }).catch(() => {});
  else rq(C.REC, [0]).then((a) => { M.state = P.state(a); M.rec = M.state.rec; renderTransport(); if (S.folder === "REC") paintRec(); }).catch(() => toast(-1, "El FM-1 no contestó"));
});

/* ---- REC: the device's REC screen. The REC button arms (stopped: the first note starts the loop; an empty project: a free
   take, its length the tempo) or records at once (playing); MODE, START and QUANT as its knobs; LEN the pattern's */
function recView() { return `<div class="recv" id="recv">${recInner()}</div>`; }
function recInner() {
  const st = M.state || { rec: M.rec | 0, mode: 0, start: 0, quant: 0, empty: 0 }, rec = st.rec | 0;
  const big = rec & 4 ? ["TOMA LIBRE", "Toca libre; REC en el siguiente compás cierra el loop y fija el tempo."] : rec & 8 ? ["CUENTA", "Un compás de clics; luego graba."]
    : rec & 1 ? ["GRABANDO", "Lo que toques entra en el patrón, cuantizado. REC otra vez para parar."] : rec & 2 ? ["ARMADO", "La primera nota que toques arranca el loop y la grabación."]
    : ["LISTO", SQ.playing ? "Está sonando: REC graba ya, encima de lo que hay." : "Parado: REC arma y espera la primera nota."];
  const lenP = LAYOUT.find((x) => x.title === "PATTERN"), lenId = lenP ? lenP.ids[0] : -1, len = lenId >= 0 ? val(0, lenId) : 16;
  const seg = (lab, op, opts, cur, dis) => `<div class="rset${dis ? " dis" : ""}"><span class="rl">${lab}</span><div class="opts">${opts.map(([t, v]) => `<button data-recset="${op}" data-v="${v}" aria-pressed="${cur === v}"${dis ? " disabled" : ""}>${t}</button>`).join("")}</div></div>`;
  return `<div class="rbig${rec & 5 ? " on" : rec & 10 ? " arm" : ""}"><b>${big[0]}</b><p>${big[1]}</p></div>
    <div class="rbtn"><button class="rrec${rec & 5 ? " on" : rec & 10 ? " arm" : ""}" data-trec="1"><i></i>${rec & 3 || rec & 4 ? "PARAR REC" : "REC"}</button>
      <button class="rplay${SQ.playing ? " on" : ""}" data-tplay="1"><svg class="i"><use href="#i-${SQ.playing ? "stop" : "play"}"/></svg>${SQ.playing ? "STOP" : "PLAY"}</button></div>
    <div class="rgrid">${seg("MODE", 1, [["FREE", 0], ["TEMPO", 1]], st.mode, !st.empty)}
      ${seg("LEN", "len", [["16", 16], ["32", 32], ["64", 64]], len, false)}
      ${seg("START", 2, [["NOTE", 0], ["COUNT", 1]], st.start, false)}
      ${seg("QUANT", 3, [["ON", 0], ["OFF", 1]], st.quant, false)}</div>
    <p class="msh">MODE solo cuenta con el proyecto vacío. Como en la pantalla REC del sinte.</p>`;
}
function paintRec() { const r = $("recv"); if (r) r.innerHTML = recInner(); }
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-recset]"); if (!b || !M.link) return;
  if (b.dataset.recset === "len") { const p = LAYOUT.find((x) => x.title === "PATTERN"); if (p) setVal(0, p.ids[0], +b.dataset.v); paintRec(); return; }
  rq(C.REC, [+b.dataset.recset, +b.dataset.v]).then((a) => { M.state = P.state(a); M.rec = M.state.rec; paintRec(); renderTransport(); }).catch(() => toast(-1, "El FM-1 no contestó"));
});

/* ---- LIVE and HOME's shortcuts: what you put there, in your order. Kept in the tablet. Items: a quick tile ("q", its
   key), any parameter ("p"), a graph ("g": filt, fx, env, lfo), an action ("a": play, rec, favnext, favprev, discard);
   w x h: 1 or 2 columns, 1 or 2 rows */
const LV_DEF = [{ t: "g", g: "filt", w: 2, h: 2 }, { t: "g", g: "fx", w: 2, h: 2 }, { t: "q", key: "0:17" }, { t: "q", key: "0:28" }, { t: "q", key: "1:0" }, { t: "q", key: "0:-1" },
  { t: "q", key: "0:23" }, { t: "q", key: "0:49" }, { t: "q", key: "0:27" }, { t: "q", key: "0:38" }];
const HM_DEF = [{ t: "a", a: "favprev" }, { t: "a", a: "favnext" }, { t: "q", key: "0:17" }, { t: "q", key: "0:-1" }];
const CFG = { live: store.get("cfg:live") || LV_DEF, home: store.get("cfg:home") || HM_DEF, edit: null, sel: -1, drag: null };
const ACT = { play: ["PLAY", "Arranca o para el patrón"], rec: ["REC", "Como el botón REC"], favnext: ["Fav. siguiente", ""], favprev: ["Fav. anterior", ""], discard: ["Descartar", "Lo editado vuelve a como se cargó"] };
const GITEM = { filt: ["Filtro", "FILTER", "filt", 0, [50, 127, 127, 127]], fx: ["Efectos", "FX", "meters", 0, [33, 34, 35, 36]], env: ["ENV", "ENV", "env", 0, [1, 2, 3, 4]], lfo: ["LFO", "LFO", "lfo", 0, [9, 10, 11, 12]] };
function cfgSave(which) { store.set("cfg:" + which, CFG[which]); }
function itemHtml(it, i, which) {
  const ed = CFG.edit === which, w = it.w || 1, h = it.h || 1, at = `style="grid-column:span ${w};grid-row:span ${h}" data-ci="${i}"`;
  let body = "";
  if (it.t === "q") { const q = QSPEC.get(it.key); body = q ? tile(q) : ""; }
  else if (it.t === "p") body = desc(it.s, it.id) ? tileP(it.s, it.id, it.k || 0, "", false) : "";
  else if (it.t === "g") { const g = GITEM[it.g]; body = g ? module({ title: g[1], folder: g[1] === "FILTER" || g[1] === "FX" ? "FX" : g[1], s: g[3], ids: g[4] }, g[2], { name: g[0], toggles: it.g === "fx", fxedit: it.g === "fx" }) : ""; }
  else if (it.t === "a") { const a = ACT[it.a] || ["?", ""], nx = it.a === "favnext" ? M.favs[(M.favCur + 1) % Math.max(1, M.favs.length)] : it.a === "favprev" ? M.favs[(M.favCur - 1 + M.favs.length) % Math.max(1, M.favs.length)] : null;
    body = `<button class="act" data-act="${it.a}"><b>${a[0]}</b><span class="v num">${it.a === "favnext" ? "›" : it.a === "favprev" ? "‹" : it.a === "play" ? (SQ.playing ? "■" : "▶") : it.a === "rec" ? "●" : "↺"}</span><span class="s">${esc(nx ? nx.name : a[1])}</span></button>`; }
  return `<div class="ci${ed ? " ed" : ""}${CFG.sel === i && ed ? " sel" : ""}" ${at}>${body}${ed ? `<button class="cx" data-cx="${i}" aria-label="Quitar">×</button><button class="csz" data-csz="${i}">${w}×${h}</button>` : ""}</div>`;
}
function cfgGrid(which, cls) {
  const items = CFG[which];
  return `<div class="cg ${cls}${CFG.edit === which ? " editing" : ""}" data-cg="${which}">${items.map((it, i) => itemHtml(it, i, which)).join("")}${CFG.edit === which ? `<button class="ci cadd" data-cadd="${which}">+ Añadir</button>` : ""}</div>`;
}
function catalog(which) {
  const fold = CFG.catF || "FX", pages = LAYOUT.filter((x) => x.folder === fold && x.scope !== 2 && !ESTUDIO_ONLY.has(x.title));
  const chip = (lab, data) => `<button class="chip" ${data}>${esc(lab)}</button>`;
  return `<aside class="cat"><h2>Añadir</h2>
    <h3>ACCIONES</h3><div class="chips">${Object.entries(ACT).map(([k, a]) => chip(a[0], `data-cnew='${JSON.stringify({ t: "a", a: k })}'`)).join("")}</div>
    <h3>RÁPIDOS</h3><div class="chips">${[...QSPEC.values()].map((q) => chip(q.name, `data-cnew='${JSON.stringify({ t: "q", key: qkey(q) })}'`)).join("")}</div>
    <h3>GRÁFICAS</h3><div class="chips">${Object.entries(GITEM).map(([k, g]) => chip(g[0], `data-cnew='${JSON.stringify({ t: "g", g: k, w: 2, h: 2 })}'`)).join("")}</div>
    <h3>CUALQUIER PARÁMETRO</h3><div class="chips">${["ENV", "LFO", "FX", "SEL", "EDIT", "ARP", "SEQ", "GLO"].map((f) => `<button class="chip${f === fold ? " sel" : ""}" data-catf="${f}">${f}</button>`).join("")}</div>
    <div class="catp">${pages.map((p) => `<div><small>${esc(p.title)}</small><div class="chips">${pageCells(p).map(({ id, k }) => chip(desc(p.s, id).label, `data-cnew='${JSON.stringify({ t: "p", s: p.s, id, k })}'`)).join("")}</div></div>`).join("")}</div></aside>`;
}
function cfgView(which, title) {
  const ed = CFG.edit === which;
  return `<div class="cfgw${ed ? " editing" : ""}"><div class="qhead"><h2>${title}</h2>${ed ? `<button class="more" data-creset="${which}">Restablecer</button><button class="more pri" data-cedit="">Listo</button>` : `<button class="more" data-cedit="${which}">Editar</button>`}</div>
    ${cfgGrid(which, which === "live" ? "lg4" : "lg4 short")}${ed ? `<p class="msh">Arrastra para cambiar el orden; × quita; el botón de tamaño cambia entre 1×1, 2×1, 1×2 y 2×2.</p>` : ""}</div>${ed ? catalog(which) : ""}`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-cedit],[data-cx],[data-csz],[data-cnew],[data-catf],[data-creset],[data-act],[data-fxedit]"); if (!b) return;
  const which = CFG.edit;
  if (b.dataset.cedit !== undefined) { CFG.edit = b.dataset.cedit || null; renderWork(); return; }
  if (b.dataset.creset) { CFG[b.dataset.creset] = JSON.parse(JSON.stringify(b.dataset.creset === "live" ? LV_DEF : HM_DEF)); cfgSave(b.dataset.creset); renderWork(); return; }
  if (b.dataset.cx) { CFG[which].splice(+b.dataset.cx, 1); cfgSave(which); renderWork(); return; }
  if (b.dataset.csz) { const it = CFG[which][+b.dataset.csz], S4 = [[1, 1], [2, 1], [1, 2], [2, 2]], k = S4.findIndex(([w, h]) => w === (it.w || 1) && h === (it.h || 1));
    [it.w, it.h] = S4[(k + 1) % 4]; cfgSave(which); renderWork(); return; }
  if (b.dataset.cnew) { CFG[which].push(JSON.parse(b.dataset.cnew)); cfgSave(which); renderWork(); toast(-1, "Añadido"); return; }
  if (b.dataset.catf) { CFG.catF = b.dataset.catf; renderWork(); return; }
  if (b.dataset.fxedit) { S.folder = "FX"; renderNav(); renderWork(); setTimeout(() => document.querySelector(`#edit [data-title="${CSS.escape(b.dataset.fxedit)}"]`)?.scrollIntoView({ block: "start" }), 30); return; }
  if (b.dataset.act && !CFG.edit) {
    const a = b.dataset.act, n = M.favs.length;
    if (a === "play") rq(C.TRANSPORT, [SQ.playing ? 0 : 1]).then((r) => { SQ.playing = !!r[0]; renderTransport(); renderWork(); }).catch(() => {});
    else if (a === "rec") document.querySelector("[data-trec]")?.click();
    else if ((a === "favnext" || a === "favprev") && n) favGo(M.favCur < 0 ? (a === "favnext" ? 0 : n - 1) : (M.favCur + (a === "favnext" ? 1 : -1) + n) % n);
    else if (a === "discard") document.querySelector("[data-discard]")?.click();
  }
});
/* reorder: in edit, drag an item over another */
document.addEventListener("pointerdown", (e) => {
  const c = e.target.closest(".cg.editing .ci[data-ci]"); if (!c || e.target.closest("[data-cx],[data-csz]")) return;
  CFG.drag = { from: +c.dataset.ci, which: c.closest(".cg").dataset.cg, el: c, pid: e.pointerId }; c.classList.add("drag"); e.preventDefault();
}, true);
document.addEventListener("pointermove", (e) => {
  const d = CFG.drag; if (!d) return;
  const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(".cg.editing .ci[data-ci]"); if (!over) return;
  const to = +over.dataset.ci; if (to === d.from) return;
  const arr = CFG[d.which], [it] = arr.splice(d.from, 1); arr.splice(to, 0, it); d.from = to; cfgSave(d.which); renderWork();
  const n = document.querySelector(`.cg.editing .ci[data-ci="${to}"]`); if (n) { n.classList.add("drag"); d.el = n; }
}, true);
document.addEventListener("pointerup", () => { if (CFG.drag) { CFG.drag = null; document.querySelectorAll(".ci.drag").forEach((x) => x.classList.remove("drag")); } }, true);

/* ---- HOME: the favourites at hand (16 pads), and a few shortcuts you choose */
function homeView() {
  const pads = Array.from({ length: 16 }, (_, i) => { const f = M.favs[i];
    return f ? `<button class="fpad${i === M.favCur ? " on" : ""}" data-favgo="${i}"><span class="i num">${String(i + 1).padStart(2, "0")}</span><b>${esc(f.name)}</b><small><span class="k">${esc(f.kind)}</span> <span class="e">${esc(M.info.engines[f.e] || "USER")}</span></small></button>`
      : `<div class="fpad free"><span class="i num">${String(i + 1).padStart(2, "0")}</span><small>Libre</small></div>`; }).join("");
  const knobs = module({ title: "HOME", folder: "HOME", s: 0, ids: M.homeIds }, "arcs", { cls: "hk", bare: true, nolive: true });   /* (the device's HOME four: kept) */
  return `<div class="homev"><div class="qhead"><h2>Favoritos</h2><span class="c num">${M.favs.length}/16</span></div><div class="fpads">${pads}</div>
    <div class="hrow2">${knobs}<div class="hacc">${cfgView("home", "Accesos")}</div></div></div>`;
}
