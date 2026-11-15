# ADR-0003: Las herramientas revalidan desde los documentos del caso

- **Estado:** aceptada
- **Fecha:** 2026-11-15

## Contexto

El contrato del PRD pasa `paquete` y `payload` a través del modelo (`oc_validar {caso, paquete}`, `oc_crear {caso, payload}`) y lista como riesgo que el modelo "arregle" un monto (§10).

## Decisión

Los documentos del caso son la fuente de verdad. `oc_validar` relee el caso y devuelve `aviso` si el paquete recibido difiere. `oc_crear` revalida el caso, reconstruye la orden y rechaza un payload cuya huella canónica (`src/comun/huella.ts`) no coincida, con `PAYLOAD_ALTERADO`.

## Consecuencias

- **Positivas:** el modelo no puede cambiar montos, proveedor ni aprobador entre la validación y la creación; el contrato se mantiene tal como lo define el PRD.
- **Negativas:** cada herramienta relee los archivos del caso (costo despreciable con el volumen del reto).

## Alternativas consideradas

- Confiar en los argumentos del modelo: descartada por el riesgo del PRD §10.
- Cambiar el contrato a solo `{caso}`: descartada porque el contrato del PRD se evalúa.
