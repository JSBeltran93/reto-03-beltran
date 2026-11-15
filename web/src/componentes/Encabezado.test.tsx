import type { QueryStatus } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Encabezado } from "./Encabezado";
import { TEXTOS_ENCABEZADO } from "./textos";

const MODELO = "claude-opus-5-5";

describe("Encabezado", () => {
  it.each<[string, QueryStatus, boolean, string]>([
    ["servidor conectado", "success", false, MODELO],
    ["clave del modelo inválida", "success", true, TEXTOS_ENCABEZADO.claveInvalida],
    ["conectando", "pending", false, TEXTOS_ENCABEZADO.conectando],
    ["sin servidor (prevalece sobre la clave)", "error", true, TEXTOS_ENCABEZADO.sinServidor],
  ])("píldora: %s", (_nombre, estadoSalud, claveInvalida, texto) => {
    render(
      <Encabezado
        estadoSalud={estadoSalud}
        modelo={MODELO}
        deshabilitado={false}
        alNuevaSesion={vi.fn()}
        claveInvalida={claveInvalida}
      />,
    );

    expect(
      screen.getByText(TEXTOS_ENCABEZADO.estadoServidor.trim()).parentElement,
    ).toHaveTextContent(texto);
  });
});
