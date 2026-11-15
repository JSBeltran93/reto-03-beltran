import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { mensajeDeError, MENSAJES_ERROR_API } from "./cliente";

describe("mensajeDeError", () => {
  it("traduce un tiempo agotado", () => {
    expect(mensajeDeError(new AxiosError("timeout", AxiosError.ECONNABORTED))).toBe(
      MENSAJES_ERROR_API.tiempoAgotado,
    );
  });

  it("informa el estado HTTP cuando el servidor responde con error", () => {
    const error = new AxiosError("fallo", "ERR_BAD_RESPONSE", undefined, undefined, {
      status: 500,
      statusText: "Error",
      data: {},
      headers: {},
      config: { headers: new AxiosHeaders() },
    });

    expect(mensajeDeError(error)).toBe("El servidor respondió 500. Intenta de nuevo.");
  });

  it("indica falta de conexión cuando no hay respuesta", () => {
    expect(mensajeDeError(new AxiosError("network", AxiosError.ERR_NETWORK))).toBe(
      MENSAJES_ERROR_API.sinConexion,
    );
  });
});
