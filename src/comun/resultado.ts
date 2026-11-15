import { z } from "zod";

import type { CodigoError } from "./errores";

/** Error de dominio devuelto como valor en lugar de lanzarse. */
export interface ErrorDominio {
  /** Código estable del catálogo. */
  readonly codigo: CodigoError;
  /** Mensaje legible para el usuario. */
  readonly mensaje: string;
  /** Siguiente paso sugerido, si aplica. */
  readonly accion_sugerida?: string;
}

/** Éxito o fallo de una operación de dominio; las herramientas nunca lanzan (PRD §6.2). */
export type Resultado<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ErrorDominio };

/**
 * Envuelve un valor exitoso.
 * @param data - valor producido por la operación
 * @returns resultado exitoso
 */
export function exito<T>(data: T): Resultado<T> {
  return { ok: true, data };
}

/**
 * Construye un resultado fallido.
 * @param codigo - código del catálogo
 * @param mensaje - mensaje legible para el usuario
 * @param accionSugerida - siguiente paso sugerido (opcional)
 * @returns resultado fallido con el error de dominio
 */
export function fallo<T = never>(
  codigo: CodigoError,
  mensaje: string,
  accionSugerida?: string,
): Resultado<T> {
  const error: ErrorDominio =
    accionSugerida === undefined
      ? { codigo, mensaje }
      : { codigo, mensaje, accion_sugerida: accionSugerida };
  return { ok: false, error };
}

/** Esquema del resultado serializado que devuelve toda herramienta (`{ ok, data }` o `{ ok: false, error }`). */
export const EsquemaResultadoSerializado = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({ codigo: z.string(), mensaje: z.string() }).optional(),
});
