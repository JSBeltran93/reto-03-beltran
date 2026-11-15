import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BurbujaMensaje } from "./BurbujaMensaje";
import { ListaMensajes } from "./ListaMensajes";
import { TEXTOS_ESTADO } from "./textos";

describe("BurbujaMensaje", () => {
  it("no dibuja imágenes del Markdown (ni carga su URL) y conserva el resto del texto", () => {
    const { container } = render(
      <BurbujaMensaje autor="asistente" texto="Mira ![rastreo](https://ejemplo.test/p.png) aquí" />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/Mira/)).toHaveTextContent("Mira aquí");
  });

  it("abre los enlaces en otra pestaña sin dar acceso a la ventana", () => {
    render(<BurbujaMensaje autor="asistente" texto="Ver [el PRD](https://ejemplo.test/prd)" />);
    const enlace = screen.getByRole("link", { name: "el PRD" });

    expect(enlace).toHaveAttribute("href", "https://ejemplo.test/prd");
    expect(enlace).toHaveAttribute("target", "_blank");
    expect(enlace).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("ListaMensajes", () => {
  it("anuncia el historial en una región log que envuelve la lista", () => {
    render(<ListaMensajes entradas={[{ tipo: "usuario", texto: "hola" }]} />);
    const registro = screen.getByRole("log", { name: TEXTOS_ESTADO.conversacion });

    expect(registro).toHaveAttribute("aria-live", "polite");
    expect(registro.firstElementChild?.tagName).toBe("OL");
  });
});
