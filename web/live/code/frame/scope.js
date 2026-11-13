/* ------------------------------------------------- the scope: the FM-1's own trace, or its USB audio --- */
/* Live protocol, command SCOPE (108). The synth sends the trace it draws itself (ui_draw.c graph_scope):
   240 points from 0 to 126, 63 the zero. Not audio samples: its screen, so the tablet draws exactly the same
   wave. While a firmware lacks it, the box uses the USB audio; without that either, nothing is drawn: no wave is
   ever made up here. */
const SCOPE_N = 240;
let scTrace = null, scAt = 0, scPeak = 0, scOk = null, scFail = 0;   /* scOk: null untried, true it sends it, false it lacks it */
function scopeFrame(a) {
  if (!a || a.length < 3 + SCOPE_N) return;
  scPeak = a[1] | (a[2] << 7);
  scTrace = Uint8Array.from(a.slice(3, 3 + SCOPE_N));
  scAt = performance.now(); scOk = true; scFail = 0;
}
/* the subscription renews itself: if the tablet goes, the synth stops sending after three seconds */
async function scopeKeep() {
  if (!M.link || scOk === false || document.hidden) return;
  try { scopeFrame(await rq(C.SCOPE, [1], { key: "scope", quiet: true, retries: 0, timeout: 700 })); }
  catch (e) { if (scOk !== true && ++scFail >= 3) scOk = false; }    /* a firmware without the command: no longer asked */
}
setInterval(scopeKeep, 2000);

let an = null, buf = null, usbStream = null;   /* (usbStream: the set's recording, set.js) */
async function usbAudio() {
  const l = $("src");
  if (!navigator.mediaDevices?.getUserMedia) { l.textContent = "Este navegador no da audio"; return; }
  try {
    const raw = { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
    let st = await navigator.mediaDevices.getUserMedia({ audio: raw });
    const ins = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
    const fm1 = ins.find((d) => /felucca|clipper|fm-?1|sloop/i.test(d.label)) || ins.find((d) => /usb/i.test(d.label));
    if (fm1 && st.getAudioTracks()[0].getSettings().deviceId !== fm1.deviceId) { st.getTracks().forEach((t) => t.stop()); st = await navigator.mediaDevices.getUserMedia({ audio: { ...raw, deviceId: { exact: fm1.deviceId } } }); }
    usbStream = st;
    const ctx = new AudioContext(); an = ctx.createAnalyser(); an.fftSize = 2048; buf = new Float32Array(an.fftSize); ctx.createMediaStreamSource(st).connect(an);
    l.textContent = (fm1 ? "" : "No encontré el FM-1: ") + (st.getAudioTracks()[0].label || "entrada");
    document.querySelector(".scope").classList.add("on");
  } catch (err) { l.textContent = err.name === "NotAllowedError" ? "Permiso de audio negado" : "No se pudo abrir el audio"; }
}
/* as the FM-1 draws it (ui_draw.c graph_scope): the output at 22.05 kHz (audio.c keeps every other sample), 240 of them
   from a rising zero crossing, scaled to the loudest (never above 1500 / 32768), a thin line in the curve's colour */
/* (drawn only when there is something new: a trace arrived, or the USB audio, at most 30 times a second; never while the
   box is off screen, a phone's rail closed or the page hidden. Its size comes from a ResizeObserver, not a layout a frame) */
const SCV = { w: 0, h: 0, seen: true, at: -1, t: 0, idle: false };
function drawScope(cv) {
  if (!cv || !SCV.seen) return;
  if (!SCV.w) { const now = performance.now(); if (now - (SCV.m || 0) < 500) return; SCV.m = now; const r = cv.getBoundingClientRect(); SCV.w = r.width; SCV.h = r.height; if (!SCV.w) return; }   /* (before the observer's first word) */
  const now = performance.now(), fresh = scTrace && now - scAt < 400;
  if (fresh && scAt === SCV.at) return;                          /* (the same trace: already drawn) */
  if (!fresh && an && now - SCV.t < 33) return;                  /* (the USB audio: 30 a second is plenty) */
  if (!fresh && !an) { if (SCV.idle) return; SCV.idle = true; } else SCV.idle = false;   /* (nothing: the empty box once) */
  SCV.at = fresh ? scAt : -1; SCV.t = now;
  const dpr = Math.min(2, devicePixelRatio || 1), w = Math.round(SCV.w * dpr), h = Math.round(SCV.h * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, w, h); g.fillStyle = "#1e1e23"; g.fillRect(0, h >> 1, w, dpr);
  const propia = scTrace && performance.now() - scAt < 400;        /* the synth's wins while it keeps arriving */
  const caja = document.querySelector(".scope");
  if (caja) caja.classList.toggle("on", !!(propia || an));
  if (propia) {                                                    /* its trace, point by point, just as it draws it */
    $("snone").textContent = "Onda del FM-1"; caja?.classList.add("fm1");   /* (its own trace: no USB audio, no permission) */
    g.strokeStyle = KH[0]; g.lineWidth = dpr; g.lineJoin = "miter"; g.beginPath();
    for (let x = 0; x < SCOPE_N; x++) g.lineTo(x / (SCOPE_N - 1) * w, scTrace[x] / 126 * h);
    g.stroke(); return;
  }
  if (!an) return;                               /* without the FM-1's output no wave is drawn: never a simulated one */
  an.getFloatTimeDomainData(buf);
  const step = an.context.sampleRate / 22050, at = (i) => buf[Math.round(i * step)] || 0, n = Math.floor(buf.length / step);
  let peak = 1500 / 32768, t = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(at(i)));
  for (let i = 1; i < n - 240; i++) if (at(i - 1) < 0 && at(i) >= 0) { t = i; break; }
  g.strokeStyle = KH[0]; g.lineWidth = dpr; g.lineJoin = "miter"; g.beginPath();
  for (let x = 0; x < 240; x++) g.lineTo(x / 239 * w, h / 2 - at(t + x) / peak * h * .44);
  g.stroke();
}
(() => {
  const cv = $("scope"); if (!cv) return;
  new ResizeObserver(([e]) => { SCV.w = e.contentRect.width; SCV.h = e.contentRect.height; SCV.idle = false; SCV.at = -1; }).observe(cv);
  new IntersectionObserver(([e]) => { SCV.seen = e.isIntersecting; SCV.idle = false; SCV.at = -1; }).observe(cv);
  (function loop() { drawScope(cv); requestAnimationFrame(loop); })();
})();

