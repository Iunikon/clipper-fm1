/* ---- a value's fill: from its zero (the middle when it goes both ways) to where it is */
const zeroOf = (d) => (d.min < 0 && d.max > 0 ? -d.min / (d.max - d.min) : 0);
function fillVars(d, v) { const f = frac(d, v), z = zeroOf(d); return `--lo:${Math.min(f, z)};--hi:${Math.max(f, z)};--f:${f}`; }
const isChoice = (d) => isEnum(d) || isOnOff(d);
const nextOf = (d, v) => (v >= d.max ? d.min : v + 1);
const valHtml = (d, v) => { let [t, u] = fmtValue(d, v); if (d.min < 0 && d.max > 0 && /^\d/.test(t)) t = "+" + t;   /* bipolar: signed */
  return `${esc(t)}${u ? `<small>${esc(u)}</small>` : ""}`; };

/* a graph's readout: a value slides sideways, a choice steps on a tap */
function readout(s, id, k) {
  const d = desc(s, id); if (!d) return "";
  const v = val(s, id), key = keyOf(s, id), lab = `<span class="rl"><i></i>${esc(d.label)}</span>`;
  if (isChoice(d)) return `<button class="ro ch" style="--c:${KC[k]}" data-cell="${key}" data-ro="${k}" data-set="${key}" data-v="${nextOf(d, v)}" aria-label="${esc(d.label)}: ${esc(fmtValue(d, v)[0])}, tocar para cambiar">${lab}<span class="rv num">${valHtml(d, v)}</span></button>`;
  return `<div class="ro" style="--c:${KC[k]};${fillVars(d, v)}" data-cell="${key}" data-ro="${k}" data-fd="${key}" role="slider" tabindex="0" aria-label="${esc(d.label)}" aria-valuenow="${v}" aria-valuemin="${d.min}" aria-valuemax="${d.max}">${lab}<span class="rv num">${valHtml(d, v)}</span><span class="rf"></span></div>`;
}

/* a parameter's tile, by what it is */
function tileP(s, id, k, pt, tag = pt) {
  const d = desc(s, id); if (!d) return "";
  const v = val(s, id), key = keyOf(s, id), lv = devLive(S.folder, pt) ? " dev" : "", at = `style="--c:${KC[k]}${isChoice(d) ? "" : ";" + fillVars(d, v)}" data-cell="${key}" data-kk="${k}" data-title="${esc(pt)}" data-tag="${tag ? 1 : 0}"`;
  const top = `<span class="tt"><span class="tlb"><i></i>${esc(d.label)}</span>${tag ? `<span class="pg">${esc(pt)}</span>` : ""}</span>`;
  if (typeof isGo === "function" && isGo(d)) return `<button class="tp t-go${lv}" ${at} data-set="${key}" data-v="${d.max}"><span class="tt"><span class="tlb"><i></i>${esc(d.label)}</span></span><span class="tv">GO</span></button>`;   /* (RAND, BACK, SET A, SWAP…: an action) */
  if (isOnOff(d)) { const on = v !== d.min;
    return `<button class="tp t-sw${on ? " on" : ""}${lv}" ${at} role="switch" aria-checked="${on}" data-set="${key}" data-v="${on ? d.min : d.max}" aria-label="${esc(d.label)}">${top}<span class="tv num">${valHtml(d, v)}</span><span class="knob" aria-hidden="true"></span></button>`; }
  const opts = () => d.names.map((n, i) => `<button role="radio" aria-checked="${i + d.min === v}" data-set="${key}" data-v="${i + d.min}">${esc(n)}</button>`).join("");
  if (isEnum(d) && d.names.length <= 2) return `<div class="tp t-two${lv}" ${at}>${top}<div class="opts" role="radiogroup" aria-label="${esc(d.label)}">${opts()}</div></div>`;
  if (isEnum(d) && d.names.length <= 4) return `<div class="tp t-seg${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span><div class="opts" role="radiogroup" aria-label="${esc(d.label)}">${opts()}</div></div>`;
  if (isEnum(d)) return `<div class="tp t-arr${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span><span class="pos num">${v - d.min + 1}/${d.max - d.min + 1}</span>
    <div class="arw"><button data-set="${key}" data-v="${v <= d.min ? d.max : v - 1}" aria-label="${esc(d.label)}: anterior"><svg class="i"><use href="#i-prev"/></svg></button><button class="pkb" data-pick="${key}" aria-label="${esc(d.label)}: lista"><svg class="i"><use href="#i-list"/></svg></button><button data-set="${key}" data-v="${nextOf(d, v)}" aria-label="${esc(d.label)}: siguiente"><svg class="i"><use href="#i-next"/></svg></button></div></div>`;
  if (d.max <= d.min && d.label === "CPU" && M.state) return `<div class="tp${lv}" ${at}>${top}<span class="tv num">${M.state.cpu}<small>%</small></span><span class="pos2 num">LATE ${M.state.late}  PEAK ${M.state.peak}%</span></div>`;   /* (SYSTEM's reading: STATE) */
  if (d.max <= d.min) return `<div class="tp${lv}" ${at}>${top}<span class="tv num">${valHtml(d, v)}</span></div>`;   /* (a reading) */
  return `<div class="tp t-fd${zeroOf(d) ? " t-bi" : ""}${lv}" ${at} data-fd="${key}" role="slider" tabindex="0" aria-label="${esc(d.label)}" aria-valuenow="${v}" aria-valuemin="${d.min}" aria-valuemax="${d.max}">${top}<span class="tv num">${valHtml(d, v)}</span><span class="fl" aria-hidden="true"></span></div>`;
}

/* ---- a module: a page's graph, large, and its readouts */
function devLive(folder, title) { return M.page && !M.page.home && FAM[M.page.fam] === folder && M.page.title === title; }
function module(p, kind, opt = {}) {
  const lv = opt.nolive ? false : p.folder === "HOME" ? !!(M.page && M.page.home) : devLive(p.folder, p.title);
  const ro = kind === "meters" || kind === "arcs" ? "" : `<div class="ros">${GUSE[kind].filter((k) => p.ids[k] < 127).map((k) => readout(p.s, p.ids[k], k)).join("")}</div>`;
  return `<section class="bx g-${kind}${lv ? " dev" : ""}${opt.cls ? " " + opt.cls : ""}" data-title="${esc(p.title)}" data-g="${kind}">
    ${opt.bare && !lv ? "" : `<header>${opt.bare ? "<span></span>" : `<h3><svg class="i"><use href="#i-${ICON[p.folder] || "edit"}"/></svg>${esc(opt.name || p.title)}</h3>`}${lv ? `<span class="live2">En el sinte</span>` : opt.hint ? `<span class="hint2">${esc(opt.hint)}</span>` : ""}</header>`}
    <div class="gr" data-gr="${kind}" data-s="${p.s}" data-ids="${p.ids.join(",")}"${opt.toggles ? ' data-toggles="1"' : ""}>${graphHtml(kind, p.s, p.ids, opt)}</div>${ro}</section>`;
}
function pagesOf(folder) {
  if (folder === "HOME") return [{ title: "HOME", folder: "HOME", s: 0, ids: M.homeIds }, ...["ENV", "FILTER", "LFO", "FX", "MACROS"].map((t) => { const x = LAYOUT.find((y) => y.title === t); return { title: t, folder: x.folder, s: x.scope, ids: x.ids }; })];
  return LAYOUT.filter((x) => x.folder === folder && pageOn(x)).map((x) => ({ title: x.title, folder, s: x.scope, ids: x.ids }));
}
/* a folder in blocks: an effect, an LFO, an envelope… each with its pages (named by its first, as on the device) */
const BLOCKS = {
  ENV: [["ENV", "ENV DEST"], ["ENV 2", "ENV 2 LOOP"]],
  LFO: [["LFO", "LFO DEST"], ["LFO 2"], ["LFO 3"], ["MOD", "MOD SEQ 2", "MATRIX", "MOD SEQ"]],
  FX: [["FX"], ["FILTER"], ["INSERT", "INSERT 2"], ["DLY", "DLY 2"], ["REVERB"], ["CHORUS"], ["EQ+COMP"]],
  EDIT: [["EDIT 1"], ["MACROS", "EDIT 2"], ["VOICE", "VOICE 2", "VOICE 3"], ["LAYER", "LAYER 2", "MORPH", "RANDOM", "UNDO"]],
  ARP: [["ARP", "ARP 2"], ["SPICE"]],
  GLO: [["GLOBAL"], ["MASTER"], ["SYSTEM", "TUNING", "MIDI", "MIDI 2"]],
};
function blocksOf(folder, pages) {
  const def = BLOCKS[folder] || [], seen = new Set(), out = [];
  def.forEach((titles) => { const ps = titles.map((t) => pages.find((p) => p.title === t)).filter(Boolean); ps.forEach((p) => seen.add(p)); if (ps.length) out.push(ps); });
  pages.filter((p) => !seen.has(p)).forEach((p) => out.push([p]));
  return out;
}
const isAway = (p) => p.scope === 2 || p.title === "TOOLS" || !live(p.ids).length;
function block(ps) {
  const mods = [], tiles = [], rows = [], awayAll = ps.filter(isAway).map((p) => p.title);
  const extras = awayAll.filter((t) => EXTRA[t]).map((t) => EXTRA[t]()).join("");
  const away = awayAll.filter((t) => !EXTRA[t] && !HIDE.has(t) && t !== "TOOLS");
  ps.filter((p) => !isAway(p)).forEach((p) => {
    const kind = GRAPH[p.title], used = kind ? GUSE[kind] : [];
    if (kind) mods.push(module(p, kind, { bare: p.title === ps[0].title }));
    live(p.ids).filter(({ k }) => !used.includes(k)).forEach(({ id, k }) => rows.push({ s: p.s, id, k, t: p.title }));
  });
  const pgs = [...new Set(rows.map((r) => r.t))], many = pgs.length > 1;   /* a single page: its name goes in the header, not on every tile */
  rows.forEach((r) => tiles.push(tileP(r.s, r.id, r.k, r.t, many)));
  const sub = !many && pgs.length && pgs[0] !== ps[0].title ? `<span class="bpg">${esc(pgs[0])}</span>` : "";
  const awayTxt = away.length ? `${esc(away.join(", "))}: solo en el sinte. El FM-1 no los publica y el editor tampoco tiene comando para ellos.` : "";
  if (awayTxt && (mods.length || rows.length)) tiles.push(`<section class="tp away"><p>${awayTxt}</p></section>`);
  if (!mods.length && !tiles.length) return extras + (awayTxt ? `<p class="pce">${awayTxt}</p>` : "");   /* nothing of its own: a note, not another header */
  const lay = mods.length && tiles.length ? "side" : mods.length ? "solo" : "flat";
  return `<section class="blk" data-blk="${esc(ps[0].title)}"><header class="bh"><h2><svg class="i"><use href="#i-${ICON[ps[0].folder] || "edit"}"/></svg>${esc(ps[0].title)}</h2>${sub}</header>
    <div class="bb ${lay}">${mods.join("")}${tiles.length ? `<div class="tz${tiles.length === 1 ? " one" : ""}">${tiles.join("")}</div>` : ""}</div></section>${extras}`;
}
