import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AvisoError } from "./AvisoError";
import { TEXTOS_ESTADO } from "./textos";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AvisoError", () => {
  it("deshabilita Reintentar con una cuenta regresiva y lo habilita al terminar", () => {
    render(
      <AvisoError mensaje="Demasiadas solicitudes." alReintentar={vi.fn()} esperaSegundos={2} />,
    );
    const boton = screen.getByRole("button", { name: TEXTOS_ESTADO.reintentar });

    expect(boton).toBeDisabled();
    expect(screen.getByText(TEXTOS_ESTADO.esperaReintento(2))).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText(TEXTOS_ESTADO.esperaReintento(1))).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(boton).toBeEnabled();
    expect(screen.queryByText(/Podrás reintentar/)).not.toBeInTheDocument();
  });

  it.each([
    ["sin espera", undefined, true],
    ["no reintentable", 5, false],
  ])("%s: no muestra cuenta regresiva", (_nombre, esperaSegundos, conReintento) => {
    render(
      <AvisoError
        mensaje="Error"
        {...(conReintento && { alReintentar: vi.fn() })}
        {...(esperaSegundos !== undefined && { esperaSegundos })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Error");
    expect(screen.queryByText(/Podrás reintentar/)).not.toBeInTheDocument();
  });
});
