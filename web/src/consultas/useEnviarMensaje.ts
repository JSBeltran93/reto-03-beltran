import type { RespuestaChat, SolicitudChat } from "@contratos/contratos-api";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { enviarMensaje } from "../api/chat";

/**
 * Mutación que envía un mensaje al agente.
 * @returns mutación de TanStack Query sobre `enviarMensaje`
 */
export function useEnviarMensaje(): UseMutationResult<RespuestaChat, Error, SolicitudChat> {
  return useMutation({ mutationFn: enviarMensaje });
}
