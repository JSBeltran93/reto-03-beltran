import { useCallback, useState } from "react";

import { mensajeProcesar } from "../componentes/textos";
import { type Navegacion, useNavegacion } from "./navegacion";
import {
  casoDeSesion,
  leerSesionesPorCaso,
  nuevoIdSesion,
  recordarSesionDeCaso,
  type SesionesPorCaso,
} from "./sesion-guardada";
import type { Conversacion } from "./useConversacion";

/** Lo que importa de la sesión abierta para decidir la sesión de un caso. */
export interface SesionAbierta {
  readonly sessionId: string;
  /** true si la conversación no tiene mensajes. */
  readonly vacia: boolean;
  /** Caso cuya OC espera confirmación en esta sesión (null si no hay). */
  readonly casoPendiente: string | null;
}

/**
 * Elige la sesión de un caso: cada caso tiene su propia conversación (PRD §11: "sesión
 * nueva" por caso). Una sesión abierta que no es de ningún caso se adopta si espera la
 * confirmación de ese caso (no se pierde de vista) o si está vacía.
 * @param caso - caso elegido
 * @param abierta - sesión abierta ahora
 * @param mapa - sesiones recordadas por caso
 * @returns el identificador de la sesión del caso (recordada, adoptada o nueva)
 */
export function sesionParaCaso(
  caso: string,
  abierta: SesionAbierta,
  mapa: SesionesPorCaso,
): string {
  const libre = casoDeSesion(abierta.sessionId, mapa) === null;
  if (libre && abierta.casoPendiente === caso) return abierta.sessionId;
  const recordada = mapa[caso];
  if (recordada !== undefined) return recordada;
  return libre && abierta.vacia ? abierta.sessionId : nuevoIdSesion();
}

/** Navegación con una conversación por caso y las acciones que dependen del caso. */
export interface SesionesPorCasoApi extends Navegacion {
  /** Caso abierto: el seleccionado o, si no hay, el que espera confirmación. */
  readonly casoActivo: string | null;
  /** Envía el mensaje del PRD §11 para el caso en su propia sesión. */
  readonly procesar: (caso: string) => void;
  /** Inicia una sesión nueva; si hay un caso seleccionado, pasa a ser la de ese caso. */
  readonly nuevaSesion: () => void;
}

/**
 * Une la navegación de la bandeja con la conversación: al elegir un caso se abre su
 * sesión (y su historial); así nunca se mezclan casos en una misma conversación. Mientras
 * el agente trabaja no se cambia de caso. Al recargar se vuelve a seleccionar el caso de
 * la sesión restaurada.
 * @param conversacion - conversación con el agente
 * @returns navegación, caso activo y acciones
 */
export function useSesionesPorCaso(conversacion: Conversacion): SesionesPorCasoApi {
  const { estado, abrirSesion, enviar, nuevaSesion: nuevaSesionConversacion } = conversacion;
  const [inicial] = useState(() => casoDeSesion(estado.sessionId));
  const navegacion = useNavegacion(inicial);
  const { seleccionado, seleccionar: mostrarCaso } = navegacion;

  const seleccionar = useCallback(
    (caso: string) => {
      const abierta = {
        sessionId: estado.sessionId,
        vacia: estado.entradas.length === 0,
        casoPendiente: estado.casoPendiente,
      };
      const id = sesionParaCaso(caso, abierta, leerSesionesPorCaso());
      if (id !== estado.sessionId && !abrirSesion(id)) return;
      recordarSesionDeCaso(caso, id);
      mostrarCaso(caso);
    },
    [estado.sessionId, estado.entradas.length, estado.casoPendiente, abrirSesion, mostrarCaso],
  );

  const procesar = useCallback(
    (caso: string) => {
      if (casoDeSesion(estado.sessionId) === null) recordarSesionDeCaso(caso, estado.sessionId);
      enviar(mensajeProcesar(caso));
    },
    [estado.sessionId, enviar],
  );

  const nuevaSesion = useCallback(() => {
    const id = nuevaSesionConversacion();
    if (id !== null && seleccionado !== null) recordarSesionDeCaso(seleccionado, id);
  }, [nuevaSesionConversacion, seleccionado]);

  const casoActivo = seleccionado ?? estado.casoPendiente;
  return { ...navegacion, seleccionar, casoActivo, procesar, nuevaSesion };
}
