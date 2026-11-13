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

