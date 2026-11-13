/* ---- LIVE and HOME's shortcuts: what you put there, in your order. Kept in the tablet. Items: a quick tile ("q", its
   key), any parameter ("p"), a graph ("g": filt, fx, env, lfo), an action ("a": play, rec, favnext, favprev, discard);
   w x h: 1 or 2 columns, 1 or 2 rows */
const LV_DEF = [{ t: "g", g: "filt", w: 2, h: 2 }, { t: "g", g: "fx", w: 2, h: 2 }, { t: "q", key: "0:17" }, { t: "q", key: "0:28" }, { t: "q", key: "1:0" }, { t: "q", key: "0:-1" },
  { t: "q", key: "0:23" }, { t: "q", key: "0:49" }, { t: "q", key: "0:27" }, { t: "q", key: "0:38" }];
const HM_DEF = [{ t: "a", a: "favprev" }, { t: "a", a: "favnext" }, { t: "q", key: "0:17" }, { t: "q", key: "0:-1" }];
const CFG = { live: null, home: store.get("cfg:home") || HM_DEF, edit: null, sel: -1, drag: null,
  lpages: store.get("cfg:lpages") || [{ name: "LIVE 1", items: store.get("cfg:live") || LV_DEF }], lp: Math.max(0, store.get("cfg:lp") | 0) };   /* (LIVE: pages of its own) */
if (CFG.lp >= CFG.lpages.length) CFG.lp = 0;
CFG.live = CFG.lpages[CFG.lp].items;
function livePage(i) { CFG.lp = Math.max(0, Math.min(CFG.lpages.length - 1, i)); CFG.live = CFG.lpages[CFG.lp].items; store.set("cfg:lp", CFG.lp); }
const ACT = { play: ["PLAY", "Arranca o para el patrón"], rec: ["REC", "Como el botón REC"], favnext: ["Fav. siguiente", ""], favprev: ["Fav. anterior", ""], discard: ["Descartar", "Lo editado vuelve a como se cargó"] };
const LXT = {};                                  /* more card types, from other files: {t: {name, w, h, html(it, i)}} (escenas.js, set.js) */
const GITEM = { filt: ["Filtro", "FILTER", "filt", 0, [50, 127, 127, 127]], fx: ["Efectos", "FX", "meters", 0, [33, 34, 35, 36]], env: ["ENV", "ENV", "env", 0, [1, 2, 3, 4]], lfo: ["LFO", "LFO", "lfo", 0, [9, 10, 11, 12]] };
function cfgSave(which) { if (which === "live") { CFG.lpages[CFG.lp].items = CFG.live; store.set("cfg:lpages", CFG.lpages); store.set("cfg:lp", CFG.lp); } else store.set("cfg:" + which, CFG[which]); }
/* ---- a JSON file: given to the viewer (their downloads), or one they pick */
function saveJson(name, obj) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: "application/json" })), a = document.createElement("a");
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function pickJson() {
  return new Promise((ok, no) => {
    const i = Object.assign(document.createElement("input"), { type: "file", accept: ".json,application/json" });
    i.onchange = async () => { try { ok(JSON.parse(await i.files[0].text())); } catch (e) { no(e); } };
    i.click();
  });
}
const today = () => new Date().toISOString().slice(0, 10);
/* LIVE's pages to a file and back (Edit: Exportar / Importar). An import adds its pages after the ones here: nothing is lost */
const LPF = { FORMAT: "clipper-live-pages", VERSION: 1 };
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-lpio]"); if (!b) return;
  if (b.dataset.lpio === "out") { cfgSave("live"); saveJson(`clipper-live-paginas-${today()}.json`, { format: LPF.FORMAT, version: LPF.VERSION, exported: new Date().toISOString(), pages: CFG.lpages }); toast(-1, `<b>${CFG.lpages.length}</b> ${CFG.lpages.length === 1 ? "página exportada" : "páginas exportadas"}`); return; }
  let j; try { j = await pickJson(); } catch (er) { toast(-1, "Ese archivo no se puede leer"); return; }
  const got = j && j.format === LPF.FORMAT && Array.isArray(j.pages) ? j.pages.filter((p) => p && Array.isArray(p.items)) : null;
  if (!got || !got.length) { toast(-1, "Ese archivo no tiene páginas de LIVE"); return; }
  const names = new Set(CFG.lpages.map((p) => p.name)), first = CFG.lpages.length;
  for (const p of got) {
    let n = String(p.name || "LIVE").slice(0, 16).toUpperCase(), k = 2; const base = n;
    while (names.has(n)) n = `${base.slice(0, 13)} ${k++}`;
    names.add(n); CFG.lpages.push({ name: n, items: p.items.filter((x) => x && typeof x === "object") });
  }
  livePage(first); cfgSave("live"); renderWork(); toast(-1, `<b>${got.length}</b> ${got.length === 1 ? "página importada" : "páginas importadas"}`);
});
/* LIVE's pages: a tab each (in Edit: rename by a tap on the open one, × removes, + adds) */
function lpTabs() {
  const ed = CFG.edit === "live";
  return `<nav class="lpt" aria-label="Páginas de LIVE">${CFG.lpages.map((pg, i) => `<button data-lp="${i}" aria-current="${i === CFG.lp}">${esc(pg.name)}${ed && CFG.lpages.length > 1 && i === CFG.lp ? `<span class="lpx" data-lpdel="${i}" aria-label="Quitar la página">⚠ ×</span>` : ""}</button>`).join("")}
    ${ed || CFG.lpages.length < 2 ? `<button class="lpadd" data-lpadd="1">+ Página</button>` : ""}</nav>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lp],[data-lpadd]"); if (!b) return;
  if (e.target.closest("[data-lpdel]")) { const k = CFG.lp; ask({ title: `¿Quitar la página «${CFG.lpages[k].name}»?`, ok: "Quitar la página", danger: true }).then((v) => { if (!v) return; CFG.lpages.splice(k, 1); livePage(k - 1); cfgSave("live"); renderWork(); }); return; }
  if (b.dataset.lpadd) { CFG.lpages.push({ name: "LIVE " + (CFG.lpages.length + 1), items: [] }); livePage(CFG.lpages.length - 1); cfgSave("live"); if (!CFG.edit) { CFG.edit = "live"; document.body.classList.add("cfgediting"); } renderWork(); return; }
  const i = +b.dataset.lp;
  if (i === CFG.lp && CFG.edit === "live") { ask({ title: "Nombre de la página", input: CFG.lpages[i].name, ok: "Guardar" }).then((n) => { if (n && n.trim()) { CFG.lpages[i].name = n.trim().slice(0, 16).toUpperCase(); cfgSave("live"); renderWork(); } }); return; }
  livePage(i); renderWork();
});
/* the sizes a card can take (measured on the tablet, the phone and a PC: smaller cuts it): the FX bars and the envelope
   2 x 2, the LFO and the filter 1 x 2 or bigger,
   the scenes two wide; the rest any of the four */
const SZ_ALL = [[1, 1], [2, 1], [1, 2], [2, 2]];
function cardSizes(it) {
  if (it.t === "g" && (it.g === "fx" || it.g === "env")) return [[2, 2]];
  if (it.t === "g" && (it.g === "lfo" || it.g === "filt")) return [[1, 2], [2, 2]];
  if (it.t === "sc") return [[2, 1], [2, 2]];
  return SZ_ALL;
}
function cardFit(it) {                           /* (a size it cannot take: the smallest it can that is not smaller) */
  const ok = cardSizes(it), w = it.w || 1, h = it.h || 1;
  if (ok.some(([a, b]) => a === w && b === h)) return;
  const pick = ok.filter(([a, b]) => a >= w && b >= h)[0] || ok[ok.length - 1];
  it.w = pick[0]; it.h = pick[1];
}
function itemHtml(it, i, which) {
  cardFit(it);
  const ed = CFG.edit === which, w = it.w || 1, h = it.h || 1, at = `style="grid-column:span ${w};grid-row:span ${h}" data-ci="${i}"`;
  let body = "";
  if (it.t === "q") { const q = QSPEC.get(it.key); body = q ? tile(q) : ""; }
  else if (it.t === "p") body = desc(it.s, it.id) ? tileP(it.s, it.id, it.k || 0, "", false) : "";
  else if (it.t === "g") { const g = GITEM[it.g]; body = g ? module({ title: g[1], folder: g[1] === "FILTER" || g[1] === "FX" ? "FX" : g[1], s: g[3], ids: g[4] }, g[2], { name: g[0], toggles: it.g === "fx", fxedit: it.g === "fx" }) : ""; }
  else if (LXT[it.t]) body = LXT[it.t].html(it, i);
  else if (it.t === "a") { const a = ACT[it.a] || ["?", ""], nx = it.a === "favnext" ? M.favs[(M.favCur + 1) % Math.max(1, M.favs.length)] : it.a === "favprev" ? M.favs[(M.favCur - 1 + M.favs.length) % Math.max(1, M.favs.length)] : null;
    body = `<button class="act" data-act="${it.a}"><b>${a[0]}</b><span class="v num">${it.a === "favnext" ? "›" : it.a === "favprev" ? "‹" : it.a === "play" ? (SQ.playing ? "■" : "▶") : it.a === "rec" ? "●" : a[2] || "↺"}</span><span class="s">${esc(nx ? nx.name : a[1])}</span></button>`; }
  const sz = cardSizes(it).map(([a, b]) => `<button data-csz="${i}" data-w="${a}" data-h="${b}" aria-pressed="${a === w && b === h}">${a}×${b}</button>`).join("");
  if (!it.uid) it.uid = Math.random().toString(36).slice(2, 8);
  return `<div class="ci${ed ? " ed" : ""}${CFG.sel === i && ed ? " sel" : ""}" data-uid="${it.uid}" ${at}>${body}${ed ? `<div class="csz"><span class="cgrip" aria-hidden="true">⋮⋮</span>${sz}<button class="cx" data-cx="${i}" aria-label="Quitar">×</button></div>` : ""}</div>`;
}
function cfgGrid(which, cls) {
  const items = CFG[which];
  return `<div class="cg ${cls}${CFG.edit === which ? " editing" : ""}" data-cg="${which}">${items.map((it, i) => itemHtml(it, i, which)).join("")}${CFG.edit === which ? `<button class="ci cadd" data-cadd="${which}">+ Añadir</button>` : ""}</div>`;
}
function catalog(which) {
  const fold = CFG.catF || "FX", pages = LAYOUT.filter((x) => x.folder === fold && x.scope !== 2 && pageOn(x) && !ESTUDIO_ONLY.has(x.title));
  const chip = (lab, data) => `<button class="chip" ${data}>${esc(lab)}</button>`;
  return `<aside class="cat"><h2>Añadir</h2>
    <h3>ACCIONES</h3><div class="chips">${Object.entries(ACT).map(([k, a]) => chip(a[0], `data-cnew='${JSON.stringify({ t: "a", a: k })}'`)).join("")}</div>
    <h3>RÁPIDOS</h3><div class="chips">${[...QSPEC.values()].map((q) => chip(q.name, `data-cnew='${JSON.stringify({ t: "q", key: qkey(q) })}'`)).join("")}</div>
    <h3>ESCENAS Y SET</h3><div class="chips">${Object.entries(LXT).map(([k, x]) => chip(x.name, `data-cnew='${JSON.stringify({ t: k, w: x.w, h: x.h })}'`)).join("")}</div>
    <h3>GRÁFICAS</h3><div class="chips">${Object.entries(GITEM).map(([k, g]) => chip(g[0], `data-cnew='${JSON.stringify({ t: "g", g: k, w: 2, h: 2 })}'`)).join("")}</div>
    <h3>CUALQUIER PARÁMETRO</h3><div class="chips">${["ENV", "LFO", "FX", "SEL", "EDIT", "ARP", "SEQ", "GLO"].map((f) => `<button class="chip${f === fold ? " sel" : ""}" data-catf="${f}">${f}</button>`).join("")}</div>
    <div class="catp">${pages.map((p) => `<div><small>${esc(p.title)}</small><div class="chips">${pageCells(p).map(({ id, k }) => chip(desc(p.s, id).label, `data-cnew='${JSON.stringify({ t: "p", s: p.s, id, k })}'`)).join("")}</div></div>`).join("")}</div></aside>`;
}
function cfgView(which, title) {
  const ed = CFG.edit === which, lock = which === "live" && S.lock;
  document.body.classList.toggle("cfgediting", !!CFG.edit);
  const head = `<div class="qhead"><h2>${title}</h2>${ed ? `<span class="hint2">Arrastra una tarjeta para ordenar · × quita · elige el tamaño abajo</span>` : ""}<div class="qtools">${ed
    ? `${which === "live" ? `<button data-lpio="out"><svg class="i"><use href="#i-dl"/></svg>Exportar</button><button data-lpio="in">Importar</button>` : ""}<button data-creset="${which}"><svg class="i"><use href="#i-undo"/></svg>Restablecer</button><button class="pri" data-cedit=""><svg class="i"><use href="#i-check"/></svg>Listo</button>`
    : `${which === "live" ? `<button class="${lock ? "on" : ""}" data-lock="1" aria-pressed="${lock}"><svg class="i"><use href="#i-${lock ? "lock" : "unlock"}"/></svg>${lock ? "Bloqueado" : "Bloquear"}</button>` : ""}${lock ? "" : `<button data-cedit="${which}"><svg class="i"><use href="#i-edit"/></svg>Editar</button>`}`}</div></div>`;
  return `<div class="cfgwrap${ed ? " editing" : ""}"><div class="cfgw">${head}${which === "live" ? lpTabs() : ""}${cfgGrid(which, which === "live" ? "lg4" : "lg4 short")}</div>${ed ? catalog(which) : ""}</div>`;
}
/* LIVE locked: the view stays (the nav and Seguir do not take it away), for playing */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lock]"); if (!b) return;
  S.lock = !S.lock; store.set("lock", S.lock); document.body.classList.toggle("locked", S.lock); renderWork();
  toast(-1, S.lock ? "<b>LIVE bloqueado</b>: toca el candado para soltarlo" : "<b>LIVE suelto</b>");
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-cedit],[data-cx],[data-csz],[data-cnew],[data-catf],[data-creset],[data-act],[data-fxedit]"); if (!b) return;
  const which = CFG.edit;
  if (b.dataset.cedit !== undefined) { CFG.edit = b.dataset.cedit || null; document.body.classList.toggle("cfgediting", !!CFG.edit); renderWork(); return; }
  if (b.dataset.creset) { CFG[b.dataset.creset] = JSON.parse(JSON.stringify(b.dataset.creset === "live" ? (CFG.lp ? [] : LV_DEF) : HM_DEF)); cfgSave(b.dataset.creset); renderWork(); return; }
  if (b.dataset.cx) { CFG[which].splice(+b.dataset.cx, 1); cfgSave(which); renderWork(); return; }
  if (b.dataset.csz) { const it = CFG[which][+b.dataset.csz]; it.w = +b.dataset.w; it.h = +b.dataset.h; cfgSave(which); renderWork(); return; }
  if (b.dataset.cnew) { CFG[which].push(JSON.parse(b.dataset.cnew)); cfgSave(which); renderWork(); toast(-1, "Añadido"); return; }
  if (b.dataset.catf) { CFG.catF = b.dataset.catf; renderWork(); return; }
  if (b.dataset.fxedit) { S.folder = "FX"; renderNav(); renderWork(); setTimeout(() => document.querySelector(`#edit [data-title="${CSS.escape(b.dataset.fxedit)}"]`)?.scrollIntoView({ block: "start" }), 30); return; }
  if (b.dataset.act && !CFG.edit) runAct(b.dataset.act);
});
function runAct(a) {                             /* an action card, or a MIDI key learnt for it */
  const n = M.favs.length;
  {
    if (a === "play") rq(C.TRANSPORT, [SQ.playing ? 0 : 1]).then((r) => { SQ.playing = !!r[0]; renderTransport(); renderWork(); }).catch(() => {});
    else if (a === "rec") document.querySelector("[data-trec]")?.click();
    else if ((a === "favnext" || a === "favprev") && n) favGo(M.favCur < 0 ? (a === "favnext" ? 0 : n - 1) : (M.favCur + (a === "favnext" ? 1 : -1) + n) % n);
    else if (a === "discard") document.querySelector("[data-discard]")?.click();
    else if (ACT[a] && ACT[a].run) ACT[a].run();
  }
}
/* reorder: in edit, a card lifts and follows the finger (a ghost), the others make room as it passes (FLIP: they slide
   from where they were), and on release it settles into its place */
const zf = () => +getComputedStyle(document.documentElement).getPropertyValue("--z") || 1;   /* (a PC screen: the app zoomed, live.css) */
function cfgFlip(which, change) {
  const cg = document.querySelector(`.cg[data-cg="${which}"]`), before = new Map();
  cg?.querySelectorAll(".ci[data-ci]").forEach((el) => before.set(el.dataset.uid, el.getBoundingClientRect()));
  change();
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll(`.cg[data-cg="${which}"] .ci[data-ci]`).forEach((el) => {
    const r0 = before.get(el.dataset.uid); if (!r0 || reduce) return;
    const r1 = el.getBoundingClientRect(), z = zf(), dx = (r0.left - r1.left) / z, dy = (r0.top - r1.top) / z; if (!dx && !dy) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 180, easing: "cubic-bezier(.2, .8, .2, 1)" });
  });
}
document.addEventListener("pointerdown", (e) => {
  const c = e.target.closest(".cg.editing .ci[data-ci]"); if (!c || e.target.closest("[data-cx],[data-csz]")) return;
  const r = c.getBoundingClientRect(), g = c.cloneNode(true);
  const z = zf(); g.className = "ci ghost"; Object.assign(g.style, { left: r.left / z + "px", top: r.top / z + "px", width: r.width / z + "px", height: r.height / z + "px" });
  document.body.append(g);
  CFG.drag = { from: +c.dataset.ci, which: c.closest(".cg").dataset.cg, uid: c.dataset.uid, ghost: g, dx: e.clientX - r.left, dy: e.clientY - r.top, pid: e.pointerId };
  c.classList.add("hole"); e.preventDefault();
}, true);
document.addEventListener("pointermove", (e) => {
  const d = CFG.drag; if (!d) return;
  const z = zf(); d.ghost.style.left = (e.clientX - d.dx) / z + "px"; d.ghost.style.top = (e.clientY - d.dy) / z + "px";
  const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(".cg.editing .ci[data-ci]"); if (!over) return;
  const to = +over.dataset.ci; if (to === d.from) return;
  cfgFlip(d.which, () => { const arr = CFG[d.which], [it] = arr.splice(d.from, 1); arr.splice(to, 0, it); d.from = to; cfgSave(d.which); renderWork(); });
  document.querySelector(`.cg.editing .ci[data-uid="${d.uid}"]`)?.classList.add("hole");
}, true);
document.addEventListener("pointerup", () => {
  const d = CFG.drag; if (!d) return; CFG.drag = null;
  const home = document.querySelector(`.cg.editing .ci[data-uid="${d.uid}"]`), g = d.ghost;
  if (!home || matchMedia("(prefers-reduced-motion: reduce)").matches) { g.remove(); home?.classList.remove("hole"); return; }
  setTimeout(() => { if (g.isConnected) { g.remove(); home.classList.remove("hole"); } }, 400);   /* (an animation that never ran: a hidden page) */
  const r = home.getBoundingClientRect(), z = zf();
  g.animate([{ left: g.style.left, top: g.style.top, width: g.style.width, height: g.style.height }, { left: r.left / z + "px", top: r.top / z + "px", width: r.width / z + "px", height: r.height / z + "px" }],
    { duration: 160, easing: "cubic-bezier(.2, .8, .2, 1)", fill: "forwards" }).onfinish = () => { g.remove(); home.classList.remove("hole"); home.animate([{ transform: "scale(1.03)" }, { transform: "none" }], { duration: 140 }); };
}, true);

