import type { VistaSesion } from "@contratos/contratos-api";
import { describe, expect, it, vi } from "vitest";

import { ErrorApi, MENSAJES_ERROR_API } from "../api/cliente";
import { type ContextoFallo, manejarFallo, sondearTurno, SONDEO_TURNO } from "./useConversacion";

const SESION = "s1";
const TEXTO = "hola";
/** Sondeo inmediato para no esperar intervalos reales en las pruebas. */
const SONDEO_RAPIDO = { intervaloMs: 0, intentos: 3 };

const sesion = (terminada: boolean): VistaSesion => ({
  id: SESION,
  historial: terminada
    ? [
        { tipo: "usuario", texto: TEXTO },
        { tipo: "asistente", texto: "listo" },
      ]
    : [{ tipo: "usuario", texto: TEXTO }],
  needsConfirmation: false,
  casoPendiente: null,
});

const contexto = (respuestas: (VistaSesion | null)[]): ContextoFallo => {
  const refrescar = vi.fn();
  for (const data of respuestas) refrescar.mockResolvedValueOnce({ data });
  refrescar.mockResolvedValue({ data: sesion(false) });
  return { despachar: vi.fn(), sessionId: SESION, texto: TEXTO, refrescar, sondeo: SONDEO_RAPIDO };
};

const sinRespuesta = () =>
  new ErrorApi(MENSAJES_ERROR_API.tiempoAgotado, { reintentable: true, sinRespuesta: true });

describe("SONDEO_TURNO", () => {
  it("espera entre consultas y tiene un máximo de intentos", () => {
    expect(SONDEO_TURNO.intervaloMs).toBeGreaterThan(0);
    expect(SONDEO_TURNO.intentos).toBeGreaterThan(1);
  });
});

describe("sondearTurno", () => {
  it.each<[string, (VistaSesion | null)[], number, boolean]>([
    ["terminado en la primera consulta", [sesion(true)], 1, true],
    ["terminado en la tercera consulta", [null, sesion(false), sesion(true)], 3, true],
    ["nunca termina: agota los intentos", [], SONDEO_RAPIDO.intentos, false],
  ])("%s", async (_nombre, respuestas, consultas, encontrada) => {
    const ctx = contexto(respuestas);

    const resultado = await sondearTurno(ctx);

    expect(ctx.refrescar).toHaveBeenCalledTimes(consultas);
    expect(resultado !== null).toBe(encontrada);
  });

  it("sigue sondeando si una consulta falla", async () => {
    const ctx = contexto([]);
    vi.mocked(ctx.refrescar)
      .mockReset()
      .mockRejectedValueOnce(new Error("red"))
      .mockResolvedValue({ data: sesion(true) });

    expect(await sondearTurno(ctx)).toEqual(sesion(true));
  });
});

describe("manejarFallo", () => {
  it("hidrata sin reenviar si el turno terminó en el servidor", async () => {
    const ctx = contexto([null, sesion(true)]);

    await manejarFallo(sinRespuesta(), ctx);

    expect(ctx.despachar).toHaveBeenCalledExactlyOnceWith({
      tipo: "HIDRATAR",
      sessionId: SESION,
      sesion: sesion(true),
    });
  });

  it("muestra el error reintentable si el turno no aparece tras el sondeo", async () => {
    const ctx = contexto([]);

    await manejarFallo(sinRespuesta(), ctx);

    expect(ctx.refrescar).toHaveBeenCalledTimes(SONDEO_RAPIDO.intentos);
    expect(ctx.despachar).toHaveBeenCalledExactlyOnceWith({
      tipo: "FALLO",
      sessionId: SESION,
      error: { mensaje: MENSAJES_ERROR_API.tiempoAgotado, reintentable: true },
    });
  });

  it("no sondea si el servidor respondió y pasa la espera del 429", async () => {
    const ctx = contexto([]);
    const limitado = new ErrorApi("Demasiadas solicitudes.", {
      estado: 429,
      reintentable: true,
      esperaSegundos: 30,
    });

    await manejarFallo(limitado, ctx);

    expect(ctx.refrescar).not.toHaveBeenCalled();
    expect(ctx.despachar).toHaveBeenCalledExactlyOnceWith({
      tipo: "FALLO",
      sessionId: SESION,
      error: { mensaje: "Demasiadas solicitudes.", reintentable: true, esperaSegundos: 30 },
    });
  });
});
