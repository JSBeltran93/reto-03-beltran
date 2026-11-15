import { type EntradaHistorial, EsquemaSolicitudChat } from "@contratos/contratos-api";
import { type Dispatch, useCallback, useEffect, useReducer } from "react";

import { ErrorApi, MENSAJES_ERROR_API } from "../api/cliente";
import { useEnviarMensaje } from "../consultas/useEnviarMensaje";
import { useSesion } from "../consultas/useSesion";
import {
  type AccionConversacion,
  type EstadoConversacion,
  estadoInicial,
  reducirConversacion,
} from "./conversacion";
import { guardarSesion, leerSesionGuardada, nuevoIdSesion } from "./sesion-guardada";

/** API pública del hook de conversación. */
export interface Conversacion {
  readonly estado: EstadoConversacion;
  /** true mientras el agente procesa un mensaje. */
  readonly cargando: boolean;
  /** Envía un mensaje al agente (se ignora si ya hay uno en curso). */
  readonly enviar: (texto: string) => void;
  /** Reenvía el último mensaje después de un error reintentable. */
  readonly reintentar: () => void;
  /** Inicia una conversación nueva con otra sesión (no disponible mientras carga). */
  readonly nuevaSesion: () => void;
}

type RefrescarSesion = () => Promise<{ data?: { historial: EntradaHistorial[] } | null }>;

/**
 * Indica si el servidor ya respondió el turno de un mensaje (la respuesta se perdió en la red).
 * @param historial - historial del servidor
 * @param texto - mensaje enviado
 * @returns true si después de ese mensaje hay una respuesta o un error del agente
 */
export function turnoCompletado(historial: readonly EntradaHistorial[], texto: string): boolean {
  const indice = historial.findLastIndex((e) => e.tipo === "usuario" && e.texto === texto);
  return (
    indice >= 0 &&
    historial.slice(indice + 1).some((e) => e.tipo === "asistente" || e.tipo === "error")
  );
}

/**
 * Despacha un fallo; si no hubo respuesta (red o tiempo agotado), antes consulta el
 * historial del servidor por si el turno sí terminó y solo se perdió la respuesta.
 */
async function manejarFallo(
  error: unknown,
  contexto: {
    despachar: Dispatch<AccionConversacion>;
    sessionId: string;
    texto: string;
    refrescar: RefrescarSesion;
  },
): Promise<void> {
  const errorApi = error instanceof ErrorApi ? error : null;
  if (errorApi?.sinRespuesta === true) {
    const { data } = await contexto.refrescar();
    if (data && turnoCompletado(data.historial, contexto.texto)) {
      contexto.despachar({
        tipo: "HIDRATAR",
        sessionId: contexto.sessionId,
        historial: data.historial,
      });
      return;
    }
  }
  const mensaje = errorApi?.message ?? MENSAJES_ERROR_API.inesperado;
  const reintentable = errorApi?.reintentable ?? true;
  contexto.despachar({
    tipo: "FALLO",
    sessionId: contexto.sessionId,
    error: { mensaje, reintentable },
  });
}

/**
 * Envía un texto al agente y despacha la respuesta o el error al reducer, marcando la sesión.
 * @param despachar - despachador del reducer
 * @param sessionId - sesión actual
 * @param refrescar - vuelve a leer el historial de la sesión en el servidor
 * @returns función para solicitar, si hay una petición en curso y cómo descartarla
 */
function useSolicitud(
  despachar: Dispatch<AccionConversacion>,
  sessionId: string,
  refrescar: RefrescarSesion,
) {
  const { mutate, isPending, reset } = useEnviarMensaje();
  const solicitar = useCallback(
    (texto: string) => {
      mutate(
        { sessionId, message: texto },
        {
          onSuccess: (respuesta) => {
            despachar({ tipo: "RESPUESTA", sessionId, respuesta });
          },
          onError: (error) => {
            void manejarFallo(error, { despachar, sessionId, texto, refrescar });
          },
        },
      );
    },
    [mutate, despachar, sessionId, refrescar],
  );
  return { solicitar, cargando: isPending, descartar: reset };
}

/**
 * Rehidrata la conversación con el historial del servidor al cargar la página.
 * @param estado - estado actual
 * @param despachar - despachador del reducer
 * @returns función para volver a leer el historial
 */
function useHidratacion(
  estado: EstadoConversacion,
  despachar: Dispatch<AccionConversacion>,
): RefrescarSesion {
  const sesion = useSesion(estado.sessionId);
  const sinEntradas = estado.entradas.length === 0;
  useEffect(() => {
    if (!sinEntradas || !sesion.data || sesion.data.historial.length === 0) return;
    despachar({ tipo: "HIDRATAR", sessionId: estado.sessionId, historial: sesion.data.historial });
  }, [sesion.data, sinEntradas, despachar, estado.sessionId]);
  return sesion.refetch;
}

/**
 * Estado y acciones de la conversación con el agente: combina el reducer puro, la
 * mutación y la consulta del historial de TanStack Query y la sesión guardada.
 * @returns estado y acciones
 */
export function useConversacion(): Conversacion {
  const [estado, despachar] = useReducer(reducirConversacion, undefined, () =>
    estadoInicial(leerSesionGuardada()),
  );
  const refrescar = useHidratacion(estado, despachar);
  const { solicitar, cargando, descartar } = useSolicitud(despachar, estado.sessionId, refrescar);

  const enviar = useCallback(
    (texto: string) => {
      if (cargando) return;
      if (!EsquemaSolicitudChat.shape.message.safeParse(texto).success) {
        const error = { mensaje: MENSAJES_ERROR_API.mensajeInvalido, reintentable: false };
        despachar({ tipo: "FALLO", sessionId: estado.sessionId, error });
        return;
      }
      despachar({ tipo: "ENVIAR", texto });
      solicitar(texto);
    },
    [cargando, solicitar, estado.sessionId],
  );

  const reintentar = useCallback(() => {
    if (cargando || estado.ultimoMensaje === null) return;
    despachar({ tipo: "REINTENTAR" });
    solicitar(estado.ultimoMensaje);
  }, [cargando, solicitar, estado.ultimoMensaje]);

  const nuevaSesion = useCallback(() => {
    if (cargando) return;
    descartar();
    const id = nuevoIdSesion();
    guardarSesion(id);
    despachar({ tipo: "NUEVA_SESION", sessionId: id });
  }, [cargando, descartar]);

  return { estado, cargando, enviar, reintentar, nuevaSesion };
}
