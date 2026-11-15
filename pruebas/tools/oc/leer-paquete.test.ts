import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { leer_paquete } from "../../../src/tools/oc";
import {
  contexto,
  crearProyectoTemporal,
  leerJsonTexto,
  RAIZ_PROYECTO,
} from "../../apoyo/proyecto";

const carpetaCaso = (raiz: string, caso: string): string =>
  path.join(raiz, "fixtures/reto-03/solicitudes", caso);

const leerCaso = async (raiz: string, caso: string): Promise<unknown> =>
  leerJsonTexto(await leer_paquete.execute({ caso }, contexto(raiz)));

describe("oc_leer_paquete", () => {
  it.each(["sol-001", "sol-002", "sol-003", "sol-004", "sol-005", "sol-006"])(
    "lee %s sin adjuntos faltantes",
    async (caso) => {
      expect(await leerCaso(RAIZ_PROYECTO, caso)).toMatchObject({
        ok: true,
        data: { faltantes: [] },
      });
    },
  );

  it("normaliza el paquete de sol-005 con factura y aprobación", async () => {
    expect(await leerCaso(RAIZ_PROYECTO, "sol-005")).toMatchObject({
      ok: true,
      data: {
        correo: { id: "sol-005-correo" },
        aprobacion: { de: "rtorres@periferia-ficticia.com", aprobado: true },
        factura: { numero: "FC-88231", fecha: "2026-08-10", total: 3_200_000 },
      },
    });
  });

  it("reporta una cotización ausente como null y la lista en faltantes", async () => {
    const raiz = crearProyectoTemporal();
    rmSync(path.join(carpetaCaso(raiz, "sol-001"), "cotizacion.txt"));

    expect(await leerCaso(raiz, "sol-001")).toMatchObject({
      ok: true,
      data: { cotizacion: null, faltantes: ["cotizacion.pdf"] },
    });
  });

  it("devuelve JSON_INVALIDO si la solicitud está mal formada", async () => {
    const raiz = crearProyectoTemporal();
    writeFileSync(path.join(carpetaCaso(raiz, "sol-001"), "solicitud.json"), "{ roto");

    expect(await leerCaso(raiz, "sol-001")).toMatchObject({
      ok: false,
      error: { codigo: "JSON_INVALIDO" },
    });
  });

  it("devuelve MONTO_INVALIDO si un monto no es numérico", async () => {
    const raiz = crearProyectoTemporal();
    writeFileSync(
      path.join(carpetaCaso(raiz, "sol-001"), "solicitud.json"),
      JSON.stringify({
        solicitud_id: "X",
        solicitante: "Y",
        proveedor_nombre: "Z",
        descripcion: "D",
        centro_costo: "CC-1010",
        subarea: "Soporte",
        cantidad: 1,
        valor_unitario: "mil",
        valor_total: 1,
        moneda: "COP",
        fecha_solicitud: "2026-08-20",
      }),
    );

    expect(await leerCaso(raiz, "sol-001")).toMatchObject({
      ok: false,
      error: { codigo: "MONTO_INVALIDO" },
    });
  });

  it.each(["sol-999", "../maestros"])("rechaza el caso inexistente %s", async (caso) => {
    expect(await leerCaso(RAIZ_PROYECTO, caso)).toMatchObject({
      ok: false,
      error: { codigo: "CASO_INEXISTENTE" },
    });
  });
});
