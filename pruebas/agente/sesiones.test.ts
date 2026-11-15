import { describe, expect, it } from "vitest";

import { AlmacenSesiones } from "../../src/agente/sesiones";

describe("AlmacenSesiones", () => {
  it("descarta la sesión usada hace más tiempo (LRU), no la más antigua", () => {
    const almacen = new AlmacenSesiones({ maxSesiones: 2, maxTokensDia: 1000 });
    almacen.obtenerOCrear("a");
    almacen.obtenerOCrear("b");
    almacen.obtener("a");

    almacen.obtenerOCrear("c");

    expect(almacen.obtener("a")).toBeDefined();
    expect(almacen.obtener("b")).toBeUndefined();
    expect(almacen.obtener("c")).toBeDefined();
  });

  it("agota el presupuesto diario compartido y lo reinicia al cambiar de día", () => {
    const almacen = new AlmacenSesiones({ maxSesiones: 5, maxTokensDia: 100 });
    almacen.registrarTokens(almacen.obtenerOCrear("a"), 100, "2026-09-03");

    expect(almacen.presupuestoDiarioAgotado("2026-09-03")).toBe(true);
    expect(almacen.presupuestoDiarioAgotado("2026-09-04")).toBe(false);
  });
});
