import { describe, expect, it } from "vitest";

import {
  alMensajeUsuario,
  autorizar,
  casoPendiente,
  esAfirmativo,
  type EstadoConfirmacion,
  trasHerramienta,
} from "../../src/agente/confirmacion";
import type { Ejecucion } from "../../src/agente/registro-herramientas";
import type { CodigoError } from "../../src/comun/errores";
import { exito, fallo } from "../../src/comun/resultado";

const llamadaCrear = (caso: string, confirmado: boolean) => ({
  id: "1",
  nombre: "oc_crear",
  args: { caso, confirmado, payload: {} },
});

const llamadaValidar = (caso: string) => ({
  id: "2",
  nombre: "oc_validar",
  args: { caso, paquete: {} },
});

const llamadaPayload = (caso: string) => ({
  id: "3",
  nombre: "oc_construir_payload",
  args: { caso },
});

const estadoCon = (...pendientes: string[]): EstadoConfirmacion => ({
  pendientes,
  otorgada: null,
});

/** Ejecución exitosa con los datos dados, como la arma `ejecutarLlamada`. */
const exitosa = (data: unknown): Ejecucion => ({
  vista: { nombre: "x", args: {}, ok: true, resumen: "" },
  serializado: JSON.stringify(exito(data)),
  data,
});

/** Ejecución fallida con el código dado. */
const fallida = (codigo: CodigoError): Ejecucion => ({
  vista: { nombre: "x", args: {}, ok: false, resumen: codigo },
  serializado: JSON.stringify(fallo(codigo, "mensaje")),
  data: undefined,
});

const validacion = (apta: boolean, ...confirmaciones: string[]) =>
  exitosa({ apta, bloqueos: [], confirmaciones: confirmaciones.map((regla) => ({ regla })) });

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
  it("ejecuta oc_crear con confirmado=false si el usuario no ha confirmado", () => {
    const llamada = llamadaCrear("sol-004", true);

    const efectiva = autorizar(estadoCon("sol-004"), llamada);

    expect(efectiva.args).toMatchObject({ caso: "sol-004", confirmado: false });
    expect(efectiva.id).toBe(llamada.id);
    expect(llamada.args.confirmado).toBe(true);
  });

  it("también fuerza confirmado=false en un caso sin confirmaciones (sol-001)", () => {
    expect(autorizar(estadoCon(), llamadaCrear("sol-001", true)).args).toMatchObject({
      confirmado: false,
    });
  });

  it("solo respeta confirmado=true para el caso que el usuario confirmó en su último mensaje", () => {
    const estado = estadoCon("sol-004");
    alMensajeUsuario(estado, "Confirmo");
    const confirmada = llamadaCrear("sol-004", true);

    expect(autorizar(estado, confirmada)).toBe(confirmada);
    expect(autorizar(estado, llamadaCrear("sol-005", true)).args).toMatchObject({
      confirmado: false,
    });
  });

  it("deja pasar sin cambios las llamadas sin confirmado y las demás herramientas", () => {
    const sinConfirmar = llamadaCrear("sol-001", false);
    const validar = llamadaValidar("sol-001");

    expect(autorizar(estadoCon(), sinConfirmar)).toBe(sinConfirmar);
    expect(autorizar(estadoCon(), validar)).toBe(validar);
  });
});

describe("casos pendientes de confirmación", () => {
  it("un caso sin confirmaciones nunca queda pendiente (sol-001)", () => {
    const estado = estadoCon();
    trasHerramienta(estado, llamadaValidar("sol-001"), validacion(true));
    trasHerramienta(estado, llamadaPayload("sol-001"), exitosa({ orden: {} }));

    expect(estado.pendientes).toEqual([]);
    expect(casoPendiente(estado)).toBeNull();
  });

  it("queda pendiente al validar apto con confirmaciones y sale al crear la OC (sol-004)", () => {
    const estado = estadoCon();
    trasHerramienta(estado, llamadaValidar("sol-004"), validacion(true, "RC5"));
    expect(estado.pendientes).toEqual(["sol-004"]);

    trasHerramienta(estado, llamadaCrear("sol-004", true), exitosa({ numero_oc: "1" }));
    expect(estado.pendientes).toEqual([]);
  });

  it("una validación no apta o sin confirmaciones quita el caso de pendientes", () => {
    const estado = estadoCon("sol-004", "sol-006");
    trasHerramienta(estado, llamadaValidar("sol-004"), validacion(false, "RC5"));
    trasHerramienta(estado, llamadaValidar("sol-006"), validacion(true));

    expect(estado.pendientes).toEqual([]);
  });

  it("oc_crear con REQUIERE_CONFIRMACION deja el caso pendiente; otros errores no", () => {
    const estado = estadoCon();
    trasHerramienta(estado, llamadaCrear("sol-006", false), fallida("REQUIERE_CONFIRMACION"));
    trasHerramienta(estado, llamadaCrear("sol-002", false), fallida("NO_APTA"));

    expect(estado.pendientes).toEqual(["sol-006"]);
  });

  it("con varios casos pendientes, un 'Confirmo' otorga solo el más reciente", () => {
    const estado = estadoCon();
    trasHerramienta(estado, llamadaValidar("sol-004"), validacion(true, "RC5"));
    trasHerramienta(estado, llamadaValidar("sol-006"), validacion(true, "RC9"));
    expect(casoPendiente(estado)).toBe("sol-006");

    alMensajeUsuario(estado, "Confirmo");
    const confirmada = llamadaCrear("sol-006", true);
    expect(autorizar(estado, confirmada)).toBe(confirmada);
    expect(autorizar(estado, llamadaCrear("sol-004", true)).args).toMatchObject({
      confirmado: false,
    });

    trasHerramienta(estado, confirmada, exitosa({ numero_oc: "1" }));
    expect(estado.pendientes).toEqual(["sol-004"]);
    expect(estado.otorgada).toBeNull();
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
});
