import { randomUUID } from "node:crypto";

import {
  ApiError,
  type Content,
  FinishReason,
  FunctionCallingConfigMode,
  type FunctionDeclaration,
  type GenerateContentParameters,
  type GenerateContentResponse,
  GoogleGenAI,
  type Part,
} from "@google/genai";

import type { CodigoError } from "../comun/errores";
import { exito, fallo, type Resultado } from "../comun/resultado";
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

/**
 * Firma de razonamiento ficticia para turnos del asistente sin partes originales (por
 * ejemplo, los que respondió un modelo de respaldo). Gemini 3 exige `thoughtSignature` en
 * la primera llamada a función de cada turno del modelo y responde 400 si falta; la
 * documentación oficial de "thought signatures" admite este valor para historiales
 * transferidos de otro modelo o inyectados, que no tienen una firma real.
 */
export const FIRMA_RAZONAMIENTO_FICTICIA = "skip_thought_signature_validator";

/** Prefijo de los identificadores de llamada cuando Gemini no envía uno propio. */
const PREFIJO_ID_LLAMADA = "gemini-llamada-";

/** Mensaje cuando el modelo bloquea la solicitud; el adaptador con respaldo prueba otro modelo. */
const MENSAJE_RECHAZO =
  "El modelo no puede ayudar con esa solicitud. Reformúlala sobre el proceso de órdenes de compra.";
const MENSAJE_CLAVE = "La clave del modelo no es válida o falta.";
const MENSAJE_NO_DISPONIBLE = "El modelo no está disponible en este momento.";

/** Estados HTTP con significado propio; el resto cae en LLM_NO_DISPONIBLE. */
const ESTADO_SOLICITUD_INVALIDA = 400;
const ESTADOS_CLAVE = [401, 403];
const ESTADOS_TIMEOUT = [408, 504];
const ESTADO_LIMITE = 429;

/** Texto con el que la API de Gemini responde 400 ante una clave inválida. */
const PATRON_CLAVE_INVALIDA = /api[ _-]?key/i;

/** Motivos de fin de Gemini que equivalen a un rechazo del modelo. */
const FINES_RECHAZO: readonly FinishReason[] = [
  FinishReason.SAFETY,
  FinishReason.RECITATION,
  FinishReason.BLOCKLIST,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.SPII,
];

/** Operación del SDK que usa el adaptador; se inyecta en las pruebas. */
export type GenerarContenido = (
  parametros: GenerateContentParameters,
) => Promise<GenerateContentResponse>;

/** Opciones del adaptador de Gemini (los valores vienen de la configuración). */
export interface OpcionesGemini {
  readonly apiKey: string;
  readonly modelo: string;
  readonly timeoutMs: number;
  /** Sustituye la llamada real al SDK (solo pruebas). */
  readonly generar?: GenerarContenido;
}

type MensajeAsistente = Extract<MensajeLlm, { rol: "asistente" }>;

/**
 * Gemini responde a una llamada por nombre de función, no por id: se arma el mapa
 * id → nombre con las llamadas que hizo el asistente en la conversación.
 */
function nombresPorId(mensajes: readonly MensajeLlm[]): ReadonlyMap<string, string> {
  return new Map(
    mensajes
      .filter((m): m is MensajeAsistente => m.rol === "asistente")
      .flatMap((m) => m.llamadas.map((l) => [l.id, l.nombre] as const)),
  );
}

function esListaDePartes(bruto: unknown): bruto is Part[] {
  return Array.isArray(bruto);
}

/**
 * Partes de un turno del asistente: las originales si existen (conservan las firmas de
 * razonamiento que Gemini exige al continuar con herramientas); si no, texto y llamadas,
 * con la firma ficticia en la primera llamada (la única que Gemini valida por turno).
 */
function partesAsistente(mensaje: MensajeAsistente): Part[] {
  if (esListaDePartes(mensaje.bruto)) return mensaje.bruto;
  const texto: Part[] = mensaje.texto ? [{ text: mensaje.texto }] : [];
  const llamadas: Part[] = mensaje.llamadas.map((l, indice) => ({
    functionCall: { id: l.id, name: l.nombre, args: l.args as Record<string, unknown> },
    ...(indice === 0 && { thoughtSignature: FIRMA_RAZONAMIENTO_FICTICIA }),
  }));
  return [...texto, ...llamadas];
}

/**
 * Convierte la conversación neutral al formato de Gemini.
 * @param mensajes - conversación; el system prompt se omite porque va en `systemInstruction`
 * @returns los contenidos para `generateContent`
 */
export function aContenidosGemini(mensajes: readonly MensajeLlm[]): Content[] {
  const nombres = nombresPorId(mensajes);
  return mensajes.flatMap((mensaje): Content[] => {
    switch (mensaje.rol) {
      case "sistema":
        return [];
      case "usuario":
        return [{ role: "user", parts: [{ text: mensaje.contenido }] }];
      case "asistente":
        return [{ role: "model", parts: partesAsistente(mensaje) }];
      case "resultados":
        return [
          {
            role: "user",
            parts: mensaje.resultados.map((r) => ({
              functionResponse: {
                id: r.id,
                name: nombres.get(r.id) ?? r.id,
                response: r.error ? { error: r.contenido } : { output: r.contenido },
              },
            })),
          },
        ];
    }
  });
}

function aDeclaraciones(herramientas: readonly HerramientaLlm[]): FunctionDeclaration[] {
  return herramientas.map((h) => ({
    name: h.nombre,
    description: h.descripcion,
    parametersJsonSchema: h.esquema,
  }));
}

/** Asigna un id propio a las llamadas que Gemini envía sin id. */
function conIdLlamada(parte: Part): Part {
  if (!parte.functionCall || parte.functionCall.id) return parte;
  return {
    ...parte,
    functionCall: { ...parte.functionCall, id: `${PREFIJO_ID_LLAMADA}${randomUUID()}` },
  };
}

/** Texto visible de la respuesta (sin las partes de razonamiento). */
function textoVisible(partes: readonly Part[]): string {
  return partes
    .filter((p) => p.text !== undefined && !p.thought)
    .map((p) => p.text)
    .join("\n");
}

function aLlamadas(partes: readonly Part[]): LlamadaHerramienta[] {
  return partes.flatMap(({ functionCall: llamada }) =>
    llamada ? [{ id: llamada.id ?? "", nombre: llamada.name ?? "", args: llamada.args ?? {} }] : [],
  );
}

/** Tokens facturables: entrada con el prompt de herramientas, salida con el razonamiento. */
function aUso(uso: GenerateContentResponse["usageMetadata"]): RespuestaLlm["uso"] {
  return {
    entrada: (uso?.promptTokenCount ?? 0) + (uso?.toolUsePromptTokenCount ?? 0),
    salida: (uso?.candidatesTokenCount ?? 0) + (uso?.thoughtsTokenCount ?? 0),
  };
}

function aFin(hayLlamadas: boolean, motivo: FinishReason | undefined): FinRespuesta {
  if (hayLlamadas) return "herramientas";
  return motivo === FinishReason.MAX_TOKENS ? "limite" : "final";
}

function fueBloqueada(respuesta: GenerateContentResponse): boolean {
  const motivo = respuesta.candidates?.[0]?.finishReason;
  return (
    respuesta.promptFeedback?.blockReason !== undefined ||
    (motivo !== undefined && FINES_RECHAZO.includes(motivo))
  );
}

/**
 * Convierte la respuesta de Gemini a la forma neutral; los ids que falten se generan
 * para poder enlazar cada resultado con su llamada.
 * @param respuesta - respuesta del SDK
 * @returns la respuesta neutral, o un error si el modelo la bloqueó o no devolvió nada
 */
export function aRespuestaGemini(respuesta: GenerateContentResponse): Resultado<RespuestaLlm> {
  if (fueBloqueada(respuesta)) return fallo("LLM_RECHAZO", MENSAJE_RECHAZO);
  const candidato = respuesta.candidates?.[0];
  if (!candidato) return fallo("LLM_NO_DISPONIBLE", MENSAJE_NO_DISPONIBLE);
  const partes = (candidato.content?.parts ?? []).map(conIdLlamada);
  const llamadas = aLlamadas(partes);
  return exito({
    texto: textoVisible(partes),
    llamadas,
    uso: aUso(respuesta.usageMetadata),
    fin: aFin(llamadas.length > 0, candidato.finishReason),
    bruto: partes,
  });
}

function errorLlm(codigo: CodigoError, mensaje: string, error: unknown): Resultado<never> {
  const tipo = error instanceof Error ? error.name : "desconocido";
  const diagnostico: Record<string, string | number> =
    error instanceof ApiError ? { estado: error.status, tipo } : { tipo };
  return { ok: false, error: { codigo, mensaje, diagnostico } };
}

const MENSAJE_LENTO = "El modelo tardó demasiado en responder. Intenta de nuevo.";

/** Código y mensaje según el estado HTTP de un error de la API de Gemini. */
function clasificarApiError(error: ApiError): readonly [CodigoError, string] {
  const claveInvalida =
    ESTADOS_CLAVE.includes(error.status) ||
    (error.status === ESTADO_SOLICITUD_INVALIDA && PATRON_CLAVE_INVALIDA.test(error.message));
  if (claveInvalida) return ["LLM_CLAVE_INVALIDA", MENSAJE_CLAVE];
  if (error.status === ESTADO_SOLICITUD_INVALIDA) {
    return [
      "LLM_SOLICITUD_INVALIDA",
      "El modelo rechazó la solicitud. Intenta de nuevo o abre una sesión nueva.",
    ];
  }
  if (error.status === ESTADO_LIMITE) {
    return ["LLM_LIMITE", "El proveedor del modelo limitó las solicitudes. Espera un momento."];
  }
  if (ESTADOS_TIMEOUT.includes(error.status)) return ["LLM_TIMEOUT", MENSAJE_LENTO];
  return ["LLM_NO_DISPONIBLE", MENSAJE_NO_DISPONIBLE];
}

/**
 * Traduce los errores del SDK de Gemini a códigos del catálogo con un mensaje claro (CA5)
 * y un diagnóstico técnico sin secretos para el registro.
 * @param error - error lanzado por el SDK
 * @param turnoCancelado - true si se agotó el plazo del turno (señal abortada)
 * @returns resultado fallido con el código LLM_* correspondiente
 */
export function traducirErrorGemini(error: unknown, turnoCancelado = false): Resultado<never> {
  if (turnoCancelado) {
    return errorLlm("LLM_TIMEOUT", "El turno superó el tiempo máximo. Intenta de nuevo.", error);
  }
  if (error instanceof Error && error.name === "AbortError") {
    return errorLlm("LLM_TIMEOUT", MENSAJE_LENTO, error);
  }
  if (!(error instanceof ApiError)) {
    return errorLlm("LLM_NO_DISPONIBLE", MENSAJE_NO_DISPONIBLE, error);
  }
  const [codigo, mensaje] = clasificarApiError(error);
  return errorLlm(codigo, mensaje, error);
}

/**
 * Crea la llamada real al SDK; sin clave no hay cliente (el SDK exige una al construirse).
 * @param opciones - clave y timeout
 * @returns la operación `generateContent`, o undefined si falta la clave
 */
function crearGenerador(opciones: OpcionesGemini): GenerarContenido | undefined {
  if (opciones.apiKey === "") return undefined;
  const cliente = new GoogleGenAI({
    apiKey: opciones.apiKey,
    httpOptions: { timeout: opciones.timeoutMs },
  });
  return (parametros) => cliente.models.generateContent(parametros);
}

/** Implementación del adaptador LLM con Google Gemini; el ciclo de herramientas vive en el agente. */
export class AdaptadorGemini implements AdaptadorLlm {
  readonly proveedor = "gemini";
  readonly modelo: string;
  private readonly generar: GenerarContenido | undefined;

  /** @param opciones - clave, modelo y timeout en milisegundos */
  constructor(opciones: OpcionesGemini) {
    this.modelo = opciones.modelo;
    this.generar = opciones.generar ?? crearGenerador(opciones);
  }

  /** @inheritdoc */
  async enviar(
    mensajes: readonly MensajeLlm[],
    herramientas: readonly HerramientaLlm[],
    opciones: OpcionesEnvio = {},
  ): Promise<Resultado<RespuestaLlm>> {
    if (!this.generar) return fallo("LLM_CLAVE_INVALIDA", MENSAJE_CLAVE);
    const sistema = mensajes.find((m) => m.rol === "sistema");
    try {
      const respuesta = await this.generar({
        model: this.modelo,
        contents: aContenidosGemini(mensajes),
        config: {
          maxOutputTokens: MAX_TOKENS_RESPUESTA,
          ...(sistema && { systemInstruction: sistema.contenido }),
          ...(opciones.senal && { abortSignal: opciones.senal }),
          ...(herramientas.length > 0 && {
            tools: [{ functionDeclarations: aDeclaraciones(herramientas) }],
            toolConfig: {
              functionCallingConfig: {
                mode: opciones.sinLlamadas
                  ? FunctionCallingConfigMode.NONE
                  : FunctionCallingConfigMode.AUTO,
              },
            },
          }),
        },
      });
      return aRespuestaGemini(respuesta);
    } catch (error) {
      return traducirErrorGemini(error, opciones.senal?.aborted ?? false);
    }
  }
}
