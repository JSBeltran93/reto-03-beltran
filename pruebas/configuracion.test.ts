import { describe, expect, it } from "vitest";

import { cargarConfiguracion, VALORES_POR_DEFECTO } from "../src/configuracion";

describe("cargarConfiguracion", () => {
  it("usa los valores por defecto, incluido el modelo de respaldo", () => {
    const configuracion = cargarConfiguracion({});

    expect(configuracion.LLM_MODELO).toBe(VALORES_POR_DEFECTO.modelo);
    expect(configuracion.LLM_MODELO_RESPALDO).toBe(VALORES_POR_DEFECTO.modeloRespaldo);
    expect(configuracion.MAX_SEGUNDOS_TURNO).toBe(VALORES_POR_DEFECTO.maxSegundosTurno);
    expect(configuracion.GEMINI_API_KEY).toBe("");
  });

  it("lee la clave de Gemini", () => {
    expect(cargarConfiguracion({ GEMINI_API_KEY: "g" }).GEMINI_API_KEY).toBe("g");
  });

  it("respeta los modelos fijados en el entorno", () => {
    expect(cargarConfiguracion({ LLM_MODELO: "otro" }).LLM_MODELO).toBe("otro");
  });

  it("trata un modelo vacío como no definido", () => {
    expect(cargarConfiguracion({ LLM_MODELO: "" }).LLM_MODELO).toBe(VALORES_POR_DEFECTO.modelo);
  });

  it("convierte números desde texto", () => {
    expect(cargarConfiguracion({ MAX_ITERACIONES: "5" }).MAX_ITERACIONES).toBe(5);
  });

  it("falla nombrando la variable inválida sin mostrar su valor", () => {
    expect(() => cargarConfiguracion({ PORT: "valor-secreto" })).toThrow(/PORT/);
    expect(() => cargarConfiguracion({ PORT: "valor-secreto" })).not.toThrow(/valor-secreto/);
  });
});
