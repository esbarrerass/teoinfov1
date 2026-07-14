# Spec — Paneles del Frontend por Capítulo

**Universidad Nacional de Colombia — Teoría de la Información y Sistemas de Comunicación (2025994)**

> Complementa a [TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md) y [THEORY_MAP.md](THEORY_MAP.md). Este documento especifica el trabajo pendiente en `src/app/` para exponer en la UI los datos que el backend ya calcula y transmite por WebSocket.

---

## 1. Overview

El backend (`src/server/index.js`) ya ejecuta el pipeline completo — adquisición, filtrado, FFT, detección de picos R, extracción de características, clasificación, entropía, capacidad de canal, Huffman, CRC-8 y Hamming(7,4) — y transmite todo por WebSocket (`/ws`) cada 250 ms. El pipeline fue verificado numéricamente (detección de picos R con 100% de precisión contra ground truth sintético en los 4 escenarios: normal, bradicardia, taquicardia, arritmia; clasificador, SNR/capacidad de canal, entropía, Huffman, CRC-8 y Hamming confirmados correctos).

El frontend actual (`src/app/`) solo consume `filtered`/`raw` (para el ECG en vivo) y `features` (FC, SDNN, RMSSD). Los campos `fourier`, `infoTheory` y `errorStats` llegan en cada mensaje WS pero no se usan.

**Objetivo de esta spec:** construir la app pensando en dos capas con propósitos distintos, no en "5 pantallas iguales":

- **Núcleo funcional** (lo que un usuario real consultaría de forma continua para monitorear un ECG): ECG en vivo + clasificación (ya existe) y el panel de Fourier/calidad de señal (Cap. II), porque el SNR y el espectro son diagnóstico útil de la calidad de la captura, no solo un dato curricular.
- **Capas demostrativas/didácticas** (evidencian un capítulo del curso pero no son de consulta diaria): Muestreo/PCM (Cap. III), Teoría de la Información (Cap. IV) y Corrección de Errores (Cap. V). Se navegan como modo "explicación", separadas del flujo principal de monitoreo.

Esta distinción no cambia el conjunto de pantallas a construir (siguen siendo 5, una por capítulo, para cumplir el objetivo del curso), pero sí cambia su jerarquía en la UI: el núcleo debe sentirse como app usable, y las demostrativas como anexos navegables.

---

## 2. Scope Boundaries (qué SÍ y qué NO incluye esta spec)

**Incluye:**

- Reestructurar `App.jsx` distinguiendo visualmente **núcleo** (ECG en vivo + clasificación + Fourier, accesible sin navegar) de **demostrativos** (Cap. I, III, IV, V agrupados como pestañas secundarias tipo "Explora la teoría").
- Mover `ECGChart`, `StatusBar`, `Controls` a un header persistente visible siempre, independiente de qué pestaña demostrativa esté activa.
- Construir 4 componentes nuevos: `SystemOverview.jsx` (Cap. I), `FourierPanel.jsx` (Cap. II — parte del núcleo), `SamplingDemo.jsx` (Cap. III), `InfoTheoryPanel.jsx` (Cap. IV), `ErrorCorrPanel.jsx` (Cap. V).
- Consumir los campos `fourier`, `infoTheory`, `errorStats` ya emitidos por el WS.
- Lógica de downsampling/cuantización client-side para la demo de aliasing y PCM del Cap. III.

**No incluye (fuera de alcance de esta spec):**

- Cambios al backend/pipeline de señal — ya fue verificado y no requiere modificaciones.
- Mejorar la fidelidad fisiológica del generador sintético de HRV (mejora opcional identificada, no bloqueante).
- Reemplazar el clasificador heurístico por un SVM entrenado (ver TODO en `classifier.js`).
- Diagrama de Trellis interactivo del Hamming(7,4) — se documenta como posible extra, no como entregable de esta ronda.
- Diseño visual/branding final — se prioriza correctitud de datos mostrados sobre pulido estético.

---

## 3. Constraints

- **Sin Python** — toda la lógica cliente-side (downsampling, cuantización) se implementa en JavaScript/React, igual que el resto del proyecto (regla de `CLAUDE.md`).
- **React 18 + hooks funcionales** — ningún componente de clase.
- **Recharts** es la única librería de gráficos ya instalada — no se introducen librerías nuevas de charting salvo justificación explícita.
- **Frecuencia de datos**: el WS emite cada 250 ms (4 Hz) con `raw`/`filtered` de 1 s (360 muestras) — los paneles deben renderizar de forma performante a esa cadencia sin re-render costoso en cada tick (usar `React.memo` donde aplique).
- **Datos ya calculados, no recalculados en el cliente**: excepto en Cap. III (que no tiene endpoint backend dedicado), todos los paneles deben consumir los campos ya presentes en el mensaje WS (`fourier`, `infoTheory`, `errorStats`) — no se debe duplicar lógica de FFT/entropía/Huffman en el frontend.
- **Estilo existente**: seguir el patrón visual ya establecido en `App.css`/`index.css` y el componente `Metric` de `FeaturesPanel.jsx` para mostrar valores numéricos individuales.
- **Idioma**: toda la UI y comentarios de código en español, consistente con el resto del proyecto.

---

## 4. Verification Criteria

Para considerar cada panel terminado:

1. **Cap. I — SystemOverview**: el diagrama fuente→canal→receptor se renderiza correctamente; no requiere datos en vivo (criterio: revisión visual).
2. **Cap. II — FourierPanel**: con el servidor corriendo en modo DEMO, se ven simultáneamente (a) ECG crudo vs. filtrado en el tiempo, (b) espectro de potencia crudo vs. filtrado en frecuencia, (c) SNR crudo y filtrado en dB actualizándose en vivo. Criterio: los valores de SNR mostrados coinciden con los emitidos en `fourier.snrRaw`/`snrFiltered` del mensaje WS (verificar con DevTools Network/WS inspector).
3. **Cap. III — SamplingDemo**: mover el slider de frecuencia de muestreo simulada (360→100→60 Hz) produce aliasing visible en el gráfico; mover el slider de bits (4/8/10/12) cambia visiblemente el error de cuantización mostrado. Criterio: el downsampling debe hacerse por decimación simple (tomar 1 de cada N muestras) sobre el buffer `raw` ya recibido — sin llamadas adicionales al backend.
4. **Cap. IV — InfoTheoryPanel**: la entropía mostrada coincide con `infoTheory.entropy.entropy`; la tabla de códigos Huffman coincide con `infoTheory.huffman.codes`; la gráfica de capacidad muestra `capacityRaw` < `capacityFiltered` de forma consistente con el filtrado activo. Criterio: cambiar el tipo de ECG (`Controls`/`setECGType`) debe reflejarse en la entropía tras acumular suficientes clasificaciones.
5. **Cap. V — ErrorCorrPanel**: mover el slider de BER y disparar la simulación (`POST /api/error-correction/simulate`) actualiza la tabla de bits original/codificado/con error/decodificado/corregido. Criterio: con BER alto (ej. 0.3+), debe ser posible observar al menos un caso donde Hamming corrige el error y CRC lo detecta.
6. **General**: `npm run dev` (o equivalente) en `src/app/` no debe producir errores de consola; cambiar entre las 5 pestañas no debe desconectar el WebSocket ni reiniciar `ECGChart`.

---

## 5. Previous Steps (ya completado, contexto necesario antes de empezar)

- ✅ Backend completo: adquisición (Arduino real + `ecgGenerator.js` sintético en modo demo), `preprocessing.js` (filtros IIR HPF/LPF/Notch), `fourierAnalysis.js` (FFT + SNR), `panTompkins.js` (detección de picos R), `featureExtraction.js` (RR/FC/SDNN/RMSSD/LF-HF), `classifier.js` (heurística FC/SDNN), `entropy.js`, `channelCapacity.js`, `sourceCoding.js` (Huffman), `crc8.js`, `hamming.js`.
- ✅ Pipeline verificado numéricamente contra generador sintético: detección de picos 100% precisa, clasificación correcta en los 4 escenarios, SNR/capacidad/entropía/Huffman/CRC/Hamming matemáticamente correctos.
- ✅ WebSocket (`/ws`) transmitiendo el payload completo cada 250ms: `{ raw, filtered, peaks, features, classification, fourier, infoTheory, errorStats }`.
- ✅ REST API disponible: `GET /api/status`, `GET /api/snapshot`, `POST /api/ecg-type`, `POST /api/error-correction/simulate`.
- ✅ Frontend base funcionando: `useECGSocket.js` (hook de conexión WS con buffer de scroll), `App.jsx`, `ECGChart.jsx`, `Controls.jsx`, `StatusBar.jsx`, `FeaturesPanel.jsx`.
- ⚠️ Pendiente (no bloqueante): mejorar realismo fisiológico del jitter de HRV en `ecgGenerator.js` (actualmente ruido blanco ±2%, sin memoria temporal).

---

## 6. Task Breakdown

Cada tarea de pantalla (2 a 6) liga el tema del curso con la razón de negocio/producto de esa pantalla — es decir, qué problema real del usuario (alguien monitoreando o auditando una señal ECG) resuelve, más allá de cumplir el syllabus. La Tarea 1 es solo estructura de estado, sin superficie visual propia.

**Flujo de diseño obligatorio para toda tarea con superficie visual (2 a 6):**

1. **Plan — `ui-ux-pro-max`**: antes de escribir el componente, usar la skill para decidir layout, tipo de gráfico/chart y jerarquía visual apropiados al propósito de negocio de esa pantalla (no solo "qué datos hay que mostrar").
2. **Primera revisión — `design-taste-frontend`**: tras la primera implementación, pasar el componente por esta skill para eliminar apariencia "genérica" y validar que la jerarquía visual sea intencional.
3. **Segunda revisión — `impeccable`**: auditoría de UX (jerarquía, accesibilidad, espaciado, estados de error/vacío, responsive) sobre el resultado ya ajustado por la revisión anterior.
4. **Mejora final — `emil-design-eng`**: aplicar **solo** a animaciones y micro-interacciones (transiciones de tab, entrada de datos en vivo, hover/feedback de sliders) — no se usa para reabrir decisiones de layout ya cerradas en los pasos 1-3.

Este flujo se ejecuta una vez por componente nuevo (Tareas 2-6), en ese orden, antes de dar la tarea por terminada.

### Tarea 1 — Reestructuración de `App.jsx` (base para las 5 pantallas)
- Introducir estado de pestaña activa (`useState`) con 5 opciones: `sistema | fourier | muestreo | infoTeoria | correccion`.
- Extraer `ECGChart` + `StatusBar` + `Controls` a un header persistente fuera del contenido de la pestaña activa.
- Renderizar condicionalmente el componente de la pestaña activa, pasando `data` (del hook `useECGSocket`) como prop.
- Verificación: cambiar de pestaña no debe desmontar `useECGSocket` ni cortar la conexión WS.

### Tarea 2 — Cap. I: `SystemOverview.jsx`

- **Valor de producto:** es la pantalla de "confianza" — antes de que un usuario (o evaluador del curso) confíe en los números de las otras 4 pantallas, necesita entender que el sistema es una cadena de comunicación real de extremo a extremo (no una caja negra). Sirve como onboarding conceptual, no como dato operativo.
- Componente estático (sin props de datos en vivo, o solo `connected` para indicar estado del canal).
- Reproducir el diagrama fuente→canal→receptor de `THEORY_MAP.md` (Corazón → AD8232 → Arduino → Express → React) como bloque visual (HTML/CSS, no requiere librería de diagramas).
- Breve texto (2-3 párrafos) explicando el enfoque sistémico (Cap. I del syllabus) enlazado al resto de capítulos.
- Verificación: revisión visual, sin dependencia de datos WS.

### Tarea 3 — Cap. II: `FourierPanel.jsx`

- **Valor de producto:** parte del **núcleo funcional**, no solo demostrativo — el SNR y el espectro son el indicador de "¿puedo confiar en esta lectura ahora mismo?" (electrodo mal puesto, ruido de red, movimiento). Es diagnóstico de calidad de señal en vivo, análogo a la barra de señal de un monitor de signos vitales real.
- Gráfica temporal doble (Recharts `LineChart`): `raw` vs `filtered`, reutilizando el patrón de `ECGChart.jsx`.
- Gráfica de espectro (Recharts `LineChart` o `AreaChart`): eje X = `fourier.frequencies`, dos series Y = `fourier.rawSpectrum` y `fourier.filteredSpectrum`.
- Dos componentes `Metric` (mismo patrón que `FeaturesPanel.jsx`): `fourier.snrRaw` y `fourier.snrFiltered`, con delta (`snrFiltered - snrRaw`) destacado.
- Verificación: los números coinciden con el payload WS crudo (inspeccionar en DevTools).

### Tarea 4 — Cap. III: `SamplingDemo.jsx`

- **Valor de producto:** justifica ante el usuario/evaluador por qué se eligió 360 Hz y 10 bits (no es un número arbitrario) — respuesta a "¿por qué no muestrear más lento y ahorrar datos/batería?". Es pantalla demostrativa/educativa, no de consulta diaria.
- Slider de frecuencia de muestreo simulada (opciones: 360, 100, 60 Hz) — al cambiar, decimar el array `raw` recibido (tomar 1 de cada `360/fs_simulada` muestras) y graficar el resultado junto a la señal original de 360 Hz para evidenciar aliasing.
- Slider de bits de cuantización (4, 8, 10, 12) — recalcular client-side `Δ = rango_señal / 2^bits`, mostrar señal cuantizada vs. original y el error de cuantización (`e_q = Δ/√12` teórico vs. error RMS medido).
- Tabla o diagrama estático de la estructura del paquete PCM serial (copiar de `TECHNICAL_GUIDE.md §5.1`).
- Verificación: mover los sliders cambia visiblemente las gráficas sin llamadas de red adicionales.

### Tarea 5 — Cap. IV: `InfoTheoryPanel.jsx`

- **Valor de producto:** traduce la pregunta de negocio "¿cuánta información clínicamente relevante estamos realmente transmitiendo/comprimiendo?" — relevante si el proyecto se plantea escalar a monitoreo remoto/multi-paciente, donde ancho de banda y compresión sí importan operativamente. Pantalla demostrativa/analítica, no de consulta minuto a minuto.
- Indicador (barra o gauge) de `infoTheory.entropy.entropy` (bits/latido) + tabla de `infoTheory.entropy.probabilities` por clase.
- Tabla de códigos Huffman: columnas símbolo (bin de RR) / frecuencia / código binario, desde `infoTheory.huffman.codes` y `infoTheory.huffman.freqMap`; mostrar `avgCodeLength` vs `entropy` como comparación (barra o texto).
- Gráfica de barras (Recharts `BarChart`): `capacityRaw` vs `capacityFiltered` (bits/s), con `capacityGain` como anotación.
- Verificación: cambiar el tipo de ECG vía `Controls` y observar que la entropía se actualiza tras acumular clasificaciones nuevas.

### Tarea 6 — Cap. V: `ErrorCorrPanel.jsx`

- **Valor de producto:** responde a la pregunta de confiabilidad "¿qué pasa si el canal serial USB falla o hay ruido eléctrico?" — relevante en un contexto clínico real donde una clasificación corrupta no detectada podría ser peligrosa. Pantalla demostrativa que sustenta la robustez del sistema, no de uso diario.
- Slider de BER (rango sugerido 10⁻⁶ a 10⁻¹, escala logarítmica) + botón que dispara `POST /api/error-correction/simulate` con el valor actual.
- Tabla de resultado: bits originales, CRC esperado, datos corrompidos, CRC válido/inválido, bits Hamming codificados/con error/decodificados/corregido.
- (Opcional, no bloqueante) Diagrama de Trellis ilustrativo del Hamming(7,4) — se puede dejar como mejora futura si el tiempo no alcanza.
- Verificación: con BER alto, se observa al menos un caso de corrección Hamming exitosa y detección CRC de corrupción.
