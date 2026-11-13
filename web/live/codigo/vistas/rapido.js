/* ---- RÁPIDO as a bento: the sweep filter and the sends large, the switches around them */
function quickBento() {
  const T = (id, s = 0) => QSPEC.get(keyOf(s, id));
  const box = (q, size) => `<div class="qb ${size}">${tile(q)}</div>`;
  return `<div class="qhead"><h2>Live</h2><button class="more" data-f="HOME">Editar más<svg class="i"><use href="#i-next"/></svg></button></div>
  <div class="bento quick2">
    ${module({ title: "FILTER", folder: "FX", s: 0, ids: [50, 127, 127, 127] }, "filt", { cls: "q-filt", name: "Filtro", hint: "LP ← OFF → HP" })}
    ${module({ title: "FX", folder: "FX", s: 0, ids: [33, 34, 35, 36] }, "meters", { cls: "q-fx", name: "Efectos", hint: "Toca el nombre para encender o apagar", toggles: true })}
    ${box(T(17), "q-arp")}${box(T(28), "q-tr")}${box(T(0, 1), "q-tempo")}${box(T(-1), "q-panic")}
    ${box(T(23), "q-s")}${box(T(49), "q-s")}${box(T(27), "q-s")}${box(T(37), "q-s")}${box(T(38), "q-s")}${box(T(78), "q-s")}
  </div>`;
}

