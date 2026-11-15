import { EsquemaSolicitudChat } from "@contratos/contratos-api";
import { z } from "zod";

/** Clave de `localStorage` donde se recuerda la sesión del navegador. */
export const CLAVE_SESION = "oc-agente-sesion";

/** Clave de `localStorage` donde se recuerda la sesión de cada caso (caso → sessionId). */
export const CLAVE_SESIONES_POR_CASO = "oc-agente-sesiones-por-caso";

/** Sesión de chat de cada caso de la bandeja: cada caso tiene su propia conversación. */
export type SesionesPorCaso = Readonly<Record<string, string>>;

const EsquemaSesionesPorCaso = z.record(z.string(), EsquemaSolicitudChat.shape.sessionId);

/**
 * Genera un identificador de sesión nuevo.
 * @returns UUID aleatorio
 */
export function nuevoIdSesion(): string {
  return crypto.randomUUID();
}

/**
 * Indica si un identificador guardado cumple el contrato de la API.
 * @param id - valor leído del almacenamiento
 * @returns true si es un identificador de sesión válido
 */
export function esIdSesionValido(id: string | null): id is string {
  return EsquemaSolicitudChat.shape.sessionId.safeParse(id).success;
}

/**
 * Guarda la sesión actual, ignorando un almacenamiento no disponible.
 * @param id - identificador de sesión
 */
export function guardarSesion(id: string): void {
  try {
    localStorage.setItem(CLAVE_SESION, id);
  } catch {
    // Sin almacenamiento disponible la sesión no se recuerda; no es un error para el usuario.
  }
}

/** Sesión con la que arranca la página. */
export interface SesionInicial {
  readonly id: string;
  /** true si se creó ahora: el servidor aún no la conoce y no hay historial que pedir. */
  readonly nueva: boolean;
}

/**
 * Recupera la sesión guardada o crea una nueva si no hay o no es válida. Si el
 * almacenamiento no está disponible (modo privado), la sesión simplemente no se recuerda.
 * @returns identificador de sesión válido y si es nueva
 */
export function leerSesionInicial(): SesionInicial {
  try {
    const guardada = localStorage.getItem(CLAVE_SESION);
    if (esIdSesionValido(guardada)) return { id: guardada, nueva: false };
  } catch {
    return { id: nuevoIdSesion(), nueva: true };
  }
  const nueva = nuevoIdSesion();
  guardarSesion(nueva);
  return { id: nueva, nueva: true };
}

/**
 * Lee la sesión recordada de cada caso; si no hay, no es válida o no hay almacenamiento,
 * devuelve un mapa vacío.
 * @returns mapa caso → sessionId
 */
export function leerSesionesPorCaso(): SesionesPorCaso {
  try {
    const crudo = localStorage.getItem(CLAVE_SESIONES_POR_CASO);
    if (crudo === null) return {};
    const validado = EsquemaSesionesPorCaso.safeParse(JSON.parse(crudo));
    return validado.success ? validado.data : {};
  } catch {
    return {};
  }
}

/**
 * Recuerda la sesión de un caso, ignorando un almacenamiento no disponible.
 * @param caso - carpeta del caso
 * @param id - identificador de la sesión de ese caso
 */
export function recordarSesionDeCaso(caso: string, id: string): void {
  try {
    const mapa = { ...leerSesionesPorCaso(), [caso]: id };
    localStorage.setItem(CLAVE_SESIONES_POR_CASO, JSON.stringify(mapa));
  } catch {
    // Sin almacenamiento disponible la sesión del caso no se recuerda; no es un error para el usuario.
  }
}

/**
 * Busca el caso al que pertenece una sesión.
 * @param id - identificador de la sesión
 * @param mapa - sesiones recordadas por caso (por defecto, las del almacenamiento)
 * @returns el caso, o null si la sesión no es de ningún caso
 */
export function casoDeSesion(
  id: string,
  mapa: SesionesPorCaso = leerSesionesPorCaso(),
): string | null {
  return Object.entries(mapa).find(([, sesion]) => sesion === id)?.[0] ?? null;
}
