import { fallo } from "../comun/resultado";
import type { LlamadaHerramienta } from "../llm/adapter";
import { NOMBRES_HERRAMIENTAS } from "../tools/oc/nombres";
import { sinTildes } from "../tools/oc/normalizar";

/** Estado de confirmación que se guarda por sesión (CA3). */
export interface EstadoConfirmacion {
  /** Caso que espera la confirmación del usuario, si hay. */
  pendiente: string | null;
  /** Caso que el usuario confirmó en su último mensaje, si hay. */
  otorgada: string | null;
}

const AFIRMATIVO =
  /^(si|confirmo|confirmado|apruebo|aprobado|procede|adelante|ok|dale|de acuerdo)\b|\bconfirmo\b/;
const NEGATIVO = /\b(no|cancela|cancelar|cancelo|rechazo|detente)\b/;

/**
 * Detecta una confirmación (sin importar tildes ni mayúsculas, sin negación).
 * @param mensaje - mensaje del usuario
 * @returns true si el mensaje confirma
 */
export function esAfirmativo(mensaje: string): boolean {
  const texto = sinTildes(mensaje).toLowerCase().trim();
  return AFIRMATIVO.test(texto) && !NEGATIVO.test(texto);
}

/**
 * Detecta un rechazo o cancelación.
 * @param mensaje - mensaje del usuario
 * @returns true si el mensaje cancela
 */
export function esNegativo(mensaje: string): boolean {
  return NEGATIVO.test(sinTildes(mensaje).toLowerCase());
}

/**
 * Aplica un mensaje nuevo del usuario: una confirmación otorga el caso pendiente,
 * un rechazo lo limpia y cualquier mensaje revoca una confirmación anterior
 * (solo vale para el turno inmediatamente posterior a la pregunta).
 * @param estado - estado de confirmación de la sesión (se modifica)
 * @param mensaje - mensaje del usuario
 */
export function alMensajeUsuario(estado: EstadoConfirmacion, mensaje: string): void {
  estado.otorgada = null;
  if (estado.pendiente === null) return;
  if (esAfirmativo(mensaje)) {
    estado.otorgada = estado.pendiente;
  } else if (esNegativo(mensaje)) {
    estado.pendiente = null;
  }
}

function casoDe(llamada: LlamadaHerramienta): string | null {
  const args = llamada.args as { caso?: unknown } | null;
  return typeof args?.caso === "string" ? args.caso : null;
}

/**
 * Bloquea `oc_crear` con `confirmado=true` salvo que el usuario haya confirmado ese
 * mismo caso en su último mensaje: el modelo no puede confirmar por el usuario.
 * @param estado - estado de confirmación de la sesión
 * @param llamada - llamada pedida por el modelo
 * @returns error serializado para el modelo, o null si la llamada se permite
 */
export function autorizar(estado: EstadoConfirmacion, llamada: LlamadaHerramienta): string | null {
  const args = llamada.args as { confirmado?: unknown } | null;
  if (llamada.nombre !== NOMBRES_HERRAMIENTAS.crear || args?.confirmado !== true) return null;
  if (estado.otorgada !== null && estado.otorgada === casoDe(llamada)) return null;
  return JSON.stringify(
    fallo(
      "CONFIRMACION_NO_OTORGADA",
      "El usuario no ha confirmado este caso. Pregunte al usuario y espere su respuesta.",
    ),
  );
}

/**
 * Actualiza el caso pendiente después de una llamada: un payload construido queda
 * esperando la creación; una OC creada limpia el estado.
 * @param estado - estado de confirmación de la sesión (se modifica)
 * @param llamada - llamada ejecutada
 * @param data - datos del resultado exitoso, o undefined si falló
 */
export function trasHerramienta(
  estado: EstadoConfirmacion,
  llamada: LlamadaHerramienta,
  data: unknown,
): void {
  const caso = casoDe(llamada);
  if (
    llamada.nombre === NOMBRES_HERRAMIENTAS.construirPayload &&
    caso !== null &&
    data !== undefined
  ) {
    estado.pendiente = caso;
  }
  if (llamada.nombre === NOMBRES_HERRAMIENTAS.crear && data !== undefined) {
    estado.pendiente = null;
    estado.otorgada = null;
  }
}
