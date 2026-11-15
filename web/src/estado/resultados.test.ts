import type { EntradaHistorial } from "@contratos/contratos-api";
import { describe, expect, it } from "vitest";

import { agruparEnBloques } from "./bloques";
import { confirmacionesPendientes, resultadoRico } from "./resultados";

const hallazgo = { regla: "RC6", tipo: "confirmacion", detalle: "IVA derivado C1" };
const validar = (datos: unknown): EntradaHistorial => ({
  tipo: "herramienta",
  llamada: { nombre: "oc_validar", args: {}, ok: true, resumen: "apta", datos },
});

describe("resultadoRico", () => {
  it.each([
    ["sin datos", { nombre: "oc_validar", args: {}, ok: true, resumen: "" }, null],
    [
      "llamada con error",
      { nombre: "oc_crear", args: {}, ok: false, resumen: "", datos: {} },
      null,
    ],
    [
      "herramienta sin vista enriquecida",
      { nombre: "oc_leer_paquete", args: {}, ok: true, resumen: "", datos: {} },
      null,
    ],
  ])("devuelve null para %s", (_nombre, llamada, esperado) => {
    expect(resultadoRico(llamada as never)).toBe(esperado);
  });

  it("interpreta la creación de la OC", () => {
    const llamada = {
      nombre: "oc_crear",
      args: {},
      ok: true,
      resumen: "",
      datos: { numero_oc: "4500000001", fecha: "2026-09-03", idempotente: false },
    };

    expect(resultadoRico(llamada as never)).toMatchObject({
      tipo: "creacion",
      datos: { numero_oc: "4500000001" },
    });
  });
});

describe("confirmacionesPendientes", () => {
  it("toma las confirmaciones de la última validación del historial", () => {
    const historial = [
      validar({ apta: true, bloqueos: [], confirmaciones: [], retroactiva: false }),
      { tipo: "asistente", texto: "…" } as const,
      validar({ apta: true, bloqueos: [], confirmaciones: [hallazgo], retroactiva: false }),
    ];

    expect(confirmacionesPendientes(historial)).toEqual([hallazgo]);
  });

  it("devuelve vacío si no hay validaciones", () => {
    expect(confirmacionesPendientes([{ tipo: "usuario", texto: "hola" }])).toEqual([]);
  });
});

describe("agruparEnBloques", () => {
  it("agrupa las llamadas consecutivas en una línea de tiempo por turno", () => {
    const historial: EntradaHistorial[] = [
      { tipo: "usuario", texto: "procesa" },
      validar(undefined),
      validar(undefined),
      { tipo: "asistente", texto: "listo" },
    ];

    expect(agruparEnBloques(historial).map((b) => b.tipo)).toEqual(["entrada", "pasos", "entrada"]);
  });
});
