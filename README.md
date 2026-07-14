# Systole — Instrumento de medición ECG

**Systole** mide tu ritmo cardíaco: conectas el sensor **Arduino AD8232**, inicias una medición de 60 segundos, y al finalizar recibes una clasificación del ritmo (**Normal** o **Anormal** — Bradicardia/Taquicardia/Arritmia) calculada por un **SVM entrenado sobre MIT-BIH**, junto con la calidad de la señal capturada y la variabilidad de frecuencia cardíaca.

```text
Corazón → AD8232 → Arduino → Express (filtrado + Fourier + SVM) → React (landing → medición → resultados)
```

## Flujo de la app

1. **`/`** — Landing: presenta el instrumento, un único CTA ("Empezar medición").
2. **`/medicion`** — El usuario inicia una medición de 60 segundos (countdown visible, ECG en vivo, indicador de calidad de señal en tiempo real basado en SNR).
3. **Panel de resultados** — Al finalizar, se abre un drawer lateral con la clasificación, confianza del modelo, calidad de señal y variabilidad de frecuencia cardíaca (FC, SDNN, RMSSD).

## Stack

- **Frontend:** React 18 + React Router (`LandingPage`, `MeasurementPage`, `ResultsPanel`)
- **Backend:** Node.js + Express + WebSocket
- **Hardware:** Arduino Uno + AD8232
- **Procesamiento:** `fft.js` (calidad de señal/SNR), `libsvm-js` (clasificación), `serialport`, `simple-statistics`

## Clasificación del ritmo (SVM)

El clasificador (`src/server/classification/classifier.js`) usa un **SVM de kernel RBF** (librería `libsvm-js`, LIBSVM compilado a WASM) entrenado sobre la **MIT-BIH Arrhythmia Database**.

- **Vector de características:** `[meanRR, sdnn, rmssd, fc, lfhf]`, extraído por ventana de 20 latidos con `signalProcessing/featureExtraction.js`.
- **Dataset de entrenamiento:** 48 registros de MIT-BIH (10,169 ventanas, split 36/12 registros train/test — nunca se mezclan ventanas del mismo registro entre train y test).
- **Métricas en test** (registros nunca vistos en entrenamiento): accuracy 95.1%, sensibilidad 82.6%, especificidad 98.9%, F1 88.6%.
- El SVM decide Normal/Anormal; si es anormal, los umbrales de FC/SDNN (`classifyByThresholds`) solo aportan la sub-etiqueta específica (Bradicardia/Taquicardia/Arritmia).
- Si `training/model.json` no existe, el sistema cae automáticamente a clasificación por umbrales pura (sin SVM).

### Entrenar el clasificador

El dataset **no se versiona en el repo** (~1.1GB, datos de terceros — ver `.gitignore`). Para reentrenar o reproducir el modelo:

1. Descargar [MIT-BIH Arrhythmia Database (Simple CSVs)](https://www.kaggle.com/datasets/protobioengineering/mit-bih-arrhythmia-database-modern-2023) desde Kaggle (cuenta gratuita requerida).
2. Extraer el contenido en `src/server/data/mitbih/archive/` (debe quedar con archivos `<registro>_ekg.csv` y `<registro>_annotations_1.csv` por cada uno de los 48 registros).
3. `cd src/server && npm install && node training/trainClassifier.js`
4. Esto regenera `training/model.json` (versionado — liviano, ~156KB) e imprime en consola la matriz de confusión y métricas (sensibilidad, especificidad, F1) en train y test.

**Créditos del dataset:** MIT-BIH Arrhythmia Database, desarrollada por MIT y Beth Israel Hospital (G. B. Moody y R. G. Mark, *"The MIT-BIH Arrhythmia Database"*, IEEE Eng. Med. Biol. Mag., 2001), distribuida vía [PhysioNet](https://physionet.org). CSV derivado cortesía de [protobioengineering en Kaggle](https://www.kaggle.com/datasets/protobioengineering/mit-bih-arrhythmia-database-modern-2023).

## Documentación

| Documento                                    | Contenido                                                  |
| --------------------------------------------- | ----------------------------------------------------------- |
| [TECHNICAL_GUIDE.md](docs/TECHNICAL_GUIDE.md) | Arquitectura, módulos, cableado Arduino, API, instalación |

## Inicio rápido

```bash
cd src/server && npm install && node index.js   # backend en puerto 4000
cd src/app   && npm install && npm run dev      # frontend en puerto 5173 (Vite)
```

Sin hardware: establecer `DEMO_MODE=true` en `src/server/.env` para usar el generador ECG sintético (`data/ecgGenerator.js`).

> **Limitación conocida:** el modo demo sintético no reproduce con precisión la variabilidad de frecuencia cardíaca (HRV) real, lo que puede hacer que el SVM (entrenado con datos reales) clasifique un ECG "normal" sintético como anormal. No afecta la clasificación con el Arduino real. Ver comentario en `classifier.js`.
