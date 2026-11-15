import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TarjetaConfirmacion } from "./TarjetaConfirmacion";
import { TEXTOS_CONFIRMACION } from "./textos";

const confirmaciones = [
  {
    regla: "RC5",
    tipo: "confirmacion" as const,
    detalle: "La cotización (26.500.000) difiere 6 % de la solicitud (25.000.000).",
  },
];

describe("TarjetaConfirmacion", () => {
  it("lista lo que hay que confirmar con sus valores y llama a las acciones", async () => {
    const alConfirmar = vi.fn();
    const alCancelar = vi.fn();
    render(
      <TarjetaConfirmacion
        confirmaciones={confirmaciones}
        deshabilitado={false}
        alConfirmar={alConfirmar}
        alCancelar={alCancelar}
      />,
    );
    const tarjeta = screen.getByRole("region", { name: new RegExp(TEXTOS_CONFIRMACION.titulo) });

    expect(within(tarjeta).getByText(/26\.500\.000/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: TEXTOS_CONFIRMACION.confirmar }));
    await userEvent.click(screen.getByRole("button", { name: TEXTOS_CONFIRMACION.cancelar }));

    expect(alConfirmar).toHaveBeenCalledOnce();
    expect(alCancelar).toHaveBeenCalledOnce();
  });

  it("deshabilita los botones mientras hay una petición en curso", () => {
    render(
      <TarjetaConfirmacion
        confirmaciones={[]}
        deshabilitado
        alConfirmar={vi.fn()}
        alCancelar={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: TEXTOS_CONFIRMACION.confirmar })).toBeDisabled();
  });
});
