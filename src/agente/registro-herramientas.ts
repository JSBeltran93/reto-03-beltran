import { z } from "zod";

import type { VistaLlamada } from "../comun/contratos-api";
import type { CodigoError } from "../comun/errores";
import { EsquemaResultadoSerializado, fallo } from "../comun/resultado";
import type { HerramientaLlm, LlamadaHerramienta } from "../llm/adapter";
import { HERRAMIENTAS_OC } from "../tools/oc";
import type { ContextoHerramienta, Herramienta } from "../tools/oc/herramienta";
import { NOMBRES_HERRAMIENTAS, PREFIJO_HERRAMIENTA } from "../tools/oc/nombres";

/** Herramientas indexadas por el nombre que ve el modelo (`oc_<export>`). */
export type Catalogo = Readonly<Record<string, Herramienta<z.ZodRawShape>>>;

/** Llamada ejecutada: JSON para el modelo, vista resumida para el chat y datos si tuvo éxito. */
export interface Ejecucion {
  readonly vista: VistaLlamada;
  readonly serializado: string;
  readonly data: unknown;
}

/**
 * Arma el catálogo: cada herramienta de `src/tools/oc.ts` es `oc_<export>` (PRD §6.2).
 * @param herramientas - herramientas por nombre de export (por defecto, las del PRD)
 * @returns herramientas indexadas por el nombre que ve el modelo
 */
export function catalogoOc(herramientas: object = HERRAMIENTAS_OC): Catalogo {
  return Object.fromEntries(
    Object.entries(herramientas).map(([nombre, herramienta]) => [
      `${PREFIJO_HERRAMIENTA}${nombre}`,
      herramienta as Herramienta<z.ZodRawShape>,
    ]),
  );
}

/**
 * Describe cada herramienta en JSON Schema para el modelo.
 * @param catalogo - catálogo de herramientas
 * @returns definiciones neutrales al proveedor
 */
export function definicionesLlm(catalogo: Catalogo): HerramientaLlm[] {
  return Object.entries(catalogo).map(([nombre, herramienta]) => {
    const esquema = z.toJSONSchema(z.object(herramienta.args)) as Record<string, unknown>;
    delete esquema.$schema;
    return { nombre, descripcion: herramienta.description, esquema };
  });
}

/** Resumen de una herramienta sin resumen propio. */
const RESUMEN_GENERICO = "herramienta ejecutada";

function faltantes(lista: unknown): string {
  return Array.isArray(lista) && lista.length
    ? `paquete leído · faltan: ${lista.map(String).join(", ")}`
    : "paquete leído · completo";
}

function reglas(hallazgos: unknown): string {
  return Array.isArray(hallazgos) && hallazgos.length
    ? hallazgos.map((h) => (h as { regla: string }).regla).join(", ")
    : "ninguna";
}

type Datos = Record<string, unknown>;

/** Resumen de cada herramienta para la línea de tiempo del chat, por el nombre que ve el modelo. */
const RESUMIDORES: Readonly<Record<string, (d: Datos) => string>> = {
  [NOMBRES_HERRAMIENTAS.validar]: (d) =>
    `${d.apta ? "apta" : "no apta"} · bloqueos: ${reglas(d.bloqueos)} · confirmaciones: ${reglas(d.confirmaciones)}`,
  [NOMBRES_HERRAMIENTAS.construirPayload]: (d) =>
    `OC lista para SAP · trazabilidad en ${String(d.ruta_trazabilidad)}`,
  [NOMBRES_HERRAMIENTAS.generarEvidencia]: (d) => `evidencia en ${String(d.ruta)}`,
  [NOMBRES_HERRAMIENTAS.crear]: (d) =>
    `OC ${String(d.numero_oc)}${d.idempotente ? " (ya existía)" : ""}`,
  [NOMBRES_HERRAMIENTAS.leerPaquete]: (d) => faltantes(d.faltantes),
};

function resumir(nombre: string, data: unknown): string {
  const resumidor = RESUMIDORES[nombre];
  return resumidor ? resumidor((data ?? {}) as Datos) : RESUMEN_GENERICO;
}

/**
 * Ejecución fallida con el formato del contrato, para errores que ocurren antes o
 * alrededor de la herramienta (argumentos inválidos, excepciones inesperadas).
 * @param llamada - llamada pedida por el modelo
 * @param codigo - código del catálogo
 * @param mensaje - mensaje legible
 * @returns vista con error, JSON para el modelo y sin datos
 */
export function ejecucionFallida(
  llamada: LlamadaHerramienta,
  codigo: CodigoError,
  mensaje: string,
): Ejecucion {
  return {
    vista: {
      nombre: llamada.nombre,
      args: llamada.args,
      ok: false,
      resumen: `${codigo}: ${mensaje}`,
    },
    serializado: JSON.stringify(fallo(codigo, mensaje)),
    data: undefined,
  };
}

/**
 * Valida con zod los argumentos del modelo antes de ejecutar (PRD §6.2).
 * @param catalogo - catálogo de herramientas
 * @param llamada - llamada pedida por el modelo
 * @param ctx - contexto de ejecución
 * @returns JSON para el modelo, resumen para el chat y datos si tuvo éxito
 */
export async function ejecutarLlamada(
  catalogo: Catalogo,
  llamada: LlamadaHerramienta,
  ctx: ContextoHerramienta,
): Promise<Ejecucion> {
  const herramienta = catalogo[llamada.nombre];
  if (!herramienta)
    return ejecucionFallida(
      llamada,
      "ARGS_INVALIDOS",
      `No existe la herramienta ${llamada.nombre}.`,
    );
  const args = z.object(herramienta.args).safeParse(llamada.args);
  if (!args.success)
    return ejecucionFallida(llamada, "ARGS_INVALIDOS", z.prettifyError(args.error));
  const serializado = await herramienta.execute(args.data, ctx);
  const resultado = EsquemaResultadoSerializado.parse(JSON.parse(serializado));
  const resumen = resultado.ok
    ? resumir(llamada.nombre, resultado.data)
    : `${resultado.error?.codigo ?? "ERROR"}: ${resultado.error?.mensaje ?? ""}`;
  return {
    vista: {
      nombre: llamada.nombre,
      args: llamada.args,
      ok: resultado.ok,
      resumen,
      ...(resultado.ok && { datos: resultado.data }),
    },
    serializado,
    data: resultado.ok ? resultado.data : undefined,
  };
}
