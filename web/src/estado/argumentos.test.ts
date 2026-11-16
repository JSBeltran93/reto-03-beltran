import { describe, expect, it } from "vitest";

import { LARGO_MAXIMO_TEXTO, resumirArgumentos, resumirValor } from "./argumentos";

describe("resumirValor", () => {
  it.each<[string, unknown, string]>([
    ["texto entre comillas", "sol-004", '"sol-004"'],
    ["número", 25_000_000, "25000000"],
    ["booleano", true, "true"],
    ["nulo", null, "null"],
    ["lista con su tamaño", [1, 2, 3], "[3 elementos]"],
    ["lista de uno", ["a"], "[1 elemento]"],
    ["objeto vacío", {}, "{}"],
    ["objeto pequeño con sus claves", { a: 1, b: 2 }, "{a, b}"],
    [
      "objeto grande con tres claves y el resto contado",
      { correo: {}, solicitud: {}, cotizacion: {}, aprobacion: {}, factura: null },
      "{correo, solicitud, cotizacion, +2}",
    ],
  ])("%s", (_nombre, valor, esperado) => {
    expect(resumirValor(valor)).toBe(esperado);
  });

  it("recorta los textos largos", () => {
    const largo = "x".repeat(LARGO_MAXIMO_TEXTO + 10);

    expect(resumirValor(largo)).toBe(`"${"x".repeat(LARGO_MAXIMO_TEXTO)}…"`);
  });
});

describe("resumirArgumentos", () => {
  it("da un `clave: valor` por argumento", () => {
    const args = { caso: "sol-004", confirmado: true, payload: { proveedor: {}, moneda: "COP" } };

    expect(resumirArgumentos(args)).toEqual([
      'caso: "sol-004"',
      "confirmado: true",
      "payload: {proveedor, moneda}",
    ]);
  });

  it.each([
    ["sin argumentos", undefined, []],
    ["objeto vacío", {}, []],
    ["un valor suelto", "sol-004", ['"sol-004"']],
  ])("%s", (_nombre, args, esperado) => {
    expect(resumirArgumentos(args)).toEqual(esperado);
  });
});
