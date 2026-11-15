import type { EntradaHistorial, VistaLlamada } from "@contratos/contratos-api";
import { describe, expect, it } from "vitest";

import {
  type AccionConversacion,
  estadoInicial,
  MENSAJE_CLAVE_INVALIDA,
  reducirConversacion,
  terminoEnError,
  ultimoMensajeUsuario,
} from "./conversacion";

const SESION = "s1";
const llamada = (nombre: string, ok = true): VistaLlamada => ({
  nombre,
  args: {},
  ok,
  resumen: "r",
});
const respuesta = (cambios = {}) => ({
  reply: "¿Confirmas?",
  toolCalls: [llamada("oc_validar")],
  needsConfirmation: true,
  ...cambios,
});

describe("reducirConversacion", () => {
  it.each<[string, AccionConversacion, Partial<ReturnType<typeof estadoInicial>>]>([
    [
      "agrega el mensaje del usuario al enviar",
      { tipo: "ENVIAR", texto: "hola" },
      { ultimoMensaje: "hola" },
    ],
    [
      "guarda el error al fallar",
      { tipo: "FALLO", sessionId: SESION, error: { mensaje: "falló", reintentable: true } },
      { error: { mensaje: "falló", reintentable: true } },
    ],
    [
      "conserva la confirmación pendiente de la respuesta",
      { tipo: "RESPUESTA", sessionId: SESION, respuesta: respuesta() },
      { esperaConfirmacion: true },
    ],
    [
      "guarda el caso pendiente que informa el servidor",
      { tipo: "RESPUESTA", sessionId: SESION, respuesta: respuesta({ casoPendiente: "sol-004" }) },
      { casoPendiente: "sol-004" },
    ],
    [
      "deja los errores del sistema solo en el historial sin perder la confirmación",
      {
        tipo: "RESPUESTA",
        sessionId: SESION,
        respuesta: respuesta({ esError: true, reply: "no disponible" }),
      },
      {
        error: null,
        esperaConfirmacion: true,
        claveInvalida: false,
      },
    ],
    [
      "marca la clave inválida del modelo",
      {
        tipo: "RESPUESTA",
        sessionId: SESION,
        respuesta: respuesta({ esError: true, reply: MENSAJE_CLAVE_INVALIDA }),
      },
      { claveInvalida: true },
    ],
    [
      "hidrata con el estado de confirmación del servidor",
      {
        tipo: "HIDRATAR",
        sessionId: SESION,
        sesion: { id: SESION, historial: [], needsConfirmation: true, casoPendiente: "sol-004" },
      },
      { esperaConfirmacion: true, casoPendiente: "sol-004" },
    ],
    [
      "al hidratar recuerda el último mensaje del usuario para poder reintentar",
      {
        tipo: "HIDRATAR",
        sessionId: SESION,
        sesion: {
          id: SESION,
          historial: [
            { tipo: "usuario", texto: "procesa sol-004" },
            { tipo: "error", texto: "no disponible" },
          ],
          needsConfirmation: false,
          casoPendiente: null,
        },
      },
      { ultimoMensaje: "procesa sol-004" },
    ],
  ])("%s", (_nombre, accion, esperado) => {
    expect(reducirConversacion(estadoInicial(SESION), accion)).toMatchObject(esperado);
  });

  it("ubica las llamadas antes de la respuesta del agente", () => {
    const estado = reducirConversacion(estadoInicial(SESION), {
      tipo: "RESPUESTA",
      sessionId: SESION,
      respuesta: respuesta(),
    });

    expect(estado.entradas.map((e) => e.tipo)).toEqual(["herramienta", "asistente"]);
  });

  it("agrega al historial la respuesta marcada como error", () => {
    const estado = reducirConversacion(estadoInicial(SESION), {
      tipo: "RESPUESTA",
      sessionId: SESION,
      respuesta: respuesta({ esError: true, reply: "no disponible" }),
    });

    expect(estado.entradas.at(-1)).toEqual({ tipo: "error", texto: "no disponible" });
  });

  it.each<AccionConversacion>([
    { tipo: "RESPUESTA", sessionId: "otra", respuesta: respuesta() },
    { tipo: "FALLO", sessionId: "otra", error: { mensaje: "x", reintentable: true } },
    {
      tipo: "HIDRATAR",
      sessionId: "otra",
      sesion: { id: "otra", historial: [], needsConfirmation: false, casoPendiente: null },
    },
  ])("ignora $tipo de otra sesión", (accion) => {
    const estado = estadoInicial(SESION);

    expect(reducirConversacion(estado, accion)).toBe(estado);
  });

  it("limpia el error al reintentar y reinicia todo con una sesión nueva", () => {
    const conError = reducirConversacion(estadoInicial(SESION), {
      tipo: "FALLO",
      sessionId: SESION,
      error: { mensaje: "x", reintentable: true },
    });

    expect(reducirConversacion(conError, { tipo: "REINTENTAR" }).error).toBeNull();
    expect(reducirConversacion(conError, { tipo: "NUEVA_SESION", sessionId: "s2" })).toEqual(
      estadoInicial("s2"),
    );
  });
});

describe("terminoEnError y ultimoMensajeUsuario", () => {
  it.each<[string, EntradaHistorial[], boolean]>([
    ["sin historial", [], false],
    ["la última entrada es un error", [{ tipo: "error", texto: "x" }], true],
    [
      "después del error el agente respondió",
      [
        { tipo: "error", texto: "x" },
        { tipo: "asistente", texto: "ok" },
      ],
      false,
    ],
  ])("terminoEnError: %s", (_nombre, entradas, esperado) => {
    expect(terminoEnError(entradas)).toBe(esperado);
  });

  it("ultimoMensajeUsuario toma el mensaje más reciente del usuario", () => {
    const entradas: EntradaHistorial[] = [
      { tipo: "usuario", texto: "uno" },
      { tipo: "usuario", texto: "dos" },
      { tipo: "error", texto: "x" },
    ];

    expect(ultimoMensajeUsuario(entradas)).toBe("dos");
    expect(ultimoMensajeUsuario([])).toBeNull();
  });
});
