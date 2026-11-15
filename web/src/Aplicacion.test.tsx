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

const SESION_GUARDADA = "33333333-3333-4333-8333-333333333333";
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
  await userEvent.type(screen.getByLabelText("Mensaje para el asistente"), `${texto}{Enter}`);
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

    expect(
      await screen.findByRole("group", { name: "Validé contra los maestros" }),
    ).toBeInTheDocument();
    expect(screen.getByText(PREGUNTA)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /¿Creamos la OC de/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sí, crear la OC" })).toBeInTheDocument();
  });

  it("rehidrata el historial guardado en el servidor al cargar", async () => {
    localStorage.setItem(CLAVE_SESION, SESION_GUARDADA);
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
    expect(screen.getByRole("heading", { name: /¿Creamos la OC de/ })).toBeInTheDocument();
  });

  it("no muestra la confirmación al rehidratar si el servidor dice que no hay", async () => {
    localStorage.setItem(CLAVE_SESION, SESION_GUARDADA);
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
    expect(screen.queryByRole("button", { name: "Sí, crear la OC" })).not.toBeInTheDocument();
  });

  it("muestra el error del sistema una sola vez, en el historial y con reintento", async () => {
    const reply = "El modelo no está disponible en este momento.";
    vi.mocked(enviarMensaje)
      .mockResolvedValueOnce({ reply, toolCalls: [], needsConfirmation: false, esError: true })
      .mockResolvedValueOnce(respuestaSol004);
    renderizarConConsultas(<Aplicacion />);

    await escribir("hola");

    expect(await screen.findByRole("alert")).toHaveTextContent(reply);
    expect(screen.getAllByText(reply)).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: TEXTOS_ESTADO.reintentar }));

    expect(await screen.findByText(PREGUNTA)).toBeInTheDocument();
    expect(vi.mocked(enviarMensaje).mock.calls[1]?.[0].message).toBe("hola");
    expect(
      screen.queryByRole("button", { name: TEXTOS_ESTADO.reintentar }),
    ).not.toBeInTheDocument();
  });

  it("con confirmación pendiente manda la tarjeta: el error no ofrece reintento", async () => {
    const reply = "El modelo no está disponible en este momento.";
    vi.mocked(enviarMensaje).mockResolvedValue({
      reply,
      toolCalls: [],
      needsConfirmation: true,
      casoPendiente: "sol-004",
      esError: true,
    });
    renderizarConConsultas(<Aplicacion />);

    await escribir("¿y el IVA?");

    expect(await screen.findByRole("button", { name: "Sí, crear la OC" })).toBeInTheDocument();
    expect(screen.getAllByText(reply)).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: TEXTOS_ESTADO.reintentar }),
    ).not.toBeInTheDocument();
  });

  it("al recargar con el último turno en error ofrece reintentar el último mensaje", async () => {
    localStorage.setItem(CLAVE_SESION, SESION_GUARDADA);
    vi.mocked(obtenerSesion).mockResolvedValue({
      id: SESION_GUARDADA,
      historial: [
        { tipo: "usuario", texto: "procesa sol-004" },
        { tipo: "error", texto: "El modelo rechazó la solicitud." },
      ],
      needsConfirmation: false,
      casoPendiente: null,
    });
    vi.mocked(enviarMensaje).mockResolvedValue(respuestaSol004);
    renderizarConConsultas(<Aplicacion />);

    await userEvent.click(await screen.findByRole("button", { name: TEXTOS_ESTADO.reintentar }));

    await waitFor(() => {
      expect(vi.mocked(enviarMensaje).mock.calls[0]?.[0]).toEqual({
        sessionId: SESION_GUARDADA,
        message: "procesa sol-004",
      });
    });
  });

  it("no pide al servidor el historial de una sesión recién creada", async () => {
    renderizarConConsultas(<Aplicacion />);

    expect(await screen.findByText(TEXTOS_ENCABEZADO.enLinea)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: TEXTOS_ENCABEZADO.nuevaSesion }));

    expect(obtenerSesion).not.toHaveBeenCalled();
  });

  it("si la bandeja no carga, se puede ir a la conversación", async () => {
    vi.mocked(obtenerCasos).mockRejectedValue(new Error("caída"));
    renderizarConConsultas(<Aplicacion />);

    await userEvent.click(
      await screen.findByRole("button", { name: TEXTOS_BANDEJA.abrirConversacion }),
    );

    expect(screen.getByRole("main")).not.toHaveClass("hidden");
    expect(screen.getByRole("complementary")).toHaveClass("hidden");
  });

  it("al abrir un caso que la sesión abierta ya trató se ve su historial y una OC creada no ofrece «Procesar»", async () => {
    localStorage.setItem(CLAVE_SESION, SESION_GUARDADA);
    vi.mocked(obtenerSesion).mockResolvedValue({
      id: SESION_GUARDADA,
      historial: [
        { tipo: "usuario", texto: "procesa sol-001" },
        {
          tipo: "herramienta",
          llamada: { nombre: "oc_crear", args: { caso: "sol-001" }, ok: true, resumen: "OC" },
        },
        { tipo: "asistente", texto: "OC creada." },
      ],
      needsConfirmation: false,
      casoPendiente: null,
    });
    renderizarConConsultas(<Aplicacion />);
    expect(await screen.findByText("OC creada.")).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: /Portátiles/ }));

    expect(screen.getByText("OC creada.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: TEXTOS_BANDEJA.procesar })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CLAVE_SESIONES_POR_CASO) ?? "{}")).toEqual({
      "sol-001": SESION_GUARDADA,
    });
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
    vi.mocked(obtenerSesion).mockResolvedValueOnce({
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
      expect(screen.getByRole("button", { name: TEXTOS_ENCABEZADO.nuevaSesion })).toBeDisabled();
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
    expect(await screen.findByRole("heading", { name: /¿Creamos la OC de/ })).toBeInTheDocument();
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
      await screen.findByRole("button", { name: /Bolsa de 100 horas.*Esperando tu confirmación/ }),
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
    vi.mocked(obtenerCasos).mockResolvedValue([
      { ...resumenSol001, estado: "bloqueada", numero_oc: null },
      resumenSol004,
    ]);
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
    expect(screen.getByRole("heading", { name: /¿Creamos la OC de/ })).toBeInTheDocument();
  });

  it("al recargar vuelve a seleccionar el caso de la sesión restaurada", async () => {
    const sesion = SESION_GUARDADA;
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
