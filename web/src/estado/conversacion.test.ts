import type { EntradaHistorial, VistaLlamada } from "@contratos/contratos-api";
import { describe, expect, it } from "vitest";

import {
  type AccionConversacion,
  esperaConfirmacionEnHistorial,
  estadoInicial,
  reducirConversacion,
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
      "muestra los errores del sistema como error reintentable",
      {
        tipo: "RESPUESTA",
        sessionId: SESION,
        respuesta: respuesta({ esError: true, reply: "no disponible" }),
      },
      { error: { mensaje: "no disponible", reintentable: true }, esperaConfirmacion: false },
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

  it.each<AccionConversacion>([
    { tipo: "RESPUESTA", sessionId: "otra", respuesta: respuesta() },
    { tipo: "FALLO", sessionId: "otra", error: { mensaje: "x", reintentable: true } },
    { tipo: "HIDRATAR", sessionId: "otra", historial: [{ tipo: "usuario", texto: "x" }] },
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

describe("esperaConfirmacionEnHistorial", () => {
  const pregunta: EntradaHistorial = { tipo: "asistente", texto: "¿Confirmas?" };
  const herramienta = (nombre: string): EntradaHistorial => ({
    tipo: "herramienta",
    llamada: llamada(nombre),
  });

  it.each<[string, EntradaHistorial[], boolean]>([
    ["payload construido y pregunta final", [herramienta("oc_construir_payload"), pregunta], true],
    [
      "OC ya creada",
      [herramienta("oc_construir_payload"), herramienta("oc_crear"), pregunta],
      false,
    ],
    ["sin payload", [herramienta("oc_validar"), pregunta], false],
    [
      "termina en el usuario",
      [herramienta("oc_construir_payload"), { tipo: "usuario", texto: "x" }],
      false,
    ],
  ])("%s → %s", (_nombre, historial, esperado) => {
    expect(esperaConfirmacionEnHistorial(historial)).toBe(esperado);
  });
});
