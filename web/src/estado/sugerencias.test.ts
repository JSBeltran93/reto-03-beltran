import type { ResumenCaso } from "@contratos/contratos-api";
import { describe, expect, it } from "vitest";

import { sugerenciasConCasos } from "./sugerencias";

const PLANTILLAS = [
  { caso: "sol-004", etiqueta: "Procesa sol-004", mensaje: "Procesa sol-004" },
  { caso: "sol-999", etiqueta: "Procesa sol-999", mensaje: "Procesa sol-999" },
];

const sol004: ResumenCaso = {
  caso: "sol-004",
  solicitud_id: "SOL-2026-004",
  descripcion: "Bolsa de horas",
  proveedor: "Cloud Andina S.A.S.",
  valor_total: 25_000_000,
  moneda: "COP",
  centro_costo: "CC-1010",
  estado: "sin_procesar",
  numero_oc: null,
};

describe("sugerenciasConCasos", () => {
  it("sin solicitudes cargadas muestra las sugerencias sin resumen", () => {
    expect(sugerenciasConCasos(PLANTILLAS, undefined)).toEqual(PLANTILLAS);
  });

  it("con solicitudes añade el resumen y omite las de casos que no existen", () => {
    expect(sugerenciasConCasos(PLANTILLAS, [sol004])).toEqual([
      { ...PLANTILLAS[0], resumen: sol004 },
    ]);
  });
});
