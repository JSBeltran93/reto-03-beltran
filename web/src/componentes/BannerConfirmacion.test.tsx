import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BannerConfirmacion } from "./BannerConfirmacion";

describe("BannerConfirmacion", () => {
  it("se anuncia como alerta y llama a las acciones", async () => {
    const alConfirmar = vi.fn();
    const alCancelar = vi.fn();
    render(
      <BannerConfirmacion
        deshabilitado={false}
        alConfirmar={alConfirmar}
        alCancelar={alCancelar}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("necesita tu confirmación");
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
