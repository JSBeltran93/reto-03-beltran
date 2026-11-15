import type { ResumenCaso } from "@contratos/contratos-api";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { obtenerCasos } from "../api/casos";

/** Clave de caché de la bandeja; se invalida después de cada respuesta del agente. */
export const CLAVE_CASOS = ["casos"] as const;

/**
 * Consulta la bandeja de solicitudes.
 * @returns estado de la consulta con los casos
 */
export function useCasos(): UseQueryResult<ResumenCaso[]> {
  return useQuery({ queryKey: CLAVE_CASOS, queryFn: obtenerCasos });
}
