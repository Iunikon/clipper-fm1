# Historial de cambios del fork

Todo lo hecho en el fork [Iunikon/clipper-fm1](https://github.com/Iunikon/clipper-fm1) sobre el **Clipper 1.3.1** del creador ([isod89/clipper-fm1](https://github.com/isod89/clipper-fm1)), del más viejo al más nuevo. Cada punto lleva su commit en `main`. Para el porqué de cada decisión, ver [`DECISIONES.md`](DECISIONES.md); para qué probar con el sinte, [`PRUEBAS.md`](PRUEBAS.md).

## Dónde está todo, hoy

| Qué | Dónde |
|---|---|
| Código | `main` de [Iunikon/clipper-fm1](https://github.com/Iunikon/clipper-fm1). Se conservan `favs-page` y `favs-screens` por el PR [#48](https://github.com/isod89/clipper-fm1/pull/48), abierto con el creador. |
| App publicada | https://clipper-live-eta.vercel.app |
| Archivo sin internet | `web/live.html` (y `~/clipper-out/clipper-live.html` en el PC de casa) |
| Firmware | `sh build.sh` → `build/felucca.fwsc`. Flasheado en el FM-1 el 12 de noviembre: responde «FELUCCA CLIPPER 1.3.1», protocolo 15. |
| Coste en el sinte | +2.880 B de flash y +32 B de RAM sobre el Clipper 1.3.1; quedan 16.552 B libres de 581.564. |
| Pruebas | `tests/live_editor_test.c` (46 comprobaciones, pasa). La suite completa pasa salvo `target_budget: drums_mix`, que también falla en el original del creador. |

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
- `PRUEBAS.md`: qué probar con el FM-1 real. `2aa6d1e`

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
- Maquetas guardadas en `web/live/propuestas/`. `1ff13c0`

**Ajustes y copias.**
- Exportar e importar las páginas de LIVE y todos los ajustes; dónde se guardan. `fae2cc7` `9e815e2`
- `DECISIONES.md` para revisar y seguir. `6dfef86`

**Git y código.**
- Todo unido en `main`; README con la sección «This fork». `d16ffd2`
- El código de Live en carpetas por área (`estilos/`, `codigo/`, `docs/`, `montaje.txt`), con la misma app byte a byte. `04908f5`
- **Firmware más ligero:** FAVS manda la posición en la lista (FAV_GO retirado), osciloscopio sin copia; −208 B de flash y −1 KB de RAM. `5cc76b2`

**Para tocar en vivo (ideas del LIVE de SLOOP).**
- **Escenas** con transformación por compases y crossfader A/B, **MIDI learn**, **grabar el set** por el audio USB, **reloj del set**. Nada en el firmware. `f27d89a`
- Botón **MIDI** en la barra de arriba; toda la app revisada en inglés. `0423967`
- SEQ abre el **secuenciador avanzado** por defecto; «Pasos» como segundo modo. `f964496`

**Pequeños.**
- Sin contorno en los números de los faders; tipo de sonido verde sin recuadro; «APP» en lugar de «TABLET» en Cambios; Estudio más ordenado (HYBRID de cuatro en cuatro). `5ae9ac1` `f0ee732`

---

## Lo siguiente

**Probar con el FM-1** (ver `PRUEBAS.md`):
- seguir al sinte, editar sin parpadeo, Guardar en una ranura, favoritos por la lista nueva;
- HYBRID y FMX, la Biblioteca «A USER…», copia y restauración;
- escenas y su transformación, **MIDI learn con un controlador real**, **grabar el set** por el audio USB;
- el celular y el PC con el sinte de verdad.

**Pendientes de diseño y de código:**
- `/impeccable harden` (desconexión a mitad de una subida, otro firmware, el FM-1 que no contesta);
- `/impeccable clarify` (textos en español e inglés);
- `/impeccable optimize`: la app pesa unos 590 KB, sobre todo por la fuente; dejar solo los glifos usados;
- el manifiesto del sitio con `"orientation": "landscape"`.

**Con el creador:**
- el PR #48 (FAVS) sigue abierto;
- avisó que va a actualizar: cuando publique, mezclar su versión en `main`, compilar y medir; lo nuestro toca pocas líneas suyas;
- si se le enseña Live: nuestro `editor_live.c` se llama igual que uno de SLOOP (su comando LIVE 77); conviene aclararlo o renombrarlo;
- comentarle que su `target_budget` todavía nombra `drums_mix`, que ya no existe.
