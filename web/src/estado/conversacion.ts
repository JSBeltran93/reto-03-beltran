import type { EntradaHistorial, RespuestaChat } from "@contratos/contratos-api";

import { HERRAMIENTAS } from "./herramientas";

/** Error visible en la interfaz. */
export interface ErrorVisible {
  readonly mensaje: string;
  /** Si tiene sentido ofrecer "Reintentar". */
  readonly reintentable: boolean;
}

/** Estado de la conversación en la interfaz. */
export interface EstadoConversacion {
  readonly sessionId: string;
  readonly entradas: readonly EntradaHistorial[];
  readonly error: ErrorVisible | null;
  readonly esperaConfirmacion: boolean;
  readonly ultimoMensaje: string | null;
}

/** Eventos que cambian el estado de la conversación. */
export type AccionConversacion =
  | { readonly tipo: "ENVIAR"; readonly texto: string }
  | { readonly tipo: "REINTENTAR" }
  | { readonly tipo: "RESPUESTA"; readonly sessionId: string; readonly respuesta: RespuestaChat }
  | { readonly tipo: "FALLO"; readonly sessionId: string; readonly error: ErrorVisible }
  | {
      readonly tipo: "HIDRATAR";
      readonly sessionId: string;
      readonly historial: readonly EntradaHistorial[];
    }
  | { readonly tipo: "NUEVA_SESION"; readonly sessionId: string };

/**
 * Crea el estado inicial de una conversación.
 * @param sessionId - identificador de la sesión
 * @returns estado vacío
 */
export function estadoInicial(sessionId: string): EstadoConversacion {
  return { sessionId, entradas: [], error: null, esperaConfirmacion: false, ultimoMensaje: null };
}

function ultimoIndiceDe(historial: readonly EntradaHistorial[], nombre: string): number {
  return historial.findLastIndex(
    (entrada) =>
      entrada.tipo === "herramienta" && entrada.llamada.ok && entrada.llamada.nombre === nombre,
  );
}

/**
 * Deduce, con una heurística, si un historial recuperado del servidor quedó esperando
 * confirmación: termina en un mensaje del agente, hubo un `oc_construir_payload` correcto
 * y no hubo un `oc_crear` correcto después. El servidor no expone su estado de
 * confirmación, así que es la mejor aproximación sin cambiar el contrato.
 * @param historial - historial de la sesión
 * @returns true si conviene mostrar el aviso de confirmación
 */
export function esperaConfirmacionEnHistorial(historial: readonly EntradaHistorial[]): boolean {
  const indicePayload = ultimoIndiceDe(historial, HERRAMIENTAS.construirPayload);
  const terminaEnAgente = historial.at(-1)?.tipo === "asistente";
  return (
    terminaEnAgente &&
    indicePayload >= 0 &&
    indicePayload > ultimoIndiceDe(historial, HERRAMIENTAS.crear)
  );
}

function conRespuesta(estado: EstadoConversacion, respuesta: RespuestaChat): EstadoConversacion {
  const herramientas: EntradaHistorial[] = respuesta.toolCalls.map((llamada) => ({
    tipo: "herramienta",
    llamada,
  }));
  if (respuesta.esError === true) {
    return {
      ...estado,
      entradas: [...estado.entradas, ...herramientas],
      error: { mensaje: respuesta.reply, reintentable: true },
      esperaConfirmacion: false,
    };
  }
  return {
    ...estado,
    entradas: [...estado.entradas, ...herramientas, { tipo: "asistente", texto: respuesta.reply }],
    esperaConfirmacion: respuesta.needsConfirmation,
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
      if (accion.sessionId !== estado.sessionId) return estado;
      return {
        ...estado,
        entradas: accion.historial,
        error: null,
        esperaConfirmacion: esperaConfirmacionEnHistorial(accion.historial),
      };
    case "NUEVA_SESION":
      return estadoInicial(accion.sessionId);
  }
}
