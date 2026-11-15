import type { EntradaHistorial } from "../comun/contratos-api";
import type { MensajeLlm } from "../llm/adapter";
import type { EstadoConfirmacion } from "./confirmacion";

/** Estado de la conversación que se guarda en memoria por sesión. */
export interface Sesion {
  readonly id: string;
  readonly mensajes: MensajeLlm[];
  readonly historial: EntradaHistorial[];
  readonly confirmacion: EstadoConfirmacion;
  tokensUsados: number;
}

/** Límites del almacén de sesiones. */
export interface LimitesSesiones {
  readonly maxSesiones: number;
  readonly maxTokensDia: number;
}

/**
 * Almacén de sesiones en memoria con tope de sesiones (se descarta la usada hace más
 * tiempo, LRU) y presupuesto diario de tokens compartido, para que el link público no
 * agote la clave.
 */
export class AlmacenSesiones {
  private readonly sesiones = new Map<string, Sesion>();
  private dia = "";
  private tokensDelDia = 0;

  /** @param limites - máximo de sesiones y presupuesto diario de tokens */
  constructor(private readonly limites: LimitesSesiones) {}

  /**
   * Devuelve una sesión y la crea si no existe.
   * @param id - identificador enviado por el front
   * @returns la sesión
   */
  obtenerOCrear(id: string): Sesion {
    const existente = this.obtener(id);
    if (existente) return existente;
    if (this.sesiones.size >= this.limites.maxSesiones) {
      const menosReciente = this.sesiones.keys().next().value;
      if (menosReciente !== undefined) this.sesiones.delete(menosReciente);
    }
    const nueva: Sesion = {
      id,
      mensajes: [],
      historial: [],
      confirmacion: { pendientes: [], otorgada: null },
      tokensUsados: 0,
    };
    this.sesiones.set(id, nueva);
    return nueva;
  }

  /**
   * @param id - identificador de la sesión
   * @returns la sesión, o undefined
   */
  obtener(id: string): Sesion | undefined {
    const sesion = this.sesiones.get(id);
    if (sesion) {
      // Reinsertar la mueve al final: el Map queda ordenado de menos a más reciente (LRU).
      this.sesiones.delete(id);
      this.sesiones.set(id, sesion);
    }
    return sesion;
  }

  /**
   * Suma tokens a la sesión y al presupuesto del día.
   * @param sesion - sesión que los consumió
   * @param tokens - tokens de entrada + salida
   * @param hoy - fecha actual (YYYY-MM-DD)
   */
  registrarTokens(sesion: Sesion, tokens: number, hoy: string): void {
    this.reiniciarSiCambioDia(hoy);
    sesion.tokensUsados += tokens;
    this.tokensDelDia += tokens;
  }

  /**
   * @param hoy - fecha actual (YYYY-MM-DD)
   * @returns true si se agotó el presupuesto diario
   */
  presupuestoDiarioAgotado(hoy: string): boolean {
    this.reiniciarSiCambioDia(hoy);
    return this.tokensDelDia >= this.limites.maxTokensDia;
  }

  private reiniciarSiCambioDia(hoy: string): void {
    if (hoy !== this.dia) {
      this.dia = hoy;
      this.tokensDelDia = 0;
    }
  }
}
