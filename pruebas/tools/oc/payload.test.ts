import { describe, expect, it } from "vitest";

import { EsquemaOrdenCompra } from "../../../src/tools/oc/esquemas";
import { construirOrden, derivarUnidad, truncarDescripcion } from "../../../src/tools/oc/payload";
import { validarPaquete } from "../../../src/tools/oc/validacion";
import { maestrosReales, paqueteDe } from "../../apoyo/paquetes";

const ordenDe = (caso: string) => {
  const paquete = paqueteDe(caso);
  return construirOrden(paquete, validarPaquete(paquete, maestrosReales()), "hash");
};

describe("truncarDescripcion", () => {
  it("deja igual los textos cortos", () => {
    expect(truncarDescripcion("Papelería y tóner para el trimestre")).toBe(
      "Papelería y tóner para el trimestre",
    );
  });

  it("corta los textos largos en un límite de palabra dentro de 40 caracteres", () => {
    const corto = truncarDescripcion("Mobiliario para nueva sede: 40 puestos de trabajo con silla");

    expect(corto.length).toBeLessThanOrEqual(40);
    expect(corto).toBe("Mobiliario para nueva sede: 40 puestos…");
  });
});

describe("derivarUnidad", () => {
  it.each([
    ["Bolsa de 100 horas de arquitectura", "H"],
    ["Soporte mensual de la plataforma", "MES"],
    ["Renovación licencias antivirus, vigencia 12 meses", "UN"],
  ])("%s → %s", (texto, unidad) => {
    expect(derivarUnidad(texto)).toBe(unidad);
  });
});

describe("construirOrden", () => {
  it("arma un payload SAP válido para sol-001 con trazabilidad completa", () => {
    const resultado = ordenDe("sol-001");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(EsquemaOrdenCompra.safeParse(resultado.data.orden).success).toBe(true);
    expect(resultado.data.orden).toMatchObject({
      referencia: { solicitud_id: "SOL-2026-001", cotizacion_ref: "COT-TS-2026-0451" },
      sociedad: "1000",
      proveedor: { codigo_sap: "100234" },
      condiciones_pago: "Z030",
      excepciones: [],
    });
    expect(Object.keys(resultado.data.trazabilidad)).toContain("posiciones[0].indicador_iva");
  });

  it("usa los valores por defecto del proveedor en sol-006 y los traza al maestro", () => {
    const resultado = ordenDe("sol-006");

    expect(resultado.ok && resultado.data.orden.posiciones[0]?.indicador_iva).toBe("C1");
    expect(resultado.ok && resultado.data.orden.condiciones_pago).toBe("Z030");
    expect(resultado.ok && resultado.data.trazabilidad.condiciones_pago).toEqual({
      fuente: "maestro.proveedores",
    });
  });

  it("registra las confirmaciones como excepciones pendientes", () => {
    const resultado = ordenDe("sol-004");

    expect(resultado.ok && resultado.data.orden.excepciones).toEqual([
      expect.objectContaining({ codigo: "RC5", confirmado_por: null }),
    ]);
  });

  it("rechaza los casos bloqueados", () => {
    expect(ordenDe("sol-002")).toMatchObject({ ok: false, error: { codigo: "NO_APTA" } });
  });
});
