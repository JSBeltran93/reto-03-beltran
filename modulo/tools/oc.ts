/**
 * Herramientas del agente para otras plataformas: re-exporta por nombre las
 * herramientas del PRD, las cinco P0 y `leer_excel` (las mismas instancias, sin copias).
 */
export {
  construir_payload,
  crear,
  generar_evidencia,
  leer_excel,
  leer_paquete,
  validar,
} from "../../src/tools/oc";
