import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PanelSolicitudes } from "./PanelSolicitudes";
import { TEXTOS_SOLICITUDES } from "./textos";

const renderizar = (abierto: boolean, alCerrar = vi.fn()) =>
  render(
    <PanelSolicitudes
      abierto={abierto}
      alCerrar={alCerrar}
      casos={[]}
      cargando={false}
      conError={false}
      actuales={[]}
      alElegir={vi.fn()}
      alReintentar={vi.fn()}
    />,
  );

describe("PanelSolicitudes", () => {
  it("cerrado no dibuja nada", () => {
    renderizar(false);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("abierto es un diálogo con título, lleva el foco a cerrar y se cierra con Escape", async () => {
    const alCerrar = vi.fn();
    renderizar(true, alCerrar);

    expect(screen.getByRole("dialog", { name: /Solicitudes/ })).toHaveAttribute(
      "aria-modal",
      "true",
    );
    expect(screen.getByRole("button", { name: TEXTOS_SOLICITUDES.cerrar })).toHaveFocus();
    await userEvent.keyboard("{Escape}");

    expect(alCerrar).toHaveBeenCalledOnce();
  });
});
