import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { convertirError, ErrorApi, ESTADOS_HTTP, MENSAJES_ERROR_API } from "./cliente";

const conRespuesta = (status: number, data: unknown): AxiosError =>
  new AxiosError("fallo", "ERR_BAD_RESPONSE", undefined, undefined, {
    status,
    statusText: "Error",
    data,
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe("convertirError", () => {
  it.each([
    [
      "tiempo agotado",
      new AxiosError("t", AxiosError.ECONNABORTED),
      MENSAJES_ERROR_API.tiempoAgotado,
      true,
      true,
    ],
    [
      "sin conexión",
      new AxiosError("n", AxiosError.ERR_NETWORK),
      MENSAJES_ERROR_API.sinConexion,
      true,
      true,
    ],
    [
      "cancelada",
      new AxiosError("c", AxiosError.ERR_CANCELED),
      MENSAJES_ERROR_API.cancelada,
      true,
      false,
    ],
    ["error no axios", new Error("x"), MENSAJES_ERROR_API.inesperado, true, false],
    [
      "5xx sin mensaje",
      conRespuesta(ESTADOS_HTTP.errorServidor, {}),
      MENSAJES_ERROR_API.respuestaServidor(ESTADOS_HTTP.errorServidor),
      true,
      false,
    ],
  ])("%s", (_nombre, error, mensaje, reintentable, sinRespuesta) => {
    const convertido = convertirError(error);

    expect(convertido).toBeInstanceOf(ErrorApi);
    expect(convertido).toMatchObject({ message: mensaje, reintentable, sinRespuesta });
  });

  it("usa el mensaje del servidor y marca los 4xx como no reintentables", () => {
    const convertido = convertirError(conRespuesta(400, { error: "Solicitud inválida." }));

    expect(convertido).toMatchObject({
      message: "Solicitud inválida.",
      estado: 400,
      reintentable: false,
    });
  });

  it("permite reintentar un 429", () => {
    expect(convertirError(conRespuesta(ESTADOS_HTTP.demasiadasSolicitudes, {})).reintentable).toBe(
      true,
    );
  });
});
