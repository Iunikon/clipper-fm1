/* ---------------------------------------------------------------- toasts --- */
let tt = 0;
function toast(i, html) {
  $("tq").style.background = i < 0 ? "var(--tx)" : KH[i]; $("tt").innerHTML = html; $("toast").classList.add("on");
  clearTimeout(tt); tt = setTimeout(() => $("toast").classList.remove("on"), 2200);
}

