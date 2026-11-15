/**
 * Herramientas del agente para otras plataformas: re-exporta por nombre las cinco
 * herramientas del PRD (las mismas instancias que usa la aplicación, sin copias).
 */
export {
  construir_payload,
  crear,
  generar_evidencia,
  leer_paquete,
  validar,
} from "../../src/tools/oc";
