import { describe, expect, it } from "vitest";

import { type Apertura, aperturaDeCaso, type SesionAbierta } from "./useSesionesPorCaso";

const ABIERTA = "11111111-1111-4111-8111-111111111111";
const RECORDADA = "22222222-2222-4222-8222-222222222222";

const abierta = (cambios: Partial<SesionAbierta> = {}): SesionAbierta => ({
  sessionId: ABIERTA,
  vacia: false,
  casos: [],
  ...cambios,
});

describe("aperturaDeCaso", () => {
  it.each<[string, SesionAbierta, Record<string, string>, Apertura]>([
    [
      "sigue en la conversación abierta si ya trata el caso",
      abierta({ casos: ["sol-004"] }),
      { "sol-004": RECORDADA },
      { tipo: "seguir" },
    ],
    [
      "vuelve a la conversación recordada del caso",
      abierta(),
      { "sol-004": RECORDADA },
      { tipo: "volver", sessionId: RECORDADA },
    ],
    [
      "procesa en la conversación abierta si está vacía",
      abierta({ vacia: true }),
      {},
      { tipo: "procesarAqui" },
    ],
    [
      "procesa de nuevo si la conversación recordada quedó vacía",
      abierta({ vacia: true }),
      { "sol-004": ABIERTA },
      { tipo: "procesarAqui" },
    ],
    [
      "sigue si la conversación abierta es la recordada del caso",
      abierta(),
      { "sol-004": ABIERTA },
      { tipo: "seguir" },
    ],
    [
      "procesa en una conversación nueva si la abierta trata otro caso",
      abierta({ casos: ["sol-002"] }),
      { "sol-002": ABIERTA },
      { tipo: "procesarEnNueva" },
    ],
  ])("%s", (_nombre, sesion, mapa, esperada) => {
    expect(aperturaDeCaso("sol-004", sesion, mapa)).toEqual(esperada);
  });
});
