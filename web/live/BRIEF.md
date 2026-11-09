# Clipper Live: brief para un ajuste y una auditoría de la interfaz

Documento de contexto para revisar el diseño de Clipper Live con Claude Design o Impeccable (`critique`, `audit`, `polish`, `layout`). Explica qué es el producto, quién lo usa, cómo está construido y qué decisiones se tomaron, con su porqué. Así la revisión parte de lo que ya se decidió y no lo deshace sin querer.

> **Proyecto personal.** Clipper Live vive en la rama local `live` de `clipper-fm1`, un firmware de la comunidad para el sintetizador FM-1. No se propone al repositorio original ni se envía upstream.

---

## 1. Qué es

Clipper Live es una **web app para tablet** que va al lado del sintetizador **FM-1** con el firmware **Clipper 1.3.1**. Se conecta al sinte por USB con Web MIDI (SysEx) y hace tres cosas:

1. **Sigue al sinte.** Cuando el músico cambia de página o gira un knob en el FM-1, la tablet va a esa carpeta, ilumina lo que se está tocando y avisa del cambio (por ejemplo, «KNOB 2 · DEC 160 ms → 442 ms»).
2. **Edita con más espacio que la pantalla del sinte.** El FM-1 tiene una pantalla diminuta y 4 knobs por página. En la tablet las envolventes, el LFO, el filtro y los envíos se ven como gráficas grandes que se arrastran con el dedo.
3. **Gestiona sonidos.** Permite navegar los 407 sonidos de fábrica por tipo, cargarlos, marcar hasta 16 favoritos y guardar el sonido en una de las 32 ranuras de usuario.

Es un solo archivo HTML, sin librerías, que funciona **sin conexión** abierto desde las Descargas de la tablet en Chrome. También se puede publicar en Vercel, con un botón para descargar ese mismo archivo.

- **Usuario:** un músico tocando o programando sonidos, con el sinte delante. Muchas veces en penumbra (estudio o escenario).
- **Dispositivo:** tablet Android Huawei, **LCD de 11.5" a 2.8K (2800 × 1840 px, 3:2)**, en Chrome. Con densidad 2 son unos **1400 × 920 px CSS**, alrededor de 1400 × 830 de ventana en horizontal con las barras de Chrome, o 920 × 1330 en vertical; con menos densidad hay más espacio, por ejemplo 1600 × 950. Hay un botón de pantalla completa para quitar las barras de Chrome. Se usa con el dedo, no con ratón.
- **Modo (según Impeccable):** **Operate**. La interfaz es una herramienta: importan la lectura rápida, la consistencia y que todo responda al dedo, por encima de la expresión.

## 2. Arquitectura (lo que una auditoría debe saber)

| Pieza | Dónde | Qué hace |
|---|---|---|
| Plantilla | `web/live/live.html` | El HTML con los huecos `__CSS__`, `__MOCK__` y `__JS__`. |
| Estilos | `web/live/live.css` | Tokens en `:root` y todos los estilos. |
| Lógica | `web/live/live.js` | Protocolo, estado, vistas, RÁPIDO, TOCAR, SAVE, Guardar y el FM-1 de ejemplo (mock). |
| Bento | `web/live/bento.js` | Las carpetas en bloques, las gráficas, las baldosas y los gestos táctiles. |
| Build | `tools/live_build.py` | Junta todo en `web/live.html` con la fuente Terminus y los datos de ejemplo dentro. `--site DIR` prepara la carpeta para Vercel. |
| Datos de ejemplo | `tools/live_dump.py` | Lee el firmware real en el PC y produce `build/live-mock.json`. |
| Firmware | `firmware/src/editor_live.c` | Comandos SysEx 97–104 (PAGE, FAVS, FAV_GO, FAV_SET, FAVS_CHANGED, LIST, LIST_GO, EDITED). PAGE incluye además la entrada de la lista que suena. |

Al abrirla, la app aparece vacía y en el centro está «Conectar el FM-1»; los rieles explican qué saldrá en ellos. Para verla sin el sinte: `web/live.html?mock=1` (un FM-1 de ejemplo, solo para desarrollo). Parámetros: `&folder=FX|ENV|LFO|EDIT|ARP|SEL|SEQ|GLO|SAVE`, `&mode=edit|play`, `&save=1` (abre Guardar) y `&br=1` (abre el popup de sonidos).

## 3. Estructura de la pantalla

```
┌─────────────── barra (64) ──────────────────────────────────────────────┐
│ FM-1 conectado │ ‹  NOMBRE ● ⌄  › ★ [Guardar] │ En el sinte X · Seguir · RÁPIDO|EDITAR|TOCAR │
├─ riel izq (232) ┬──────────── trabajo ───────────────┬─ riel der (216) ─┤
│ Salida (scope)  │  RÁPIDO (HOME)                      │ Favoritos 01–16  │
│ En el sinte:    │  o una carpeta en bloques           │                  │
│  página + 4 knobs│  o SAVE (gestor de sonidos)        │                  │
│ Cambios (deshacer)│                                   │                  │
│ Tonalidad/Tempo/Estado                                │                  │
├─────────────── navegación (72) ─────────────────────────────────────────┤
│ HOME EDIT ENV LFO FX SEL ARP SEQ GLO SAVE │ ESTUDIO (violeta)           │
└─────────────────────────────────────────────────────────────────────────┘
```

- **RÁPIDO** (inicio): un panel en bento con el Filtro (gráfica), los Efectos (4 medidores que se encienden o apagan tocando su nombre), Arpegiador, Transponer (−12 −1 +1 +12), Tempo con TAP, Pánico y 6 interruptores (Latch, Acordes, Escala, Voces, Glide, Insert). Los interruptores recuerdan su valor al apagarse y encenderse. «Editar más» lleva a EDITAR.
- **EDITAR (HOME):** un bento que muestra de un vistazo los 4 diales de HOME y las gráficas de ENV, FILTER, LFO, FX y MACROS.
- **Carpetas** (EDIT, ENV, LFO, FX, SEL, ARP, SEQ, GLO): **bloques**, uno por efecto, LFO o envolvente. Cada bloque lleva el nombre de la página del sinte y pone su gráfica a la izquierda y sus baldosas a la derecha.
- **SAVE:** una vista propia. A la izquierda las carpetas (Favoritos x/16, Todos, BASS, KEYS…, USER). Arriba el sonido que suena con sus acciones (Guardar, favorito, Descartar lo editado, anterior/siguiente). Debajo, las tarjetas de sonidos. En Favoritos se ven las 16 posiciones, también las libres.
- **Guardar:** una ventana con el nombre (12 caracteres, mayúsculas, tipografía Terminus grande) y las 32 ranuras U01–U32. Una ranura ocupada cambia el botón a «Reemplazar» en naranja.
- **TOCAR:** un pad XY con la entrada de audio de fondo y 4 faders de macros.
- **ESTUDIO:** abre el editor clásico completo (`clipper-editor-1.3.1.html`), destacado en violeta.

## 4. Sistema visual

**Tokens** (en `web/live/live.css`, `:root`):

| Token | Valor | Uso |
|---|---|---|
| `--page` | `#000` | Fondo (negro puro: escenario oscuro, pantalla OLED/LCD). |
| `--panel` | `#0d0d0f` | Paneles, módulos, baldosas. |
| `--raised` | `#17171a` | Controles dentro de un panel. |
| `--press` | `#202024` | Estado pulsado. |
| `--line` / `--line-2` | `#232327` / `#34343a` | Bordes y divisores. |
| `--tx` / `--tx-2` / `--tx-3` | `#f2f2f3` / `#a4a4ad` / `#8a8a95` | Texto principal, secundario y terciario (`--tx-3` ≥ 4.5:1 sobre `--panel`). |
| `--k1`…`--k4` | `#287cff` `#1ecc70` `#ffc618` `#ff621a` | Los colores de los 4 knobs del FM-1. |
| `--fav` | `#ff621a` | Favorito, editado y Guardar con cambios (el naranja del sinte). |
| `--studio` | `#9d8cff` | Solo Estudio. |
| `--r` | `0` | **Sin esquinas redondeadas, en ninguna parte.** |

**Tipografía:**
- **Interfaz:** la sans del sistema (Roboto en Android).
- **Números y valores:** **Terminus**, la fuente bitmap del propio FM-1 (embebida), a 16, 24, 32, 40 o 48 px, que son múltiplos de su retícula, sin suavizado.
- **Títulos de bloque:** 24 px en peso 800. Nombres de módulo: 18 px. Etiquetas: 11–12 px en peso 700 con tracking.

**Reglas de color:**
1. **El color de un parámetro es el del knob que lo gira en su página del FM-1** (K1 azul, K2 verde, K3 amarillo, K4 naranja). Así el músico conecta la tablet con el sinte sin leer.
2. **Blanco** = lo seleccionado, lo que está sonando o lo que el sinte tiene abierto («En el sinte»).
3. **Naranja** = favorito, editado y Guardar con cambios, igual que en el sinte (el punto naranja junto al nombre).
4. **Violeta** = Estudio, nada más.

**Controles según el tipo de parámetro:**
- **Valor continuo:** la baldosa entera es un fader. Se llena con el color del knob y se mueve **deslizando en horizontal**; el gesto vertical hace scroll. Los parámetros bipolares se llenan desde el centro, marcado con una línea discontinua.
- **Interruptor** (ON/OFF, o 2 opciones con OFF): la baldosa entera es el interruptor y, encendida, se llena del color del knob con el texto en negro.
- **2 opciones con nombre:** dos botones grandes, uno encima del otro.
- **3–4 opciones:** el valor grande y los botones de las opciones en fila.
- **Más de 4 opciones:** flechas y la posición («3/6»).
- **Gráficas:** envolvente (4 tiradores cuadrados de 36 px), LFO (arrastre horizontal y un punto que recorre la onda), filtro (LP ← OFF → HP), medidores verticales, diales. Fondo con una rejilla tenue, como un instrumento.

## 5. Decisiones tomadas y por qué

Las decisiones vienen del feedback del usuario, en orden aproximado. **Una auditoría no debería revertirlas sin preguntar.**

| Decisión | Por qué |
|---|---|
| Solo los nombres en inglés del sinte (ENV, FILTER, INSERT…), sin traducir. | El usuario lo pidió («deja solo el name en inglés»): la tablet debe hablar como la pantalla del FM-1. La interfaz en sí está en español. |
| No agrupar de 4 en 4 como el sinte. | La web tiene sitio; los «4 divisores» vacíos o con 2 opciones sobraban. |
| Bloques por efecto, LFO y envolvente. | En FX y LFO las baldosas sueltas se veían amontonadas. |
| Gráficas protagonistas y grandes. | El usuario eligió esta dirección («Gráficas protagonistas») para una interfaz «más propositiva y arriesgada». |
| Sin esquinas redondeadas. | Petición explícita: «todo cuadrado». Encaja con el pixel art del FM-1. |
| RÁPIDO como inicio, con «Editar más». | Lo que se toca en vivo debe estar a un toque. |
| SAVE como vista y no como popup. | Gestionar sonidos necesita espacio y todas las carpetas a la vista. |
| Riel izquierdo con «En el sinte» (4 knobs en vivo) y «Cambios» (deshacer). | El riel estaba desaprovechado. Ahora refleja el sinte y permite volver atrás. |
| Botón Guardar (U01–U32). | Faltaba. Funciona como SAVE > USER del sinte y después carga el sonido desde su ranura, así desaparece el punto naranja. |
| Fondo de los popups más oscuro (78 %). | Petición explícita. |
| Estudio en violeta. | Debe destacar como salida a otra herramienta. |
| Sin teclado de piano en pantalla. | El usuario lo descartó en las propuestas. |
| Ver propuestas antes de construir. | Es como prefiere trabajar el usuario: comparar opciones (`web/live-proposals.html`, `web/live-home-variants.html`). |

## 6. Restricciones

- **Un solo archivo y sin conexión.** Nada de CDN ni fuentes externas. Todo va embebido (la Terminus en base64).
- **Uso táctil:** objetivos de ≥ 40–44 px. El arrastre de los faders es horizontal para no romper el scroll vertical.
- **El protocolo manda.** Lo que la web muestra sale del firmware (descriptores, páginas, lista). Los nombres, rangos y unidades no se inventan en la web.
- **Contraste:** todo el texto ≥ 4.5:1 sobre su fondo.
- **`prefers-reduced-motion`** quita las transiciones.
- **Sin teclado en pantalla propio:** solo el nativo de Android, en el campo del nombre de Guardar.

## 7. Estado y pendientes conocidos

- **Probado:** con el FM-1 de ejemplo en Chrome (headless y el navegador de Claude): arrastres, interruptores, opciones, deshacer, seguir el sinte, SAVE, Guardar y favoritos. El firmware tiene 27 pruebas de protocolo bajo ASan/UBSan y está flasheado en el FM-1 real, que responde con el protocolo 15.
- **Sin probar:** la web en la tablet real con el sinte; la entrada de audio USB en Android (osciloscopio y fondo del XY).
- **Huecos posibles en las filas:** cuando una baldosa queda sola en una fila de bloque, se estira a todo el ancho.
- **Avisos del detector de Impeccable** (aceptados a propósito):
  - `cramped-padding` en el osciloscopio: la onda llega al borde.
  - `repeating-stripes-gradient`: es la rejilla de las gráficas.
  - `flat-type-hierarchy` en la plantilla: es un falso positivo, porque la plantilla aún no tiene el CSS; está silenciado solo para ese archivo.
- La vista de TOCAR y el popup de sonidos (al tocar el nombre) son anteriores al bento y no se han repasado con el sistema nuevo.

## 8. Qué pedir en la auditoría

Sugerencias para Claude Design o Impeccable (`/impeccable critique web/live`, `/impeccable audit web/live`, después `polish`):

1. **Jerarquía y densidad por carpeta:** FX, LFO, EDIT, GLO y SAVE a 1400 × 830 (la tablet en horizontal) y a 1600 × 950. ¿Se distingue a la primera qué es una gráfica, una baldosa y un bloque?
2. **Consistencia de controles:** que el mismo tipo de parámetro use siempre el mismo control y el mismo tamaño en RÁPIDO, en los bloques y en el bento de HOME.
3. **Estados:** pulsado, arrastrando (`held`), cambiado desde el sinte (`hot`), «En el sinte» (`dev`), favorito y editado. ¿Se leen bien y no se confunden?
4. **Táctil:** tamaños de objetivo, el arrastre horizontal frente al scroll, los tiradores de la envolvente en los bordes.
5. **Contraste y legibilidad en penumbra:** sobre todo `--tx-3`, las etiquetas de 11 px y el texto negro sobre los colores de los knobs.
6. **Coherencia de TOCAR y del popup de sonidos** con el sistema nuevo (cuadrado, bloques, Terminus).
7. **Responsive:** la tablet en vertical (920 × 1330: sin riel izquierdo, barra compacta), y &ge; 1500 px (rieles más anchos).
8. **Accesibilidad:** roles (`slider`, `switch`, `radiogroup`), `aria-valuenow`, el foco visible y el teclado en los faders.
9. **Microcopy en español:** que esté claro, sea breve y nombre las acciones igual en todas partes («Guardar», «Descartar lo editado»).

**Al proponer cambios, conservar:** los nombres del sinte en inglés, los colores por knob, el cuadrado, la Terminus para los valores, el negro y el archivo único sin conexión.
