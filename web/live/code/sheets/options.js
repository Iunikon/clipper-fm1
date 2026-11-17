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
/* the same sheet for a list that is not a parameter (the language: tablet note 14): items [value, label], cb(value) */
const LANGS = [["es", "Español"], ["en", "English"]];
function openPickList(title, items, cur, cb) {
  PK.key = "list"; PK.cb = cb;
  $("pkt").textContent = title;
  $("pkl").innerHTML = items.map(([v, n], i) => `<button role="option" aria-selected="${v === cur}" data-pkv="${esc(v)}"><span class="num">${i + 1}</span>${esc(n)}</button>`).join("");
  $("pick").classList.add("on"); $("scrim").classList.add("on");
}
function closePick() { $("pick").classList.remove("on"); if (!B.open && !SVE.open) $("scrim").classList.remove("on"); PK.key = ""; }
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-pick],[data-pkv],#pkx"); if (!b) { if (PK.key && e.target.id === "scrim") closePick(); return; }
  e.stopPropagation();
  if (b.dataset.pick === "awake") openPickList("Pantalla encendida sin uso", AW_OPTS.map(([m, n]) => [String(m), n]), String(AW.mins), (m) => { awakeSet(m); renderWork(); });
  else if (b.dataset.pick === "lang") openPickList("Idioma · Language", LANGS, LANG.cur || "es", (l) => { if (l !== LANG.cur) setLang(l); renderWork(); });
  else if (b.dataset.pick) openPick(b.dataset.pick);
  else if (b.id === "pkx") closePick();
  else if (PK.key === "list") { const cb = PK.cb; closePick(); PK.cb = null; cb && cb(b.dataset.pkv); }
  else { const [s, id] = PK.key.split(":").map(Number); setVal(s, id, +b.dataset.pkv); if (QSPEC.get(PK.key)) paintTile(s, id); closePick(); }
}, true);
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && PK.key) closePick(); });

