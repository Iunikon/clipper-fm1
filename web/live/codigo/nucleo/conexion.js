/* ------------------------------------------------------------ connecting --- */
function say(t, err) { $("msg").textContent = t; $("msg").classList.toggle("err", !!err); }
function progress(f) { $("prog").style.width = Math.round(f * 100) + "%"; }
const rq = (cmd, args = [], opt) => M.link.request([cmd, args], opt);

async function connectMidi() {
  if (!navigator.requestMIDIAccess) { say("Este navegador no tiene Web MIDI. Usa Chrome.", true); return; }
  say("Pidiendo permiso para MIDI…");
  let access;
  try { access = await navigator.requestMIDIAccess({ sysex: true }); } catch (e) { say("Sin permiso para MIDI. Permítelo en Chrome y vuelve a intentar.", true); return; }
  const live = (p) => p.state !== "disconnected" && /fm-1|felucca|sloop|clipper|kayo|composite|usb-midi/i.test(p.name || "");
  const ins = [...access.inputs.values()].filter(live), outs = [...access.outputs.values()].filter(live);
  const pairs = ins.map((input) => ({ input, output: outs.find((o) => o.name === input.name) || (outs.length === 1 ? outs[0] : null) })).filter((x) => x.output);
  if (!pairs.length) { say("No encuentro el FM-1. Revisa el cable USB y que esté encendido.", true); return; }
  for (const pr of pairs) {
    const link = new Link((d) => pr.output.send(d), { onPush, onGap: () => rewatch(), onTimeout: () => {} });
    pr.input.onmidimessage = (e) => link.receive(e.data);
    M.link = link;
    try { await rq(C.INFO, [], { timeout: 600, retries: 3, quiet: true }); }
    catch (e) { link.close(); pr.input.onmidimessage = null; continue; }
    M.midiOut = pr.output; M.access = access; M.fmIn = pr.input;   /* (MIDI learn: the other inputs) */                           /* (the panic's all notes off: plain MIDI on the same port) */
    access.onstatechange = (e) => { if (e.port === pr.input && e.port.state === "disconnected") lost(); };
    $("cname").textContent = pr.input.name.replace(/ MIDI.*$/, "") || "FM-1";
    return load();
  }
  M.link = null;
  say("El FM-1 no responde. ¿Tiene instalado Clipper Live (protocolo 15)?", true);
}
function connectMock() {
  M.mock = true;
  let link;
  const mock = makeMock((d) => link.receive(d));
  link = new Link(mock.send, { onPush });
  M.link = link;
  $("cname").textContent = mock.name;
  return load();
}
function lost() {
  if (M.link) M.link.close();
  M.link = null;
  $("gate").classList.remove("hide"); document.body.classList.add("off"); $("cstate").textContent = "Sin conectar";
  say("Se perdió la conexión con el FM-1.", true);
  progress(0);
}

async function load() {
  try {
    say("Leyendo el FM-1…");
    M.info = P.info(await rq(C.INFO, [], { timeout: 600, retries: 3 }));
    if (M.info.proto < 15) { say(`Este FM-1 tiene protocolo ${M.info.proto}: Live necesita tu firmware con Live (15).`, true); return; }
    const pe0 = M.info.pe0, cache = store.get("desc:" + M.info.version);
    const total = M.info.pcount + M.info.gcount;
    let n = 0;
    for (let i = 0; i < M.info.gcount; i++) { M.gdesc[i] = cache ? cache.g[i] : await descOrNull(1, i); progress(++n / total * .8); }
    for (let i = 0; i < M.info.pcount; i++) { M.pdesc[i] = cache && (i < pe0 || i >= pe0 + 8) ? cache.p[i] : await descOrNull(0, i); progress(++n / total * .8); }
    store.set("desc:" + M.info.version, { p: M.pdesc, g: M.gdesc });
    say("Leyendo la lista de sonidos…");
    await readList();
    await readSound(true);
    await readX();
    try { sqPlayFrom(await rq(C.PLAY, [], { quiet: true, retries: 0, timeout: 500 })); } catch (e) { /* (older firmware) */ }
    await readFavs();
    await rq(C.WATCH, [3]);
    progress(1);
    $("gate").classList.add("hide"); document.body.classList.remove("off");
    $("cstate").textContent = M.mock ? "Datos de ejemplo" : "Conectado  USB MIDI";
    $("conn").classList.remove("off");
    keepAlive();
    if (NAV.some(([n]) => n === QS.get("folder"))) S.folder = QS.get("folder");   /* (?folder= ?mode=edit ?br=1 ?save=1: to open a view straight away) */
    if (QS.get("stab")) STU.tab = QS.get("stab");                                   /* (captures: an Estudio tab) */
    renderAll(); renderTransport(); pollState();
    if (QS.get("mode") === "edit") { S.folder = "HOME"; renderNav(); renderWork(); }   /* (compatibilidad con el enlace viejo) */
    if (QS.get("br") === "1") openBrowser(true);
    if (QS.get("follow") === "0") { S.follow = false; $("follow").setAttribute("aria-pressed", "false"); }   /* (captures: the example FM-1 turns pages) */
    if (QS.get("at")) setTimeout(() => document.querySelector(`#edit [data-title="${CSS.escape(QS.get("at"))}"]`)?.scrollIntoView({ block: "start" }), 600);   /* (captures: a page of the folder) */
    if (QS.get("save") === "1") openSave(true);
  } catch (e) {
    console.error(e);
    say(e.message === "closed" ? "Se cerró la conexión." : "No pude leer el FM-1: " + e.message, true);
  }
}
async function descOrNull(s, i) { try { return P.desc(await rq(C.DESC, [s, i])); } catch (e) { if (e.message === "closed") throw e; return null; } }
async function readSound(full) {
  const was = M.engine, pe0 = M.info.pe0, d = P.dump(await rq(C.DUMP), M.info);
  if (d.engine !== was || d.preset !== M.preset) LOG.length = 0;
  M.engine = d.engine; M.preset = d.preset; M.p = d.p; M.g = d.g;
  if (d.engine !== was && (isFmx() || M.info.engines[was] === "FMX")) xSoon();   /* (FMX's pages come and go with the engine) */
  if (full || d.engine !== was) for (let k = 0; k < 8; k++) M.pdesc[pe0 + k] = await descOrNull(0, pe0 + k);
  M.page = P.page(await rq(C.PAGE));
  if (M.page.homeIds) M.homeIds = M.page.homeIds;
  M.edited = !!M.page.edited;
  if (!M.edited || !M.orig || d.engine !== was || d.preset !== M.orig.preset) M.orig = { preset: d.preset, p: M.p.slice() };   /* (the sound as loaded: double tap) */
}
async function readList() {
  const list = [];
  for (;;) { const r = P.list(await rq(C.LIST, [...u14(list.length), 16])); list.push(...r.items); progress(.8 + .15 * list.length / Math.max(1, r.total)); if (list.length >= r.total || !r.items.length) break; }
  M.list = list;
}
async function readFavs() { const r = P.favs(await rq(C.FAVS)); M.favs = r.at.map((n) => ({ ...(M.list[n] || { name: "?", kind: "" }), n })); M.favCur = r.cur; }   /* (the list has the rest) */
let alive = 0;
function keepAlive() {
  clearInterval(alive);
  alive = setInterval(() => { if (M.link && M.link.idle && Date.now() - M.link.lastSent > 900) rq(C.PING, [], { quiet: true }).catch(() => {}); }, 1000);
}
function rewatch() { if (M.link) rq(C.WATCH, [3], { quiet: true }).then(() => reloadSoon()).catch(() => {}); }

