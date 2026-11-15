import { exito, type Resultado } from "../../comun/resultado";
import type { Maestros, Paquete } from "./esquemas";
import { leerMaestros } from "./insumos";
import { leerPaquete } from "./paquete";
import { type Validacion, validarPaquete } from "./validacion";

/** Caso leído de sus documentos y validado: la fuente de verdad del servidor. */
export interface CasoEvaluado {
  readonly paquete: Paquete;
  readonly maestros: Maestros;
  readonly validacion: Validacion;
}

/**
 * Lee los documentos del caso y los maestros, y aplica las reglas de control.
 * @param raiz - raíz del proyecto
 * @param caso - nombre de la carpeta del caso
 * @returns paquete, maestros y validación, o un error de dominio
 */
export function evaluarCaso(raiz: string, caso: string): Resultado<CasoEvaluado> {
  const paquete = leerPaquete(raiz, caso);
  if (!paquete.ok) return paquete;
  const maestros = leerMaestros(raiz);
  if (!maestros.ok) return maestros;
  return exito({
    paquete: paquete.data,
    maestros: maestros.data,
    validacion: validarPaquete(paquete.data, maestros.data),
  });
}
