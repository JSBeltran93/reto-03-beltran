import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { construir_payload, crear, leer_paquete } from "../../../src/tools/oc";
import type { OrdenCompra, Paquete } from "../../../src/tools/oc/esquemas";
import { contexto, crearProyectoTemporal, leerJsonTexto } from "../../apoyo/proyecto";

async function payloadDe(raiz: string, caso: string): Promise<OrdenCompra> {
  const ctx = contexto(raiz);
  const paquete = leerJsonTexto(await leer_paquete.execute({ caso }, ctx)) as { data: Paquete };
  const resultado = leerJsonTexto(
    await construir_payload.execute({ caso, paquete: paquete.data, derivados: {} }, ctx),
  ) as { data: { orden: OrdenCompra } };
  return resultado.data.orden;
}

const crearOrden = async (raiz: string, caso: string, payload: OrdenCompra, confirmado?: boolean) =>
  leerJsonTexto(
    await crear.execute(
      confirmado === undefined ? { caso, payload } : { caso, payload, confirmado },
      contexto(raiz),
    ),
  );

describe("oc_crear", () => {
  it("crea sol-001 y es idempotente en una segunda llamada", async () => {
    const raiz = crearProyectoTemporal();
    const payload = await payloadDe(raiz, "sol-001");

    const primera = await crearOrden(raiz, "sol-001", payload);
    const segunda = await crearOrden(raiz, "sol-001", payload);

    expect(primera).toMatchObject({
      ok: true,
      data: { numero_oc: "4500000001", idempotente: false },
    });
    expect(segunda).toMatchObject({
      ok: true,
      data: { numero_oc: "4500000001", idempotente: true },
    });
  });

  it("exige confirmación explícita cuando el caso tiene confirmaciones", async () => {
    const raiz = crearProyectoTemporal();
    const payload = await payloadDe(raiz, "sol-004");

    expect(await crearOrden(raiz, "sol-004", payload)).toMatchObject({
      ok: false,
      error: { codigo: "REQUIERE_CONFIRMACION" },
    });
    expect(await crearOrden(raiz, "sol-004", payload, true)).toMatchObject({
      ok: true,
      data: { numero_oc: "4500000001" },
    });
  });

  it("rechaza los casos bloqueados aunque el modelo envíe un payload", async () => {
    const raiz = crearProyectoTemporal();
    const payload = await payloadDe(raiz, "sol-001");

    expect(await crearOrden(raiz, "sol-002", payload, true)).toMatchObject({
      ok: false,
      error: { codigo: "NO_APTA" },
    });
  });

  it("rechaza un payload alterado después de la validación", async () => {
    const raiz = crearProyectoTemporal();
    const payload = await payloadDe(raiz, "sol-004");
    const [posicion] = payload.posiciones;
    if (!posicion) throw new Error("payload sin posiciones");
    const alterado = { ...payload, posiciones: [{ ...posicion, precio_unitario: 265_000 }] };

    expect(await crearOrden(raiz, "sol-004", alterado, true)).toMatchObject({
      ok: false,
      error: { codigo: "PAYLOAD_ALTERADO" },
    });
  });

  it("devuelve ARGS_INVALIDOS en lugar de lanzar ante argumentos mal formados", async () => {
    const resultado = leerJsonTexto(
      await crear.execute(
        { caso: "sol-001", payload: {} as OrdenCompra },
        contexto(crearProyectoTemporal()),
      ),
    );

    expect(resultado).toMatchObject({ ok: false, error: { codigo: "ARGS_INVALIDOS" } });
  });

  it("genera la evidencia si el modelo no la pidió, así ruta_evidencia siempre existe", async () => {
    const raiz = crearProyectoTemporal();
    const payload = await payloadDe(raiz, "sol-001");

    const r = (await crearOrden(raiz, "sol-001", payload)) as { data: { ruta_evidencia: string } };

    expect(existsSync(path.join(raiz, r.data.ruta_evidencia))).toBe(true);
  });
  it("cada llamada a crear agrega una fila a control.csv, sin deduplicar (HU-5)", async () => {
    const raiz = crearProyectoTemporal();
    const payload = await payloadDe(raiz, "sol-004");
    const alterado = { ...payload, moneda: "USD" as const };
    await crearOrden(raiz, "sol-004", payload);
    await crearOrden(raiz, "sol-004", payload);
    await crearOrden(raiz, "sol-004", alterado, true);
    await crearOrden(raiz, "sol-004", payload, true);
    await crearOrden(raiz, "sol-004", payload, true);
    await crearOrden(raiz, "sol-002", payload, true);

    const lineas = readFileSync(path.join(raiz, "out", "control.csv"), "utf8")
      .trim()
      .split("\n")
      .slice(1)
      .map((linea) => linea.split(",").slice(0, 6).join(","));

    expect(lineas).toEqual([
      "SOL-2026-004,pendiente,,false,,RC5",
      "SOL-2026-004,pendiente,,false,,RC5",
      "SOL-2026-004,bloqueada,,false,,RC5",
      "SOL-2026-004,creada,4500000001,false,,RC5",
      "SOL-2026-004,idempotente,4500000001,false,,RC5",
      "SOL-2026-002,bloqueada,,false,RC1,",
    ]);
  });

  it("construir_payload no escribe en control.csv", async () => {
    const raiz = crearProyectoTemporal();

    await payloadDe(raiz, "sol-004");

    expect(existsSync(path.join(raiz, "out", "control.csv"))).toBe(false);
  });

  it("dos creaciones simultáneas del mismo caso dan una creada y una idempotente", async () => {
    const raiz = crearProyectoTemporal();
    const payload = await payloadDe(raiz, "sol-001");

    const respuestas = (await Promise.all([
      crearOrden(raiz, "sol-001", payload),
      crearOrden(raiz, "sol-001", payload),
    ])) as { data: { numero_oc: string; idempotente: boolean } }[];

    expect(respuestas.map((r) => r.data.numero_oc)).toEqual(["4500000001", "4500000001"]);
    expect(respuestas.map((r) => r.data.idempotente).sort()).toEqual([false, true]);
    const control = readFileSync(path.join(raiz, "out", "control.csv"), "utf8");
    expect(control).toContain("SOL-2026-001,creada,4500000001");
    expect(control).toContain("SOL-2026-001,idempotente,4500000001");
  });
});
