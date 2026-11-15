# Agente de Órdenes de Compra SAP — Reto 03 · Periferia IT Group

[![CI](https://github.com/JSBeltran93/reto-03-beltran/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/JSBeltran93/reto-03-beltran/actions/workflows/ci.yml)

Agente conversacional que lee el paquete de una solicitud de compra, lo valida contra los maestros y los controles **RC1–RC10** y crea la orden de compra en un **SAP simulado** solo cuando corresponde, pidiendo confirmación humana en las excepciones.

El front es **chat primero**: una conversación centrada con el compositor abajo. Al abrirla, el estado vacío ofrece sugerencias clicables con las solicitudes disponibles (`GET /api/casos`); cada llamada a herramienta aparece en línea con su etiqueta, su nombre técnico, los argumentos y el resultado resumido, y la confirmación se resalta con los dos valores y los botones "Sí, crear la OC" / "No, cancelar". La lista de solicitudes queda en un panel plegable; en móvil solo se ve el chat, con un botón para abrirla.

**Link público:** https://reto-03-beltran-production.up.railway.app — no requiere clave de acceso.

## Probar en 5 minutos

En el link público (o en local con `npm run dev`, http://localhost:5173), sesión nueva:

1. Elegir la sugerencia de sol-004 en el estado vacío o pegar el prompt del PRD §11:

   ```
   Procesa la solicitud "sol-004". Muéstrame la OC como quedaría en SAP, qué
   validaciones pasó y cuáles no, y no la crees hasta que yo lo confirme.
   ```

2. Ver en línea las llamadas `oc_leer_paquete` → `oc_validar` → `oc_construir_payload` → `oc_generar_evidencia`, cada una con sus argumentos y su resultado resumido; la OC en tabla y la confirmación RC5 resaltada con los dos valores (solicitud 25.000.000 vs cotización 26.500.000, 6 %). El turno termina con una pregunta.
3. Pulsar **"Sí, crear la OC"** (o escribir "confirmo"): el agente llama `oc_crear` y responde con el número de OC y la ruta de la evidencia. "No, cancelar" descarta el caso pendiente.

Los demás casos ("Procesa la solicitud sol-00X"):

| Caso         | Qué se ve                                                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| sol-001      | OC creada sin intervención: el caso no tiene confirmaciones                                                                                 |
| sol-002      | Bloqueada por RC1 (proveedor inexistente) con la acción sugerida; no se llama `oc_crear`                                                    |
| sol-003      | Bloqueada por RC2 y RC3: el aprobador no es de CC-2020; sugiere revisar CC-3030 o escalar                                                   |
| sol-005      | Pide confirmar la OC retroactiva (factura anterior a la solicitud); tras confirmar, la OC queda con `retroactiva=true` en `out/control.csv` |
| sol-006      | Pide confirmar el IVA C1 derivado del proveedor (condiciones Z030 derivadas, solo informativas)                                             |
| Idempotencia | Pedir de nuevo sol-001: devuelve el mismo número de OC con `idempotente: true`, sin crear otra                                              |

El link usa la clave gratuita de Google AI Studio, que limita las solicitudes por minuto y el cupo diario de cada modelo. Si el modelo principal agota su cupo, responde el siguiente de `LLM_MODELO_RESPALDO`; si se agotan todos, el chat muestra un error claro y la sesión sigue viva: basta con esperar o correrlo en local con otra clave. El disco de Railway es efímero: al redesplegar se reinician los números de OC y el estado de las solicitudes.

## Inicio rápido

Requisitos: Node.js 22 (`.nvmrc`) y npm. La clave del modelo solo se necesita para el chat; es gratuita y se crea en Google AI Studio: https://aistudio.google.com/apikey.

```bash
npm install          # instala la raíz y el workspace web/; configura los hooks de git
cp .env.example .env # pegar la clave en GEMINI_API_KEY
npm run dev          # back (http://localhost:3000) + front (http://localhost:5173)
```

### Variables de entorno

| Variable                 | Por defecto                                                          | Uso                                                                                                                                |
| ------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`         | —                                                                    | Clave de Google Gemini ([AI Studio](https://aistudio.google.com/apikey)); solo en el backend (`.env` local o Variables de Railway) |
| `LLM_MODELO`             | `gemini-3.6-flash`                                                   | Modelo principal                                                                                                                   |
| `LLM_MODELO_RESPALDO`    | `gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3-flash-preview` | Modelos de respaldo (lista separada por comas, en orden) ante caída, 429, timeout o rechazo del principal                          |
| `LLM_RAZONAMIENTO`       | `bajo`                                                               | Razonamiento del modelo (`minimo`, `bajo`, `medio`, `alto`); el modelo solo orquesta: más razonamiento, más latencia               |
| `LLM_TIMEOUT_MS`         | `60000`                                                              | Tiempo máximo por llamada al modelo                                                                                                |
| `MAX_ITERACIONES`        | `25`                                                                 | Tope de iteraciones herramienta → modelo por turno (CA1)                                                                           |
| `MAX_TOKENS_SESION`      | `200000`                                                             | Tope de tokens por sesión                                                                                                          |
| `MAX_TOKENS_DIA`         | `3000000`                                                            | Tope diario de tokens del servidor                                                                                                 |
| `MAX_SESIONES`           | `200`                                                                | Sesiones en memoria (se desaloja la de uso menos reciente)                                                                         |
| `MAX_SEGUNDOS_TURNO`     | `240`                                                                | Duración máxima de un turno (el front espera hasta 270 s)                                                                          |
| `MAX_SOLICITUDES_MINUTO` | `20`                                                                 | Límite de mensajes por minuto e IP (responde 429 con `Retry-After`)                                                                |
| `PORT`                   | `3000`                                                               | Puerto HTTP (Railway lo asigna)                                                                                                    |

`.env.example` es la referencia completa. El único proveedor es Google Gemini; `GET /api/health` muestra el proveedor y el modelo en uso.

## Demo sin modelo

```bash
npm install && npm run demo
```

Procesa los 6 casos de `fixtures/reto-03/solicitudes/` llamando directamente a las herramientas, sin clave:

| Caso    | Resultado                                                                         |
| ------- | --------------------------------------------------------------------------------- |
| sol-001 | OC `4500000001`; la segunda ejecución devuelve el mismo número (idempotencia)     |
| sol-002 | Bloqueada por RC1 (proveedor inexistente) con acción sugerida                     |
| sol-003 | Bloqueada por RC2 y RC3 (aprobador sin autoridad); sugiere revisar CC-3030        |
| sol-004 | Confirmación RC5 (25.000.000 vs 26.500.000, 6 %); tras confirmar, OC `4500000002` |
| sol-005 | Confirmación RC8 (retroactiva); tras confirmar, OC `4500000003`                   |
| sol-006 | Pendiente de confirmar el IVA derivado C1 (condiciones Z030 derivadas)            |

Genera en `out/`: `control.csv`, `sap/ordenes.jsonl`, `<caso>/trazabilidad.json`, `<caso>/aprobacion.txt` y `aprobacion.pdf`.

## Calidad

| Comando                       | Qué hace                                                                    |
| ----------------------------- | --------------------------------------------------------------------------- |
| `npm test`                    | Tests del back (Vitest, supertest, LLM falso) y del front (Testing Library) |
| `npm run typecheck`           | TypeScript estricto en back y front                                         |
| `npm run lint`                | ESLint con tipos, React Hooks y accesibilidad                               |
| `npm run check`               | Formato, lint, tipos y tests en orden                                       |
| `npm run build` / `npm start` | Compila el front y arranca el servidor de producción (lee `.env` si existe) |

Hooks de git: lint y formato al commitear, mensaje validado con commitlint, tipos y tests antes del push. El CI repite todo, más la demo, el build y `npm audit`.

## API

| Método | Ruta                | Cuerpo                                      | Respuesta                                                                                                                               |
| ------ | ------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/chat`         | `{ "sessionId": "<uuid>", "message": "…" }` | `{ "reply", "toolCalls": [{ "nombre", "args", "ok", "resumen", "datos"? }], "needsConfirmation", "casoPendiente"?, "esError"? }`        |
| `GET`  | `/api/sessions/:id` | —                                           | `{ "id", "historial": [...], "needsConfirmation", "casoPendiente" }`; 404 si no existe                                                  |
| `GET`  | `/api/health`       | —                                           | `{ "ok": true, "provider", "model" }` (sin claves)                                                                                      |
| `GET`  | `/api/casos`        | —                                           | `{ "casos": [{ "caso", "solicitud_id", "descripcion", "proveedor", "valor_total", "moneda", "centro_costo", "estado", "numero_oc" }] }` |

Ejemplo de `resumen`: `"apta · bloqueos: ninguna · confirmaciones: RC5"`. `GET /api/casos` es de solo lectura y alimenta las sugerencias del estado vacío y el panel de solicitudes del front: `estado` es `sin_procesar`, `pendiente`, `bloqueada` o `creada`, según la última fila de `out/control.csv` de cada solicitud; si SAP ya tiene una orden para la solicitud, gana `creada` con su `numero_oc`. Los casos con paquete ilegible se omiten. Las rutas viven en `RUTAS_API` (`src/comun/rutas-api.ts`), compartidas por back y front. `sessionId` debe ser un UUID y `message` tener entre 1 y 4000 caracteres. Cuerpo inválido o JSON roto → `400`; cuerpo de más de 32 kb → `413`; ruta `/api/*` inexistente → `404`; más de `MAX_SOLICITUDES_MINUTO` mensajes por minuto e IP → `429` con cabecera `Retry-After`; error inesperado → `500` con un mensaje genérico (sin trazas). Los errores del modelo o de una herramienta llegan como `reply` con `esError: true` y la sesión sigue activa.

## Arquitectura

```mermaid
flowchart LR
  Web["web/ — chat React"] -->|HTTP JSON| Server["src/server.ts — API"]
  Server --> Agente["src/agente/ — ciclo y confirmación"]
  Agente --> LLM["src/llm/ — modelo principal + respaldo"]
  Agente --> Tools["src/tools/oc.ts — 6 herramientas"]
  Tools --> Dominio["src/tools/oc/ — reglas RC1–RC10, payload, evidencia"]
  Dominio --> SAP["src/sap/ — SAP simulado"]
```

## Estructura

```
agent/prompt.md                   comportamiento del agente (system prompt)
src/
├── server.ts                     API HTTP (crearAplicacion) y raíz de composición
├── configuracion.ts              variables de entorno validadas con zod
├── agente/                       ciclo, compuerta de confirmación, sesiones, bitácora
├── llm/                          puerto AdaptadorLlm, gemini.ts, respaldo.ts y fabrica.ts
├── tools/oc.ts · tools/oc/       las 6 herramientas oc_* y el dominio
├── sap/                          puerto SapAdapter y SAP simulado
├── comun/                        resultado, errores, reloj, registrador, contratos y rutas
└── knowledge/ordenes-compra.md   conocimiento del proceso
web/                              chat primero: React 19, Vite, Tailwind, TanStack Query, axios
pruebas/                          tests del back (los del front van junto a cada componente)
fixtures/reto-03/                 insumos del reto (solo lectura)
modulo/                           bonus: agente empaquetado para otras plataformas
demo.ts                           verificación sin modelo
```

## Documentación

- [`SOLUCION.md`](SOLUCION.md): planteamiento de la solución (12 secciones del PRD), incluidas las decisiones (§8) y el uso de IA.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): guía de desarrollo, ramas, commits y estándares.

## Despliegue

Railway con configuración como código (`railway.json`): build por defecto de Railpack (instala dependencias y ejecuta `npm run build`), arranque `npm start`, health check en `/api/health`. Un push a `develop` despliega; alternativa equivalente: `railway up`. La clave se configura solo en Variables de Railway. El disco es efímero: `out/` se pierde al redesplegar.

## Bonus: módulo reutilizable (`modulo/`)

- `modulo/agent.md`: frontmatter (`description`, `mode: primary`, `permission: {edit: deny, bash: deny}`) y el contenido de `agent/prompt.md`.
- `modulo/tools/oc.ts`: re-exporta solo las 6 herramientas de `src/tools/oc.ts` (las 5 P0 y `oc_leer_excel`); son las mismas, no una copia.
- `modulo/skill/ordenes-compra/SKILL.md`: frontmatter (`name`, `description`) y el contenido de `src/knowledge/ordenes-compra.md`.

`pruebas/modulo.test.ts` falla si alguna copia diverge de su fuente.

## Entrega

La rama de trabajo y despliegue es `develop`. Al entregar se integra en `main` mediante un PR `develop → main`, así que cualquiera de las dos ramas contiene la versión final.
