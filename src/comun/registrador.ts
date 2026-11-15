/** Registrador estructurado del servidor; los tests inyectan la variante silenciosa. */
export interface Registrador {
  /**
   * Registra un evento informativo.
   * @param evento - nombre corto del evento
   * @param datos - contexto estructurado (nunca secretos)
   */
  info(evento: string, datos?: Record<string, unknown>): void;
  /**
   * Registra un evento de error.
   * @param evento - nombre corto del evento
   * @param datos - contexto estructurado (nunca secretos)
   */
  error(evento: string, datos?: Record<string, unknown>): void;
}

function escribir(nivel: "info" | "error", evento: string, datos?: Record<string, unknown>): void {
  const linea = JSON.stringify({ ts: new Date().toISOString(), nivel, evento, ...datos });
  if (nivel === "error") {
    console.error(linea);
  } else {
    console.log(linea);
  }
}

/** Registrador que escribe una línea JSON por evento en stdout/stderr. */
export const registradorJson: Registrador = {
  info: (evento, datos) => {
    escribir("info", evento, datos);
  },
  error: (evento, datos) => {
    escribir("error", evento, datos);
  },
};

/** Registrador que descarta todo (tests). */
export const registradorSilencioso: Registrador = {
  info: () => undefined,
  error: () => undefined,
};
