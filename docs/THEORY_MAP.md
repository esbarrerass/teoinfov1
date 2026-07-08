# Mapa Teoría–Práctica

## Clasificación de Arritmias ECG como Sistema de Comunicación Completo

Universidad Nacional de Colombia — Teoría de la Información y Sistemas de Comunicación (2025994)

> Para los detalles de implementación de cada módulo ver → [TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md)

---

## Introducción

El sistema de análisis ECG no es solo un proyecto de procesamiento de señales: **es un canal de comunicación completo** que implementa, de extremo a extremo, los principios de cada capítulo del curso.

```text
┌──────────────┐   ┌────────────┐   ┌──────────────┐   ┌───────────────┐   ┌────────────┐
│   Corazón    │   │   AD8232   │   │   Arduino    │   │    Express    │   │   React    │
│              │   │            │   │   (PCM/ADC)  │   │  (procesador) │   │  (destino) │
│  Fuente de   │──▶│ Transductor│──▶│  Canal       │──▶│  Receptor     │──▶│  Sumidero  │
│  información │   │ analógico  │   │  digital     │   │  + decodif.   │   │  de info.  │
└──────────────┘   └────────────┘   └──────────────┘   └───────────────┘   └────────────┘
   Cap. I              Cap. II           Cap. III            Cap. IV/V          Cap. IV
```

Cada bloque del diagrama corresponde a un módulo del código y a uno o más capítulos del syllabus.

---

## Capítulo I — Introducción a las Telecomunicaciones

### Cap. I — Conexión con el proyecto

| Concepto del syllabus | Cómo aparece en el sistema ECG |
| --- | --- |
| Breve reseña histórica (1.1) | El ECG fue inventado por Einthoven (1903). Su transmisión digital y clasificación automática es la evolución moderna de ese canal de diagnóstico. |
| Enfoque sistémico (1.2) | El sistema ECG se modela como una cadena fuente → canal → receptor, tal como lo describe el enfoque sistémico de la teoría de la información. |

**El corazón como fuente de información:** El corazón genera una señal bioeléctrica periódica (~1 Hz fundamental) con información sobre el estado del sistema cardiovascular. Cada latido transporta bits de información clínica (normal vs. patológico).

> Referencia al código: ver diagrama de arquitectura en [TECHNICAL_GUIDE.md §2](TECHNICAL_GUIDE.md#2-arquitectura-del-sistema)

---

## Capítulo II — Sistemas de Comunicación y Transformada de Fourier

Este es el núcleo matemático del sistema. La señal ECG se procesa en el dominio de la frecuencia para diseñar los filtros y analizar el contenido espectral.

### Cap. II — Temas del syllabus cubiertos

| Tema | Implementación en el proyecto |
| --- | --- |
| **2.5 Serie exponencial y trigonométrica de Fourier** | El latido cardíaco es cuasi-periódico. Se descompone en armónicos: onda P (~5 Hz), complejo QRS (~10–25 Hz) y onda T (~1–5 Hz) ocupan bandas distintas. |
| **2.6 Representación de señales aperiódicas** | El registro ECG completo (no periódico) se analiza con la integral de Fourier → implementada como DFT sobre ventanas deslizantes. |
| **2.7 Transformadas de funciones útiles** | La Delta de Dirac modela cada pico R; su transformada (constante en frecuencia) justifica la detección en el dominio temporal. |
| **2.8 Propiedades de la Transformada de Fourier** | La convolución temporal = multiplicación en frecuencia justifica el diseño de filtros FIR. La linealidad permite superponer filtros en cascada. |
| **2.9 Transmisión a través de sistema lineal** | El AD8232 se modela como sistema LTI. Su función de transferencia H(f) amplifica la banda 0.5–40 Hz y atenúa el resto. |
| **2.10 Filtros ideales vs. prácticos** | La UI muestra lado a lado: el filtro pasa-banda ideal (brick-wall) vs. el filtro Butterworth/FIR real. Ilustra la caída gradual y el retardo de grupo. |
| **2.11 DFT: Cálculo computacional** | `fourierAnalysis.js` implementa la FFT con `fft.js`. Se aplica ventana de Hann para reducir la fuga espectral (*spectral leakage*). |

### Cap. II — Visualización en la UI

**Pestaña "Cap. II — Fourier"** (`FourierPanel.jsx`):

```text
┌──────────────────────────────────────────────────────────────┐
│  ECG crudo (temporal)      │  Espectro FFT crudo             │
│                            │  Picos en 1 Hz, 5 Hz, 20 Hz    │
│  ECG filtrado (temporal)   │  Espectro FFT filtrado          │
│                            │  Ruido eliminado > 40 Hz        │
│  Respuesta H(f)            │  SNR antes: X dB                │
│  Ideal vs. FIR real        │  SNR después: Y dB              │
└──────────────────────────────────────────────────────────────┘
```

> Módulos: [fourierAnalysis.js](TECHNICAL_GUIDE.md#54-signalprocessingfourieranalysisjs) · [preprocessing.js](TECHNICAL_GUIDE.md#53-signalprocessingpreprocessingjs)

---

## Capítulo III — Transmisión Digital de Señales Analógicas

La ruta Arduino → Serial → Node.js **es** un sistema PCM completo: muestreo, cuantización, codificación y transmisión de línea.

### Cap. III — Temas del syllabus cubiertos

| Tema | Implementación en el proyecto |
| --- | --- |
| **3.1 Teorema de muestreo** | El ADC del Arduino muestrea a **fs = 360 Hz**. El ancho de banda ECG es ~150 Hz → se necesita fs > 300 Hz (Nyquist). La UI incluye demo de aliasing: reducir a 100 Hz genera componentes falsas. |
| **3.2 PCM** | El ADC de 10 bits cuantiza en **1024 niveles**. Ruido de cuantización: `e_q = Δ/√12` donde `Δ = 3300 mV / 1024 ≈ 3.2 mV`. La UI muestra reconstrucción con 4, 8 y 10 bits. |
| **3.3 Telefonía digital / T1/E1** | Cada canal ECG a 360 Hz × 10 bits = **3.6 kbps** por paciente. Un sistema hospitalario multi-paciente es análogo a la multiplexación T1/E1. |
| **3.7 Codificación de línea** | Los datos viajan por UART a 115,200 bps. Esto es codificación NRZ-L en el cable USB serial. |
| **3.8 Conformación de pulsos** | El AD8232 incorpora un filtro anti-aliasing analógico que limita el ancho de banda antes de la conversión. |

### Estructura del paquete PCM serial

```text
┌─────────────┬─────────────────┬─────────────────┬─────────────┐
│  START (1B) │  VALOR_HIGH (1B)│  VALOR_LOW (1B) │  CRC-8 (1B) │
│    0xFF     │   bits [9:8]    │   bits [7:0]    │  check byte │
└─────────────┴─────────────────┴─────────────────┴─────────────┘
  4 bytes × 360 muestras/s = 1,440 bytes/s = 11,520 bits/s
```

### Cap. III — Visualización en la UI

**Pestaña "Cap. III — Muestreo y PCM"** (`SamplingDemo.jsx`):

- Señal original a 360 Hz vs. señal submuestreada a 100 Hz (aliasing visible)
- Curva de error de cuantización vs. número de bits (4 → 8 → 10 → 12)
- Espectrograma que muestra la banda útil vs. frecuencia de Nyquist

> Módulos: [arduino_sketch.ino](TECHNICAL_GUIDE.md#51-acquisitionarduino_sketchino) · [serialReader.js](TECHNICAL_GUIDE.md#52-acquisitionserialreaderjs)

---

## Capítulo IV — Teoría de la Información

La señal ECG se reinterpreta como una **fuente de información estocástica**. Se mide cuánta información genera el corazón y cuánta puede transmitir el canal serial.

### Cap. IV — Temas del syllabus cubiertos

| Tema | Implementación en el proyecto |
| --- | --- |
| **4.2 Medida de la información / Entropía** | Se calcula H(X) sobre la secuencia de latidos clasificados. Si p(Normal)=0.75 y p(Arritmia)=0.25 → H = 0.81 bits/latido. |
| **4.3 Codificación de la fuente** | Los intervalos RR se comprimen con **código Huffman**. Se demuestra que la longitud promedio del código ≈ H(RR) bits/símbolo (primer teorema de Shannon). |
| **4.5 Capacidad de canal discreto** | El canal serial con CRC se modela como canal binario simétrico y se calcula su capacidad `C = 1 - H(p_e)`. |
| **4.6 Capacidad de canal continuo** | `channelCapacity.js` calcula **C = B·log₂(1+SNR)** donde B = 180 Hz (Nyquist del ECG). El SNR mejora tras el filtrado → la capacidad aumenta. |
| **4.7 Ecuación de Shannon en sistemas prácticos** | La UI muestra: SNR_crudo → C_cruda vs. SNR_filtrado → C_filtrada. Justifica matemáticamente la necesidad del filtrado. |

### Ejemplo de cálculo de capacidad

```text
Antes del filtro:
  SNR_crudo ≈ 15 dB = 31.6 (lineal)
  C = 180 Hz × log₂(1 + 31.6) ≈ 180 × 5.0 = 900 bits/s

Después del filtro:
  SNR_filtrado ≈ 30 dB = 1000 (lineal)
  C = 180 Hz × log₂(1 + 1000) ≈ 180 × 10.0 = 1800 bits/s

→ El filtrado duplica la capacidad del canal ECG.
```

### Cap. IV — Visualización en la UI

**Pestaña "Cap. IV — Teoría de la Información"** (`InfoTheoryPanel.jsx`):

- Barra de entropía H(latidos) actualizada en tiempo real
- Árbol Huffman de los intervalos RR con longitudes de código
- Gráfica: SNR antes/después del filtro → capacidad de canal C en bits/s
- Comparación: bits teóricos mínimos (H) vs. bits usados en transmisión real

> Módulos: [entropy.js](TECHNICAL_GUIDE.md#57-informationtheoryentropyjs) · [channelCapacity.js](TECHNICAL_GUIDE.md#58-informationtheorychannelcapacityjs) · [sourceCoding.js](TECHNICAL_GUIDE.md#59-informationtheorysourcecodingjs)

---

## Capítulo V — Códigos Correctores de Errores

La transmisión serial Arduino → Node.js es un canal con posibles errores (ruido eléctrico, latencia USB). Se protege con códigos de bloque.

### Cap. V — Temas del syllabus cubiertos

| Tema | Implementación en el proyecto |
| --- | --- |
| **5.2 Redundancia para corrección de errores** | Cada paquete serial de 3 bytes incluye 1 byte de CRC-8 → 33% de redundancia. Detecta cualquier error de 1 byte. |
| **5.3 Códigos de bloque lineales** | El resultado de clasificación (2 bits) se protege con **Hamming(7,4)**: 4 bits de datos + 3 bits de paridad. Corrige 1 error y detecta 2. |
| **5.4 Códigos cíclicos** | El CRC-8 es un código cíclico con polinomio generador x⁸+x²+x+1. La división polinomial es el mecanismo de detección. |
| **5.5 Efectos de la corrección de errores** | La UI simula un canal con BER variable: sin código vs. con CRC (detección) vs. con Hamming (corrección). |
| **5.7 Diagrama de Trellis** | El diagrama de trellis del Hamming(7,4) se visualiza en la UI, mostrando el camino de decodificación para un patrón de error dado. |

### Estructura de protección en capas

```text
Capa 1 — Paquete serial (CRC-8):
  [DATA_H][DATA_L][CRC8]  → detecta corrupción en la transmisión USB

Capa 2 — Resultado de clasificación (Hamming 7,4):
  [b0 b1 p0 p1 p2 p3 p4]  → corrige 1 bit de error en el resultado final
  donde b0,b1 = bits de clasificación; p0..p4 = bits de paridad
```

### Cap. V — Visualización en la UI

**Pestaña "Cap. V — Corrección de Errores"** (`ErrorCorrPanel.jsx`):

- Simulador de canal ruidoso: slider de BER (10⁻⁶ a 10⁻¹)
- Tabla: mensajes enviados / errores detectados / corregidos / no detectados
- Diagrama de Trellis para el Hamming(7,4)
- Gráfica BER vs. Eb/N0 para el canal serial

> Módulos: [crc8.js](TECHNICAL_GUIDE.md#510-errorcorrectioncrc8js) · [hamming.js](TECHNICAL_GUIDE.md#511-errorcorrectionhammingjs)

---

## Tabla Resumen

| Capítulo | Tema central | Módulos (servidor) | Componente React | Métricas clave |
| --- | --- | --- | --- | --- |
| I | Enfoque sistémico de telecomunicaciones | — | Diagrama en `App.jsx` | Modelo fuente–canal–receptor |
| II | Fourier, filtros, sistemas LTI | `fourierAnalysis.js`, `preprocessing.js` | `FourierPanel.jsx` | SNR, espectro de potencia |
| III | Muestreo, PCM, transmisión digital | `arduino_sketch.ino`, `serialReader.js` | `SamplingDemo.jsx` | fs=360 Hz, 10 bits, BER serial |
| IV | Entropía, capacidad de canal, Huffman | `entropy.js`, `channelCapacity.js`, `sourceCoding.js` | `InfoTheoryPanel.jsx` | H(X) bits/latido, C bits/s |
| V | CRC, Hamming, corrección de errores | `crc8.js`, `hamming.js` | `ErrorCorrPanel.jsx` | Tasa de corrección, Trellis |

---

## Fuentes del Curso por Módulo

| Módulo | Referencia recomendada |
| --- | --- |
| `fourierAnalysis.js` | Proakis & Salehi (2013) Cap. 3 · Lathi & Ding (2009) Cap. 2–3 |
| `preprocessing.js` | Haykin (2001) Cap. 2 · Couch (2013) Cap. 1 |
| `serialReader.js` + `arduino_sketch.ino` | Proakis & Salehi Cap. 6 · Couch Cap. 5 |
| `entropy.js`, `channelCapacity.js` | Shannon & Weaver (1949) · Cover & Thomas (2006) Cap. 1–8 |
| `sourceCoding.js` | Cover & Thomas Cap. 5 · MacKay (2003) Cap. 5 |
| `crc8.js`, `hamming.js` | Proakis & Salehi Cap. 8 · Gallager (1968) Cap. 6–7 |
