import type { Maestros, Paquete } from "../../src/tools/oc/esquemas";
import { leerMaestros } from "../../src/tools/oc/insumos";
import { leerPaquete } from "../../src/tools/oc/paquete";
import { RAIZ_PROYECTO } from "./proyecto";

/**
 * Lee un paquete real de los fixtures.
 * @param caso - nombre de la carpeta del caso
 * @returns el paquete normalizado
 * @throws Error si el fixture es inválido
 */
export function paqueteDe(caso: string): Paquete {
  const resultado = leerPaquete(RAIZ_PROYECTO, caso);
  if (!resultado.ok) throw new Error(`Fixture ${caso} inválido: ${resultado.error.mensaje}`);
  return resultado.data;
}

/**
 * @returns los maestros reales de los fixtures
 * @throws Error si los maestros son inválidos
 */
export function maestrosReales(): Maestros {
  const resultado = leerMaestros(RAIZ_PROYECTO);
  if (!resultado.ok) throw new Error(resultado.error.mensaje);
  return resultado.data;
}

/**
 * Copia del paquete sol-001 (pasa todas las reglas) con campos sobrescritos.
 * @param cambios - campos de la solicitud a sobrescribir
 * @param otros - campos del paquete a sobrescribir
 * @returns el paquete modificado
 */
export function variante(
  cambios: Partial<Paquete["solicitud"]>,
  otros: Partial<Paquete> = {},
): Paquete {
  const base = paqueteDe("sol-001");
  return { ...base, ...otros, solicitud: { ...base.solicitud, ...cambios } };
}
