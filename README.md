# Agente de Órdenes de Compra SAP — Reto 03 · Periferia IT Group

Agente conversacional que lee el paquete de una solicitud de compra (correo, solicitud, cotización, aprobación y factura), lo valida contra los maestros y los controles **RC1–RC10**, muestra la orden de compra tal como quedaría en SAP, genera la evidencia de aprobación y crea la OC en un **SAP simulado** solo cuando corresponde, pidiendo confirmación humana en las excepciones.

- **Link de prueba:** https://reto-03-beltran-production.up.railway.app — no requiere clave de acceso.
- **Planteamiento de la solución:** [`SOLUCION.md`](SOLUCION.md)
- **Guía de desarrollo:** [`CONTRIBUTING.md`](CONTRIBUTING.md) · **Decisiones:** [`documentacion/decisiones/`](documentacion/decisiones) · **Uso de IA:** [`documentacion/uso-ia.md`](documentacion/uso-ia.md)

## Requisitos

- Node.js 22 (ver `.nvmrc`) y npm.
- Una clave de Anthropic **solo** para el chat. La demo y los tests no la necesitan.

## Inicio rápido

```bash
npm install          # instala la raíz y el workspace web/; configura los hooks de git
cp .env.example .env # completar ANTHROPIC_API_KEY para usar el chat
npm run dev          # back (http://localhost:3000) + front (http://localhost:5173) con un solo comando
```

### Variables de entorno (`.env.example`)

| Variable            | Valor por defecto | Uso                                                                                                                 |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY` | —                 | Clave del modelo (solo en el backend; nunca en el front, el repo ni los logs). En Railway se configura en Variables |
| `LLM_MODELO`        | `claude-opus-5-5` | Modelo de Anthropic                                                                                                 |
| `LLM_TIMEOUT_MS`    | `60000`           | Tiempo máximo por llamada al modelo                                                                                 |
| `MAX_ITERACIONES`   | `25`              | Tope de iteraciones herramienta → modelo por turno (CA1)                                                            |
| `MAX_TOKENS_SESION` | `200000`          | Tope de tokens por sesión                                                                                           |
| `MAX_TOKENS_DIA`    | `3000000`         | Tope diario de tokens de todo el servidor                                                                           |
| `MAX_SESIONES`      | `200`             | Sesiones en memoria (se descarta la más antigua)                                                                    |
| `PORT`              | `3000`            | Puerto HTTP                                                                                                         |

## Demo sin modelo (`demo.ts`)

```bash
npm install && npm run demo
```

Procesa los 6 casos de `fixtures/reto-03/solicitudes/` llamando directamente a las herramientas, sin clave ni modelo. Resultado esperado:

| Caso    | Resultado                                                                                   |
| ------- | ------------------------------------------------------------------------------------------- |
| sol-001 | OC `4500000001`; la segunda ejecución devuelve el mismo número (idempotencia)               |
| sol-002 | Bloqueada por RC1 (proveedor inexistente) con acción sugerida                               |
| sol-003 | Bloqueada por RC2 y RC3 (aprobador sin autoridad); sugiere revisar CC-3030                  |
| sol-004 | Pide confirmación RC5 (25.000.000 vs 26.500.000, 6 %); tras confirmar, OC `4500000002`      |
| sol-005 | Pide confirmación RC8 (retroactiva); tras confirmar, OC `4500000003` con `retroactiva=true` |
| sol-006 | Queda pendiente de confirmar el IVA derivado C1 (condiciones Z030 derivadas)                |

Archivos generados en `out/`: `control.csv`, `sap/ordenes.jsonl`, `log.jsonl` (chat), `<caso>/trazabilidad.json`, `<caso>/aprobacion.txt` y `aprobacion.pdf`.

## Calidad y pruebas

| Comando                       | Qué hace                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                    | Tests del back (Vitest + supertest, LLM falso) y del front (Testing Library)                                                            |
| `npm run typecheck`           | TypeScript estricto en back y front                                                                                                     |
| `npm run lint`                | ESLint con tipos, React Hooks y accesibilidad                                                                                           |
| `npm run format`              | Prettier                                                                                                                                |
| `npm run check`               | Formato, lint, tipos y tests en orden                                                                                                   |
| `npm run build` / `npm start` | Compila el front y arranca el servidor de producción (lee las variables del entorno; en local: `npx tsx --env-file=.env src/server.ts`) |

Los hooks de git ejecutan lint y formato al commitear, validan el mensaje de commit y corren tipos y tests antes de cada push. El CI de GitHub Actions repite todo, más la demo, el build y `npm audit`.

## API

| Método | Ruta                | Cuerpo                                                                 | Respuesta                                                                                                                                                                      |
| ------ | ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST` | `/api/chat`         | `{ "sessionId": "<uuid>", "message": "Procesa la solicitud sol-004" }` | `{ "reply": "…", "toolCalls": [{ "nombre": "oc_validar", "args": {…}, "ok": true, "resumen": "apta · bloqueos: ninguna · confirmaciones: RC5" }], "needsConfirmation": true }` |
| `GET`  | `/api/sessions/:id` | —                                                                      | `{ "id": "<uuid>", "historial": [{ "tipo": "usuario", "texto": "…" }, { "tipo": "herramienta", "llamada": {…} }, …] }` (404 si no existe)                                      |
| `GET`  | `/api/health`       | —                                                                      | `{ "ok": true, "provider": "anthropic", "model": "claude-opus-5-5" }` (sin claves)                                                                                             |

Las rutas viven en `RUTAS_API` (`src/comun/contratos-api.ts`), compartidas por back y front. El `sessionId` es un UUID generado por el navegador. Un cuerpo inválido o JSON mal formado en `/api/chat` responde `400`, un cuerpo de más de 32 kb responde `413` y una ruta `/api/*` inexistente responde `404`. Los errores del modelo o de una herramienta se devuelven como mensaje claro en `reply` con `esError: true` y la sesión sigue activa. Los turnos de una misma sesión se procesan en orden (candado por sesión).

## Estructura

```
agent/prompt.md                  comportamiento del agente (system prompt)
src/
├── server.ts                    API HTTP (crearAplicacion) y raíz de composición
├── configuracion.ts             variables de entorno validadas con zod
├── agente/                      ciclo del agente, compuerta de confirmación, sesiones, bitácora
├── llm/adapter.ts · anthropic.ts  puerto AdaptadorLlm y su implementación
├── tools/oc.ts                  las 5 herramientas oc_* del PRD
├── tools/oc/                    dominio: esquemas, extractores, reglas RC1–RC10, payload, evidencia…
├── sap/adapter.ts · mock.ts     puerto SapAdapter y SAP simulado
├── comun/                       resultado, errores, reloj, registrador, huella, contratos de la API, rutas
└── knowledge/ordenes-compra.md  conocimiento del proceso
web/                             chat en React 19 + Vite + Tailwind + TanStack Query + axios
pruebas/                         tests del back (el front tiene sus tests junto a cada componente)
documentacion/                   PRD, plan, decisiones (ADR) y bitácora de uso de IA
fixtures/reto-03/                insumos del reto (solo lectura)
modulo/                          bonus: agente empaquetado para otras plataformas
demo.ts                          verificación sin modelo
```

## Bonus: módulo reutilizable (`modulo/`)

- `modulo/agent.md`: frontmatter (`description`, `mode: primary`, `permission: {edit: deny, bash: deny}`) y, como cuerpo, el contenido de `agent/prompt.md`.
- `modulo/tools/oc.ts`: re-exporta `src/tools/oc.ts`; son las mismas herramientas, no una copia.
- `modulo/skill/ordenes-compra/SKILL.md`: frontmatter (`name`, `description`) y, como cuerpo, el contenido de `src/knowledge/ordenes-compra.md`.

Los cuerpos de los `.md` son copias exactas de sus fuentes; si se edita el prompt o el conocimiento, se actualiza también la copia del módulo para que no diverjan.

> **Nota de despliegue:** en Railway el disco es efímero; `out/` (órdenes del SAP simulado, `control.csv`, bitácora) se pierde al redesplegar, por lo que la numeración y la idempotencia se reinician. En producción se usaría un volumen o una base de datos.
