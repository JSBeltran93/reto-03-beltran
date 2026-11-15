import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validar } from "../../../src/tools/oc";
import { paqueteDe } from "../../apoyo/paquetes";
import { contexto, crearProyectoTemporal, leerJsonTexto } from "../../apoyo/proyecto";

interface ValidacionJson {
  data: {
    apta: boolean;
    retroactiva: boolean;
    bloqueos: { regla: string }[];
    confirmaciones: { regla: string }[];
    aviso?: string;
  };
}

const ejecutarValidacion = async (raiz: string, caso: string, paquete = paqueteDe(caso)) =>
  leerJsonTexto(await validar.execute({ caso, paquete }, contexto(raiz))) as ValidacionJson;

describe("oc_validar", () => {
  it.each([
    ["sol-001", true, [], [], false],
    ["sol-002", false, ["RC1"], [], false],
    ["sol-003", false, ["RC2", "RC3"], [], false],
    ["sol-004", true, [], ["RC5"], false],
    ["sol-005", true, [], ["RC8"], true],
    ["sol-006", true, [], ["RC6"], false],
  ])(
    "%s → apta=%s bloqueos=%j confirmaciones=%j",
    async (caso, apta, bloqueos, confirmaciones, retroactiva) => {
      const { data } = await ejecutarValidacion(crearProyectoTemporal(), caso);

      expect(data.apta).toBe(apta);
      expect(data.bloqueos.map((h) => h.regla)).toEqual(bloqueos);
      expect(data.confirmaciones.map((h) => h.regla)).toEqual(confirmaciones);
      expect(data.retroactiva).toBe(retroactiva);
    },
  );

  it("registra los intentos bloqueados en out/control.csv", async () => {
    const raiz = crearProyectoTemporal();
    await ejecutarValidacion(raiz, "sol-002");

    const lineas = readFileSync(path.join(raiz, "out", "control.csv"), "utf8")
      .trim()
      .split("\n");

    expect(lineas[0]).toBe(
      "solicitud_id,resultado,numero_oc,retroactiva,bloqueos,confirmaciones,ts",
    );
    expect(lineas[1]).toMatch(/^SOL-2026-002,bloqueada,,false,RC1,,\d{4}-/);
  });

  it("valida con los documentos del caso cuando el modelo altera el paquete", async () => {
    const original = paqueteDe("sol-002");
    const alterado = {
      ...original,
      solicitud: { ...original.solicitud, proveedor_nit: "900555111" },
    };

    const { data } = await ejecutarValidacion(crearProyectoTemporal(), "sol-002", alterado);

    expect(data.apta).toBe(false);
    expect(data.aviso).toContain("difiere");
  });
});
