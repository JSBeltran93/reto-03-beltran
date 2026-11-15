import { describe, expect, it } from "vitest";

import {
  contieneAprobado,
  fechaCalendario,
  normalizarNombre,
} from "../../../src/tools/oc/normalizar";

describe("normalizarNombre", () => {
  it.each([
    ["TecnoSuministros S.A.S.", "tecnosuministros"],
    ["Papelería Central Ltda.", "papeleriacentral"],
    ["Mobiliario Andino S.A.", "mobiliarioandino"],
  ])("normaliza %s", (nombre, esperado) => {
    expect(normalizarNombre(nombre)).toBe(esperado);
  });
});

describe("contieneAprobado", () => {
  it.each([
    ["Aprobado.", true],
    ["Aprobado por 25 millones según la solicitud.", true],
    ["Queda aprobado", true],
    ["No aprobado por presupuesto", false],
    ["Solicitud desaprobado", false],
    ["Revisar antes de continuar", false],
  ])("evalúa %j", (texto, esperado) => {
    expect(contieneAprobado(texto)).toBe(esperado);
  });
});

describe("fechaCalendario", () => {
  it("conserva el día calendario de la zona horaria original", () => {
    expect(fechaCalendario("2026-08-26T18:45:00-05:00")).toBe("2026-08-26");
  });
});
