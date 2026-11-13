/* ---- the transport in the bar: PLAY (bar.beat) and REC, always in sight; a tap acts as the device's buttons */
function renderTransport() {
  const t = $("trn"); if (!t) return;
  const rec = M.rec | 0, recOn = rec & 1, armed = rec & 2, free = rec & 4, ci = rec & 8, pos = SQ.playing && SQ.pos >= 0 ? `${Math.floor(SQ.pos / 16) + 1}.${Math.floor((SQ.pos % 16) / 4) + 1}` : "";
  setHtml(t, `<button class="tbt${SQ.playing ? " on" : ""}" data-tplay="1" aria-pressed="${SQ.playing}"><svg class="i"><use href="#i-${SQ.playing ? "stop" : "play"}"/></svg><span class="num">${SQ.playing ? pos : "PLAY"}</span></button>
    <button class="tbt rec${recOn || free ? " on" : armed || ci ? " arm" : ""}" data-trec="1" aria-pressed="${!!(recOn || armed)}"><i></i><span>${free ? "TOMA" : ci ? "CUENTA" : armed ? "ARMADO" : "REC"}</span></button>`);
  const sel2 = LAYOUT.find((x) => x.title === "SEL 2"), trn = sel2 && desc(0, sel2.ids[0]) ? val(0, sel2.ids[0]) | 0 : 0, oct = M.state ? M.state.oct | 0 : 0, bpm = desc(1, 0) ? val(1, 0) : null;
  setHtml($("tmp"), `${bpm != null ? `<b class="num">${bpm}</b><small>BPM</small>` : ""}${oct ? `<span class="tag2 num">OCT ${oct > 0 ? "+" : ""}${oct}</span>` : ""}${trn ? `<span class="tag2 trn num">TRN ${trn > 0 ? "+" : ""}${trn}</span>` : ""}`);
  const c = $("cpu"); if (c && M.state) { setHtml(c, `CPU <b class="num">${M.state.cpu}%</b>${M.state.late ? ` LATE <b class="num">${M.state.late}</b>` : ""}`); c.classList.toggle("hot", M.state.cpu > 85 || M.state.late > 0); }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tplay],[data-trec]"); if (!b || !M.link) return;
  if (b.dataset.tplay) rq(C.TRANSPORT, [SQ.playing ? 0 : 1]).then((a) => { SQ.playing = !!a[0]; renderTransport(); }).catch(() => {});
  else rq(C.REC, [0]).then((a) => { M.state = P.state(a); M.rec = M.state.rec; renderTransport(); if (S.folder === "REC") paintRec(); }).catch(() => toast(-1, "El FM-1 no contestó"));
});

