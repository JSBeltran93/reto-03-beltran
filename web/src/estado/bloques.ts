import type { EntradaHistorial, VistaLlamada } from "@contratos/contratos-api";

/** Bloque visual del historial: un mensaje o la línea de tiempo de las herramientas de un turno. */
export type Bloque =
  | {
      readonly tipo: "entrada";
      readonly entrada: Exclude<EntradaHistorial, { tipo: "herramienta" }>;
    }
  | { readonly tipo: "pasos"; readonly llamadas: readonly VistaLlamada[] };

/**
 * Agrupa las llamadas consecutivas en una sola línea de tiempo por turno.
 * @param entradas - historial
 * @returns bloques en orden
 */
export function agruparEnBloques(entradas: readonly EntradaHistorial[]): Bloque[] {
  const bloques: Bloque[] = [];
  for (const entrada of entradas) {
    const ultimo = bloques.at(-1);
    if (entrada.tipo !== "herramienta") {
      bloques.push({ tipo: "entrada", entrada });
    } else if (ultimo?.tipo === "pasos") {
      bloques[bloques.length - 1] = {
        tipo: "pasos",
        llamadas: [...ultimo.llamadas, entrada.llamada],
      };
    } else {
      bloques.push({ tipo: "pasos", llamadas: [entrada.llamada] });
    }
  }
  return bloques;
}
