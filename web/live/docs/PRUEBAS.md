# Clipper Live: qué probar con el FM-1

Para la tablet con el FM-1 conectado por USB y el firmware de Live instalado (protocolo 15). Ve en orden: primero lo que solo mira, al final lo que borra. Si algo falla, apunta en qué paso y qué dice la pantalla (una foto del sinte y una captura de la tablet ayudan mucho).

**Antes de nada:** haz una copia de seguridad completa del FM-1 desde Estudio. Varias pruebas escriben en el sinte y algunas borran.

Abre `clipper-live.html` en Chrome, en horizontal, y toca el botón de pantalla completa (arriba a la derecha).

---

## 1. La interfaz (no cambia nada en el sinte)

- [ ] Al abrir sale la app vacía y, en el centro, «Conectar el FM-1». Al tocarlo, Chrome pide permiso para MIDI; acepta y se llena todo.
- [ ] Nada se ve cortado, no hay que hacer scroll de lado y el texto se lee bien en penumbra.
- [ ] Al tocar no se selecciona texto sin querer.
- [ ] La barra de abajo: LIVE, HOME, EDIT, ENV, LFO, FX, SEL, ARP, SEQ, GLO, SAVE y ESTUDIO en azul.
- [ ] Recorre cada carpeta: carga sin «El FM-1 no contestó» y los nombres coinciden con los del sinte.
- [ ] Las gráficas se parecen a las del sinte: la envolvente con curvas, el LFO con dos ciclos y FX con barras finas.
- [ ] El tipo de sonido (BASS…) sale en verde y el motor (HYBRID…) en azul; el naranja es solo para favoritos y para «editado».
- [ ] El osciloscopio sin audio dice «Sin audio del FM-1». Con «Usar audio USB del FM-1» y una nota sonando, se ve la onda.

## 2. Seguir al sinte (solo lee)

- [ ] Cambia de página en el FM-1: arriba, «En el sinte» dice la página, y a la izquierda salen sus 4 knobs con sus valores.
- [ ] Con «Seguir» encendido, la tablet va a esa carpeta e ilumina la página (desde LIVE también, salvo con el candado cerrado: entonces se queda en LIVE).
- [ ] Gira un knob del sinte: el valor cambia en la tablet, sale un aviso y el cambio aparece en «Cambios» a la izquierda.
- [ ] Carga otro sonido en el sinte: arriba cambian el nombre, el tipo y la posición en la lista.
- [ ] MATRIX, LAYER, MOD SEQ, TUNING, PISTAS, Samples, Drum kits, Biblioteca y Proyectos muestran algo (no «El FM-1 no contestó»).

## 3. Cambios pequeños desde la tablet (se pueden deshacer)

- [ ] Mueve un fader, un tirador de la envolvente y un medidor de FX: el sinte cambia igual, **sin parpadear** la pantalla.
- [ ] Al editar aparece el punto naranja junto al nombre, en la tablet y en el sinte.
- [ ] En «Cambios», el botón de deshacer devuelve el valor de antes, también en el sinte.
- [ ] «Descartar» devuelve el sonido a como se cargó y el punto naranja se va.
- [ ] LIVE: enciende y apaga el arpegiador, los efectos y Glide; TAP marca el tempo; Pánico corta las notas.
- [ ] Cambia una fuente de la MATRIX, la raíz de TUNING (y devuélvela), un paso del MOD SEQ, y el nivel y el mute de una pista.
- [ ] Favoritos: márcalo con la estrella, quítalo, y salta entre favoritos con ‹ ›. En el sinte, SAVE > FAVS coincide.

## 4. El secuenciador (SEQ)

- [ ] PLAY arranca el sinte y el paso que suena se ilumina en la tablet; STOP lo para.
- [ ] Toca un paso vacío: pone una nota y suena en el sinte. Cámbiale la nota, la velocidad, ACC, SLIDE y el ratchet.
- [ ] Toca el paso seleccionado: se vacía.
- [ ] Cambia un paso en el sinte (NOTES): la tablet lo muestra.
- [ ] «Completo»: rango y Extender, transponer, copiar y pegar, invertir, el piano roll y los carriles VEL, NUDGE, ROLL y NIVEL.
- [ ] FILL y LOCKS en un paso; quita el lock después.
- [ ] Genera un patrón sobre uno vacío y usa Deshacer.
- [ ] MIDI: exporta un `.mid` e impórtalo; el patrón queda igual.

## 4b. Lo nuevo (edición fina, FMX, HYBRID, biblioteca)

- [ ] Arrastra un fader y deja el dedo quieto un momento: sale «FINO ×¼» y el valor se mueve más despacio; al soltar se va.
- [ ] LIVE: «+ Página» crea otra página, se renombra en Editar y se quita con ×. Al recargar siguen ahí.
- [ ] Carga un sonido FMX: en EDIT salen OP, OP 2, OP ENV, ROUTE, FMX y STORE, y el sinte cambia al moverlos. Con otro motor no salen.
- [ ] Carga un sonido HYBRID y abre ESTUDIO > HYBRID: se ve el patch; mueve LEVEL de un oscilador y el sonido cambia. Prueba Fábrica…, INIT y Volver a leer.
- [ ] HYBRID: Exportar baja un `.clipper.json`; Importar lo vuelve a poner.
- [ ] Biblioteca: «Guardar el sonido actual», ponle etiquetas, filtra por una, renómbralo. Exportar y luego Importar en el editor viejo (o al revés).

## 5. Lo que escribe en la memoria del sinte

- [ ] **Guardar** el sonido en una ranura de usuario **libre**: sale en SAVE > USER del sinte con su nombre y el punto naranja se va.
- [ ] Sube un WAV corto a una ranura de **samples libre**.
- [ ] Guarda un proyecto en una ranura **vacía**.
- [ ] Biblioteca > A USER… en una ranura **libre**: sale en SAVE > USER con su nombre.

## 6. Lo que borra (al final, y solo sobre cosas de prueba)

- [ ] TOOLS > CLRSQ (pide dos toques): el patrón se vacía.
- [ ] TOOLS > INIT: el sonido vuelve al de inicio del motor.
- [ ] Borra el sample de prueba y el sonido de usuario de prueba.
- [ ] Carga un proyecto: antes baja sola una copia del proyecto de ahora.
- [ ] Restaurar una copia de seguridad: antes baja sola una copia de lo que hay.
- [ ] TOOLS > NEW, solo si no te importa perder el proyecto actual.

---

## Cosas que se dedujeron y hay que confirmar

- El nivel de pista va de −64 a 63.
- MOD SEQ lee y escribe la parte 0.
- LVL, TRIM y MUTE son los parámetros de LAYER.
- «+ Lock» fija el último parámetro que cambió; el sinte solo acepta locks de parámetros del sonido.

Si algo de esto no cuadra con lo que hace el sinte, dímelo y lo ajusto.
