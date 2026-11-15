import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { enviarMensaje, obtenerSalud } from "./api/chat";
import { ErrorApi, MENSAJES_ERROR_API } from "./api/cliente";
import Aplicacion from "./Aplicacion";
import { renderizarConConsultas } from "./pruebas/utilidades";

vi.mock("./api/chat", () => ({ enviarMensaje: vi.fn(), obtenerSalud: vi.fn() }));

beforeEach(() => {
  vi.mocked(obtenerSalud).mockResolvedValue({
    ok: true,
    provider: "anthropic",
    model: "claude-opus-5-5",
  });
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Aplicacion", () => {
  it("muestra las llamadas a herramientas y destaca la confirmación", async () => {
    vi.mocked(enviarMensaje).mockResolvedValue({
      reply: "La cotización difiere 6 %. ¿Confirmas?",
      toolCalls: [
        {
          nombre: "oc_validar",
          args: { caso: "sol-004" },
          ok: true,
          resumen: "apta · confirmaciones: RC5",
        },
      ],
      needsConfirmation: true,
    });
    renderizarConConsultas(<Aplicacion />);

    expect(await screen.findByText("claude-opus-5-5")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Mensaje para el agente"), "Procesa sol-004{Enter}");

    expect(await screen.findByText("oc_validar")).toBeInTheDocument();
    expect(screen.getByText("La cotización difiere 6 %. ¿Confirmas?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmo" })).toBeInTheDocument();
  });

  it("muestra un error claro con la opción de reintentar si el servidor no responde", async () => {
    vi.mocked(enviarMensaje).mockRejectedValue(new ErrorApi(MENSAJES_ERROR_API.sinConexion));
    renderizarConConsultas(<Aplicacion />);

    await userEvent.click(screen.getByRole("button", { name: /sol-001/ }));

    expect(await screen.findByText(MENSAJES_ERROR_API.sinConexion)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
