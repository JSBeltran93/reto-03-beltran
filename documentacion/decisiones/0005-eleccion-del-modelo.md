# ADR-0005: Claude Opus 5.5 con esfuerzo bajo y ciclo manual de herramientas

- **Estado:** aceptada
- **Contexto:** las decisiones de negocio son deterministas y viven en código; el modelo orquesta herramientas, explica resultados y pide confirmación. Importa más la fiabilidad en el uso de herramientas que la profundidad de razonamiento.
- **Decisión:** Anthropic `claude-opus-5-5` con `output_config.effort: "low"`, `tool_choice: auto`, caché de prompt en el system prompt y en las definiciones de herramientas, y ciclo manual (sin el tool runner del SDK) para que el agente controle CA1–CA5. El modelo se configura con `LLM_MODELO`.
- **Consecuencias:** costo estimado por caso ≈ USD 0,10–0,22 (≈ 5–6 llamadas, ~40 K tokens de entrada y ~3 K de salida a USD 4 / 20 por millón; el valor bajo supone aciertos de caché). El uso real se ve en los contadores de tokens por sesión.
- **Alternativas consideradas:** Claude Sonnet 5.5 o Haiku 5.5 (más baratos; candidatos tras medir los seis casos); el tool runner del SDK (menos código, pero oculta el ciclo que evalúa el PRD). El respaldo automático ante rechazos (`fallbacks`) no existe en la versión instalada del SDK y queda como mejora.
