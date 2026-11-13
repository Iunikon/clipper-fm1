/* ---- REC: the device's REC screen. The REC button arms (stopped: the first note starts the loop; an empty project: a free
   take, its length the tempo) or records at once (playing); MODE, START and QUANT as its knobs; LEN the pattern's */
function recView() { return `<div class="recv" id="recv">${recInner()}</div>`; }
function recInner() {
  const st = M.state || { rec: M.rec | 0, mode: 0, start: 0, quant: 0, empty: 0 }, rec = st.rec | 0;
  const big = rec & 4 ? ["TOMA LIBRE", "Toca libre; REC en el siguiente compás cierra el loop y fija el tempo."] : rec & 8 ? ["CUENTA", "Un compás de clics; luego graba."]
    : rec & 1 ? ["GRABANDO", "Lo que toques entra en el patrón, cuantizado. REC otra vez para parar."] : rec & 2 ? ["ARMADO", "La primera nota que toques arranca el loop y la grabación."]
    : ["LISTO", SQ.playing ? "Está sonando: REC graba ya, encima de lo que hay." : "Parado: REC arma y espera la primera nota."];
  const lenP = LAYOUT.find((x) => x.title === "PATTERN"), lenId = lenP ? lenP.ids[0] : -1, len = lenId >= 0 ? val(0, lenId) : 16;
  const seg = (lab, op, opts, cur, dis) => `<div class="rset${dis ? " dis" : ""}"><span class="rl">${lab}</span><div class="opts">${opts.map(([t, v]) => `<button data-recset="${op}" data-v="${v}" aria-pressed="${cur === v}"${dis ? " disabled" : ""}>${t}</button>`).join("")}</div></div>`;
  return `<div class="rbig${rec & 5 ? " on" : rec & 10 ? " arm" : ""}"><b>${big[0]}</b><p>${big[1]}</p></div>
    <div class="rbtn"><button class="rrec${rec & 5 ? " on" : rec & 10 ? " arm" : ""}" data-trec="1"><i></i>${rec & 3 || rec & 4 ? "PARAR REC" : "REC"}</button>
      <button class="rplay${SQ.playing ? " on" : ""}" data-tplay="1"><svg class="i"><use href="#i-${SQ.playing ? "stop" : "play"}"/></svg>${SQ.playing ? "STOP" : "PLAY"}</button></div>
    <div class="rgrid">${seg("MODE", 1, [["FREE", 0], ["TEMPO", 1]], st.mode, !st.empty)}
      ${seg("LEN", "len", [["16", 16], ["32", 32], ["64", 64]], len, false)}
      ${seg("START", 2, [["NOTE", 0], ["COUNT", 1]], st.start, false)}
      ${seg("QUANT", 3, [["ON", 0], ["OFF", 1]], st.quant, false)}</div>
    <p class="msh">MODE solo cuenta con el proyecto vacío. Como en la pantalla REC del sinte.</p>`;
}
function paintRec() { const r = $("recv"); if (r) r.innerHTML = recInner(); }
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-recset]"); if (!b || !M.link) return;
  if (b.dataset.recset === "len") { const p = LAYOUT.find((x) => x.title === "PATTERN"); if (p) setVal(0, p.ids[0], +b.dataset.v); paintRec(); return; }
  rq(C.REC, [+b.dataset.recset, +b.dataset.v]).then((a) => { M.state = P.state(a); M.rec = M.state.rec; paintRec(); renderTransport(); }).catch(() => toast(-1, "El FM-1 no contestó"));
});

