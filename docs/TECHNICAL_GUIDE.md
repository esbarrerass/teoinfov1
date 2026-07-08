# Guía Técnica de Implementación

## Clasificación de Arritmias Cardíacas mediante Análisis de Señales ECG

**Universidad Nacional de Colombia — Teoría de la Información y Sistemas de Comunicación (2025994)**
Autores: Maria Camila Castro Porras · Esteban Barrera Sanabria

> Para el fundamento teórico de cada módulo ver → [THEORY_MAP.md](THEORY_MAP.md)

---

## 1. Descripción del Proyecto

Sistema web interactivo que adquiere señales ECG en tiempo real desde un sensor Arduino AD8232, las procesa mediante una pipeline completa de procesamiento de señales, y clasifica los latidos como **ritmo sinusal normal** o **arritmia**. Cada etapa del sistema ilustra un capítulo del curso de Teoría de la Información y Sistemas de Comunicación.

---

## 2. Arquitectura del Sistema

```text
┌─────────────┐    ┌──────────┐    ┌─────────────────┐    ┌──────────────────────────────────┐
│   Corazón   │───▶│  AD8232  │───▶│  Arduino Uno    │───▶│        Express (Node.js)         │
│  (fuente)   │    │ (sensor) │    │  analogRead()   │    │  serialReader → preprocessing    │
└─────────────┘    └──────────┘    │  360 Hz + CRC-8 │    │  → FFT → Pan-Tompkins → SVM     │
                                   └─────────────────┘    └────────────────┬─────────────────┘
                                        Serial USB                         │ WebSocket
                                                                           ▼
                                                                 ┌──────────────────┐
                                                                 │   React (UI)     │
                                                                 │  4 pestañas por  │
                                                                 │  capítulo        │
                                                                 └──────────────────┘
```

---

## 3. Stack Tecnológico

### Hardware

| Componente | Descripción |
| --- | --- |
| Arduino Uno / Nano | Microcontrolador — ADC 10 bits, frecuencia de muestreo 360 Hz |
| AD8232 | Módulo amplificador ECG de un solo canal — filtro integrado, detección de electrodos |
| Electrodos (3) | RA (brazo derecho), LA (brazo izquierdo), RL (pierna derecha / tierra) |

### Backend (Node.js)

| Paquete | Versión mín. | Uso |
| --- | --- | --- |
| `express` | 4.x | Servidor HTTP + API REST |
| `ws` | 8.x | WebSocket — streaming en tiempo real hacia React |
| `serialport` | 12.x | Lectura del puerto serial USB del Arduino |
| `fft.js` | 4.x | Transformada Rápida de Fourier en Node.js |
| `ml-svm` | 2.x | Clasificador SVM (kernel RBF) |
| `simple-statistics` | 7.x | Media, RMSSD, SDNN, varianza de intervalos RR |

### Frontend (React)

| Paquete | Uso |
| --- | --- |
| `react` 18.x | Framework UI |
| `recharts` | Gráficas ECG interactivas, espectros de frecuencia |
| `axios` | Llamadas REST al backend Express |

---

## 4. Estructura de Carpetas

```text
teoinfov1/
├── docs/
│   ├── TECHNICAL_GUIDE.md          ← este archivo
│   ├── THEORY_MAP.md               ← mapa teoría↔práctica
│   └── EstadodelArteTeoInfo.pdf    ← estado del arte
├── src/
│   ├── app/                        ← Frontend React
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ECGChart.jsx        ← gráfica ECG en tiempo real
│   │   │   │   ├── FourierPanel.jsx    ← espectro FFT (Capítulo II)
│   │   │   │   ├── SamplingDemo.jsx    ← demo aliasing / PCM (Capítulo III)
│   │   │   │   ├── InfoTheoryPanel.jsx ← entropía y capacidad (Capítulo IV)
│   │   │   │   └── ErrorCorrPanel.jsx  ← CRC y Hamming (Capítulo V)
│   │   │   ├── App.jsx                 ← tabs por capítulo del curso
│   │   │   └── index.js
│   │   └── package.json
│   └── server/                     ← Backend Express
│       ├── index.js                    ← servidor principal + WebSocket
│       ├── acquisition/
│       │   └── serialReader.js         ← lectura serial + validación CRC-8
│       ├── signalProcessing/
│       │   ├── preprocessing.js        ← filtros FIR digitales
│       │   ├── fourierAnalysis.js      ← DFT, espectro de potencia, SNR
│       │   ├── panTompkins.js          ← detección de picos R
│       │   └── featureExtraction.js    ← intervalos RR, FC, HRV, LF/HF
│       ├── informationTheory/
│       │   ├── entropy.js              ← entropía de Shannon
│       │   ├── channelCapacity.js      ← C = B·log₂(1+SNR)
│       │   └── sourceCoding.js         ← codificación Huffman
│       ├── errorCorrection/
│       │   ├── crc8.js                 ← CRC-8 para paquetes serial
│       │   └── hamming.js              ← código Hamming(7,4)
│       └── classification/
│           └── svmClassifier.js        ← SVM: Normal vs. Arritmia
└── README.md
```

---

## 5. Módulos del Backend — Pasos de Implementación

### 5.1 `acquisition/arduino_sketch.ino`

> Fundamento teórico: [Cap. III — Muestreo y PCM](THEORY_MAP.md#capítulo-iii--transmisión-digital-de-señales-analógicas)

**Responsabilidad:** Leer la señal analógica del AD8232 y transmitirla por Serial con integridad verificada.

Pasos:

1. Configurar `Serial.begin(115200)`
2. Leer pines LO+ (D10) y LO- (D11) para detección de electrodos desconectados
3. Llamar `analogRead(A0)` cada 2778 µs (`delayMicroseconds`) → 360 Hz
4. Construir paquete: `[START_BYTE, HIGH_BYTE, LOW_BYTE, CRC8]`
5. Calcular CRC-8 sobre los bytes de datos antes de enviar

```cpp
// Estructura de paquete (4 bytes por muestra)
// 0xFF | valor_high | valor_low | crc8(valor_high, valor_low)
```

### 5.2 `acquisition/serialReader.js`

> Fundamento teórico: [Cap. III — Codificación de línea](THEORY_MAP.md#capítulo-iii--transmisión-digital-de-señales-analógicas)

**Responsabilidad:** Abrir el puerto serial, validar paquetes con CRC-8, mantener buffer deslizante de 10 s.

Pasos:

1. Instanciar `new SerialPort({ path, baudRate: 115200 })`
2. Usar parser de bytes fijos (4 bytes/paquete)
3. Para cada paquete: recalcular CRC-8 y descartar si no coincide
4. Convertir el valor de 10 bits a mV: `mV = (rawValue / 1023.0) * 3300`
5. Mantener un `circularBuffer` de 3600 muestras (10 s a 360 Hz)
6. Emitir el buffer actualizado por WebSocket cada 50 ms

> **Sin Arduino:** Si `DEMO_MODE=true`, este módulo lee `data/mitbih_sample.csv` en lugar del puerto serial y simula el mismo stream WebSocket. Ver [§8 Modo Demo](#8-modo-demo-sin-arduino).

### 5.3 `signalProcessing/preprocessing.js`

> Fundamento teórico: [Cap. II — Filtros ideales vs. prácticos](THEORY_MAP.md#capítulo-ii--sistemas-de-comunicación-y-transformada-de-fourier)

**Responsabilidad:** Eliminar ruido de la señal ECG cruda mediante filtros digitales FIR.

| Filtro | Tipo | Frecuencia de corte | Elimina |
| --- | --- | --- | --- |
| Pasa-altas | FIR | 0.5 Hz | Deriva de línea base (respiración, movimiento) |
| Pasa-bajas | FIR | 40 Hz | Ruido de alta frecuencia (EMG muscular) |
| Notch | FIR | 60 Hz (o 50 Hz) | Interferencia de la red eléctrica |

Pasos:

1. Diseñar coeficientes FIR con la ventana de Hamming (orden 101)
2. Aplicar convolución: `signal_filtrada = convolve(signal, coeficientes)`
3. Normalizar amplitud: `signal_norm = (signal - min) / (max - min)`
4. Exportar `{ rawSignal, filteredSignal }` para comparación en UI

### 5.4 `signalProcessing/fourierAnalysis.js`

> Fundamento teórico: [Cap. II — DFT computacional (2.11)](THEORY_MAP.md#capítulo-ii--sistemas-de-comunicación-y-transformada-de-fourier)

**Responsabilidad:** Calcular la DFT de la señal y métricas espectrales.

Pasos:

1. Importar `FFT` de `fft.js`
2. Aplicar ventana de Hann antes de la FFT para reducir fuga espectral
3. Calcular `|X[k]|²` → espectro de potencia
4. Calcular vector de frecuencias: `f[k] = k * fs / N` donde `fs=360, N=longitud_ventana`
5. Calcular SNR: `SNR = potencia_banda_ECG / potencia_ruido`
6. Retornar `{ frequencies, powerSpectrum, snrDeltaDB }` (antes y después del filtro)

### 5.5 `signalProcessing/panTompkins.js`

> Fundamento teórico: [Cap. II — Transmisión a través de sistema lineal (2.9)](THEORY_MAP.md#capítulo-ii--sistemas-de-comunicación-y-transformada-de-fourier)

**Responsabilidad:** Detectar picos R en la señal filtrada (algoritmo Pan-Tompkins, 1985).

Etapas del algoritmo:

1. **Filtro pasa-banda** (5–15 Hz) — ya aplicado en preprocessing
2. **Derivación** — resaltar pendiente del complejo QRS
3. **Elevación al cuadrado** — hacer positivos todos los valores
4. **Integración por ventana móvil** (150 ms) — suavizar
5. **Umbral adaptativo** — detectar picos con histéresis

Salida: array de índices de picos R → timestamps en ms

### 5.6 `signalProcessing/featureExtraction.js`

> Fundamento teórico: [Cap. IV — Codificación de fuente](THEORY_MAP.md#capítulo-iv--teoría-de-la-información)

**Responsabilidad:** Calcular características temporales y espectrales a partir de los picos R.

| Característica | Fórmula / Descripción |
| --- | --- |
| Intervalo RR | `RR[i] = t_R[i+1] - t_R[i]` en ms |
| Frecuencia cardíaca | `FC = 60000 / mean(RR)` en lpm |
| RMSSD | `sqrt(mean((RR[i+1]-RR[i])²))` — variabilidad latido a latido |
| SDNN | `std(RR)` — desviación estándar de intervalos RR |
| LF/HF ratio | FFT sobre serie RR resampleada a 4 Hz → potencia 0.04–0.15 Hz / 0.15–0.4 Hz |

### 5.7 `informationTheory/entropy.js`

> Fundamento teórico: [Cap. IV — Medida de la información (4.2)](THEORY_MAP.md#capítulo-iv--teoría-de-la-información)

**Responsabilidad:** Calcular la entropía de Shannon de la secuencia de clasificaciones.

```js
// H(X) = -Σ p(x) · log₂(p(x))
// Donde X = {Normal, Arritmia}
// p(Normal) = conteo_normales / total_latidos
```

### 5.8 `informationTheory/channelCapacity.js`

> Fundamento teórico: [Cap. IV — Capacidad de canal continuo (4.6)](THEORY_MAP.md#capítulo-iv--teoría-de-la-información)

**Responsabilidad:** Estimar la capacidad del canal de comunicación serial usando Shannon.

```js
// C = B · log₂(1 + SNR)
// B = ancho de banda del canal serial (aprox. 180 Hz — Nyquist del ECG)
// SNR = calculado en fourierAnalysis.js (antes y después del filtro)
```

Retorna la capacidad en bits/s para el canal sin filtrar y el canal filtrado.

### 5.9 `informationTheory/sourceCoding.js`

> Fundamento teórico: [Cap. IV — Codificación de la fuente (4.3)](THEORY_MAP.md#capítulo-iv--teoría-de-la-información)

**Responsabilidad:** Codificación Huffman de los intervalos RR para demostrar compresión de fuente.

Pasos:

1. Cuantizar intervalos RR a 10 niveles (bins de 50 ms)
2. Calcular frecuencias de ocurrencia de cada bin
3. Construir árbol de Huffman y asignar códigos
4. Calcular longitud promedio de código vs. entropía de la fuente

### 5.10 `errorCorrection/crc8.js`

> Fundamento teórico: [Cap. V — Códigos cíclicos (5.4)](THEORY_MAP.md#capítulo-v--códigos-correctores-de-errores)

**Responsabilidad:** CRC-8 para verificar integridad de paquetes seriales.

```js
// Polinomio generador: x^8 + x^2 + x + 1 (0x07)
function crc8(bytes) { /* tabla de búsqueda de 256 entradas */ }
```

### 5.11 `errorCorrection/hamming.js`

> Fundamento teórico: [Cap. V — Códigos de bloque lineales (5.3)](THEORY_MAP.md#capítulo-v--códigos-correctores-de-errores)

**Responsabilidad:** Hamming(7,4) para proteger el resultado de clasificación (2 bits útiles).

Pasos:

1. Implementar matriz generadora G (4×7) y matriz de paridad H (3×7)
2. `encode(dataBits)` → 7 bits con bits de paridad
3. `decode(receivedBits)` → corrección de 1 error, detección de 2 errores

### 5.12 `classification/svmClassifier.js`

> Fundamento teórico: [Cap. II — Extracción de características](THEORY_MAP.md#capítulo-ii--sistemas-de-comunicación-y-transformada-de-fourier)

**Responsabilidad:** Clasificar cada ventana de latidos como Normal o Arritmia.

Pasos:

1. Cargar modelo pre-entrenado serializado en JSON (entrenado sobre MIT-BIH)
2. Vector de características: `[mean_RR, SDNN, RMSSD, FC, LF_HF_ratio]`
3. Normalizar con media/std del conjunto de entrenamiento
4. Llamar `svm.predict(featureVector)` → `0` (Normal) o `1` (Arritmia)

---

## 6. Cableado Arduino — AD8232

```text
AD8232          Arduino Uno
─────────────────────────
OUT      ──────▶ A0
LO+      ──────▶ D10
LO-      ──────▶ D11
3.3V     ──────▶ 3.3V
GND      ──────▶ GND

Electrodos:
  RA (rojo)     ─ brazo derecho
  LA (amarillo) ─ brazo izquierdo
  RL (verde)    ─ tobillo derecho (tierra / referencia)
```

---

## 7. API REST del Servidor Express

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/demo` | Devuelve 10 s de datos MIT-BIH de muestra (sin hardware) |
| `GET` | `/api/status` | Estado del puerto serial (conectado/desconectado) |
| `POST` | `/api/classify` | Clasifica un vector de características enviado desde el frontend |
| `GET` | `/api/snr` | SNR actual antes y después del filtro |
| `WS` | `/ws` | Stream en tiempo real: muestras ECG + picos R + clasificación |

---

## 8. Modo Demo (sin Arduino)

**Todos los módulos excepto `serialReader.js` funcionan sin hardware.**

Para arrancar sin Arduino:

1. Descargar un registro MIT-BIH desde PhysioNet (`physionet.org/content/mitdb/`) — el registro `100.csv` es un buen punto de partida
2. Colocarlo en `src/server/data/mitbih_sample.csv`
3. Establecer `DEMO_MODE=true` en `src/server/.env`
4. El servidor simula el mismo stream WebSocket que generaría el Arduino, con la misma frecuencia (360 Hz) y formato de datos

**Módulos que se pueden desarrollar y probar completamente sin Arduino:**

| Módulo | ¿Funciona en modo demo? |
| --- | --- |
| `preprocessing.js` | ✅ Solo necesita un array de muestras |
| `fourierAnalysis.js` | ✅ Opera sobre cualquier señal ECG |
| `panTompkins.js` | ✅ Opera sobre cualquier señal ECG |
| `featureExtraction.js` | ✅ Opera sobre picos R detectados |
| `entropy.js` | ✅ Opera sobre secuencia de clasificaciones |
| `channelCapacity.js` | ✅ Solo necesita el SNR del filtro |
| `sourceCoding.js` | ✅ Opera sobre intervalos RR |
| `crc8.js` | ✅ Función pura, sin dependencias |
| `hamming.js` | ✅ Función pura, sin dependencias |
| `svmClassifier.js` | ✅ Opera sobre el vector de características |
| `serialReader.js` | ⚠️ Requiere Arduino — reemplazado por CSV reader en demo mode |

---

## 9. Instalación y Ejecución

```bash
# 1. Instalar dependencias del servidor
cd src/server && npm install

# 2. Instalar dependencias del frontend
cd src/app && npm install

# 3. (Opcional) Subir el sketch al Arduino
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:uno src/server/acquisition/arduino_sketch.ino

# 4. Iniciar el servidor Express (puerto 4000)
cd src/server && node index.js

# 5. Iniciar el frontend React (puerto 3000)
cd src/app && npm start
```

Abrir `http://localhost:3000` en el navegador.

---

## 10. Variables de Entorno

Crear `src/server/.env`:

```env
SERIAL_PORT=/dev/ttyUSB0
BAUD_RATE=115200
SAMPLE_RATE=360
WS_PORT=4001
HTTP_PORT=4000
DEMO_MODE=true
```

> `DEMO_MODE=true` activa el CSV reader en lugar del puerto serial. Cambiar a `false` cuando se conecte el Arduino.
