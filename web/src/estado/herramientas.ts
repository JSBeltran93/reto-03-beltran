/** Nombres de las herramientas del PRD §6.2 tal como las ve el modelo. */
export const HERRAMIENTAS = {
  leerPaquete: "oc_leer_paquete",
  validar: "oc_validar",
  construirPayload: "oc_construir_payload",
  generarEvidencia: "oc_generar_evidencia",
  crear: "oc_crear",
  leerExcel: "oc_leer_excel",
} as const;

/** Etiqueta en primera persona de cada paso del flujo, para la línea de tiempo del turno. */
export const ETIQUETAS_PASO: Readonly<Record<string, string>> = {
  [HERRAMIENTAS.leerPaquete]: "Leí los documentos",
  [HERRAMIENTAS.validar]: "Validé contra los maestros",
  [HERRAMIENTAS.construirPayload]: "Armé la OC",
  [HERRAMIENTAS.generarEvidencia]: "Generé la evidencia",
  [HERRAMIENTAS.crear]: "Creé la OC en SAP",
  [HERRAMIENTAS.leerExcel]: "Leí el Excel de la solicitud",
};

/**
 * Etiqueta del paso de una herramienta.
 * @param nombre - nombre de la herramienta
 * @returns la etiqueta legible, o el nombre si no es una herramienta conocida
 */
export function etiquetaPaso(nombre: string): string {
  return ETIQUETAS_PASO[nombre] ?? nombre;
}
