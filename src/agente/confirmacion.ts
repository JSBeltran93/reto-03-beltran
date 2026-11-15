import type { CodigoError } from "../comun/errores";
import { EsquemaResultadoSerializado } from "../comun/resultado";
import type { LlamadaHerramienta } from "../llm/adapter";
import { NOMBRES_HERRAMIENTAS } from "../tools/oc/nombres";
import { sinTildes } from "../tools/oc/normalizar";
import type { Ejecucion } from "./registro-herramientas";

/** Código con el que `oc_crear` indica que el caso espera la confirmación del usuario. */
const CODIGO_REQUIERE_CONFIRMACION: CodigoError = "REQUIERE_CONFIRMACION";

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
 * Compuerta de `oc_crear` (CA3): si el modelo envía `confirmado=true` sin que el usuario
 * haya confirmado ese mismo caso en su último mensaje, la llamada se ejecuta con
 * `confirmado=false`. El modelo nunca confirma por el usuario y `oc_crear` revalida: si
 * el caso tiene confirmaciones devuelve `REQUIERE_CONFIRMACION`; si no las tiene, crea la
 * OC sin gastar otra iteración del modelo.
 * @param estado - estado de confirmación de la sesión
 * @param llamada - llamada pedida por el modelo
 * @returns la llamada que realmente se ejecuta (la misma, o con `confirmado=false`)
 */
export function autorizar(
  estado: EstadoConfirmacion,
  llamada: LlamadaHerramienta,
): LlamadaHerramienta {
  const args = llamada.args as Record<string, unknown> | null;
  if (llamada.nombre !== NOMBRES_HERRAMIENTAS.crear || args?.confirmado !== true) return llamada;
  if (estado.otorgada !== null && estado.otorgada === casoDe(llamada)) return llamada;
  return { ...llamada, args: { ...args, confirmado: false } };
}

function agregarPendiente(estado: EstadoConfirmacion, caso: string): void {
  estado.pendientes = [...estado.pendientes.filter((c) => c !== caso), caso];
}

function quitarPendiente(estado: EstadoConfirmacion, caso: string): void {
  estado.pendientes = estado.pendientes.filter((c) => c !== caso);
  if (estado.otorgada === caso) estado.otorgada = null;
}

/** true si la validación es apta y trae confirmaciones que el usuario debe aprobar. */
function requiereConfirmacion(data: unknown): boolean {
  const validacion = data as { apta?: unknown; confirmaciones?: unknown } | null;
  return (
    validacion?.apta === true &&
    Array.isArray(validacion.confirmaciones) &&
    validacion.confirmaciones.length > 0
  );
}

/** Código de error del resultado serializado, o null si tuvo éxito o no se puede leer. */
function codigoError(serializado: string): string | null {
  try {
    const resultado = EsquemaResultadoSerializado.safeParse(JSON.parse(serializado));
    return resultado.success ? (resultado.data.error?.codigo ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Actualiza los pendientes después de una llamada: un caso queda pendiente solo si de
 * verdad requiere confirmación (`oc_validar` apta con confirmaciones, u `oc_crear` que
 * devuelve `REQUIERE_CONFIRMACION`); una validación sin confirmaciones o no apta y una OC
 * creada lo quitan.
 * @param estado - estado de confirmación de la sesión (se modifica)
 * @param llamada - llamada ejecutada
 * @param ejecucion - resultado de la ejecución
 */
export function trasHerramienta(
  estado: EstadoConfirmacion,
  llamada: LlamadaHerramienta,
  ejecucion: Ejecucion,
): void {
  const caso = casoDe(llamada);
  if (caso === null) return;
  const exitosa = ejecucion.vista.ok;
  if (llamada.nombre === NOMBRES_HERRAMIENTAS.validar && exitosa) {
    if (requiereConfirmacion(ejecucion.data)) agregarPendiente(estado, caso);
    else quitarPendiente(estado, caso);
  }
  if (llamada.nombre !== NOMBRES_HERRAMIENTAS.crear) return;
  if (exitosa) quitarPendiente(estado, caso);
  else if (codigoError(ejecucion.serializado) === CODIGO_REQUIERE_CONFIRMACION)
    agregarPendiente(estado, caso);
}
