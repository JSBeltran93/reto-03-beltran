import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasoHerramienta } from "./PasoHerramienta";
import { PasosTurno } from "./PasosTurno";
import { TEXTOS_HERRAMIENTA, TEXTOS_ORDEN, TEXTOS_VALIDACION } from "./textos";

const validacion = {
  apta: true,
  bloqueos: [],
  confirmaciones: [
    {
      regla: "RC5",
      tipo: "confirmacion",
      detalle: "La cotización (26.500.000) difiere 6 % de la solicitud (25.000.000).",
      valores: { solicitud: 25_000_000, cotizacion: 26_500_000, diferencia_pct: 6 },
    },
  ],
  informativos: [],
  retroactiva: false,
};

const posicion = (descripcion: string, cantidad: number, precio_unitario: number) => ({
  descripcion,
  cantidad,
  unidad: "UN",
  precio_unitario,
  centro_costo: "CC-1010",
  subarea: "Desarrollo",
  indicador_iva: "C1",
});

const ordenBase = {
  referencia: { solicitud_id: "SOL-2026-004" },
  sociedad: "1000",
  organizacion_compras: "1000",
  proveedor: { codigo_sap: "100310", nit: "901222333", nombre: "Cloud Andina S.A.S." },
  moneda: "COP",
  condiciones_pago: "Z000",
  aprobador: { email: "dgarcia@periferia-ficticia.com" },
  posiciones: [posicion("Bolsa de 100 horas", 100, 250_000)],
};

const llamadaPayload = (orden: object) => ({
  nombre: "oc_construir_payload",
  args: { caso: "sol-004" },
  ok: true,
  resumen: "OC lista",
  datos: { orden },
});

describe("PasoHerramienta", () => {
  it("muestra el paso en lenguaje natural y su resumen; el detalle trae herramienta, caso y argumentos", async () => {
    const llamada = {
      nombre: "oc_validar",
      args: { caso: "sol-004" },
      ok: true,
      resumen: "apta · confirmaciones: RC5",
    };
    render(<PasoHerramienta llamada={llamada} />);
    const paso = screen.getByRole("group", { name: "Validé contra los maestros" });

    expect(within(paso).getByText("Validé contra los maestros")).toBeVisible();
    expect(within(paso).getByText("apta · confirmaciones: RC5")).toBeVisible();
    expect(within(paso).getByText(TEXTOS_HERRAMIENTA.correcta.trim())).toBeInTheDocument();
    expect(within(paso).getByText("oc_validar · sol-004")).toBeInTheDocument();

    await userEvent.click(within(paso).getByText(TEXTOS_HERRAMIENTA.detalles));

    expect(within(paso).getByText(/"caso": "sol-004"/)).toBeVisible();
    expect(within(paso).queryByText(TEXTOS_HERRAMIENTA.datos)).not.toBeInTheDocument();
  });

  it("muestra en el detalle técnico el JSON completo de los datos", async () => {
    render(
      <PasoHerramienta
        llamada={{ nombre: "oc_validar", args: {}, ok: true, resumen: "apta", datos: validacion }}
      />,
    );

    await userEvent.click(screen.getByText(TEXTOS_HERRAMIENTA.detalles));

    expect(screen.getByText(TEXTOS_HERRAMIENTA.datos)).toBeVisible();
    expect(screen.getByText(/"cotizacion": 26500000/)).toBeVisible();
  });

  it("marca las llamadas con error", () => {
    render(
      <PasoHerramienta llamada={{ nombre: "oc_crear", args: {}, ok: false, resumen: "NO_APTA" }} />,
    );

    expect(screen.getByRole("group", { name: "Creé la OC en SAP" })).toHaveTextContent(
      TEXTOS_HERRAMIENTA.conError.trim(),
    );
  });
});

describe("PasosTurno", () => {
  it("lista todos los pasos y dibuja los controles de la validación con texto accesible", () => {
    render(
      <PasosTurno
        llamadas={[
          { nombre: "oc_leer_paquete", args: { caso: "sol-004" }, ok: true, resumen: "leído" },
          { nombre: "oc_validar", args: {}, ok: true, resumen: "apta", datos: validacion },
        ]}
      />,
    );
    const pasos = screen.getByRole("region", { name: TEXTOS_HERRAMIENTA.pasos });
    const controles = screen.getByRole("list", { name: TEXTOS_VALIDACION.controles });

    expect(within(pasos).getAllByRole("listitem")).toHaveLength(2);
    expect(within(pasos).getByRole("group", { name: "Leí los documentos" })).toBeInTheDocument();
    expect(screen.getByText(TEXTOS_VALIDACION.apta)).toBeInTheDocument();
    expect(within(controles).getByText(/La cotización \(26\.500\.000\) difiere 6 %/)).toBeVisible();
    expect(within(controles).getByText(TEXTOS_VALIDACION.tipos.confirmacion)).toBeInTheDocument();
    expect(within(controles).getByText("RC5")).toBeInTheDocument();
    expect(within(controles).getByText("Cotización")).toBeInTheDocument();
    expect(within(controles).getByText(/^COP\s26\.500\.000$/)).toBeInTheDocument();
    expect(within(controles).getByText("Diferencia")).toBeInTheDocument();
    expect(within(controles).getByText("6 %")).toBeInTheDocument();
  });

  it("muestra la OC como documento y la creación como tarjeta de éxito", () => {
    const creada = {
      numero_oc: "4500000002",
      fecha: "2026-09-03T15:30:00Z",
      idempotente: false,
      ruta_evidencia: "out/sol-004/aprobacion.txt",
    };
    render(
      <PasosTurno
        llamadas={[
          llamadaPayload(ordenBase),
          { nombre: "oc_crear", args: {}, ok: true, resumen: "OC 4500000002", datos: creada },
        ]}
      />,
    );
    const documento = screen.getByRole("article", { name: TEXTOS_ORDEN.titulo });

    expect(within(documento).getByText(/Cloud Andina S.A.S./)).toBeInTheDocument();
    expect(within(documento).getByText(/SOL-2026-004/)).toBeInTheDocument();
    expect(within(documento).getByText("1000 / 1000")).toBeInTheDocument();
    expect(within(documento).getByRole("columnheader", { name: "Subtotal" })).toBeInTheDocument();
    expect(within(documento).getByText("Ninguna")).toBeInTheDocument();
    expect(screen.getByText("Listo: OC 4500000002 creada en SAP")).toBeInTheDocument();
    expect(screen.getByText(/septiembre de 2026/)).toHaveAttribute("datetime", creada.fecha);
    expect(screen.getByText("out/sol-004/aprobacion.txt")).toBeInTheDocument();
  });

  it("suma el total de todas las posiciones y lista las excepciones con su detalle", () => {
    const orden = {
      ...ordenBase,
      moneda: "USD",
      posiciones: [posicion("A", 2, 10.5), posicion("B", 3, 1000)],
      excepciones: [
        { codigo: "RC5", detalle: "Diferencia de 6 % confirmada" },
        { codigo: "RC6", detalle: "Cotización vencida confirmada" },
      ],
    };
    render(<PasosTurno llamadas={[llamadaPayload(orden)]} />);
    const documento = screen.getByRole("article", { name: TEXTOS_ORDEN.titulo });
    const excepciones = within(documento).getByRole("list", {
      name: TEXTOS_ORDEN.campos.excepciones,
    });

    expect(within(documento).getByText("Total").parentElement).toHaveTextContent(/USD\s3\.021/);
    expect(within(excepciones).getAllByRole("listitem")).toHaveLength(2);
    expect(within(excepciones).getByText(/Cotización vencida confirmada/)).toBeInTheDocument();
    expect(within(documento).queryByText("Ninguna")).not.toBeInTheDocument();
  });
});
