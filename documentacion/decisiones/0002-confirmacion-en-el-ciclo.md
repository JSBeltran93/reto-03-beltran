# ADR-0002: La confirmación humana la exige el ciclo, no solo el prompt

- **Estado:** aceptada
- **Contexto:** CA3 indica que el agente solo procede si el siguiente mensaje del usuario confirma. `oc_crear` recibe `confirmado: true` como argumento, que el propio modelo podría enviar.
- **Decisión:** el ciclo guarda un estado de confirmación por sesión (`src/agente/confirmacion.ts`). `oc_crear` con `confirmado: true` se rechaza con `CONFIRMACION_NO_OTORGADA` salvo que el último mensaje del usuario sea afirmativo y el caso pendiente coincida. Cualquier mensaje posterior no relacionado revoca la confirmación. La herramienta conserva su contrato del PRD, así `demo.ts` puede llamarla directamente.
- **Consecuencias:** ni un error del modelo ni una instrucción inyectada en un documento pueden crear una OC por sí solos. `needsConfirmation` de la API sale de este estado y no del texto del modelo.
- **Alternativas consideradas:** solo instrucciones en el prompt (no verificable y evitable); compuerta dentro de la herramienta (la herramienta no conoce la conversación y la demo debe llamarla sin ella).
