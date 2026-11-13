/* ---- the graphs, drawn as the FM-1 draws them (ui_draw.c): its 240 x 100 strip stretched, one thin line in the curve's
   colour, no fill, a rule at the foot. The handles are HTML (so they stay square), small; their reach is larger */
const GW = 240, GH = 100;
const pts = (a) => a.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
const rule = (y) => `<line x1="0" y1="${y}" x2="${GW}" y2="${y}" class="axis"/>`;
const raw = (s, id) => (id < 127 && desc(s, id) ? val(s, id) : 0);
/* graph_adsr: attack linear; decay and release exponential (k^n = e^-4.6: ~99 % in the set time), as voice.c */
function envShape(A, D, S, R) {
  const a = 4 + A * 50 / 127, d = 6 + D * 50 / 127, r = 6 + R * 60 / 127, top = 8, bot = 90, sus = S / 127;
  const x1 = 6 + a, x3 = 232 - r, Y = (l) => bot - l * (bot - top), p = [[6, bot], [x1, top]];
  let e = 1, n = Math.ceil(d), l = 1;
  for (let i = 1; i <= n; i++) { e *= 1 - 4.6 / d; l = sus + (1 - sus) * e; p.push([x1 + Math.min(i, d), Y(l)]); }
  const xd = x1 + d, yd = Y(l);
  p.push([x3, Y(sus)]);
  e = 1; n = Math.ceil(r);
  for (let i = 1; i <= n; i++) { e *= 1 - 4.6 / r; p.push([x3 + Math.min(i, r), Y(sus * e)]); }
  return { p, x1, xd, yd, x3, ys: Y(sus), top, bot };
}
function gEnv(s, ids) {
  const g = envShape(raw(s, ids[0]), raw(s, ids[1]), raw(s, ids[2]), raw(s, ids[3]));
  return { svg: rule(g.bot + 1) + `<path d="${pts(g.p)}" class="line"/>`,
    handles: [["a", g.x1, g.top, 0], ["d", g.xd, g.yd, 1], ["s", (g.xd + g.x3) / 2, g.ys, 2], ["r", g.x3, g.ys, 3]] };
}
/* graph_lfo: two cycles across, from the LFO's PHASE; S&H a random step every 20 px (voice.c lfo_wave_n) */
function lfoAt(w, ph) {
  const u = ((ph % 1) + 1) % 1;
  return w === 1 ? (u < .5 ? u * 4 - 1 : 3 - u * 4) : w === 2 ? u * 2 - 1 : w === 3 ? (u < .5 ? 1 : -1) : Math.sin(u * 2 * Math.PI);
}
const phsOf = (s, ids) => (ids[2] < 127 && desc(s, ids[2]) && desc(s, ids[2]).label === "PHS" ? 2 : -1);
function gLfo(s, ids) {
  const w = raw(s, ids[1]), k = phsOf(s, ids), ph0 = k >= 0 ? raw(s, ids[k]) / 128 : 0, p = [];
  for (let x = 0; x < GW; x++) {
    const y = w === 4 ? (((Math.imul(Math.floor(x / 20), 2654435761 | 0) >>> 16) & 0xFFFF) - 32768) / 32768 : lfoAt(w, ph0 + x / 120);
    p.push([x, 50 - y * 38]);
  }
  return { svg: rule(50) + `<path d="${pts(p)}" class="line"/>`, handles: [] };
}
/* (the web's own, where the FM-1 shows big values: drawn the same way) */
function gFilt(s, ids) {
  const id = ids[0], v = raw(s, id), d = desc(s, id), f = d ? (v - d.min) / (d.max - d.min) : .5;
  const lp = v < 0 ? 1 + v / 64 : 1, hp = v > 0 ? v / 63 : 0, p = [];
  for (let i = 0; i <= 120; i++) { const x = i / 120; let y = .3; if (x > lp) y += (x - lp) * 2.6; if (x < hp) y += (hp - x) * 2.6; p.push([x * GW, Math.min(.9, y) * GH]); }
  return { svg: rule(91) + `<line x1="${GW / 2}" y1="4" x2="${GW / 2}" y2="${GH - 4}" class="axis"/><path d="${pts(p)}" class="line"/>`, handles: [["f", f * GW, 30, 0]] };
}
function gEcho(s, ids) {   /* the taps: graph_fx's thin bars, each a line and a cap */
  const t = ids[0] < 127 ? raw(s, ids[0]) : 1, fb = ff(s, ids[1]), mix = ids[3] < 127 ? ff(s, ids[3]) : .5, gap = 18 + (t % 8) * 6;
  let h = "";
  for (let i = 0, a = .9 * mix + .1; i < 14 && 8 + i * gap < GW; i++, a *= .25 + fb * .7) {
    const x = 8 + i * gap, y = 90 - a * 80;
    h += `<line x1="${x}" y1="10" x2="${x}" y2="90" class="axis"/><line x1="${x}" y1="${y}" x2="${x}" y2="90" class="line"/><line x1="${x - 3}" y1="${y}" x2="${x + 3}" y2="${y}" class="line"/>`;
  }
  return { svg: rule(91) + h, handles: [] };
}
function gVerb(s, ids) {
  const size = ff(s, ids[1]), damp = ff(s, ids[2]), pre = ids[3] < 127 ? ff(s, ids[3]) : 0, x0 = 6 + pre * 40, len = 60 + size * 170, p = [[0, 90], [x0, 90], [x0, 10]];
  for (let i = 1; i <= 80; i++) p.push([Math.min(GW, x0 + (i / 80) * len), 90 - 80 * Math.exp(-i / 80 * (2 + damp * 5))]);
  return { svg: rule(91) + `<path d="${pts(p)}" class="line"/>`, handles: [] };
}
function gEq(s, ids) {
  const b = [0, 1, 2].map((k) => { const d = ids[k] < 127 && desc(s, ids[k]); return d ? (val(s, ids[k]) - (d.min + d.max) / 2) / ((d.max - d.min) / 2) : 0; }), p = [];
  for (let i = 0; i <= 120; i++) { const x = i / 120; p.push([x * GW, 50 - 38 * (b[0] / (1 + Math.exp((x - .22) * 18)) + b[1] * Math.exp(-((x - .5) ** 2) * 40) + b[2] / (1 + Math.exp(-(x - .78) * 18)))]); }
  return { svg: rule(50) + `<path d="${pts(p)}" class="line"/>`, handles: [] };
}
/* graph_fx: a thin bar a send, a cap on its level; here a whole column takes the finger */
const FXPAGE = { 33: "FX", 34: "CHORUS", 35: "DLY", 36: "REVERB" };   /* (a send: the page that edits its effect) */
function gMeters(s, ids, toggles) {
  return live(ids).map(({ id, k }) => { const d = desc(s, id); if (!d) return ""; const f = frac(d, val(s, id)), z = zeroOf(d), [t, u] = fmtValue(d, val(s, id));
    const q = toggles && QSPEC.get(keyOf(s, id)), off = q && !qOn(q);
    return `<div class="mt${off ? " off" : ""}" style="--c:${KC[k]};--lo:${Math.min(f, z)};--hi:${Math.max(f, z)};--f:${f}" data-mt="${keyOf(s, id)}"><span class="mv num">${esc(t)}<small>${esc(u)}</small></span>
      <div class="mtr${z ? " bi" : ""}" data-drag="v" data-k="${keyOf(s, id)}"><i></i><b></b><s></s></div>
      ${q ? `<span class="mlw"><button class="ml" data-short="${esc(d.label)}" data-qtog="${keyOf(s, id)}" role="switch" aria-checked="${!off}"><span class="mlf">${esc(q.name)}</span></button><button class="mle" data-fxedit="${FXPAGE[id] || "FX"}" aria-label="Editar ${esc(q.name)}"><svg class="i"><use href="#i-edit"/></svg></button></span>` : `<span class="ml">${esc(d.label)}</span>`}</div>`; }).join("");
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
  return `<div class="gin"><svg class="gs" viewBox="0 0 ${GW} ${GH}" preserveAspectRatio="none">${g.svg}</svg>` +
    g.handles.map(([h, x, y, k]) => `<span class="hd" data-h="${h}" style="left:${x / GW * 100}%;top:${y / GH * 100}%;--c:${KC[k]}"></span>`).join("") + `</div>`;
}

