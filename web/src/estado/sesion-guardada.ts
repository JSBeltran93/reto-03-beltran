import { EsquemaSolicitudChat } from "@contratos/contratos-api";

/** Clave de `localStorage` donde se recuerda la sesión del navegador. */
export const CLAVE_SESION = "oc-agente-sesion";

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

/**
 * Recupera la sesión guardada o crea una nueva si no hay o no es válida. Si el
 * almacenamiento no está disponible (modo privado), la sesión simplemente no se recuerda.
 * @returns identificador de sesión válido
 */
export function leerSesionGuardada(): string {
  try {
    const guardada = localStorage.getItem(CLAVE_SESION);
    if (esIdSesionValido(guardada)) return guardada;
  } catch {
    return nuevoIdSesion();
  }
  const nueva = nuevoIdSesion();
  guardarSesion(nueva);
  return nueva;
}
