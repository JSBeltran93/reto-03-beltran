import { describe, expect, it } from "vitest";

import {
  alMensajeUsuario,
  autorizar,
  casoPendiente,
  esAfirmativo,
  type EstadoConfirmacion,
  trasHerramienta,
} from "../../src/agente/confirmacion";

const llamadaCrear = (caso: string, confirmado: boolean) => ({
  id: "1",
  nombre: "oc_crear",
  args: { caso, confirmado, payload: {} },
});

const llamadaPayload = (caso: string) => ({
  id: "2",
  nombre: "oc_construir_payload",
  args: { caso },
});

const estadoCon = (...pendientes: string[]): EstadoConfirmacion => ({
  pendientes,
  otorgada: null,
});

describe("esAfirmativo", () => {
  it.each([
    ["Confirmo", true],
    ["sí", true],
    ["Sí", true],
    ["ok", true],
    ["Sí, confirmo.", true],
    ["Confirmo la OC", true],
    ["ok, pero no la crees todavía", false],
    ["confirmo que no quiero crearla", false],
    ["si, pero primero muéstrame la tabla", false],
    ["procede con sol-006", false],
    ["no confirmo", false],
    ["cancela", false],
    ["¿qué falta?", false],
    ["¿por qué debo decir confirmo?", false],
  ])("%j → %s", (mensaje, esperado) => {
    expect(esAfirmativo(mensaje)).toBe(esperado);
  });
});

describe("compuerta de confirmación", () => {
  it("bloquea oc_crear con confirmado=true si el usuario no ha confirmado", () => {
    const estado = estadoCon("sol-004");

    expect(autorizar(estado, llamadaCrear("sol-004", true))?.serializado).toContain(
      "CONFIRMACION_NO_OTORGADA",
    );
  });

  it("solo lo permite para el caso que el usuario confirmó en su último mensaje", () => {
    const estado = estadoCon("sol-004");
    alMensajeUsuario(estado, "Confirmo");

    expect(autorizar(estado, llamadaCrear("sol-004", true))).toBeNull();
    expect(autorizar(estado, llamadaCrear("sol-005", true))?.serializado).toContain(
      "CONFIRMACION_NO_OTORGADA",
    );
  });

  it("con varios casos pendientes, un 'Confirmo' otorga solo el más reciente", () => {
    const estado = estadoCon();
    trasHerramienta(estado, llamadaPayload("sol-004"), {});
    trasHerramienta(estado, llamadaPayload("sol-005"), {});
    expect(casoPendiente(estado)).toBe("sol-005");

    alMensajeUsuario(estado, "Confirmo");
    expect(autorizar(estado, llamadaCrear("sol-005", true))).toBeNull();
    expect(autorizar(estado, llamadaCrear("sol-004", true))).not.toBeNull();

    trasHerramienta(estado, llamadaCrear("sol-005", true), {});
    expect(estado.pendientes).toEqual(["sol-004"]);
    expect(casoPendiente(estado)).toBe("sol-004");
  });

  it("revoca la confirmación con el siguiente mensaje y limpia ante un rechazo", () => {
    const estado = estadoCon("sol-004", "sol-005");
    alMensajeUsuario(estado, "confirmo");
    alMensajeUsuario(estado, "¿y el proveedor?");
    expect(estado.otorgada).toBeNull();
    expect(estado.pendientes).toEqual(["sol-004", "sol-005"]);

    alMensajeUsuario(estado, "no, cancela");
    expect(estado.pendientes).toEqual([]);
    expect(casoPendiente(estado)).toBeNull();
  });

  it("un mensaje con matices no otorga la confirmación", () => {
    const estado = estadoCon("sol-004");
    alMensajeUsuario(estado, "ok, pero no la crees todavía");

    expect(estado.otorgada).toBeNull();
    expect(estado.pendientes).toEqual(["sol-004"]);
  });

  it("deja pasar las llamadas sin confirmado (la herramienta aplica sus propias reglas)", () => {
    expect(autorizar(estadoCon(), llamadaCrear("sol-001", false))).toBeNull();
  });
});
