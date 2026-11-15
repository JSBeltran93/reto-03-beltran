import type { RespuestaChat } from "@contratos/contratos-api";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { obtenerCasos } from "./api/casos";
import { enviarMensaje, obtenerSesion } from "./api/chat";
import { ErrorApi, ESTADOS_HTTP, MENSAJES_ERROR_API } from "./api/cliente";
import { obtenerSalud } from "./api/salud";
import Aplicacion from "./Aplicacion";
import {
  mensajeProcesar,
  TEXTOS_BANDEJA,
  TEXTOS_ENCABEZADO,
  TEXTOS_ESTADO,
} from "./componentes/textos";
import { MENSAJE_CLAVE_INVALIDA } from "./estado/conversacion";
import { CLAVE_SESION, CLAVE_SESIONES_POR_CASO } from "./estado/sesion-guardada";
import { renderizarConConsultas } from "./pruebas/utilidades";

vi.mock("./api/chat", () => ({ enviarMensaje: vi.fn(), obtenerSesion: vi.fn() }));
vi.mock("./api/salud", () => ({ obtenerSalud: vi.fn() }));
vi.mock("./api/casos", () => ({ obtenerCasos: vi.fn() }));

const resumenSol004 = {
  caso: "sol-004",
  solicitud_id: "SOL-2026-004",
  descripcion: "Bolsa de 100 horas de desarrollo",
  proveedor: "Cloud Andina S.A.S.",
  valor_total: 25_000_000,
  moneda: "COP",
  centro_costo: "CC-1010",
  estado: "sin_procesar",
  numero_oc: null,
} as const;
const resumenSol001 = {
  ...resumenSol004,
  caso: "sol-001",
  solicitud_id: "SOL-2026-001",
  descripcion: "Portátiles para el equipo",
  estado: "creada",
  numero_oc: "4500000001",
} as const;

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
    provider: "gemini",
    model: "gemini-3.6-flash",
  });
  vi.mocked(obtenerSesion).mockResolvedValue(null);
  vi.mocked(obtenerCasos).mockResolvedValue([resumenSol001, resumenSol004]);
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Aplicacion", () => {
  it("muestra la salud, las llamadas a herramientas y destaca la confirmación", async () => {
    vi.mocked(enviarMensaje).mockResolvedValue(respuestaSol004);
    renderizarConConsultas(<Aplicacion />);

    expect(await screen.findByText(TEXTOS_ENCABEZADO.enLinea)).toBeInTheDocument();
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
    await screen.findByText(TEXTOS_ENCABEZADO.enLinea);

    await escribir("hola");

    expect(await screen.findByText(TEXTOS_ENCABEZADO.claveInvalida)).toBeInTheDocument();
  });

  it("reintenta el último mensaje con el botón Reintentar", async () => {
    vi.mocked(enviarMensaje)
      .mockRejectedValueOnce(errorServidor())
      .mockResolvedValueOnce(respuestaSol004);
    renderizarConConsultas(<Aplicacion />);

    await escribir("hola");
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

  it("muestra la bandeja con estados; elegir un caso y «Procesar» envía el mensaje del PRD §11", async () => {
    vi.mocked(enviarMensaje).mockResolvedValue(respuestaSol004);
    renderizarConConsultas(<Aplicacion />);
    const fila = await screen.findByRole("button", { name: /Bolsa de 100 horas/ });
    expect(screen.getByRole("button", { name: /Portátiles/ })).toHaveTextContent("Creada");

    await userEvent.click(fila);
    expect(fila).toHaveAttribute("aria-current", "true");
    await userEvent.click(screen.getByRole("button", { name: TEXTOS_BANDEJA.procesar }));

    await waitFor(() => {
      expect(vi.mocked(enviarMensaje).mock.calls[0]?.[0].message).toBe(mensajeProcesar("sol-004"));
    });
    expect(
      await screen.findByRole("heading", { name: /Confirma la OC de sol-004/ }),
    ).toBeInTheDocument();
  });

  it("refresca la bandeja después de cada respuesta del agente", async () => {
    vi.mocked(enviarMensaje).mockResolvedValue(respuestaSol004);
    renderizarConConsultas(<Aplicacion />);
    await screen.findByRole("button", { name: /Bolsa de 100 horas/ });
    vi.mocked(obtenerCasos).mockResolvedValue([
      resumenSol001,
      { ...resumenSol004, estado: "pendiente" },
    ]);

    await escribir("Procesa sol-004");

    expect(
      await screen.findByRole("button", { name: /Bolsa de 100 horas.*Pendiente/ }),
    ).toBeInTheDocument();
    expect(obtenerCasos).toHaveBeenCalledTimes(2);
  });

  it("cada caso tiene su propia sesión y al volver a un caso se ve su conversación", async () => {
    const respuestaSol001: RespuestaChat = {
      reply: "La OC 4500000001 ya existía.",
      toolCalls: [],
      needsConfirmation: false,
    };
    vi.mocked(enviarMensaje)
      .mockResolvedValueOnce(respuestaSol004)
      .mockResolvedValueOnce(respuestaSol001);
    renderizarConConsultas(<Aplicacion />);
    const procesarCaso = async (fila: RegExp): Promise<void> => {
      await userEvent.click(await screen.findByRole("button", { name: fila }));
      await userEvent.click(screen.getByRole("button", { name: TEXTOS_BANDEJA.procesar }));
    };

    await procesarCaso(/Bolsa de 100 horas/);
    expect(await screen.findByText(PREGUNTA)).toBeInTheDocument();
    const sesionSol004 = vi.mocked(enviarMensaje).mock.calls[0]?.[0].sessionId;
    vi.mocked(obtenerSesion).mockImplementation((id) =>
      Promise.resolve(
        id === sesionSol004
          ? {
              id,
              historial: [
                { tipo: "usuario", texto: mensajeProcesar("sol-004") },
                { tipo: "asistente", texto: PREGUNTA },
              ],
              needsConfirmation: true,
              casoPendiente: "sol-004",
            }
          : null,
      ),
    );

    await procesarCaso(/Portátiles/);
    expect(await screen.findByText(respuestaSol001.reply)).toBeInTheDocument();
    expect(screen.queryByText(PREGUNTA)).not.toBeInTheDocument();
    const segunda = vi.mocked(enviarMensaje).mock.calls[1]?.[0];
    expect(segunda?.message).toBe(mensajeProcesar("sol-001"));
    expect(segunda?.sessionId).not.toBe(sesionSol004);

    await userEvent.click(screen.getByRole("button", { name: /Bolsa de 100 horas/ }));
    expect(await screen.findByText(PREGUNTA)).toBeInTheDocument();
    expect(screen.queryByText(respuestaSol001.reply)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Confirma la OC de sol-004/ })).toBeInTheDocument();
  });

  it("al recargar vuelve a seleccionar el caso de la sesión restaurada", async () => {
    const sesion = "11111111-1111-4111-8111-111111111111";
    localStorage.setItem(CLAVE_SESION, sesion);
    localStorage.setItem(CLAVE_SESIONES_POR_CASO, JSON.stringify({ "sol-001": sesion }));
    renderizarConConsultas(<Aplicacion />);

    expect(await screen.findByRole("button", { name: /Portátiles/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(obtenerSesion).toHaveBeenCalledWith(sesion);
  });
});
