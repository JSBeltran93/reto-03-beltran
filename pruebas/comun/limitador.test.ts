import { describe, expect, it } from "vitest";

import { LimitadorSolicitudes, VENTANA_LIMITADOR_MS } from "../../src/comun/limitador";
import type { Reloj } from "../../src/comun/reloj";

/** Reloj controlable para avanzar el tiempo en las pruebas. */
function relojManual(inicio: number) {
  const estado = { ahora: inicio };
  const reloj: Reloj = { ahora: () => new Date(estado.ahora) };
  return { reloj, avanzar: (ms: number) => (estado.ahora += ms) };
}

describe("LimitadorSolicitudes", () => {
  it("permite hasta el máximo por ventana y luego pide esperar", () => {
    const { reloj } = relojManual(0);
    const limitador = new LimitadorSolicitudes(2, reloj);

    expect(limitador.registrar("ip")).toBe(0);
    expect(limitador.registrar("ip")).toBe(0);
    expect(limitador.registrar("ip")).toBeGreaterThan(0);
    expect(limitador.registrar("otra-ip")).toBe(0);
  });

  it("reinicia el conteo al pasar la ventana", () => {
    const { reloj, avanzar } = relojManual(0);
    const limitador = new LimitadorSolicitudes(1, reloj);
    limitador.registrar("ip");

    avanzar(VENTANA_LIMITADOR_MS);

    expect(limitador.registrar("ip")).toBe(0);
  });
});
