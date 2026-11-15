import type { Resultado } from "../comun/resultado";

/** Llamada a herramienta pedida por el modelo. */
export interface LlamadaHerramienta {
  readonly id: string;
  readonly nombre: string;
  readonly args: unknown;
}

/** Resultado de una llamada a herramienta que se devuelve al modelo. */
export interface ResultadoHerramienta {
  readonly id: string;
  readonly contenido: string;
  readonly error: boolean;
}

/**
 * Mensaje de conversación neutral al proveedor. `bruto` conserva el contenido
 * propio del proveedor (p. ej. bloques de razonamiento) para reenviarlo sin cambios.
 */
export type MensajeLlm =
  | { readonly rol: "sistema"; readonly contenido: string }
  | { readonly rol: "usuario"; readonly contenido: string }
  | {
      readonly rol: "asistente";
      readonly texto: string;
      readonly llamadas: readonly LlamadaHerramienta[];
      readonly bruto?: unknown;
    }
  | { readonly rol: "resultados"; readonly resultados: readonly ResultadoHerramienta[] };

/** Descripción de una herramienta en JSON Schema, tal como la ve el modelo. */
export interface HerramientaLlm {
  readonly nombre: string;
  readonly descripcion: string;
  readonly esquema: Record<string, unknown>;
}

/** Motivo por el que el modelo terminó su respuesta. */
export type FinRespuesta = "final" | "herramientas" | "limite" | "rechazo";

/** Opciones de una consulta al modelo. */
export interface OpcionesEnvio {
  /**
   * true para que el modelo responda solo con texto: las herramientas se envían igual
   * (cambiarlas invalidaría el historial y la caché) pero no puede llamarlas.
   */
  readonly sinLlamadas?: boolean;
  /** Señal para cancelar la consulta cuando se agota el plazo del turno. */
  readonly senal?: AbortSignal;
}

/** Respuesta del modelo en forma neutral. */
export interface RespuestaLlm {
  readonly texto: string;
  readonly llamadas: readonly LlamadaHerramienta[];
  readonly uso: { readonly entrada: number; readonly salida: number };
  readonly fin: FinRespuesta;
  readonly bruto?: unknown;
}

/**
 * Adaptador LLM del PRD §6.1: interfaz propia `enviar(mensajes, herramientas) → respuesta`.
 * Cambiar de proveedor es agregar una implementación; el ciclo del agente no cambia.
 * Las implementaciones nunca lanzan: los errores del proveedor vuelven como códigos LLM_*.
 */
export interface AdaptadorLlm {
  /** Nombre del proveedor (se expone en /api/health). */
  readonly proveedor: string;
  /** Identificador del modelo (se expone en /api/health). */
  readonly modelo: string;
  /**
   * Envía la conversación y las herramientas disponibles al modelo.
   * @param mensajes - conversación, empezando por el system prompt
   * @param herramientas - herramientas que el modelo puede llamar
   * @param opciones - p. ej. `sinLlamadas` para forzar una respuesta solo de texto
   * @returns la respuesta del modelo o un error LLM_*
   */
  enviar(
    mensajes: readonly MensajeLlm[],
    herramientas: readonly HerramientaLlm[],
    opciones?: OpcionesEnvio,
  ): Promise<Resultado<RespuestaLlm>>;
}
