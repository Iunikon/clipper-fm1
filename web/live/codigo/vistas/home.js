/* ---- HOME: the favourites at hand (16 pads), and a few shortcuts you choose */
function homeView() {
  const pads = Array.from({ length: 16 }, (_, i) => { const f = M.favs[i];
    return f ? `<button class="fpad${i === M.favCur ? " on" : ""}" data-favgo="${i}"><span class="i num">${String(i + 1).padStart(2, "0")}</span><b>${esc(f.name)}</b><small><span class="k">${esc(f.kind)}</span> <span class="e">${esc(M.info.engines[f.e] || "USER")}</span></small></button>`
      : `<div class="fpad free"><span class="i num">${String(i + 1).padStart(2, "0")}</span><small>Libre</small></div>`; }).join("");
  const knobs = module({ title: "HOME", folder: "HOME", s: 0, ids: M.homeIds }, "arcs", { cls: "hk", bare: true, nolive: true });   /* (the device's HOME four: kept) */
  return `<div class="homev"><div class="qhead"><h2>Favoritos</h2><span class="c num">${M.favs.length}/16</span></div><div class="fpads">${pads}</div>
    <div class="hrow2">${knobs}<div class="hacc">${cfgView("home", "Accesos")}</div></div></div>`;
}

