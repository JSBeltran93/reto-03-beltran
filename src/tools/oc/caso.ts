import { huella } from "../../comun/huella";
import { exito, type Resultado } from "../../comun/resultado";
import { EsquemaPaquete, type Maestros, type Paquete } from "./esquemas";
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

/** Aviso cuando el paquete del modelo no coincide con los documentos del caso. */
export const AVISO_PAQUETE_DISTINTO =
  "El paquete recibido difiere de los documentos del caso; se validó con los documentos originales.";

/** Aviso cuando el modelo omite partes del paquete (p. ej. adjuntos `null`). */
export const AVISO_PAQUETE_INCOMPLETO =
  "El paquete recibido vino incompleto; se usaron los documentos originales del caso.";

/**
 * Compara el paquete que reenvió el modelo con el leído de disco (la fuente de verdad).
 * @param recibido - paquete de los argumentos (puede venir incompleto o no venir)
 * @param fuente - paquete leído de los documentos del caso
 * @returns el aviso a incluir en la respuesta, o `undefined` si coinciden
 */
export function avisoPaqueteRecibido(recibido: unknown, fuente: Paquete): string | undefined {
  const completo = EsquemaPaquete.safeParse(recibido);
  if (!completo.success) return AVISO_PAQUETE_INCOMPLETO;
  return huella(completo.data) === huella(fuente) ? undefined : AVISO_PAQUETE_DISTINTO;
}
