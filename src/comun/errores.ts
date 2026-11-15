/**
 * Catálogo de códigos de error del dominio (SOLUCION.md §3).
 * Los códigos son identificadores estables; el mensaje que los acompaña es para el usuario.
 */
export const CODIGOS_ERROR = [
  "CASO_INEXISTENTE",
  "PAQUETE_INCOMPLETO",
  "JSON_INVALIDO",
  "MONTO_INVALIDO",
  "ARGS_INVALIDOS",
  "NO_APTA",
  "REQUIERE_CONFIRMACION",
  "CONFIRMACION_NO_OTORGADA",
  "PAYLOAD_ALTERADO",
  "ERROR_INTERNO",
  "LLM_TIMEOUT",
  "LLM_LIMITE",
  "LLM_NO_DISPONIBLE",
  "LLM_CLAVE_INVALIDA",
  "LLM_SOLICITUD_INVALIDA",
  "LLM_RECHAZO",
] as const;

/** Uno de los códigos de error del catálogo. */
export type CodigoError = (typeof CODIGOS_ERROR)[number];
