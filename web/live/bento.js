/* ------------------------------------------------------------------ bento --- */
/* The folders, EDITAR and RÁPIDO as a bento grid (12 columns), not the device's pages of four: a page with a graph is a
   large module and the graph is the control (drag it), with what it draws under it; every other parameter is a tile of
   its own, sized by what it is (a switch small, a choice of up to four as its options, a value as a fader you slide
   sideways). A parameter keeps the colour of the knob that turns it on its page; its page's name is in its corner. */
const GRAPH = { ENV: "env", "ENV 2": "env", LFO: "lfo", "LFO 2": "lfo", "LFO 3": "lfo", FILTER: "filt", FX: "meters", MACROS: "meters",
  HOME: "arcs", DLY: "echo", REVERB: "verb", "EQ+COMP": "eq" };
/* what each graph draws (its page's knobs, by position): those are its readouts; the rest of the page, tiles */
const GUSE = { env: [0, 1, 2, 3], lfo: [0, 1], filt: [0], meters: [0, 1, 2, 3], arcs: [0, 1, 2, 3], echo: [0, 1, 2, 3], verb: [1, 2, 3], eq: [0, 1, 2] };
const live = (ids) => ids.map((id, k) => ({ id, k })).filter((x) => x.id < 127);
const isOnOff = (d) => d && (d.fmt === F.ONOFF || (d.fmt === F.ENUM && d.names.length === 2 && d.names[0] === "OFF"));
const isEnum = (d) => d && d.fmt === F.ENUM;
const ff = (s, id) => (desc(s, id) ? frac(desc(s, id), val(s, id)) : 0);

/* ---- the graphs (SVG in 0..1 units, stretched; their handles are HTML so they keep their shape) */
function gEnv(s, ids) {
  const [a, d, su, r] = ids.map((id) => (id < 127 ? ff(s, id) : 0));
  const xa = .02 + a * .24, xd = xa + .02 + d * .24, ys = .08 + (1 - su) * .84, xr = .76 + r * .22;
  const pts = [[0, .96], [xa, .06], [xd, ys], [.76, ys], [xr, .96]];
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" ");
  return { svg: `<path d="${path} L${xr} 1 L0 1Z" class="fill"/><path d="${path}" class="line"/>`,
    handles: [["a", xa, .06, 0], ["d", xd, ys, 1], ["s", .76, ys, 2], ["r", xr, .96, 3]] };
}
function lfoY(w, t) { const u = t % 1; return w === 0 ? Math.sin(u * 2 * Math.PI) : w === 1 ? (u < .5 ? u * 4 - 1 : 3 - u * 4) : w === 2 ? 1 - u * 2 : w === 3 ? (u < .5 ? 1 : -1) : [.6, -.2, .9, -.7, .3, -.9, .1, .7][Math.floor(t * 2) % 8]; }
function gLfo(s, ids) {
  const w = ids[1] < 127 ? val(s, ids[1]) : 0, cyc = 1 + Math.round(ff(s, ids[0]) * 5);
  let p = "";
  for (let i = 0; i <= 160; i++) { const x = i / 160; p += `${i ? "L" : "M"}${x} ${.5 - lfoY(w, x * cyc) * .4}`; }
  return { svg: `<line x1="0" y1=".5" x2="1" y2=".5" class="axis"/><path d="${p}" class="line"/><line class="ph" x1="0" y1="0" x2="0" y2="1"/>`, handles: [], cyc };
}
function gFilt(s, ids) {
  const id = ids[0], v = val(s, id), d = desc(s, id), f = d ? (v - d.min) / (d.max - d.min) : .5;
  const lp = v < 0 ? 1 + v / 64 : 1, hp = v > 0 ? v / 63 : 0;
  let p = "";
  for (let i = 0; i <= 100; i++) { const x = i / 100; let y = .3; if (x > lp) y += (x - lp) * 2.6; if (x < hp) y += (hp - x) * 2.6; p += `${i ? "L" : "M"}${x} ${Math.min(1, y)}`; }
  return { svg: `<line x1=".5" y1="0" x2=".5" y2="1" class="axis"/><path d="${p} L1 1 L0 1Z" class="fill"/><path d="${p}" class="line"/>`, handles: [["f", f, .3, 0]] };
}
function gEcho(s, ids) {
  const t = ids[0] < 127 ? val(s, ids[0]) : 1, fb = ff(s, ids[1]), mix = ids[3] < 127 ? ff(s, ids[3]) : .5, gap = .08 + (t % 8) * .03;
  let h = "";
  for (let i = 0, a = .9 * mix + .1; i < 14 && i * gap < 1; i++, a *= .25 + fb * .7) h += `<rect x="${i * gap}" y="${1 - a * .9}" width="${gap * .45}" height="${a * .9}" class="${i ? "bar" : "bar0"}"/>`;
  return { svg: h, handles: [] };
}
function gVerb(s, ids) {
  const size = ff(s, ids[1]), damp = ff(s, ids[2]), pre = ids[3] < 127 ? ff(s, ids[3]) : 0, x0 = .02 + pre * .18, len = .25 + size * .7;
  let p = `M0 1 L${x0} 1 L${x0 + .01} .1`;
  for (let i = 1; i <= 60; i++) { const x = x0 + .01 + (i / 60) * len; p += ` L${Math.min(1, x)} ${1 - .9 * Math.exp(-i / 60 * (2 + damp * 5))}`; }
  return { svg: `<path d="${p} L1 1Z" class="fill"/><path d="${p}" class="line"/>`, handles: [] };
}
function gEq(s, ids) {
  const b = [0, 1, 2].map((k) => (ids[k] < 127 && desc(s, ids[k]) ? (val(s, ids[k]) - (desc(s, ids[k]).min + desc(s, ids[k]).max) / 2) / ((desc(s, ids[k]).max - desc(s, ids[k]).min) / 2) : 0));
  let p = "";
  for (let i = 0; i <= 100; i++) { const x = i / 100, y = .5 - .38 * (b[0] / (1 + Math.exp((x - .22) * 18)) + b[1] * Math.exp(-((x - .5) ** 2) * 40) + b[2] / (1 + Math.exp(-(x - .78) * 18))); p += `${i ? "L" : "M"}${x} ${y}`; }
  return { svg: `<line x1="0" y1=".5" x2="1" y2=".5" class="axis"/><path d="${p}" class="line"/>`, handles: [] };
}
function gMeters(s, ids, toggles) {
  return live(ids).map(({ id, k }) => { const d = desc(s, id); if (!d) return ""; const f = frac(d, val(s, id)), [t, u] = fmtValue(d, val(s, id));
    const q = toggles && QSPEC.get(keyOf(s, id)), off = q && !qOn(q);
    return `<div class="mt${off ? " off" : ""}" style="--c:${KC[k]}" data-mt="${keyOf(s, id)}"><span class="mv num">${esc(t)}<small>${esc(u)}</small></span>
      <div class="mtr" data-drag="v" data-k="${keyOf(s, id)}"><b style="height:${f * 100}%"></b></div>
      ${q ? `<button class="ml" data-qtog="${keyOf(s, id)}" role="switch" aria-checked="${!off}">${esc(q.name)}</button>` : `<span class="ml">${esc(d.label)}</span>`}</div>`; }).join("");
}
function gArcs(s, ids) {
  return live(ids).map(({ id, k }) => { const d = desc(s, id); if (!d) return ""; const v = val(s, id), a = frac(d, v), z = d.min < 0 && d.max > 0 ? -d.min / (d.max - d.min) : 0;
    const r = 38, c = 2 * Math.PI * r, sp = c * .75, lo = Math.min(a, z), hi = Math.max(a, z), [t, u] = fmtValue(d, v);
    return `<div class="arc" data-drag="v" data-k="${keyOf(s, id)}" style="--c:${KC[k]}"><svg viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="${r}" fill="none" stroke="var(--raised)" stroke-width="9" stroke-linecap="butt" stroke-dasharray="${sp} ${c}" transform="rotate(135 48 48)"/>
      <circle cx="48" cy="48" r="${r}" fill="none" stroke="${KH[k]}" stroke-width="9" stroke-linecap="butt" stroke-dasharray="${Math.max(.1, (hi - lo) * sp)} ${c}" stroke-dashoffset="${-lo * sp}" transform="rotate(135 48 48)"/></svg>
      <span class="av num">${esc(t)}<small>${esc(u)}</small></span><span class="al"><i></i>${esc(d.label)}</span></div>`; }).join("");
}
function graphHtml(kind, s, ids, opt = {}) {
  if (kind === "meters") return `<div class="meters">${gMeters(s, ids, opt.toggles)}</div>`;
  if (kind === "arcs") return `<div class="arcs">${gArcs(s, ids)}</div>`;
  const g = { env: gEnv, lfo: gLfo, filt: gFilt, echo: gEcho, verb: gVerb, eq: gEq }[kind](s, ids);
  return `<div class="gin"><svg class="gs" viewBox="0 0 1 1" preserveAspectRatio="none">${g.svg}</svg>` +
    g.handles.map(([h, x, y, k]) => `<span class="hd" data-h="${h}" style="left:${x * 100}%;top:${y * 100}%;--c:${KC[k]}"></span>`).join("") +
    (kind === "lfo" ? `<span class="lfoph" data-cyc="${g.cyc}"></span>` : "") + `</div>`;
}

/* ---- a value's fill: from its zero (the middle when it goes both ways) to where it is */
const zeroOf = (d) => (d.min < 0 && d.max > 0 ? -d.min / (d.max - d.min) : 0);
function fillVars(d, v) { const f = frac(d, v), z = zeroOf(d); return `--lo:${Math.min(f, z)};--hi:${Math.max(f, z)};--f:${f}`; }
const isChoice = (d) => isEnum(d) || isOnOff(d);
const nextOf = (d, v) => (v >= d.max ? d.min : v + 1);
const valHtml = (d, v) => { const [t, u] = fmtValue(d, v); return `${esc(t)}${u ? `<small>${esc(u)}</small>` : ""}`; };

/* a graph's readout: a value slides sideways, a choice steps on a tap */
function readout(s, id, k) {
  const d = desc(s, id); if (!d) return "";
  const v = val(s, id), key = keyOf(s, id), lab = `<span class="rl"><i></i>${esc(d.label)}</span>`;
  if (isChoice(d)) return `<button class="ro ch" style="--c:${KC[k]}" data-cell="${key}" data-ro="${k}" data-set="${key}" data-v="${nextOf(d, v)}" aria-label="${esc(d.label)}: ${esc(fmtValue(d, v)[0])}, tocar para cambiar">${lab}<span class="rv num">${valHtml(d, v)}</span></button>`;
  return `<div class="ro" style="--c:${KC[k]};${fillVars(d, v)}" data-cell="${key}" data-ro="${k}" data-fd="${key}" role="slider" tabindex="0" aria-label="${esc(d.label)}" aria-valuenow="${v}" aria-valuemin="${d.min}" aria-valuemax="${d.max}">${lab}<span class="rv num">${valHtml(d, v)}</span><span class="rf"></span></div>`;
}

/* a parameter's tile, by what it is */
function tileP(s, id, k, pt) {
  const d = desc(s, id); if (!d) return "";
  const v = val(s, id), key = keyOf(s, id), lv = devLive(S.folder, pt) ? " dev" : "", at = `style="--c:${KC[k]}${isChoice(d) ? "" : ";" + fillVars(d, v)}" data-cell="${key}" data-kk="${k}" data-title="${esc(pt)}"`;
  const top = `<span class="tt"><span class="tlb"><i></i>${esc(d.label)}</span><span class="pg">${esc(pt)}</span></span>`;
  if (isOnOff(d)) { const on = v !== d.min;
    return `<button class="tp t-sw${on ? " on" : ""}${lv}" ${at} role="switch" aria-checked="${on}" data-set="${key}" data-v="${on ? d.min : d.max}" aria-label="${esc(d.label)}">${top}<span class="tv num">${valHtml(d, v)}</span><span class="knob" aria-hidden="true"></span></button>`; }
  const opts = () => d.names.map((n, i) => `<button role="radio" aria-checked="${i + d.min === v}" data-set="${key}" data-v="${i + d.min}">${esc(n)}</button>`).join("");
  if (isEnum(d) && d.names.length <= 2) return `<div class="tp t-two${lv}" ${at}>${top}<div class="opts" role="radiogroup" aria-label="${esc(d.label)}">${opts()}</div></div>`;
  if (isEnum(d) && d.names.length <= 4) return `<div class="tp t-seg${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span><div class="opts" role="radiogroup" aria-label="${esc(d.label)}">${opts()}</div></div>`;
  if (isEnum(d)) return `<div class="tp t-arr${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span><span class="pos num">${v - d.min + 1}/${d.max - d.min + 1}</span>
    <div class="arw"><button data-set="${key}" data-v="${v <= d.min ? d.max : v - 1}" aria-label="${esc(d.label)}: anterior"><svg class="i"><use href="#i-prev"/></svg></button><button data-set="${key}" data-v="${nextOf(d, v)}" aria-label="${esc(d.label)}: siguiente"><svg class="i"><use href="#i-next"/></svg></button></div></div>`;
  if (d.max <= d.min) return `<div class="tp${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span></div>`;   /* (a reading: CPU) */
  return `<div class="tp t-fd${zeroOf(d) ? " t-bi" : ""}${lv}" ${at} data-fd="${key}" role="slider" tabindex="0" aria-label="${esc(d.label)}" aria-valuenow="${v}" aria-valuemin="${d.min}" aria-valuemax="${d.max}">${top}<span class="tv num">${valHtml(d, v)}</span><span class="fl" aria-hidden="true"></span></div>`;
}

/* ---- a module: a page's graph, large, and its readouts */
function devLive(folder, title) { return M.page && !M.page.home && FAM[M.page.fam] === folder && M.page.title === title; }
function module(p, kind, opt = {}) {
  const lv = p.folder === "HOME" ? !!(M.page && M.page.home) : devLive(p.folder, p.title);
  const ro = kind === "meters" || kind === "arcs" ? "" : `<div class="ros">${GUSE[kind].filter((k) => p.ids[k] < 127).map((k) => readout(p.s, p.ids[k], k)).join("")}</div>`;
  return `<section class="bx g-${kind}${lv ? " dev" : ""}${opt.cls ? " " + opt.cls : ""}" data-title="${esc(p.title)}" data-g="${kind}">
    <header><h3><svg class="i"><use href="#i-${ICON[p.folder] || "edit"}"/></svg>${esc(opt.name || p.title)}</h3>${lv ? `<span class="live2">En el sinte</span>` : opt.hint ? `<span class="hint2">${esc(opt.hint)}</span>` : ""}</header>
    <div class="gr" data-gr="${kind}" data-s="${p.s}" data-ids="${p.ids.join(",")}"${opt.toggles ? ' data-toggles="1"' : ""}>${graphHtml(kind, p.s, p.ids, opt)}</div>${ro}</section>`;
}
function pagesOf(folder) {
  if (folder === "HOME") return [{ title: "HOME", folder: "HOME", s: 0, ids: M.homeIds }, ...["ENV", "FILTER", "LFO", "FX", "MACROS"].map((t) => { const x = LAYOUT.find((y) => y.title === t); return { title: t, folder: x.folder, s: x.scope, ids: x.ids }; })];
  return LAYOUT.filter((x) => x.folder === folder).map((x) => ({ title: x.title, folder, s: x.scope, ids: x.ids }));
}
function bentoView(folder) {
  const out = [], away = [];
  pagesOf(folder).forEach((p) => {
    const cells = live(p.ids);
    if (p.scope === 2 || p.title === "TOOLS" || !cells.length) { away.push(p.title); return; }
    const kind = GRAPH[p.title], used = kind ? GUSE[kind] : [];
    if (kind) out.push(module(p, kind));
    cells.filter(({ k }) => !used.includes(k)).forEach(({ id, k }) => out.push(tileP(p.s, id, k, p.title)));
  });
  if (away.length) out.push(`<section class="tp away"><span class="tt"><span class="tlb">${esc(away.join(", "))}</span></span><p>${away.length > 1 ? "Se editan" : "Se edita"} en el sinte o en Estudio.</p>
    <a class="go2" href="${STUDIO_URL}">Abrir Estudio<svg class="i"><use href="#i-next"/></svg></a></section>`);
  return `<div class="bento">${out.join("")}</div>${folder === "SEQ" ? `<p class="note">Las notas del patrón se editan en Estudio, en el secuenciador.</p>` : ""}`;
}

/* ---- RÁPIDO as a bento: the sweep filter and the sends large, the switches around them */
function quickBento() {
  const T = (id, s = 0) => QSPEC.get(keyOf(s, id));
  const box = (q, size) => `<div class="qb ${size}">${tile(q)}</div>`;
  return `<div class="qhead"><h2>Rápido</h2><button class="more" data-mode-go="edit">Editar más<svg class="i"><use href="#i-next"/></svg></button></div>
  <div class="bento quick2">
    ${module({ title: "FILTER", folder: "FX", s: 0, ids: [50, 127, 127, 127] }, "filt", { cls: "q-filt", name: "Filtro", hint: "LP ← OFF → HP" })}
    ${module({ title: "FX", folder: "FX", s: 0, ids: [33, 34, 35, 36] }, "meters", { cls: "q-fx", name: "Efectos", hint: "Toca el nombre para encender o apagar", toggles: true })}
    ${box(T(17), "q-arp")}${box(T(28), "q-tr")}${box(T(0, 1), "q-tempo")}${box(T(-1), "q-panic")}
    ${box(T(23), "q-s")}${box(T(49), "q-s")}${box(T(27), "q-s")}${box(T(37), "q-s")}${box(T(38), "q-s")}${box(T(78), "q-s")}
  </div>`;
}

/* ---- painting: a value changed; what shows it redraws (a fader a finger holds only moves) */
let bdrag = null;
function paintCards(s, id) {
  const key = keyOf(s, id);
  document.querySelectorAll("#edit .gr[data-gr]").forEach((gr) => {
    const ids = gr.dataset.ids.split(",").map(Number);
    if (+gr.dataset.s !== s || !ids.includes(id)) return;
    if (gr.dataset.gr === "meters" || gr.dataset.gr === "arcs") {
      gr.querySelectorAll(gr.dataset.gr === "meters" ? ".mt" : ".arc").forEach((el) => {
        const kk = gr.dataset.gr === "meters" ? el.dataset.mt : el.dataset.k;
        if (kk !== key) return;
        const d = desc(s, id), f = frac(d, val(s, id));
        if (gr.dataset.gr === "meters") { el.querySelector(".mtr b").style.height = f * 100 + "%"; el.querySelector(".mv").innerHTML = valHtml(d, val(s, id)); const q = gr.dataset.toggles && QSPEC.get(kk); if (q) { el.classList.toggle("off", !qOn(q)); el.querySelector(".ml").setAttribute("aria-checked", qOn(q)); } }
        else { const tmp = document.createElement("div"); tmp.innerHTML = gArcs(s, ids.map((x) => (x === id ? x : 127))); const nn = tmp.querySelector(".arc"); el.querySelector("svg").replaceWith(nn.querySelector("svg")); el.querySelector(".av").innerHTML = nn.querySelector(".av").innerHTML; }
      });
    } else gr.innerHTML = graphHtml(gr.dataset.gr, s, ids);
  });
  document.querySelectorAll(`#edit [data-cell="${key}"]`).forEach((el) => {
    const d = desc(s, id), v = val(s, id);
    if (el.dataset.fd) {                                   /* a fader: in place, so a finger on it keeps it */
      const f = frac(d, v), z = zeroOf(d);
      el.style.setProperty("--lo", Math.min(f, z)); el.style.setProperty("--hi", Math.max(f, z)); el.style.setProperty("--f", f);
      el.querySelector(el.classList.contains("ro") ? ".rv" : ".tv").innerHTML = valHtml(d, v); el.setAttribute("aria-valuenow", v);
    } else el.outerHTML = el.classList.contains("ro") ? readout(s, id, +el.dataset.ro) : tileP(s, id, +el.dataset.kk, el.dataset.title);
  });
}

/* ---- touch. Faders and readouts slide sideways from where they are (a vertical swipe still scrolls the page); the
   graphs' handles, the meters and the dials take the finger outright */
$("edit").addEventListener("pointerdown", (e) => {
  const hd = e.target.closest(".hd"), gr = e.target.closest(".gr[data-gr]"), mtr = e.target.closest(".mtr[data-k]"), arc = e.target.closest(".arc[data-k]"), fd = e.target.closest("[data-fd]");
  if (hd || (gr && (gr.dataset.gr === "filt" || gr.dataset.gr === "lfo") && !fd)) {
    const g = (hd || gr).closest(".gr"), gin = g.querySelector(".gin");
    bdrag = { el: g, gin, kind: g.dataset.gr, h: hd ? hd.dataset.h : g.dataset.gr === "filt" ? "f" : "l", s: +g.dataset.s, ids: g.dataset.ids.split(",").map(Number), x0: e.clientX, v0: null, on: true };
    if (bdrag.h === "l") bdrag.v0 = val(bdrag.s, bdrag.ids[0]);
    g.setPointerCapture(e.pointerId); e.preventDefault(); graphDrag(e); return;
  }
  const el = mtr || arc || fd; if (!el) return;
  const [s, id] = (el.dataset.k || el.dataset.fd).split(":").map(Number), d = desc(s, id); if (!d) return;
  bdrag = { el, dir: mtr ? "abs" : arc ? "v" : "h", s, id, d, x0: e.clientX, y0: e.clientY, v0: val(s, id), on: !fd, pid: e.pointerId };
  if (!fd) { el.setPointerCapture(e.pointerId); e.preventDefault(); if (mtr) barAt(e); }
});
$("edit").addEventListener("pointermove", (e) => {
  if (!bdrag) return;
  if (bdrag.kind) { graphDrag(e); return; }
  const dx = e.clientX - bdrag.x0, dy = bdrag.y0 - e.clientY;
  if (!bdrag.on) {                                       /* a fader: it is a slide once it goes sideways */
    if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) return;
    bdrag.on = true; bdrag.x0 = e.clientX; bdrag.el.classList.add("held");
    try { bdrag.el.setPointerCapture(bdrag.pid); } catch (er) { /* (gone) */ }
    return;
  }
  const span = bdrag.d.max - bdrag.d.min;
  if (bdrag.dir === "abs") barAt(e);
  else if (bdrag.dir === "v") setVal(bdrag.s, bdrag.id, bdrag.v0 + dy * span / 220);
  else setVal(bdrag.s, bdrag.id, bdrag.v0 + dx * span / Math.max(220, bdrag.el.getBoundingClientRect().width * 1.4));
});
const bend = () => { if (bdrag && bdrag.el) bdrag.el.classList.remove("held"); bdrag = null; };
$("edit").addEventListener("pointerup", bend); $("edit").addEventListener("pointercancel", bend);
function barAt(e) {
  const r = bdrag.el.getBoundingClientRect(), d = bdrag.d;
  setVal(bdrag.s, bdrag.id, d.min + Math.max(0, Math.min(1, 1 - (e.clientY - r.top) / r.height)) * (d.max - d.min));
}
function graphDrag(e) {
  const r = (bdrag.gin || bdrag.el).getBoundingClientRect(), x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
  const s = bdrag.s, ids = bdrag.ids, put = (k, f) => { const id = ids[k], d = id < 127 && desc(s, id); if (d) setVal(s, id, d.min + Math.max(0, Math.min(1, f)) * (d.max - d.min)); };
  if (bdrag.h === "f") put(0, x);
  else if (bdrag.h === "l") { const d = desc(s, ids[0]); if (d) setVal(s, ids[0], bdrag.v0 + (e.clientX - bdrag.x0) / r.width * (d.max - d.min)); }
  else if (bdrag.h === "a") put(0, (x - .02) / .24);
  else if (bdrag.h === "d") { const xa = .02 + ff(s, ids[0]) * .24; put(1, (x - xa - .02) / .24); put(2, 1 - (y - .08) / .84); }
  else if (bdrag.h === "s") put(2, 1 - (y - .08) / .84);
  else if (bdrag.h === "r") put(3, (x - .76) / .22);
}
$("edit").addEventListener("click", (e) => {
  const b = e.target.closest("[data-set]"); if (!b) return;
  const [s, id] = b.dataset.set.split(":").map(Number);
  setVal(s, id, +b.dataset.v);
});
$("edit").addEventListener("keydown", (e) => {
  const el = e.target.closest("[data-fd]"), st = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 8, PageDown: -8 }[e.key];
  if (!el || !st) return; e.preventDefault();
  const [s, id] = el.dataset.fd.split(":").map(Number); setVal(s, id, val(s, id) + st);
});
/* the LFOs' playheads, at their rate */
(function lfoLoop(tm) {
  document.querySelectorAll(".gr[data-gr='lfo']").forEach((g) => {
    const ids = g.dataset.ids.split(",").map(Number), s = +g.dataset.s, ph = g.querySelector(".lfoph"); if (!ph) return;
    const hz = desc(s, ids[0]) ? 0.05 * Math.pow(800, (val(s, ids[0]) & 127) / 127) : 1, cyc = +ph.dataset.cyc || 1;
    const x = ((tm / 1000) * Math.min(hz, 6) / cyc) % 1, w = ids[1] < 127 ? val(s, ids[1]) : 0;
    ph.style.left = x * 100 + "%"; ph.style.top = (.5 - lfoY(w, x * cyc) * .4) * 100 + "%";
  });
  requestAnimationFrame(lfoLoop);
})(0);
