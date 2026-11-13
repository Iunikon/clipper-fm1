/* ------------------------------------------------------------ what we send --- */
const sets = new Map();          /* key -> performance.now() of the last user change: the device's echo is not taken */
const touched = (k) => performance.now() - (sets.get(k) || 0) < 600;
function setVal(s, id, v) {
  const d = desc(s, id); if (!d || !M.link) return;
  v = Math.max(d.min, Math.min(d.max, Math.round(v)));
  if (val(s, id) === v && !(s === 3 && isGo(d))) return;
  if (s === 3) { setX(id, v); return; }
  if (s === 4) { hySet(id, v); return; }               /* (the HYBRID patch: studio.js) */
  if (!undoing) logChange(s, id, val(s, id), v, "tablet");
  (s ? M.g : M.p)[id] = v;
  sets.set(keyOf(s, id), performance.now());
  paintValue(s, id);
  rq(C.SET, [s, id, ...v14(v)], { key: "set:" + keyOf(s, id) }).then((a) => {
    const r = P.set(a);
    if (!touched(keyOf(s, id)) && r.value !== val(s, id)) { (s ? M.g : M.p)[id] = r.value; paintValue(s, id); }
  }).catch(() => {});
}

/* ---- the synth pages (X_*, Live 109..111): read them all (a few dozen), again when the device says they changed */
const isGo = (d) => d && d.names && d.names.length === 2 && d.names[1] === "GO";
const xIds = () => [...new Set(LAYOUT.filter((p) => p.scope === 3 && pageOn(p)).flatMap((p) => p.ids.filter((i) => i < 127)))];
async function readX() {
  for (const i of xIds()) { try { const o = P.x(await rq(C.X_GET, [i], { quiet: true, retries: 0, timeout: 500 })); if (o.id === i) { M.xdesc[i] = o; M.x[i] = o.v; } } catch (e) { if (e.message === "closed") throw e; } }
  const snd = M.xdesc[1];                                  /* (LAYER's SOUND: a place in the list, shown by its name) */
  if (snd && snd.label === "SOUND" && M.list.length) { snd.names = M.list.slice(0, snd.max - snd.min + 1).map((x) => x.name); snd.fmt = F.ENUM; }
}
let xT = 0;
function xSoon() { clearTimeout(xT); xT = setTimeout(async () => { try { await readX(); delete PCD.mseq; renderWork(); renderDev(); } catch (e) { /* the next push */ } }, 90); }
function setX(id, v) {
  M.x[id] = v; sets.set(keyOf(3, id), performance.now()); paintValue(3, id);
  rq(C.X_SET, [id, ...v14(v)], { key: "x:" + id }).then((a) => { const o = P.x(a); if (o.id === id) { M.xdesc[id] = o; M.x[id] = o.v; } xSoon(); }).catch(() => {});
}
/* the device's state, every 1.5 s: CPU, LATE, PEAK, the scale's notes, REC */
async function pollState() {
  if (!M.link || !M.info || document.hidden) return;
  try { const st = P.state(await rq(C.STATE, [], { key: "state", quiet: true, retries: 0, timeout: 500 })); const scaleCh = !M.state || M.state.scale !== st.scale;
    M.state = st; M.rec = st.rec; renderTransport(); if (scaleCh && (S.folder === "SEL")) renderWork(); if (S.folder === "REC") paintRec(); } catch (e) { /* (an older firmware: no STATE) */ }
}
setInterval(pollState, 1500);

