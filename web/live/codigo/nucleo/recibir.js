/* -------------------------------------------------------- what the FM-1 says --- */
let reloadT = 0;
function reloadSoon() { clearTimeout(reloadT); reloadT = setTimeout(async () => { try { await readSound(false); await readFavs(); renderAll(); } catch (e) { /* the next push tries again */ } }, 60); }
function onPush(f) {
  try {
    if (f.cmd === C.CHANGED) {
      const r = new Reader(f.a), s = r.b(), id = r.b(), v = r.v(), arr = s ? M.g : M.p;
      if (id >= arr.length || touched(keyOf(s, id))) return;
      const old = arr[id];
      arr[id] = v;
      paintValue(s, id);
      fromDevice(s, id, old, v);
      logChange(s, id, old, v, "sinte");
    } else if (f.cmd === C.RELOAD) { SQ.loaded = false; reloadSoon(); xSoon(); }
    else if (f.cmd === C.STEP_CHANGED) sqStepChanged(f.a[0]);
    else if (f.cmd === C.PLAY) { sqOnPlay(f.a); if (f.a.length > 3) M.rec = f.a[3]; renderTransport(); if (S.folder === "REC") paintRec(); }
    else if (f.cmd === C.X_CHANGED) xSoon();
    else if (f.cmd === C.FAVS_CHANGED) readFavs().then(renderBar).catch(() => {});
    else if (f.cmd === C.EDITED) { M.edited = !!f.a[0]; renderBar(); }
    else if (f.cmd === C.SCOPE) scopeFrame(f.a);
    else if (f.cmd === C.PAGE) {
      M.page = P.page(f.a);
      if (M.page.homeIds) M.homeIds = M.page.homeIds;
      renderWhere();
      if (S.follow) followPage();
    }
  } catch (e) { console.warn("bad push", f, e); }
}
/* the device's page: its folder here, its row flashed */
function followPage() {
  const pg = M.page;
  if (S.folder === "LIVE" && (S.lock || CFG.edit)) { renderNav(); return; }   /* LIVE locked (or being arranged) stays; unlocked it follows */
  if (pg.home) { if (S.folder !== "HOME") { S.folder = "HOME"; renderAll(); } flashRow("HOME"); return; }
  const folder = FAM[pg.fam];
  if (folder === "SAVE") { const k = pg.title === "FAVS" ? "FAVS" : pg.title === "USER" ? "USER" : pg.title === "TOOLS" ? "TOOLS" : null; if (k) SV.kind = k; if (S.folder !== "SAVE") { S.folder = "SAVE"; renderAll(); } else renderWork(); return; }
  if (!folder || folder === "HOME") return;
  if (folder === "SEQ" && (pg.title === "NOTES" || pg.title === "PATTERN") && S.seqPage !== pg.title) { S.seqPage = pg.title; if (S.folder === "SEQ") renderWork(); }   /* (the device's page) */
  if (S.folder !== folder) { S.folder = folder; renderAll(); } else renderNav();
  flashRow(pg.title);
}
function flashRow(title) {
  const all = document.querySelectorAll(`#edit [data-title="${CSS.escape(title)}"]`), r = all[0];   /* (a page: its module, its tiles) */
  document.querySelectorAll("#edit .dev").forEach((x) => x.classList.remove("dev"));
  if (!r) return;
  all.forEach((x) => { x.classList.add("dev"); x.classList.remove("flash"); void x.offsetWidth; x.classList.add("flash"); });
  r.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}
function fromDevice(s, id, old, v) {
  const d = desc(s, id); if (!d) return;
  const pg = M.page, k = pg && !pg.home && pg.scope === s ? pg.ids.indexOf(id) : pg && pg.home && !s ? M.homeIds.indexOf(id) : -1;
  const a = fmtValue(d, old), b = fmtValue(d, v);
  toast(k, `${k >= 0 ? `<b>KNOB ${k + 1}</b> ` : ""}${esc(d.label)} <span class="num">${esc(a[0] + a[1])} → ${esc(b[0] + b[1])}</span>`);
  document.querySelectorAll(`.tl[data-tl="${keyOf(s, id)}"],[data-cell="${keyOf(s, id)}"],.mt[data-mt="${keyOf(s, id)}"],.arc[data-k="${keyOf(s, id)}"]`).forEach((el) => { el.classList.add("hot"); clearTimeout(el._h); el._h = setTimeout(() => el.classList.remove("hot"), 1600); });
}

