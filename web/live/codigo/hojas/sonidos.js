/* ------------------------------------------------------------- the browser --- */
const KINDS = ["BASS", "KEYS", "ORGN", "PAD", "LEAD", "PLCK", "STAB", "FX", "USER"];
const B = { kind: "BASS", open: false };
function renderBrowser() {
  const kinds = KINDS.filter((k) => k === "USER" || M.list.some((x) => x.kind === k));   /* (USER always, even empty) */
  const favKeys = new Set(M.favs.map((f) => f.e + ":" + f.k + ":" + f.name));
  const cnt = (k) => (k === "FAVS" ? M.favs.length : k === "ALL" ? M.list.length : M.list.filter((x) => x.kind === k).length);
  const kd = (k, label, cls = "") => `<button class="kd ${cls}" data-kind="${k}" aria-current="${B.kind === k}"><span>${label}</span><span class="n">${cnt(k)}</span></button>`;
  $("kinds").innerHTML = kd("FAVS", "Favoritos", "fv-k") + kd("ALL", "Todos") + kinds.map((k, i) => kd(k, k, i ? "" : "sep")).join("");
  const cur = entryNow();
  let items;
  if (B.kind === "FAVS") items = M.favs.map((f, i) => ({ fav: i, x: f, n: M.list.findIndex((y) => y.e === f.e && y.k === f.k && y.name === f.name) }));
  else items = M.list.map((x, n) => ({ x, n })).filter((o) => B.kind === "ALL" || o.x.kind === B.kind);
  $("brc").textContent = `${B.kind === "FAVS" ? "Favoritos" : B.kind === "ALL" ? "Todos" : B.kind}  ${items.length}`;
  $("snds").innerHTML = items.map((o) => { const f = favKeys.has(o.x.e + ":" + o.x.k + ":" + o.x.name);
    return `<button class="sd" role="listitem" ${o.fav != null ? `data-favgo="${o.fav}"` : `data-load="${o.n}"`} aria-current="${o.n === cur}"><span class="n">${esc(o.x.name)}</span><span class="x">${o.n >= 0 ? o.n + 1 : ""}</span>
      <span class="m">${B.kind === "ALL" || B.kind === "FAVS" ? `<span class="k">${esc(o.x.kind)}</span>` : ""}<span class="e">${esc(M.info.engines[o.x.e] || "USER")}</span>${f ? '<svg class="i st"><use href="#i-star"/></svg>' : ""}</span></button>`; }).join("");
  if (!items.length && B.kind === "USER") $("snds").innerHTML = `<p class="pce">Todavía no hay sonidos de usuario. Guarda uno con <b>Guardar</b>: el FM-1 tiene 32 ranuras.</p>`;
}
function openBrowser(on, kind) {
  B.open = on;
  if (on) { const x = M.list[entryNow()]; B.kind = kind || (x ? x.kind : "BASS"); renderBrowser(); }
  $("br").classList.toggle("on", on); $("scrim").classList.toggle("on", on); $("now").setAttribute("aria-expanded", on);
  if (on) setTimeout(() => ($("snds").querySelector('[aria-current="true"]') || $("snds").querySelector(".sd"))?.focus(), 50);
}

