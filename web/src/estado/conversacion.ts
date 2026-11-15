import type { EntradaHistorial, RespuestaChat } from "@contratos/contratos-api";

/** Estado de la conversación en la interfaz. */
export interface EstadoConversacion {
  readonly sessionId: string;
  readonly entradas: readonly EntradaHistorial[];
  readonly error: string | null;
  readonly esperaConfirmacion: boolean;
  readonly ultimoMensaje: string | null;
}

/** Eventos que cambian el estado de la conversación. */
export type AccionConversacion =
  | { readonly tipo: "ENVIAR"; readonly texto: string }
  | { readonly tipo: "REINTENTAR" }
  | { readonly tipo: "RESPUESTA"; readonly respuesta: RespuestaChat }
  | { readonly tipo: "FALLO"; readonly mensaje: string }
  | { readonly tipo: "NUEVA_SESION"; readonly sessionId: string };

/**
 * Crea el estado inicial de una conversación.
 * @param sessionId - identificador de la sesión
 * @returns estado vacío
 */
export function estadoInicial(sessionId: string): EstadoConversacion {
  return { sessionId, entradas: [], error: null, esperaConfirmacion: false, ultimoMensaje: null };
}

function conRespuesta(estado: EstadoConversacion, respuesta: RespuestaChat): EstadoConversacion {
  const herramientas: EntradaHistorial[] = respuesta.toolCalls.map((llamada) => ({
    tipo: "herramienta",
    llamada,
  }));
  return {
    ...estado,
    entradas: [...estado.entradas, ...herramientas, { tipo: "asistente", texto: respuesta.reply }],
    esperaConfirmacion: respuesta.needsConfirmation,
  };
}

/**
 * Transición pura del estado de la conversación.
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
      return conRespuesta(estado, accion.respuesta);
    case "FALLO":
      return { ...estado, error: accion.mensaje };
    case "NUEVA_SESION":
      return estadoInicial(accion.sessionId);
  }
}
