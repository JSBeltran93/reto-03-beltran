/** Fuente de la hora actual, inyectable para que tests y demo sean deterministas. */
export interface Reloj {
  /** @returns el instante actual */
  ahora(): Date;
}

/** Reloj del sistema. */
export const relojSistema: Reloj = { ahora: () => new Date() };

/**
 * Crea un reloj que siempre devuelve el mismo instante.
 * @param iso - instante ISO-8601 a congelar
 * @returns reloj determinista
 */
export function relojFijo(iso: string): Reloj {
  const instante = new Date(iso);
  return { ahora: () => new Date(instante) };
}
