# Clipper Live — crítica de Impeccable (`critique`)

Dos evaluaciones separadas, como pide Impeccable: A, revisión de diseño (sin ver el detector), y B, detector más medidas en el navegador. Archivo: `app/clipper-live.html`, con el FM-1 de ejemplo, a 1400 × 830 y 852 × 393.

## Aplicado después (lo que elegiste)

- **1. Borrar del patrón en Estudio:** segundo toque con ⚠ en rojo.
- **3. Bipolares:** el valor lleva signo (+0 %, −12); la línea del centro ya estaba.
- **4. Ayuda:** la primera vez que abres EDIT, ENV, LFO, FX, SEL, ARP o SEQ sale una hoja «Cómo se toca», y luego siempre a mano con el botón **?** de la barra. Explica arrastrar, el dedo quieto, el doble toque, el segundo toque, las marcas de los pasos y el ratón. Traducida.
- **5. Navegación del celular:** etiquetas a 11 px, sin cortarse.
- **6. Guardar / Descartar del riel:** 40 px.
- **7. HOME:** el riel de favoritos se oculta, porque HOME ya los muestra como pads; el riel izquierdo crece.
- **FINO ×¼** en blanco, no en el amarillo de K3.
- **Tempo:** sin − / +, se arrastra el valor como cualquier otro; TAP se queda.
- **Origen del cambio:** en Cambios, una etiqueta **SINTE** (con borde blanco) o **TABLET**, en vez de «en el sinte» / «aquí».
- **2. Las 14 pestañas:** se quedan así, por decisión tuya.

Probado con el FM-1 de ejemplo: la hoja sale la primera vez y no la segunda, CUT muestra «+0 %», arrastrar Tempo lo cambia (120 → 172), el riel desaparece en HOME y vuelve fuera, Cambios dice TABLET, y Borrar pide «¿Seguro?» en rojo. Sin errores.

## Veredicto

**Especificidad alta.** No es una plantilla: reproduce el FM-1 (carpetas con sus nombres, el color de cada knob, el carril «En el sinte», pasos al estilo 303, la fuente bitmap). El negro cuadrado se nota decidido.

**Medidas:** sin errores, sin scroll horizontal, sin diálogos nativos, y todo el texto activo por encima de 4,5:1 (el mínimo en LIVE, 5,09:1). Los 3 avisos del detector son falsos o aceptados.

## Heurísticas de Nielsen (A)

| # | Heurística | Nota |
|---|---|---|
| 1 | Visibilidad del estado | 3 |
| 2 | Relación con el mundo real | 4 |
| 3 | Control y libertad | 3 |
| 4 | Consistencia | 2 |
| 5 | Prevención de errores | 3 |
| 6 | Reconocer antes que recordar | 3 |
| 7 | Flexibilidad | 4 |
| 8 | Estética minimalista | 2 |
| 9 | Recuperarse de errores | 3 |
| 10 | Ayuda | 2 |
| | **Total** | **29/40** |

## Fortalezas

1. **El carril «En el sinte»** une el aparato y la pantalla.
2. **El panel «Cambios»** («antes → después» y deshacer por parámetro) da tranquilidad en directo.
3. **Lo que borra usa siempre la misma fórmula** (⚠, segundo toque, 0,4 s), y el modo fino no necesita botones.

## Problemas, en orden

1. **«Borrar» del patrón en Estudio actúa al primer toque y en neutro** (A). Es lo único destructivo que se salta la regla. → Segundo toque con ⚠ en rojo, como lo demás.
2. **Las 14 pestañas de la barra de abajo tienen el mismo peso** (A). Las carpetas del sinte (EDIT…GLO) y los destinos de la app (LIVE, HOME, SAVE, ESTUDIO) se mezclan, y el punto de «En el sinte» puede leerse como «tiene cambios». → Dos grupos separados por un hueco, e indicador del sinte con forma propia.
3. **Bipolar y unipolar no se distinguen** (A). CUT, RES y FENV (−64…63) y M3, M4 (0…127) muestran «0 %» igual. → Línea del centro en las bipolares y signo en el valor (+0, −12).
4. **No hay pistas de los gestos** (A). Nada dice que los valores se arrastran, que el dedo quieto activa el fino, ni qué son las marcas de los pasos (L, F, ‹ ›). → Una primera vez con una pista breve, o un «?» en la barra que la enseñe.
5. **Etiquetas de la navegación a 9 px en el celular** (B), el único texto activo por debajo de 11. → 11 px, quizá con nombres más cortos.
6. **«Guardar» y «Descartar» del riel izquierdo miden 36 px de alto en la tablet** (B). → 40 px.
7. **Densidad a 1400 px** (A): los favoritos salen dos veces en HOME (rejilla y riel derecho). → Ocultar el riel derecho en HOME, como en SAVE.

## Lo que A propuso y ya está decidido (no se reabre)

- **«El color significa varias cosas»** (`--fav` = `--k4`, `--studio` = `--k1`, `--kind` = `--k2`). Ya se decidió el 12 de noviembre: los tonos se quedan como en el FM-1 y se separan con forma (★, EDIT, recuadro, ⚠, 🔒). Lo que sí vale de su observación: el aviso «FINO ×¼» usa el amarillo de K3; podría ir en blanco.
- **La barra de Glide de 28 px** en LIVE: se quedó así para que LIVE quepa sin scroll; la tarjeta entera es táctil.

## Medidas (B)

| Tamaño | Dónde | Qué | Medida |
|---|---|---|---|
| 1400 × 830 | Riel izquierdo | Guardar / Descartar | 94 × 36, 104 × 36 |
| 1400 × 830 | LIVE | Barra de Glide | 197 × 28 (decidido) |
| 1400 × 830 | SEQ | Teclas de nota | 31 × 44 (1 px por debajo de ancho) |
| 852 × 393 | Navegación | Etiquetas | 9 px |
| ambos | REC | Etiquetas atenuadas | 2,2–2,8:1 (deshabilitado: no es fallo) |

## Preguntas para decidir

1. ¿Necesita un músico en escena 14 destinos abajo, o basta con LIVE, HOME, SAVE y «el sinte» (que abra la carpeta de la página activa)?
2. Cuando la tablet y el sinte no coinciden, ¿cómo debería contarlo la app: el cambio llegó del knob o del dedo?
3. Los botones − / + de Tempo junto a TAP: ¿son una excepción buscada a «sin −/+», o deberían ser arrastre como lo demás?
