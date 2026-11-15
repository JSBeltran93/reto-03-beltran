import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  construir_payload,
  crear,
  generar_evidencia,
  leer_paquete,
  validar,
} from "../src/tools/oc";
import type { OrdenCompra, Paquete } from "../src/tools/oc/esquemas";
import { contexto, crearProyectoTemporal, leerJsonTexto } from "./apoyo/proyecto";

interface Sobre<T> {
  ok: boolean;
  data: T;
  error?: { codigo: string };
}

async function ejecutarFlujo(raiz: string, caso: string, confirmado: boolean): Promise<string> {
  const ctx = contexto(raiz);
  const paquete = leerJsonTexto(await leer_paquete.execute({ caso }, ctx)) as Sobre<Paquete>;
  const v = leerJsonTexto(await validar.execute({ caso, paquete: paquete.data }, ctx)) as Sobre<{
    apta: boolean;
  }>;
  if (!v.data.apta) return "bloqueada";
  const payload = leerJsonTexto(
    await construir_payload.execute({ caso, paquete: paquete.data, derivados: {} }, ctx),
  ) as Sobre<{ orden: OrdenCompra }>;
  await generar_evidencia.execute({ caso }, ctx);
  const creada = leerJsonTexto(
    await crear.execute({ caso, payload: payload.data.orden, confirmado }, ctx),
  ) as Sobre<{ numero_oc: string }>;
  return creada.ok ? creada.data.numero_oc : (creada.error?.codigo ?? "error");
}

describe("objetivos O1–O4 del PRD sobre los seis casos", () => {
  it("coincide con la matriz de resultados esperada (SOLUCION.md §5)", async () => {
    const raiz = crearProyectoTemporal();
    const resultados: Record<string, string> = {};
    for (const caso of ["sol-001", "sol-002", "sol-003", "sol-004", "sol-005", "sol-006"]) {
      resultados[caso] = await ejecutarFlujo(raiz, caso, false);
    }
    resultados["sol-004 confirmada"] = await ejecutarFlujo(raiz, "sol-004", true);
    resultados["sol-005 confirmada"] = await ejecutarFlujo(raiz, "sol-005", true);

    expect(resultados).toEqual({
      "sol-001": "4500000001",
      "sol-002": "bloqueada",
      "sol-003": "bloqueada",
      "sol-004": "REQUIERE_CONFIRMACION",
      "sol-005": "REQUIERE_CONFIRMACION",
      "sol-006": "REQUIERE_CONFIRMACION",
      "sol-004 confirmada": "4500000002",
      "sol-005 confirmada": "4500000003",
    });
    const control = readFileSync(path.join(raiz, "out", "control.csv"), "utf8");
    expect(control).toMatch(/SOL-2026-005,creada,4500000003,true,,RC8,/);
  });
});
