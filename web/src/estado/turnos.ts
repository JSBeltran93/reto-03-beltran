import type { EntradaHistorial, VistaLlamada } from "@contratos/contratos-api";

/** Respuesta con la que cierra un turno del asistente: su texto o un error del sistema. */
export type RespuestaTurno = Extract<EntradaHistorial, { tipo: "asistente" | "error" }>;

/** Turno de la conversación: un mensaje del usuario o lo que hizo y respondió el asistente. */
export type Turno =
  | { readonly tipo: "usuario"; readonly texto: string }
  | {
      readonly tipo: "asistente";
      /** Llamadas a herramientas del turno, en orden. */
      readonly llamadas: readonly VistaLlamada[];
      /** Respuesta que cierra el turno (null si aún no llega o el historial se cortó). */
      readonly respuesta: RespuestaTurno | null;
    };

type TurnoAsistente = Extract<Turno, { tipo: "asistente" }>;

function turnoAbierto(turnos: readonly Turno[]): TurnoAsistente | null {
  const ultimo = turnos.at(-1);
  return ultimo?.tipo === "asistente" && ultimo.respuesta === null ? ultimo : null;
}

/**
 * Agrupa el historial en turnos: cada mensaje del usuario es un turno y todo lo que sigue
 * (llamadas a herramientas y la respuesta o el error) forma el turno del asistente.
 * @param entradas - historial
 * @returns turnos en orden
 */
export function agruparEnTurnos(entradas: readonly EntradaHistorial[]): Turno[] {
  const turnos: Turno[] = [];
  for (const entrada of entradas) {
    if (entrada.tipo === "usuario") {
      turnos.push({ tipo: "usuario", texto: entrada.texto });
      continue;
    }
    const abierto = turnoAbierto(turnos);
    const base = abierto ?? { tipo: "asistente" as const, llamadas: [], respuesta: null };
    const siguiente: TurnoAsistente =
      entrada.tipo === "herramienta"
        ? { ...base, llamadas: [...base.llamadas, entrada.llamada] }
        : { ...base, respuesta: entrada };
    if (abierto) turnos[turnos.length - 1] = siguiente;
    else turnos.push(siguiente);
  }
  return turnos;
}
