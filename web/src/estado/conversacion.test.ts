import { describe, expect, it } from "vitest";

import { estadoInicial, reducirConversacion } from "./conversacion";

describe("reducirConversacion", () => {
  it("agrega el mensaje del usuario al enviar", () => {
    const estado = reducirConversacion(estadoInicial("s1"), { tipo: "ENVIAR", texto: "hola" });

    expect(estado.entradas).toEqual([{ tipo: "usuario", texto: "hola" }]);
    expect(estado.ultimoMensaje).toBe("hola");
  });

  it("agrega las llamadas antes de la respuesta y conserva la confirmación pendiente", () => {
    const enviado = reducirConversacion(estadoInicial("s1"), { tipo: "ENVIAR", texto: "procesa" });
    const llamada = { nombre: "oc_validar", args: {}, ok: true, resumen: "apta" };

    const estado = reducirConversacion(enviado, {
      tipo: "RESPUESTA",
      respuesta: { reply: "¿Confirmas?", toolCalls: [llamada], needsConfirmation: true },
    });

    expect(estado.entradas.map((e) => e.tipo)).toEqual(["usuario", "herramienta", "asistente"]);
    expect(estado.esperaConfirmacion).toBe(true);
  });

  it("guarda el error al fallar y lo limpia al reintentar", () => {
    const conError = reducirConversacion(estadoInicial("s1"), { tipo: "FALLO", mensaje: "falló" });

    expect(conError.error).toBe("falló");
    expect(reducirConversacion(conError, { tipo: "REINTENTAR" }).error).toBeNull();
  });

  it("reinicia todo con una sesión nueva", () => {
    const usado = reducirConversacion(estadoInicial("s1"), { tipo: "ENVIAR", texto: "hola" });

    expect(reducirConversacion(usado, { tipo: "NUEVA_SESION", sessionId: "s2" })).toEqual(
      estadoInicial("s2"),
    );
  });
});
