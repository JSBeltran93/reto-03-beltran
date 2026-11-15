# ADR-0003: Las herramientas revalidan desde los documentos del caso

- **Estado:** aceptada
- **Contexto:** el contrato del PRD pasa `paquete` y `payload` a través del modelo (`oc_validar {caso, paquete}`, `oc_crear {caso, payload}`) y lista como riesgo que el modelo "arregle" un monto (§10).
- **Decisión:** los documentos del caso son la fuente de verdad. `oc_validar` relee el caso y devuelve `aviso` si el paquete recibido difiere. `oc_crear` revalida el caso, reconstruye la orden y rechaza un payload cuya huella canónica (`src/comun/huella.ts`) no coincida, con `PAYLOAD_ALTERADO`.
- **Consecuencias:** el modelo no puede cambiar montos, proveedor ni aprobador entre la validación y la creación; la forma del contrato se mantiene tal como la define el PRD.
- **Alternativas consideradas:** confiar en los argumentos (descartada por el riesgo anterior); cambiar el contrato a solo `{caso}` (descartada porque el contrato del PRD se evalúa).
