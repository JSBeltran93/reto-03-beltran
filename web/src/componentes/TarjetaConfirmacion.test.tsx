import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TarjetaConfirmacion } from "./TarjetaConfirmacion";
import { TEXTOS_CONFIRMACION } from "./textos";

const confirmaciones = [
  {
    regla: "RC5",
    tipo: "confirmacion" as const,
    detalle: "La cotización difiere 6 % de la solicitud.",
    valores: { solicitud: 25_000_000, cotizacion: 26_500_000.5, moneda: "COP" },
  },
];

describe("TarjetaConfirmacion", () => {
  it("lista lo que hay que confirmar con sus valores y llama a las acciones", async () => {
    const alConfirmar = vi.fn();
    const alCancelar = vi.fn();
    render(
      <TarjetaConfirmacion
        confirmaciones={confirmaciones}
        caso="sol-004"
        deshabilitado={false}
        alConfirmar={alConfirmar}
        alCancelar={alCancelar}
      />,
    );
    const tarjeta = screen.getByRole("region", { name: /¿Creamos la OC de sol-004\?/ });
    expect(within(tarjeta).getByText(TEXTOS_CONFIRMACION.ayuda)).toBeInTheDocument();
    expect(within(tarjeta).getByText("La cotización difiere 6 % de la solicitud.")).toBeVisible();
    expect(within(tarjeta).getByText("RC5")).toBeInTheDocument();
    expect(within(tarjeta).getByText("Solicitud")).toBeInTheDocument();
    expect(within(tarjeta).getByText(/^COP\s25\.000\.000$/)).toBeInTheDocument();
    expect(within(tarjeta).getByText(/^COP\s26\.500\.000,5$/)).toBeInTheDocument();
    expect(within(tarjeta).getByText("Moneda")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: TEXTOS_CONFIRMACION.confirmar }));
    await userEvent.click(screen.getByRole("button", { name: TEXTOS_CONFIRMACION.cancelar }));

    expect(alConfirmar).toHaveBeenCalledOnce();
    expect(alCancelar).toHaveBeenCalledOnce();
  });

  it.each([
    ["con caso", "sol-002", "¿Creamos la OC de sol-002\\?"],
    ["sin caso", null, "¿Creamos la OC con estos datos\\?"],
  ])("titula la tarjeta %s", (_nombre, caso, titulo) => {
    render(
      <TarjetaConfirmacion
        confirmaciones={[]}
        caso={caso}
        deshabilitado={false}
        alConfirmar={vi.fn()}
        alCancelar={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: new RegExp(titulo) })).toBeInTheDocument();
  });

  it("deshabilita los botones mientras hay una petición en curso", () => {
    render(
      <TarjetaConfirmacion
        confirmaciones={[]}
        caso={null}
        deshabilitado
        alConfirmar={vi.fn()}
        alCancelar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: TEXTOS_CONFIRMACION.confirmar })).toBeDisabled();
  });
});
