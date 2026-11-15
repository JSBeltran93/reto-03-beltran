/** Rutas de la API HTTP (PRD §6.4), compartidas por el servidor y el front (alias `@contratos`). */
export const RUTAS_API = {
  /** POST: un turno del chat. */
  chat: "/api/chat",
  /**
   * GET: historial de una sesión.
   * @param id - identificador de la sesión
   * @returns ruta concreta de la sesión
   */
  sesion: (id: string): string => `/api/sessions/${encodeURIComponent(id)}`,
  /** Patrón de Express para la ruta de sesión. */
  sesionPatron: "/api/sessions/:id",
  /** GET: estado del servidor sin secretos. */
  salud: "/api/health",
  casos: "/api/casos",
  /** Patrón de Express para cualquier ruta de la API no definida (responde 404). */
  desconocidaPatron: "/api/{*splat}",
} as const;
