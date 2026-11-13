# Seguir en casa

Notas del 13 de noviembre de 2026 para retomar Clipper Live en otra computadora. Todo está en `main` de [Iunikon/clipper-fm1](https://github.com/Iunikon/clipper-fm1); el último commit con código es `c3867e7`.

## Dónde quedó

| Qué | Estado |
|---|---|
| Código | `main` de Iunikon/clipper-fm1, al día. Nada sin subir. |
| App publicada | https://clipper-live-eta.vercel.app, con todo lo de `c3867e7`. |
| Firmware | El código de CURSOR (comando Live 114) está en `firmware/src/editor_live.c` desde `c9f7368`, pero **todavía no está flasheado** en el FM-1. |
| Pruebas | `tests/live_editor_test.c`: 51 comprobaciones, pasan. |

## Lo que se hizo hoy

1. **Celular con su propio diseño**, elegido entre 3 variantes en cada pantalla (Impeccable `generate`) a 852×393:
   - las carpetas con gráfica: la gráfica a la izquierda y los valores 2 × 2;
   - REC en dos columnas;
   - LIVE en seis columnas, todo a la vista;
   - la barra de arriba solo con el sonido, el favorito y PLAY / REC; lo demás en el menú «⋯»;
   - sin la barra izquierda;
   - SEQ: los 16 pasos en una fila y, debajo, el carril a la izquierda y el editor del paso a la derecha;
   - SAVE: las carpetas en una fila arriba, la lista en 3 columnas y el sonido actual fijo a la derecha.
2. **Ideas del editor SHRUB** (de Xfer, para el mismo FM-1; solo de uso e información, no de diseño):
   - mantener el dedo quieto en una tarjeta (o clic derecho) abre su ficha: qué hace, valor, rango, el CC MIDI con que el FM-1 la mueve y la tecla de tu controlador si la aprendiste;
   - deshacer el último cambio con ⌘Z / Ctrl+Z, desde la línea de estado o desde «⋯» en el celular;
   - una línea de estado en tableta y escritorio: conectado, demo o «No contesta», y qué se hace en esa carpeta;
   - el patrón vacío de SEQ dice cómo empezar uno.

El detalle está en [`CHANGELOG.md`](CHANGELOG.md) y las reglas del celular en [`PRODUCT.md`](PRODUCT.md).

## Poner la computadora a punto

```bash
git clone https://github.com/Iunikon/clipper-fm1.git
cd clipper-fm1
pip install fonttools                 # opcional: la fuente solo con los glifos usados (unos 55 KiB menos)
python3 tools/live_build.py           # -> web/live.html
```

Para verla sin el sinte: abre `web/live.html?mock=1&follow=0`, o toca **Ver la demo** en la pantalla de inicio. Para el celular, en Chrome usa las herramientas de desarrollo a 852 × 393.

El código está explicado en [`../README.md`](../README.md): archivos pequeños en `web/live/code` y `web/live/styles`, unidos en un solo `web/live.html` en el orden de `build-order.txt`.

## Subir cambios

- **Commits:** terminar con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` si los hace Claude.
- **Push:** solo a `origin` (Iunikon/clipper-fm1). **Nunca** push ni PR a `isod89/clipper-fm1` (el repo del creador).
- **Vercel:** proyecto `clipper-live`. La carpeta `build/` no está en git, así que en una computadora nueva hay que enlazarla una vez:

```bash
python3 tools/live_build.py --site build/vercel
cd build/vercel
npx vercel@latest link --project clipper-live
npx vercel@latest deploy --prod --yes
```

## Pendientes, en orden

1. **Flashear el firmware con CURSOR** en el FM-1 (`sh build.sh` -> `build/felucca.fwsc`) y probar la sincronía de pasos en los dos sentidos: tocar un paso en Live lo selecciona en el sinte, y moverlo en el sinte lo marca en Live. La lista está en [`TESTING.md`](TESTING.md).
2. **Probar con el FM-1 real lo de hoy:**
   - que el CC de cada ficha mueva de verdad ese valor (CUT 74, RES 71, GLD 5, LVL 7, macros 16–19…);
   - la pulsación larga en un celular de verdad (en la prueba se simuló), que no choque con el arrastre ni con el modo fino;
   - deshacer con cambios hechos desde las perillas del sinte;
   - la app en inglés (los textos nuevos tienen su traducción, pero no se revisó en pantalla).
3. **La versión de escritorio**, aparte de la del celular: misma idea, elegir entre variantes con Impeccable `generate` pantalla por pantalla.
4. **Ideas de SHRUB de prioridad media** (analizadas, sin hacer):
   - las fuentes de modulación (LFO, ENV, MACRO…) como fichas con cuántos destinos mueven, y al tocar una se marcan sus destinos;
   - ◀ ▶ junto a cada selector de tipo (filtro, forma del LFO, algoritmo);
   - la memoria del FM-1 a la vista (ranuras USER usadas, espacio libre para samples).
5. **Ideas de prioridad baja / grandes:** un banco que envíe solo las ranuras que cambiaron y escuchar antes de cargar; exportar un patrón de SEQ a `.mid`; separar en GLO lo que es del sonido de lo que es del aparato.
6. **Con el creador:** el PR #48 (FAVS) sigue abierto; cuando publique su actualización, mezclarla en `main`, compilar y medir.

## Cómo se eligieron las variantes (por si se repite)

Con Impeccable `generate` sobre `#edit` y la demo abierta en el navegador:

1. `.impeccable/live/config.json` con `"files": ["web/live.html"]` (la carpeta `.impeccable/` no se sube: está en `.git/info/exclude`).
2. `impeccable live-generate --target web/live.html --dev-url http://localhost:PUERTO/ --selector "#edit" --action layout --count 3 --boot`, y recargar la página con `?v=N` para que no use la caché.
3. Elegida una, `live-accept --id ID --discard` y `live-complete --id ID`, y el CSS de la elegida se escribe a mano en `web/live/styles/screens/phone.css` (o el archivo de la pantalla que toque) y se vuelve a construir.
4. Si dice «busy session_active»: borrar las claves «impeccable» del localStorage de la página y `impeccable live-server stop`.
