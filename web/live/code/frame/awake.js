/* ---- the screen stays on while Live is in use (tablet note 9, 14 nov): a touch, a key, a value sent to the FM-1 or one
   coming from it, or SEQ playing, each count as activity. After AW.mins minutes with none the wake lock is let go and the
   tablet dims as it would; the next activity takes it again. The minutes are set in Estudio > Sistema (0: off). A wake
   lock needs HTTPS (Vercel) and a visible page: opened as a file, or where the browser refuses, nothing happens */
const AW = { lock: null, last: Date.now(), mins: store.get("awake") ?? 10, asking: false };
const AW_OPTS = [[0, "Apagado"], [5, "5 min"], [10, "10 min"], [20, "20 min"], [30, "30 min"], [60, "60 min"]];
async function awakeTake() {
  if (AW.lock || AW.asking || !AW.mins || !navigator.wakeLock || document.visibilityState !== "visible") return;
  AW.asking = true;
  try { AW.lock = await navigator.wakeLock.request("screen"); AW.lock.addEventListener("release", () => { AW.lock = null; }); }
  catch (e) { /* (refused: low battery, not HTTPS, not visible) */ }
  AW.asking = false;
}
function awakeLet() { if (AW.lock) { AW.lock.release().catch(() => {}); AW.lock = null; } }
function awakeBump() { AW.last = Date.now(); if (!AW.lock) awakeTake(); }
["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, awakeBump, { passive: true, capture: true }));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") awakeBump(); });
setInterval(() => {
  if (typeof SQ !== "undefined" && SQ.playing) AW.last = Date.now();
  if (AW.lock && (!AW.mins || Date.now() - AW.last > AW.mins * 60000)) awakeLet();
}, 15000);
function awakeSet(m) { AW.mins = +m; store.set("awake", AW.mins); if (AW.mins) awakeBump(); else awakeLet(); }
const awakeName = () => (AW_OPTS.find(([m]) => m === AW.mins) || [0, AW.mins + " min"])[1];
