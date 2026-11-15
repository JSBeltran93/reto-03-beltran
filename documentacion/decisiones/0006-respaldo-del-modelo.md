# ADR-0006: Modelo de respaldo como adaptador del mismo puerto

- **Estado:** aceptada
- **Fecha:** 2026-11-15

## Contexto

El PRD no exige un respaldo, pero el link público debe responder durante la defensa. Si el modelo principal agota el tiempo, alcanza su límite de solicitudes, no está disponible o rechaza una respuesta, el turno fallaría. El parámetro `fallbacks` del SDK existe solo en `client.beta.messages` (beta `server-side-fallback-2026-07-01`) y solo cubre rechazos del modelo, no timeouts, límites (429) ni caídas.

## Decisión

`AdaptadorConRespaldo` implementa `AdaptadorLlm` envolviendo dos adaptadores: el principal (`LLM_MODELO`, `claude-opus-5-5`) y el de respaldo (`LLM_MODELO_RESPALDO`, `claude-sonnet-5-5`). Ante timeout, límite, no disponible o rechazo, el mismo turno se reintenta con el respaldo. Un `stop_reason: refusal` se traduce a `LLM_RECHAZO`, lo que activa el respaldo. El SDK reintenta cada llamada 1 vez (`maxRetries: 1`) antes de pasar al respaldo, para que un proveedor colgado no consuma todo el plazo del turno. Ante clave inválida o solicitud inválida no se reintenta, porque fallaría igual. Se compone en `src/server.ts`.

## Consecuencias

- **Positivas:** el ciclo no cambia; el respaldo es configurable; si ambos fallan, el usuario recibe un error claro y la sesión sigue viva; las herramientas deterministas y `demo.ts` funcionan sin modelo.
- **Negativas:** el respaldo puede orquestar con algo menos de calidad; un turno fallido puede tardar más (dos intentos), acotado por el plazo máximo del turno.

## Alternativas consideradas

- Un solo modelo: más simple, sin resiliencia.
- `fallbacks` del servidor (API beta): solo cubre rechazos y obliga a usar la API beta.
- Otro proveedor como respaldo: más independencia, pero requiere otra clave y otro adaptador; queda como mejora.
