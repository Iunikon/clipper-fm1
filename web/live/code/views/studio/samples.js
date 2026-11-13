/* ------------------------------------------------------------------- chop --- */
/* Chopping a recording into a slot (the CHOP block of the samples tab). All at SMP.RATE, positions
   in samples. These are pure: test_web.mjs runs them. */
/* ===================================================================== SAMPLES ====
   A WAV up to a user slot, as the Studio editor does. The code above is its own, unchanged (parseWav, resample,
   normalize, rootFromName, LOOP, IMA ADPCM, crc32 and buildSlot): a file is one note, at 22 050 Hz, and its root comes
   from the file's name («PIANO A4» → A4). Then SMP_BEGIN, the upload in 256-byte chunks (SMP_WRITE) and SMP_END. */
const SMPUP = { k: -1, done: 0, total: 0 };
async function smpDecode(f) {
  const buf = await f.arrayBuffer(); let x;
  try { const w = parseWav(buf); x = resample(w.x, w.sr, SMP.RATE); }
  catch (e) {                                       /* not a plain WAV: let the browser decode it */
    const Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const ab = await new Ctx(1, 1, SMP.RATE).decodeAudioData(buf.slice(0)); x = new Float64Array(ab.length);
    for (let c = 0; c < ab.numberOfChannels; c++) { const d = ab.getChannelData(c); for (let i = 0; i < d.length; i++) x[i] += d[i] / ab.numberOfChannels; }
  }
  if (!x.length) throw new Error("el archivo no tiene audio");
  return { s: normalize(x), root: rootFromName(f.name.replace(/\.[^.]*$/, "")) };
}
function smpProg() {
  const el = document.querySelector(`.dvs[data-smp="${SMPUP.k}"] small`);
  if (el) el.textContent = `Subiendo ${SMPUP.done} / ${SMPUP.total}`;
  const bar = document.querySelector(`.dvs[data-smp="${SMPUP.k}"] .upb i`); if (bar) bar.style.width = (SMPUP.done / SMPUP.total * 100) + "%";
}
async function smpUpload(k, file) {
  if (SMPUP.k >= 0) { toast(-1, "Ya hay una subida en marcha"); return; }
  const name = file.name.replace(/\.[^.]*$/, "").toUpperCase().replace(/[^\x20-\x7E]/g, "").slice(0, 8) || "SAMPLE";
  Object.assign(SMPUP, { k, done: 0, total: 1 }); renderWork();
  try {
    const z = await smpDecode(file), { hdr, data } = buildSlot(name, [z]);
    if (data.length > SMP.MAX_DATA) throw new Error(`no cabe: ${Math.round(data.length / 1024)} KiB de ${Math.round(SMP.MAX_DATA / 1024)}`);
    SMPUP.total = Math.ceil(data.length / 256); smpProg();
    const o = { quiet: true, retries: 0, timeout: 1500 };
    let r = await rq(11, [k & 127], o); if (r[1]) throw new Error(`el FM-1 no aceptó empezar (${r[1]})`);      /* SMP_BEGIN */
    for (let off = 0; off < data.length; off += 256) {                                                       /* SMP_WRITE */
      const a = SMP.DATA_OFF + off, w = await rq(12, [k & 127, a & 127, (a >> 7) & 127, (a >> 14) & 127, ...pack7(data.subarray(off, off + 256))], { ...o, retries: 1 });
      if (w[4]) throw new Error(`falló el trozo ${SMPUP.done + 1} (${w[4]})`);
      SMPUP.done++; smpProg();
    }
    r = await rq(13, [k & 127, ...pack7(hdr)], { ...o, timeout: 2500 });                                    /* SMP_END */
    if (r[1]) throw new Error(`el FM-1 no cerró la ranura (${r[1]})`);
    toast(-1, `<b>${esc(name)}</b> subido a S${String(k + 1).padStart(2, "0")}`);
  } catch (e) { toast(-1, "No se subió: " + esc(whyFailed(e)) + (SMPUP.done ? ". La ranura quedó a medias: vuelve a subirlo." : "")); }
  SMPUP.k = -1; PC.again("smp");
}
document.addEventListener("change", (e) => {
  const inp = e.target.closest && e.target.closest("[data-smpup]"); if (!inp || !inp.files || !inp.files[0]) return;
  smpUpload(+inp.dataset.smpup, inp.files[0]); inp.value = "";
});

