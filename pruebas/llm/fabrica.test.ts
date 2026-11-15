import { describe, expect, it } from "vitest";

import { registradorSilencioso } from "../../src/comun/registrador";
import { cargarConfiguracion, PROVEEDOR_LLM, VALORES_POR_DEFECTO } from "../../src/configuracion";
import { crearAdaptadoresLlm } from "../../src/llm/fabrica";

describe("crearAdaptadoresLlm", () => {
  it("crea el adaptador de Gemini con el modelo principal", () => {
    const llm = crearAdaptadoresLlm(cargarConfiguracion({}), registradorSilencioso);

    expect(llm.proveedor).toBe(PROVEEDOR_LLM);
    expect(llm.modelo).toBe(VALORES_POR_DEFECTO.modelo);
  });

  it("sin clave de Gemini responde LLM_CLAVE_INVALIDA sin intentar el respaldo", async () => {
    const llm = crearAdaptadoresLlm(cargarConfiguracion({}), registradorSilencioso);

    const r = await llm.enviar([{ rol: "usuario", contenido: "hola" }], []);

    expect(r).toMatchObject({ ok: false, error: { codigo: "LLM_CLAVE_INVALIDA" } });
  });
});
