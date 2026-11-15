import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TarjetaHerramienta } from "./TarjetaHerramienta";

describe("TarjetaHerramienta", () => {
  it("muestra nombre, estado y resumen, y los argumentos al expandir", async () => {
    const llamada = {
      nombre: "oc_validar",
      args: { caso: "sol-004" },
      ok: true,
      resumen: "apta · confirmaciones: RC5",
    };
    render(<TarjetaHerramienta llamada={llamada} />);

    expect(screen.getByText("oc_validar")).toBeInTheDocument();
    expect(screen.getByText("apta · confirmaciones: RC5")).toBeInTheDocument();
    expect(screen.getByText(/Llamada correcta/)).toBeInTheDocument();

    await userEvent.click(screen.getByText("oc_validar"));

    expect(screen.getByText(/"caso": "sol-004"/)).toBeVisible();
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
