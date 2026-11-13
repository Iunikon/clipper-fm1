/* ------------------------------------------------------------------- i18n --- */
/* English, or Spanish (the source): asked the first time, changed in Estudio > Sistema. The page is written in Spanish;
   in English its text is swapped as it is drawn (text nodes, aria-label, title): whole strings from DICT, and the ones
   with numbers or names in them by RX. The device's own names (ENV, CUT, BASS…) are English already */
const LANG = { cur: (() => { try { return localStorage.getItem("clipperlive:lang"); } catch (e) { return null; } })() };
const DICT = {
  "MIDI learn: tu controlador mueve Live": "MIDI learn: your controller moves Live",
  "¿Seguro?": "Sure?", "Salida, en el sinte y cambios": "Output, on the synth and changes", "Lo editado se descartó": "The edits were discarded",
  "Mueve un parámetro del sonido y vuelve: se fija aquí su valor para este paso.": "Move one of the sound's parameters and come back: its value is locked here for this step.",
  "la secuencia de modulación": "the modulation sequence", "los proyectos": "the projects", "la afinación": "the tuning", "las pistas": "the tracks", "los kits": "the kits", "los samples": "the samples",
  "la biblioteca": "the library", "el patrón": "the pattern", "los favoritos": "the favourites", "las ranuras": "the slots",
  "El FM-1 no contestó a esto. El FM-1 de ejemplo no lo sabe hacer; con el sinte de verdad sale aquí.": "The FM-1 didn't answer this. The example FM-1 can't do it; with the real synth it shows here.",
  "El FM-1 no contestó a esto. con el sinte de verdad sale aquí.": "The FM-1 didn't answer this. With the real synth it shows here.",
  "Avanzado": "Advanced", "Modo": "Mode",
  "Escenas": "Scenes", "Guardar aquí": "Save here", "Ya": "Now", "compases": "bars", "de golpe": "at once", "Parar": "Stop",
  "ESCENAS Y SET": "SCENES AND SET", "Reloj del set": "Set clock", "RELOJ": "CLOCK", "Grabar set": "Record set", "GRABAR SET": "RECORD SET", "Toca para parar y guardar": "Tap to stop and save",
  "El audio USB del FM-1 a un archivo": "The FM-1's USB audio to a file", "Tu controlador mueve Live": "Your controller moves Live", "Aprender": "Learn", "Aprendiendo… (Listo)": "Learning… (Done)",
  "Toca un control, una acción o una escena": "Tap a control, an action or a scene", "Listo": "Done", "Pausar el set": "Pause the set", "Empezar el set": "Start the set", "El set a cero": "Set to zero",
  "Sin audio USB del FM-1: no puedo grabar": "No USB audio from the FM-1: can't record", "Este navegador no puede grabar": "This browser can't record", "No se pudo empezar a grabar": "Couldn't start recording",
  "Sin permiso para MIDI": "No MIDI permission", "Grabando el set": "Recording the set", "desde el audio USB del FM-1": "from the FM-1's USB audio", "Set grabado": "Set recorded",
  "Sin enlaces. Conecta un controlador MIDI, toca Aprender, luego un control de Live y mueve una perilla.": "No links. Plug in a MIDI controller, tap Learn, then a Live control, and turn a knob.",
  ": ahora mueve la perilla o pulsa la tecla": ": now turn the knob or press the key", ": mueve la perilla o pulsa la tecla": ": turn the knob or press the key", ": toca un control y mueve tu controlador": ": tap a control and move your controller",
  "Conecta el FM-1": "Connect the FM-1", "Conectar el FM-1": "Connect the FM-1",
  "Conéctalo por USB y toca Conectar. La primera vez, Chrome pide permiso para usar dispositivos MIDI.": "Plug it in over USB and tap Connect. The first time, Chrome asks to use MIDI devices.",
  "Descargar para usar sin internet": "Download to use offline", "Datos de ejemplo": "Example data", "FM-1 (ejemplo)": "FM-1 (example)", "Sin conectar": "Not connected",
  "Leyendo el FM-1…": "Reading the FM-1…", "Leyendo la lista de sonidos…": "Reading the sound list…", "Pidiendo permiso para MIDI…": "Asking for MIDI permission…",
  "No encuentro el FM-1. Revisa el cable USB y que esté encendido.": "I can't find the FM-1. Check the USB cable and that it is on.",
  "Este navegador no tiene Web MIDI. Usa Chrome.": "This browser has no Web MIDI. Use Chrome.", "Sin permiso para MIDI. Permítelo en Chrome y vuelve a intentar.": "No MIDI permission. Allow it in Chrome and try again.",
  "El FM-1 no responde. ¿Tiene instalado Clipper Live (protocolo 15)?": "The FM-1 doesn't answer. Does it run Clipper Live (protocol 15)?", "Se perdió la conexión con el FM-1.": "The connection to the FM-1 was lost.",
  "Salida": "Output", "Usar audio USB del FM-1": "Use the FM-1's USB audio", "Sin audio del FM-1": "No audio from the FM-1", "Onda del FM-1": "The FM-1's wave",
  "En el sinte": "On the synth", "Seguir": "Follow", "Cambios": "Changes", "Editado": "Edited", "Gira el aparato": "Turn the device", "Clipper Live se usa en horizontal.": "Clipper Live is used in landscape.", "Guardar": "Save", "Descartar": "Discard", "Descartar lo editado": "Discard the edits",
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
  "Guardar el sonido": "Save the sound", "Nombre": "Name", "Ranura de usuario": "User slot", "Cancelar": "Cancel", "Aceptar": "OK", "SINTE": "SYNTH", "TABLET": "TABLET", "Cómo se toca": "How to play it", "Entendido": "Got it", "Ayuda: cómo se toca": "Help: how to play it", "Arrastra en horizontal": "Drag sideways", "sobre una tarjeta para cambiar su valor; en vertical, la página se desplaza.": "on a card to change its value; vertically, the page scrolls.", "Deja el dedo quieto": "Hold your finger still", "un momento mientras arrastras: modo fino ×¼, hasta que lo levantes.": "for a moment while dragging: fine mode ×¼, until you lift it.", "Doble toque": "Double tap", "en un valor: vuelve a como se cargó el sonido.": "on a value: back to how the sound was loaded.", "Lo que borra": "Anything that erases", "pide un segundo toque, en rojo con ⚠.": "asks for a second tap, in red with ⚠.", "En los pasos de SEQ:": "On SEQ steps:", "‹ › nudge (adelanta o retrasa), F fill, L lock, ' acento, ~ slide.": "‹ › nudge (early or late), F fill, L lock, ' accent, ~ slide.", "Con ratón:": "With a mouse:", "arrastra en horizontal; Shift mientras arrastras = fino ×¼; Inicio / Fin = mínimo / máximo. La rueda solo desplaza la página.": "drag sideways; Shift while dragging = fine ×¼; Home / End = minimum / maximum. The wheel only scrolls the page.", "Nombre de la página": "Page name", "Restaurar": "Restore", "Se reemplaza todo lo que hay en el FM-1.": "Everything on the FM-1 is replaced.", "Nombre del sonido": "Sound name", "Guardando…": "Saving…", "Leyendo las ranuras del FM-1…": "Reading the FM-1's slots…",
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
  "+ Página": "+ Page", "Páginas de LIVE": "LIVE pages", "Pánico: cortar todas las notas": "Panic: cut all notes", "en el sinte": "on the synth", "aquí": "here",
  "Aún no hay patrones guardados aquí. «Guardar este» copia el patrón del FM-1 a la tablet, para volver a él cuando quieras.": "No patterns saved here yet. \u201cSave this one\u201d copies the FM-1's pattern to the tablet, to come back to it whenever you like.",
  "Mover el rango a la izquierda": "Move the range left", "Mover el rango a la derecha": "Move the range right",
  "Un archivo por ranura, mono a 22 050 Hz; la raíz sale del nombre del archivo (por ejemplo «PIANO A4»). Cabe hasta 80 KiB comprimidos.": "One file a slot, mono at 22 050 Hz; the root comes from the file's name (for example \u201cPIANO A4\u201d). Up to 80 KiB compressed.",
  "Guardar aquí": "Save here", "Cargar sustituye el proyecto que suena. Guardar encima borra el que había. Las dos piden un segundo toque.": "Load replaces the project playing. Save over erases the one there was. Both ask for a second tap.",
  "Arrastra una tarjeta para ordenar · × quita · elige el tamaño abajo": "Drag a card to reorder · × removes · pick the size below", "Antes, una copia de lo que hay ahora (por si acaso)…": "First, a backup of what is there now (just in case)…",
  "Comprobando la copia…": "Checking the backup…", "Restaurado. El FM-1 tiene ahora lo de la copia.": "Restored. The FM-1 now has the backup's.", "Guardando el proyecto de ahora, por si acaso…": "Saving the project playing, just in case…",
  "No pude copiar el proyecto de ahora: no cargo": "Couldn't back up the project playing: not loading", "Nombre de la página": "Page name", "Ese archivo no se puede leer.": "That file can't be read.",
  "Ajustes de Live": "Live settings", "No se pudieron guardar los ajustes en este navegador": "The settings couldn't be kept in this browser", "¿Reemplazar los de aquí?": "Replace the ones here?", "Ese archivo no se puede leer": "That file can't be read",
  "Ese archivo no tiene páginas de LIVE": "That file has no LIVE pages", "Ese archivo no son ajustes de Live": "That file isn't Live settings", "exportados": "exported",
  "Las páginas de LIVE, HOME, la Biblioteca, el idioma y el resto de ajustes se guardan en este navegador, en este aparato: no en el FM-1. La página de Vercel y el archivo descargado guardan cada uno los suyos, y se pierden si borras los datos del sitio. Exporta para tener una copia o pasarlos a otro aparato.": "LIVE's pages, HOME, the Library, the language and the other settings are kept in this browser, on this device: not on the FM-1. The Vercel page and the downloaded file each keep their own, and they go if you clear the site's data. Export to keep a copy or to move them to another device.",
  "importados: vuelvo a empezar…": "imported: starting again…", "Herramientas": "Tools", "Cada una pide un segundo toque": "Each asks for a second tap", "Quitar la página": "Remove the page", "Páginas de LIVE": "LIVE pages", "Guardar el sonido actual": "Save the current sound", "Exportar": "Export", "Importar": "Import", "Etiquetas": "Tags", "A USER…": "To USER…", "Todas": "All",
  "Buscar por nombre o motor": "Search by name or engine", "¿En qué ranura USER?": "Which USER slot?", "Ningún sonido con eso.": "No sound matches.",
  "Aún no hay nada. Guarda el sonido que suena o importa una biblioteca del editor.": "Nothing yet. Save the sound playing or import a library from the editor.",
  "Se guarda en esta tablet, no en el FM-1. «A USER…» lo escribe en una ranura de usuario del sinte; desde ahí lo cargas en SAVE.": "Kept on this tablet, not on the FM-1. “To USER…” writes it to one of the synth's user slots; load it from there in SAVE.",
  "Etiquetas, separadas por comas": "Tags, separated by commas", "Nombre (hasta 12 letras)": "Name (up to 12 letters)", "en la biblioteca": "in the library", "fuera de la biblioteca": "out of the library",
  "Leyendo las ranuras…": "Reading the slots…", "BIBLIOTECA": "LIBRARY", "Fábrica…": "Factory…", "Volver a leer": "Read again", "Leyendo el patch…": "Reading the patch…",
  "Osciladores": "Oscillators", "Filtros": "Filters", "Envolventes y LFO": "Envelopes and LFOs", "Matriz": "Matrix", "Solo las que se usan": "Only the ones in use",
  "Cada cambio suena ya en el FM-1. Es el patch del sonido hasta que gires PTCH o cargues otro; guárdalo con Guardar.": "Every change plays on the FM-1 right away. It is the sound's patch until you turn PTCH or load another; keep it with Save.",
  "Nombre del patch": "Patch name", "Cargar un patch de fábrica": "Load a factory patch", "en el FM-1": "on the FM-1", "importado": "imported",
  "El FM-1 no aceptó el patch HYBRID": "The FM-1 didn't take the HYBRID patch", "Ese archivo no es un patch HYBRID": "That file is not a HYBRID patch", "No pude leer ese patch de fábrica": "Couldn't read that factory patch",
  "Pidiendo la lista al FM-1…": "Asking the FM-1 for the list…", "Biblioteca de la tablet": "Tablet library", "Bancos del FM-1": "FM-1 banks",

};
const RX = [
  [/^Escena (\d+): (.+)$/, "Scene $1: $2"], [/^Escena (\d+), libre$/, "Scene $1, free"], [/^S(\d+): ¿encima\?$/, "S$1: over it?"], [/^CC (\d+) · canal (\d+)$/, "CC $1 · channel $2"], [/^Nota (\d+) · canal (\d+)$/, "Note $1 · channel $2"],
  [/^en (\d+) compás$/, "over $1 bar"], [/^en (\d+) compases$/, "over $1 bars"], [/^guardada: (.+)$/, "saved: $1"], [/^: (.+), en tus descargas$/, ": $1, in your downloads"],
  [/^(.+): anterior$/, (m, x) => `${DICT[x] || x}: previous`], [/^(.+): siguiente$/, (m, x) => `${DICT[x] || x}: next`], [/^(.+): apagado$/, (m, x) => `${DICT[x] || x}: off`], [/^(.+): encendido$/, (m, x) => `${DICT[x] || x}: on`],
  [/^(.+): menos$/, (m, x) => `${DICT[x] || x}: less`], [/^(.+): más$/, (m, x) => `${DICT[x] || x}: more`], [/^(.+): nivel$/, (m, x) => `${DICT[x] || x}: level`],
  [/^Paso (\d+): vacío$/, "Step $1: empty"], [/^Paso (\d+): ligado$/, "Step $1: tied"], [/^Paso (\d+): (.+)$/, "Step $1: $2"], [/^Deshacer (.+): volver a (.+)$/, "Undo $1: back to $2"],
  [/^Editar (.+)$/, (m, x) => `Edit ${DICT[x] || x}`], [/^Abrir (.+)$/, (m, x) => `Open ${DICT[x] || x}`], [/^(\d+) pasos$/, "$1 steps"], [/^(\d+) sonidos$/, "$1 sounds"], [/^(\d+) de (\d+)$/, "$1 of $2"],
  [/^(\d+) zonas? · (.+)$/, (m, n, k) => `${n} zone${n === "1" ? "" : "s"} · ${k}`], [/^Anterior en (.+)$/, "Previous in $1"], [/^Banco (\d+)$/, "Bank $1"], [/^Proyecto (\d+)$/, "Project $1"],
  [/^Acorde de (\d+) notas$/, "Chord of $1 notes"], [/^Favorito (\d+): quitar$/, "Favourite $1: remove"], [/^Favorito (\d+) de (\d+)$/, "Favourite $1 of $2"], [/^Guardar en (U\d+)$/, "Save to $1"], [/^Reemplazar (U\d+)$/, "Replace $1"],
  [/^Se reemplaza (.+)\.$/, "Replaces $1."], [/^Guarda encima de (.+), el que suena\.$/, "Saves over $1, the one playing."], [/^Hasta 12 letras\. Sin nombre se llama (.+)\.$/, "Up to 12 letters. Without a name it is called $1."],
  [/^Poner (.+)$/, "Put $1"], [/^Generar en (.+)$/, "Generate in $1"], [/^Leyendo (.+) del FM-1…$/, (m, x) => `Reading ${DICT[x] || x} from the FM-1…`], [/^(.+) como se cargó (.+)$/, "$1 as loaded $2"],
  [/^Leyendo (\d+) de (\d+) KiB…$/, "Reading $1 of $2 KiB…"], [/^Escribiendo (.+)$/, "Writing $1"], [/^Copia guardada: (\d+) KiB\. Está en tus descargas\.$/, "Backup saved: $1 KiB. It is in your downloads."], [/^No se pudo: (.+)$/, "Couldn't: $1"],
  [/^([A-G]#?-?\d+), paso (\d+)(, suena)?$/, (m, n, k, on) => `${n}, step ${k}${on ? ", sounding" : ""}`],
  [/^No pude hacer la copia de lo de ahora, así que no restauro: (.+)$/, "Couldn't back up what is there now, so not restoring: $1"], [/^Copia del proyecto de ahora en tus descargas \((.+)\)$/, "Backup of the project playing in your downloads ($1)"],
  [/^(\d+) sonidos? en esta tablet$/, (m, n) => `${n} sound${n === "1" ? "" : "s"} on this tablet`], [/^Ver las (\d+)$/, "Show all $1"], [/^(U\d+) ¿encima\?$/, "$1 over it?"],
  [/^(\d+) sonidos? importados?$/, (m, n) => `${n} sound${n === "1" ? "" : "s"} imported`], [/^Ese archivo no se puede leer: (.+)$/, "That file can't be read: $1"],
  [/^Este sonido usa (.+)\. Carga un sonido HYBRID para editar sus osciladores, filtros y matriz aquí\.$/, "This sound uses $1. Load a HYBRID sound to edit its oscillators, filters and matrix here."],
  [/^(\d+) páginas? exportadas?$/, (m, n) => `${n} page${n === "1" ? "" : "s"} exported`], [/^(\d+) páginas? importadas?$/, (m, n) => `${n} page${n === "1" ? "" : "s"} imported`],
  [/^No pude leer el patch: (.+)$/, "Couldn't read the patch: $1"], [/^¿Quitar la página «(.+)»\?$/, "Remove the page “$1”?"], [/^¿Restaurar «(.+)»\?$/, "Restore “$1”?"],
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
const trObs = new MutationObserver((ms) => { if (LANG.cur !== "en") return; for (const m of ms) { if (m.type === "characterData") trNode(m.target); else if (m.type === "attributes") { const v = m.target.getAttribute(m.attributeName); if (v) { const t2 = tr(v); if (t2 !== v) m.target.setAttribute(m.attributeName, t2); } } else m.addedNodes.forEach(trNode); } });
function setLang(l) {
  const was = LANG.cur; LANG.cur = l; try { localStorage.setItem("clipperlive:lang", l); } catch (e) { /* (asked again next time) */ }
  document.documentElement.lang = l;
  document.documentElement.style.setProperty("--fine-txt", l === "en" ? '"FINE ×¼"' : '"FINO ×¼"');
  if (l === "en") { trNode(document.body); trObs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "title", "placeholder"] }); }
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
const trUi = (t) => (LANG.cur === "en" ? tr(t) : t);   /* (what the DOM does not show: a prompt's question) */

