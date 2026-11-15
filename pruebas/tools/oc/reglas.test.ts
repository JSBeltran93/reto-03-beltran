import { describe, expect, it } from "vitest";

import type { Paquete } from "../../../src/tools/oc/esquemas";
import { validarPaquete } from "../../../src/tools/oc/validacion";
import { maestrosReales, paqueteDe, variante } from "../../apoyo/paquetes";

const reglasDe = (paquete: Paquete): string[] => {
  const v = validarPaquete(paquete, maestrosReales());
  return [...v.bloqueos, ...v.confirmaciones, ...v.informativos].map((h) => h.regla);
};

const aprobacion = (
  de: string,
  fecha = "2026-08-21T10:00:00-05:00",
  aprobado = true,
): NonNullable<Paquete["aprobacion"]> => ({ de, fecha, aprobado, texto: "Aprobado" });

describe("reglas de control", () => {
  it("sol-001 cumple todas las reglas", () => {
    expect(reglasDe(paqueteDe("sol-001"))).toEqual([]);
  });

  it.each<[string, Paquete, string]>([
    ["RC1 proveedor inexistente", variante({ proveedor_nit: "123" }), "RC1"],
    ["RC1 proveedor inactivo", variante({ proveedor_nit: "901777888" }), "RC1"],
    ["RC2 sin aprobación", variante({}, { aprobacion: null }), "RC2"],
    [
      "RC2 aprobación sin la palabra",
      variante({}, { aprobacion: aprobacion("mlopez@periferia-ficticia.com", undefined, false) }),
      "RC2",
    ],
    [
      "RC2 aprobador ajeno al centro",
      variante({}, { aprobacion: aprobacion("rtorres@periferia-ficticia.com") }),
      "RC2",
    ],
    ["RC3 monto sobre el tope", variante({ cantidad: 600, valor_total: 57_000_000 }), "RC3"],
    ["RC4 subárea ajena al centro", variante({ subarea: "Marketing" }), "RC4"],
    ["RC4 centro de costo inexistente", variante({ centro_costo: "CC-9999" }), "RC4"],
    ["RC5 sin cotización", variante({}, { cotizacion: null }), "RC5"],
    [
      "RC9 aprobación anterior a la solicitud",
      variante(
        {},
        { aprobacion: aprobacion("mlopez@periferia-ficticia.com", "2026-08-19T09:00:00-05:00") },
      ),
      "RC9",
    ],
    ["RC10 total inconsistente", variante({ valor_total: 11_400_002 }), "RC10"],
  ])("%s", (_nombre, paquete, regla) => {
    expect(reglasDe(paquete)).toContain(regla);
  });

  it("RC5 acepta una diferencia de exactamente 2 %", () => {
    const base = paqueteDe("sol-001");
    const cotizacion = base.cotizacion && { ...base.cotizacion, total: 11_628_000 };
    expect(reglasDe({ ...base, cotizacion })).not.toContain("RC5");
  });

  it("RC10 tolera una unidad monetaria de diferencia", () => {
    expect(reglasDe(variante({ valor_total: 11_400_001 }))).not.toContain("RC10");
  });

  it("RC1 resuelve por nombre sin NIT y deriva IVA y condiciones de pago (sol-006)", () => {
    const v = validarPaquete(paqueteDe("sol-006"), maestrosReales());

    expect(v.derivados).toEqual({
      proveedor: { codigo_sap: "100234", nit: "900555111", nombre: "TecnoSuministros S.A.S." },
      indicador_iva: "C1",
      condiciones_pago: "Z030",
    });
    expect(v.confirmaciones.map((h) => h.regla)).toEqual(["RC6"]);
    expect(v.informativos.map((h) => h.regla)).toEqual(["RC7"]);
  });

  it.each([
    ["RC6", { indicador_iva: "X9" }],
    ["RC7", { condiciones_pago: "X9" }],
  ])("%s pide confirmación si el código informado no está en el maestro", (regla, cambios) => {
    const v = validarPaquete(variante(cambios), maestrosReales());
    const hallazgo = v.confirmaciones.find((h) => h.regla === regla);

    expect(hallazgo?.detalle).toContain("X9");
  });

  it("RC2 sugiere el centro de costo donde el aprobador sí tiene autoridad (sol-003)", () => {
    const v = validarPaquete(paqueteDe("sol-003"), maestrosReales());
    const rc2 = v.bloqueos.find((h) => h.regla === "RC2");

    expect(rc2?.accion_sugerida).toContain("CC-3030");
    expect(rc2?.accion_sugerida).toContain("rtorres@periferia-ficticia.com");
  });

  it("RC3 explica que un aprobador ajeno al centro no tiene tope, sin inventar un tope 0 (sol-003)", () => {
    const v = validarPaquete(paqueteDe("sol-003"), maestrosReales());
    const rc3 = v.bloqueos.find((h) => h.regla === "RC3");

    expect(rc3?.detalle).toContain("no tiene tope en CC-2020");
    expect(rc3?.detalle).not.toContain("(0)");
    expect(rc3?.valores).toEqual({ valor_total: 74_000_000 });
  });

  it("RC5 informa ambos montos (sol-004)", () => {
    const v = validarPaquete(paqueteDe("sol-004"), maestrosReales());

    expect(v.confirmaciones[0]?.valores).toEqual({
      solicitud: 25_000_000,
      cotizacion: 26_500_000,
      diferencia_pct: 6,
    });
  });
});

describe("RC5 con monedas distintas", () => {
  it("pide confirmación cuando la cotización y la solicitud están en monedas distintas", () => {
    const base = paqueteDe("sol-001");
    const cotizacion = base.cotizacion && { ...base.cotizacion, moneda: "USD" };
    const v = validarPaquete({ ...base, cotizacion }, maestrosReales());

    expect(v.confirmaciones[0]).toMatchObject({
      regla: "RC5",
      valores: { moneda_solicitud: "COP", moneda_cotizacion: "USD" },
    });
  });
});
