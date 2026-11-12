/* ------------------------------------------------------------------- i18n --- */
/* English, or Spanish (the source): asked the first time, changed in Estudio > Sistema. The page is written in Spanish;
   in English its text is swapped as it is drawn (text nodes, aria-label, title): whole strings from DICT, and the ones
   with numbers or names in them by RX. The device's own names (ENV, CUT, BASS…) are English already */
const LANG = { cur: (() => { try { return localStorage.getItem("clipperlive:lang"); } catch (e) { return null; } })() };
const DICT = {
  "Conecta el FM-1": "Connect the FM-1", "Conectar el FM-1": "Connect the FM-1",
  "Conéctalo por USB a esta tablet y toca Conectar. La primera vez, Chrome pide permiso para usar dispositivos MIDI.": "Plug it into this tablet over USB and tap Connect. The first time, Chrome asks to use MIDI devices.",
  "Descargar para usar sin internet": "Download to use offline", "Datos de ejemplo": "Example data", "FM-1 (ejemplo)": "FM-1 (example)", "Sin conectar": "Not connected",
  "Leyendo el FM-1…": "Reading the FM-1…", "Leyendo la lista de sonidos…": "Reading the sound list…", "Pidiendo permiso para MIDI…": "Asking for MIDI permission…",
  "No encuentro el FM-1. Revisa el cable USB y que esté encendido.": "I can't find the FM-1. Check the USB cable and that it is on.",
  "Este navegador no tiene Web MIDI. Usa Chrome.": "This browser has no Web MIDI. Use Chrome.", "Sin permiso para MIDI. Permítelo en Chrome y vuelve a intentar.": "No MIDI permission. Allow it in Chrome and try again.",
  "El FM-1 no responde. ¿Tiene instalado Clipper Live (protocolo 15)?": "The FM-1 doesn't answer. Does it run Clipper Live (protocol 15)?", "Se perdió la conexión con el FM-1.": "The connection to the FM-1 was lost.",
  "Salida": "Output", "Usar audio USB del FM-1": "Use the FM-1's USB audio", "Sin audio del FM-1": "No audio from the FM-1", "Onda del FM-1": "The FM-1's wave",
  "En el sinte": "On the synth", "Seguir": "Follow", "Cambios": "Changes", "Editado": "Edited", "Guardar": "Save", "Descartar": "Discard", "Descartar lo editado": "Discard the edits",
  "Aquí sale la página que el sinte tiene abierta, con sus 4 knobs.": "The page open on the synth shows here, with its 4 knobs.",
  "Aquí sale lo que cambies, en el sinte o aquí.": "What you change, on the synth or here, shows here.", "Lo que cambies, en el sinte o en la tablet, sale aquí. Toca": "What you change, on the synth or the tablet, shows here. Tap",
  "para volver atrás.": "to go back.", "Favoritos": "Favourites", "Tus favoritos del sinte salen aquí.": "Your synth's favourites show here.",
  "Live": "Live", "Editar": "Edit", "Listo": "Done", "Restablecer": "Reset", "Bloquear": "Lock", "Bloqueado": "Locked", "Accesos": "Shortcuts", "Añadir": "Add", "+ Añadir": "+ Add",
  "ACCIONES": "ACTIONS", "RÁPIDOS": "QUICK", "GRÁFICAS": "GRAPHS", "CUALQUIER PARÁMETRO": "ANY PARAMETER", "Libre": "Free", "Fav. anterior": "Prev. favourite", "Fav. siguiente": "Next favourite",
  "Arrastra por ⋮⋮ para ordenar · × quita · elige el tamaño abajo": "Drag by ⋮⋮ to reorder · × removes · pick the size below",
  "Filtro": "Filter", "Efectos": "Effects", "Toca el nombre para encender o apagar": "Tap the name to turn it on or off", "Distorsión": "Distortion",
  "Arpegiador": "Arpeggiator", "Velocidad": "Velocity", "Latch": "Latch", "Acordes": "Chords", "Escala": "Scale", "Transponer": "Transpose", "Voces": "Voices", "Tempo": "Tempo", "Pánico": "Panic",
  "Mantiene las notas": "Holds the notes", "Mantiene el arpegio": "Holds the arpeggio", "Octava y semitono": "Octave and semitone", "Toca TAP al pulso": "Tap TAP to the beat", "Corta las notas colgadas": "Cuts stuck notes", "Del arpegio": "Of the arpeggio",
  "Editar más": "Edit more", "Rápido": "Quick",
  "Sonidos": "Sounds", "Todos": "All", "Todos los sonidos": "All sounds", "Sonidos de usuario": "User sounds", "Dispositivo": "Device", "Suena ahora": "Playing now",
  "Marcar como favorito": "Mark as favourite", "Siguiente": "Next", "Renombrar": "Rename", "Borrar": "Erase", "Guarda aquí con Guardar": "Save here with Save",
  "Carga un sonido y márcalo con la estrella": "Load a sound and mark it with the star", "Toca un sonido para escucharlo. El panel se queda abierto.": "Tap a sound to hear it. The panel stays open.",
  "Carpeta anterior": "Previous folder", "Carpeta siguiente": "Next folder",
  "Todavía no hay sonidos de usuario. Guarda uno con": "No user sounds yet. Save one with", ": el FM-1 tiene 32 ranuras.": ": the FM-1 has 32 slots.",
  "Guardar el sonido": "Save the sound", "Nombre": "Name", "Ranura de usuario": "User slot", "Cancelar": "Cancel", "Guardando…": "Saving…", "Leyendo las ranuras del FM-1…": "Reading the FM-1's slots…",
  "Borrar el patrón": "Clear the pattern", "Iniciar el sonido": "Init the sound", "Proyecto nuevo": "New project", "Toca otra vez para confirmar": "Tap again to confirm",
  "Drum kits": "Drum kits", "Biblioteca": "Library", "Proyectos": "Projects", "Samples": "Samples", "Subir WAV": "Upload WAV", "Reemplazar": "Replace", "Cargar": "Load", "Guardar encima": "Save over", "Ocupado": "Used", "Vacío": "Empty", "Abrir": "Open",
  "Secuenciador avanzado": "Advanced sequencer", "Copia de seguridad": "Backup", "Sistema": "System", "Avanzado en Estudio": "Advanced in Studio", "Estudio": "Studio", "ESTUDIO": "STUDIO",
  "Guardar una copia": "Save a backup", "Restaurar desde un archivo": "Restore from a file", "COPIA DE SEGURIDAD": "BACKUP", "SISTEMA": "SYSTEM",
  "Todo el FM-1 en un archivo: los proyectos, los sonidos de usuario, los samples y los ajustes. Es el mismo archivo que hace el editor clásico.": "The whole FM-1 in one file: the projects, the user sounds, the samples and the settings. The same file the classic editor makes.",
  "Restaurar reemplaza todo lo del FM-1 por lo del archivo. Pide confirmación y el sinte tiene que estar parado.": "Restoring replaces everything on the FM-1 with the file's. It asks first, and the synth must be stopped.",
  "Firmware": "Firmware", "Protocolo": "Protocol", "Motores": "Engines", "Sonidos de fábrica": "Factory sounds", "Pasos del patrón": "Pattern steps", "Puerto MIDI": "MIDI port", "Idioma": "Language",
  "MIDI, sincronía y afinación se ajustan en GLO.": "MIDI, sync and tuning are set in GLO.",
  "Pasos": "Steps", "Paso": "Step", "Nota": "Note", "Vaciar": "Clear", "Ligar al anterior": "Tie to the previous", "Ligado al anterior": "Tied to the previous", "Rejilla": "Grid", "Piano roll": "Piano roll",
  "Extender": "Extend", "Todo": "All", "Copiar": "Copy", "Pegar": "Paste", "Invertir": "Reverse", "Duplicar": "Double", "Generar": "Generate", "Humanizar": "Humanize", "Euclídeo": "Euclidean", "Aleatorio": "Random",
  "Exportar .mid": "Export .mid", "Importar .mid": "Import .mid", "Patrones en esta tablet": "Patterns on this tablet", "Guardar este": "Save this one", "Deshacer": "Undo", "Normal": "Normal", "Sin fill": "No fill", "Solo con fill": "Fill only",
  "Velocidad de cada paso, 0–127. Arrastra el dedo por encima.": "Each step's velocity, 0–127. Drag a finger over it.", "Golpes": "Hits", "Giro": "Rotate",
  "Leyendo el patrón del FM-1…": "Reading the FM-1's pattern…",
  "LISTO": "READY", "GRABANDO": "RECORDING", "ARMADO": "ARMED", "TOMA LIBRE": "FREE TAKE", "CUENTA": "COUNT-IN", "PARAR REC": "STOP REC", "TOMA": "TAKE",
  "Parado: REC arma y espera la primera nota.": "Stopped: REC arms and waits for the first note.", "Está sonando: REC graba ya, encima de lo que hay.": "Playing: REC records now, over what is there.",
  "La primera nota que toques arranca el loop y la grabación.": "The first note you play starts the loop and the recording.", "Lo que toques entra en el patrón, cuantizado. REC otra vez para parar.": "What you play goes into the pattern, quantised. REC again to stop.",
  "Toca libre; REC en el siguiente compás cierra el loop y fija el tempo.": "Play freely; REC on the next bar closes the loop and sets the tempo.", "Un compás de clics; luego graba.": "One bar of clicks, then it records.",
  "MODE solo cuenta con el proyecto vacío. Como en la pantalla REC del sinte.": "MODE only counts with an empty project. As on the synth's REC screen.",
  "SET A y SET B guardan el sonido de ahora en cada lado; MORPH va de uno a otro.": "SET A and SET B keep the sound as it is on each side; MORPH goes from one to the other.",
  "COMPARANDO": "COMPARING", "EL SONIDO COMO SE CARGÓ": "THE SOUND AS LOADED", "CMP EDIT: vuelven tus cambios": "CMP EDIT: your edits come back", "AHORA": "NOW", "(EL MÁS ANTIGUO)": "(THE OLDEST)",
  "Sin pasos todavía: cada cambio del sonido es un paso.": "No steps yet: each change to the sound is one.",
  "Arrastra el dedo por los pasos: arriba sube, abajo baja. Se manda al soltar.": "Drag a finger over the steps: up raises, down lowers. Sent on release.",
  "Añadido": "Added", "Copia guardada": "Backup saved", "Restaurado": "Restored", "Deshecho": "Undone", "El FM-1 no contestó": "The FM-1 didn't answer", "Lo editado se descartó": "The edits were discarded",
  "Los 16 favoritos están ocupados": "The 16 favourites are taken", "No se pudo cambiar el favorito": "The favourite couldn't change", "Sigue tocando TAP al pulso": "Keep tapping TAP to the beat",
  "todas las notas cortadas": "all notes cut", "LIVE está bloqueado: toca el candado para moverte": "LIVE is locked: tap the padlock to move", "LIVE bloqueado": "LIVE locked", "LIVE suelto": "LIVE unlocked",
  ": toca el candado para soltarlo": ": tap the padlock to free it", "Quitado de favoritos": "Removed from favourites", "hecho": "done", "Para la reproducción primero": "Stop playback first",
  "como se cargó": "as loaded", "por defecto": "default", "Guardado": "Saved", "Mostrar u ocultar los favoritos": "Show or hide the favourites", "Pantalla completa": "Full screen",
  "La página del sinte": "The synth's page", "Carpetas": "Folders", "Carpetas de sonidos": "Sound folders", "Cerrar": "Close", "Favorito": "Favourite", "Favorito anterior": "Previous favourite", "Favorito siguiente": "Next favourite",
  "Quitar": "Remove", "Esta página se usa en el sinte.": "This page is used on the synth.",
};
const RX = [
  [/^(.+): anterior$/, "$1: previous"], [/^(.+): siguiente$/, "$1: next"], [/^(.+): apagado$/, "$1: off"], [/^(.+): encendido$/, "$1: on"], [/^(.+): menos$/, "$1: less"], [/^(.+): más$/, "$1: more"], [/^(.+): nivel$/, "$1: level"],
  [/^Paso (\d+): vacío$/, "Step $1: empty"], [/^Paso (\d+): ligado$/, "Step $1: tied"], [/^Paso (\d+): (.+)$/, "Step $1: $2"], [/^Deshacer (.+): volver a (.+)$/, "Undo $1: back to $2"],
  [/^Editar (.+)$/, "Edit $1"], [/^Abrir (.+)$/, "Open $1"], [/^(\d+) pasos$/, "$1 steps"], [/^(\d+) sonidos$/, "$1 sounds"], [/^(\d+) de (\d+)$/, "$1 of $2"],
  [/^(\d+) zonas? · (.+)$/, (m, n, k) => `${n} zone${n === "1" ? "" : "s"} · ${k}`], [/^Anterior en (.+)$/, "Previous in $1"], [/^Banco (\d+)$/, "Bank $1"], [/^Proyecto (\d+)$/, "Project $1"],
  [/^Acorde de (\d+) notas$/, "Chord of $1 notes"], [/^Favorito (\d+): quitar$/, "Favourite $1: remove"], [/^Favorito (\d+) de (\d+)$/, "Favourite $1 of $2"], [/^Guardar en (U\d+)$/, "Save to $1"], [/^Reemplazar (U\d+)$/, "Replace $1"],
  [/^Se reemplaza (.+)\.$/, "Replaces $1."], [/^Guarda encima de (.+), el que suena\.$/, "Saves over $1, the one playing."], [/^Hasta 12 letras\. Sin nombre se llama (.+)\.$/, "Up to 12 letters. Without a name it is called $1."],
  [/^Poner (.+)$/, "Put $1"], [/^Generar en (.+)$/, "Generate in $1"], [/^Leyendo (.+) del FM-1…$/, "Reading $1 from the FM-1…"], [/^(.+) como se cargó (.+)$/, "$1 as loaded $2"],
  [/^Leyendo (\d+) de (\d+) KiB…$/, "Reading $1 of $2 KiB…"], [/^Escribiendo (.+)$/, "Writing $1"], [/^Copia guardada: (\d+) KiB\. Está en tus descargas\.$/, "Backup saved: $1 KiB. It is in your downloads."], [/^No se pudo: (.+)$/, "Couldn't: $1"],
  [/^(.+), editado: abrir sonidos$/, "$1, edited: open sounds"], [/^(.+): abrir sonidos$/, "$1: open sounds"], [/^Pista (\d+)$/, "Track $1"],
];
function tr(t) {
  const k = t.trim(); if (!k) return t;
  let out = DICT[k];
  if (out == null) for (const [re, to] of RX) if (re.test(k)) { out = k.replace(re, to); break; }
  return out == null ? t : t.replace(k, out);
}
function trNode(root) {
  if (LANG.cur !== "en" || !root) return;
  if (root.nodeType === 3) { const v = tr(root.nodeValue); if (v !== root.nodeValue) root.nodeValue = v; return; }
  if (root.nodeType !== 1) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) { const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
  const els = root.querySelectorAll ? [root, ...root.querySelectorAll("[aria-label],[title],[placeholder]")] : [];
  for (const e of els) for (const a of ["aria-label", "title", "placeholder"]) { const v = e.getAttribute && e.getAttribute(a); if (v) { const t2 = tr(v); if (t2 !== v) e.setAttribute(a, t2); } }
}
const trObs = new MutationObserver((ms) => { if (LANG.cur !== "en") return; for (const m of ms) { if (m.type === "characterData") trNode(m.target); else m.addedNodes.forEach(trNode); } });
function setLang(l) {
  const was = LANG.cur; LANG.cur = l; try { localStorage.setItem("clipperlive:lang", l); } catch (e) { /* (asked again next time) */ }
  document.documentElement.lang = l;
  if (l === "en") { trNode(document.body); trObs.observe(document.body, { childList: true, subtree: true, characterData: true }); }
  else if (was === "en") { trObs.disconnect(); location.reload(); }   /* (back to Spanish: the page as written) */
}
/* asked the first time, over the connect screen; then Estudio > Sistema */
function langAsk() {
  if (LANG.cur) { if (LANG.cur === "en") setLang("en"); return; }
  const g = $("gate"); if (!g) return;
  const box = document.createElement("div"); box.className = "langq";
  box.innerHTML = `<b>Idioma · Language</b><div><button class="btn" data-lang="es">Español</button><button class="btn" data-lang="en">English</button></div>`;
  g.querySelector(".box").prepend(box);
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-lang]"); if (!b) return; const l = b.dataset.lang; document.querySelector(".langq")?.remove(); if (l !== LANG.cur) setLang(l); });
