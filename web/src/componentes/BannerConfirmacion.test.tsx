import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BannerConfirmacion } from "./BannerConfirmacion";
import { TEXTOS_CONFIRMACION } from "./textos";

describe("BannerConfirmacion", () => {
  it("es una región etiquetada con la pregunta y llama a las acciones", async () => {
    const alConfirmar = vi.fn();
    const alCancelar = vi.fn();
    render(
      <BannerConfirmacion
        deshabilitado={false}
        alConfirmar={alConfirmar}
        alCancelar={alCancelar}
      />,
    );

    expect(screen.getByRole("region", { name: TEXTOS_CONFIRMACION.titulo })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirmo" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(alConfirmar).toHaveBeenCalledOnce();
    expect(alCancelar).toHaveBeenCalledOnce();
  });

  it("deshabilita los botones mientras hay una petición en curso", () => {
    render(<BannerConfirmacion deshabilitado alConfirmar={vi.fn()} alCancelar={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Confirmo" })).toBeDisabled();
  });
});
