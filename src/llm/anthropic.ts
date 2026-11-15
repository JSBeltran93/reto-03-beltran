import Anthropic from "@anthropic-ai/sdk";

import type { CodigoError } from "../comun/errores";
import { exito, type Resultado } from "../comun/resultado";
import type {
  AdaptadorLlm,
  FinRespuesta,
  HerramientaLlm,
  LlamadaHerramienta,
  MensajeLlm,
  OpcionesEnvio,
  RespuestaLlm,
} from "./adapter";

const MAX_TOKENS_RESPUESTA = 16_000;

/** Reintentos automáticos del SDK ante errores transitorios (429, 5xx, red). */
const REINTENTOS_LLM = 2;

/** Esfuerzo de razonamiento: las decisiones de negocio son deterministas, basta esfuerzo bajo. */
const ESFUERZO_LLM = "low";

/** Opciones del adaptador de Anthropic (los valores vienen de la configuración). */
export interface OpcionesAnthropic {
  readonly apiKey: string;
  readonly modelo: string;
  readonly timeoutMs: number;
}

const FINES: Partial<Record<Anthropic.StopReason, FinRespuesta>> = {
  tool_use: "herramientas",
  max_tokens: "limite",
  model_context_window_exceeded: "limite",
  refusal: "rechazo",
};

/**
 * Contenido de un turno del asistente: el original del proveedor si existe (conserva
 * los bloques de razonamiento); si no, se arma con el texto y las llamadas.
 */
function contenidoAsistente(
  mensaje: Extract<MensajeLlm, { rol: "asistente" }>,
): Anthropic.ContentBlockParam[] {
  if (Array.isArray(mensaje.bruto)) return mensaje.bruto as Anthropic.ContentBlockParam[];
  const texto: Anthropic.ContentBlockParam[] = mensaje.texto
    ? [{ type: "text", text: mensaje.texto }]
    : [];
  const llamadas: Anthropic.ContentBlockParam[] = mensaje.llamadas.map((l) => ({
    type: "tool_use",
    id: l.id,
    name: l.nombre,
    input: l.args,
  }));
  return [...texto, ...llamadas];
}

function aMensajeAnthropic(mensaje: MensajeLlm): Anthropic.MessageParam | null {
  switch (mensaje.rol) {
    case "sistema":
      return null;
    case "usuario":
      return { role: "user", content: mensaje.contenido };
    case "asistente":
      return { role: "assistant", content: contenidoAsistente(mensaje) };
    case "resultados":
      return {
        role: "user",
        content: mensaje.resultados.map((r) => ({
          type: "tool_result" as const,
          tool_use_id: r.id,
          content: r.contenido,
          is_error: r.error,
        })),
      };
  }
}

function aHerramientasAnthropic(herramientas: readonly HerramientaLlm[]): Anthropic.Tool[] {
  return herramientas.map((h, i) => ({
    name: h.nombre,
    description: h.descripcion,
    input_schema: h.esquema as Anthropic.Tool.InputSchema,
    ...(i === herramientas.length - 1 && { cache_control: { type: "ephemeral" as const } }),
  }));
}

/**
 * Tokens de entrada facturables: los nuevos más los escritos y leídos de la caché,
 * para que el presupuesto por sesión y por día no cuente de menos.
 */
function tokensEntrada(uso: Anthropic.Usage): number {
  return (
    uso.input_tokens + (uso.cache_creation_input_tokens ?? 0) + (uso.cache_read_input_tokens ?? 0)
  );
}

function aRespuesta(mensaje: Anthropic.Message): RespuestaLlm {
  const texto = mensaje.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const llamadas: LlamadaHerramienta[] = mensaje.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    .map((b) => ({ id: b.id, nombre: b.name, args: b.input }));
  return {
    texto,
    llamadas,
    uso: { entrada: tokensEntrada(mensaje.usage), salida: mensaje.usage.output_tokens },
    fin: (mensaje.stop_reason && FINES[mensaje.stop_reason]) ?? "final",
    bruto: mensaje.content,
  };
}

function errorLlm(codigo: CodigoError, mensaje: string, error: unknown): Resultado<never> {
  const tipo = error instanceof Error ? error.constructor.name : "desconocido";
  const estado = (error as { status?: unknown } | null)?.status;
  const diagnostico: Record<string, string | number> =
    typeof estado === "number" ? { estado, tipo } : { tipo };
  return { ok: false, error: { codigo, mensaje, diagnostico } };
}

/**
 * Traduce los errores del SDK a códigos del catálogo con un mensaje claro (CA5)
 * y un diagnóstico técnico sin secretos para el registro.
 */
function traducirError(error: unknown): Resultado<never> {
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return errorLlm(
      "LLM_TIMEOUT",
      "El modelo tardó demasiado en responder. Intenta de nuevo.",
      error,
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return errorLlm(
      "LLM_LIMITE",
      "El proveedor del modelo limitó las solicitudes. Espera un momento.",
      error,
    );
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return errorLlm("LLM_CLAVE_INVALIDA", "La clave del modelo no es válida o falta.", error);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return errorLlm(
      "LLM_SOLICITUD_INVALIDA",
      "El modelo rechazó la solicitud. Intenta de nuevo o abre una sesión nueva.",
      error,
    );
  }
  return errorLlm("LLM_NO_DISPONIBLE", "El modelo no está disponible en este momento.", error);
}

/** Implementación del adaptador LLM con Anthropic; el ciclo de herramientas vive en el agente. */
export class AdaptadorAnthropic implements AdaptadorLlm {
  readonly proveedor = "anthropic";
  readonly modelo: string;
  private readonly cliente: Anthropic;

  /** @param opciones - clave, modelo y timeout en milisegundos */
  constructor(opciones: OpcionesAnthropic) {
    this.modelo = opciones.modelo;
    this.cliente = new Anthropic({
      apiKey: opciones.apiKey,
      timeout: opciones.timeoutMs,
      maxRetries: REINTENTOS_LLM,
    });
  }

  /** @inheritdoc */
  async enviar(
    mensajes: readonly MensajeLlm[],
    herramientas: readonly HerramientaLlm[],
    opciones: OpcionesEnvio = {},
  ): Promise<Resultado<RespuestaLlm>> {
    const sistema = mensajes.find((m) => m.rol === "sistema");
    try {
      const respuesta = await this.cliente.messages.create({
        model: this.modelo,
        max_tokens: MAX_TOKENS_RESPUESTA,
        output_config: { effort: ESFUERZO_LLM },
        system: sistema
          ? [{ type: "text", text: sistema.contenido, cache_control: { type: "ephemeral" } }]
          : [],
        messages: mensajes.map(aMensajeAnthropic).filter((m) => m !== null),
        tools: aHerramientasAnthropic(herramientas),
        ...(herramientas.length > 0 && {
          tool_choice: { type: opciones.sinLlamadas ? ("none" as const) : ("auto" as const) },
        }),
      });
      return exito(aRespuesta(respuesta));
    } catch (error) {
      return traducirError(error);
    }
  }
}
