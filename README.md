# teoinfov1 — Clasificación de Arritmias Cardíacas mediante ECG

Proyecto para la asignatura **Teoría de la Información y Sistemas de Comunicación (2025994)**  
Universidad Nacional de Colombia — Departamento de Ingeniería de Sistemas e Industrial  
**Autores:** Maria Camila Castro Porras · Esteban Barrera Sanabria  
**Docente:** Oswaldo Rojas Camacho

---

## Descripción

Sistema web que adquiere señales ECG en tiempo real desde un sensor **Arduino AD8232**, las procesa mediante filtros digitales y transformada de Fourier, y clasifica los latidos como **Normal** o **Arritmia** usando SVM. Cada etapa del sistema implementa un capítulo del curso.

```
Corazón → AD8232 → Arduino (PCM/360 Hz) → Express (FFT + SVM) → React (4 pestañas)
```

## Stack

- **Frontend:** React + Recharts
- **Backend:** Node.js + Express + WebSocket
- **Hardware:** Arduino Uno + AD8232
- **Procesamiento:** `fft.js`, `ml-svm`, `serialport`, `simple-statistics`

## Documentación

| Documento | Contenido |
|---|---|
| [TECHNICAL_GUIDE.md](docs/TECHNICAL_GUIDE.md) | Arquitectura, módulos, cableado Arduino, instrucciones de instalación |
| [THEORY_MAP.md](docs/THEORY_MAP.md) | Mapa capítulo a capítulo del syllabus → módulo del proyecto |
| [EstadodelArteTeoInfo.pdf](docs/EstadodelArteTeoInfo.pdf) | Estado del arte: clasificación de arritmias ECG |

## Inicio rápido

```bash
cd src/server && npm install && node index.js   # backend en puerto 4000
cd src/app   && npm install && npm start        # frontend en puerto 3000
```

Sin hardware: establecer `DEMO_MODE=true` en `src/server/.env` para usar datos MIT-BIH.
