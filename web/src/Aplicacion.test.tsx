import type { RespuestaChat } from "@contratos/contratos-api";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { enviarMensaje, obtenerSesion } from "./api/chat";
import { ErrorApi, ESTADOS_HTTP, MENSAJES_ERROR_API } from "./api/cliente";
import { obtenerSalud } from "./api/salud";
import Aplicacion from "./Aplicacion";
import { TEXTOS_ENCABEZADO, TEXTOS_ESTADO } from "./componentes/textos";
import { MENSAJE_CLAVE_INVALIDA } from "./estado/conversacion";
import { renderizarConConsultas } from "./pruebas/utilidades";

vi.mock("./api/chat", () => ({ enviarMensaje: vi.fn(), obtenerSesion: vi.fn() }));
vi.mock("./api/salud", () => ({ obtenerSalud: vi.fn() }));

const PREGUNTA = "La cotización difiere 6 %. ¿Confirmas?";
const respuestaSol004: RespuestaChat = {
  reply: PREGUNTA,
  toolCalls: [
    {
      nombre: "oc_validar",
      args: { caso: "sol-004" },
      ok: true,
      resumen: "apta · confirmaciones: RC5",
    },
  ],
  needsConfirmation: true,
  casoPendiente: "sol-004",
};
const sinConexion = (): ErrorApi =>
  new ErrorApi(MENSAJES_ERROR_API.sinConexion, { reintentable: true, sinRespuesta: true });
const errorServidor = (): ErrorApi =>
  new ErrorApi(MENSAJES_ERROR_API.respuestaServidor(ESTADOS_HTTP.errorServidor), {
    estado: ESTADOS_HTTP.errorServidor,
    reintentable: true,
  });

const escribir = async (texto: string): Promise<void> => {
  await userEvent.type(screen.getByLabelText("Mensaje para el agente"), `${texto}{Enter}`);
};

beforeEach(() => {
  vi.mocked(obtenerSalud).mockResolvedValue({
    ok: true,
    provider: "anthropic",
    model: "claude-opus-5-5",
  });
  vi.mocked(obtenerSesion).mockResolvedValue(null);
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Aplicacion", () => {
  it("muestra la salud, las llamadas a herramientas y destaca la confirmación", async () => {
    vi.mocked(enviarMensaje).mockResolvedValue(respuestaSol004);
    renderizarConConsultas(<Aplicacion />);

    expect(await screen.findByText("claude-opus-5-5")).toBeInTheDocument();
    await escribir("Procesa sol-004");

    expect(await screen.findByRole("group", { name: "Llamada a oc_validar" })).toBeInTheDocument();
    expect(screen.getByText(PREGUNTA)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Confirma la OC de sol-004/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar y crear OC" })).toBeInTheDocument();
  });

  it("rehidrata el historial guardado en el servidor al cargar", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue({
      id: "x",
      historial: [
        { tipo: "usuario", texto: "Procesa sol-004" },
        {
          tipo: "herramienta",
          llamada: { nombre: "oc_construir_payload", args: {}, ok: true, resumen: "OC lista" },
        },
        { tipo: "asistente", texto: PREGUNTA },
      ],
      needsConfirmation: true,
      casoPendiente: "sol-004",
    });
    renderizarConConsultas(<Aplicacion />);

    expect(await screen.findByText(PREGUNTA)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Confirma la OC de sol-004/ })).toBeInTheDocument();
  });

  it("no muestra la confirmación al rehidratar si el servidor dice que no hay", async () => {
    vi.mocked(obtenerSesion).mockResolvedValue({
      id: "x",
      historial: [
        { tipo: "usuario", texto: "Cancelar" },
        { tipo: "asistente", texto: "Cancelado." },
      ],
      needsConfirmation: false,
      casoPendiente: null,
    });
    renderizarConConsultas(<Aplicacion />);

    expect(await screen.findByText("Cancelado.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar y crear OC" })).not.toBeInTheDocument();
  });

  it("muestra los errores del sistema como aviso con reintento", async () => {
    vi.mocked(enviarMensaje).mockResolvedValue({
      reply: "El modelo no está disponible en este momento.",
      toolCalls: [],
      needsConfirmation: false,
      esError: true,
    });
    renderizarConConsultas(<Aplicacion />);

    await escribir("hola");

    expect(await screen.findByRole("alert")).toHaveTextContent(TEXTOS_ESTADO.errorEnHistorial);
    expect(screen.getByText("El modelo no está disponible en este momento.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("mantiene la confirmación pendiente junto al aviso de error", async () => {
    vi.mocked(enviarMensaje).mockResolvedValue({
      reply: "El modelo no está disponible en este momento.",
      toolCalls: [],
      needsConfirmation: true,
      casoPendiente: "sol-004",
      esError: true,
    });
    renderizarConConsultas(<Aplicacion />);

    await escribir("¿y el IVA?");

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar y crear OC" })).toBeInTheDocument();
  });

  it("avisa en el encabezado si la clave del modelo es inválida", async () => {
    vi.mocked(enviarMensaje).mockResolvedValue({
      reply: MENSAJE_CLAVE_INVALIDA,
      toolCalls: [],
      needsConfirmation: false,
      esError: true,
    });
    renderizarConConsultas(<Aplicacion />);
    await screen.findByText("claude-opus-5-5");

    await escribir("hola");

    expect(await screen.findByText(TEXTOS_ENCABEZADO.claveInvalida)).toBeInTheDocument();
  });

  it("reintenta el último mensaje con el botón Reintentar", async () => {
    vi.mocked(enviarMensaje)
      .mockRejectedValueOnce(errorServidor())
      .mockResolvedValueOnce(respuestaSol004);
    renderizarConConsultas(<Aplicacion />);

    await userEvent.click(screen.getByRole("button", { name: "sol-001" }));
    await userEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText(PREGUNTA)).toBeInTheDocument();
    expect(enviarMensaje).toHaveBeenCalledTimes(2);
  });

  it("recupera la respuesta del servidor si la petición se cortó", async () => {
    vi.mocked(enviarMensaje).mockRejectedValue(sinConexion());
    vi.mocked(obtenerSesion)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "x",
        historial: [
          { tipo: "usuario", texto: "hola" },
          { tipo: "asistente", texto: "Hola, ¿qué solicitud procesamos?" },
        ],
        needsConfirmation: false,
        casoPendiente: null,
      });
    renderizarConConsultas(<Aplicacion />);

    await escribir("hola");

    expect(await screen.findByText("Hola, ¿qué solicitud procesamos?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("deshabilita «Nueva sesión» mientras el agente trabaja", async () => {
    vi.mocked(enviarMensaje).mockReturnValue(new Promise(() => undefined));
    renderizarConConsultas(<Aplicacion />);

    await escribir("hola");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Nueva sesión" })).toBeDisabled();
    });
  });
});
