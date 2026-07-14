# Product

## Name

**Systole**. Nombre corto, evoca precisión fisiológica real (el momento de contracción cardíaca), no suena a app de fitness genérica.

## Register

product

## Users

Usuario principal (único): alguien que se conecta electrodos AD8232 y quiere medirse el ECG durante una sesión puntual de 60 segundos, para obtener una clasificación del ritmo (Normal/Bradicardia/Taquicardia/Arritmia) y ver el detalle de esa medición (calidad de señal, variabilidad de frecuencia cardíaca, confianza del modelo). No es un monitor continuo — es una medición bajo demanda, como un instrumento de laboratorio que se usa cuando se necesita.

## Product Purpose

Instrumento de medición de ECG puntual: el usuario llega, inicia una medición de 60 segundos, y recibe un panel de resultados con la clasificación (vía SVM entrenado en MIT-BIH) y el detalle de la señal capturada. Éxito significa que el flujo landing → medición → resultados se siente como usar un instrumento de laboratorio real, con foco total en la tarea de medir, sin ningún contenido que no sirva directamente a esa tarea.

## Core Flow

```text
Landing (/) → Medición (/medicion, captura 60s) → Resultados (panel lateral deslizable)
```

- La medición es una sesión de 60 segundos con countdown visible; al finalizar, se toma el último mensaje WebSocket recibido (ya trae el pipeline de Fourier/features/SVM corrido sobre la ventana más reciente) como resultado final — no se reprocesan los 60s completos en el cliente.
- El panel de resultados se abre como un drawer lateral derecho (deslizable/cerrable), no una navegación a página nueva — permite volver a medir sin perder contexto.
- El SNR (Fourier) se mantiene únicamente como indicador de calidad de señal (en vivo durante la medición y en el panel de resultados) — no como contenido educativo separado.

## Brand Personality

Moderno y pulido. Preciso y confiable como un instrumento de laboratorio real, no un dashboard de admin genérico ni una app de fitness/wellness. La landing debe sentirse como la portada de un instrumento diagnóstico serio, no una página de marketing SaaS (sin precios, sin testimonios, sin logos de clientes).

## Anti-references

- Dashboard de admin genérico (SaaS CRUD): tablas planas, tarjetas idénticas sin jerarquía, sensación de "panel de control" sin propósito claro.
- Landing de SaaS de marketing: sin hero con gradientes genéricos, sin "trusted by" logos, sin pricing — es la puerta de entrada a un instrumento real, no una página de conversión de producto de suscripción.
- App de fitness/wellness genérica: nada de paleta pastel, iconografía redondeada tipo app de salud mental — el tema dark técnico ya establecido comunica seriedad instrumental.
- Contenido educativo/didáctico: nada de explicaciones teóricas, diagramas conceptuales, ni pantallas que existan solo para demostrar un concepto — todo en la UI debe servir directamente a medir y entender el resultado propio.

## Design Principles

- El flujo de medición (landing → captura 60s → resultados) es el único flujo del producto — debe sentirse continuo y sin fricción, con un único CTA claro en cada paso.
- El panel de resultados es un drawer lateral, no una navegación destructiva — el usuario puede cerrarlo y volver a medir sin perder el hilo.
- Cada dato mostrado (clasificación, SNR/calidad de señal, HRV) debe ser algo que el usuario real necesita para confiar en o actuar sobre su medición — no un dato mostrado porque el backend lo calcula.
- Precisión antes que ornamento: cada número mostrado debe ser trazable al dato real que emite el backend/modelo, sin relleno visual que no aporte información.

## Accessibility & Inclusion

WCAG AA estándar: contraste mínimo 4.5:1 en texto de cuerpo, navegación por teclado en controles interactivos (sliders, botones de pestaña), foco visible. El color no es el único indicador de estado (normal/anormal ya combina color + texto + badge, mantener ese patrón en todo panel nuevo).
