import type { RespuestaChat, SolicitudChat } from "@contratos/contratos-api";
import { useMutation, type UseMutationResult, useQueryClient } from "@tanstack/react-query";

import { enviarMensaje } from "../api/chat";
import { CLAVE_CASOS } from "./useCasos";

/**
 * Mutación que envía un mensaje al agente. Al terminar (con o sin error) refresca la
 * bandeja, porque el turno pudo validar, dejar pendiente o crear una OC.
 * @returns mutación de TanStack Query sobre `enviarMensaje`
 */
export function useEnviarMensaje(): UseMutationResult<RespuestaChat, Error, SolicitudChat> {
  const clienteConsultas = useQueryClient();
  return useMutation({
    mutationFn: enviarMensaje,
    onSettled: () => clienteConsultas.invalidateQueries({ queryKey: CLAVE_CASOS }),
  });
}
