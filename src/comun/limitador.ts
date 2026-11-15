import type { Reloj } from "./reloj";

/** Duración de la ventana del limitador, en milisegundos (un minuto). */
export const VENTANA_LIMITADOR_MS = 60_000;

/** Milisegundos por segundo (para el encabezado Retry-After). */
const MS_POR_SEGUNDO = 1000;

interface Ventana {
  inicio: number;
  solicitudes: number;
}

/**
 * Limitador de solicitudes por clave (p. ej. IP) con ventana fija en memoria.
 * Protege la clave del modelo de abuso desde el link público.
 */
export class LimitadorSolicitudes {
  private readonly ventanas = new Map<string, Ventana>();

  /**
   * @param maxPorVentana - solicitudes permitidas por clave en cada ventana
   * @param reloj - fuente de la hora (inyectable en tests)
   */
  constructor(
    private readonly maxPorVentana: number,
    private readonly reloj: Reloj,
  ) {}

  /**
   * Registra una solicitud y decide si se permite.
   * @param clave - identificador del cliente (IP)
   * @returns segundos a esperar si se excedió el límite, o 0 si se permite
   */
  registrar(clave: string): number {
    const ahora = this.reloj.ahora().getTime();
    const ventana = this.ventanas.get(clave);
    if (!ventana || ahora - ventana.inicio >= VENTANA_LIMITADOR_MS) {
      this.limpiarVencidas(ahora);
      this.ventanas.set(clave, { inicio: ahora, solicitudes: 1 });
      return 0;
    }
    ventana.solicitudes += 1;
    if (ventana.solicitudes <= this.maxPorVentana) return 0;
    return Math.ceil((ventana.inicio + VENTANA_LIMITADOR_MS - ahora) / MS_POR_SEGUNDO);
  }

  private limpiarVencidas(ahora: number): void {
    for (const [clave, ventana] of this.ventanas) {
      if (ahora - ventana.inicio >= VENTANA_LIMITADOR_MS) this.ventanas.delete(clave);
    }
  }
}
