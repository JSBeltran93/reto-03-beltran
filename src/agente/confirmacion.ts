import type { LlamadaHerramienta } from "../llm/adapter";
import { NOMBRES_HERRAMIENTAS } from "../tools/oc/nombres";
import { sinTildes } from "../tools/oc/normalizar";
import { type Ejecucion, ejecucionFallida } from "./registro-herramientas";

const MENSAJE_SIN_CONFIRMACION =
  "El usuario no ha confirmado este caso. Pregunte al usuario y espere su respuesta.";

/** Estado de confirmación que se guarda por sesión (CA3). */
export interface EstadoConfirmacion {
  /** Casos que esperan la confirmación del usuario, en el orden en que quedaron pendientes. */
  pendientes: string[];
  /** Caso que el usuario confirmó en su último mensaje, si hay. */
  otorgada: string | null;
}

/** Confirmación corta y completa: "Confirmo", "Sí", "Ok", "Sí, confirmo.", "Confirmo la OC". */
const AFIRMATIVO =
  /^(si|confirmo|confirmado|apruebo|procede|adelante|ok|dale|de acuerdo)(,? (si|confirmo|confirmado))?( (la |el )?(oc|orden|creacion))?[\s.!]*$/;
/** Palabras que anulan una confirmación aunque el mensaje empiece afirmando. */
const MATIZ = /\b(no|todavia|espera|antes|pero|primero|cancela|cancelar)\b/;
/** Rechazos explícitos que limpian todos los casos pendientes. */
const NEGATIVO = /^(no|cancela|cancelar|cancelo|rechazo|detente)\b|\bno confirmo\b|\bcancela/;

function normalizar(mensaje: string): string {
  return sinTildes(mensaje).toLowerCase().trim();
}

/**
 * Detecta una confirmación corta y completa (sin tildes ni mayúsculas y sin matices).
 * @param mensaje - mensaje del usuario
 * @returns true si el mensaje confirma sin condiciones
 */
export function esAfirmativo(mensaje: string): boolean {
  const texto = normalizar(mensaje);
  return AFIRMATIVO.test(texto) && !MATIZ.test(texto);
}

/**
 * Detecta un rechazo o cancelación.
 * @param mensaje - mensaje del usuario
 * @returns true si el mensaje cancela
 */
export function esNegativo(mensaje: string): boolean {
  return NEGATIVO.test(normalizar(mensaje));
}

/**
 * Caso pendiente más reciente, el que se confirmaría con un "Confirmo".
 * @param estado - estado de confirmación de la sesión
 * @returns el caso, o null si no hay pendientes
 */
export function casoPendiente(estado: EstadoConfirmacion): string | null {
  return estado.pendientes.at(-1) ?? null;
}

/**
 * Aplica un mensaje nuevo del usuario: una confirmación otorga solo el caso pendiente
 * más reciente, un rechazo limpia todos los pendientes y cualquier otro mensaje
 * conserva los pendientes pero revoca una confirmación anterior.
 * @param estado - estado de confirmación de la sesión (se modifica)
 * @param mensaje - mensaje del usuario
 */
export function alMensajeUsuario(estado: EstadoConfirmacion, mensaje: string): void {
  estado.otorgada = null;
  if (estado.pendientes.length === 0) return;
  if (esAfirmativo(mensaje)) {
    estado.otorgada = casoPendiente(estado);
  } else if (esNegativo(mensaje)) {
    estado.pendientes = [];
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
 * @returns ejecución fallida para el modelo y el chat, o null si la llamada se permite
 */
export function autorizar(
  estado: EstadoConfirmacion,
  llamada: LlamadaHerramienta,
): Ejecucion | null {
  const args = llamada.args as { confirmado?: unknown } | null;
  if (llamada.nombre !== NOMBRES_HERRAMIENTAS.crear || args?.confirmado !== true) return null;
  if (estado.otorgada !== null && estado.otorgada === casoDe(llamada)) return null;
  return ejecucionFallida(llamada, "CONFIRMACION_NO_OTORGADA", MENSAJE_SIN_CONFIRMACION);
}

/**
 * Actualiza los pendientes después de una llamada: un payload construido queda
 * esperando la creación (al final de la lista); una OC creada quita solo su caso.
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
  if (caso === null || data === undefined) return;
  if (llamada.nombre === NOMBRES_HERRAMIENTAS.construirPayload) {
    estado.pendientes = [...estado.pendientes.filter((c) => c !== caso), caso];
  }
  if (llamada.nombre === NOMBRES_HERRAMIENTAS.crear) {
    estado.pendientes = estado.pendientes.filter((c) => c !== caso);
    if (estado.otorgada === caso) estado.otorgada = null;
  }
}
