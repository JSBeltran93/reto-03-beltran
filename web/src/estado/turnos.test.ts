import type { EntradaHistorial, VistaLlamada } from "@contratos/contratos-api";
import { describe, expect, it } from "vitest";

import { agruparEnTurnos } from "./turnos";

const llamada = (nombre: string): VistaLlamada => ({ nombre, args: {}, ok: true, resumen: "ok" });
const herramienta = (nombre: string): EntradaHistorial => ({
  tipo: "herramienta",
  llamada: llamada(nombre),
});

describe("agruparEnTurnos", () => {
  it("junta las llamadas y la respuesta que siguen a cada mensaje en un turno del asistente", () => {
    const historial: EntradaHistorial[] = [
      { tipo: "usuario", texto: "procesa" },
      herramienta("oc_leer_paquete"),
      herramienta("oc_validar"),
      { tipo: "asistente", texto: "¿Confirmas?" },
      { tipo: "usuario", texto: "Confirmo" },
      { tipo: "error", texto: "Sin modelo" },
    ];

    expect(agruparEnTurnos(historial)).toEqual([
      { tipo: "usuario", texto: "procesa" },
      {
        tipo: "asistente",
        llamadas: [llamada("oc_leer_paquete"), llamada("oc_validar")],
        respuesta: { tipo: "asistente", texto: "¿Confirmas?" },
      },
      { tipo: "usuario", texto: "Confirmo" },
      { tipo: "asistente", llamadas: [], respuesta: { tipo: "error", texto: "Sin modelo" } },
    ]);
  });

  it("deja abierto un turno con llamadas pero sin respuesta y separa dos respuestas seguidas", () => {
    const turnos = agruparEnTurnos([
      { tipo: "asistente", texto: "uno" },
      { tipo: "asistente", texto: "dos" },
      herramienta("oc_validar"),
    ]);

    expect(turnos).toHaveLength(3);
    expect(turnos[2]).toEqual({
      tipo: "asistente",
      llamadas: [llamada("oc_validar")],
      respuesta: null,
    });
  });
});
