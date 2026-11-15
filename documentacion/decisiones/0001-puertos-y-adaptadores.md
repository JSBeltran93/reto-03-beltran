# ADR-0001: Puertos y adaptadores alrededor de un dominio puro

- **Estado:** aceptada
- **Contexto:** el PRD exige un adaptador LLM cuyo reemplazo no toque el ciclo del agente (§6.1) y un `SapAdapter` que hoy es un simulador sobre archivos y mañana una integración real (§7.4–7.5). También evalúa la separación entre comportamiento, conocimiento y ejecución (§6.5).
- **Decisión:** arquitectura por capas con puertos y adaptadores. El dominio (`src/tools/oc/`) es TypeScript puro, sin HTTP, LLM ni SDK. Puertos: `AdaptadorLlm` (`src/llm/adapter.ts`) y `SapAdapter` (`src/sap/adapter.ts`). Adaptadores: `AdaptadorAnthropic` (`src/llm/anthropic.ts`) y `SapSimulado` (`src/sap/mock.ts`). `src/server.ts` es la única raíz de composición.
- **Consecuencias:** `demo.ts` y los tests ejecutan todo el flujo de negocio sin clave; cambiar de proveedor de modelo o de integración SAP es un adaptador nuevo, no un cambio en el ciclo ni en las reglas. Cambiar una regla solo toca `src/tools/oc/reglas.ts`.
- **Alternativas consideradas:** un único `server.ts` con ciclo, herramientas y HTTP juntos (sugerencia literal del PRD). Se descartó porque acopla HTTP, ciclo y reglas, y dificulta probarlos por separado; `server.ts` conserva la API y la composición.
