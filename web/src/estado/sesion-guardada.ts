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
 * Recupera la sesión guardada o crea una nueva. Si el almacenamiento no está
 * disponible (modo privado), la sesión simplemente no se recuerda.
 * @returns identificador de sesión
 */
export function leerSesionGuardada(): string {
  try {
    const guardada = localStorage.getItem(CLAVE_SESION);
    if (guardada) return guardada;
    const nueva = nuevoIdSesion();
    localStorage.setItem(CLAVE_SESION, nueva);
    return nueva;
  } catch {
    return nuevoIdSesion();
  }
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
