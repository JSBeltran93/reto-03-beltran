import axios, { AxiosError } from "axios";

/**
 * Tiempo máximo de espera de una petición al chat. Debe superar el plazo total de un
 * turno en el servidor (`MAX_SEGUNDOS_TURNO`, 240 s por defecto) más un margen de red,
 * para que el front no se rinda antes de que el servidor termine el turno.
 */
export const TIEMPO_ESPERA_MS = 270_000;

/** Cabecera HTTP con los segundos que hay que esperar tras un 429. */
const CABECERA_REINTENTAR_DESPUES = "retry-after";

/** Mensajes que se muestran al usuario cuando falla la comunicación con el servidor. */
export const MENSAJES_ERROR_API = {
  sinConexion:
    "No pude conectar con el asistente. Revisa tu conexión y reintenta en unos segundos.",
  tiempoAgotado: "El asistente se está demorando más de lo normal. Reintenta en unos segundos.",
  respuestaInvalida: "Recibí una respuesta que no pude leer. Reintenta en unos segundos.",
  cancelada: "Se canceló el envío. Puedes volver a intentarlo.",
  inesperado: "Algo salió mal de nuestro lado. Reintenta en unos segundos.",
  mensajeInvalido: "Tu mensaje está vacío o es muy largo. Ajústalo y vuelve a enviarlo.",
  respuestaServidor: (estado: number): string =>
    `Algo falló de nuestro lado (código ${String(estado)}). Reintenta en unos segundos.`,
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
  /** Segundos a esperar antes de reintentar (cabecera `Retry-After` de un 429). */
  readonly esperaSegundos?: number;
}

/** Error de la API con un mensaje listo para mostrar al usuario. */
export class ErrorApi extends Error {
  override readonly name = "ErrorApi";
  readonly estado: number | undefined;
  readonly reintentable: boolean;
  readonly sinRespuesta: boolean;
  readonly esperaSegundos: number | undefined;

  /**
   * @param mensaje - mensaje legible para el usuario
   * @param detalles - estado HTTP y si se puede reintentar
   */
  constructor(mensaje: string, detalles: DetallesErrorApi) {
    super(mensaje);
    this.estado = detalles.estado;
    this.reintentable = detalles.reintentable;
    this.sinRespuesta = detalles.sinRespuesta ?? false;
    this.esperaSegundos = detalles.esperaSegundos;
  }
}

function mensajeDelServidor(datos: unknown): string | null {
  const error = (datos as { error?: unknown } | null)?.error;
  return typeof error === "string" ? error : null;
}

/**
 * Lee la cabecera `Retry-After` (en segundos) de una respuesta.
 * @param cabeceras - cabeceras de la respuesta de axios
 * @returns los segundos a esperar, o undefined si no viene o no es un número
 */
export function segundosParaReintentar(cabeceras: unknown): number | undefined {
  const valor = (cabeceras as Record<string, unknown> | null)?.[CABECERA_REINTENTAR_DESPUES];
  const segundos = Number(valor);
  return valor !== undefined && Number.isFinite(segundos) && segundos > 0 ? segundos : undefined;
}

function errorConRespuesta(estado: number, datos: unknown, cabeceras: unknown): ErrorApi {
  const esCliente = estado < ESTADOS_HTTP.errorServidor;
  const reintentable = !esCliente || ESTADOS_4XX_REINTENTABLES.includes(estado);
  const mensaje = mensajeDelServidor(datos) ?? MENSAJES_ERROR_API.respuestaServidor(estado);
  const esperaSegundos =
    estado === ESTADOS_HTTP.demasiadasSolicitudes ? segundosParaReintentar(cabeceras) : undefined;
  return new ErrorApi(mensaje, {
    estado,
    reintentable,
    ...(esperaSegundos !== undefined && { esperaSegundos }),
  });
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
  if (error.response) {
    const datos: unknown = error.response.data;
    const cabeceras: unknown = error.response.headers;
    return errorConRespuesta(error.response.status, datos, cabeceras);
  }
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
