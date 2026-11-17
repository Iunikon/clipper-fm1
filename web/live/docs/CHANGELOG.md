# Historial de cambios del fork

Todo lo hecho en el fork [Iunikon/clipper-fm1](https://github.com/Iunikon/clipper-fm1) sobre el **Clipper 1.3.1** del creador ([isod89/clipper-fm1](https://github.com/isod89/clipper-fm1)), del más viejo al más nuevo. Cada punto lleva su commit en `main`. Para el porqué de cada decisión, ver [`DECISIONS.md`](DECISIONS.md); para qué probar con el sinte, [`TESTING.md`](TESTING.md).

## Dónde está todo, hoy

| Qué | Dónde |
|---|---|
| Código | `main` de [Iunikon/clipper-fm1](https://github.com/Iunikon/clipper-fm1). Se conservan `favs-page` y `favs-screens` por el PR [#48](https://github.com/isod89/clipper-fm1/pull/48), abierto con el creador. |
| App publicada | https://clipper-live-eta.vercel.app |
| Archivo sin internet | `web/live.html` (y `~/clipper-out/clipper-live.html` en el PC de casa) |
| Firmware | `sh build.sh` → `build/felucca.fwsc`. Flasheado en el FM-1 el 12 de noviembre: responde «FELUCCA CLIPPER 1.3.1», protocolo 15. |
| Coste en el sinte | +2.880 B de flash y +32 B de RAM sobre el Clipper 1.3.1; quedan 16.552 B libres de 581.564. |
| Pruebas | `tests/live_editor_test.c` (51 comprobaciones, pasa). La suite completa pasa salvo `target_budget: drums_mix`, que también falla en el original del creador. |

---

## 1 de noviembre: la página FAVS (firmware)

- **SAVE > FAVS**: una página con solo los favoritos, entre USER y TOOLS; PRESETS y HOME sin filas FAV repetidas, cada favorito en su tipo en naranja. Enviado al creador como PR #48. `87ffcf6`

## 8 de noviembre: nace Clipper Live

**Firmware: el protocolo Live (v15).**
- La página que muestra el sinte y los favoritos para el editor (comandos 97–101). `a98dd0a`
- LIST, LIST_GO y los knobs de HOME en cada PAGE. `b1d99f7`
- EDITED: aviso cuando el sonido pasa a editado; punto naranja de «editado» en HOME y en el pie de cada página del sinte. `281f29b` `4235c8c`
- Sin parpadeo al editar desde fuera: un valor cambiado desde la tablet ya no redibuja toda la pantalla del FM-1. `0d05556`

**La app (`web/live.html`).**
- La primera versión: una página que va al lado del FM-1 y lo sigue. `3cd9562`
- RÁPIDO (panel de control), carpetas en bloques, SAVE como vista, el riel izquierdo con «En el sinte» y «Cambios». `a589c91` `e4e08f7` `8343b5c` `34cf3ba`
- **Guardar** el sonido en una ranura de usuario desde la tablet. `e52aa62`
- El sitio para Vercel con botón de descarga; se abre directo, vacía, con «Conectar». `c3fec1e` `ed05542`
- Hecha para la tablet Huawei de 11,5" en horizontal. `85cc304` `b44d388`
- Gráficas y osciloscopio como los dibuja el FM-1. `0d05556`
- El secuenciador nativo; SAVE > TOOLS; el tipo de sonido en verde y el motor en azul. `c419e25`

## 9 de noviembre: las carpetas como el sinte

- **Firmware:** las páginas propias del sinte (LAYER, MORPH, RANDOM, UNDO, MATRIX, MOD SEQ, TUNING, MIDI), el estado (CPU, escala, REC) y REC para la tablet (comandos 109–113). `54c51f2`
- Carpetas como las páginas del sinte, en su orden; REC como pestaña; HOME con los favoritos; LIVE configurable. `6077a15` `2b7154d`
- El osciloscopio propio del FM-1 (comando 108); Estudio dentro de la app; barra de favoritos ocultable. `ea08ed3`
- HOME conserva los 4 knobs del sinte; USER siempre en SAVE. `b78f384` `accb03d`
- **Doble toque** en un valor: vuelve a como se cargó el sonido. `38200d0`
- `TESTING.md`: qué probar con el FM-1 real. `2aa6d1e`

## 11 de noviembre: Estudio propio, HYBRID y el celular

- Estudio es de Live, no el editor viejo. `efc2e36`
- SEQ con NOTES y PATTERN y una vista MIDI; una sola gráfica para SEL y LAYER; candado de LIVE; inglés. `676b403`
- Una lista de todas las opciones junto a las flechas; sin Drum kits (Clipper no tiene batería). `729b6e9`
- Editar LIVE: la tarjeta sigue al dedo y las demás le hacen sitio. `1af17dd`
- **HYBRID completo y FMX desde la tablet, Biblioteca con etiquetas, páginas de LIVE, arrastre fino, copia antes de restaurar.** `2879d46`
- LIVE sin candado sigue al sinte por sus carpetas. `fa78bd2`
- Herramientas de SAVE en su propia entrada. `139a0fd`
- **Versión para celular en horizontal** (~852 × 393). `65144d6`

## 12 de noviembre: PC, la revisión del trabajo y el escenario

**Pantallas e interacción.**
- PC y otras pantallas (primero con zoom; después reemplazado, ver abajo). `4ad307a`
- Micro-interacciones y rendimiento (osciloscopio solo cuando hace falta, menos repintados). `fcad9cd`
- **Densidad de escritorio con ratón**, sin zoom: más tarjetas por fila, páginas de dos en dos desde 1600 px. `5ae9ac1`
- La rueda del ratón ya no cambia valores (solo desplaza). `10b1a90`
- Doble toque más fácil: hasta 0,55 s entre toques. `29fed73`
- Tarjetas de LIVE medidas en tablet, celular y PC y fijadas a los tamaños en que caben; controles de Editar en una franja abajo. `f0ee732`

**La revisión hecha en el trabajo (Impeccable).**
- Etiqueta EDIT, rojo con ⚠ y segundo toque en lo que borra, hojas propias en lugar de las del navegador, Tempo arrastrable, «Cómo se toca», objetivos de 40–44 px, aviso en vertical. `72e5a6c`
- Maquetas guardadas en `web/live/proposals/`. `1ff13c0`

**Ajustes y copias.**
- Exportar e importar las páginas de LIVE y todos los ajustes; dónde se guardan. `fae2cc7` `9e815e2`
- `DECISIONS.md` para revisar y seguir. `6dfef86`

**Git y código.**
- Todo unido en `main`; README con la sección «This fork». `d16ffd2`
- El código de Live en carpetas por área (`estilos/`, `codigo/`, `docs/`, `build-order.txt`), con la misma app byte a byte. `04908f5`
- **Firmware más ligero:** FAVS manda la posición en la lista (FAV_GO retirado), osciloscopio sin copia; −208 B de flash y −1 KB de RAM. `5cc76b2`

**Para tocar en vivo (ideas del LIVE de SLOOP).**
- **Escenas** con transformación por compases y crossfader A/B, **MIDI learn**, **grabar el set** por el audio USB, **reloj del set**. Nada en el firmware. `f27d89a`
- Botón **MIDI** en la barra de arriba; toda la app revisada en inglés. `0423967`
- SEQ abre el **secuenciador avanzado** por defecto; «Pasos» como segundo modo. `f964496`

**Pequeños.**
- Sin contorno en los números de los faders; tipo de sonido verde sin recuadro; «APP» en lugar de «TABLET» en Cambios; Estudio más ordenado (HYBRID de cuatro en cuatro). `5ae9ac1` `f0ee732`

## 13 de noviembre: el paso elegido y el celular propio

- **Firmware: CURSOR (comando 114).** El paso que se edita en el sinte (`ui.cursor`) y el elegido en la tablet son el mismo: elegirlo en la app lo mueve en el FM-1 (con su grupo de 16), moverlo en el FM-1 lo marca en la app; fuera del patrón se lleva dentro, como KNOB 1. Hay que compilar y flashear para usarlo; con un firmware anterior la app no lo pide más tras el primer intento. 5 comprobaciones nuevas en `tests/live_editor_test.c`.
- **Versión propia del celular** (`styles/screens/phone.css`, sin zoom): gráfica a la izquierda y sus 4 valores 2 × 2 a la derecha, valores en Terminus 24, cuatro columnas en las páginas sin gráfica, herramientas del secuenciador en una fila que se desplaza, SAVE de cuatro en cuatro, Glide a 28 px. Entre un 25 y un 38 % menos de scroll por carpeta.
- **Celular a la escala de la barra de carpetas:** etiquetas de 11 px, valores en Terminus 16, botones de 28–34 px; SAVE de 3016 a 1294 px de alto, LIVE sin tarjetas cortadas.
- **Botón «Ver la demo, sin el sinte»** en la pantalla de inicio: la app con el FM-1 de ejemplo, sin pasar páginas sola.
- **Harden:** «No contesta» en la barra y la pantalla atenuada cuando el FM-1 deja de responder (vuelve sola); una subida o una restauración cortada dice qué pasó y qué hacer; cerrar la página a mitad de una escritura pregunta antes; un firmware sin Live lo dice con su versión.
- **Optimize:** la Terminus solo con los glifos que usa Live (de 101 a ~45 KB): la app pasa de 613 a 561 KiB.
- **Para compartir:** carpetas y archivos en inglés (`code/`, `styles/`, `build-order.txt`, `template.html`, `docs/CHANGELOG.md`…), todos los comentarios del código en inglés y el README de `web/live` en inglés. La interfaz sigue en español con su inglés en `code/lang/english.js`.
- **Celular elegido entre variantes (Impeccable `generate`):** carpetas con gráfica «compactas» (gráfica a la izquierda, valores 2 × 2); REC en dos columnas (estado y REC/PLAY a un lado, los cuatro ajustes al otro); LIVE «todo a la vista» (seis columnas: Filtro y Efectos de 3 × 2, los accesos de uno en uno); la barra de arriba solo con el sonido, el favorito y PLAY / REC, y lo demás en un menú «⋯»; sin barra izquierda en el celular; SEQ con los 16 pasos en una fila y, debajo, el carril a la izquierda y el editor del paso a la derecha; SAVE con las carpetas en una fila arriba, la lista en 3 columnas y el sonido actual fijo a la derecha.
- **Ideas del editor SHRUB (de Xfer, para el mismo FM-1), solo de uso e información:** mantener el dedo quieto en una tarjeta (o clic derecho) abre su ficha: qué hace, su valor, su rango, el CC MIDI con que el FM-1 la mueve (el mapa de `seq.c`) y la tecla de tu controlador si la aprendiste; deshacer el último cambio desde ⌘Z / Ctrl+Z, la línea de estado y el menú «⋯» del celular (deshace justo el que muestra, aunque el sinte cambie otro mientras); una línea de estado bajo el trabajo en tableta y escritorio (conectado, demo o «No contesta», y qué se hace en esa carpeta); el patrón vacío de SEQ dice cómo empezar uno.
- Auditoría de Impeccable (16/20) y sus arreglos: marcas de los pasos y «RANGO» a 11 px, el FM-1 de ejemplo ya no mueve el paso bajo el dedo, la pantalla solo sigue al paso del sinte si la rejilla está a la vista.


## 17 de noviembre: la barra de arriba, en cajas

Elegida entre cuatro propuestas (la A). La barra va en cuatro cajas grises, sin líneas: el sinte (nombre, estado y CPU), el sonido (‹ nombre › ★ y Guardar), el transporte (BPM, TRN, PLAY y REC, sin bordes dentro de la caja) y «Seguir» con «⋯». El botón de los favoritos pasa a «⋯» en la tableta. Después, más chica y con menos que leer: la barra baja de 64 a 56 px y las cajas a 40 px; el nombre del sonido va a 17 px y el BPM a 18 px; la caja del sinte es una línea con el nombre y la CPU, y su estado solo sale cuando el FM-1 no contesta. La auditoría de Impeccable (16/20) dejó cuatro arreglos, ya hechos: cada botón de las cajas responde en 44 px aunque se vea de 40; el estado del sinte se anuncia a un lector de pantalla (`role="status"`); la barra es una fila flex definida solo en `bar.css` (antes sus columnas estaban en cinco archivos); y entre 1024 y 1100 de ancho la caja del sinte se queda con su punto y la CPU. El celular conserva su barra. Archivos: `template.html`, `styles/frame/bar.css`, `styles/screens/desktop.css`, `styles/screens/phone.css`, `styles/views/studio.css`, `styles/frame/nav.css`, `styles/screens/pc.css`, `styles/screens/phone-base.css`.

**El pulido que quedó (P3):** PLAY y REC en reposo son teclas llenas (gris `--press`), no texto suelto; PLAY y REC con la misma letra (los números del paso solo mientras suena); «BPM» a 11 px. En «Cómo se toca», los atajos de teclado que faltaban: ← → (con Shift de uno en uno), RePág / AvPág, Inicio / Fin y Esc. Archivos: `code/frame/transport.js`, `code/frame/left-rail.js`, `code/lang/english.js`, `styles/frame/bar.css`, `styles/screens/phone.css`.

## 17 de noviembre: la tableta, con las notas de la prueba con el FM-1 real

De [`PRUEBAS-TABLETA.md`](PRUEBAS-TABLETA.md), las notas sin firmware y ya decididas:

- **Barra y línea de estado (3, 4, 5, 6):** fuera la línea de estado de abajo (repetía «Conectado» y las ayudas, y su botón se encimaba abajo a la derecha). El menú «⋯» sale también en la tableta, con Deshacer, MIDI learn, Cómo se toca y Pantalla completa; la barra ya no se amontona. Con ratón, en escritorio, esos botones siguen también en la barra.
- **SAVE sin la barra izquierda (32):** usa todo el ancho; la barra vuelve en las demás carpetas.
- **Sin líneas divisorias (10, 13)** en toda la app; Generar y la biblioteca de patrones de SEQ, en un cuadro gris.
- **Grises más claros (22):** `--panel` `#1a1a1e`, `--raised` `#26262b`, `--line` `#3a3a40`, `--tx-3` `#9a9aa4`; los grises escritos a mano pasan a tokens.
- **Tarjetas más bajas (11)** y **los sonidos de SAVE con sus dos filas juntas (25)**.
- **CPU, LATE y PEAK al mismo peso (15)** en GLO > SYSTEM, en rojo desde el 90 %, y se repinta con cada estado del FM-1.
- **Opciones que no caben, con flechas y lista (31):** p. ej. el tiempo de la reverb.
- **Estudio (14, 16):** sin el secuenciador avanzado repetido (queda en SEQ > Avanzado; Estudio abre en HYBRID); el idioma, en una lista.
- **Inglés (8):** «Conectado  USB MIDI», unos 20 avisos y dos textos que vivían en el CSS.
- **SEQ en la octava del sinte (1):** las notas nuevas y el piano roll empiezan en la octava de OCT − / + (llega en STATE) y la siguen cuando cambia.
- **SEQ sigue el paso del sinte al grabar (2):** el firmware ya mandaba CURSOR; por si el aviso se pierde, cada nota escrita en el sinte hace que la web pregunte en qué paso quedó el cursor. Falta probarlo con el FM-1.

**Segunda tanda, lo que se puede hacer sin el sinte:**
- **Pantalla encendida mientras haya uso (9):** wake lock que se suelta tras unos minutos sin tocar, sin mandar ni recibir valores y sin SEQ sonando; los minutos (o apagado) en Estudio > Sistema.
- **Un renglón por sonido o ranura (17, 18):** Biblioteca (A USER… y «⋯» con Etiquetas, Renombrar, Borrar), Proyectos y Samples.
- **Favicon nuevo (23):** cuatro faders con los colores de los knobs, sin la rejilla de 2 × 2.
- **FX 1 y MACROS solo con las barras (28):** sin tarjetas repetidas; las barras abren la ficha (clic derecho o mantener) y aprenden MIDI.
- **El valor suelto en la rejilla de su hermana (30):** INSERT · INSERT 2, VOICE 2 · VOICE 3, ENV 2 · ENV 2 LOOP, DLY · DLY 2…; el marco del sinte sigue en las tarjetas de su página.
- **Gráfica a la izquierda y valores a la derecha en la tableta (29)** para las curvas (ENV, LFO, FILTER, DLY, REVERB, EQ+COMP).
- **ENV y LFO con pestañas (20):** ENV 1 · 2 y LFO 1 · 2 · 3 sobre el mismo lugar; con «Seguir», la del sinte; se recuerda la última.
- **SEQ > Completo en grupos (26):** Rango, Edición (con íconos), Tono y 8va, ACC / SLIDE, y lo poco usado detrás de «⋯»; **Generar (27)** en una rejilla pareja con Generar y Deshacer fijos a la derecha.
- **Formas de onda con dibujos (21)** donde todas las opciones son formas conocidas (la WAVE de los LFO).
- **Reordenar en la Biblioteca (24):** con ▲ ▼ solo en ese modo, para no chocar con el scroll.
- **Horizontal (33):** Live pide horizontal al primer toque; el aviso en vertical ofrece «Ver en horizontal» (pantalla completa y gira).
- **De la auditoría:** el foco vuelve a la tarjeta al cerrar su ficha, la ayuda de SPACE completa, «MIDI» de la barra a 11 px, Shift+F10 en «Cómo se toca».

---

## Lo siguiente

**Probar con el FM-1** (ver `TESTING.md`):
- seguir al sinte, editar sin parpadeo, Guardar en una ranura, favoritos por la lista nueva;
- HYBRID y FMX, la Biblioteca «A USER…», copia y restauración;
- escenas y su transformación, **MIDI learn con un controlador real**, **grabar el set** por el audio USB;
- el celular y el PC con el sinte de verdad.

**Pendientes de diseño y de código:**
- la versión de escritorio, aparte de la del celular;
- el manifiesto del sitio con `"orientation": "landscape"`.

**Con el creador:**
- el PR #48 (FAVS) sigue abierto;
- avisó que va a actualizar: cuando publique, mezclar su versión en `main`, compilar y medir; lo nuestro toca pocas líneas suyas;
- si se le enseña Live: nuestro `editor_live.c` se llama igual que uno de SLOOP (su comando LIVE 77); conviene aclararlo o renombrarlo;
- comentarle que su `target_budget` todavía nombra `drums_mix`, que ya no existe.
