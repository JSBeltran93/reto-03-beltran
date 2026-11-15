import axios, { AxiosError } from "axios";

/** Tiempo máximo de espera de una petición: el agente puede encadenar varios pasos con el modelo. */
export const TIEMPO_ESPERA_MS = 180_000;

/** Mensajes que se muestran al usuario cuando falla la comunicación con el servidor. */
export const MENSAJES_ERROR_API = {
  sinConexion: "No se pudo conectar con el servidor. Revisa tu conexión.",
  tiempoAgotado: "El servidor tardó demasiado en responder.",
  respuestaInvalida: "La respuesta del servidor no es válida.",
  cancelada: "La solicitud se canceló.",
  inesperado: "Ocurrió un error inesperado.",
  mensajeInvalido: "El mensaje está vacío o es demasiado largo.",
  respuestaServidor: (estado: number): string =>
    `El servidor respondió ${String(estado)}. Intenta de nuevo.`,
} as const;

/** Estados HTTP que usa el front para clasificar errores. */
export const ESTADOS_HTTP = {
  noEncontrado: 404,
  tiempoAgotado: 408,
  demasiadasSolicitudes: 429,
  errorServidor: 500,
} as const;

/** Estados 4xx que sí tiene sentido reintentar (tiempo de espera y límite de solicitudes). */
const ESTADOS_4XX_REINTENTABLES: readonly number[] = [
  ESTADOS_HTTP.tiempoAgotado,
  ESTADOS_HTTP.demasiadasSolicitudes,
];

/** Datos opcionales de un {@link ErrorApi}. */
export interface DetallesErrorApi {
  /** Estado HTTP, si el servidor respondió. */
  readonly estado?: number;
  /** Si reintentar la misma petición puede funcionar. */
  readonly reintentable: boolean;
  /** true si no hubo respuesta (red o tiempo agotado): el servidor pudo haber terminado el turno. */
  readonly sinRespuesta?: boolean;
}

/** Error de la API con un mensaje listo para mostrar al usuario. */
export class ErrorApi extends Error {
  override readonly name = "ErrorApi";
  readonly estado: number | undefined;
  readonly reintentable: boolean;
  readonly sinRespuesta: boolean;

  /**
   * @param mensaje - mensaje legible para el usuario
   * @param detalles - estado HTTP y si se puede reintentar
   */
  constructor(mensaje: string, detalles: DetallesErrorApi) {
    super(mensaje);
    this.estado = detalles.estado;
    this.reintentable = detalles.reintentable;
    this.sinRespuesta = detalles.sinRespuesta ?? false;
  }
}

function mensajeDelServidor(datos: unknown): string | null {
  const error = (datos as { error?: unknown } | null)?.error;
  return typeof error === "string" ? error : null;
}

function errorConRespuesta(estado: number, datos: unknown): ErrorApi {
  const esCliente = estado < ESTADOS_HTTP.errorServidor;
  const reintentable = !esCliente || ESTADOS_4XX_REINTENTABLES.includes(estado);
  const mensaje = mensajeDelServidor(datos) ?? MENSAJES_ERROR_API.respuestaServidor(estado);
  return new ErrorApi(mensaje, { estado, reintentable });
}

/**
 * Convierte cualquier error de la petición en un {@link ErrorApi} con mensaje en español.
 * @param error - error lanzado por axios u otro
 * @returns el error de la API
 */
export function convertirError(error: unknown): ErrorApi {
  if (error instanceof ErrorApi) return error;
  if (!(error instanceof AxiosError)) {
    return new ErrorApi(MENSAJES_ERROR_API.inesperado, { reintentable: true });
  }
  if (error.code === AxiosError.ERR_CANCELED) {
    return new ErrorApi(MENSAJES_ERROR_API.cancelada, { reintentable: true });
  }
  if (error.response) return errorConRespuesta(error.response.status, error.response.data);
  const agotado = error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT;
  const mensaje = agotado ? MENSAJES_ERROR_API.tiempoAgotado : MENSAJES_ERROR_API.sinConexion;
  return new ErrorApi(mensaje, { reintentable: true, sinRespuesta: true });
}

/** Instancia de axios para la API del agente (mismo origen que el front). */
export const clienteHttp = axios.create({
  baseURL: "",
  timeout: TIEMPO_ESPERA_MS,
  headers: { "Content-Type": "application/json" },
});

clienteHttp.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(convertirError(error)),
);
