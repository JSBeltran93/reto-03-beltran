import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TarjetaHerramienta } from "./TarjetaHerramienta";

describe("TarjetaHerramienta", () => {
  it("muestra nombre, caso, estado y resumen; al expandir, el resultado y los argumentos", async () => {
    const llamada = {
      nombre: "oc_validar",
      args: { caso: "sol-004" },
      ok: true,
      resumen: "apta · confirmaciones: RC5",
    };
    render(<TarjetaHerramienta llamada={llamada} />);
    const tarjeta = screen.getByRole("group", { name: "Llamada a oc_validar" });

    expect(within(tarjeta).getByText('caso: "sol-004"')).toBeVisible();
    expect(within(tarjeta).getByText(/Llamada correcta/)).toBeInTheDocument();

    await userEvent.click(within(tarjeta).getByText("oc_validar"));

    expect(within(tarjeta).getByText(/"caso": "sol-004"/)).toBeVisible();
    expect(within(tarjeta).getAllByText("apta · confirmaciones: RC5")).toHaveLength(2);
  });

  it("marca las llamadas con error", () => {
    render(
      <TarjetaHerramienta
        llamada={{ nombre: "oc_crear", args: {}, ok: false, resumen: "NO_APTA" }}
      />,
    );

    expect(screen.getByText(/Llamada con error/)).toBeInTheDocument();
  });
});
