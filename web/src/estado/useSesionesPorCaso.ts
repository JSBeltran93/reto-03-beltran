import { useCallback } from "react";

import { mensajeProcesar } from "../componentes/textos";
import { casosDeHistorial } from "./resultados";
import { leerSesionesPorCaso, recordarSesionDeCaso, type SesionesPorCaso } from "./sesion-guardada";
import type { Conversacion } from "./useConversacion";

/** Lo que importa de la conversación abierta para decidir dónde se trata un caso. */
export interface SesionAbierta {
  readonly sessionId: string;
  /** true si la conversación no tiene mensajes. */
  readonly vacia: boolean;
  /** Casos sobre los que el agente ya trabajó en esta conversación. */
  readonly casos: readonly string[];
}

/** Qué hacer al elegir una solicitud en el panel "Solicitudes". */
export type Apertura =
  /** La conversación abierta ya trata el caso: se queda en ella. */
  | { readonly tipo: "seguir" }
  /** El caso tiene otra conversación recordada: se vuelve a ella (con su historial). */
  | { readonly tipo: "volver"; readonly sessionId: string }
  /** La conversación abierta está vacía: se procesa el caso en ella. */
  | { readonly tipo: "procesarAqui" }
  /** Se procesa el caso en una conversación nueva (PRD §11: "sesión nueva"). */
  | { readonly tipo: "procesarEnNueva" };

/**
 * Decide dónde se trata un caso elegido en "Solicitudes", sin mezclar casos en una misma
 * conversación salvo que la analista lo haya hecho escribiendo.
 * @param caso - caso elegido
 * @param abierta - conversación abierta ahora
 * @param mapa - última conversación recordada de cada caso
 * @returns la apertura
 */
export function aperturaDeCaso(
  caso: string,
  abierta: SesionAbierta,
  mapa: SesionesPorCaso,
): Apertura {
  if (abierta.casos.includes(caso)) return { tipo: "seguir" };
  const recordada = mapa[caso];
  if (recordada !== undefined && recordada !== abierta.sessionId) {
    return { tipo: "volver", sessionId: recordada };
  }
  if (abierta.vacia) return { tipo: "procesarAqui" };
  return recordada === abierta.sessionId ? { tipo: "seguir" } : { tipo: "procesarEnNueva" };
}

/** Acciones que unen las solicitudes con las conversaciones. */
export interface SesionesPorCasoApi {
  /** Abre la conversación de un caso o empieza una con el mensaje del PRD §11. */
  readonly abrirCaso: (caso: string) => void;
  /** Envía un mensaje sobre un caso en la conversación abierta y la recuerda para ese caso. */
  readonly enviarSobreCaso: (caso: string, texto: string) => void;
}

/**
 * Une las solicitudes con la conversación: cada caso recuerda su última conversación
 * para volver a ella desde "Solicitudes".
 * @param conversacion - conversación con el agente
 * @returns las acciones
 */
export function useSesionesPorCaso(conversacion: Conversacion): SesionesPorCasoApi {
  const { estado, abrirSesion, enviar, nuevaSesion } = conversacion;
  const { sessionId, entradas } = estado;

  const abrirCaso = useCallback(
    (caso: string) => {
      const abierta = {
        sessionId,
        vacia: entradas.length === 0,
        casos: casosDeHistorial(entradas),
      };
      const apertura = aperturaDeCaso(caso, abierta, leerSesionesPorCaso());
      switch (apertura.tipo) {
        case "seguir":
          recordarSesionDeCaso(caso, sessionId);
          return;
        case "volver":
          abrirSesion(apertura.sessionId);
          return;
        case "procesarAqui":
          recordarSesionDeCaso(caso, sessionId);
          enviar(mensajeProcesar(caso));
          return;
        case "procesarEnNueva": {
          const id = nuevaSesion(mensajeProcesar(caso));
          if (id !== null) recordarSesionDeCaso(caso, id);
        }
      }
    },
    [sessionId, entradas, abrirSesion, enviar, nuevaSesion],
  );

  const enviarSobreCaso = useCallback(
    (caso: string, texto: string) => {
      recordarSesionDeCaso(caso, sessionId);
      enviar(texto);
    },
    [sessionId, enviar],
  );

  return { abrirCaso, enviarSobreCaso };
}
