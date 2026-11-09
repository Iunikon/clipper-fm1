# Clipper Live: brief para un ajuste y una auditoría de la interfaz

Documento de contexto para revisar el diseño de Clipper Live con Claude Design o Impeccable (`critique`, `audit`, `polish`, `layout`). Explica qué es el producto, quién lo usa, cómo está construido y qué decisiones se tomaron, con su porqué. Así la revisión parte de lo que ya se decidió y no lo deshace sin querer.

> **Proyecto personal.** Clipper Live vive en la rama local `live` de `clipper-fm1`, un firmware de la comunidad para el sintetizador FM-1. No se propone al repositorio original ni se envía upstream.

## Dónde está

| Qué | Dónde |
|---|---|
| **App publicada** | **https://clipper-live-eta.vercel.app**: Vercel, proyecto `clipper-live` en la cuenta `jorge-roblez` (plan Hobby). Abre la app vacía con «Conectar el FM-1» y el botón «Descargar para usar sin internet». |
| **Código** | Rama `live` del repositorio `clipper-fm1` de Jorge (GitHub [Iunikon/clipper-fm1](https://github.com/Iunikon/clipper-fm1)). Por ahora la rama solo está en local: no se ha subido a GitHub. Nunca va al repositorio original ([isod89/clipper-fm1](https://github.com/isod89/clipper-fm1)). |
| **Archivos** | `web/live/` (la fuente y este brief), `web/live.html` (la app montada), `tools/live_build.py`, `firmware/src/editor_live.c`. |
| **Editor clásico (Estudio)** | `clipper-editor-1.3.1.html`, publicado junto a la app en Vercel. |
| **Firmware** | Clipper 1.3.1 con el protocolo 15 de Live (`build/felucca.fwsc`), instalado en el FM-1. |

**Publicar de nuevo** (Node y la CLI de Vercel están en `~/.local/opt/node/bin`):

```bash
python3 tools/live_build.py --site build/vercel
cd build/vercel && ~/.local/opt/node/bin/vercel deploy --prod --yes --project clipper-live
```

---

## 1. Qué es

Clipper Live es una **web app para tablet** que va al lado del sintetizador **FM-1** con el firmware **Clipper 1.3.1**. Se conecta al sinte por USB con Web MIDI (SysEx) y hace tres cosas:

1. **Sigue al sinte.** Cuando el músico cambia de página o gira un knob en el FM-1, la tablet va a esa carpeta, ilumina lo que se está tocando y avisa del cambio (por ejemplo, «KNOB 2 · DEC 160 ms → 442 ms»).
2. **Edita con más espacio que la pantalla del sinte.** El FM-1 tiene una pantalla diminuta y 4 knobs por página. En la tablet las envolventes, el LFO, el filtro y los envíos se ven como gráficas grandes que se arrastran con el dedo.
3. **Gestiona sonidos.** Permite navegar los 407 sonidos de fábrica por tipo, cargarlos, marcar hasta 16 favoritos y guardar el sonido en una de las 32 ranuras de usuario.

Es un solo archivo HTML, sin librerías, que funciona **sin conexión** abierto desde las Descargas de la tablet en Chrome. También se puede publicar en Vercel, con un botón para descargar ese mismo archivo.

- **Usuario:** un músico tocando o programando sonidos, con el sinte delante. Muchas veces en penumbra (estudio o escenario).
- **Dispositivo (el único):** tablet Android Huawei, **LCD de 11.5" a 2.8K (2800 × 1840 px, 3:2)**, en Chrome, **siempre en horizontal**. Con densidad 2 son unos **1400 × 920 px CSS**, alrededor de **1400 × 830** de ventana con las barras de Chrome; con menos densidad hay más espacio, por ejemplo **1600 × 950**. Hay un botón de pantalla completa que quita las barras de Chrome y fija el horizontal. Se usa con el dedo, no con ratón.
- **Sin otras versiones responsive.** No se diseña para móvil, PC ni la tablet en vertical: no se van a usar. Una auditoría revisa solo 1400 × 830 y 1600 × 950 en horizontal y no propone layouts para otras pantallas.
- **Modo (según Impeccable):** **Operate**. La interfaz es una herramienta: importan la lectura rápida, la consistencia y que todo responda al dedo, por encima de la expresión.

## 2. Arquitectura (lo que una auditoría debe saber)

| Pieza | Dónde | Qué hace |
|---|---|---|
| Plantilla | `web/live/live.html` | El HTML con los huecos `__CSS__`, `__MOCK__` y `__JS__`. |
| Estilos | `web/live/live.css` | Tokens en `:root` y todos los estilos. |
| Lógica | `web/live/live.js` | Protocolo, estado, vistas, RÁPIDO, SAVE, Guardar, el osciloscopio y el FM-1 de ejemplo (mock). |
| Bento | `web/live/bento.js` | Las carpetas en bloques, las gráficas, las baldosas y los gestos táctiles. |
| Build | `tools/live_build.py` | Junta todo en `web/live.html` con la fuente Terminus y los datos de ejemplo dentro. `--site DIR` prepara la carpeta para Vercel. |
| Datos de ejemplo | `tools/live_dump.py` | Lee el firmware real en el PC y produce `build/live-mock.json`. |
| Firmware | `firmware/src/editor_live.c` | Comandos SysEx 97–104 (PAGE, FAVS, FAV_GO, FAV_SET, FAVS_CHANGED, LIST, LIST_GO, EDITED). PAGE incluye además la entrada de la lista que suena. |

Al abrirla, la app aparece vacía y en el centro está «Conectar el FM-1»; los rieles explican qué saldrá en ellos. Para verla sin el sinte: `web/live.html?mock=1` (un FM-1 de ejemplo, solo para desarrollo). Parámetros: `&folder=FX|ENV|LFO|EDIT|ARP|SEL|SEQ|GLO|SAVE`, `&mode=edit`, `&save=1` (abre Guardar) y `&br=1` (abre el popup de sonidos).

## 3. Estructura de la pantalla

```
┌─────────────── barra (64) ──────────────────────────────────────────────┐
│ FM-1 conectado │ ‹  NOMBRE ● ⌄  › ★ [Guardar] │ En el sinte X · Seguir · RÁPIDO|EDITAR │
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
- **SEQ:** el secuenciador, nativo. Una cuadrícula de pasos (16 por fila, tantas filas como LEN), el paso que suena iluminado (el sinte lo envía mientras suena) y PLAY/STOP. Al tocar un paso vacío se pone una nota (la última usada) y se selecciona; al tocar el seleccionado, se vacía. Debajo va el editor del paso: nota (−12 −1 +1 +12 y las 12 notas), VEL, ACC, SLIDE, ratchet x1–x4, ligar al anterior y vaciar. Después, el bloque PATTERN (LEN, DIV, SWG, GATE).
- **Carpetas** (EDIT, ENV, LFO, FX, SEL, ARP, GLO): **bloques**, uno por efecto, LFO o envolvente. Cada bloque lleva el nombre de la página del sinte y pone su gráfica a la izquierda y sus baldosas a la derecha.
- **SAVE:** una vista propia. A la izquierda las carpetas (Favoritos x/16, Todos, BASS, KEYS…, USER) y debajo **TOOLS** del sinte (CLRSQ, INIT, NEW), que piden un segundo toque para confirmar, como los dos clics del knob en el sinte. Arriba el sonido que suena con sus acciones (Guardar, favorito, Descartar lo editado, anterior/siguiente). Debajo, las tarjetas de sonidos. En Favoritos se ven las 16 posiciones, también las libres.
- **Guardar:** una ventana con el nombre (12 caracteres, mayúsculas, tipografía Terminus grande) y las 32 ranuras U01–U32. Una ranura ocupada cambia el botón a «Reemplazar» en naranja.
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
| `--kind` / `--eng` | `#1ecc70` / `#6ea8ff` | El tipo de sonido (BASS, PAD…) en verde y el motor (HYBRID, ANALOG…) en azul. Nunca en naranja. |
| `--studio` | `#9d8cff` | Solo Estudio. |
| `--r` | `0` | **Sin esquinas redondeadas, en ninguna parte.** |

**Tipografía:**
- **Interfaz:** la sans del sistema (Roboto en Android).
- **Números y valores:** **Terminus**, la fuente bitmap del propio FM-1 (embebida), a 16, 24, 32, 40 o 48 px, que son múltiplos de su retícula, sin suavizado.
- **Títulos de bloque:** 24 px en peso 800. Nombres de módulo: 18 px. Etiquetas: 11–12 px en peso 700 con tracking.

**Reglas de color:**
1. **El color de un parámetro es el del knob que lo gira en su página del FM-1** (K1 azul, K2 verde, K3 amarillo, K4 naranja). Así el músico conecta la tablet con el sinte sin leer.
2. **Blanco** = lo seleccionado, lo que está sonando o lo que el sinte tiene abierto («En el sinte»).
3. **Naranja** = favorito, editado y Guardar con cambios, igual que en el sinte (el punto naranja junto al nombre). Nada más va en naranja: el tipo de sonido es verde y el motor azul.
4. **Violeta** = Estudio, nada más.

**Controles según el tipo de parámetro:**
- **Valor continuo:** la baldosa entera es un fader. Se llena con el color del knob y se mueve **deslizando en horizontal**; el gesto vertical hace scroll. Los parámetros bipolares se llenan desde el centro, marcado con una línea discontinua.
- **Interruptor** (ON/OFF, o 2 opciones con OFF): la baldosa entera es el interruptor y, encendida, se llena del color del knob con el texto en negro.
- **2 opciones con nombre:** dos botones grandes, uno encima del otro.
- **3–4 opciones:** el valor grande y los botones de las opciones en fila.
- **Más de 4 opciones:** flechas y la posición («3/6»).
- **Gráficas: como las dibuja el sinte** (`firmware/src/ui_draw.c`), con su misma matemática sobre su franja de 240 × 100 estirada: una línea fina del color de la curva, sin relleno, y una regla al pie.
  - **Envolvente:** ataque lineal, decay y release exponenciales (como `graph_adsr` y `voice.c`). Tiene 4 tiradores pequeños (12 px, con un área táctil de 44 px).
  - **LFO:** dos ciclos a lo ancho, desde su fase. Arrastrarlo en horizontal cambia la fase (PHS).
  - **FX:** una barra fina por envío, con una marca en su nivel (`graph_fx`).
  - **Osciloscopio:** 240 muestras a 22,05 kHz desde un cruce por cero, con escala automática (`graph_scope`).
  - **Filtro, delay, reverb y EQ:** el sinte no los dibuja (muestra valores grandes); la web los dibuja con el mismo estilo.
  - El fondo lleva una rejilla tenue, como un instrumento.

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
| Secuenciador nativo en SEQ. | El usuario lo necesita en la tablet, no solo en Estudio. |
| TOOLS (CLRSQ, INIT, NEW) en SAVE. | Faltaban; en el sinte se confirman con dos clics y en la web con dos toques. |
| Sin TOCAR. | No aportaba frente a RÁPIDO. |
| Gráficas como las del sinte. | Las de la web se veían distintas (la envolvente plana, el LFO). |
| Estudio en violeta. | Debe destacar como salida a otra herramienta. |
| Sin teclado de piano en pantalla. | El usuario lo descartó en las propuestas. |
| Ver propuestas antes de construir. | Es como prefiere trabajar el usuario: comparar opciones (`web/live-proposals.html`, `web/live-home-variants.html`). |

## 6. Restricciones

- **Un solo archivo y sin conexión.** Nada de CDN ni fuentes externas. Todo va embebido (la Terminus en base64).
- **Uso táctil:** objetivos de ≥ 40–44 px. El arrastre de los faders es horizontal para no romper el scroll vertical.
- **El protocolo manda.** Lo que la web muestra sale del firmware (descriptores, páginas, lista). Los nombres, rangos y unidades no se inventan en la web.
- **Contraste:** todo el texto ≥ 4.5:1 sobre su fondo.
- **`prefers-reduced-motion`** quita las transiciones.
- **Es una app, no una página:** el texto no se puede seleccionar (solo el campo del nombre en Guardar).
- **El sinte no se adorna desde la web:** editar desde la tablet no debe redibujar toda la pantalla del FM-1 ni mostrar nada de más. El aviso del cambio se ve solo en la web. El recuadro grande del valor tocado en el sinte es la opción MENU > ZOOM del FM-1.
- **Sin teclado en pantalla propio:** solo el nativo de Android, en el campo del nombre de Guardar.

## 7. Estado y pendientes conocidos

- **Probado:** con el FM-1 de ejemplo en Chrome (headless y el navegador de Claude): arrastres, interruptores, opciones, deshacer, seguir el sinte, SAVE, Guardar y favoritos. El firmware tiene 27 pruebas de protocolo bajo ASan/UBSan y está flasheado en el FM-1 real, que responde con el protocolo 15.
- **Sin probar:** la web en la tablet real con el sinte; la entrada de audio USB en Android (osciloscopio y fondo del XY).
- **Huecos posibles en las filas:** cuando una baldosa queda sola en una fila de bloque, se estira a todo el ancho.
- **Avisos del detector de Impeccable** (aceptados a propósito):
  - `cramped-padding` en el osciloscopio: la onda llega al borde.
  - `repeating-stripes-gradient`: es la rejilla de las gráficas.
  - `flat-type-hierarchy` en la plantilla: es un falso positivo, porque la plantilla aún no tiene el CSS; está silenciado solo para ese archivo.
- El popup de sonidos (al tocar el nombre) es anterior al bento y no se ha repasado con el sistema nuevo.
- **TOCAR se quitó** (pad XY y faders): no aportaba frente a RÁPIDO. Si vuelve, que sea con algo concreto.

## 8. Qué pedir en la auditoría

Sugerencias para Claude Design o Impeccable (`/impeccable critique web/live`, `/impeccable audit web/live`, después `polish`):

1. **Jerarquía y densidad por carpeta:** FX, LFO, EDIT, GLO y SAVE a 1400 × 830 (la tablet en horizontal) y a 1600 × 950. ¿Se distingue a la primera qué es una gráfica, una baldosa y un bloque?
2. **Consistencia de controles:** que el mismo tipo de parámetro use siempre el mismo control y el mismo tamaño en RÁPIDO, en los bloques y en el bento de HOME.
3. **Estados:** pulsado, arrastrando (`held`), cambiado desde el sinte (`hot`), «En el sinte» (`dev`), favorito y editado. ¿Se leen bien y no se confunden?
4. **Táctil:** tamaños de objetivo, el arrastre horizontal frente al scroll, los tiradores de la envolvente en los bordes.
5. **Contraste y legibilidad en penumbra:** sobre todo `--tx-3`, las etiquetas de 11 px y el texto negro sobre los colores de los knobs.
6. **Coherencia del popup de sonidos** con el sistema nuevo (cuadrado, bloques, Terminus).
7. **Tamaños:** solo la tablet en horizontal, a 1400 × 830 y 1600 × 950 (desde 1500 px los rieles se ensanchan). Ni móvil, ni PC, ni vertical: no pedir ni proponer esas versiones.
8. **Accesibilidad:** roles (`slider`, `switch`, `radiogroup`), `aria-valuenow`, el foco visible y el teclado en los faders.
9. **Microcopy en español:** que esté claro, sea breve y nombre las acciones igual en todas partes («Guardar», «Descartar lo editado»).

**Al proponer cambios, conservar:** los nombres del sinte en inglés, los colores por knob, el cuadrado, la Terminus para los valores, el negro, el archivo único sin conexión y una sola pantalla de destino (la tablet en horizontal).
