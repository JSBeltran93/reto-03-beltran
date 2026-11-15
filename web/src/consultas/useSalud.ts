import type { Salud } from "@contratos/contratos-api";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { obtenerSalud } from "../api/salud";

/** Clave de caché de la consulta de salud. */
export const CLAVE_SALUD = ["salud"] as const;

/**
 * Consulta la salud del servidor una vez al cargar la página.
 * @returns estado de la consulta con proveedor y modelo
 */
export function useSalud(): UseQueryResult<Salud> {
  return useQuery({ queryKey: CLAVE_SALUD, queryFn: obtenerSalud, staleTime: Infinity });
}
