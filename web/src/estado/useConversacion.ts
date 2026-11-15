import {
  type EntradaHistorial,
  EsquemaSolicitudChat,
  type VistaSesion,
} from "@contratos/contratos-api";
import { type Dispatch, useCallback, useEffect, useReducer, useState } from "react";

import { ErrorApi, MENSAJES_ERROR_API } from "../api/cliente";
import { useEnviarMensaje } from "../consultas/useEnviarMensaje";
import { useSesion } from "../consultas/useSesion";
import {
  type AccionConversacion,
  type ErrorVisible,
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

/** Vuelve a leer la sesión del servidor (forma de `refetch` de TanStack Query). */
export type RefrescarSesion = () => Promise<{ data?: VistaSesion | null }>;

/**
 * Sondeo del historial cuando la respuesta del chat no llegó (red o tiempo agotado):
 * el servidor puede seguir terminando el turno, así que se consulta cada `intervaloMs`
 * hasta `intentos` veces antes de ofrecer "Reintentar". Nunca se reenvía solo.
 */
export const SONDEO_TURNO = { intervaloMs: 5_000, intentos: 12 } as const;

/** Parámetros del sondeo (inyectables en pruebas). */
export interface OpcionesSondeo {
  readonly intervaloMs: number;
  readonly intentos: number;
}

/** Contexto de un fallo al enviar un mensaje. */
export interface ContextoFallo {
  readonly despachar: Dispatch<AccionConversacion>;
  readonly sessionId: string;
  readonly texto: string;
  readonly refrescar: RefrescarSesion;
  readonly sondeo?: OpcionesSondeo;
}

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

function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/**
 * Consulta el historial del servidor hasta ver terminado el turno del mensaje.
 * @param contexto - mensaje enviado, cómo refrescar y parámetros del sondeo
 * @returns la sesión con el turno terminado, o null si se agotaron los intentos
 */
export async function sondearTurno(contexto: ContextoFallo): Promise<VistaSesion | null> {
  const { intervaloMs, intentos } = contexto.sondeo ?? SONDEO_TURNO;
  for (let intento = 0; intento < intentos; intento++) {
    if (intento > 0) await esperar(intervaloMs);
    const { data } = await contexto.refrescar().catch(() => ({ data: null }));
    if (data && turnoCompletado(data.historial, contexto.texto)) return data;
  }
  return null;
}

/**
 * Error visible a partir del error de la mutación (mensaje, si se puede reintentar y espera).
 * @param errorApi - error de la API, o null si fue otro tipo de error
 * @returns el error para el estado
 */
function aErrorVisible(errorApi: ErrorApi | null): ErrorVisible {
  if (errorApi === null) return { mensaje: MENSAJES_ERROR_API.inesperado, reintentable: true };
  const { message: mensaje, reintentable, esperaSegundos } = errorApi;
  return { mensaje, reintentable, ...(esperaSegundos !== undefined && { esperaSegundos }) };
}

/**
 * Despacha un fallo; si no hubo respuesta (red o tiempo agotado), antes sondea el
 * historial del servidor por si el turno sí terminó y solo se perdió la respuesta.
 * @param error - error de la mutación
 * @param contexto - despachador, sesión, mensaje y cómo refrescar
 */
export async function manejarFallo(error: unknown, contexto: ContextoFallo): Promise<void> {
  const errorApi = error instanceof ErrorApi ? error : null;
  if (errorApi?.sinRespuesta === true) {
    const sesion = await sondearTurno(contexto);
    if (sesion) {
      contexto.despachar({ tipo: "HIDRATAR", sessionId: contexto.sessionId, sesion });
      return;
    }
  }
  const visible = aErrorVisible(errorApi);
  contexto.despachar({ tipo: "FALLO", sessionId: contexto.sessionId, error: visible });
}

/**
 * Envía un texto al agente y despacha la respuesta o el error al reducer, marcando la sesión.
 * @param despachar - despachador del reducer
 * @param sessionId - sesión actual
 * @param refrescar - vuelve a leer el historial de la sesión en el servidor
 * @returns función para solicitar, si hay una petición o un sondeo en curso y cómo descartarla
 */
function useSolicitud(
  despachar: Dispatch<AccionConversacion>,
  sessionId: string,
  refrescar: RefrescarSesion,
) {
  const { mutate, isPending, reset } = useEnviarMensaje();
  const [sondeando, setSondeando] = useState(false);
  const solicitar = useCallback(
    (texto: string) => {
      mutate(
        { sessionId, message: texto },
        {
          onSuccess: (respuesta) => {
            despachar({ tipo: "RESPUESTA", sessionId, respuesta });
          },
          onError: (error) => {
            setSondeando(true);
            void manejarFallo(error, { despachar, sessionId, texto, refrescar }).finally(() => {
              setSondeando(false);
            });
          },
        },
      );
    },
    [mutate, despachar, sessionId, refrescar],
  );
  return { solicitar, cargando: isPending || sondeando, descartar: reset };
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
    despachar({ tipo: "HIDRATAR", sessionId: estado.sessionId, sesion: sesion.data });
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
