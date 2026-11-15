import type { EntradaHistorial, RespuestaChat, VistaSesion } from "@contratos/contratos-api";

/**
 * Mensaje con el que el servidor informa que falta la clave del modelo o no es válida
 * (código LLM_CLAVE_INVALIDA). El chat no envía el código, solo este texto.
 */
export const MENSAJE_CLAVE_INVALIDA = "La clave del modelo no es válida o falta.";

/** Error visible en la interfaz. */
export interface ErrorVisible {
  readonly mensaje: string;
  /** Si tiene sentido ofrecer "Reintentar". */
  readonly reintentable: boolean;
  /** Segundos a esperar antes de poder reintentar (límite de solicitudes, 429). */
  readonly esperaSegundos?: number;
}

/** Estado de la conversación en la interfaz. */
export interface EstadoConversacion {
  readonly sessionId: string;
  readonly entradas: readonly EntradaHistorial[];
  /**
   * Error de comunicación con el servidor (no llegó respuesta). Las respuestas del agente
   * marcadas como error no van aquí: quedan en el historial como entrada `error`.
   */
  readonly error: ErrorVisible | null;
  readonly esperaConfirmacion: boolean;
  /** Caso cuya OC espera confirmación, según el servidor (null si no se sabe o no hay). */
  readonly casoPendiente: string | null;
  /** true si la última respuesta indicó que falta la clave del modelo o no es válida. */
  readonly claveInvalida: boolean;
  readonly ultimoMensaje: string | null;
}

/** Eventos que cambian el estado de la conversación. */
export type AccionConversacion =
  | { readonly tipo: "ENVIAR"; readonly texto: string }
  | { readonly tipo: "REINTENTAR" }
  | { readonly tipo: "RESPUESTA"; readonly sessionId: string; readonly respuesta: RespuestaChat }
  | { readonly tipo: "FALLO"; readonly sessionId: string; readonly error: ErrorVisible }
  | { readonly tipo: "HIDRATAR"; readonly sessionId: string; readonly sesion: VistaSesion }
  | { readonly tipo: "NUEVA_SESION"; readonly sessionId: string };

/**
 * Crea el estado inicial de una conversación.
 * @param sessionId - identificador de la sesión
 * @returns estado vacío
 */
export function estadoInicial(sessionId: string): EstadoConversacion {
  return {
    sessionId,
    entradas: [],
    error: null,
    esperaConfirmacion: false,
    casoPendiente: null,
    claveInvalida: false,
    ultimoMensaje: null,
  };
}

function conRespuesta(estado: EstadoConversacion, respuesta: RespuestaChat): EstadoConversacion {
  const herramientas: EntradaHistorial[] = respuesta.toolCalls.map((llamada) => ({
    tipo: "herramienta",
    llamada,
  }));
  const esError = respuesta.esError === true;
  const cierre: EntradaHistorial = esError
    ? { tipo: "error", texto: respuesta.reply }
    : { tipo: "asistente", texto: respuesta.reply };
  return {
    ...estado,
    entradas: [...estado.entradas, ...herramientas, cierre],
    error: null,
    esperaConfirmacion: respuesta.needsConfirmation,
    casoPendiente: respuesta.casoPendiente ?? null,
    claveInvalida: esError && respuesta.reply === MENSAJE_CLAVE_INVALIDA,
  };
}

/**
 * Último mensaje del usuario en un historial (el que se reenvía al reintentar).
 * @param entradas - historial
 * @returns el texto, o null si el usuario no escribió nada
 */
export function ultimoMensajeUsuario(entradas: readonly EntradaHistorial[]): string | null {
  const ultimo = entradas.findLast((entrada) => entrada.tipo === "usuario");
  return ultimo?.tipo === "usuario" ? ultimo.texto : null;
}

/**
 * Indica si el último turno del agente terminó en error (última entrada del historial).
 * @param entradas - historial
 * @returns true si la última entrada es un error
 */
export function terminoEnError(entradas: readonly EntradaHistorial[]): boolean {
  return entradas.at(-1)?.tipo === "error";
}

function conSesion(estado: EstadoConversacion, sesion: VistaSesion): EstadoConversacion {
  return {
    ...estado,
    entradas: sesion.historial,
    error: null,
    esperaConfirmacion: sesion.needsConfirmation,
    casoPendiente: sesion.casoPendiente,
    ultimoMensaje: ultimoMensajeUsuario(sesion.historial),
  };
}

/**
 * Transición pura del estado de la conversación. Las respuestas, fallos e
 * hidrataciones de otra sesión (p. ej. tras "Nueva sesión") se ignoran.
 * @param estado - estado actual
 * @param accion - evento a aplicar
 * @returns el estado siguiente
 */
export function reducirConversacion(
  estado: EstadoConversacion,
  accion: AccionConversacion,
): EstadoConversacion {
  switch (accion.tipo) {
    case "ENVIAR":
      return {
        ...estado,
        entradas: [...estado.entradas, { tipo: "usuario", texto: accion.texto }],
        error: null,
        ultimoMensaje: accion.texto,
      };
    case "REINTENTAR":
      return { ...estado, error: null };
    case "RESPUESTA":
      return accion.sessionId === estado.sessionId
        ? conRespuesta(estado, accion.respuesta)
        : estado;
    case "FALLO":
      return accion.sessionId === estado.sessionId ? { ...estado, error: accion.error } : estado;
    case "HIDRATAR":
      return accion.sessionId === estado.sessionId ? conSesion(estado, accion.sesion) : estado;
    case "NUEVA_SESION":
      return estadoInicial(accion.sessionId);
  }
}
