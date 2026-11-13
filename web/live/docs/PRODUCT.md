# Clipper Live — producto

> Resumen de `DECISIONES.md` para que Impeccable (y cualquier revisor) lea las reglas sin que haya que explicárselas. Donde se contradigan, manda `DECISIONES.md`.

## Qué es

Una web app de un solo archivo que va al lado del sintetizador **FM-1** con el firmware **Clipper 1.3.1** (protocolo Live 15). Se conecta por USB con Web MIDI (SysEx), sigue lo que hace el sinte y permite editarlo con más espacio que su pantalla. Vive en `main` del fork [Iunikon/clipper-fm1](https://github.com/Iunikon/clipper-fm1); compartirlo con el creador se decide aparte.

## Para quién y dónde

- **Quién:** un músico tocando o programando sonidos, con el sinte delante, a menudo en penumbra o en escenario.
- **Pantalla principal:** tablet Android de 11,5" en horizontal, 1400 × 830 y 1600 × 950 CSS. **Solo táctil.**
- **También:** celular en horizontal (852 × 393), y PC con ratón, con una densidad de escritorio propia (sin zoom: más tarjetas por fila y páginas de dos en dos, no todo más grande). **Sin versión vertical:** en vertical, un aviso para girar el aparato.
- **Modo de Impeccable:** **Operate**. Lectura rápida, consistencia y respuesta al dedo, por encima de la expresión.

## Reglas que no se tocan

- Fondo **negro**, todo **cuadrado** (`--r: 0`).
- **Terminus** (la bitmap del FM-1, embebida) para números y valores, a tamaños de su retícula.
- **El color de un parámetro es el del knob que lo gira en el FM-1:** K1 azul `#287cff`, K2 verde `#1ecc70`, K3 amarillo `#ffc618`, K4 naranja `#ff621a`.
- **Los colores con significado comparten tono con los knobs y se separan con forma, no con otro tono:** favorito ★, editado con la etiqueta **EDIT**, tipo de sonido con recuadro, Estudio con su icono, peligro con ⚠, candado 🔒.
- **Naranja solo para favorito, EDIT y Guardar.** **Rojo `--danger` solo para lo que borra o reemplaza, siempre con ⚠ y segundo toque** (al menos 0,4 s después del primero).
- **Blanco:** lo seleccionado, lo que suena, lo que el sinte tiene abierto y el candado puesto.
- Nombres del sinte **en inglés** (ENV, FILTER…); la interfaz, en **español**, con inglés opcional en `codigo/idioma/ingles.js`.
- **Valores continuos: se arrastran en horizontal, nunca botones − / +.** Dedo quieto mientras arrastras = fino ×¼; doble toque = vuelve a como se cargó. Con ratón: se arrastra igual (Shift = fino, Inicio / Fin); **la rueda solo desplaza la página, nunca cambia un valor** (al desplazar se editaba lo que quedaba bajo el puntero).
- **Un archivo, sin conexión, sin librerías ni CDN ni fuentes externas.**
- Nombres, rangos y unidades **salen del firmware**; no se inventan.
- Las carpetas son **las páginas del sinte, en su orden**. La barra de abajo tiene 14 destinos y se queda así.
- Sin teclado de piano en pantalla, sin Drum kits, sin adornar el sinte desde la tablet.
- El usuario prefiere **ver propuestas antes de cambios grandes**.

## Qué no debe proponer una revisión

Redondear, cambiar el negro, quitar la Terminus, recolorear parámetros fuera de su knob, cambiar los tonos de favorito / tipo / Estudio para separarlos de los knobs, usar naranja o rojo para algo nuevo, añadir − / +, versión vertical, dependencias externas o tocar el firmware por algo visual.
