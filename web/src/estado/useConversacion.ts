import {
  type EntradaHistorial,
  EsquemaSolicitudChat,
  type VistaSesion,
} from "@contratos/contratos-api";
import { useQueryClient } from "@tanstack/react-query";
import { type Dispatch, useCallback, useEffect, useReducer, useState } from "react";

import { ErrorApi, MENSAJES_ERROR_API } from "../api/cliente";
import { useEnviarMensaje } from "../consultas/useEnviarMensaje";
import { claveSesion, marcarSesionNueva, useSesion } from "../consultas/useSesion";
import {
  type AccionConversacion,
  type ErrorVisible,
  type EstadoConversacion,
  estadoInicial,
  reducirConversacion,
} from "./conversacion";
import { guardarSesion, leerSesionInicial, nuevoIdSesion } from "./sesion-guardada";

/** Opciones al abrir una sesión. */
export interface OpcionesAbrirSesion {
  /** true si la sesión se acaba de crear en el cliente: no se pide su historial al servidor. */
  readonly nueva?: boolean;
}

/** API pública del hook de conversación. */
export interface Conversacion {
  readonly estado: EstadoConversacion;
  /** true mientras el agente procesa un mensaje. */
  readonly cargando: boolean;
  /** Envía un mensaje al agente (se ignora si ya hay uno en curso). */
  readonly enviar: (texto: string) => void;
  /** Reenvía el último mensaje después de un error reintentable. */
  readonly reintentar: () => void;
  /**
   * Inicia una conversación nueva con otra sesión (no disponible mientras carga) y, si se
   * da un texto, lo envía como primer mensaje de esa sesión.
   * @returns el identificador de la sesión nueva, o null si no se pudo cambiar
   */
  readonly nuevaSesion: (primerMensaje?: string) => string | null;
  /**
   * Cambia a una sesión existente o nueva y rehidrata su historial desde el servidor
   * (no disponible mientras carga). Una sesión nueva no se pide al servidor.
   * @returns true si se cambió de sesión
   */
  readonly abrirSesion: (id: string, opciones?: OpcionesAbrirSesion) => boolean;
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
 * Envía un texto al agente y despacha la respuesta o el error al reducer, marcando la sesión
 * a la que se envió (las respuestas de otra sesión se ignoran).
 * @param despachar - despachador del reducer
 * @param refrescar - vuelve a leer el historial de la sesión en el servidor
 * @returns función para solicitar, si hay una petición o un sondeo en curso y cómo descartarla
 */
function useSolicitud(despachar: Dispatch<AccionConversacion>, refrescar: RefrescarSesion) {
  const { mutate, isPending, reset } = useEnviarMensaje();
  const [sondeando, setSondeando] = useState(false);
  const solicitar = useCallback(
    (sessionId: string, texto: string) => {
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
    [mutate, despachar, refrescar],
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
 * Cambio de sesión: descarta la petición anterior, recuerda la sesión y olvida el historial
 * en caché para volver a pedirlo al servidor (al volver a un caso se ve su conversación al día).
 * Si la sesión es nueva, en cambio, se marca sin historial y no se pide.
 * @param cargando - si hay una petición o un sondeo en curso (entonces no se cambia)
 * @param descartar - descarta el estado de la mutación anterior
 * @param despachar - despachador del reducer
 * @returns función que abre una sesión y dice si se cambió
 */
function useAbrirSesion(
  cargando: boolean,
  descartar: () => void,
  despachar: Dispatch<AccionConversacion>,
): (id: string, opciones?: OpcionesAbrirSesion) => boolean {
  const clienteConsultas = useQueryClient();
  return useCallback(
    (id: string, opciones?: OpcionesAbrirSesion) => {
      if (cargando) return false;
      descartar();
      guardarSesion(id);
      if (opciones?.nueva === true) marcarSesionNueva(clienteConsultas, id);
      else clienteConsultas.removeQueries({ queryKey: claveSesion(id), exact: true });
      despachar({ tipo: "NUEVA_SESION", sessionId: id });
      return true;
    },
    [cargando, descartar, despachar, clienteConsultas],
  );
}

/**
 * Envío a una sesión concreta: la abierta o una recién abierta en el mismo clic (cuyo
 * identificador aún no está en el estado). Un mensaje inválido se muestra como error.
 * @param despachar - despachador del reducer
 * @param solicitar - envía el texto al servidor para una sesión
 * @returns función que envía un texto a una sesión
 */
function useEnviarA(
  despachar: Dispatch<AccionConversacion>,
  solicitar: (sessionId: string, texto: string) => void,
): (sessionId: string, texto: string) => void {
  return useCallback(
    (sessionId: string, texto: string) => {
      if (!EsquemaSolicitudChat.shape.message.safeParse(texto).success) {
        const error = { mensaje: MENSAJES_ERROR_API.mensajeInvalido, reintentable: false };
        despachar({ tipo: "FALLO", sessionId, error });
        return;
      }
      despachar({ tipo: "ENVIAR", texto });
      solicitar(sessionId, texto);
    },
    [despachar, solicitar],
  );
}

/**
 * Estado y acciones de la conversación con el agente: combina el reducer puro, la
 * mutación y la consulta del historial de TanStack Query y la sesión guardada.
 * @returns estado y acciones
 */
export function useConversacion(): Conversacion {
  const clienteConsultas = useQueryClient();
  const [estado, despachar] = useReducer(reducirConversacion, clienteConsultas, (cliente) => {
    const { id, nueva } = leerSesionInicial();
    if (nueva) marcarSesionNueva(cliente, id);
    return estadoInicial(id);
  });
  const refrescar = useHidratacion(estado, despachar);
  const { solicitar, cargando, descartar } = useSolicitud(despachar, refrescar);

  const enviarA = useEnviarA(despachar, solicitar);
  const enviar = useCallback(
    (texto: string) => {
      if (!cargando) enviarA(estado.sessionId, texto);
    },
    [cargando, enviarA, estado.sessionId],
  );

  const reintentar = useCallback(() => {
    if (cargando || estado.ultimoMensaje === null) return;
    despachar({ tipo: "REINTENTAR" });
    solicitar(estado.sessionId, estado.ultimoMensaje);
  }, [cargando, solicitar, estado.sessionId, estado.ultimoMensaje]);

  const abrirSesion = useAbrirSesion(cargando, descartar, despachar);
  const nuevaSesion = useCallback(
    (primerMensaje?: string) => {
      const id = nuevoIdSesion();
      if (!abrirSesion(id, { nueva: true })) return null;
      if (primerMensaje !== undefined) enviarA(id, primerMensaje);
      return id;
    },
    [abrirSesion, enviarA],
  );

  return { estado, cargando, enviar, reintentar, nuevaSesion, abrirSesion };
}
