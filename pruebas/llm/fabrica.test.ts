import { describe, expect, it, vi } from "vitest";

import { registradorSilencioso } from "../../src/comun/registrador";
import { cargarConfiguracion, PROVEEDOR_LLM, VALORES_POR_DEFECTO } from "../../src/configuracion";
import { crearAdaptadoresLlm } from "../../src/llm/fabrica";
import { AdaptadorGemini } from "../../src/llm/gemini";

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

  it("prueba el principal y luego cada respaldo en el orden configurado", async () => {
    const intentados: string[] = [];
    const espia = vi.spyOn(AdaptadorGemini.prototype, "enviar").mockImplementation(function (
      this: AdaptadorGemini,
    ) {
      intentados.push(this.modelo);
      return Promise.resolve({
        ok: false,
        error: { codigo: "LLM_LIMITE", mensaje: "límite" },
      });
    });
    const configuracion = cargarConfiguracion({
      LLM_MODELO: "principal",
      LLM_MODELO_RESPALDO: "respaldo-a, respaldo-b",
    });

    const r = await crearAdaptadoresLlm(configuracion, registradorSilencioso).enviar(
      [{ rol: "usuario", contenido: "hola" }],
      [],
    );
    espia.mockRestore();

    expect(intentados).toEqual(["principal", "respaldo-a", "respaldo-b"]);
    expect(r).toMatchObject({ ok: false, error: { codigo: "LLM_LIMITE" } });
  });
});
