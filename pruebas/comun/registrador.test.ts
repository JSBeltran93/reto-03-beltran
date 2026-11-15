import { afterEach, describe, expect, it, vi } from "vitest";

import { registradorJson } from "../../src/comun/registrador";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registradorJson", () => {
  it("no deja que los datos sobrescriban los campos base", () => {
    const salida = vi.spyOn(console, "log").mockImplementation(() => undefined);

    registradorJson.info("evento_real", { evento: "falso", nivel: "error", extra: 1 });

    const linea = JSON.parse(String(salida.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(linea).toMatchObject({ evento: "evento_real", nivel: "info", extra: 1 });
  });
});
