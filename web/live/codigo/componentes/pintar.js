/* ---- painting: a value changed; what shows it redraws (a fader a finger holds only moves) */
let bdrag = null;
function paintCards(s, id) {
  const key = keyOf(s, id);
  document.querySelectorAll("#edit .gr[data-gr]").forEach((gr) => {
    const ids = gr.dataset.ids.split(",").map(Number);
    if (+gr.dataset.s !== s || !ids.includes(id)) return;
    if (gr.dataset.gr === "meters" || gr.dataset.gr === "arcs") {
      gr.querySelectorAll(gr.dataset.gr === "meters" ? ".mt" : ".arc").forEach((el) => {
        const kk = gr.dataset.gr === "meters" ? el.dataset.mt : el.dataset.k;
        if (kk !== key) return;
        const d = desc(s, id), f = frac(d, val(s, id));
        if (gr.dataset.gr === "meters") { const z = zeroOf(d); el.style.setProperty("--lo", Math.min(f, z)); el.style.setProperty("--hi", Math.max(f, z)); el.style.setProperty("--f", f); el.querySelector(".mv").innerHTML = valHtml(d, val(s, id)); const q = gr.dataset.toggles && QSPEC.get(kk); if (q) { el.classList.toggle("off", !qOn(q)); el.querySelector(".ml").setAttribute("aria-checked", qOn(q)); } }
        else { const tmp = document.createElement("div"); tmp.innerHTML = gArcs(s, ids.map((x) => (x === id ? x : 127))); const nn = tmp.querySelector(".arc"); el.querySelector("svg").replaceWith(nn.querySelector("svg")); el.querySelector(".av").innerHTML = nn.querySelector(".av").innerHTML; }
      });
    } else gr.innerHTML = graphHtml(gr.dataset.gr, s, ids);
  });
  document.querySelectorAll(`#edit [data-cell="${key}"]`).forEach((el) => {
    const d = desc(s, id), v = val(s, id);
    if (el.dataset.fd) {                                   /* a fader: in place, so a finger on it keeps it */
      const f = frac(d, v), z = zeroOf(d);
      el.style.setProperty("--lo", Math.min(f, z)); el.style.setProperty("--hi", Math.max(f, z)); el.style.setProperty("--f", f);
      el.querySelector(el.classList.contains("ro") ? ".rv" : ".tv").innerHTML = valHtml(d, v); el.setAttribute("aria-valuenow", v);
    } else el.outerHTML = el.classList.contains("ro") ? readout(s, id, +el.dataset.ro) : tileP(s, id, +el.dataset.kk, el.dataset.title, el.dataset.tag === "1");
  });
  document.querySelectorAll(`#edit .tp[data-cell="${key}"]:not([data-fd]) .tv`).forEach((v) => v.classList.add("chg"));   /* (a choice: its value slides in) */
}

