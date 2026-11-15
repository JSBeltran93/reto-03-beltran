import { EsquemaListaCasos, type ResumenCaso } from "@contratos/contratos-api";
import { RUTAS_API } from "@contratos/rutas-api";

import { clienteHttp, ErrorApi, MENSAJES_ERROR_API } from "./cliente";

/**
 * Consulta la bandeja de solicitudes con su estado.
 * @returns los casos, en el orden de sus carpetas
 * @throws ErrorApi si el servidor no responde o la respuesta no cumple el contrato
 */
export async function obtenerCasos(): Promise<ResumenCaso[]> {
  const { data } = await clienteHttp.get<unknown>(RUTAS_API.casos);
  const validada = EsquemaListaCasos.safeParse(data);
  if (!validada.success) {
    throw new ErrorApi(MENSAJES_ERROR_API.respuestaInvalida, { reintentable: true });
  }
  return validada.data.casos;
}
