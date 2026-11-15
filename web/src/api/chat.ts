import {
  EsquemaRespuestaChat,
  EsquemaSalud,
  type RespuestaChat,
  type Salud,
  type SolicitudChat,
} from "@contratos/contratos-api";

import { clienteHttp, ErrorApi, MENSAJES_ERROR_API, RUTAS_API } from "./cliente";

/**
 * Envía un mensaje al agente.
 * @param solicitud - identificador de sesión y mensaje del usuario
 * @returns respuesta del agente, llamadas a herramientas y si espera confirmación
 * @throws ErrorApi si la petición falla o la respuesta no cumple el contrato
 */
export async function enviarMensaje(solicitud: SolicitudChat): Promise<RespuestaChat> {
  const { data } = await clienteHttp.post<unknown>(RUTAS_API.chat, solicitud);
  const validada = EsquemaRespuestaChat.safeParse(data);
  if (!validada.success) throw new ErrorApi(MENSAJES_ERROR_API.respuestaInvalida);
  return validada.data;
}

/**
 * Consulta el estado del servidor.
 * @returns proveedor y modelo configurados
 * @throws ErrorApi si el servidor no responde o la respuesta no cumple el contrato
 */
export async function obtenerSalud(): Promise<Salud> {
  const { data } = await clienteHttp.get<unknown>(RUTAS_API.salud);
  const validada = EsquemaSalud.safeParse(data);
  if (!validada.success) throw new ErrorApi(MENSAJES_ERROR_API.respuestaInvalida);
  return validada.data;
}
