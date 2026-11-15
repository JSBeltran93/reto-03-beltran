import { QueryClient } from "@tanstack/react-query";

/** Reintentos de las consultas (la salud del servidor). */
const REINTENTOS_CONSULTAS = 1;

/**
 * Crea el cliente de TanStack Query de la aplicación.
 * Las mutaciones (mensajes al agente) no se reintentan para no duplicar acciones.
 * @returns cliente de consultas configurado
 */
export function crearClienteConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: REINTENTOS_CONSULTAS, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}
