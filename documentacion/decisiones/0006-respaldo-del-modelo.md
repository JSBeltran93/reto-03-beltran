# ADR-0006: Modelo de respaldo como adaptador del mismo puerto

- **Estado:** aceptada
- **Fecha:** 2026-11-15

## Contexto

El PRD no exige un respaldo, pero el link público debe responder durante la defensa. Si el modelo principal agota el tiempo, alcanza su límite de solicitudes, no está disponible o rechaza una respuesta, el turno fallaría. El parámetro de respaldo del lado del servidor (`fallbacks`) no existe en la versión instalada del SDK.

## Decisión

`AdaptadorConRespaldo` implementa `AdaptadorLlm` envolviendo dos adaptadores: el principal (`LLM_MODELO`, `claude-opus-5-5`) y el de respaldo (`LLM_MODELO_RESPALDO`, `claude-sonnet-5-5`). Ante timeout, límite, no disponible o rechazo, el mismo turno se reintenta con el respaldo. Ante clave inválida o solicitud inválida no se reintenta, porque fallaría igual. Se compone en `src/server.ts`.

## Consecuencias

- **Positivas:** el ciclo no cambia; el respaldo es configurable; si ambos fallan, el usuario recibe un error claro y la sesión sigue viva; las herramientas deterministas y `demo.ts` funcionan sin modelo.
- **Negativas:** el respaldo puede orquestar con algo menos de calidad; un turno fallido puede tardar más (dos intentos), acotado por el plazo máximo del turno.

## Alternativas consideradas

- Un solo modelo: más simple, sin resiliencia.
- Otro proveedor como respaldo: más independencia, pero requiere otra clave y otro adaptador; queda como mejora.
