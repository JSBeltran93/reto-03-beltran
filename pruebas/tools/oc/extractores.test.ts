import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  aNumero,
  extraerCotizacion,
  extraerFactura,
  extraerMonto,
  normalizarNit,
  sumarDias,
} from "../../../src/tools/oc/extractores";
import { RAIZ_PROYECTO } from "../../apoyo/proyecto";

const leerArchivoCaso = (caso: string, archivo: string): string =>
  readFileSync(path.join(RAIZ_PROYECTO, "fixtures/reto-03/solicitudes", caso, archivo), "utf8");

describe("aNumero", () => {
  it.each([
    ["11.400.000", 11_400_000],
    ["120,000.00", 120_000],
    ["1.234,56", 1234.56],
    ["95000", 95_000],
  ])("interpreta %s", (crudo, esperado) => {
    expect(aNumero(crudo)).toBe(esperado);
  });
});

describe("extraerMonto", () => {
  it("devuelve moneda y valor", () => {
    expect(extraerMonto("COP 11.400.000")).toEqual({
      ok: true,
      data: { moneda: "COP", valor: 11_400_000 },
    });
  });

  it("falla con MONTO_INVALIDO si el texto no tiene monto", () => {
    expect(extraerMonto("sin valor")).toMatchObject({
      ok: false,
      error: { codigo: "MONTO_INVALIDO" },
    });
  });
});

describe("normalizarNit", () => {
  it.each([
    ["900.555.111-2", "900555111"],
    ["900555111", "900555111"],
  ])("normaliza %s", (crudo, esperado) => {
    expect(normalizarNit(crudo)).toBe(esperado);
  });
});

describe("sumarDias", () => {
  it("cruza el cambio de mes", () => {
    expect(sumarDias("2026-08-18", 30)).toBe("2026-09-17");
  });
});

describe("extraerCotizacion", () => {
  it.each([
    ["sol-001", "COT-TS-2026-0451", "900555111", 11_400_000, "2026-09-17"],
    ["sol-002", "SDN-0093", "901999000", 8_500_000, "2026-09-05"],
    ["sol-003", "MA-2026-1177", "830111222", 74_000_000, "2026-10-04"],
    ["sol-004", "CA-2026-0310", "901222333", 26_500_000, "2026-09-14"],
    ["sol-005", "PC-5520", "800444555", 3_200_000, "2026-09-04"],
    ["sol-006", "COT-TS-2026-0468", "900555111", 5_400_000, "2026-09-27"],
  ])("extrae la cotización de %s", (caso, referencia, nit, total, validez) => {
    const resultado = extraerCotizacion(leerArchivoCaso(caso, "cotizacion.txt"));

    expect(resultado.ok && resultado.data).toMatchObject({
      referencia,
      nit,
      total,
      moneda: "COP",
      validez_hasta: validez,
    });
  });

  it("falla si no hay total", () => {
    expect(extraerCotizacion("Proveedor: X\n").ok).toBe(false);
  });
});

describe("extraerFactura", () => {
  it("extrae la factura de sol-005", () => {
    expect(extraerFactura(leerArchivoCaso("sol-005", "factura.txt"))).toEqual({
      ok: true,
      data: { numero: "FC-88231", fecha: "2026-08-10", total: 3_200_000 },
    });
  });
});
