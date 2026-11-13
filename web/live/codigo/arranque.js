/* ------------------------------------------------------------------ start --- */
$("connect").onclick = () => connectMidi();
if (/^https?:$/.test(location.protocol)) $("dl").hidden = false;
/* full screen: the tablet's whole 3:2 screen, without Chrome's bars */
if (document.fullscreenEnabled) $("fs").hidden = false;
$("fs").onclick = () => (document.fullscreenElement ? document.exitFullscreen()
  : document.documentElement.requestFullscreen().then(() => screen.orientation?.lock?.("landscape"))).catch(() => {});   /* (always landscape) */
document.addEventListener("fullscreenchange", () => $("fs").setAttribute("aria-pressed", !!document.fullscreenElement));   /* (served, as on Vercel: the same file to keep offline) */
$("conn").classList.add("off");
S.lock = !!store.get("lock"); document.body.classList.toggle("locked", S.lock);
if (store.get("nofav")) { document.body.classList.add("nofav"); $("favh").setAttribute("aria-pressed", "false"); }
renderNav();                                        /* (empty until the FM-1 is connected: Conectar in the middle) */
langAsk();                                          /* (Spanish or English: asked once) */
if (QS.get("mock") === "1") connectMock();
