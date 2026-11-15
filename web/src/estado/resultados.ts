import type { EntradaHistorial, VistaLlamada } from "@contratos/contratos-api";
import { z } from "zod";

import { HERRAMIENTAS } from "./herramientas";

/** Hallazgo de una regla de control (forma que devuelve `oc_validar`). */
export const EsquemaHallazgo = z.object({
  regla: z.string(),
  tipo: z.enum(["bloqueo", "confirmacion", "derivado"]),
  detalle: z.string(),
  valores: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  accion_sugerida: z.string().optional(),
});
/** Hallazgo de una regla de control. */
export type Hallazgo = z.infer<typeof EsquemaHallazgo>;

/** Datos de `oc_validar` que se dibujan como fichas de controles. */
export const EsquemaDatosValidacion = z.object({
  apta: z.boolean(),
  bloqueos: z.array(EsquemaHallazgo),
  confirmaciones: z.array(EsquemaHallazgo),
  informativos: z.array(EsquemaHallazgo).optional(),
  retroactiva: z.boolean(),
});
/** Datos de `oc_validar`. */
export type DatosValidacion = z.infer<typeof EsquemaDatosValidacion>;

const EsquemaOrdenVista = z.object({
  proveedor: z.object({ codigo_sap: z.string(), nit: z.string(), nombre: z.string() }),
  moneda: z.string(),
  condiciones_pago: z.string(),
  aprobador: z.object({ email: z.string() }),
  posiciones: z
    .array(
      z.object({
        descripcion: z.string(),
        cantidad: z.number(),
        unidad: z.string(),
        precio_unitario: z.number(),
        centro_costo: z.string(),
        subarea: z.string(),
        indicador_iva: z.string(),
      }),
    )
    .min(1),
});

/** Datos de `oc_construir_payload` que se dibujan como tabla de la OC. */
export const EsquemaDatosPayload = z.object({ orden: EsquemaOrdenVista });
/** Datos de `oc_construir_payload`. */
export type DatosPayload = z.infer<typeof EsquemaDatosPayload>;

/** Datos de `oc_crear` que se dibujan como tarjeta de éxito. */
export const EsquemaDatosCreacion = z.object({
  numero_oc: z.string(),
  fecha: z.string(),
  idempotente: z.boolean(),
  ruta_evidencia: z.string().optional(),
});
/** Datos de `oc_crear`. */
export type DatosCreacion = z.infer<typeof EsquemaDatosCreacion>;

/** Resultado enriquecido de una llamada, listo para dibujar. */
export type ResultadoRico =
  | { readonly tipo: "validacion"; readonly datos: DatosValidacion }
  | { readonly tipo: "payload"; readonly datos: DatosPayload }
  | { readonly tipo: "creacion"; readonly datos: DatosCreacion };

/**
 * Datos del resultado de una llamada, si el servidor los envía (`datos` es opcional
 * en el contrato; sin ellos la interfaz muestra solo el resumen).
 * @param llamada - llamada a herramienta
 * @returns los datos crudos o undefined
 */
export function datosDeLlamada(llamada: VistaLlamada): unknown {
  return llamada.datos;
}

/**
 * Interpreta los datos de una llamada correcta según la herramienta (validación,
 * OC propuesta o creación); los datos que no cumplen la forma esperada se ignoran.
 * @param llamada - llamada a herramienta
 * @returns el resultado enriquecido o null
 */
export function resultadoRico(llamada: VistaLlamada): ResultadoRico | null {
  if (!llamada.ok) return null;
  const datos = datosDeLlamada(llamada);
  switch (llamada.nombre) {
    case HERRAMIENTAS.validar: {
      const validacion = EsquemaDatosValidacion.safeParse(datos);
      return validacion.success ? { tipo: "validacion", datos: validacion.data } : null;
    }
    case HERRAMIENTAS.construirPayload: {
      const payload = EsquemaDatosPayload.safeParse(datos);
      return payload.success ? { tipo: "payload", datos: payload.data } : null;
    }
    case HERRAMIENTAS.crear: {
      const creacion = EsquemaDatosCreacion.safeParse(datos);
      return creacion.success ? { tipo: "creacion", datos: creacion.data } : null;
    }
    default:
      return null;
  }
}

/**
 * Confirmaciones pendientes según la última validación correcta del historial.
 * @param entradas - historial de la conversación
 * @returns las confirmaciones (vacío si no hay datos de validación)
 */
export function confirmacionesPendientes(entradas: readonly EntradaHistorial[]): Hallazgo[] {
  for (let i = entradas.length - 1; i >= 0; i--) {
    const entrada = entradas[i];
    if (entrada?.tipo !== "herramienta" || entrada.llamada.nombre !== HERRAMIENTAS.validar) {
      continue;
    }
    const rico = resultadoRico(entrada.llamada);
    return rico?.tipo === "validacion" ? rico.datos.confirmaciones : [];
  }
  return [];
}
