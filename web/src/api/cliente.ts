import axios, { AxiosError } from "axios";

/** Tiempo máximo de espera de una petición al servidor (el agente puede tardar varios pasos). */
export const TIEMPO_ESPERA_MS = 120_000;

/** Rutas de la API del servidor (PRD §6.4). */
export const RUTAS_API = {
  chat: "/api/chat",
  salud: "/api/health",
} as const;

/** Mensajes que se muestran al usuario cuando falla la comunicación con el servidor. */
export const MENSAJES_ERROR_API = {
  sinConexion: "No se pudo conectar con el servidor. Revisa tu conexión.",
  tiempoAgotado: "El servidor tardó demasiado en responder. Intenta de nuevo.",
  respuestaInvalida: "La respuesta del servidor no es válida.",
  inesperado: "Ocurrió un error inesperado.",
} as const;

/** Error de la API con un mensaje listo para mostrar al usuario. */
export class ErrorApi extends Error {
  override readonly name = "ErrorApi";
}

/**
 * Convierte un error de axios en un mensaje en español para el usuario.
 * @param error - error lanzado por axios
 * @returns mensaje legible
 */
export function mensajeDeError(error: unknown): string {
  if (!(error instanceof AxiosError)) return MENSAJES_ERROR_API.inesperado;
  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return MENSAJES_ERROR_API.tiempoAgotado;
  }
  if (error.response) {
    return `El servidor respondió ${String(error.response.status)}. Intenta de nuevo.`;
  }
  return MENSAJES_ERROR_API.sinConexion;
}

/** Instancia de axios para la API del agente (mismo origen que el front). */
export const clienteHttp = axios.create({
  baseURL: "",
  timeout: TIEMPO_ESPERA_MS,
  headers: { "Content-Type": "application/json" },
});

clienteHttp.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(new ErrorApi(mensajeDeError(error))),
);
