# Clipper Live — auditoría técnica (Impeccable `audit`)

Archivo: `app/clipper-live.html`, la versión de Vercel con los pendientes de esta carpeta ya aplicados. Revisada con el FM-1 de ejemplo (`?mock=1&follow=0`) en las 13 carpetas, a 1400 × 830 (tablet) y 852 × 393 (celular), más el detector de Impeccable. No se tocó nada: solo informe.

**Límites:** no hay `PRODUCT.md` ni `DESIGN.md`, así que la referencia son `DECISIONES.md` y el propio código. 1920 × 1080 no se midió (las capturas sin ventana no aplican el zoom). No se probó con el dedo ni con el sinte.

## Polish (después de la segunda pasada)

- **Colores a tokens:** los 7 `#55555c` pasan a `--tx-ink` y el `#4a92ff` a `--studio-hi`. Ya no queda ningún color suelto de esos dos.
- **EDIT a 11 px**, el mínimo de las etiquetas, en la barra y en el riel.
- **S1–S4 del MOD SEQ** (LFO): de 34 a **40 px**.
- **Etiquetas de REC (MODE, TEMPO):** no era un fallo. Su caja está deshabilitada (`.rset.dis`) cuando no hay grabación, y WCAG no pide contraste a lo deshabilitado. Habilitada, `--tx-2` sobre `--panel` da 7,8:1.
- **El control de 28 px en LIVE** es la barra de nivel de Glide (`.amt`). Se queda así a propósito: toda la tarjeta es táctil, y subirla haría que LIVE necesitara scroll (se decidió en la primera revisión).

Con esto, la auditoría técnica no deja nada abierto salvo el peso del archivo (574 KB por la fuente, P3).

## Segunda pasada (después de juntar las tandas y de `adapt`)

| # | Dimensión | Antes | Ahora | Por qué |
|---|---|---|---|---|
| 1 | Accesibilidad | 3 | 3 | El «01» de HOME ya da contraste; quedan las etiquetas de REC por confirmar y EDIT a 10 px |
| 2 | Rendimiento | 3 | 3 | Sin cambios: 574 KB por la fuente embebida |
| 3 | Tokens y tema | 3 | 3 | Siguen 8 colores escritos a mano (`#55555c`, `#4a92ff`…) |
| 4 | Responsive y táctil | 3 | **4** | De una treintena de controles por debajo de 40 px a 5, todos en la tablet y ninguno en el celular |
| 5 | Integridad | 4 | 4 | El detector da los mismos 3 avisos, ya explicados (atenuado antes de conectar y osciloscopio) |
| **Total** | | 16 | **17/20** | **Bien** |

Quedan, en la tablet: los cuatro botones S1–S4 de LFO (216 × 34), un control sin texto de 28 px en LIVE y la etiqueta EDIT a 10 px en SAVE. Sin errores de consola.

## Puntuación (primera pasada)

| # | Dimensión | Nota | Lo principal |
|---|---|---|---|
| 1 | Accesibilidad | 3 | Roles, foco y teclado bien; un contraste de 2,7:1 en HOME |
| 2 | Rendimiento | 3 | Pinta una vez por fotograma; el archivo pesa 574 KB por la fuente embebida |
| 3 | Tokens y tema | 3 | Sistema de tokens real; unos pocos colores escritos a mano |
| 4 | Responsive y táctil | 3 | Sin scroll horizontal; varios botones de 26–38 px de alto |
| 5 | Integridad | 4 | Coherente y propio; el detector solo da avisos ya conocidos o falsos |
| **Total** | | **16/20** | **Bien** |

## Integridad: aprobada

La app expresa un sistema propio y coherente: negro, cuadrado, Terminus en los valores, cada parámetro del color de su knob, y los nombres del sinte. No hay rastros de plantilla ni piezas intercambiables con otro producto.

El detector de Impeccable dio 3 avisos, y ninguno es un fallo real:
- **Dos contrastes bajos** (`#5d5d5f` y `#424246` sobre `#0d0d0f`): son controles atenuados a propósito antes de conectar el FM-1, con `opacity: .35`. WCAG no exige contraste a lo deshabilitado.
- **Relleno apretado en el osciloscopio**: la onda llega al borde. Es una decisión aceptada en el documento.

## Aplicado después (`/impeccable adapt`)

- Historial de UNDO (`.hrow`) y filas de la matriz de LFO (`.mrow`): de 24–32 a **40 px**. No se aplastan (`flex: none`) y su lista se desplaza.
- ROT / REUSE y ONE / LOOP (`.tp.t-two`): al menos **40 px**.
- Pestañas de página de LIVE: **44 px** en la tablet y 40 en el celular. Bloquear y Editar: 40 en el celular.
- Tamaño de tarjeta en LIVE (`.csz`): 40 px.
- Teclas de nota de SEQ en el celular: dos filas de 6, más anchas.
- Medido después: **ningún control por debajo de 40 px en el celular**. En la tablet quedan las teclas de nota (31 px de ancho, 44 de alto, en una fila de 12) y un control vacío de 28 px en LIVE que no identifiqué.

## Hallazgos

### P1 — Arreglar antes de publicar

**1. Botones por debajo de 40 px en las carpetas.** Son controles que se tocan en vivo:

| Dónde | Qué | Medida |
|---|---|---|
| EDIT | Las dos opciones con nombre (ROT / REUSE) | 194 × 33 |
| ENV | ONE / LOOP | 890 × 33 |
| LFO | Las filas de ruta (1 OFF › OFF…) | 902 × 30 |
| EDIT | Una fila con «+0 AHORA» y «−1» | 886 × 26 |
| LIVE | Las pestañas de página y «+ Página» | 38 de alto (34 en el celular) |
| HOME (celular) | Editar | 34 de alto |
| SEQ y Estudio | Las 12 teclas de nota | 44 de alto, pero 31 de ancho (27 en el celular) |

Las teclas de nota ya tienen el alto bueno; el ancho lo limita meter 12 en una fila. Se puede vivir con 31 px porque se tocan por columnas, pero en el celular, a 27 px, cuesta. Una salida: dos filas (blancas y negras, como un teclado) en el celular.

*Comando:* `/impeccable adapt`.

**2. El «01» naranja sobre el pad blanco de HOME: 2,7:1.** WCAG AA pide 4,5:1. La otra sesión ya lo corrigió en su copia, con `--fav-d #b04008`; viene al juntar las dos tandas.

### P2 — En la siguiente pasada

**3. Etiquetas de REC a 3,5–3,7:1.** MODE y TEMPO (`.rl`, 12 px, `--tx-2`) sobre su fondo. Hay que confirmar el fondo exacto: si es una baldosa con color, el texto debería ir en blanco o en negro.

**4. La etiqueta EDIT a 10 px.** Es la que puse en esta tanda. El documento fija 11–12 px como mínimo para etiquetas: debería subir a 11.

**5. Colores escritos a mano fuera de los tokens.** Unos pocos: `#55555c` (texto atenuado sobre blanco), `#4a92ff` (azul de Estudio al pulsar) y algún `rgba(…)` del naranja. No rompen nada, pero si cambia un token esos no lo siguen. Lo limpio sería pasarlos a tokens (`--tx-on-light`, `--studio-hi`).

*Comando:* `/impeccable polish`.

### P3 — Si hay tiempo

**6. El archivo pesa 574 KB**, sobre todo por la fuente Terminus en base64. Para un archivo que se abre sin conexión está bien, pero se podría guardar la fuente solo con los glifos que se usan.

## Falsos positivos que comprobé

- **Las letras de «7 px» del teclado de SEL** (también en la auditoría anterior): son unidades del SVG. La gráfica se escala y se ven a **25,8 px reales**. No hay nada que arreglar.
- **El número de paso de SEQ a «1,1:1»**: el fondo del paso es un azul con 16 % de opacidad sobre negro. El contraste real es de unos 5:1.

## Lo que está bien

- **Sin errores de JavaScript** en ninguna carpeta ni tamaño.
- **Sin scroll horizontal** en el celular.
- **Teclado**: los faders son `slider`, se enfocan y ahora responden a ← → (Shift fino), Inicio y Fin. El foco se ve.
- **Ningún control sin nombre accesible** en las 13 carpetas.
- **Rendimiento cuidado**: un valor se pinta una vez por fotograma, lo que no cambia no se reescribe, y las listas largas usan `content-visibility`.
- **El sistema de color se cumple**: cada parámetro va del color de su knob, y el naranja ya solo está en favorito, EDIT y Guardar (el × de quitar tarjeta pasó a blanco).

## Orden recomendado

1. **[P1] `/impeccable adapt`**: los controles de 26–38 px (punto 1), empezando por los de EDIT, ENV y LFO, que se tocan tocando.
2. **[P1]** Juntar con la tanda de la otra sesión, que trae el arreglo del «01» (punto 2).
3. **[P2] `/impeccable polish`**: etiquetas de REC, EDIT a 11 px y los colores sueltos a tokens (puntos 3–5).
4. **`/impeccable critique`**: la revisión de UX de `DECISIONES.md` (sección 10), que es otra cosa que esta auditoría técnica.
5. **`/impeccable init`**: crear `PRODUCT.md` a partir de `DECISIONES.md`, para que las próximas revisiones lo lean solas.

Puedes pedirme que los haga de uno en uno, todos a la vez o en el orden que quieras. Cuando estén, vuelve a pasar `/impeccable audit` para ver la nota.
