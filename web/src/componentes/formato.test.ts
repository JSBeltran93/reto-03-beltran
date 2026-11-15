import { describe, expect, it } from "vitest";

import { formatearValorHallazgo } from "./formato";
import { etiquetaValor } from "./textos";

describe("formatearValorHallazgo", () => {
  it.each([
    ["cotizacion", 26_500_000, /^COP\s26\.500\.000$/],
    ["tope", 20_000_000.5, /^COP\s20\.000\.000,5$/],
    ["diferencia_pct", 6, /^6 %$/],
    ["cantidad", 1500, /^1500$|^1\.500$/],
    ["fecha_factura", "2026-09-01", /^1 de septiembre de 2026$/],
    ["moneda", "COP", /^COP$/],
  ])("muestra %s = %s de forma legible", (clave, valor, esperado) => {
    expect(formatearValorHallazgo(clave, valor)).toMatch(esperado);
  });
});

describe("etiquetaValor", () => {
  it.each([
    ["diferencia_pct", "Diferencia"],
    ["cotizacion", "Cotización"],
    ["solicitud", "Solicitud"],
    ["clave_nueva", "Clave nueva"],
  ])("nombra %s como «%s»", (clave, etiqueta) => {
    expect(etiquetaValor(clave)).toBe(etiqueta);
  });
});
