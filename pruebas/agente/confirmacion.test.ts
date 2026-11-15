import { describe, expect, it } from "vitest";

import {
  alMensajeUsuario,
  autorizar,
  esAfirmativo,
  type EstadoConfirmacion,
} from "../../src/agente/confirmacion";

const llamadaCrear = (caso: string, confirmado: boolean) => ({
  id: "1",
  nombre: "oc_crear",
  args: { caso, confirmado, payload: {} },
});

describe("esAfirmativo", () => {
  it.each([
    ["Confirmo", true],
    ["sí, procede", true],
    ["Sí", true],
    ["ok, adelante", true],
    ["confirmo el valor 0 y la fecha", true],
    ["no confirmo", false],
    ["cancela", false],
    ["¿qué falta?", false],
  ])("%j → %s", (mensaje, esperado) => {
    expect(esAfirmativo(mensaje)).toBe(esperado);
  });
});

describe("compuerta de confirmación", () => {
  it("bloquea oc_crear con confirmado=true si el usuario no ha confirmado", () => {
    const estado: EstadoConfirmacion = { pendiente: "sol-004", otorgada: null };

    expect(autorizar(estado, llamadaCrear("sol-004", true))).toContain("CONFIRMACION_NO_OTORGADA");
  });

  it("solo lo permite para el caso que el usuario confirmó en su último mensaje", () => {
    const estado: EstadoConfirmacion = { pendiente: "sol-004", otorgada: null };
    alMensajeUsuario(estado, "Confirmo");

    expect(autorizar(estado, llamadaCrear("sol-004", true))).toBeNull();
    expect(autorizar(estado, llamadaCrear("sol-005", true))).toContain("CONFIRMACION_NO_OTORGADA");
  });

  it("revoca la confirmación con el siguiente mensaje y limpia ante un rechazo", () => {
    const estado: EstadoConfirmacion = { pendiente: "sol-004", otorgada: null };
    alMensajeUsuario(estado, "confirmo");
    alMensajeUsuario(estado, "¿y el proveedor?");
    expect(estado.otorgada).toBeNull();

    alMensajeUsuario(estado, "no, cancela");
    expect(estado.pendiente).toBeNull();
  });

  it("deja pasar las llamadas sin confirmado (la herramienta aplica sus propias reglas)", () => {
    expect(
      autorizar({ pendiente: null, otorgada: null }, llamadaCrear("sol-001", false)),
    ).toBeNull();
  });
});
