/** Nombres de carpetas y archivos de entrada y salida, en un solo lugar. */
import path from "node:path";

/** Carpeta donde se escribe todo lo generado en ejecución. */
export const CARPETA_SALIDA = "out";

/** Archivos que se generan dentro de `out/`. */
export const ARCHIVOS_SALIDA = {
  control: "control.csv",
  bitacora: "log.jsonl",
  ordenesSap: path.join("sap", "ordenes.jsonl"),
  trazabilidad: "trazabilidad.json",
  evidenciaTexto: "aprobacion.txt",
  evidenciaPdf: "aprobacion.pdf",
} as const;

/** Archivos normalizados de cada caso en `fixtures/reto-03/solicitudes/<caso>/`. */
export const ARCHIVOS_CASO = {
  correo: "correo.json",
  solicitud: "solicitud.json",
  cotizacion: "cotizacion.txt",
  aprobacion: "aprobacion.json",
  factura: "factura.txt",
} as const;

/** Ruta del comportamiento del agente (system prompt), relativa a la raíz. */
export const RUTA_PROMPT = path.join("agent", "prompt.md");

/** Ruta del conocimiento del proceso, relativa a la raíz. */
export const RUTA_CONOCIMIENTO = path.join("src", "knowledge", "ordenes-compra.md");

/**
 * Ruta relativa a la raíz de un archivo de salida.
 * @param partes - segmentos dentro de `out/`
 * @returns p. ej. "out/sol-001/aprobacion.txt"
 */
export function rutaSalidaRelativa(...partes: string[]): string {
  return path.join(CARPETA_SALIDA, ...partes);
}

/**
 * Ruta absoluta de un archivo de salida.
 * @param raiz - raíz del proyecto
 * @param partes - segmentos dentro de `out/`
 * @returns ruta absoluta dentro de `out/`
 */
export function rutaSalida(raiz: string, ...partes: string[]): string {
  return path.join(raiz, CARPETA_SALIDA, ...partes);
}
