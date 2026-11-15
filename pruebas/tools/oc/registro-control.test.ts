import { describe, expect, it } from "vitest";

import { filaCsv, RESULTADOS_CONTROL } from "../../../src/tools/oc/registro-control";

const fila = (solicitudId: string) => ({
  solicitud_id: solicitudId,
  resultado: RESULTADOS_CONTROL.creada,
  numero_oc: "4500000001",
  retroactiva: false,
  bloqueos: [],
  confirmaciones: ["RC5", "RC8"],
  ts: "2026-09-03T15:00:00.000Z",
});

describe("filaCsv", () => {
  it("serializa en el orden de columnas del PRD y une las reglas con ;", () => {
    expect(filaCsv(fila("SOL-1"))).toBe(
      "SOL-1,creada,4500000001,false,,RC5;RC8,2026-09-03T15:00:00.000Z",
    );
  });

  it.each(["=HYPERLINK(1)", "+1", "-2", "@SUMA"])(
    "neutraliza la fórmula %s para hojas de cálculo",
    (valor) => {
      expect(filaCsv(fila(valor)).startsWith(`'${valor}`)).toBe(true);
    },
  );

  it("escapa comas y comillas", () => {
    expect(filaCsv(fila('SOL "1", A'))).toContain('"SOL ""1"", A"');
  });
});
