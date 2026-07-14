# teoinfov1 — Clasificación de Arritmias Cardíacas mediante ECG

Proyecto para la asignatura **Teoría de la Información y Sistemas de Comunicación (2025994)**  
Universidad Nacional de Colombia — Departamento de Ingeniería de Sistemas e Industrial  
**Autores:** Maria Camila Castro Porras · Esteban Barrera Sanabria  
**Docente:** Oswaldo Rojas Camacho

---

## Descripción

Sistema web que adquiere señales ECG en tiempo real desde un sensor **Arduino AD8232**, las procesa mediante filtros digitales y transformada de Fourier, y clasifica los latidos como **Normal** o **Anormal** (Bradicardia/Taquicardia/Arritmia) usando un **SVM entrenado sobre MIT-BIH**. Cada pantalla del frontend implementa un capítulo del curso.

```
Corazón → AD8232 → Arduino (PCM) → Express (FFT + SVM) → React (5 pantallas, Cap. I-V)
```

## Stack

- **Frontend:** React 18 + Recharts (`ECGChart`, `SystemOverview`, `FourierPanel`, `SamplingDemo`, `InfoTheoryPanel`, `ErrorCorrPanel`)
- **Backend:** Node.js + Express + WebSocket
- **Hardware:** Arduino Uno + AD8232
- **Procesamiento:** `fft.js`, `libsvm-js`, `serialport`, `simple-statistics`

## Clasificación de arritmias (SVM)

El clasificador (`src/server/classification/classifier.js`) usa un **SVM de kernel RBF** (librería `libsvm-js`, LIBSVM real compilado a WASM) entrenado sobre la **MIT-BIH Arrhythmia Database**, en línea con la justificación metodológica de [EstadodelArteTeoInfo.pdf](docs/EstadodelArteTeoInfo.pdf) (características de intervalo RR + clasificador de baja complejidad, en vez de deep learning).

- **Vector de características:** `[meanRR, sdnn, rmssd, fc, lfhf]`, extraído por ventana de 20 latidos con `signalProcessing/featureExtraction.js`.
- **Dataset de entrenamiento:** 48 registros de MIT-BIH (10,169 ventanas, split 36/12 registros train/test — nunca se mezclan ventanas del mismo registro entre train y test).
- **Métricas en test** (registros nunca vistos en entrenamiento): accuracy 95.1%, sensibilidad 82.6%, especificidad 98.9%, F1 88.6%.
- El SVM decide Normal/Anormal; si es anormal, los umbrales de FC/SDNN (enfoque previo, aún en `classifyByThresholds`) solo aportan la sub-etiqueta específica (Bradicardia/Taquicardia/Arritmia).
- Si `training/model.json` no existe, el sistema cae automáticamente a clasificación por umbrales pura (sin SVM).

### Origen del dataset y cómo reentrenar

El dataset **no se versiona en el repo** (~1.1GB, datos de terceros — ver `.gitignore`). Para reentrenar o reproducir el modelo:

1. Descargar [MIT-BIH Arrhythmia Database (Simple CSVs)](https://www.kaggle.com/datasets/protobioengineering/mit-bih-arrhythmia-database-modern-2023) desde Kaggle (cuenta gratuita requerida).
2. Extraer el contenido en `src/server/data/mitbih/archive/` (debe quedar con archivos `<registro>_ekg.csv` y `<registro>_annotations_1.csv` por cada uno de los 48 registros).
3. `cd src/server && npm install && node training/trainClassifier.js`
4. Esto regenera `training/model.json` (sí versionado — es liviano, ~156KB, y evita que cualquiera que clone el repo tenga que descargar el dataset y reentrenar solo para correr el proyecto) e imprime en consola la matriz de confusión y métricas (sensibilidad, especificidad, F1) en train y test.

**Créditos del dataset:** MIT-BIH Arrhythmia Database, desarrollada por MIT y Beth Israel Hospital (G. B. Moody y R. G. Mark, *"The MIT-BIH Arrhythmia Database"*, IEEE Eng. Med. Biol. Mag., 2001), distribuida vía [PhysioNet](https://physionet.org). CSV derivado cortesía de [protobioengineering en Kaggle](https://www.kaggle.com/datasets/protobioengineering/mit-bih-arrhythmia-database-modern-2023).

## Documentación

| Documento | Contenido |
|---|---|
| [TECHNICAL_GUIDE.md](docs/TECHNICAL_GUIDE.md) | Arquitectura, módulos, cableado Arduino, instrucciones de instalación |
| [THEORY_MAP.md](docs/THEORY_MAP.md) | Mapa capítulo a capítulo del syllabus → módulo del proyecto |
| [EstadodelArteTeoInfo.pdf](docs/EstadodelArteTeoInfo.pdf) | Estado del arte: clasificación de arritmias ECG (justifica el enfoque SVM sobre deep learning) |
| [spec.md](docs/spec.md) | Spec de las 5 pantallas del frontend (SDD: overview, scope, constraints, verificación, task breakdown) |

## Inicio rápido

```bash
cd src/server && npm install && node index.js   # backend en puerto 4000
cd src/app   && npm install && npm start        # frontend en puerto 3000
```

Sin hardware: establecer `DEMO_MODE=true` en `src/server/.env` para usar el generador ECG sintético (`data/ecgGenerator.js`).

> **Limitación conocida:** el modo DEMO sintético no reproduce con precisión la variabilidad de frecuencia cardíaca (HRV) real, lo que puede hacer que el SVM (entrenado con datos reales) clasifique un ECG "normal" sintético como anormal. No afecta la clasificación con el Arduino real. Ver comentario en `classifier.js`.
