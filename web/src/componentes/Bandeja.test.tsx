import type { ResumenCaso } from "@contratos/contratos-api";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Bandeja, type PropiedadesBandeja } from "./Bandeja";
import { TEXTOS_BANDEJA } from "./textos";

const resumen = (caso: string, estado: ResumenCaso["estado"], numero_oc: string | null = null) => ({
  caso,
  solicitud_id: `SOL-${caso}`,
  descripcion: `Compra de ${caso}`,
  proveedor: "TecnoSuministros S.A.S.",
  valor_total: 25_000_000,
  moneda: "COP",
  centro_costo: "CC-1010",
  estado,
  numero_oc,
});

const CASOS: ResumenCaso[] = [
  resumen("sol-001", "creada", "4500000001"),
  resumen("sol-002", "bloqueada"),
  resumen("sol-004", "pendiente"),
  resumen("sol-006", "sin_procesar"),
];

const propiedades = (cambios: Partial<PropiedadesBandeja> = {}): PropiedadesBandeja => ({
  casos: CASOS,
  cargando: false,
  conError: false,
  seleccionado: null,
  alSeleccionar: vi.fn(),
  alReintentar: vi.fn(),
  ...cambios,
});

describe("Bandeja", () => {
  it.each([
    ["sol-001", "Creada"],
    ["sol-002", "Bloqueada"],
    ["sol-004", "Pendiente"],
    ["sol-006", "Sin procesar"],
  ])("muestra el estado de %s con texto: %s", (caso, estado) => {
    render(<Bandeja {...propiedades()} />);
    const fila = screen.getByRole("button", { name: new RegExp(caso) });

    expect(within(fila).getByText(estado)).toBeInTheDocument();
    expect(within(fila).getByText(/25\.000\.000/)).toBeInTheDocument();
  });

  it("cuenta las solicitudes y marca la seleccionada", () => {
    render(<Bandeja {...propiedades({ seleccionado: "sol-004" })} />);

    expect(screen.getByText("4 solicitudes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sol-004/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /sol-001/ })).not.toHaveAttribute("aria-current");
  });

  it("avisa al elegir un caso", async () => {
    const alSeleccionar = vi.fn();
    render(<Bandeja {...propiedades({ alSeleccionar })} />);

    await userEvent.click(screen.getByRole("button", { name: /sol-002/ }));

    expect(alSeleccionar).toHaveBeenCalledWith("sol-002");
  });

  it("mientras el agente trabaja solo deja habilitado el caso abierto", () => {
    render(<Bandeja {...propiedades({ seleccionado: "sol-004", deshabilitado: true })} />);

    expect(screen.getByRole("button", { name: /sol-004/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /sol-001/ })).toBeDisabled();
  });

  it("muestra esqueleto al cargar, error con reintento y estado vacío", async () => {
    const alReintentar = vi.fn();
    const { rerender } = render(<Bandeja {...propiedades({ casos: undefined, cargando: true })} />);
    expect(screen.getByRole("status")).toHaveTextContent(TEXTOS_BANDEJA.cargando);

    rerender(<Bandeja {...propiedades({ casos: undefined, conError: true, alReintentar })} />);
    await userEvent.click(screen.getByRole("button", { name: TEXTOS_BANDEJA.reintentar }));
    expect(alReintentar).toHaveBeenCalledOnce();

    rerender(<Bandeja {...propiedades({ casos: [] })} />);
    expect(screen.getByText(TEXTOS_BANDEJA.vacia)).toBeInTheDocument();
  });

  it("si la bandeja no carga, deja ir a la conversación igualmente", async () => {
    const alAbrirConversacion = vi.fn();
    render(<Bandeja {...propiedades({ casos: undefined, conError: true, alAbrirConversacion })} />);

    expect(screen.getByRole("alert")).toHaveTextContent(TEXTOS_BANDEJA.error);
    await userEvent.click(screen.getByRole("button", { name: TEXTOS_BANDEJA.abrirConversacion }));

    expect(alAbrirConversacion).toHaveBeenCalledOnce();
  });
});
