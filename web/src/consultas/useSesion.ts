import type { VistaSesion } from "@contratos/contratos-api";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { obtenerSesion } from "../api/chat";

/**
 * Clave de caché del historial de una sesión.
 * @param sessionId - identificador de la sesión
 * @returns clave de TanStack Query
 */
export function claveSesion(sessionId: string): readonly ["sesion", string] {
  return ["sesion", sessionId] as const;
}

/**
 * Lee el historial que el servidor guarda para la sesión (para rehidratar al recargar).
 * No se vuelve a pedir solo: se refresca explícitamente cuando una respuesta se pierde.
 * @param sessionId - identificador de la sesión
 * @returns consulta con el historial y el estado de confirmación, o null si el servidor no conoce la sesión
 */
export function useSesion(sessionId: string): UseQueryResult<VistaSesion | null> {
  return useQuery({
    queryKey: claveSesion(sessionId),
    queryFn: () => obtenerSesion(sessionId),
    staleTime: Infinity,
    retry: false,
  });
}
