# Guía Técnica — Systole

Instrumento de medición de ECG: adquisición desde Arduino/AD8232, filtrado, extracción de features de variabilidad de frecuencia cardíaca, y clasificación del ritmo con un SVM entrenado sobre MIT-BIH.

---

## 1. Arquitectura del sistema

```text
┌─────────────┐    ┌──────────┐    ┌─────────────────┐    ┌──────────────────────────────────┐
│   Corazón   │───▶│  AD8232  │───▶│  Arduino Uno    │───▶│        Express (Node.js)         │
│             │    │ (sensor) │    │  analogRead()   │    │  serialReader → preprocessing    │
└─────────────┘    └──────────┘    │  líneas ASCII   │    │  → FFT → Pan-Tompkins → SVM      │
                                   └─────────────────┘    └────────────────┬─────────────────┘
                                        Serial USB                         │ WebSocket
                                                                           ▼
                                                                 ┌──────────────────┐
                                                                 │   React (UI)     │
                                                                 │  landing →       │
                                                                 │  medición →      │
                                                                 │  resultados      │
                                                                 └──────────────────┘
```

---

## 2. Stack tecnológico

### Hardware

| Componente | Descripción |
| --- | --- |
| Arduino Uno / Nano | Microcontrolador — lee el AD8232 y transmite por serial |
| AD8232 | Módulo amplificador ECG de un solo canal — filtro analógico integrado, detección de electrodos desconectados |
| Electrodos (3) | RA (brazo derecho), LA (brazo izquierdo), RL (pierna derecha / tierra) |

### Backend (Node.js — `src/server/`)

| Paquete | Uso |
| --- | --- |
| `express` | Servidor HTTP + API REST |
| `ws` | WebSocket — streaming en tiempo real hacia React |
| `serialport` | Lectura del puerto serial USB del Arduino |
| `fft.js` | FFT para el espectro de potencia y SNR |
| `libsvm-js` | Clasificador SVM (kernel RBF, LIBSVM compilado a WASM) |
| `simple-statistics` | Media, RMSSD, SDNN de intervalos RR |

### Frontend (React — `src/app/`)

| Paquete | Uso |
| --- | --- |
| `react` 18 | UI |
| `react-router-dom` | Rutas (`/`, `/medicion`) |
| `recharts` | Gráfica de ECG en tiempo real |

---

## 3. Estructura de carpetas

```text
teoinfov1/
├── docs/
│   └── TECHNICAL_GUIDE.md
├── src/
│   ├── app/                            ← Frontend React
│   │   └── src/
│   │       ├── pages/
│   │       │   ├── LandingPage.jsx     ← landing, CTA "Empezar medición"
│   │       │   └── MeasurementPage.jsx ← countdown 60s, ECG en vivo, calidad de señal
│   │       ├── components/
│   │       │   ├── ECGChart.jsx        ← gráfica ECG en tiempo real (Recharts)
│   │       │   └── ResultsPanel.jsx    ← drawer lateral con clasificación y métricas
│   │       ├── signalQuality.js        ← interpretación de SNR → Buena/Aceptable/Baja
│   │       ├── useECGSocket.js         ← hook de conexión WebSocket
│   │       └── main.jsx                ← router
│   └── server/                         ← Backend Express
│       ├── index.js                    ← servidor, pipeline, WebSocket, API REST
│       ├── acquisition/
│       │   └── serialReader.js         ← lectura serial (o generador sintético en modo demo)
│       ├── data/
│       │   └── ecgGenerator.js         ← generador ECG sintético (modo demo, sin Arduino)
│       ├── signalProcessing/
│       │   ├── preprocessing.js        ← filtros IIR (pasa-altas, pasa-bajas, notch)
│       │   ├── fourierAnalysis.js      ← FFT, espectro de potencia, SNR
│       │   ├── panTompkins.js          ← detección de picos R
│       │   └── featureExtraction.js    ← intervalos RR, FC, SDNN, RMSSD, LF/HF
│       ├── classification/
│       │   └── classifier.js           ← SVM (Normal/Anormal) + sub-etiqueta por umbrales
│       └── training/
│           ├── prepareDataset.js       ← parser de MIT-BIH + ventaneo de latidos
│           ├── trainClassifier.js      ← entrena el SVM, imprime métricas
│           └── model.json              ← modelo SVM entrenado (versionado)
└── README.md
```

---

## 4. Pipeline de procesamiento (`index.js`)

Por cada tick (cada 250 ms, mientras haya un cliente WebSocket conectado):

1. **`serialReader.getBuffer()`** — últimas muestras del buffer circular (Arduino real o generador sintético en modo demo).
2. **`preprocessing.preprocess()`** — filtro pasa-altas (0.5 Hz, deriva de línea base), pasa-bajas (40 Hz, ruido muscular), notch (60 Hz, interferencia eléctrica).
3. **`fourierAnalysis.analyzeSignal()`** — FFT de la señal cruda y filtrada, cálculo de SNR (crudo y filtrado).
4. **`panTompkins.detectPeaks()`** — detección de picos R sobre la señal filtrada.
5. **`featureExtraction.extractFeatures()`** — a partir de los picos R: intervalo RR medio, FC, SDNN, RMSSD, LF/HF.
6. **`classifier.classify()`** — SVM entrenado sobre MIT-BIH decide Normal/Anormal; si es anormal, los umbrales de FC/SDNN dan la sub-etiqueta (Bradicardia/Taquicardia/Arritmia).
7. El resultado se envía por WebSocket: `{ raw, filtered, peaks, features, classification, fourier }`.

### Clasificación (`classification/classifier.js`)

- Vector de características: `[meanRR, sdnn, rmssd, fc, lfhf]`.
- SVM de kernel RBF (`libsvm-js`), entrenado sobre 48 registros de MIT-BIH (10,169 ventanas de 20 latidos). Métricas en test: accuracy 95.1%, sensibilidad 82.6%, especificidad 98.9%, F1 88.6%.
- Si `training/model.json` no existe, el sistema cae automáticamente a clasificación por umbrales de FC/SDNN (sin SVM).
- Para reentrenar: ver la sección "Entrenar el clasificador" del [README.md](../README.md).

---

## 5. Cableado Arduino — AD8232

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

El Arduino transmite líneas de texto ASCII con el valor crudo del ADC (0–1023) por puerto serial; `serialReader.js` las parsea, calibra automáticamente (min/max sobre los primeros 5 s) y normaliza a `[-1, 1]`.

---

## 6. API del servidor Express

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/status` | Estado del sistema: modo (demo/Arduino), tipo de ECG activo, frecuencia de muestreo |
| `GET` | `/api/snapshot` | Snapshot puntual del pipeline completo (sin esperar el próximo tick WS) |
| `POST` | `/api/ecg-type` | Cambia el tipo de ECG sintético en modo demo (`normal`, `bradycardia`, `tachycardia`, `arrhythmia`) |
| `WS` | `/ws` | Stream en tiempo real: `{ raw, filtered, peaks, features, classification, fourier }` cada 250 ms |

---

## 7. Modo demo (sin Arduino)

Con `DEMO_MODE=true` en `src/server/.env`, `serialReader.js` usa `data/ecgGenerator.js` (generador ECG sintético) en vez de abrir el puerto serial — útil para desarrollar o probar la UI sin el hardware conectado.

> **Limitación conocida:** el generador sintético no reproduce con precisión la variabilidad de frecuencia cardíaca (HRV) real. El SVM (entrenado con datos reales de MIT-BIH) puede clasificar un ECG "normal" sintético como anormal. Esto no afecta la clasificación con el Arduino real — ver el comentario correspondiente en `classifier.js`.

---

## 8. Instalación y ejecución

```bash
# 1. Backend
cd src/server && npm install && node index.js   # puerto 4000

# 2. Frontend
cd src/app && npm install && npm run dev        # puerto 5173 (Vite)
```

Abrir `http://localhost:5173`.

---

## 9. Variables de entorno

Crear `src/server/.env`:

```env
HTTP_PORT=4000
SAMPLE_RATE=360
DEMO_MODE=true
SERIAL_PORT=/dev/cu.usbmodemXXXX
BAUD_RATE=9600
```

- `DEMO_MODE=true` — usa el generador ECG sintético en vez del puerto serial.
- `SERIAL_PORT` / `BAUD_RATE` — solo relevantes con `DEMO_MODE=false` (Arduino real conectado).
- `SAMPLE_RATE` — debe coincidir con la frecuencia real de muestreo del Arduino.
