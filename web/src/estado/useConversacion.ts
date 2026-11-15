import { type Dispatch, useCallback, useReducer } from "react";

import { MENSAJES_ERROR_API } from "../api/cliente";
import { useEnviarMensaje } from "../consultas/useEnviarMensaje";
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
  /** Envía un mensaje al agente. */
  readonly enviar: (texto: string) => void;
  /** Reenvía el último mensaje después de un error. */
  readonly reintentar: () => void;
  /** Inicia una conversación nueva con otra sesión. */
  readonly nuevaSesion: () => void;
}

/**
 * Envía un texto al agente y despacha la respuesta o el error al reducer.
 * @param despachar - despachador del reducer de la conversación
 * @param sessionId - sesión actual
 * @returns función para solicitar una respuesta y si hay una petición en curso
 */
function useSolicitud(despachar: Dispatch<AccionConversacion>, sessionId: string) {
  const { mutate, isPending } = useEnviarMensaje();
  const solicitar = useCallback(
    (texto: string) => {
      mutate(
        { sessionId, message: texto },
        {
          onSuccess: (respuesta) => {
            despachar({ tipo: "RESPUESTA", respuesta });
          },
          onError: (error) => {
            despachar({ tipo: "FALLO", mensaje: error.message || MENSAJES_ERROR_API.inesperado });
          },
        },
      );
    },
    [mutate, despachar, sessionId],
  );
  return { solicitar, cargando: isPending };
}

/**
 * Estado y acciones de la conversación con el agente: combina el reducer puro,
 * la mutación de TanStack Query y la sesión guardada en el navegador.
 * @returns estado y acciones
 */
export function useConversacion(): Conversacion {
  const [estado, despachar] = useReducer(reducirConversacion, undefined, () =>
    estadoInicial(leerSesionGuardada()),
  );
  const { solicitar, cargando } = useSolicitud(despachar, estado.sessionId);

  const enviar = useCallback(
    (texto: string) => {
      despachar({ tipo: "ENVIAR", texto });
      solicitar(texto);
    },
    [solicitar],
  );

  const reintentar = useCallback(() => {
    if (estado.ultimoMensaje === null) return;
    despachar({ tipo: "REINTENTAR" });
    solicitar(estado.ultimoMensaje);
  }, [solicitar, estado.ultimoMensaje]);

  const nuevaSesion = useCallback(() => {
    const id = nuevoIdSesion();
    guardarSesion(id);
    despachar({ tipo: "NUEVA_SESION", sessionId: id });
  }, []);

  return { estado, cargando, enviar, reintentar, nuevaSesion };
}
