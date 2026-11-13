/* ---- a list of all a parameter's options, beside its arrows: one tap to any of them (ARP's MODE, SCL, WAVE…) */
const PK = { key: "" };
function openPick(key) {
  const [s, id] = key.split(":").map(Number), d = desc(s, id); if (!d || !d.names || !d.names.length) return;
  PK.key = key; const v = val(s, id);
  $("pkt").textContent = d.label;
  $("pkl").innerHTML = d.names.map((n, i) => `<button role="option" aria-selected="${i + d.min === v}" data-pkv="${i + d.min}"><span class="num">${i + 1}</span>${esc(n)}</button>`).join("");
  $("pick").classList.add("on"); $("scrim").classList.add("on");
  setTimeout(() => $("pkl").querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" }), 30);
}
function closePick() { $("pick").classList.remove("on"); if (!B.open && !SVE.open) $("scrim").classList.remove("on"); PK.key = ""; }
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-pick],[data-pkv],#pkx"); if (!b) { if (PK.key && e.target.id === "scrim") closePick(); return; }
  e.stopPropagation();
  if (b.dataset.pick) openPick(b.dataset.pick);
  else if (b.id === "pkx") closePick();
  else { const [s, id] = PK.key.split(":").map(Number); setVal(s, id, +b.dataset.pkv); if (QSPEC.get(PK.key)) paintTile(s, id); closePick(); }
}, true);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && PK.key) closePick(); });

