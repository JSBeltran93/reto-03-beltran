import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasoHerramienta } from "./PasoHerramienta";
import { TEXTOS_HERRAMIENTA, TEXTOS_ORDEN } from "./textos";
import { TurnoAsistente } from "./TurnoAsistente";

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
  it("muestra siempre la etiqueta, el nombre técnico, los argumentos y el resultado resumido", () => {
    const llamada = {
      nombre: "oc_validar",
      args: {
        caso: "sol-004",
        paquete: { correo: {}, solicitud: {}, cotizacion: {}, factura: null },
      },
      ok: true,
      resumen: "apta · confirmaciones: RC5",
    };
    render(<PasoHerramienta llamada={llamada} />);
    const paso = screen.getByRole("group", { name: "Validé contra los maestros" });

    expect(within(paso).getByText(TEXTOS_HERRAMIENTA.correcta.trim())).toBeInTheDocument();
    expect(within(paso).getByText("oc_validar")).toBeVisible();
    expect(paso).toHaveTextContent(
      'oc_validar( Argumentos: caso: "sol-004", paquete: {correo, solicitud, cotizacion, +1})',
    );
    expect(within(paso).getByText("apta · confirmaciones: RC5", { exact: false })).toBeVisible();
  });

  it("deja el JSON completo de argumentos y respuesta en «Ver JSON»", async () => {
    render(
      <PasoHerramienta
        llamada={{
          nombre: "oc_validar",
          args: { caso: "sol-004" },
          ok: true,
          resumen: "apta",
          datos: validacion,
        }}
      />,
    );
    expect(screen.queryByText(/"cotizacion": 26500000/)).not.toBeVisible();

    await userEvent.click(screen.getByText(TEXTOS_HERRAMIENTA.detalles));

    expect(screen.getByText(TEXTOS_HERRAMIENTA.datos)).toBeVisible();
    expect(screen.getByText(/"caso": "sol-004"/)).toBeVisible();
    expect(screen.getByText(/"cotizacion": 26500000/)).toBeVisible();
  });

  it("marca las llamadas con error y dice cuando no hay argumentos", () => {
    render(
      <PasoHerramienta llamada={{ nombre: "oc_crear", args: {}, ok: false, resumen: "NO_APTA" }} />,
    );
    const paso = screen.getByRole("group", { name: "Creé la OC en SAP" });

    expect(paso).toHaveTextContent(TEXTOS_HERRAMIENTA.conError.trim());
    expect(paso).toHaveTextContent(TEXTOS_HERRAMIENTA.sinArgumentos);
  });
});

describe("TurnoAsistente", () => {
  it("muestra la actividad con todas las llamadas y después la respuesta en Markdown", () => {
    render(
      <TurnoAsistente
        llamadas={[
          { nombre: "oc_leer_paquete", args: { caso: "sol-004" }, ok: true, resumen: "leído" },
          { nombre: "oc_validar", args: {}, ok: true, resumen: "apta", datos: validacion },
        ]}
        respuesta={{ tipo: "asistente", texto: "| Campo | Valor |\n| --- | --- |\n| Total | 25 |" }}
      />,
    );
    const actividad = screen.getByRole("region", { name: TEXTOS_HERRAMIENTA.pasos });

    expect(within(actividad).getAllByRole("listitem")).toHaveLength(2);
    expect(within(actividad).getByText(TEXTOS_HERRAMIENTA.conteo(2))).toBeInTheDocument();
    expect(
      within(actividad).getByRole("group", { name: "Leí los documentos" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Campo" })).toBeInTheDocument();
  });

  it("si el agente reintentó una herramienta, dibuja solo la última OC propuesta", () => {
    render(
      <TurnoAsistente
        llamadas={[llamadaPayload(ordenBase), llamadaPayload({ ...ordenBase, moneda: "USD" })]}
        respuesta={null}
      />,
    );

    expect(screen.getAllByRole("article", { name: TEXTOS_ORDEN.titulo })).toHaveLength(1);
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("muestra la OC como documento y la creación como tarjeta de éxito", () => {
    const creada = {
      numero_oc: "4500000002",
      fecha: "2026-09-03T15:30:00Z",
      idempotente: false,
      ruta_evidencia: "out/sol-004/aprobacion.txt",
    };
    render(
      <TurnoAsistente
        llamadas={[
          llamadaPayload(ordenBase),
          { nombre: "oc_crear", args: {}, ok: true, resumen: "OC 4500000002", datos: creada },
        ]}
        respuesta={null}
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
    render(<TurnoAsistente llamadas={[llamadaPayload(orden)]} respuesta={null} />);
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
