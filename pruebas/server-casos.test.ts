import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { EsquemaListaCasos, type ResumenCaso } from "../src/comun/contratos-api";
import { ARCHIVOS_SALIDA, rutaSalida } from "../src/comun/rutas";
import type { SapAdapter } from "../src/sap/adapter";
import { crearAplicacion } from "../src/server";
import { carpetaSolicitudes } from "../src/tools/oc/insumos";
import { dependenciasCiclo } from "./apoyo/ciclo";
import { crearProyectoTemporal } from "./apoyo/proyecto";
import { LlmFalso } from "./dobles/llm-falso";

const ENCABEZADO_CONTROL =
  "solicitud_id,resultado,numero_oc,retroactiva,bloqueos,confirmaciones,ts";
const TOTAL_CASOS_FIXTURE = 6;

const aplicacion = (raiz: string, sap?: SapAdapter) =>
  crearAplicacion({
    ciclo: dependenciasCiclo(new LlmFalso([]), raiz),
    carpetaEstaticos: "/tmp/no-existe",
    ...(sap && { sap }),
  });

async function pedirCasos(raiz: string, sap?: SapAdapter): Promise<ResumenCaso[]> {
  const r = await request(aplicacion(raiz, sap)).get("/api/casos");
  expect(r.status).toBe(200);
  return EsquemaListaCasos.parse(r.body).casos;
}

const estados = (casos: readonly ResumenCaso[]) =>
  Object.fromEntries(casos.map((c) => [c.caso, [c.estado, c.numero_oc]]));

function escribirSalida(raiz: string, archivo: string, lineas: readonly string[]): void {
  mkdirSync(path.dirname(rutaSalida(raiz, archivo)), { recursive: true });
  writeFileSync(rutaSalida(raiz, archivo), `${lineas.join("\n")}\n`);
}

describe("GET /api/casos", () => {
  it("lista los casos sin procesar con sus datos de negocio cuando no hay salidas", async () => {
    const casos = await pedirCasos(crearProyectoTemporal());

    expect(casos).toHaveLength(TOTAL_CASOS_FIXTURE);
    expect(casos[0]).toMatchObject({
      caso: "sol-001",
      solicitud_id: "SOL-2026-001",
      moneda: "COP",
      estado: "sin_procesar",
      numero_oc: null,
    });
    expect(casos[0]?.descripcion).not.toBe("");
    expect(casos[0]?.valor_total).toBeGreaterThan(0);
  });

  it("deriva el estado de la última fila de control y da prioridad a la orden en SAP", async () => {
    const raiz = crearProyectoTemporal();
    escribirSalida(raiz, ARCHIVOS_SALIDA.control, [
      ENCABEZADO_CONTROL,
      "SOL-2026-002,bloqueada,,false,RC1,,2026-09-03T15:00:00Z",
      "SOL-2026-004,pendiente,,false,,RC5,2026-09-03T15:00:00Z",
      "SOL-2026-006,pendiente,,false,,RC6,2026-09-03T15:00:00Z",
      "SOL-2026-006,creada,4500000009,false,,RC6,2026-09-03T15:01:00Z",
      "SOL-2026-005,pendiente,,true,,RC8,2026-09-03T15:00:00Z",
    ]);
    const orden = { referencia: { solicitud_id: "SOL-2026-005" } };
    escribirSalida(raiz, ARCHIVOS_SALIDA.ordenesSap, [
      JSON.stringify({ numero_oc: "4500000003", fecha: "2026-09-03T15:02:00Z", orden }),
    ]);

    expect(estados(await pedirCasos(raiz))).toEqual({
      "sol-001": ["sin_procesar", null],
      "sol-002": ["bloqueada", null],
      "sol-003": ["sin_procesar", null],
      "sol-004": ["pendiente", null],
      "sol-005": ["creada", "4500000003"],
      "sol-006": ["creada", "4500000009"],
    });
  });

  it("omite los casos con paquete ilegible y tolera un SAP que falla", async () => {
    const raiz = crearProyectoTemporal();
    const roto = path.join(carpetaSolicitudes(raiz), "sol-999");
    mkdirSync(roto);
    writeFileSync(path.join(roto, "correo.json"), "{ no es json");
    writeFileSync(path.join(roto, "solicitud.json"), "{}");
    const sapRoto: SapAdapter = {
      consultarProveedor: () => Promise.reject(new Error("caído")),
      crearOrden: () => Promise.reject(new Error("caído")),
      buscarOrdenPorReferencia: () => Promise.reject(new Error("caído")),
    };

    const casos = await pedirCasos(raiz, sapRoto);

    expect(casos.map((c) => c.caso)).not.toContain("sol-999");
    expect(casos).toHaveLength(TOTAL_CASOS_FIXTURE);
  });

  it("ignora un control.csv con filas incompletas", async () => {
    const raiz = crearProyectoTemporal();
    escribirSalida(raiz, ARCHIVOS_SALIDA.control, [ENCABEZADO_CONTROL, "SOL-2026-001,"]);

    expect(estados(await pedirCasos(raiz))["sol-001"]).toEqual(["sin_procesar", null]);
  });
});
