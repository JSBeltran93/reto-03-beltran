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
});
