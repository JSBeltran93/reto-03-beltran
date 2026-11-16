import type { QueryStatus } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Encabezado } from "./Encabezado";
import { TEXTOS_ENCABEZADO } from "./textos";

const MODELO = "gemini-3.6-flash";

const renderizar = (estadoSalud: QueryStatus, claveInvalida = false, alNuevaSesion = vi.fn()) =>
  render(
    <Encabezado
      estadoSalud={estadoSalud}
      modelo={MODELO}
      deshabilitado={false}
      alNuevaSesion={alNuevaSesion}
      claveInvalida={claveInvalida}
    />,
  );

const indicador = () => screen.getByText(TEXTOS_ENCABEZADO.estadoServidor.trim()).closest("p");

describe("Encabezado", () => {
  it.each<[string, QueryStatus, boolean, string]>([
    ["servidor conectado", "success", false, TEXTOS_ENCABEZADO.enLinea],
    ["clave del modelo inválida", "success", true, TEXTOS_ENCABEZADO.claveInvalida],
    ["conectando", "pending", false, TEXTOS_ENCABEZADO.conectando],
    ["sin servidor (prevalece sobre la clave)", "error", true, TEXTOS_ENCABEZADO.sinServidor],
  ])("estado: %s", (_nombre, estadoSalud, claveInvalida, texto) => {
    renderizar(estadoSalud, claveInvalida);

    expect(indicador()).toHaveTextContent(texto);
  });

  it("muestra el modelo solo como ayuda emergente, no como texto", () => {
    renderizar("success");

    expect(indicador()).toHaveAttribute("title", TEXTOS_ENCABEZADO.modelo(MODELO));
    expect(screen.queryByText(MODELO)).not.toBeInTheDocument();
  });

  it("«Nueva sesión» tiene nombre accesible aunque en móvil sea solo un ícono", async () => {
    const alNuevaSesion = vi.fn();
    renderizar("success", false, alNuevaSesion);

    await userEvent.click(screen.getByRole("button", { name: TEXTOS_ENCABEZADO.nuevaSesion }));

    expect(alNuevaSesion).toHaveBeenCalledOnce();
  });

  it("«Solicitudes» abre el panel lateral e indica si está abierto", async () => {
    const alAbrirSolicitudes = vi.fn();
    render(
      <Encabezado
        estadoSalud="success"
        modelo={MODELO}
        deshabilitado={false}
        alNuevaSesion={vi.fn()}
        alAbrirSolicitudes={alAbrirSolicitudes}
        solicitudesAbiertas={false}
      />,
    );
    const boton = screen.getByRole("button", { name: TEXTOS_ENCABEZADO.solicitudes });

    expect(boton).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(boton);
    expect(alAbrirSolicitudes).toHaveBeenCalledOnce();
  });
});
