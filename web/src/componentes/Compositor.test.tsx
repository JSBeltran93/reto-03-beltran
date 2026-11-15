import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Compositor } from "./Compositor";

const preparar = (deshabilitado = false) => {
  const alEnviar = vi.fn();
  const resultado = render(
    <Compositor deshabilitado={deshabilitado} textoGuia="Escribe" alEnviar={alEnviar} />,
  );
  return { alEnviar, resultado, campo: screen.getByLabelText("Mensaje para el agente") };
};

describe("Compositor", () => {
  it("envía con Enter y limpia el campo", async () => {
    const { alEnviar, campo } = preparar();

    await userEvent.type(campo, "procesa sol-001{Enter}");

    expect(alEnviar).toHaveBeenCalledWith("procesa sol-001");
    expect(campo).toHaveValue("");
  });

  it("agrega una línea con Shift+Enter en lugar de enviar", async () => {
    const { alEnviar, campo } = preparar();

    await userEvent.type(campo, "línea 1{Shift>}{Enter}{/Shift}línea 2");

    expect(alEnviar).not.toHaveBeenCalled();
    expect(campo).toHaveValue("línea 1\nlínea 2");
  });

  it("queda en solo lectura mientras el agente trabaja, sin perder el foco", () => {
    const { campo } = preparar(true);

    expect(campo).toHaveAttribute("readonly");
    expect(campo).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("devuelve el foco al campo cuando el agente termina", () => {
    const { resultado, campo } = preparar(true);

    resultado.rerender(<Compositor deshabilitado={false} textoGuia="Escribe" alEnviar={vi.fn()} />);

    expect(campo).toHaveFocus();
  });
});
