/** Prefijo con el que el modelo ve cada export de `src/tools/oc.ts` (PRD §6.2). */
export const PREFIJO_HERRAMIENTA = "oc_";

/** Nombres de las herramientas tal como las ve el modelo. */
export const NOMBRES_HERRAMIENTAS = {
  leerPaquete: "oc_leer_paquete",
  validar: "oc_validar",
  construirPayload: "oc_construir_payload",
  generarEvidencia: "oc_generar_evidencia",
  crear: "oc_crear",
} as const;
