import { afterEach, describe, expect, it } from "vitest";

import {
  CLAVE_SESIONES_POR_CASO,
  leerSesionesPorCaso,
  recordarSesionDeCaso,
} from "./sesion-guardada";

const SESION_A = "11111111-1111-4111-8111-111111111111";
const SESION_B = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  localStorage.clear();
});

describe("sesiones por caso", () => {
  it("recuerda la sesión de cada caso", () => {
    recordarSesionDeCaso("sol-004", SESION_A);
    recordarSesionDeCaso("sol-001", SESION_B);

    expect(leerSesionesPorCaso()).toEqual({ "sol-004": SESION_A, "sol-001": SESION_B });
  });

  it("reemplaza la sesión de un caso (p. ej. tras «Nueva sesión»)", () => {
    recordarSesionDeCaso("sol-004", SESION_A);
    recordarSesionDeCaso("sol-004", SESION_B);

    expect(leerSesionesPorCaso()).toEqual({ "sol-004": SESION_B });
  });

  it.each([
    ["no hay nada guardado", null],
    ["no es JSON", "{roto"],
    ["no cumple el contrato", JSON.stringify({ "sol-004": "no-es-uuid" })],
  ])("devuelve un mapa vacío si %s", (_motivo, guardado) => {
    if (guardado !== null) localStorage.setItem(CLAVE_SESIONES_POR_CASO, guardado);

    expect(leerSesionesPorCaso()).toEqual({});
  });
});
