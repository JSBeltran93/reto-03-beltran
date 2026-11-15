import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TarjetaHerramienta } from "./TarjetaHerramienta";
import { TEXTOS_HERRAMIENTA } from "./textos";

const validacion = {
  apta: true,
  bloqueos: [],
  confirmaciones: [
    {
      regla: "RC5",
      tipo: "confirmacion",
      detalle: "La cotización (26.500.000) difiere 6 % de la solicitud (25.000.000).",
      valores: { solicitud: 25_000_000, cotizacion: 26_500_000 },
    },
  ],
  informativos: [],
  retroactiva: false,
};

describe("TarjetaHerramienta", () => {
  it("muestra paso, caso, estado y resumen; en los detalles, el resultado y los argumentos", async () => {
    const llamada = {
      nombre: "oc_validar",
      args: { caso: "sol-004" },
      ok: true,
      resumen: "apta · confirmaciones: RC5",
    };
    render(<TarjetaHerramienta llamada={llamada} />);
    const paso = screen.getByRole("group", { name: "Llamada a oc_validar" });

    expect(within(paso).getByText("Validar controles")).toBeVisible();
    expect(within(paso).getByText('caso: "sol-004"')).toBeVisible();
    expect(within(paso).getByText(/Llamada correcta/)).toBeInTheDocument();

    await userEvent.click(within(paso).getByText(TEXTOS_HERRAMIENTA.detalles));

    expect(within(paso).getByText(/"caso": "sol-004"/)).toBeVisible();
    expect(within(paso).getAllByText("apta · confirmaciones: RC5")).toHaveLength(2);
  });

  it("marca las llamadas con error", () => {
    render(
      <TarjetaHerramienta
        llamada={{ nombre: "oc_crear", args: {}, ok: false, resumen: "NO_APTA" }}
      />,
    );

    expect(screen.getByText(/Llamada con error/)).toBeInTheDocument();
  });

  it("dibuja los controles de la validación como fichas con texto accesible", () => {
    render(
      <TarjetaHerramienta
        llamada={{ nombre: "oc_validar", args: {}, ok: true, resumen: "apta", datos: validacion }}
      />,
    );
    const controles = screen.getByRole("list", { name: "Controles" });

    expect(screen.getByText("Apta para crear la OC")).toBeInTheDocument();
    expect(within(controles).getByText(/RC5 · Requiere confirmación/)).toBeInTheDocument();
    expect(within(controles).getByText(/difiere 6 %/)).toBeInTheDocument();
  });

  it("muestra la OC propuesta como tabla y la creación como tarjeta de éxito", () => {
    const orden = {
      proveedor: { codigo_sap: "100310", nit: "901222333", nombre: "Cloud Andina S.A.S." },
      moneda: "COP",
      condiciones_pago: "Z000",
      aprobador: { email: "dgarcia@periferia-ficticia.com" },
      posiciones: [
        {
          descripcion: "Bolsa de 100 horas…",
          cantidad: 100,
          unidad: "H",
          precio_unitario: 250000,
          centro_costo: "CC-1010",
          subarea: "Desarrollo",
          indicador_iva: "C1",
        },
      ],
    };
    const creada = {
      numero_oc: "4500000002",
      fecha: "2026-09-03",
      idempotente: false,
      ruta_evidencia: "out/sol-004/aprobacion.txt",
    };
    render(
      <>
        <TarjetaHerramienta
          llamada={{
            nombre: "oc_construir_payload",
            args: {},
            ok: true,
            resumen: "OC lista",
            datos: { orden },
          }}
        />
        <TarjetaHerramienta
          llamada={{
            nombre: "oc_crear",
            args: {},
            ok: true,
            resumen: "OC 4500000002",
            datos: creada,
          }}
        />
      </>,
    );
    const tabla = screen.getByRole("table", { name: "Orden de compra propuesta" });

    expect(within(tabla).getByRole("rowheader", { name: "Proveedor" })).toBeInTheDocument();
    expect(within(tabla).getByText(/Cloud Andina S.A.S./)).toBeInTheDocument();
    expect(screen.getByText("OC 4500000002 creada en SAP")).toBeInTheDocument();
    expect(screen.getByText("out/sol-004/aprobacion.txt")).toBeInTheDocument();
  });
});
