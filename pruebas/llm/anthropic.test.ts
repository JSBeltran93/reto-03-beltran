import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";

import { aMensajeAnthropic, traducirError } from "../../src/llm/anthropic";

describe("aMensajeAnthropic", () => {
  it("deja el system prompt fuera de los mensajes", () => {
    expect(aMensajeAnthropic({ rol: "sistema", contenido: "x" })).toBeNull();
  });

  it("reenvía sin cambios el contenido original del asistente", () => {
    const bruto = [{ type: "text", text: "hola" }];
    expect(aMensajeAnthropic({ rol: "asistente", texto: "hola", llamadas: [], bruto })).toEqual({
      role: "assistant",
      content: bruto,
    });
  });

  it("reconstruye texto y llamadas cuando no hay contenido original", () => {
    const mensaje = aMensajeAnthropic({
      rol: "asistente",
      texto: "voy",
      llamadas: [{ id: "t1", nombre: "oc_leer_paquete", args: { caso: "sol-001" } }],
    });

    expect(mensaje).toEqual({
      role: "assistant",
      content: [
        { type: "text", text: "voy" },
        { type: "tool_use", id: "t1", name: "oc_leer_paquete", input: { caso: "sol-001" } },
      ],
    });
  });

  it("convierte los resultados en tool_result del usuario", () => {
    expect(
      aMensajeAnthropic({
        rol: "resultados",
        resultados: [{ id: "t1", contenido: "{}", error: true }],
      }),
    ).toEqual({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: "t1", content: "{}", is_error: true }],
    });
  });
});

describe("traducirError", () => {
  const generar = (estado: number) =>
    Anthropic.APIError.generate(estado, undefined, "x", new Headers());

  it.each([
    [generar(401), "LLM_CLAVE_INVALIDA"],
    [generar(400), "LLM_SOLICITUD_INVALIDA"],
    [generar(429), "LLM_LIMITE"],
    [generar(500), "LLM_NO_DISPONIBLE"],
    [new Anthropic.APIUserAbortError(), "LLM_TIMEOUT"],
    [new Anthropic.APIConnectionTimeoutError(), "LLM_TIMEOUT"],
    [new Error("cualquiera"), "LLM_NO_DISPONIBLE"],
  ])("traduce %o a %s con diagnóstico sin secretos", (error, codigo) => {
    const r = traducirError(error);

    expect(r).toMatchObject({ ok: false, error: { codigo } });
    expect(JSON.stringify(r)).not.toContain("sk-");
  });
});
