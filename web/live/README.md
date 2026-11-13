# Clipper Live: el código

Clipper Live se escribe en muchos archivos pequeños y se publica como **uno solo**: `tools/live_build.py` los junta en `web/live.html` (con la fuente Terminus y los datos de ejemplo dentro). Ese archivo único es el que se descarga, funciona sin internet en la tablet y el celular, y se sube a Vercel.

```bash
python3 tools/live_build.py                        # -> web/live.html
python3 tools/live_build.py --site build/vercel    # lo mismo, listo para publicar
```

Para verlo sin el sinte: `web/live.html?mock=1&follow=0` (ver `docs/DECISIONES.md`, sección 8).

## El orden: `montaje.txt`

`montaje.txt` dice qué archivos se juntan y **en qué orden**. El orden importa:

- **CSS:** lo que va después gana (la cascada). Por eso las pantallas (`pantallas/celular.css`, `pantallas/pc.css`) y los ajustes de la revisión van al final.
- **Código:** todo acaba en un solo `<script>`. Las funciones se pueden usar desde cualquier archivo, pero lo que se **ejecuta al cargar** (constantes, `addEventListener`, `arranque.js`) necesita que lo que usa esté antes.

Un archivo nuevo se añade a `montaje.txt` en su sitio; si no está ahí, no entra en la app.

## Dónde está cada cosa

```
web/live/
  plantilla.html          el esqueleto: barra, rieles, navegación, hojas, iconos SVG (huecos __CSS__ __MOCK__ __JS__)
  montaje.txt             el orden en que se juntan estilos y código
  estilos/
    base.css              tokens (:root), la fuente, lo básico
    marco/                barra, cuerpo y rieles, navegación (+ avisos y lista de sonidos), conexión, transporte
    componentes/          accesos de LIVE, bento y tarjetas, bloques, páginas especiales (matriz, layer, mod seq, tuning…)
    vistas/               SAVE, SEQ (+ completo), carpetas como el sinte, REC, LIVE, HOME, Estudio
    hojas/                Guardar
    pantallas/            tablet, celular (max-height 540), ≤1100, escritorio (con ratón: la densidad de PC; va la última)
    movimiento.css        transiciones básicas
    interacciones.css     micro-interacciones (pulsar, deslizar, rebote, la línea de la carpeta)
    rendimiento.css       content-visibility para listas largas
    revision.css          lo de la revisión con Impeccable (EDIT, --danger, hojas propias, 40 px…)
  codigo/
    nucleo/               base (store, formatos), protocolo (Link, comandos C), simulador (el FM-1 de ejemplo),
                          estado (M), conexión, recibir (lo que dice el FM-1), enviar, entrada (teclas y toques)
    marco/                riel izquierdo (En el sinte, Cambios), avisos, osciloscopio, transporte (PLAY / REC)
    componentes/          gráficas, tarjetas (tileP), páginas especiales, pintar (una vez por fotograma), gestos
                          (arrastre, fino, bordes, vibración), gráficas de páginas, doble toque
    vistas/               pintar (renderWork y la barra), SAVE, dispositivo, carpetas, REC, LIVE, HOME, RÁPIDO
      seq/                pasos, completo, generar y MIDI, gestos
      estudio/            pestañas, samples, copia de seguridad, sistema, HYBRID, biblioteca
    hojas/                lista de sonidos, Guardar, lista de opciones
    idioma/ingles.js      el inglés: DICT (frases) y RX (patrones). Todo texto nuevo en español necesita su entrada
    arranque.js           lo último: conectar, ?mock=1, la primera pintura
  docs/                   DECISIONES (manda), PRODUCT (las reglas, para revisores), PRUEBAS (con el FM-1),
                          BRIEF (la versión anterior), y los informes de Impeccable
  propuestas/             las maquetas que se compararon antes de construir
```

## Reglas al tocar el código

- **El montaje tiene que seguir saliendo bien:** después de mover o partir archivos, `python3 tools/live_build.py` y comparar con lo de antes. Si solo se reorganiza, el `web/live.html` tiene que salir **idéntico byte a byte**.
- **En CSS no se escribe `100dvh` ni `100vw`:** se usan `var(--vh)` y `var(--vw)`.
- **Lo visual va en `estilos/`, la lógica en `codigo/`.** Un componente nuevo suele tener los dos: `estilos/componentes/x.css` y `codigo/componentes/x.js`.
- Las reglas de diseño (colores, cuadrado, Terminus, naranja, arrastre…) están en `docs/PRODUCT.md` y `docs/DECISIONES.md`.
