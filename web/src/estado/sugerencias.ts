import type { ResumenCaso } from "@contratos/contratos-api";

/** Sugerencia del estado vacío: un mensaje real que se envía al agente con un clic. */
export interface PlantillaSugerencia {
  /** Caso al que se refiere (su conversación queda recordada para ese caso). */
  readonly caso: string;
  /** Texto corto que se ve en la tarjeta. */
  readonly etiqueta: string;
  /** Mensaje completo que se envía al agente. */
  readonly mensaje: string;
}

/** Sugerencia lista para mostrar, con el resumen del caso si ya se cargó. */
export interface Sugerencia extends PlantillaSugerencia {
  readonly resumen?: ResumenCaso;
}

/**
 * Sugerencias del estado vacío: cada plantilla con el resumen de su caso (descripción,
 * proveedor, monto y estado). Si las solicitudes aún no cargan o fallaron, se muestran
 * sin resumen; si ya cargaron, se omiten las de casos que no existen.
 * @param plantillas - sugerencias base
 * @param casos - solicitudes de GET /api/casos (undefined si no hay datos)
 * @returns las sugerencias a mostrar
 */
export function sugerenciasConCasos(
  plantillas: readonly PlantillaSugerencia[],
  casos: readonly ResumenCaso[] | undefined,
): Sugerencia[] {
  if (casos === undefined) return [...plantillas];
  return plantillas.flatMap((plantilla) => {
    const resumen = casos.find((c) => c.caso === plantilla.caso);
    return resumen ? [{ ...plantilla, resumen }] : [];
  });
}
