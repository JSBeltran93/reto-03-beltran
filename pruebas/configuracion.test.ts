import { describe, expect, it } from "vitest";

import {
  cargarConfiguracion,
  NIVELES_RAZONAMIENTO,
  separarModelos,
  VALORES_POR_DEFECTO,
} from "../src/configuracion";

describe("cargarConfiguracion", () => {
  it("usa los valores por defecto, incluido el modelo de respaldo", () => {
    const configuracion = cargarConfiguracion({});

    expect(configuracion.LLM_MODELO).toBe(VALORES_POR_DEFECTO.modelo);
    expect(configuracion.LLM_MODELOS_RESPALDO).toEqual([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
      "gemini-3-flash-preview",
    ]);
    expect(configuracion.LLM_RAZONAMIENTO).toBe("bajo");
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

  it.each([
    ["un solo modelo", "respaldo-a", ["respaldo-a"]],
    [
      "varios con espacios",
      " respaldo-a , respaldo-b,respaldo-c ",
      ["respaldo-a", "respaldo-b", "respaldo-c"],
    ],
    ["elementos vacíos", "respaldo-a,, ,respaldo-b,", ["respaldo-a", "respaldo-b"]],
  ])("lee la lista de modelos de respaldo: %s", (_caso, valor, esperado) => {
    expect(cargarConfiguracion({ LLM_MODELO_RESPALDO: valor }).LLM_MODELOS_RESPALDO).toEqual(
      esperado,
    );
  });

  it("usa los respaldos por defecto si la lista queda vacía", () => {
    expect(cargarConfiguracion({ LLM_MODELO_RESPALDO: " , " }).LLM_MODELOS_RESPALDO).toEqual(
      separarModelos(VALORES_POR_DEFECTO.modelosRespaldo),
    );
  });

  it.each(NIVELES_RAZONAMIENTO)("acepta el nivel de razonamiento %s", (nivel) => {
    expect(cargarConfiguracion({ LLM_RAZONAMIENTO: nivel }).LLM_RAZONAMIENTO).toBe(nivel);
  });

  it("trata un nivel de razonamiento vacío como no definido", () => {
    expect(cargarConfiguracion({ LLM_RAZONAMIENTO: "" }).LLM_RAZONAMIENTO).toBe(
      VALORES_POR_DEFECTO.razonamiento,
    );
  });

  it("rechaza un nivel de razonamiento desconocido nombrando la variable", () => {
    expect(() => cargarConfiguracion({ LLM_RAZONAMIENTO: "LOW" })).toThrow(/LLM_RAZONAMIENTO/);
  });

  it("convierte números desde texto", () => {
    expect(cargarConfiguracion({ MAX_ITERACIONES: "5" }).MAX_ITERACIONES).toBe(5);
  });

  it("falla nombrando la variable inválida sin mostrar su valor", () => {
    expect(() => cargarConfiguracion({ PORT: "valor-secreto" })).toThrow(/PORT/);
    expect(() => cargarConfiguracion({ PORT: "valor-secreto" })).not.toThrow(/valor-secreto/);
  });
});
