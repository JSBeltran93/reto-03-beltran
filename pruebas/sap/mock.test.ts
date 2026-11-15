import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { relojFijo } from "../../src/comun/reloj";
import { SapSimulado } from "../../src/sap/mock";
import { construirOrden } from "../../src/tools/oc/payload";
import { validarPaquete } from "../../src/tools/oc/validacion";
import { maestrosReales, paqueteDe } from "../apoyo/paquetes";
import { crearProyectoTemporal } from "../apoyo/proyecto";

const ordenDe = (caso: string) => {
  const paquete = paqueteDe(caso);
  const resultado = construirOrden(paquete, validarPaquete(paquete, maestrosReales()), "h");
  if (!resultado.ok) throw new Error("fixture no apto");
  return resultado.data.orden;
};

describe("SapSimulado", () => {
  it("numera en secuencia desde 4500000001 aunque se creen en paralelo", async () => {
    const raiz = crearProyectoTemporal();
    const sap = new SapSimulado(raiz, relojFijo("2026-09-01T10:00:00Z"));

    const [a, b] = await Promise.all([
      sap.crearOrden(ordenDe("sol-001")),
      sap.crearOrden(ordenDe("sol-006")),
    ]);

    expect([a.numero_oc, b.numero_oc]).toEqual(["4500000001", "4500000002"]);
    const lineas = readFileSync(path.join(raiz, "out/sap/ordenes.jsonl"), "utf8")
      .trim()
      .split("\n");
    expect(lineas).toHaveLength(2);
  });

  it("encuentra una orden por la referencia de la solicitud", async () => {
    const sap = new SapSimulado(crearProyectoTemporal(), relojFijo("2026-09-01T10:00:00Z"));
    await sap.crearOrden(ordenDe("sol-001"));

    expect(await sap.buscarOrdenPorReferencia("SOL-2026-001")).toEqual({
      numero_oc: "4500000001",
      fecha: "2026-09-01T10:00:00.000Z",
    });
    expect(await sap.buscarOrdenPorReferencia("SOL-2026-999")).toBeNull();
  });

  it("consulta proveedores por NIT", async () => {
    const sap = new SapSimulado(crearProyectoTemporal());

    expect(await sap.consultarProveedor("900.555.111-2")).toEqual({
      codigo_sap: "100234",
      activo: true,
    });
    expect(await sap.consultarProveedor("123")).toBeNull();
  });

  it("no crea una segunda OC para la misma solicitud aunque lleguen en paralelo", async () => {
    const raiz = crearProyectoTemporal();
    const sap = new SapSimulado(raiz, relojFijo("2026-09-01T10:00:00Z"));
    const orden = ordenDe("sol-001");

    const [a, b] = await Promise.all([sap.crearOrden(orden), sap.crearOrden(orden)]);

    expect(a.numero_oc).toBe(b.numero_oc);
    expect([a.existente, b.existente]).toEqual([false, true]);
    const lineas = readFileSync(path.join(raiz, "out/sap/ordenes.jsonl"), "utf8")
      .trim()
      .split("\n");
    expect(lineas).toHaveLength(1);
  });
});
