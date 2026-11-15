import {
  ApiError,
  FinishReason,
  FunctionCallingConfigMode,
  type GenerateContentParameters,
  GenerateContentResponse,
  ThinkingLevel,
} from "@google/genai";
import { describe, expect, it } from "vitest";

import type { NivelRazonamiento } from "../../src/configuracion";
import type { MensajeLlm } from "../../src/llm/adapter";
import {
  aContenidosGemini,
  AdaptadorGemini,
  aRespuestaGemini,
  FIRMA_RAZONAMIENTO_FICTICIA,
  type GenerarContenido,
  MAX_TOKENS_RESPUESTA,
  TEMPERATURA,
  traducirErrorGemini,
} from "../../src/llm/gemini";

/** Respuesta del SDK armada a mano (la clase solo agrega getters de conveniencia). */
function respuestaSdk(datos: Partial<GenerateContentResponse>): GenerateContentResponse {
  return Object.assign(new GenerateContentResponse(), datos);
}

const HERRAMIENTA = {
  nombre: "oc_leer_paquete",
  descripcion: "Lee el paquete",
  esquema: { type: "object", properties: { caso: { type: "string" } } },
};

/** Opciones mínimas del adaptador (sin red: cada prueba inyecta su generador). */
const OPCIONES = { apiKey: "k", modelo: "m", timeoutMs: 1, razonamiento: "bajo" } as const;

/** Generador falso que guarda los parámetros recibidos y devuelve una respuesta fija. */
function generadorFijo(respuesta: GenerateContentResponse) {
  const recibidos: GenerateContentParameters[] = [];
  const generar: GenerarContenido = (parametros) => {
    recibidos.push(parametros);
    return Promise.resolve(respuesta);
  };
  return { generar, recibidos };
}

describe("aContenidosGemini", () => {
  it("omite el system prompt y responde cada resultado con el nombre de su llamada", () => {
    const mensajes: MensajeLlm[] = [
      { rol: "sistema", contenido: "eres un agente" },
      { rol: "usuario", contenido: "procesa sol-001" },
      {
        rol: "asistente",
        texto: "voy",
        llamadas: [{ id: "c1", nombre: "oc_leer_paquete", args: { caso: "sol-001" } }],
      },
      { rol: "resultados", resultados: [{ id: "c1", contenido: '{"ok":true}', error: false }] },
    ];

    expect(aContenidosGemini(mensajes)).toEqual([
      { role: "user", parts: [{ text: "procesa sol-001" }] },
      {
        role: "model",
        parts: [
          { text: "voy" },
          {
            functionCall: { id: "c1", name: "oc_leer_paquete", args: { caso: "sol-001" } },
            thoughtSignature: FIRMA_RAZONAMIENTO_FICTICIA,
          },
        ],
      },
      {
        role: "user",
        parts: [
          {
            functionResponse: {
              id: "c1",
              name: "oc_leer_paquete",
              response: { output: '{"ok":true}' },
            },
          },
        ],
      },
    ]);
  });

  it("sin partes originales pone la firma ficticia solo en la primera llamada del turno", () => {
    const [contenido] = aContenidosGemini([
      {
        rol: "asistente",
        texto: "",
        llamadas: [
          { id: "c1", nombre: "oc_leer_paquete", args: { caso: "sol-001" } },
          { id: "c2", nombre: "oc_validar", args: { caso: "sol-001" } },
        ],
      },
    ]);

    expect(contenido?.parts?.map((p) => p.thoughtSignature)).toEqual([
      FIRMA_RAZONAMIENTO_FICTICIA,
      undefined,
    ]);
  });

  it("reenvía sin cambios las partes originales del modelo (firmas de razonamiento)", () => {
    const bruto = [{ text: "pienso", thought: true, thoughtSignature: "firma" }];
    expect(aContenidosGemini([{ rol: "asistente", texto: "", llamadas: [], bruto }])).toEqual([
      { role: "model", parts: bruto },
    ]);
  });

  it("marca los resultados fallidos como error", () => {
    const [contenido] = aContenidosGemini([
      { rol: "resultados", resultados: [{ id: "x", contenido: "falló", error: true }] },
    ]);
    expect(contenido?.parts?.[0]?.functionResponse?.response).toEqual({ error: "falló" });
  });
});

describe("aRespuestaGemini", () => {
  it("separa texto visible, razonamiento y llamadas, y suma los tokens", () => {
    const r = aRespuestaGemini(
      respuestaSdk({
        candidates: [
          {
            finishReason: FinishReason.STOP,
            content: {
              role: "model",
              parts: [
                { text: "razonando", thought: true },
                { text: "Leo el paquete." },
                { functionCall: { id: "c1", name: "oc_leer_paquete", args: { caso: "sol-001" } } },
              ],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          toolUsePromptTokenCount: 2,
          candidatesTokenCount: 5,
          thoughtsTokenCount: 3,
        },
      }),
    );

    expect(r).toMatchObject({
      ok: true,
      data: {
        texto: "Leo el paquete.",
        llamadas: [{ id: "c1", nombre: "oc_leer_paquete", args: { caso: "sol-001" } }],
        fin: "herramientas",
        uso: { entrada: 12, salida: 8 },
      },
    });
  });

  it("genera ids únicos cuando Gemini no los envía y los conserva en el contenido bruto", () => {
    const r = aRespuestaGemini(
      respuestaSdk({
        candidates: [
          {
            content: {
              parts: [
                { functionCall: { name: "oc_validar", args: {} } },
                { functionCall: { name: "oc_validar", args: {} } },
              ],
            },
          },
        ],
      }),
    );

    expect(r.ok).toBe(true);
    const llamadas = r.ok ? r.data.llamadas : [];
    expect(llamadas[0]?.id).not.toBe(llamadas[1]?.id);
    expect(r.ok && JSON.stringify(r.data.bruto)).toContain(llamadas[0]?.id ?? "sin-id");
  });

  it("traduce MAX_TOKENS a fin por límite", () => {
    const r = aRespuestaGemini(
      respuestaSdk({
        candidates: [
          { finishReason: FinishReason.MAX_TOKENS, content: { parts: [{ text: "a" }] } },
        ],
      }),
    );
    expect(r.ok && r.data.fin).toBe("limite");
  });

  it.each([
    respuestaSdk({ candidates: [{ finishReason: FinishReason.SAFETY }] }),
    respuestaSdk({ promptFeedback: { blockReason: "SAFETY" as never } }),
  ])("traduce un bloqueo del modelo a LLM_RECHAZO", (respuesta) => {
    expect(aRespuestaGemini(respuesta)).toMatchObject({
      ok: false,
      error: { codigo: "LLM_RECHAZO" },
    });
  });

  it("sin candidatos devuelve LLM_NO_DISPONIBLE", () => {
    expect(aRespuestaGemini(respuestaSdk({}))).toMatchObject({
      ok: false,
      error: { codigo: "LLM_NO_DISPONIBLE" },
    });
  });
});

describe("traducirErrorGemini", () => {
  const api = (status: number, message = "fallo") => new ApiError({ status, message });
  const abortado = Object.assign(new Error("abortado"), { name: "AbortError" });

  it.each([
    [api(400, "API key not valid. Please pass a valid API key."), "LLM_CLAVE_INVALIDA"],
    [api(403), "LLM_CLAVE_INVALIDA"],
    [api(400), "LLM_SOLICITUD_INVALIDA"],
    [api(429), "LLM_LIMITE"],
    [api(504), "LLM_TIMEOUT"],
    [api(503), "LLM_NO_DISPONIBLE"],
    [abortado, "LLM_TIMEOUT"],
    [new Error("cualquiera"), "LLM_NO_DISPONIBLE"],
  ])("traduce %o a %s con diagnóstico sin secretos", (error, codigo) => {
    const r = traducirErrorGemini(error);

    expect(r).toMatchObject({ ok: false, error: { codigo } });
    expect(JSON.stringify(r)).not.toContain("API key not valid");
  });

  it("un turno cancelado es LLM_TIMEOUT aunque el error sea otro", () => {
    expect(traducirErrorGemini(new Error("x"), true)).toMatchObject({
      ok: false,
      error: { codigo: "LLM_TIMEOUT" },
    });
  });
});

describe("AdaptadorGemini", () => {
  const final = respuestaSdk({ candidates: [{ content: { parts: [{ text: "listo" }] } }] });

  it("envía el system prompt, las herramientas y el modo AUTO", async () => {
    const { generar, recibidos } = generadorFijo(final);
    const adaptador = new AdaptadorGemini({ ...OPCIONES, generar });

    const r = await adaptador.enviar(
      [
        { rol: "sistema", contenido: "eres un agente" },
        { rol: "usuario", contenido: "hola" },
      ],
      [HERRAMIENTA],
    );

    expect(r).toMatchObject({ ok: true, data: { texto: "listo", fin: "final" } });
    expect(recibidos[0]).toMatchObject({
      model: "m",
      config: {
        systemInstruction: "eres un agente",
        tools: [
          {
            functionDeclarations: [
              {
                name: "oc_leer_paquete",
                description: "Lee el paquete",
                parametersJsonSchema: HERRAMIENTA.esquema,
              },
            ],
          },
        ],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
      },
    });
  });

  it.each<[NivelRazonamiento, ThinkingLevel]>([
    ["minimo", ThinkingLevel.MINIMAL],
    ["bajo", ThinkingLevel.LOW],
    ["medio", ThinkingLevel.MEDIUM],
    ["alto", ThinkingLevel.HIGH],
  ])("traduce el razonamiento %s a thinkingLevel %s", async (razonamiento, nivel) => {
    const { generar, recibidos } = generadorFijo(final);
    const adaptador = new AdaptadorGemini({ ...OPCIONES, razonamiento, generar });

    await adaptador.enviar([{ rol: "usuario", contenido: "hola" }], []);

    expect(recibidos[0]?.config?.thinkingConfig).toEqual({ thinkingLevel: nivel });
  });

  it("acota la salida y fija la temperatura con sus constantes", async () => {
    const { generar, recibidos } = generadorFijo(final);
    const adaptador = new AdaptadorGemini({ ...OPCIONES, generar });

    await adaptador.enviar([{ rol: "usuario", contenido: "hola" }], []);

    expect(recibidos[0]?.config).toMatchObject({
      maxOutputTokens: MAX_TOKENS_RESPUESTA,
      temperature: TEMPERATURA,
    });
  });

  it("con sinLlamadas mantiene las herramientas pero fija el modo NONE", async () => {
    const { generar, recibidos } = generadorFijo(final);
    const adaptador = new AdaptadorGemini({ ...OPCIONES, generar });

    await adaptador.enviar([{ rol: "usuario", contenido: "hola" }], [HERRAMIENTA], {
      sinLlamadas: true,
    });

    expect(recibidos[0]?.config?.toolConfig?.functionCallingConfig?.mode).toBe(
      FunctionCallingConfigMode.NONE,
    );
  });

  it("sin clave devuelve LLM_CLAVE_INVALIDA sin llamar al proveedor", async () => {
    const adaptador = new AdaptadorGemini({ ...OPCIONES, apiKey: "" });

    const r = await adaptador.enviar([{ rol: "usuario", contenido: "hola" }], []);

    expect(r).toMatchObject({ ok: false, error: { codigo: "LLM_CLAVE_INVALIDA" } });
  });

  it("nunca lanza: un error del SDK vuelve como código LLM_*", async () => {
    const generar: GenerarContenido = () =>
      Promise.reject(new ApiError({ status: 429, message: "x" }));
    const adaptador = new AdaptadorGemini({ ...OPCIONES, generar });

    const r = await adaptador.enviar([{ rol: "usuario", contenido: "hola" }], []);

    expect(r).toMatchObject({ ok: false, error: { codigo: "LLM_LIMITE" } });
  });
});
