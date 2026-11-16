import type { ResumenCaso } from "@contratos/contratos-api";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ListaSolicitudes, type PropiedadesListaSolicitudes } from "./ListaSolicitudes";
import { TEXTOS_SOLICITUDES } from "./textos";

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

const propiedades = (
  cambios: Partial<PropiedadesListaSolicitudes> = {},
): PropiedadesListaSolicitudes => ({
  casos: CASOS,
  cargando: false,
  conError: false,
  actuales: [],
  alElegir: vi.fn(),
  alReintentar: vi.fn(),
  ...cambios,
});

describe("ListaSolicitudes", () => {
  it.each([
    ["sol-001", "Creada"],
    ["sol-002", "Bloqueada"],
    ["sol-004", "Esperando tu confirmación"],
    ["sol-006", "Por revisar"],
  ])("muestra el estado de %s con texto: %s", (caso, estado) => {
    render(<ListaSolicitudes {...propiedades()} />);
    const fila = screen.getByRole("button", { name: new RegExp(caso) });

    expect(within(fila).getByText(estado)).toBeInTheDocument();
    expect(within(fila).getByText(/25\.000\.000/)).toBeInTheDocument();
  });

  it("marca las solicitudes que trata la conversación abierta y avisa al elegir una", async () => {
    const alElegir = vi.fn();
    render(<ListaSolicitudes {...propiedades({ actuales: ["sol-004"], alElegir })} />);

    expect(screen.getByRole("button", { name: /sol-004/ })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /sol-001/ })).not.toHaveAttribute("aria-current");
    await userEvent.click(screen.getByRole("button", { name: /sol-002/ }));

    expect(alElegir).toHaveBeenCalledWith("sol-002");
  });

  it("no deja elegir mientras el agente trabaja", () => {
    render(<ListaSolicitudes {...propiedades({ deshabilitado: true })} />);

    expect(screen.getByRole("button", { name: /sol-004/ })).toBeDisabled();
  });

  it("muestra esqueleto al cargar, error con reintento y estado vacío", async () => {
    const alReintentar = vi.fn();
    const { rerender } = render(
      <ListaSolicitudes {...propiedades({ casos: undefined, cargando: true })} />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(TEXTOS_SOLICITUDES.cargando);

    rerender(
      <ListaSolicitudes {...propiedades({ casos: undefined, conError: true, alReintentar })} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(TEXTOS_SOLICITUDES.error);
    await userEvent.click(screen.getByRole("button", { name: TEXTOS_SOLICITUDES.reintentar }));
    expect(alReintentar).toHaveBeenCalledOnce();

    rerender(<ListaSolicitudes {...propiedades({ casos: [] })} />);
    expect(screen.getByText(TEXTOS_SOLICITUDES.vacia)).toBeInTheDocument();
  });
});
