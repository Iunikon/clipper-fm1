# Clipper Live: decisiones e instrucciones para seguir

Estado al 12 de noviembre de 2026 (commit `fcad9cd`, rama `live`). Este documento sustituye a `BRIEF.md` donde se contradigan: BRIEF es de antes de las versiones de celular y PC, de Estudio nativo y de LIVE configurable.

Sirve para dos cosas:

1. **Pasarlo por Impeccable** (o Claude Design) para una revisión, sin que la revisión deshaga lo que ya se decidió.
2. **Seguir trabajando** desde aquí: cómo montar, probar, publicar y qué queda pendiente.

> **Proyecto personal.** Clipper Live vive en la rama local `live` de `clipper-fm1`. Nunca se envía al repositorio original ([isod89/clipper-fm1](https://github.com/isod89/clipper-fm1)) ni se abre un PR allí. La rama **solo está en este PC**: no se ha subido a ningún remoto.

---

## 1. Qué es, en una línea

Una web app de un solo archivo que va al lado del sintetizador **FM-1** (firmware **Clipper 1.3.1** con el **protocolo Live 15**). Se conecta por USB con Web MIDI (SysEx), sigue lo que hace el sinte y permite editarlo con más espacio que su pantalla.

| Qué | Dónde |
|---|---|
| App publicada | https://clipper-live-eta.vercel.app (Vercel, proyecto `clipper-live`, cuenta `jorge-roblez`) |
| Archivo para usar sin internet | `~/clipper-out/clipper-live.html` (o el botón «Descargar para usar sin internet» de la app) |
| Fuente | `web/live/` |
| App montada | `web/live.html` (la genera el build; no editarla a mano) |
| Firmware de Live | `firmware/src/editor_live.c` (+ pequeños cambios en `editor.c`, `ui_input.c`, `ui_draw.c`, `ui.c`) |
| Guía de pruebas con el sinte | `web/live/PRUEBAS.md` |

**Modo según Impeccable: Operate.** Es una herramienta: lectura rápida, consistencia y respuesta al dedo, por encima de la expresión.

---

## 2. Pantallas de destino

| Pantalla | Tamaño CSS | Cómo se resuelve |
|---|---|---|
| **Tablet Huawei 11.5" (la principal)** | 1400 × 830 y 1600 × 950, horizontal | El diseño base. Riel izquierdo, trabajo, riel de favoritos. |
| **Celular Android, horizontal** | ~852 × 393 | `@media (max-height: 540px)`: barra y navegación de 44 px; los dos rieles son paneles que se deslizan (botones ◧ izquierda y favoritos derecha); páginas, tarjetas y gráficas más bajas. |
| **Tablet pequeña o ventana estrecha** | hasta 1100 de ancho | El riel izquierdo pasa a panel (botón ◧); favoritos se queda. |
| **Portátil** | 1280–1366 | El diseño base, sin cambios. |
| **Monitor** | 1920, 2560, 4K | `zoom` de todo el app: 1.2, 1.6 y 2.4. Se ve como la tablet, más grande. |

- **No hay versión vertical** (ni celular ni tablet). Nunca se pidió.
- **`--vh` / `--vw`:** en `live.css` nunca se escribe `100dvh` ni `100vw`; se usan `var(--vh)` y `var(--vw)`, que dividen entre el zoom. Si no, en un monitor la app se sale de la pantalla.
- **Coordenadas bajo zoom:** las medidas de `getBoundingClientRect` y `clientX` ya vienen escaladas. Para poner algo en `style.left/top` hay que dividir entre `zf()` (`pages.js`), como hace la tarjeta fantasma de LIVE.

**Al revisar, comprobar siempre:** 1400 × 830, 1600 × 950, 852 × 393 y 1920 × 1080.

---

## 3. Estructura de la pantalla (tablet)

```
┌──────────── barra (64) ────────────────────────────────────────────────────┐
│ FM-1 │ ‹ NOMBRE ● ⌄ › ★ [💾] │ 120 BPM  TRN −12  ▶PLAY  ●REC  CPU │ ◫ ⛶ Seguir │
├─ riel izq (232) ─┬──────────── trabajo ─────────────┬─ favoritos (216) ─┤
│ Salida (scope)   │ la carpeta abierta               │ 01–16             │
│ En el sinte      │                                  │ (se oculta con ◫; │
│  página + 4 knobs│                                  │  el riel izq crece)│
│ Cambios + deshacer│                                 │                   │
├──────────── navegación (72) ───────────────────────────────────────────────┤
│ LIVE HOME EDIT ENV LFO FX SEL ARP SEQ REC GLO SAVE │ ESTUDIO (azul)        │
└────────────────────────────────────────────────────────────────────────────┘
```

| Carpeta | Qué tiene |
|---|---|
| **LIVE** | Una cuadrícula **configurable** de tarjetas (acciones, rápidos, gráficas, cualquier parámetro), en **varias páginas** (LIVE 1, LIVE 2…). Editar: arrastrar para ordenar, × quitar, tamaño. **Candado:** bloqueado no se sale de LIVE; suelto, «Seguir» lleva a la carpeta del sinte. |
| **HOME** | Los 16 favoritos como pads, los 4 knobs principales y unos accesos configurables. |
| **EDIT, ENV, LFO, FX, SEL, ARP, GLO** | **Como las páginas del sinte, en su orden, una fila por página**, tantas columnas como knobs. La gráfica de la página encima de sus tarjetas. En EDIT salen las páginas de FMX (OP, OP 2, OP ENV, ROUTE, FMX, STORE) solo si el sonido usa FMX. |
| **SEQ** | Dos páginas como el sinte: **NOTES** (pasos o vista MIDI con todo el patrón) y **PATTERN**. «Avanzado en Estudio». |
| **REC** | La pantalla REC del sinte: estado grande, REC/PLAY, MODE, LEN, START, QUANT. |
| **SAVE** | Carpetas de sonidos a la izquierda; debajo, «Dispositivo»: Biblioteca, Proyectos y **Herramientas** (CLRSQ, INIT, NEW en grande, con segundo toque). |
| **ESTUDIO** | Nativo, en pestañas: Secuenciador avanzado, **HYBRID** (el patch entero), Samples, Biblioteca (de la tablet, con etiquetas), Proyectos, Copia de seguridad, Sistema (con idioma). |

---

## 4. Sistema visual

**Tokens** (`live.css`, `:root`):

| Token | Valor | Uso |
|---|---|---|
| `--page` | `#000` | Fondo. Negro puro: escenario, penumbra. |
| `--panel` / `--raised` / `--press` | `#0d0d0f` / `#17171a` / `#202024` | Paneles, controles, pulsado. |
| `--line` / `--line-2` | `#232327` / `#34343a` | Bordes. |
| `--tx` / `--tx-2` / `--tx-3` | `#f2f2f3` / `#a4a4ad` / `#8a8a95` | Texto. `--tx-3` ≥ 4.5:1 sobre `--panel`. |
| `--k1`…`--k4` | `#287cff` `#1ecc70` `#ffc618` `#ff621a` | Los 4 knobs del FM-1. |
| `--fav` | `#ff621a` | Favorito, editado, Guardar con cambios. |
| `--kind` / `--eng` | `#1ecc70` / `#6ea8ff` | Tipo de sonido (verde) y motor (azul). |
| `--studio` | `#287cff` | El botón ESTUDIO y sus pestañas. |
| `--r` | `0` | **Todo cuadrado.** |

**Tipografía:** sans del sistema para la interfaz; **Terminus** (la bitmap del FM-1, embebida) para números y valores, a tamaños de su retícula, sin suavizado.

**Reglas de color:**
1. El color de un parámetro es **el del knob que lo gira en su página del FM-1**. Donde ningún knob lo gira (HYBRID en Estudio), las tarjetas van **neutras**.
2. **Blanco:** lo seleccionado, lo que suena, lo que el sinte tiene abierto.
3. **Naranja: solo favorito, editado y Guardar.** El tipo de sonido es verde y el motor azul.
4. **Azul de Estudio:** el botón ESTUDIO y sus pestañas.

**Controles según el parámetro** (el mismo control para el mismo tipo, en todas partes):

| Parámetro | Control |
|---|---|
| Continuo | La tarjeta entera es un **fader que se arrastra**; nunca −/+. Bipolar se llena desde el centro. |
| ON/OFF | La tarjeta es un interruptor. |
| 2 opciones con nombre | Dos botones. |
| 3–4 opciones | Valor grande y botones en fila. |
| Más de 4 | Flechas, posición («3/6») y **un botón de lista** (☰) que abre todas las opciones. |
| Acción (RAND, SWAP, SET A…) | Botón GO. |

**Gráficas:** con la misma matemática que `firmware/src/ui_draw.c`: línea fina del color del knob, sin relleno, rejilla tenue. SEL y SEL 2 comparten una gráfica, igual que LAYER y LAYER 2.

---

## 5. Gestos y micro-interacciones

| Gesto | Qué hace |
|---|---|
| Arrastrar en horizontal | Cambia el valor; el gesto vertical hace scroll. |
| **Dejar el dedo quieto ~0,4 s mientras arrastras** | **Modo fino ×¼** (aviso «FINO ×¼»). Se va al soltar. |
| **Doble toque en un valor** | Vuelve al valor **como se cargó** el sonido (un global: a su valor por defecto). |
| Tocar el aviso o el nombre | Abre la lista de sonidos. |
| Dos toques | Confirman lo que borra o reemplaza (TOOLS, borrar, ranura ocupada). |

**Micro-interacciones** (todas se apagan con `prefers-reduced-motion`):
- Pulsar: botones, tarjetas y pestañas bajan 1 px.
- Una opción elegida entra deslizándose (`.tv.chg`).
- Arrastrar más allá del mínimo o máximo: la tarjeta rebota hacia ese lado (`.edge`).
- La carpeta actual tiene una línea arriba que crece al cambiar.
- En Android con pantalla táctil: un toque corto de vibración al elegir opciones, PLAY/REC, herramientas y carpetas; uno algo más largo al entrar en modo fino y al llegar a un extremo.
- La tarjeta que mueves en LIVE se levanta, sigue al dedo y las demás le hacen sitio (FLIP).
- Los avisos flotan arriba al centro, nunca en el riel.

---

## 6. Decisiones del usuario (no revertir sin preguntar)

| Decisión | Por qué |
|---|---|
| Carpetas = páginas del sinte, en su orden, una fila cada una | Que la tablet y el FM-1 se lean igual. |
| Nombres del sinte en inglés (ENV, FILTER…) | La tablet habla como la pantalla del FM-1. La interfaz está en español, con **inglés opcional** (Sistema > Idioma, o la pregunta al entrar). |
| Todo cuadrado | Encaja con el pixel art del FM-1. |
| Valores continuos arrastrables, sin −/+ | Más rápido con el dedo. |
| Naranja solo para favorito, editado y Guardar | Es lo que significa en el sinte. |
| LIVE configurable, con páginas y candado | Cada uno elige qué tener a mano para tocar. |
| HOME: favoritos rápidos + los 4 knobs principales + accesos | El selector de sonidos ya está en la barra. |
| Barra de favoritos ocultable; al ocultarla crece el riel izquierdo | Estorbaba. |
| Cambios sin «Borrar», solo deshacer por cambio y «Descartar» | Hacían lo mismo. |
| Tempo, transposición y octava en la barra | Se miran todo el rato. |
| REC como pestaña, como el sinte | Pedido. |
| Estudio **nativo** dentro de Live, no el editor viejo | Pedido explícito. |
| HYBRID y FMX editables desde la tablet | Lo que faltaba del editor viejo. |
| Biblioteca en la tablet, formato `felucca-library` v1 | Se lee con el editor viejo en los dos sentidos. |
| Copia automática antes de restaurar o de cargar un proyecto | Un toque equivocado no pierde nada. |
| Sin teclado de piano en pantalla | Descartado en propuestas. |
| Sin Drum kits | Clipper no tiene batería. |
| El sinte no se adorna desde la tablet | La ventana flotante del valor en el FM-1 es su opción MENU > ZOOM, no Live. |
| Ver propuestas antes de cambios grandes | Así prefiere trabajar el usuario. (Para el celular y PC pidió construir directo.) |

---

## 7. Arquitectura

| Archivo | Qué hace |
|---|---|
| `live.html` | La plantilla: barra, rieles, navegación, hojas (Guardar, sonidos, lista de opciones) e iconos SVG. |
| `live.css` | Tokens y todos los estilos; al final, los bloques de celular (`max-height: 540px`), ≤1100, zoom de monitor y micro-interacciones. |
| `live.js` | Protocolo (`Link`, comandos `C`), estado `M`, el FM-1 de ejemplo (mock), barra, SAVE, Guardar, riel izquierdo, osciloscopio, `paintValue` (pinta una vez por fotograma). |
| `bento.js` | Gráficas, tarjetas (`tileP`), gestos (arrastre, fino, bordes, vibración), Samples/Proyectos. |
| `pages.js` | Carpetas como el sinte, gráficas extra, LIVE configurable y sus páginas, HOME, SEQ, REC, doble toque, lista de opciones. |
| `seq.js` | Secuenciador (pasos, MIDI, avanzado). |
| `studio.js` | Estudio: pestañas, copia de seguridad, Sistema, **HYBRID** y **Biblioteca**. |
| `i18n.js` | Inglés: `DICT` (frases exactas) y `RX` (patrones). Todo texto nuevo en español necesita su entrada aquí. |

**Ámbitos (scope) de un valor:** `0` parámetro del sonido, `1` global, `3` página del sinte (X_*, p. ej. LAYER, MORPH, FMX), `4` el patch HYBRID (solo en la tablet). Todos usan las mismas tarjetas, arrastre, doble toque y lista.

**Comandos SysEx de Live (protocolo 15):** 97 PAGE … 104 EDITED, 105 TOOL, 106 PLAY, 107 TRANSPORT, 108 SCOPE, 109–111 X_GET/X_SET/X_CHANGED, 112 STATE, 113 REC. Del editor: UP_* 16–21, HY_GET/HY_PUT 77/78, BK_* 34–36, SMP_* 11–14. Detalle en `web/EDITOR_PROTOCOL.md`.

**Dónde se guardan los ajustes:** en el `localStorage` del navegador, con el prefijo `clipperlive:`. Ahí van las páginas de LIVE (`cfg:lpages`, `cfg:lp`), HOME (`cfg:home`), la Biblioteca (`lib`), el idioma, el candado y la barra de favoritos. Cada aparato y cada dirección guarda los suyos (la página de Vercel y el archivo descargado no se ven entre sí), y se borran con los datos del sitio.
- **LIVE > Editar > Exportar / Importar:** solo las páginas de LIVE (`clipper-live-pages` v1). Importar las **añade** detrás de las que hay.
- **Estudio > Sistema > Ajustes de Live:** todo (`clipper-live-settings` v1), cada valor tal cual se guarda. Importar **reemplaza** (pide un segundo toque) y recarga la app.

**Rendimiento (reglas):**
- Un valor que cambia se pinta **una vez por fotograma** (`paintValue` → `paintFlush`).
- Lo que no cambió no se reescribe (`setHtml`).
- Un arrastre mide la tarjeta **una vez**.
- El osciloscopio solo dibuja cuando hay algo nuevo y se ve.
- Las listas largas usan `content-visibility: auto`.

---

## 8. Montar, probar y publicar

```bash
cd ~/clipper-fm1
python3 tools/live_build.py                      # monta web/live.html
cd web && python3 -m http.server 8765 --bind 127.0.0.1
```

Para ver la app sin el sinte, abre `http://127.0.0.1:8765/live.html?mock=1&follow=0`. Parámetros útiles:
- `&folder=LIVE|HOME|EDIT|ENV|LFO|FX|SEL|ARP|SEQ|REC|GLO|SAVE|ESTUDIO`
- `&stab=hy|LIB|seq|bak|sys` (pestaña de Estudio)
- `&sqbv=midi`

Capturas sin abrir el navegador:

```bash
brave --headless=new --hide-scrollbars --force-prefers-reduced-motion --virtual-time-budget=6000 --window-size=1400,830 --screenshot=out.png "file://$PWD/web/live.html?mock=1&follow=0&folder=FX"
```

> Las capturas headless **no aplican el zoom de monitor**; para 1920 y más, usar un Chrome de verdad.

Publicar (pídele permiso al usuario antes):

```bash
python3 tools/live_build.py --site build/vercel
cd build/vercel && PATH=$HOME/.local/opt/node/bin:$PATH vercel deploy --prod --yes --project clipper-live
```

Commits: en la rama `live`, con el prefijo `Clipper Live (personal):`. Copia a `~/clipper-out/clipper-live.html` después de cada build que importe.

---

## 9. Pendiente y sin probar

**Sin probar con el FM-1 real** (la guía está en `PRUEBAS.md`, sección 4b y siguientes):
- la traza del osciloscopio por SysEx;
- que editar desde la tablet no haga parpadear el sinte;
- MOD SEQ desde los knobs del sinte;
- REC;
- copia y restauración;
- la vista MIDI;
- FMX y el patch HYBRID;
- «A USER…» desde la Biblioteca;
- el arrastre fino con el dedo;
- la vibración;
- el celular y la ventana de 1024 con un sinte de verdad.

**Abiertos para la revisión:**
- **Naranja fuera de su regla:** una herramienta armada (CLRSQ/INIT/NEW antes del segundo toque) y «Reemplazar» en Guardar van en naranja, aunque la regla lo reserva para favorito, editado y Guardar. ¿Se queda como «peligro» o pasa a otro color?
- **Amarillo del candado:** el candado activo de LIVE va en amarillo (`--k3`), que es un color de knob.
- **Celular:** las tarjetas de 92 px de alto cortan algunos valores grandes; ¿más compactas o con scroll?
- **Lista de sonidos:** el popup que se abre al tocar el nombre no se ha repasado tanto como el resto.
- **Prompts nativos:** renombrar una página de LIVE y las etiquetas de la Biblioteca usan `prompt()`/`confirm()` del navegador; podrían ser hojas propias.
- **Accesibilidad:** los faders tienen `role="slider"` y `aria-valuenow`, pero no se ha revisado el uso con teclado en PC.

**Ideas que salieron y no se hicieron:**
- versión vertical;
- deshacer en la Biblioteca;
- probar un sonido de la Biblioteca sin escribirlo en una ranura USER.

---

## 10. Instrucciones para Impeccable

**Antes de empezar**, dale este archivo y, si hace falta, `BRIEF.md` como contexto. El objetivo es **refinar**, no rediseñar: conservar la identidad (negro, cuadrado, Terminus, colores por knob, nombres del sinte en inglés).

**Orden sugerido:**

1. `/impeccable critique web/live`: revisión de UX a 1400 × 830 (la principal) y luego 852 × 393 y 1920 × 1080.
2. `/impeccable audit web/live`: accesibilidad, rendimiento y responsive.
3. Decidir con el usuario qué hallazgos aplicar (le gusta ver propuestas antes de cambios grandes).
4. `/impeccable polish web/live` o el comando concreto (`layout`, `clarify`, `adapt`, `animate`) sobre lo elegido.

**Qué pedirle que mire:**
- **Jerarquía por carpeta:** ¿se distingue a la primera gráfica, tarjeta y página?
- **Consistencia:** el mismo control para el mismo tipo de parámetro en LIVE, HOME, las carpetas y HYBRID.
- **Estados:** pulsado, arrastrando, fino, cambiado desde el sinte, «En el sinte», editado y favorito. ¿Se confunden?
- **Táctil:** objetivos ≥ 40–44 px; en el celular, el arrastre frente al scroll y los paneles laterales.
- **Contraste en penumbra:** `--tx-3`, etiquetas de 11–12 px, texto negro sobre los colores de knob.
- **Los puntos abiertos** de la sección 9.
- **Microcopy:** en español y en inglés; la misma acción con el mismo nombre en todas partes.

**Qué no debe hacer:**
- Redondear esquinas, cambiar el negro, quitar la Terminus o recolorear los parámetros fuera del color de su knob.
- Usar naranja para algo nuevo.
- Traducir los nombres del sinte.
- Añadir librerías, CDN o fuentes externas: todo va en **un archivo** que funciona **sin conexión**.
- Inventar nombres, rangos o unidades: salen del firmware.
- Escribir `100dvh` / `100vw` en el CSS (usar `var(--vh)` / `var(--vw)`).
- Proponer versión vertical, salvo que el usuario la pida.
- Tocar el FM-1 o el firmware para algo visual.

**Después de aplicar cambios:**
1. `python3 tools/live_build.py` y comprobar que no hay errores de sintaxis.
2. Mirar 1400 × 830, 1600 × 950, 852 × 393 y 1920 × 1080 (este último en Chrome real).
3. Si hay textos nuevos en español, añadirlos a `i18n.js` y mirar la app en inglés.
4. Commit en `live`, copiar a `~/clipper-out/` y preguntar antes de publicar en Vercel.
