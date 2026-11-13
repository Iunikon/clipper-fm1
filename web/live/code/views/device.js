/* ---- SAVE > Device: library, samples, kits and projects ---- */
const DEV = [["LIB", "Biblioteca"], ["PRJ", "Proyectos"]];   /* (the samples: in Estudio) */
const KIT = { k: 0 };
function devView(kind) {
  if (kind === "SMP") {
    const v = PC.load("smp", CE.SMP_INFO, [], PCP.smp);
    if (!v || v === "…") return pcEmpty(v, "los samples");
    const up = (i) => `<input type="file" accept="audio/*,.wav,.aif,.aiff,.mp3" data-smpup="${i}" hidden>`;
    return `<div class="dvc">${v.slots.map((x, i) => SMPUP.k === i
        ? `<div class="dvs busy" data-smp="${i}"><span class="num">S${String(i + 1).padStart(2, "0")}</span><b>Subiendo…</b><small class="num">${SMPUP.done} / ${SMPUP.total}</small><span class="upb"><i style="width:${SMPUP.done / SMPUP.total * 100}%"></i></span></div>`
      : x.name ? `<div class="dvs" data-smp="${i}"><span class="num">S${String(i + 1).padStart(2, "0")}</span><b>${esc(x.name)}</b>
        <small class="num">${x.zones} ${x.zones === 1 ? "zona" : "zonas"} · ${x.kib} KiB</small>
        <span class="dva"><button class="btn" data-pc="smp-repl" data-n="${i}">Reemplazar</button><button class="dsc" data-pc="smp-erase" data-n="${i}">Borrar</button></span>${up(i)}</div>`
      : `<div class="dvs free" data-smp="${i}"><span class="num">S${String(i + 1).padStart(2, "0")}</span><b>Libre</b><small class="num">${v.slotKiB} KiB</small>
        <span class="dva"><label class="btn">Subir WAV${up(i)}</label></span></div>`).join("")}</div>
      <p class="msh">Un archivo por ranura, mono a 22 050 Hz; la raíz sale del nombre del archivo (por ejemplo «PIANO A4»). Cabe hasta ${Math.round(SMP.MAX_DATA / 1024)} KiB comprimidos.</p>`;
  }
  if (kind === "KIT") {
    const v = PC.load("kits", CE.DSYN_LIST, [], PCP.kits);
    if (!v || v === "…") return pcEmpty(v, "los kits");
    const all = [...v.names.map((n, i) => ({ n, k: i })), ...v.kits.map((x, i) => ({ n: x.name || `USER ${i + 1}`, k: 64 + i }))];
    const cur = all.find((x) => x.k === KIT.k) || all[0];
    return `<div class="kts">${all.map((x) => `<button class="kf" data-pc="kit" data-n="${x.k}" aria-current="${cur && x.k === cur.k}"><span>${esc(x.n)}</span></button>`).join("")}</div>
      <div class="pads" role="group" aria-label="Pads de ${esc(cur ? cur.n : "")}">${Array.from({ length: 16 }, (_, l) => `<button class="pad" data-pc="pad" data-n="${l}" style="--c:${KC[l % 4]}"><span class="num">${l + 1}</span></button>`).join("")}</div>`;
  }
  if (kind === "LIB") return libView();                     /* (the tablet's: studio.js) */
  /* PROYECTOS: 4 ranuras (PROJECT: 2 consulta, 0 carga, 1 guarda) */
  const ps = [0, 1, 2, 3].map((k) => PC.load("prj" + k, CE.PROJECT, [2, k], (a) => ({ slot: a[1], used: !!a[2], busy: a[3] === 1 })));
  if (ps.some((p) => p === "…")) return pcEmpty("…", "los proyectos");
  if (ps.every((p) => p === null)) return pcEmpty(null, "los proyectos");
  return `<div class="dvc">${ps.map((p, k) => `<div class="dvs${p && p.used ? "" : " free"}"><span class="num">P${k + 1}</span><b>${p && p.used ? `Proyecto ${k + 1}` : "Libre"}</b>
      <small>${p && p.used ? "Ocupado" : "Vacío"}</small>
      <span class="dva">${p && p.used ? `<button class="btn" data-pc="prj-load" data-n="${k}">Cargar</button>` : ""}<button class="btn" data-pc="prj-save" data-n="${k}">${p && p.used ? "Guardar encima" : "Guardar aquí"}</button></span></div>`).join("")}</div>
    <p class="msh">Cargar sustituye el proyecto que suena. Guardar encima borra el que había. Las dos piden un segundo toque.</p>`;
}

/* the actions: two taps to erase, one tap to play */
document.addEventListener("click", async (e) => {
  const pend = e.target.closest("[data-pend]"); if (pend) { PC.pend(pend.dataset.pend); return; }
  const b = e.target.closest("[data-pc]"); if (!b) return;
  const n = +b.dataset.n;
  if (b.dataset.pc === "kit") { KIT.k = n; renderWork(); }
  else if (b.dataset.pc === "pad") PC.act(76, [KIT.k & 127, n & 127, 110]);                       /* DSYN_PLAY */
  else if (b.dataset.pc === "smp-repl") {
    if (b.dataset.arm !== "1") { arm(b, "Reemplazar", "¿Seguro?"); return; }
    disarm(b, "Reemplazar"); document.querySelector(`input[data-smpup="${n}"]`)?.click();
  } else if (b.dataset.pc === "smp-erase") {
    if (b.dataset.arm !== "1") { arm(b, "Borrar", "¿Seguro?"); return; }
    disarm(b, "Borrar"); PC.act(CE.SMP_ERASE, [n & 127], "Sample borrado").then((ok) => ok && PC.again("smp"));
  } else if (b.dataset.pc === "up-erase") {
    if (b.dataset.arm !== "1") { arm(b, "Borrar", "¿Seguro?"); return; }
    disarm(b, "Borrar"); PC.act(CE.UP_ERASE, [n & 127], "Sonido de usuario borrado").then(async (ok) => { if (!ok) return; US.slots = null; try { await readList(); } catch (e) { /* (the next RELOAD) */ } reloadSoon(); });
  } else if (b.dataset.pc === "prj-load" || b.dataset.pc === "prj-save") {
    const load = b.dataset.pc === "prj-load", lab = load ? "Cargar" : b.textContent;
    if (b.dataset.arm !== "1") { arm(b, lab, "¿Seguro?"); return; }
    disarm(b, lab);
    if (load && !M.mock && !(await autoBackupProject())) return;
    PC.act(CE.PROJECT, [load ? 0 : 1, n & 3], load ? `Proyecto <b class="num">${n + 1}</b> cargado` : `Guardado en el proyecto <b class="num">${n + 1}</b>`)
      .then((ok) => { if (!ok) return; if (load) reloadSoon(); PC.again("prj" + n); });
  }
});

function bentoView(folder) {
  const pages = pagesOf(folder);
  if (folder === "SEQ") return `<div class="blks">${seqBlock()}${blocksOf(folder, pages.filter((p) => p.title !== "NOTES")).map(block).join("")}${tracksBlock()}${songBlock()}</div>`;   /* (NOTES: seq.js) */
  if (folder !== "HOME") return `<div class="blks">${blocksOf(folder, pages).map(block).join("")}</div>`;
  const out = [];                                          /* (HOME in EDITAR: one bento, a look at all of it) */
  pages.forEach((p) => {
    if (isAway(p)) return;
    const kind = GRAPH[p.title], used = kind ? GUSE[kind] : [];
    if (kind) out.push(module(p, kind));
    live(p.ids).filter(({ k }) => !used.includes(k)).forEach(({ id, k }) => out.push(tileP(p.s, id, k, p.title)));
  });
  return `<div class="bento">${out.join("")}</div>`;
}

