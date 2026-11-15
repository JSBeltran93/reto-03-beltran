import { describe, expect, it } from "vitest";

import { cargarConfiguracion, VALORES_POR_DEFECTO } from "../src/configuracion";

describe("cargarConfiguracion", () => {
  it("usa los valores por defecto, incluido el modelo de respaldo", () => {
    const config = cargarConfiguracion({});

    expect(config.LLM_MODELO).toBe(VALORES_POR_DEFECTO.modelo);
    expect(config.LLM_MODELO_RESPALDO).toBe(VALORES_POR_DEFECTO.modeloRespaldo);
    expect(config.MAX_SEGUNDOS_TURNO).toBe(VALORES_POR_DEFECTO.maxSegundosTurno);
    expect(config.ANTHROPIC_API_KEY).toBe("");
  });

  it("convierte números desde texto", () => {
    expect(cargarConfiguracion({ MAX_ITERACIONES: "5" }).MAX_ITERACIONES).toBe(5);
  });

  it("falla nombrando la variable inválida sin mostrar su valor", () => {
    expect(() => cargarConfiguracion({ PORT: "valor-secreto" })).toThrow(/PORT/);
    expect(() => cargarConfiguracion({ PORT: "valor-secreto" })).not.toThrow(/valor-secreto/);
  });
});
