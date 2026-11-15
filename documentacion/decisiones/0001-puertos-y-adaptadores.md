# ADR-0001: Puertos y adaptadores alrededor de un dominio puro

- **Estado:** aceptada
- **Fecha:** 2026-11-15

## Contexto

El PRD exige un adaptador LLM cuyo reemplazo no toque el ciclo del agente (§6.1) y un `SapAdapter` que hoy es un simulador sobre archivos y mañana una integración real (§7.4–7.5). También evalúa la separación entre comportamiento, conocimiento y ejecución (§6.5).

## Decisión

Arquitectura por capas con puertos y adaptadores. El dominio (`src/tools/oc/`) es TypeScript puro, sin HTTP, LLM ni SDK. Puertos: `AdaptadorLlm` (`src/llm/adapter.ts`) y `SapAdapter` (`src/sap/adapter.ts`). Adaptadores: `AdaptadorAnthropic` (`src/llm/anthropic.ts`), el adaptador de respaldo y `SapSimulado` (`src/sap/mock.ts`). `src/server.ts` compone las dependencias reales del servidor; `src/tools/oc.ts` expone una instancia por defecto (SAP simulado + reloj del sistema) para `demo.ts` y `modulo/`. El SAP y el reloj se inyectan en las herramientas con la fábrica `crearHerramientasOc`.

## Consecuencias

- **Positivas:** `demo.ts` y los tests ejecutan todo el flujo sin clave; cambiar de proveedor de modelo o de integración SAP es un adaptador nuevo; cambiar una regla solo toca `src/tools/oc/reglas.ts`.
- **Negativas:** más archivos e interfaces que un servidor monolítico; la composición en `server.ts` debe mantenerse.

## Alternativas consideradas

- Un único `server.ts` con ciclo, herramientas y HTTP juntos (sugerencia literal del PRD): acopla capas y dificulta probarlas por separado. `server.ts` conserva la API y la composición.
