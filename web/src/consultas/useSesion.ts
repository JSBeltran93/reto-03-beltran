import type { VistaSesion } from "@contratos/contratos-api";
import { type QueryClient, useQuery, type UseQueryResult } from "@tanstack/react-query";

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
 * Deja en caché una sesión recién creada en el cliente como "sin historial": el servidor
 * aún no la conoce, así que no se pide (evita un 404 esperado en cada sesión nueva).
 * @param clienteConsultas - cliente de TanStack Query
 * @param sessionId - identificador de la sesión nueva
 */
export function marcarSesionNueva(clienteConsultas: QueryClient, sessionId: string): void {
  clienteConsultas.setQueryData<VistaSesion | null>(claveSesion(sessionId), null);
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
