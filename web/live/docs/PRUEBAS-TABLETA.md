# Pruebas en la tableta, 14 de noviembre de 2026

Notas de Jorge al usar Clipper Live en la tableta con el FM-1 real, para corregir después. Se probó con el firmware y la app de la última versión de `main` (último commit `2ddfa2c`), así que CURSOR (comando Live 114) ya estaba en el sinte.

**Plan:** dejar estable la versión de tableta con estas notas y, después, revisar el celular.

**Hechas el 17 de noviembre** (en la demo; falta probarlas en la tableta con el FM-1): 1, 3, 4, 5, 6, 8, 10, 11, 13, 14, 15, 16, 22, 25, 31 y 32. La 2 tiene un arreglo en la web que hay que probar con el sinte. Qué se hizo en cada una está en [`CHANGELOG.md`](CHANGELOG.md).

## Resumen

| # | Dónde | Nota | Toca el firmware | Estado |
|---|---|---|---|---|
| 1 | SEQ | Empezar en la octava en que está el sinte | No | Hecha (17 nov) |
| 2 | SEQ (pasos y Completo) | Marcar en la web el paso en que va el sinte al grabar | Por revisar | Arreglo en la web (17 nov): probar con el sinte |
| 3 | Tableta | Botón de regresar encimado, abajo a la derecha | No | Hecha (17 nov) |
| 4 | Tableta | Barra de arriba amontonada: el menú «⋯» también en tableta | No | Hecha (17 nov) |
| 5 | Tableta | «Conectado» sale dos veces (arriba y abajo) | No | Hecha (17 nov) |
| 6 | Tableta | Las ayudas de la línea de estado, en un solo lugar | No | Hecha (17 nov) |
| 7 | MIDI learn | No escucha un controlador conectado al FM-1 | Sí | |
| 8 | Inglés | Textos que siguen en español | No | Hecha (17 nov) |
| 9 | General | Pantalla encendida mientras haya actividad | No | |
| 10 | Carpetas | Quitar las líneas blancas bajo los títulos, en toda la app | No | Hecha (17 nov) |
| 11 | Carpetas | Tarjetas de valor menos altas | No | Hecha (17 nov) |
| 12 | EDIT > UNDO | Decir qué cambió en cada paso, y mostrar los de rehacer | Sí | |
| 13 | Estudio > Sistema | Quitar las líneas del título «System» | No | Hecha (17 nov) |
| 14 | Estudio > Sistema | El idioma en un selector, no en pestañas | No | Hecha (17 nov) |
| 15 | GLO > SYSTEM | Más peso para LATE y PEAK junto a CPU | No | Hecha (17 nov) |
| 16 | Estudio | Quitar el secuenciador avanzado repetido | No | Hecha (17 nov) |
| 17 | Estudio > Biblioteca | Cada sonido en un solo renglón | No | |
| 18 | Estudio > Proyectos | Cada ranura en un solo renglón | No | |
| 19 | Estudio | Los ajustes del sinte (HOME largo) desde la web | Sí | |
| 20 | ENV, LFO | Una sola gráfica con pestañas ENV 1 · 2 · 3 y LFO 1 · 2 · 3 · 4 (idea de SHRUB) | No | |
| 21 | Formas de onda | Elegir la forma de onda con dibujos, no con texto (idea de SHRUB) | No | |
| 22 | General | Aclarar los grises: con luz de día no se distinguen del negro | No | Hecha (17 nov) |
| 23 | General | Cambiar el favicon: se parece mucho al logo de Microsoft | No | |
| 24 | SAVE, Biblioteca, Favoritos | Reordenar los sonidos con un botón «Reordenar», sin chocar con el scroll (idea de SHRUB) | Para USER, sí | |
| 25 | SAVE | Juntar las dos filas de cada sonido para hacer menos scroll | No | Hecha (17 nov) |
| 26 | SEQ > Completo | Menos botones y más visuales en la barra de herramientas y el piano roll | No | |
| 27 | SEQ > Generar | Ordenar lo que hay dentro de cada pestaña y aprovechar el espacio | No | |
| 28 | FX (página 1), EDIT (MACROS) | Los valores salen dos veces: dejar solo las barras verticales | No | |
| 29 | Todas las páginas con gráfica | La gráfica a la izquierda y los valores a la derecha, en vez de una gráfica a todo lo ancho | No | |
| 30 | FX > INSERT, EDIT | El valor suelto de la última página queda solo a todo lo ancho: juntarlo con los demás | No | |
| 31 | FX > REVERB | Las 4 opciones del tiempo de reverb se cortan («…»): usar el selector con flechas y lista | No | Hecha (17 nov) |
| 32 | SAVE | Sin la barra izquierda: SAVE solo para manejar sonidos | No | Hecha (17 nov) |
| 33 | General | En vertical, mostrar la app en horizontal en vez del aviso «Gira el aparato» | No | |

---

## SEQ

### 1. Empezar en la octava en que está el sinte

- **Qué pasa:** al empezar a poner notas, la tableta estaba en la primera octava y el sinte en +2. Hay que subir la octava a mano.
- **Qué se quiere:** que al editar desde la tableta tome la octava del sinte y muestre esas notas.
- **Dónde:**
  - el firmware ya la manda: en STATE va `song.octave + 8`, de −3 a 3 (`firmware/src/editor_live.c`, línea 202);
  - la web no la lee: el piano roll toma su octava de la última nota usada (`SQ.oct` sale de `SQ.last`, en `code/views/seq/full.js` línea 56);
  - el arreglo es leer la octava en `core/receive.js`, guardarla en `M.state` y empezar con ella el piano roll y las notas nuevas de la vista de pasos.

### 2. Marcar en la web el paso en que va el sinte al grabar

- **Qué pasa:** al poner notas desde el sinte, el paso avanza (1, 2, 3, 4…), pero la web sigue marcando el que se eligió a mano.
- **Qué se quiere:** que la web marque el paso del sinte, en las dos vistas:
  - la de pasos (`code/views/seq/steps.js`);
  - «Completo» (`code/views/seq/full.js`).
- **Aclarado:** que tocar un paso en la tableta lo edite en el momento, aunque el sinte tenga otro seleccionado, está bien así. Lo que falta es que la web siga al sinte cuando el paso avanza solo.
- **Por revisar:** CURSOR ya está en el firmware, así que esto es un fallo y no un firmware viejo. Revisar si el firmware avisa a Live cuando el paso avanza solo al grabar una nota (y no solo al girar KNOB 1), y si la web pinta ese aviso en las dos vistas.
- **Revisado (17 de noviembre):** el firmware sí avisa. Al soltar las teclas en la entrada por pasos, el cursor avanza con `cursor_set(ui.cursor + 1)` (`ui_input.c`) y `ed_lv_sync` manda CURSOR (`editor_live.c`), y la web lo pinta en las dos vistas (`sqFromDevice`). No se encontró por qué no llegó en la prueba.
- **Arreglo en la web:** cada vez que el sinte escribe una nota en un paso (STEP_CHANGED), la web le pregunta en qué paso quedó el cursor y lo marca (`sqAskCursor` en `code/views/seq/steps.js`). Así se sigue al sinte aunque se pierda el aviso.
- **Por probar con el sinte:** grabar 4 notas seguidas en la entrada por pasos y ver que la tableta marca 1, 2, 3, 4, en la vista de pasos y en Completo. Si sigue sin moverse, puede ser la grabación en tiempo real (con PLAY): ahí lo que avanza es el paso que suena, que la web ya marca aparte.

### 26. SEQ > Completo: menos botones y más visuales

- **Qué pasa:** en el secuenciador avanzado, con el piano roll, hay demasiados botones: Extender, ALT, Copiar, Pegar, Borrar, subir y bajar tono, subir y bajar octava, flechas… Además, los grupos de botones van separados por líneas verticales.
- **Qué se quiere:**
  - simplificar: menos botones a la vista y más visuales (íconos en vez de solo texto);
  - quitar las líneas verticales y agrupar cada familia de botones en un cuadro gris (nota 10).
- **Dónde:**
  - las líneas son `.sqsep` en `styles/views/seq-full.css` (línea 10): `width: 1px; background: var(--line-2)`;
  - los botones están en `code/views/seq/full.js` (la barra y el piano roll: `Octava −` / `+`, `data-sqop`…).
- **Ideas:**
  - **grupos:** Rango (Extender), Edición (Copiar, Pegar, Borrar, Invertir), Altura (tono ±, octava ±), cada uno en su cuadro;
  - **íconos:** copiar, pegar, papelera, ▲ ▼ para el tono y «8va ▲ ▼» para la octava;
  - **menos a la vista:** lo que se usa poco (ALT, Invertir…) dentro de un «⋯», como en la barra del celular;
  - **octava:** la del piano roll empieza en la del sinte (nota 1), así casi no hará falta moverla.

### 27. SEQ > Generar: ordenar lo de cada pestaña

- **Qué pasa:** al final del secuenciador, en Generar, están las pestañas Euclídeo, Aleatorio, Preset y Humanizar. Dentro de cada una:
  - los datos se ven desordenados;
  - queda mucho espacio sin usar;
  - el bloque va separado del resto por la misma línea blanca.
- **Qué se quiere:**
  - acomodar los valores de cada pestaña en una rejilla pareja, que use el ancho;
  - quitar la línea y meter todo Generar en un cuadro gris (nota 10).
- **Dónde:**
  - el HTML está en `code/views/seq/generate-and-midi.js` (`GEN_T`, desde la línea 663, y el bloque `.sqgen`, línea 712);
  - los estilos están en `styles/views/seq-full.css`: `.sqgen` tiene `border-top: 1px solid var(--line)` (línea 81), y `.gnr` es un `flex-wrap` con `align-items: flex-end`, que deja los valores sueltos y con huecos.
- **Idea:** las mismas tarjetas de valor que en las carpetas, en una fila de 4 (o 2 × 2), con el botón «Generar en A–B» y «Deshacer» fijos a la derecha. Así cada pestaña se ve igual, solo cambian los valores.

## La tableta

### 3. Botón de regresar encimado

- **Qué pasa:** el botón de regresar, en la esquina de abajo a la derecha, queda encima de otro elemento que se ve debajo.
- **Qué se quiere:** que nada quede encimado.

### 4. La barra de arriba se amontona

- **Qué pasa:** después de editar varias cosas, lo que está en la barra se encima.
- **Qué se quiere:** el menú «⋯» del celular (`code/frame/more-menu.js`) también en la tableta, cuando ya no quepa todo.

### 5. «Conectado» sale dos veces

- **Qué pasa:** lo dice el ícono verde de arriba a la izquierda y también la línea de estado de abajo.
- **Qué se quiere:** dejarlo en un solo lugar, para ganar espacio.

### 6. Las ayudas de la línea de estado

- **Qué pasa:** la línea de abajo muestra ayudas como «doble tap para regresar».
- **Qué se quiere:** tenerlas en un solo lugar, sin que se repitan.
- **Dónde:** las notas 5 y 6 son de la línea de estado del 13 de noviembre (`styles/frame/status.css`, `code/frame/info.js`). Probablemente haya que rehacer esa línea o quitarla en la tableta.

## MIDI

### 7. El MIDI learn no escucha un controlador conectado al FM-1

- **Qué pasa:** sale «mueve la perilla o pulsa la tecla», pero no detecta pads, faders ni sliders.
- **Conexión de la prueba:** el controlador va al FM-1 por un cable MIDI de 3.5, y el FM-1 va a la tableta por USB.
- **Causa:**
  - el learn escucha todas las entradas MIDI menos la del FM-1 (`mlAttach` en `code/frame/set.js`: `inp !== M.fmIn`);
  - además, no se encontró en el firmware nada que pase por USB lo que entra por el MIDI IN de 3.5 (thru).
- **Qué se quiere:** que funcione con el controlador conectado al sinte, que es como se usa en vivo.
- **Qué haría falta:**
  1. en el firmware, mandar por USB lo que entra por el MIDI IN, o al menos los CC y las notas;
  2. en la web, escuchar también la entrada del FM-1 en el learn y no confundir esos mensajes con los del propio sinte (por canal, por ejemplo).
- **Mientras tanto:** conectar el controlador directo a la tableta con un hub USB.

### 8. Textos que siguen en español con la app en inglés

- **Qué pasa:**
  - el aviso del MIDI learn sale en español;
  - en la barra de arriba dice «Clipper conectado USB MIDI».
- **Qué se quiere:** que todo salga en inglés.
- **Dónde:** les falta su entrada en `code/lang/english.js`. Conviene recorrer todas las pantallas en inglés, porque ya estaba pendiente revisarlo en pantalla.

## General

### 9. Pantalla encendida mientras haya actividad

- **Qué pasa:** la tableta apaga la pantalla si no se toca, aunque se siga usando el sinte.
- **Qué se quiere:** que siga encendida mientras haya actividad, y que se apague solo cuando no se toca la pantalla **y** no se envían ni se reciben parámetros.
- **Cómo:**
  - pedir `navigator.wakeLock.request("screen")` y apuntar la hora de la última actividad. Cuentan un toque, una tecla, lo que llega del FM-1 (`core/receive.js`) y lo que se le manda (`core/send.js`);
  - después de X minutos sin actividad, soltar el wake lock para que la tableta se apague sola;
  - volver a pedirlo con la siguiente actividad y cuando la app vuelve al frente.
- **Decidido:** el tiempo sin actividad se ajusta en Estudio > Sistema (`code/views/studio/system.js`).
- **Propuesta:** que el SEQ en PLAY cuente como actividad.
- **Ojo:** el wake lock solo funciona con HTTPS (en Vercel sí). Puede no funcionar abriendo `live.html` como archivo.

### 33. En vertical, mostrar siempre la app en horizontal

- **Qué pasa:** con la tableta en vertical sale un aviso «Gira el aparato: Clipper Live se usa en horizontal».
- **Qué se quiere:** no mostrar el aviso y presentar siempre la app en horizontal, aunque el aparato esté en vertical.
- **Dónde:**
  - el aviso lo arma `code/components/gestures.js` (línea 89), con su texto en inglés en `lang/english.js`;
  - se muestra con `@media (orientation: portrait) and (max-width: 1100px)` en `styles/review.css` (línea 2);
  - `start.js` (línea 10) ya intenta fijar la orientación con `screen.orientation.lock("landscape")`, pero solo al entrar en pantalla completa.
- **Cómo:**
  1. **Fijar la orientación:** pedir `screen.orientation.lock("landscape")` en cuanto se pueda (al conectar o al tocar «Ver la demo»), no solo con pantalla completa. Chrome en Android lo permite en pantalla completa o con la app instalada (PWA); en el `manifest` poner `"orientation": "landscape"` para que la app instalada siempre abra en horizontal.
  2. **Si el navegador no deja fijarla** (Safari en iPad, por ejemplo): girar la app 90° con CSS en vertical (`transform: rotate(90deg)` en el contenedor, cambiando ancho y alto y usando `--vw`/`--vh` intercambiados), en vez del aviso.
- **Ojo con el giro por CSS:**
  - los arrastres verticales (faders, tiradores) se leen con las coordenadas del dedo: al girar, hay que convertirlas (x ↔ y) en `components/gestures.js`, o los arrastres irán de lado;
  - las hojas, los toasts y las listas que se abren deben quedar dentro del contenedor girado;
  - el teclado del sistema (al renombrar) seguirá saliendo en vertical.
- **Al terminar:** quitar el aviso y sus textos de `english.js`.

## Carpetas

### 10. Quitar las líneas blancas bajo los títulos

- **Qué pasa:** en FX > CHORUS y en las demás carpetas hay una línea blanca bajo el título. No aporta y quita espacio.
- **Qué se quiere:** quitarla, o agrupar la página de otro modo (un cuadro, por ejemplo), pero sin líneas.
- **Dónde:**
  - `.pgh` en `styles/views/folders.css`;
  - `.bh` en `styles/components/blocks.css`.
- **Para que sea parejo:** hay líneas iguales en `.svh` (SAVE), `.stt` (las pestañas de Estudio) y `.langq` (el idioma). La regla sería **sin líneas de separación** en toda la app, y apuntarla en `DECISIONS.md`.
- **Decidido (15 de noviembre):** en toda la app, sin líneas divisorias, ni horizontales ni verticales. Lo que va junto se agrupa en un cuadro gris (un panel con `--panel` o `--raised`) que diga «esto es un solo elemento». Aplica también a las notas 13, 26 y 27.

### 28. FX, página 1: los niveles salen dos veces

- **Qué pasa:** en FX 1, donde se ajusta cuánto de cada efecto va al master, los mismos cuatro valores salen dos veces:
  - en la gráfica, como barras verticales que se arrastran;
  - debajo, como tarjetas con su barra horizontal.
- **Qué se quiere:** usar solo una forma, las **barras verticales**, y quitar las tarjetas horizontales de esa página.
- **Causa:** la gráfica «meters» usa los cuatro valores de la página (`GUSE.meters = [0, 1, 2, 3]` en `code/components/base.js`), y aun así se pintan las cuatro tarjetas (`PGRAPH.FX = "meters"` en `code/views/folders.js`).
- **Qué haría falta:**
  - cuando la gráfica ya mueve todos los valores de la página, no pintar sus tarjetas;
  - que cada barra vertical diga su nombre y su valor en número, porque ya no estará la tarjeta para leerlo;
  - mantener en las barras lo que daba la tarjeta: la ficha con la pulsación larga, el modo fino y el MIDI learn.
- **Confirmado en EDIT (15 de noviembre):** pasa lo mismo, con controles horizontales y verticales para los mismos valores (MACROS usa la misma gráfica). Ahí también se quedan solo los **verticales**.
- **Por revisar:** otras páginas cuya gráfica mueve todos sus valores, como ENV o DLY, quizá también. **Decidido:** la regla vale para las gráficas de barras (FX 1, MACROS): **si las barras mueven un valor, no sale también como tarjeta**. Las gráficas de curva (ENV, LFO, FILTER…) sí llevan sus tarjetas a la derecha (nota 29).

### 29. FX > FILTER: la gráfica a la izquierda y los valores a la derecha

- **Qué pasa:** en FX > FILTER la gráfica ocupa todo el ancho de la página, más grande de lo necesario, y debajo solo hay 2 valores.
- **Qué se quiere:** en la tableta, partir la página en dos columnas: la gráfica a la izquierda y los valores a la derecha. Así la página es más compacta.
- **Para qué páginas:**
  - FILTER (2 valores);
  - REVERB (4 valores, en 2 columnas a la derecha): confirmado, la gráfica también está demasiado grande;
  - EQ+COMP: confirmado, la gráfica también está demasiado grande;
  - ENV: confirmado, la gráfica está demasiado grande; los 4 valores a la derecha en 2 × 2 (1 y 2 arriba, 3 y 4 abajo);
  - revisar las demás páginas con gráfica y de 2 a 4 valores (CHORUS, DLY, LFO…).
- **Decidido (15 de noviembre): regla para todas las gráficas en la tableta.** Toda página con gráfica (ENV, LFO, FILTER, REVERB, EQ+COMP, DLY, CHORUS…) va en dos columnas: la gráfica a la izquierda y sus valores a la derecha. Donde hay varias iguales (ENV 1 · 2 · 3, LFO 1 · 2 · 3 · 4), además con pestañas arriba (nota 20).
- **Decidido:** en las gráficas de curva (ENV, LFO, FILTER…) se quedan la gráfica y las tarjetas a la derecha. La regla de la nota 28 (sin tarjetas) es solo para las gráficas de barras, que ya son los controles (FX 1, MACROS).
- **Base:** el celular ya lo hace: «las carpetas con gráfica: la gráfica a la izquierda y los valores 2 × 2» (`styles/screens/phone.css`, del 13 de noviembre). Se puede llevar ese acomodo a `styles/screens/tablet.css` para estas páginas.
- **Ojo:**
  - la gráfica debe seguir siendo cómoda de arrastrar con el dedo (los tiradores del filtro);
  - con la nota 20 (pestañas para ENV y LFO), las páginas con gráfica tendrían el mismo acomodo: la gráfica a la izquierda y los valores a la derecha.

### 30. FX > INSERT: el 5.º valor queda solo

- **Qué pasa:** INSERT tiene dos páginas. La primera tiene 4 valores y la segunda, INSERT 2, solo uno. Ese valor queda suelto en su propia fila, a todo lo ancho, y ocupa mucho espacio para algo tan simple.
- **Qué se quiere:** no separarlo en otra fila: meter ese 5.º valor arriba, junto a los otros 4, como un solo bloque.
- **Dónde:** `BLOCKS.FX` en `code/components/cards.js` ya junta las dos páginas en un bloque (`["INSERT", "INSERT 2"]`), pero cada página se pinta en su propia fila de tarjetas (`.prow`), y la tarjeta sola se estira a todo lo ancho.
- **Qué haría falta:**
  - cuando un bloque tiene una página con pocos valores, poner sus tarjetas en la misma rejilla que la anterior, por ejemplo 5 en una fila o 3 + 2;
  - que una tarjeta sola nunca se estire a todo lo ancho: que mida lo mismo que las demás.
- **Confirmado en EDIT (15 de noviembre):** un bloque de tres páginas, con 4, 4 y 1 valor; el que queda suelto ocupa demasiado. Integrarlo a la rejilla de las otras dos (4 + 4 + 1 en la misma rejilla, por ejemplo 3 filas de 3 o 5 + 4). Falta apuntar qué páginas son exactamente (¿VOICE, VOICE 2, VOICE 3?).
- **Por revisar:** otros bloques con una página corta que deje valores sueltos (ENV 2 LOOP, LFO DEST, ARP 2, MIDI 2…). La misma regla les sirve.
- **Seguir al sinte, con las dos páginas juntas:** aunque se vean en una sola rejilla, el marco blanco de «la página en que está el sinte» debe seguir separándolas:
  - en el sinte en INSERT (4 valores), el marco blanco rodea solo esos 4;
  - en el sinte en INSERT 2, el marco blanco rodea solo el 5.º valor.

  Es decir, el marco sigue a la página del sinte y no al bloque. Lo mismo para cualquier bloque que junte páginas (nota 20 incluida). Hoy lo marca `devLive(S.folder, pt)` en `tileP`, con la clase `dev` en cada tarjeta: revisar que el marco se dibuje alrededor del grupo de tarjetas de esa página, aunque compartan fila con las de otra.

### 31. FX > REVERB: las opciones del tiempo se cortan

- **Qué pasa:** el valor del tiempo de reverb tiene 4 opciones como botones uno junto al otro, tan angostos que las palabras se cortan con «…».
- **Qué se quiere:** el selector con flechas: ◀ ▶ a los lados y, en medio, un botón que abre la lista para elegir.
- **Causa:** en `tileP` (`code/components/cards.js`), una lista de hasta 4 opciones se pinta como botones en fila (`t-seg`); con más de 4, como selector con flechas y lista (`t-arr`). Con 4 nombres largos, la fila no alcanza.
- **Qué haría falta:**
  - para este valor, usar `t-arr` en lugar de `t-seg`;
  - mejor como regla: usar `t-seg` solo si los nombres caben enteros (por ejemplo, si son cortos, de 3 o 4 letras); si no, `t-arr`. Así se corrige en cualquier otra página que tenga el mismo problema.
- **Va con:** la idea pendiente de ◀ ▶ junto a cada selector de tipo, de `SEGUIR-EN-CASA.md`, y con la nota 21 (dibujos para las formas de onda).

### 11. Tarjetas de valor menos altas

- **Qué pasa:** en EDIT > EDIT 2 (y en general), las tarjetas como «CUT 1.9 kHz» tienen mucho espacio vacío arriba y abajo.
- **Qué se quiere:** el nombre y el número del mismo tamaño, pero con menos relleno y menos alto.
- **Dónde:**
  - `.tp` en `styles/components/bento.css`: `padding: 14px`, `gap: 10px` y 3 × 3 filas;
  - `.prow .tp, .ci .tp` en `styles/views/folders.css`: `min-height: 128px` y `height: 100%`, que la estira;
  - `.tz .tp` en `styles/components/blocks.css`: `min-height: 140px`;
  - además, lo que agreguen `screens/tablet.css`, `phone.css` y `desktop.css`.
- **Ojo:** mantener al menos 44 px para tocar y dejar recorrido para arrastrar.

### 12. EDIT > UNDO: decir qué cambió en cada paso

- **Qué pasa:**
  - en el sinte, la lista dice qué cambió en cada paso: «+2 HOLD», «+1 RATE OCT», «−1 ATTACK MOD»…;
  - en la web solo salen números (+0, −1, −2…) y «AHORA».
- **Qué se quiere:** la misma lista que en el sinte.
- **Causa:**
  - el sinte escribe cada etiqueta comparando un paso con el anterior (`graph_hist` → `hist_label` en `firmware/src/ui_synth.c`), y no la manda a Live;
  - la web (`gHist` en `code/components/page-graphs.js`) solo conoce la posición (3:41) y su rango, y solo pinta hacia abajo (0, −1, −2…). Los pasos de rehacer (+1, +2) no salen.
- **Qué haría falta:** un comando de Live nuevo en `editor_live.c` que mande las etiquetas de la lista, con los pasos de deshacer y de rehacer, y que la web los pinte.

## Estudio

### 13. Sistema: quitar las líneas del título «System»

- **Qué pasa:** el título tiene una línea blanca arriba y otra abajo.
- **Qué se quiere:** quitarlas, con la misma regla de la nota 10.
- **Dónde:** `.stt` y `.langq` en `styles/views/studio.css`, o `.bh`.

### 14. Sistema: el idioma en un selector

- **Qué pasa:** el idioma se elige con pestañas (Español / English).
- **Qué se quiere:** un selector, para cuando haya más idiomas. Mejor la lista de opciones de la app (`code/sheets/options.js`) que el `<select>` del navegador.

### 15. GLO > SYSTEM: más peso para LATE y PEAK

- **Qué pasa:** la tarjeta de CPU muestra «23 %» grande, pero «LATE 6» y «PEAK 89 %» salen muy pequeños y con poco contraste.
- **Qué se quiere:** los tres con la misma importancia, o CPU como el principal pero LATE y PEAK bien visibles.
- **Dónde:** el caso `d.label === "CPU"` de `tileP` (`code/components/cards.js`) pone LATE y PEAK juntos en un `.pos2`. El estilo está en `styles/components/bento.css`.
- **Idea:** tres columnas (CPU, LATE, PEAK), cada una con su etiqueta pequeña y su número al mismo tamaño, y PEAK en `--danger` desde, por ejemplo, el 90 %.

### 16. Quitar el secuenciador avanzado repetido

- **Qué pasa:** la pestaña «Secuenciador avanzado» de Estudio es el mismo `seqBlock()` en modo completo que SEQ > Completo.
- **Qué se quiere:** dejarlo solo en SEQ.
- **Dónde:** `code/views/studio/tabs.js`: la pestaña `seq` de `STABS`, y `STU.tab: "seq"`, que es la que se abre primero.
- **Al quitarlo:**
  - hacer que Estudio abra en otra pestaña (HYBRID o Samples);
  - que lo que lleve a `STU.tab = "seq"` lleve ahora a SEQ en modo completo;
  - quitar de `lang/english.js` los textos que ya no se usen.

### 17. Biblioteca: cada sonido en un solo renglón

- **Qué pasa:** cada sonido ocupa dos filas:
  - **arriba:** el nombre (808 SUB) a la izquierda, el motor y las etiquetas en medio y la fecha a la derecha, todo muy separado;
  - **abajo:** A USER…, Etiquetas, Renombrar y Borrar, a la izquierda.
- **Qué se quiere:** un solo renglón compacto, sin cosas flotando.
- **Dónde:** `row` en `code/views/studio/library.js` (`.lrow`, `.e`, `.ltg`, `small`, `.dva`) y `styles/views/studio.css`.
- **Idea:** nombre · motor · etiquetas · fecha · **A USER…** · «⋯», con Etiquetas, Renombrar y Borrar dentro del «⋯».

### 18. Proyectos: cada ranura en un solo renglón

- **Qué pasa:** cada ranura ocupa dos filas, «P1 · FREE · EMPTY» arriba y «Guardar aquí» abajo, con mucho espacio vacío.
- **Qué se quiere:** un solo renglón: P1 · FREE · EMPTY · Guardar aquí.
- **Para que sea parejo:** el mismo renglón para Biblioteca, Proyectos, Samples y Drum kits.

### 19. Los ajustes del sinte (HOME largo) desde la web

- **Qué se quiere:** cambiar desde la web el menú que se abre al dejar presionado HOME:
  - **SCREEN:** COLOR, ZOOM, KNOB ACCEL;
  - **LIGHTS:** OFF / LOW / MID / HIGH, y KEYS;
  - **AUDIO** (y USB), **SEQ**, **MIDI** y **SYS**.

  Por ejemplo, encender las luces del sinte desde la tableta.
- **Dónde:** el menú está en `firmware/src/ui_menu.c` (`MS_NAME`, `MI_NAME`, `mi_value`, `mi_set`). Hoy Live solo llega a los ajustes de REC (`ED_REC` en `editor_live.c`).
- **Qué haría falta:**
  - un comando de Live nuevo para leer y escribir cada ajuste, que lo guarde con `settings_later`;
  - en la web, una pestaña «Sinte» en Estudio, o ponerlo en Sistema.

## SAVE

### 32. SAVE sin la barra izquierda

- **Qué pasa:** en SAVE, al ver los presets, sigue a la izquierda la barra con «En el sinte», «Cambios» y deshacer. Le quita espacio a la lista.
- **Qué se quiere:** que SAVE sea solo para manejar sonidos (ver, cargar, guardar, ordenar) y use todo el ancho. La barra izquierda vuelve al regresar a cualquier otra carpeta.
- **Dónde:** la barra es `code/frame/left-rail.js`, con su estilo en `styles/frame/body.css`. El celular ya va sin ella (`phone.css`), así que se puede reusar ese acomodo: una clase en `body` mientras `S.folder` sea SAVE, que oculte la barra y deje la vista a todo lo ancho.
- **Ojo:**
  - deshacer sigue a mano con ⌘Z / Ctrl+Z y desde la línea de estado;
  - el sonido actual ya se ve fijo en SAVE (el panel de la derecha), así que no se pierde qué está sonando;
  - con más ancho caben más columnas de sonidos, lo que ayuda con la nota 25.

### 25. Juntar las dos filas de cada sonido

- **Qué pasa:** en la lista de sonidos de SAVE (en ALL y en cada tipo, como ORGAN), cada sonido tiene dos filas:
  - arriba, el nombre (WOW BASS);
  - abajo, el tipo (BASS), el motor (VOICE) y, a la derecha, el número (18).

  Entre las dos filas queda mucho espacio.
- **Qué se quiere:** reducir ese espacio para que las filas queden más juntas y haya menos scroll. Se quedan las dos filas, solo más cerca.
- **Dónde:** `.sc` en `styles/views/save.css` (línea 32):
  - `min-height: 84px` y `justify-content: space-between`: la tarjeta mide al menos 84 px y empuja la segunda fila hasta abajo; de ahí sale el hueco;
  - `gap: 10px` y `padding: 12px 14px`;
  - en `styles/performance.css`, `contain-intrinsic-size: auto 84px` también da por hecho los 84 px: cambiarlo junto con el alto nuevo.
- **Por probar:** quitar el `space-between` o bajar el `min-height` a unos 60–64 px, con un `gap` de 4–6 px. Así cabe más de una fila de sonidos extra en la pantalla.
- **Para que sea parejo:** la lista de sonidos de la barra (`.snds > .sd`, `code/sheets/sounds.js`) y las ranuras USER usan un acomodo parecido. Va con las notas 11, 17 y 18: todo más compacto.

## Ideas de SHRUB

### 20. ENV y LFO: una sola gráfica con pestañas

- **Qué hace SHRUB:**
  - con un sonido de 3 envolventes, muestra una sola gráfica con todos sus valores debajo;
  - arriba hay pestañas ENV 1 · ENV 2 · ENV 3, y la elegida se marca; al cambiar de pestaña la vista no se mueve, solo cambian los datos;
  - igual con los LFO: LFO 1 · 2 · 3 · 4.
- **Qué se quiere:** lo mismo en Live para todo lo que se repite (las envolventes, los LFO y quizá los operadores de FMX, las inserciones o los delays): una gráfica, sus valores y pestañas arriba para cambiar cuál se ve.
- **Cómo está hoy:**
  - cada envolvente y cada LFO es un bloque aparte, con su propia gráfica, uno debajo del otro;
  - lo define `BLOCKS` en `code/components/cards.js`: `ENV: [["ENV", "ENV DEST"], ["ENV 2", "ENV 2 LOOP"]]` y `LFO: [["LFO", "LFO DEST"], ["LFO 2"], ["LFO 3"], …]`.
- **Qué haría falta:**
  - un bloque con pestañas que agrupe las páginas iguales (ENV, ENV 2, ENV 3 / LFO, LFO 2, LFO 3…) y pinte solo la elegida;
  - la gráfica y la rejilla de valores se quedan en su lugar al cambiar de pestaña, sin brincos;
  - con «Seguir» encendido, si el sinte cambia a ENV 2, se elige esa pestaña;
  - recordar la última pestaña de cada carpeta.
- **Ojo:**
  - las pestañas solo salen cuando hay más de una, porque algunos motores tienen solo una envolvente;
  - las páginas de destino (ENV DEST, LFO DEST) y ENV 2 LOOP van con su envolvente o LFO, dentro de la misma pestaña;
  - **confirmado (15 de noviembre):** ENV 2 LOOP tiene un solo valor y hoy ocupa todo el ancho. Va dentro de la pestaña ENV 2, en la misma rejilla que los 4 valores de la envolvente (por ejemplo, una 5.ª tarjeta del mismo tamaño), sin fila propia (nota 30);
  - esto también resuelve parte de la nota 11, porque deja más espacio a cada tarjeta.

### 21. Elegir la forma de onda con dibujos

- **Qué hace SHRUB:** muestra las formas de onda dibujadas. Por ejemplo, salen las 6 en gris y la elegida (la 2, triangular) destacada.
- **Qué se quiere:**
  - en vez de un selector con el nombre en texto, una fila de dibujos, uno por forma de onda, con la elegida marcada;
  - quizá con el nombre pequeño al lado o debajo;
  - un toque en un dibujo elige esa forma.
- **Dónde aplicaría:** la forma del LFO, la onda de los osciladores y cualquier selector de forma de onda de los motores.
- **Cómo está hoy:** son selectores de lista (`t-arr` o `t-seg` en `tileP`, `code/components/cards.js`), que dicen el nombre en texto con ◀ ▶ y la lista.
- **Qué haría falta:**
  - un ícono SVG por cada forma (seno, triángulo, sierra, cuadrada, S&H, ruido…) en `template.html`, junto a los demás íconos;
  - un tipo de tarjeta nuevo para los selectores de forma de onda: la fila de dibujos en gris y la elegida en blanco, o en el color de la carpeta;
  - los mismos trazos que la gráfica del LFO, para que se vean de la misma familia.
- **Ojo:**
  - cada dibujo debe medir al menos 44 px para tocarlo;
  - si un selector tiene muchas formas, puede que no quepan todos los dibujos: dejar el dibujo de la elegida grande con ◀ ▶;
  - va bien con la idea pendiente de ◀ ▶ junto a cada selector de tipo, de `SEGUIR-EN-CASA.md`.

### 24. Reordenar los sonidos con un botón «Reordenar»

- **Qué hace SHRUB:** en la carpeta de presets se pueden arrastrar los sonidos para cambiarlos de orden.
- **Lo que falla ahí:** al querer hacer scroll, a veces arrastra un sonido en vez de mover la lista. El arrastre y el scroll chocan.
- **Qué se quiere en Live:**
  - poder reordenar los sonidos, pero **solo** después de tocar un botón «Reordenar»;
  - fuera de ese modo, deslizar el dedo siempre hace scroll;
  - en el modo «Reordenar», mover cada sonido a mano con flechas ▲ ▼ (o arrastrarlo), como en LIVE > Editar con las tarjetas;
  - un botón «Listo» para salir del modo.
- **Dónde aplicaría:**
  - Estudio > Biblioteca: el orden se guarda en la tableta, sin tocar el firmware;
  - los favoritos (SAVE > FAVS y ‹ ›);
  - SAVE > USER: mover un sonido de ranura en el sinte necesita un comando de Live para intercambiar dos ranuras USER, o leer y volver a escribir las dos.
- **Cómo está hoy en LIVE:** en Editar, una tarjeta se levanta y sigue al dedo, y las demás le hacen lugar (`code/views/live.js`, desde la línea 140). Ese mismo código puede servir de base.
- **Ojo:**
  - las flechas, de al menos 44 px;
  - en SAVE > USER, pedir confirmación o guardar una copia antes de mover, porque escribe en la memoria del sinte;
  - con flechas, poder mover varios lugares rápido (dejar presionado).

## Colores

### 22. Aclarar los grises: con luz de día no se distinguen del negro

- **Qué pasa:** de noche se ve bien, pero de día, con sol o con mucha luz, el negro y los grises casi no se distinguen. Se pierde la jerarquía: los paneles, las tarjetas, los bordes y los textos secundarios se juntan con el fondo.
- **Qué se quiere:** aclarar los grises para que se note la jerarquía también con luz de día. Antes se quisieron muy oscuros, pero ahora se ve que eso afecta mucho.
- **Dónde:** los tokens de `:root` en `styles/base.css`:

  | Token | Hoy | Para qué |
  |---|---|---|
  | `--page` | `#000` | el fondo |
  | `--panel` | `#0d0d0f` | las tarjetas y los paneles |
  | `--raised` | `#17171a` | lo que va encima de un panel |
  | `--press` | `#202024` | al presionar |
  | `--line` | `#232327` | los bordes |
  | `--line-2` | `#66666e` | los bordes marcados |
  | `--tx-2` | `#a4a4ad` | el texto secundario |
  | `--tx-3` | `#8a8a95` | el texto terciario |

- **Causa:** `--panel` y `--line` están muy cerca del negro (`#0d0d0f` y `#232327` sobre `#000`), así que con reflejo del sol se ven iguales.
- **Por probar:** subir los escalones dejando el fondo en negro. Por ejemplo, un punto de partida para probar al sol:
  - `--panel` cerca de `#1a1a1e`;
  - `--raised` cerca de `#26262b`;
  - `--press` cerca de `#303036`;
  - `--line` cerca de `#3a3a40`;
  - `--tx-3` un poco más claro, por ejemplo `#9a9aa4`.
- **También:**
  - de la auditoría quedaron dos grises con poco contraste escritos a mano, `#5d5d5f` y `#424246`, y `#111114` en `studio.css`. Hay que pasarlos a tokens para que se aclaren junto con los demás;
  - buscar otros colores escritos a mano en `styles/`, como `#121216` en `.tl.on`.
- **Decidido:** sin modo «Día». Los grises más claros se quedan **siempre**, para que haya buen contraste en cualquier luz. Apuntarlo en `DECISIONS.md` y en `PRODUCT.md`, porque cambia la regla de «muy oscuro».

## Marca

### 23. Cambiar el favicon

- **Qué pasa:** el favicon se parece mucho al logo de Microsoft.
- **Causa:** son cuatro cuadros de colores en rejilla de 2 × 2 sobre negro (azul `#287cff`, verde, amarillo y naranja, los colores de los knobs), casi el logo de Windows.
- **Qué se quiere:** un ícono propio de Clipper Live que no se confunda.
- **Dónde:**
  - el favicon es un SVG escrito dentro de `web/live/template.html` (`<link rel="icon" … data:image/svg+xml…>`, línea 8);
  - los íconos de la app, al instalarla en la pantalla de inicio, son `web/icon-192.png`, `web/icon-512.png` e `web/icon-maskable-512.png`. Hay que cambiarlos también para que coincidan.
- **Ideas:**
  - un solo cuadro naranja con una forma (un clip, una onda, un knob);
  - la forma de la envolvente o de la onda del LFO en blanco sobre negro, con un acento de color;
  - si se usan los cuatro colores, que no sean en una rejilla de 2 × 2: por ejemplo, cuatro barras como faders.
- **Ojo:** que se lea a 16 px y siga las reglas de `PRODUCT.md`: cuadrado, sin esquinas redondas y Terminus si lleva letras.
