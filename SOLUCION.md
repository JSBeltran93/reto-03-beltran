# SOLUCIÓN — Reto 03 "Órdenes de Compra SAP"

Agente conversacional que lee el paquete de una solicitud de compra, lo valida contra los maestros y los controles RC1–RC10, muestra la orden de compra (OC) tal como quedaría en SAP, genera la evidencia de aprobación y crea la OC en un SAP simulado solo cuando corresponde.

---

## 1. Problema en una frase

La analista administrativa digita a mano cada OC en SAP y valida de memoria quién puede aprobar qué monto en qué centro de costo, mientras la dirección no puede medir cuántas OC se crean después de la factura. Les duele a la **analista** (tiempo y errores que se corrigen en el cierre contable), a **contabilidad/auditoría** (controles no sistemáticos) y a la **dirección** (desvío de proceso sin medición).

## 2. Arquitectura

Capas con **puertos y adaptadores** alrededor de un dominio puro ([ADR-0001](documentacion/decisiones/0001-puertos-y-adaptadores.md)).

```
 web/ (React + Tailwind + TanStack Query + axios)  ──HTTP JSON (contratos zod compartidos)──▶  src/server.ts  crearAplicacion (Express: /api/chat · /api/sessions/:id · /api/health)
                                                                        │
                                                                        ▼
                                              src/agente/  ciclo · confirmacion · sesiones · registro-herramientas · bitacora
                                                 │ puerto LLM                       │ catálogo oc_<export>
                                                 ▼                                  ▼
                                   src/llm/adapter.ts (AdaptadorLlm) ◀── anthropic.ts      src/tools/oc.ts  (5 herramientas del PRD)
                                                                                    │
                                                                                    ▼
                                                     src/tools/oc/  esquemas · extractores · reglas (RC1–RC10) · validacion ·
                                                                    payload · evidencia · crear-orden · registro-control
                                                                                    │ puerto SAP
                                                                                    ▼
                                                                    src/sap/adapter.ts ◀── mock.ts
                        fixtures/reto-03 (solo lectura)                         out/ (control.csv, log.jsonl, sap/ordenes.jsonl, <caso>/…)
```

| Pieza                                 | Dónde vive                                                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Comportamiento** (system prompt)    | `agent/prompt.md`                                                                                                      |
| **Conocimiento** del proceso          | `src/knowledge/ordenes-compra.md`                                                                                      |
| **Ejecución** (herramientas y reglas) | `src/tools/oc.ts` + `src/tools/oc/`                                                                                    |
| Raíz de composición                   | `src/server.ts` (`crearAplicacion` y punto de entrada: único lugar que conoce Anthropic y el sistema de archivos real) |

El dominio no importa Express, el SDK ni el ciclo del agente; por eso `demo.ts` y más de 120 tests corren sin clave.

## 3. Ciclo del agente

`src/agente/ciclo.ts` (`ejecutarTurno`), bucle manual de tool use:

1. Registra el mensaje del usuario y actualiza la **compuerta de confirmación**: si había un caso pendiente y el mensaje es afirmativo ("confirmo", "sí, procede"…), queda otorgado solo para ese caso y ese turno.
2. Envía la conversación al puerto LLM (`enviar`) con las 5 herramientas descritas en JSON Schema (derivado de los mismos esquemas zod).
3. Por cada llamada: la compuerta autoriza; el registro **valida los argumentos con zod antes de ejecutar** (si fallan, el error vuelve al modelo); se ejecuta la herramienta, se registra en `out/log.jsonl` y en el historial visible. Las llamadas paralelas vuelven en un solo mensaje.
4. Repite hasta respuesta final.

| Regla                      | Implementación                                                                                                                                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA1 tope de iteraciones    | `MAX_ITERACIONES` (25). Al alcanzarlo, una última llamada **sin herramientas** pide al modelo resumir lo hecho y lo pendiente.                                                                                                                                         |
| CA2 sin valores inventados | El prompt lo prohíbe y el diseño lo hace innecesario: `oc_validar` y `oc_crear` recalculan todo desde los documentos del caso ([ADR-0003](documentacion/decisiones/0003-revalidacion-en-servidor.md)).                                                                 |
| CA3 confirmación humana    | Aplicada **en el ciclo**: `oc_crear` con `confirmado: true` sin confirmación del usuario devuelve `CONFIRMACION_NO_OTORGADA` ([ADR-0002](documentacion/decisiones/0002-confirmacion-en-el-ciclo.md)). `needsConfirmation` sale de ese estado, no del texto del modelo. |
| CA4 trazabilidad           | Cada llamada en el chat (tarjeta con nombre, argumentos y resumen) y en `out/log.jsonl`.                                                                                                                                                                               |
| CA5 errores claros         | Timeouts, límites y fallas del proveedor se traducen a mensajes en español; la sesión sigue viva.                                                                                                                                                                      |
| Costo                      | Tope de tokens por sesión (`MAX_TOKENS_SESION`) y tope diario global (`MAX_TOKENS_DIA`) para que el link público no agote la clave.                                                                                                                                    |

## 4. Elección del modelo

- **Proveedor y modelo:** Anthropic `claude-opus-5-5`, esfuerzo `low`, `tool_choice: auto`, caché de prompt en el system prompt y las herramientas ([ADR-0005](documentacion/decisiones/0005-eleccion-del-modelo.md)).
- **Por qué:** las decisiones de negocio son deterministas y viven en código; el modelo solo orquesta herramientas, explica y pregunta. Importa la fiabilidad en tool use más que el razonamiento profundo, por eso esfuerzo bajo.
- **Costo estimado por caso procesado:** ~5–6 llamadas al modelo, ~40 K tokens de entrada acumulados y ~3 K de salida. A USD 4 / USD 20 por millón: **≈ USD 0,22 sin caché y ≈ USD 0,10 con caché del prefijo**. A 40 OC al mes son menos de USD 10, frente a horas de digitación.
- **Cambio de modelo:** variable `LLM_MODELO`. Sonnet 5.5 o Haiku 5.5 son candidatos para bajar el costo después de medir los 6 casos; cambiar de proveedor es un nuevo adaptador del puerto `AdaptadorLlm`.

## 5. Matriz de controles

Cada regla es un objeto `{id, tipo, evaluar}` en `REGLAS` (`src/tools/oc/reglas.ts`); agregar una regla no toca el motor.

| Regla | Tipo                    | Implementación                                                                                                                                                                                  | Casos                                        |
| ----- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| RC1   | Bloqueo                 | Busca por NIT normalizado (sin puntos ni dígito de verificación); sin NIT, por nombre normalizado (sin tildes, puntuación ni sufijo S.A.S./Ltda./S.A.). Ambigüedad o inactivo también bloquean. | sol-002 bloquea; sol-006 resuelve por nombre |
| RC2   | Bloqueo                 | Aprobación presente, con "Aprobado" como palabra (no "desaprobado" ni "no aprobado") y enviada por un aprobador del centro.                                                                     | sol-003                                      |
| RC3   | Bloqueo                 | `valor_total ≤ tope` del aprobador **en ese centro**; si no es aprobador del centro, no tiene tope. Sugiere quién sí cubre el monto o escalar.                                                  | sol-003                                      |
| RC4   | Bloqueo                 | Subárea dentro del centro; centro inexistente también bloquea.                                                                                                                                  | Prueba sintética                             |
| RC5   | Confirmación            | Diferencia relativa > 2 % o sin cotización; reporta **ambos valores** y el porcentaje.                                                                                                          | sol-004 (6 %)                                |
| RC6   | Confirmación + derivado | Sin IVA → `indicador_iva_default` del proveedor.                                                                                                                                                | sol-006 → C1                                 |
| RC7   | Derivado                | Sin condiciones de pago → las del proveedor; solo informa.                                                                                                                                      | sol-006 → Z030                               |
| RC8   | Confirmación            | Factura anterior a la solicitud → `retroactiva = true` y marca en `out/control.csv`.                                                                                                            | sol-005                                      |
| RC9   | Confirmación            | Aprobación anterior a la solicitud (por día calendario de su propia zona horaria).                                                                                                              | Prueba sintética                             |
| RC10  | Bloqueo                 | `                                                                                                                                                                                               | cantidad × valor_unitario − valor_total      | > 1`. | Prueba sintética |

Resultado sobre los fixtures (verificado por `demo.ts` y `pruebas/matriz-resultados.test.ts`):

| Caso    | Objetivo | Resultado                                                                                                                                                                      |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| sol-001 | O1       | OC `4500000001` sin intervención; segunda ejecución devuelve el mismo número (idempotente)                                                                                     |
| sol-002 | O2       | Sin OC (RC1) → "Solicitar la creación del proveedor en SAP…"                                                                                                                   |
| sol-003 | O2       | Sin OC (RC2, RC3) → "fvargas aprueba en CC-3030 Comercial (tope 80.000.000): verificar si el gasto corresponde a ese centro. Para CC-2020 aprueban: rtorres (tope 30.000.000)" |
| sol-004 | O3       | Pide confirmación (26.500.000 vs 25.000.000, 6 %); tras confirmar, OC `4500000002`                                                                                             |
| sol-005 | O4       | Pide confirmación (retroactiva); tras confirmar, OC `4500000003` con `retroactiva=true` en control                                                                             |
| sol-006 | O3       | Pide confirmación del IVA derivado C1; condiciones Z030 derivadas                                                                                                              |

**La más difícil:** RC2/RC3. No basta con decir "no autorizado": la acción sugerida debe ayudar a la analista. Por eso la regla cruza el maestro para decir dónde sí aprueba esa persona y quién cubre el monto en el centro solicitado. En sol-003 eso revela que probablemente el centro de costo está mal (la aprobación menciona "preventa").

## 6. Diseño del adaptador SAP real

**Opción elegida, condicionada a la viabilidad:**

1. **S/4HANA → OData `API_PURCHASEORDER_PROCESS_SRV`** (creación con _deep insert_ de cabecera, posiciones y asignación contable). Es REST, documentada, con CSRF token y validaciones estándar.
2. **ECC → `BAPI_PO_CREATE1`** expuesta por **SAP Integration Suite** (o un conector RFC) como servicio REST interno; el agente nunca habla RFC directamente.
3. **Plan B (si la conexión no es viable):** el mismo payload validado se exporta como **archivo de carga masiva** (CSV/LSMW) y como **"OC lista para pegar"** campo a campo en SAP GUI. Se conserva toda la validación, la trazabilidad y el registro de control; solo cambia el último paso.

La interfaz `SapAdapter` no cambia: se agrega `src/sap/odata.ts` (o `bapi.ts`) que implementa `SapAdapter` y se cablea en `src/server.ts`.

**Mapeo del payload (OData):**

| Payload (PRD §7.4)                  | API_PURCHASEORDER_PROCESS_SRV                                                                                                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sociedad` / `organizacion_compras` | `CompanyCode` / `PurchasingOrganization`                                                                                                                                    |
| `proveedor.codigo_sap`              | `Supplier`                                                                                                                                                                  |
| `moneda`                            | `DocumentCurrency`                                                                                                                                                          |
| `condiciones_pago`                  | `PaymentTerms`                                                                                                                                                              |
| `posiciones[].numero`               | `PurchaseOrderItem` (10, 20…)                                                                                                                                               |
| `posiciones[].descripcion`          | `PurchaseOrderItemText` (40 caracteres; el texto completo va en el texto largo de posición)                                                                                 |
| `cantidad` / `unidad`               | `OrderQuantity` / `PurchaseOrderQuantityUnit`                                                                                                                               |
| `precio_unitario`                   | `NetPriceAmount` — **convertido a neto**: los valores de la solicitud vienen **IVA incluido**, y con `TaxCode` C1 SAP sumaría el IVA de nuevo. `neto = precio / (1 + tasa)` |
| `indicador_iva`                     | `TaxCode`                                                                                                                                                                   |
| `centro_costo` / `subarea`          | `to_AccountAssignment.CostCenter` / campo de imputación acordado con contabilidad                                                                                           |
| `referencia.solicitud_id`           | Campo de referencia (p. ej. `PurchaseOrderNote` o un campo Z) para idempotencia                                                                                             |
| `aprobador.evidencia_sha256` + PDF  | Adjunto vía _Attachment Service_ (GOS)                                                                                                                                      |

**Autenticación y credenciales:** usuario técnico de comunicación con mínimo privilegio (crear OC en la sociedad 1000), OAuth 2.0 client credentials o certificado X.509 a través de Integration Suite. Las credenciales viven en el gestor de secretos del hosting (variables cifradas), **nunca** en el agente, el prompt, el repositorio ni los logs.

**Idempotencia y errores parciales:**

- Antes de crear, `buscarOrdenPorReferencia(solicitud_id)` consulta SAP; si existe, devuelve el número (como hoy en el simulador).
- Reintentos con espera creciente solo para errores transitorios (timeouts, 5xx), siempre precedidos de la búsqueda por referencia.
- Si SAP crea la cabecera pero falla una posición o el adjunto, la OC queda en estado `pendiente_conciliacion` en `control.csv`, se reintenta solo el paso faltante y se avisa a la analista; nunca se crea una segunda OC.

## 7. Lectura del proceso: las OC retroactivas

Una OC creada después de la factura deja de ser un control preventivo y se vuelve un registro _a posteriori_: el gasto ya ocurrió sin validar proveedor, tope ni cotización. En sol-005 la factura es del 10 de agosto y la solicitud del 27: la compra se hizo antes de pedirla. Además, en ese mismo caso **la solicitante parece ser la misma analista que crea la OC** (el correo dice "Hola Camila" y lo envía Camila Ortiz), lo que rompe la segregación de funciones. En sol-004 el líder aprobó "por 25 millones" frente a una cotización de 26,5 millones: si se paga lo cotizado, el exceso no está aprobado.

**Qué le diría a la dirección:**

1. **Medir antes de decidir:** `out/control.csv` ya registra cada intento con `retroactiva`. Propongo un indicador mensual: % de OC retroactivas y monto asociado, por centro de costo y solicitante.
2. **Política "sin OC no hay pago"**, con una vía de excepción explícita: una OC retroactiva requiere la aprobación de un nivel superior al líder habitual y queda marcada.
3. **Segregación de funciones:** quien solicita no crea su propia OC; el agente puede detectarlo comparando solicitante y analista.
4. **Aprobación por monto exacto:** la aprobación debe cubrir el valor a pagar (cotización), no solo el estimado de la solicitud.

## 8. Decisiones y trade-offs

| Decisión                                                                                                                                           | Alternativa descartada                      | Por qué                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Puertos y adaptadores con dominio puro ([ADR-0001](documentacion/decisiones/0001-puertos-y-adaptadores.md))                                        | Todo en `server.ts`                         | Probar reglas y ciclo sin HTTP ni clave; cambiar proveedor o SAP sin tocar el ciclo                   |
| Confirmación aplicada en el ciclo ([ADR-0002](documentacion/decisiones/0002-confirmacion-en-el-ciclo.md))                                          | Solo instrucción en el prompt               | Verificable y resistente a errores del modelo o a inyección de instrucciones en los documentos        |
| Revalidación desde los documentos y huella del payload, `PAYLOAD_ALTERADO` ([ADR-0003](documentacion/decisiones/0003-revalidacion-en-servidor.md)) | Confiar en `paquete` y `payload` del modelo | Mitiga el riesgo del PRD §10 sin cambiar el contrato                                                  |
| Bucle manual de tool use                                                                                                                           | Tool runner del SDK                         | El PRD evalúa el ciclo; control explícito de CA1–CA5                                                  |
| Node 22 + Express 5 + React 19 + Tailwind ([ADR-0004](documentacion/decisiones/0004-tecnologias-node-express-react.md))                            | Bun; HTML plano                             | Hosting estándar, testabilidad (supertest, Testing Library), componentes accesibles                   |
| TanStack Query + axios en el front                                                                                                                 | `fetch` con un reducer propio               | Estados de carga y error, reintentos y caché declarativos; cliente HTTP con instancia e interceptores |
| Español en todo el código salvo los nombres que fija el PRD                                                                                        | Identificadores en inglés                   | Alineación literal con el PRD (dominio, contratos y estructura)                                       |
| Constantes centralizadas (rutas de `out/`, nombres de herramientas, topes)                                                                         | Cadenas y números repetidos                 | Sin _magic strings_ ni _magic numbers_; un solo lugar para cambiar                                    |
| TypeScript 6 y ESLint 9                                                                                                                            | TypeScript 7 / ESLint 10 / oxlint           | `typescript-eslint` y `jsx-a11y` aún no los soportan; se priorizó lint con tipos y accesibilidad      |
| tsx en producción                                                                                                                                  | Compilar el backend                         | Sin paso de build; el riesgo de arranque lo cubre el health check                                     |
| Sesiones en memoria con topes                                                                                                                      | Base de datos                               | No-objetivo del PRD; se documenta el riesgo                                                           |

**Dependencias:** `express` (HTTP), `zod` (contratos y validación, obligatorio), `@anthropic-ai/sdk` (modelo), `pdf-lib` (evidencia PDF, P1), `tsx` (ejecutar TypeScript), `react` + `react-dom` + `@tanstack/react-query` + `axios` + `react-markdown` + `remark-gfm` (front, datos remotos y tablas), `tailwindcss` (estilos); en desarrollo: TypeScript, Vite, Vitest, Testing Library, supertest, ESLint (+ typescript-eslint, react-hooks, jsx-a11y, simple-import-sort), Prettier, Husky, lint-staged, commitlint, concurrently.

## 9. Supuestos

1. La sección 10 citada como rúbrica es "Riesgos, supuestos y preguntas abiertas" y no contiene puntaje; se priorizó lo que el PRD declara evaluado (§6).
2. Con Node, el equivalente de `bun run demo.ts` es `npm run demo`.
3. "Ausente" (HU-1) = adjunto declarado en `correo.adjuntos` sin su archivo normalizado; la solicitud, la cotización y la aprobación siempre se esperan; la factura solo si se declara.
4. "Cada intento" en `control.csv` (HU-5): `oc_crear` registra creada, idempotente y pendiente; `oc_validar` registra bloqueada, porque un caso bloqueado no puede construir un payload válido.
5. RC3 se evalúa contra el tope del aprobador en el centro de la solicitud; un aprobador ajeno al centro no tiene tope.
6. Fechas comparadas por día calendario en la zona horaria del propio documento.
7. `precio_unitario` del payload = `valor_unitario` de la solicitud (IVA incluido); la conversión a neto pertenece al adaptador SAP real (§6).
8. La descripción se recorta a 40 caracteres por palabra con "…" y el texto completo queda en `trazabilidad.json`.
9. La unidad se infiere: "hora(s)" → `H`, "mensual/por mes" → `MES`, si no `UN` ("12 meses" de vigencia de una licencia no es una unidad mensual).
10. `confirmado_por` = `sesion:<sessionId>` (no hay autenticación, PRD §3.2).
11. `faltantes` y los campos `aviso`, `informativos`, `ruta_evidencia`, `ruta_pdf` y `ruta_trazabilidad` son extensiones; los campos del contrato del PRD se mantienen literales.
12. Un mensaje afirmativo solo confirma el caso pendiente y solo en el turno inmediato.

## 10. Cobertura

| Historia             | Estado          | Nota                                                                                                            |
| -------------------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| HU-1 Leer el paquete | Hecho           | Ausentes → `null` + `faltantes`; JSON roto o monto no numérico → error legible                                  |
| HU-2 Validar         | Hecho           | RC1–RC10, derivados informados                                                                                  |
| HU-3 Payload         | Hecho           | Esquema zod del PRD y `out/<caso>/trazabilidad.json`                                                            |
| HU-4 Evidencia       | Hecho (P0 y P1) | `aprobacion.txt` con sha256 y `aprobacion.pdf`                                                                  |
| HU-5 Crear OC        | Hecho           | 4500000001+, `ordenes.jsonl`, idempotencia, fila por intento                                                    |
| HU-6 Errores         | Hecho           | Catálogo de códigos y mensajes con acción sugerida                                                              |
| `oc_leer_excel` (P1) | No hecho        | Los fixtures traen la solicitud como JSON                                                                       |
| Bonus `modulo/`      | Hecho           | `modulo/agent.md`, `modulo/tools/oc.ts` (re-exporta `src/tools/oc.ts`) y `modulo/skill/ordenes-compra/SKILL.md` |

**Para producción falta:** lectura de Excel/PDF reales y del buzón, autenticación y roles, persistencia de sesiones y del control en base de datos, adaptador SAP real, firma digital de la aprobación, monitoreo de costo por modelo y alertas.

## 11. Uso de IA

Se usó **Claude Code (Claude Opus 5.5)** para analizar los retos, planear, armar el proyecto por comandos, escribir código, tests y documentación. Detalle de tareas, qué se aceptó y qué se descartó en [`documentacion/uso-ia.md`](documentacion/uso-ia.md). Lo más relevante descartado: un primer plan que imponía stack y API distintos al PRD; oxlint (sin reglas con tipos); TypeScript 7 y ESLint 10 (incompatibles con el lint con tipos y de accesibilidad); y una versión intermedia con identificadores en inglés, alineada después al PRD (español salvo los nombres que el PRD fija) con el historial rehecho.

## 12. Riesgos y mitigación

| Riesgo                                                         | Mitigación                                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Inyección de instrucciones en correos, cotizaciones o facturas | Los documentos son datos; las decisiones las toman reglas en código; la confirmación se exige en el ciclo; el payload se revalida |
| Maestros desactualizados (proveedores, topes de aprobadores)   | Consultar SAP en tiempo real (`consultarProveedor`) y versionar la matriz de aprobación con un dueño del dato                     |
| "Aprobado" en texto libre es evidencia débil                   | Firma digital o aprobación dentro de un flujo con identidad verificable; hash SHA-256 de la evidencia                             |
| Costo del modelo en un link público                            | Topes por sesión y diarios, límite de gasto en la consola, modelo configurable                                                    |
| `out/` efímero en el hosting                                   | Persistir control y órdenes en base de datos en producción                                                                        |
| Conexión a SAP no viable                                       | Plan B de archivo de carga y "OC lista para pegar" sin perder validación                                                          |
| Error del modelo al orquestar                                  | Tope de iteraciones, validación zod de argumentos, errores devueltos al modelo, tests con LLM falso                               |
