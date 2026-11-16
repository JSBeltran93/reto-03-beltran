import type { EntradaHistorial } from "@contratos/contratos-api";
import { describe, expect, it } from "vitest";

import {
  casoDeLlamada,
  casosDeHistorial,
  confirmacionesPendientes,
  resultadoRico,
} from "./resultados";

const hallazgo = { regla: "RC6", tipo: "confirmacion", detalle: "IVA derivado C1" };
const validar = (datos: unknown, caso = "sol-004", ok = true): EntradaHistorial => ({
  tipo: "herramienta",
  llamada: { nombre: "oc_validar", args: { caso }, ok, resumen: "apta", datos },
});
const conConfirmaciones = (confirmaciones: unknown[]) => ({
  apta: true,
  bloqueos: [],
  confirmaciones,
  retroactiva: false,
});
const otroHallazgo = { regla: "RC5", tipo: "confirmacion", detalle: "Diferencia de 6 %" };

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
  const historial = [
    validar(conConfirmaciones([hallazgo]), "sol-004"),
    { tipo: "asistente", texto: "…" } as const,
    validar(conConfirmaciones([otroHallazgo]), "sol-005"),
    validar(conConfirmaciones([]), "sol-004", false),
  ];

  it.each<[string, string | null, unknown[]]>([
    ["la última validación correcta del caso pendiente", "sol-004", [hallazgo]],
    ["la última validación correcta de otro caso", "sol-005", [otroHallazgo]],
    ["sin caso: la última validación correcta", null, [otroHallazgo]],
    ["un caso sin validaciones", "sol-001", []],
  ])("toma %s", (_nombre, caso, esperado) => {
    expect(confirmacionesPendientes(historial, caso)).toEqual(esperado);
  });

  it("devuelve vacío si no hay validaciones", () => {
    expect(confirmacionesPendientes([{ tipo: "usuario", texto: "hola" }], null)).toEqual([]);
  });
});

describe("casoDeLlamada", () => {
  it.each([
    [{ caso: "sol-004" }, "sol-004"],
    [{}, null],
    [null, null],
  ])("%j → %s", (args, esperado) => {
    expect(casoDeLlamada({ nombre: "oc_validar", args, ok: true, resumen: "" })).toBe(esperado);
  });
});

describe("casosDeHistorial", () => {
  it("lista sin repetir los casos de las llamadas a herramientas", () => {
    const historial: EntradaHistorial[] = [
      { tipo: "usuario", texto: "procesa sol-004" },
      validar(undefined, "sol-004"),
      validar(undefined, "sol-004"),
      validar(undefined, "sol-999", false),
    ];

    expect(casosDeHistorial(historial)).toEqual(["sol-004", "sol-999"]);
  });
});
