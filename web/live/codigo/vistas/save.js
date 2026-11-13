/* ------------------------------------------------- SAVE: the sounds, a view --- */
/* Every folder at once down the side; the sound that plays on top with what can be done to it (a favourite, its edits
   discarded, the one before or after it in its folder); the folder's sounds as cards. Favourites: the 16 slots, the
   free ones too */
const SV = { kind: null }, US = { slots: null, busy: false };   /* (USER: the 32 slots, read when shown) */
const favKey = (x) => x.e + ":" + x.k + ":" + x.name;
function svItems(kind) {
  if (kind === "FAVS") return M.favs.map((f, i) => ({ fav: i, x: f, n: M.list.findIndex((y) => favKey(y) === favKey(f)) }));
  return M.list.map((x, n) => ({ x, n })).filter((o) => kind === "ALL" || o.x.kind === kind);
}
function soundsView() {
  const n = entryNow(), x = M.list[n], fav = M.favCur >= 0;
  if (!SV.kind) SV.kind = x ? x.kind : "FAVS";
  const kinds = ["FAVS", "ALL", ...KINDS.filter((k) => k !== "USER" && M.list.some((y) => y.kind === k)), "USER"];   /* (USER always: its 32 slots) */
  if (SV.kind === "USER" && !US.slots && !US.busy) { US.busy = true; readSlots().then((v) => { US.slots = v; }, () => { US.slots = []; }).finally(() => { US.busy = false; if (S.folder === "SAVE") renderWork(); }); }
  const cnt = (k) => (k === "FAVS" ? `${M.favs.length}/16` : k === "USER" ? `${M.list.filter((y) => y.kind === "USER").length}/32` : svItems(k).length);
  const items = svItems(SV.kind), favs = new Set(M.favs.map(favKey)), inKind = x ? svItems(x.kind) : [], at = inKind.findIndex((o) => o.n === n);
  const name = x ? x.name : (M.info.engines[M.engine] || "") + " " + (M.preset + 1);
  const card = (o) => { const f = favs.has(favKey(o.x)), cur = o.n === n && n >= 0;
    return `<button class="sc${cur ? " cur" : ""}" role="listitem" ${o.fav != null ? `data-favgo="${o.fav}"` : `data-load="${o.n}"`} aria-current="${cur}">
      <span class="sn">${o.fav != null ? `<span class="fi num">${String(o.fav + 1).padStart(2, "0")}</span>` : ""}${esc(o.x.name)}${f && o.fav == null ? '<svg class="i st" aria-label="favorito"><use href="#i-star"/></svg>' : ""}</span>
      <span class="sm">${SV.kind === "ALL" || SV.kind === "FAVS" ? `<span class="k">${esc(o.x.kind)}</span>` : ""}<span class="e">${esc(M.info.engines[o.x.e] || "USER")}</span><span class="num">${o.n >= 0 ? o.n + 1 : ""}</span></span></button>`; };
  const uslot = (u, k) => { const m = M.list.findIndex((y) => y.e === M.info.nengines && y.k === k), cur = m === n && n >= 0;
    return u.used ? `<button class="sc${cur ? " cur" : ""}" role="listitem" ${m >= 0 ? `data-load="${m}"` : ""} aria-current="${cur}"><span class="sn"><span class="fi num">${upLabel(k)}</span>${esc(u.name)}</span><span class="sm"><span class="e">${esc(M.info.engines[u.e] || "")}</span></span></button>`
      : `<div class="sc free" role="listitem"><span class="sn"><span class="fi num">${upLabel(k)}</span>Libre</span><span class="sm">Guarda aquí con Guardar</span></div>`; };
  const userBody = SV.kind === "USER" ? (US.slots ? US.slots.map(uslot).join("") : `<p class="pce">Leyendo las ranuras de usuario del FM-1…</p>`) : null;
  const free = SV.kind === "FAVS" ? Array.from({ length: 16 - M.favs.length }, (_, i) => `<div class="sc free" role="listitem"><span class="sn"><span class="fi num">${String(M.favs.length + i + 1).padStart(2, "0")}</span>Libre</span><span class="sm">Carga un sonido y márcalo con la estrella</span></div>`).join("") : "";
  return `<div class="sv">
    <div class="svl"><nav class="svk" aria-label="Carpetas de sonidos">${kinds.map((k) => `<button class="kf${k === "FAVS" ? " fk" : ""}" data-skind="${k}" aria-current="${SV.kind === k}"><span>${k === "FAVS" ? "Favoritos" : k === "ALL" ? "Todos" : k}</span><span class="num">${cnt(k)}</span></button>`).join("")}</nav>
      <h3 class="svg2">Dispositivo</h3>
      <nav class="svk" aria-label="Dispositivo">${DEV.map(([k, t]) => `<button class="kf" data-skind="${k}" aria-current="${SV.kind === k}"><span>${t}</span></button>`).join("")}
        <button class="kf" data-skind="TOOLS" aria-current="${SV.kind === "TOOLS"}"><span>Herramientas</span></button></nav></div>
    <div class="svm">
      <section class="svc${M.edited ? " edited" : ""}"><div class="svn"><span class="c">Suena ahora</span><b>${esc(name)}</b>
        <span class="m">${x ? `<span class="k">${esc(x.kind)}</span>` : ""}<span class="e">${esc(M.info.engines[M.engine] || "USER")}</span><span class="num">${n >= 0 ? `${n + 1}/${M.list.length}` : ""}</span>${M.edited ? '<span class="edtx" title="Editado">EDIT</span>' : ""}</span></div>
        <div class="sva">
          <button class="btn pri2${M.edited ? " ed" : ""}" data-save="1"><svg class="i"><use href="#i-disk"/></svg>Guardar</button>
          <button class="btn${fav ? " on" : ""}" data-svfav="1"><svg class="i"><use href="#i-star"/></svg>${fav ? `Favorito ${M.favCur + 1}: quitar` : "Marcar como favorito"}</button>
          ${M.edited && n >= 0 ? `<button class="btn" data-discard="1"><svg class="i"><use href="#i-undo"/></svg>Descartar lo editado</button>` : ""}
          <div class="alg">${at >= 0 ? `<button class="btn" data-load="${inKind[(at - 1 + inKind.length) % inKind.length].n}"><svg class="i"><use href="#i-prev"/></svg>Anterior en ${esc(x.kind)}</button><button class="btn" data-load="${inKind[(at + 1) % inKind.length].n}">Siguiente<svg class="i"><use href="#i-next"/></svg></button>` : ""}</div>
          ${x && x.e === M.info.nengines
            ? `<button class="btn" data-save="1"><svg class="i"><use href="#i-edit"/></svg>Renombrar</button>`
            : ""}
          ${x && x.e === M.info.nengines ? `<button class="btn dsc2" data-pc="up-erase" data-n="${x.k}">Borrar</button>` : ""}</div></section>
      ${SV.kind === "TOOLS" ? `<header class="svh"><h2>Herramientas</h2><span class="c">Cada una pide un segundo toque</span></header>${toolsHtml()}`
        : DEV.some(([k]) => k === SV.kind)
        ? `<header class="svh"><h2>${DEV.find(([k]) => k === SV.kind)[1]}</h2></header>${devView(SV.kind)}`
        : `<header class="svh"><h2>${SV.kind === "FAVS" ? "Favoritos" : SV.kind === "ALL" ? "Todos los sonidos" : SV.kind === "USER" ? "Sonidos de usuario" : esc(SV.kind)}</h2><span class="c num">${SV.kind === "FAVS" ? `${M.favs.length} de 16` : SV.kind === "USER" ? `${items.length} de 32` : `${items.length} sonidos`}</span></header>
      <div class="scs" role="list">${userBody != null ? userBody : items.map(card).join("") + free}</div>`}
    </div></div>`;
}

/* SAVE > TOOLS, as on the device (CLRSQ, INIT, NEW), each a second tap (at least 0.4 s later) to act (the device's two detents) */
const TOOLS = [["CLRSQ", "Borrar el patrón"], ["INIT", "Iniciar el sonido"], ["NEW", "Proyecto nuevo"]];
const toolArm = { id: -1, t: 0 };
function toolsHtml() {
  const pg = LAYOUT.find((x) => x.title === "TOOLS"); if (!pg) return "";
  const lv = M.page && !M.page.home && M.page.title === "TOOLS";
  const btn = ([lab, what]) => { const id = pg.ids.find((i) => i < 127 && desc(1, i) && desc(1, i).label === lab); if (id == null) return "";
    const arm = toolArm.id === id; return `<button class="tool${arm ? " arm" : ""}" data-tool="${id}"><b>${lab}</b><span>${arm ? "Toca otra vez para confirmar" : what}</span></button>`; };
  return `<section class="tools${lv ? " dev" : ""}" data-title="TOOLS" aria-label="TOOLS"><h3>TOOLS</h3>${TOOLS.map(btn).join("")}</section>`;
}
async function toolTap(id) {
  if (toolArm.id === id && performance.now() - (toolArm.at || 0) < 400) return;   /* un doble toque rápido no borra */
  if (toolArm.id !== id) {
    toolArm.id = id; toolArm.at = performance.now(); clearTimeout(toolArm.t);
    const off = (e) => { if (e.target.closest(`[data-tool="${id}"]`)) return;
      toolArm.id = -1; document.removeEventListener("pointerdown", off, true); if (S.folder === "SAVE") renderWork(); };
    setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
    renderWork(); return;
  }
  toolArm.id = -1; clearTimeout(toolArm.t); renderWork();
  const lab = desc(1, id).label;
  try {
    const r = await rq(C.TOOL, [id], { timeout: 2000, retries: 0 });
    toast(-1, r[1] === 0 ? `<b>${esc(lab)}</b> hecho` : r[1] === 3 ? "Para la reproducción primero" : r[1] === 1 && lab === "INIT" ? "La pista de batería no tiene sonido que iniciar" : "El FM-1 no lo hizo");
  } catch (e) { toast(-1, "El FM-1 no contestó"); }
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-tool]"); if (b) toolTap(+b.dataset.tool); });

