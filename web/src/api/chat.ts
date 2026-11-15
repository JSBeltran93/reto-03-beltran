import {
  EsquemaRespuestaChat,
  EsquemaVistaSesion,
  type RespuestaChat,
  type SolicitudChat,
  type VistaSesion,
} from "@contratos/contratos-api";
import { RUTAS_API } from "@contratos/rutas-api";

import { clienteHttp, ErrorApi, ESTADOS_HTTP, MENSAJES_ERROR_API } from "./cliente";

function respuestaInvalida(): ErrorApi {
  return new ErrorApi(MENSAJES_ERROR_API.respuestaInvalida, { reintentable: false });
}

/**
 * Envía un mensaje al agente.
 * @param solicitud - identificador de sesión y mensaje del usuario
 * @returns respuesta del agente, llamadas a herramientas y si espera confirmación
 * @throws ErrorApi si la petición falla o la respuesta no cumple el contrato
 */
export async function enviarMensaje(solicitud: SolicitudChat): Promise<RespuestaChat> {
  const { data } = await clienteHttp.post<unknown>(RUTAS_API.chat, solicitud);
  const validada = EsquemaRespuestaChat.safeParse(data);
  if (!validada.success) throw respuestaInvalida();
  return validada.data;
}

/**
 * Obtiene el historial y el estado de confirmación que el servidor guarda para una sesión.
 * @param sessionId - identificador de la sesión
 * @returns la sesión, o null si el servidor no la conoce (404)
 * @throws ErrorApi si la petición falla o la respuesta no cumple el contrato
 */
export async function obtenerSesion(sessionId: string): Promise<VistaSesion | null> {
  try {
    const { data } = await clienteHttp.get<unknown>(RUTAS_API.sesion(sessionId));
    const validada = EsquemaVistaSesion.safeParse(data);
    if (!validada.success) throw respuestaInvalida();
    return validada.data;
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === ESTADOS_HTTP.noEncontrado) return null;
    throw error;
  }
}
