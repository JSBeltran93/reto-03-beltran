import { EsquemaSalud, type Salud } from "@contratos/contratos-api";
import { RUTAS_API } from "@contratos/rutas-api";

import { clienteHttp, ErrorApi, MENSAJES_ERROR_API } from "./cliente";

/**
 * Consulta el estado del servidor.
 * @returns proveedor y modelo configurados
 * @throws ErrorApi si el servidor no responde o la respuesta no cumple el contrato
 */
export async function obtenerSalud(): Promise<Salud> {
  const { data } = await clienteHttp.get<unknown>(RUTAS_API.salud);
  const validada = EsquemaSalud.safeParse(data);
  if (!validada.success) {
    throw new ErrorApi(MENSAJES_ERROR_API.respuestaInvalida, { reintentable: false });
  }
  return validada.data;
}
