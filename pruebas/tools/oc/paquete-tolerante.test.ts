import { describe, expect, it } from "vitest";

import { catalogoOc, ejecutarLlamada } from "../../../src/agente/registro-herramientas";
import {
  AVISO_PAQUETE_DISTINTO,
  AVISO_PAQUETE_INCOMPLETO,
  avisoPaqueteRecibido,
} from "../../../src/tools/oc/caso";
import { paqueteDe } from "../../apoyo/paquetes";
import { contexto, crearProyectoTemporal } from "../../apoyo/proyecto";

/** Paquete de sol-004 sin los adjuntos nulos, como lo reenvía a veces el modelo real. */
function sinFactura(): Record<string, unknown> {
  const { factura: _factura, ...resto } = paqueteDe("sol-004");
  return resto;
}

const llamar = (nombre: string, args: Record<string, unknown>) =>
  ejecutarLlamada(catalogoOc(), { id: "1", nombre, args }, contexto(crearProyectoTemporal()));

describe("avisoPaqueteRecibido", () => {
  it.each([
    ["coincide", () => paqueteDe("sol-001"), undefined],
    ["viene incompleto", sinFactura, AVISO_PAQUETE_INCOMPLETO],
    ["no viene", () => undefined, AVISO_PAQUETE_INCOMPLETO],
    ["es de otro caso", () => paqueteDe("sol-002"), AVISO_PAQUETE_DISTINTO],
  ])("avisa correctamente cuando el paquete %s", (_caso, recibido, aviso) => {
    expect(avisoPaqueteRecibido(recibido(), paqueteDe("sol-001"))).toBe(aviso);
  });
});

describe("argumentos tolerantes de oc_validar y oc_construir_payload", () => {
  it("oc_validar acepta un paquete sin factura y avisa que usó los documentos originales", async () => {
    const { vista, data } = await llamar("oc_validar", { caso: "sol-004", paquete: sinFactura() });

    expect(vista.ok).toBe(true);
    expect(data).toMatchObject({ apta: true, aviso: AVISO_PAQUETE_INCOMPLETO });
  });

  it("oc_validar no agrega aviso cuando el paquete llega completo y sin cambios", async () => {
    const { data } = await llamar("oc_validar", { caso: "sol-001", paquete: paqueteDe("sol-001") });

    expect(data).not.toHaveProperty("aviso");
  });

  it("oc_construir_payload acepta un paquete parcial y sin derivados", async () => {
    const { vista, data } = await llamar("oc_construir_payload", {
      caso: "sol-004",
      paquete: { solicitud: { solicitud_id: "SOL-2026-004" }, cotizacion: { nit: null } },
    });

    expect(vista.ok).toBe(true);
    expect(data).toMatchObject({
      orden: { referencia: { solicitud_id: "SOL-2026-004" } },
      aviso: AVISO_PAQUETE_INCOMPLETO,
    });
  });

  it("sigue rechazando con ARGS_INVALIDOS un campo con tipo incorrecto", async () => {
    const { vista } = await llamar("oc_validar", {
      caso: "sol-001",
      paquete: { solicitud: { cantidad: "muchas" } },
    });

    expect(vista.ok).toBe(false);
    expect(vista.resumen).toContain("ARGS_INVALIDOS");
  });
});
