import { describe, expect, it } from "vitest";

import { esIdSesionValido } from "./sesion-guardada";
import { type SesionAbierta, sesionParaCaso } from "./useSesionesPorCaso";

const ABIERTA = "11111111-1111-4111-8111-111111111111";
const RECORDADA = "22222222-2222-4222-8222-222222222222";

const abierta = (cambios: Partial<SesionAbierta> = {}): SesionAbierta => ({
  sessionId: ABIERTA,
  vacia: false,
  casoPendiente: null,
  casos: [],
  ...cambios,
});

describe("sesionParaCaso", () => {
  it.each<[string, SesionAbierta, Record<string, string>, string]>([
    ["vuelve a la sesión recordada del caso", abierta(), { "sol-004": RECORDADA }, RECORDADA],
    [
      "adopta la sesión libre que espera la confirmación de ese caso",
      abierta({ casoPendiente: "sol-004" }),
      { "sol-004": RECORDADA },
      ABIERTA,
    ],
    ["adopta la sesión libre y vacía", abierta({ vacia: true }), {}, ABIERTA],
    [
      "adopta la sesión libre que ya trató ese caso (se ve su historial)",
      abierta({ casos: ["sol-004", "sol-999"] }),
      {},
      ABIERTA,
    ],
  ])("%s", (_nombre, sesion, mapa, esperada) => {
    expect(sesionParaCaso("sol-004", sesion, mapa)).toBe(esperada);
  });

  it.each<[string, SesionAbierta, Record<string, string>]>([
    ["la sesión abierta es de otro caso", abierta({ vacia: true }), { "sol-001": ABIERTA }],
    ["la sesión libre tiene otra conversación", abierta({ casoPendiente: "sol-002" }), {}],
    ["la sesión libre trató otros casos", abierta({ casos: ["sol-002"] }), {}],
    [
      "la sesión que trató el caso ya es de otro caso",
      abierta({ casos: ["sol-004"] }),
      { "sol-001": ABIERTA },
    ],
  ])("abre una sesión nueva si %s", (_nombre, sesion, mapa) => {
    const id = sesionParaCaso("sol-004", sesion, mapa);

    expect(id).not.toBe(ABIERTA);
    expect(esIdSesionValido(id)).toBe(true);
  });
});
