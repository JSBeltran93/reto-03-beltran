# Guía de contribución

Guía de desarrollo del agente de órdenes de compra (Reto 03).

## Preparación

```bash
nvm use                # Node 22 (ver .nvmrc)
npm install            # instala la raíz y el workspace web/; configura los hooks de git
cp .env.example .env   # pegar GEMINI_API_KEY (https://aistudio.google.com/apikey) para usar el chat
git config commit.template .gitmessage   # plantilla de mensajes de commit
npm run dev            # back (tsx watch) + front (Vite) con un solo comando
```

`npm run demo` y `npm test` nunca llaman al modelo y no necesitan clave.

## Organización del proyecto

| Ruta                              | Responsabilidad                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `agent/prompt.md`                 | Comportamiento del agente (system prompt)                                                                 |
| `src/knowledge/ordenes-compra.md` | Conocimiento del proceso que se agrega al prompt                                                          |
| `src/tools/oc.ts`                 | Las seis herramientas `oc_*` (contrato del PRD §6.2)                                                      |
| `src/tools/oc/`                   | Dominio puro: esquemas, extractores, reglas RC1–RC10, validación, payload, evidencia, registro de control |
| `src/sap/`                        | Puerto `SapAdapter` y simulador `SapSimulado`                                                             |
| `src/llm/`                        | Puerto `AdaptadorLlm`, `AdaptadorGemini`, el adaptador de respaldo y la fábrica que los compone           |
| `src/agente/`                     | Ciclo del agente, compuerta de confirmación, sesiones, registro de herramientas, bitácora                 |
| `src/comun/`                      | Resultado, catálogo de errores, reloj, registrador, huella, contratos de la API, rutas de `out/`          |
| `src/server.ts`                   | API HTTP (`crearAplicacion`) y raíz de composición                                                        |
| `web/`                            | Front chat primero en React (TanStack Query + axios); sus tests van junto a cada componente               |
| `pruebas/`                        | Tests del back; `pruebas/dobles/` contiene el LLM falso                                                   |

Reglas de dependencia: el dominio (`src/tools/oc/`) nunca importa el ciclo del agente, el adaptador LLM ni Express. `src/server.ts` es el único lugar que compone las implementaciones reales (el modelo, a través de `src/llm/fabrica.ts`).

## Idioma

- **Todo en español**: identificadores, archivos y carpetas propios, códigos de error, variables de entorno, JSDoc, tests y documentación.
- **Excepción**: los nombres que el PRD fija en inglés se usan literalmente: archivos de su estructura sugerida (`server.ts`, `llm/adapter.ts`, `sap/adapter.ts`, `sap/mock.ts`, `tools/`, `knowledge/`, `agent/`, `web/`, `demo.ts`) y los términos de sus contratos (`description`, `args`, `execute`, `ctx.directory`, `sessionId`, `reply`, `toolCalls`, `needsConfirmation`, `ok`, `data`, `error`, `provider`, `model`).
- **Mensajes de commit en inglés** (Conventional Commits).
- Lista cerrada completa de nombres en inglés permitidos en [`CLAUDE.md`](CLAUDE.md) (§ Idioma); cualquier otro nombre en inglés es un error.

## Ramas

- `main` solo recibe el pull request final desde `develop`. Nunca se commitea directo.
- `develop` es la rama de integración y la fuente del despliegue.
- Se trabaja en una rama por bloque: `chore/*`, `feature/*`, `docs/*`. Se integra a `develop` con `git merge --no-ff`; el push se hace solo cuando todo funciona en local.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) en inglés, validados por commitlint:

```
type(scope): imperative subject, max 72 chars

Why the change is needed and what it does.

Refs: PRD §x.y
```

Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`, `build`.
Alcances: `oc`, `sap`, `llm`, `agente`, `comun`, `api`, `web`, `docs`, `deps`, `ci`, `test`.
Commits atómicos: el código y sus tests juntos; la documentación en su propio commit `docs`.

## Controles de calidad

| Cuándo                      | Qué se ejecuta                                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `git commit`                | lint-staged (`eslint --fix` + `prettier`) sobre los archivos preparados y commitlint sobre el mensaje |
| `git push`                  | `npm run typecheck && npm test`                                                                       |
| CI (GitHub Actions)         | formato, lint, tipos, tests, demo, build y `npm audit`                                                |
| Antes de integrar un bloque | `npm run check`                                                                                       |

Nunca se omiten los hooks con `--no-verify`.

## Estándares de código

- TypeScript `strict` + `noUncheckedIndexedAccess`; prohibido `any` (se usa `unknown` + zod en los bordes).
- Funciones de máximo 40 líneas, complejidad ≤ 10 y ≤ 4 parámetros (más allá, un objeto de opciones).
- Sin _magic strings_ ni _magic numbers_: tolerancias, topes, rutas de `out/` y nombres de herramientas viven en módulos de constantes (`src/tools/oc/constantes.ts`, `src/comun/rutas.ts`, `src/tools/oc/nombres.ts`).
- Los errores de dominio son valores: `Resultado<T>` con códigos de `src/comun/errores.ts`. Las herramientas nunca lanzan.
- Todo lo exportado lleva JSDoc en español (`@param`, `@returns`, `@throws`).
- Registros solo a través de `src/comun/registrador.ts`; nunca se registran secretos.

## Pruebas

- Vitest con patrón Preparar-Actuar-Verificar; reglas en tablas (`it.each`).
- Los tests no imprimen nada: `no-console` es error también en tests.
- Nunca se llama al modelo real: se usa el LLM falso de `pruebas/dobles/`.
- Los archivos que escriben los tests van a un directorio temporal (`fs.mkdtemp`), nunca a `out/`.
- Front: Testing Library consultando por rol y texto accesible.

## Cómo agregar una regla de control

1. Agregar un objeto `Regla` (`id`, `tipo`, `evaluar`) a `REGLAS` en `src/tools/oc/reglas.ts`.
2. Agregar casos que cumplen y que fallan en `pruebas/tools/oc/reglas.test.ts`.
3. Si cambia el resultado esperado de un caso de los fixtures, actualizar el test de la matriz de resultados.
4. Documentarla en `src/knowledge/ordenes-compra.md` y en la matriz de controles de `SOLUCION.md`.

No hace falta tocar el servidor, el ciclo del agente ni el front.

## Cómo cambiar de proveedor LLM

1. Implementar `AdaptadorLlm` de `src/llm/adapter.ts` en un archivo nuevo dentro de `src/llm/`.
2. Componerlo en `src/llm/fabrica.ts` (`crearAdaptadoresLlm`) y ajustar la clave en `src/configuracion.ts` y `.env.example`.
3. El ciclo del agente, las herramientas y el front no cambian.

## Cómo registrar una decisión

Cada decisión de arquitectura se agrega como una fila en la tabla de `SOLUCION.md` §8: la decisión, la alternativa descartada y por qué.

## Definición de hecho

- `npm run check` pasa sin avisos.
- Los contratos del PRD siguen intactos (herramientas, API, `Paquete`, `OrdenCompra`, `SapAdapter`, `control.csv`).
- El código nuevo exportado está documentado y probado.
- El trabajo asistido por IA queda registrado en `SOLUCION.md` §11.
