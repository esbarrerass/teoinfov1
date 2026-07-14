# Product

## Register

product

## Users

Usuario principal: alguien conectado al sensor AD8232/Arduino monitoreando su propio ECG en tiempo real, en un contexto de uso doméstico o de laboratorio (no clínico). Su tarea principal es leer el ritmo cardíaco en vivo y confiar en la clasificación (Normal/Bradicardia/Taquicardia/Arritmia) que ve en pantalla.

Usuario secundario: el profesor o evaluador del curso de Teoría de la Información y Sistemas de Comunicación (UNAL 2025994), que quiere ver el respaldo teórico del proyecto (gráficas de Fourier, teoría de la información, corrección de errores) cuando se le muestra la app, pero no necesita verlo todo el tiempo.

## Product Purpose

Sistema de monitoreo de ECG en tiempo real que clasifica el ritmo cardíaco y expone, como capa adicional activable, el fundamento teórico de cada etapa del sistema (muestreo, Fourier, teoría de la información, corrección de errores). Éxito significa dos cosas a la vez: (1) alguien puede monitorear su ECG y confiar en lo que ve sin tener que entender la teoría detrás, y (2) el mismo sistema puede desplegarse ante un evaluador técnico mostrando con precisión los cálculos y conceptos del curso, sin sentirse como un anexo desconectado de diapositivas.

## Brand Personality

Moderno y pulido. Preciso y confiable como un instrumento de laboratorio real, no un dashboard de admin genérico. El panel académico (modo profesor) debe integrarse visualmente con el resto de la app, no sentirse como una diapositiva pegada encima.

## Anti-references

- Dashboard de admin genérico (SaaS CRUD): tablas planas, tarjetas idénticas sin jerarquía, sensación de "panel de control" sin propósito claro.
- Panel académico tipo PowerPoint: el modo profesor no debe verse como diapositivas de clase insertadas; debe compartir el mismo lenguaje visual (tema dark, tipografía, componentes) que el núcleo de monitoreo.

## Design Principles

- El núcleo de monitoreo (ECG en vivo, clasificación, calidad de señal/Fourier) siempre visible, sin necesidad de navegar, porque es lo que un usuario real consulta continuamente.
- El contenido académico (Cap. I, III, IV, V) es una capa desplegable/ocultable, no pestañas permanentes al mismo nivel que el monitoreo — el usuario decide cuándo mostrarlo.
- Mismo sistema visual en ambas capas: el modo académico no es un anexo con otro estilo, es una extensión del mismo lenguaje de diseño.
- Precisión antes que ornamento: cada número mostrado debe ser trazable al dato real que emite el backend, sin relleno visual que no aporte información.

## Accessibility & Inclusion

WCAG AA estándar: contraste mínimo 4.5:1 en texto de cuerpo, navegación por teclado en controles interactivos (sliders, botones de pestaña), foco visible. El color no es el único indicador de estado (normal/anormal ya combina color + texto + badge, mantener ese patrón en todo panel nuevo).
