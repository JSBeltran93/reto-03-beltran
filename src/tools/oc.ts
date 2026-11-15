/**
 * Herramientas de órdenes de compra expuestas al agente. Cada export lo ve el
 * modelo como `oc_<export>` (PRD §6.2). La lógica de negocio vive en `./oc/`.
 */
import { z } from "zod";

import { huella } from "../comun/huella";
import { relojSistema } from "../comun/reloj";
import { exito } from "../comun/resultado";
import { evaluarCaso } from "./oc/caso";
import { EsquemaPaquete } from "./oc/esquemas";
import { definirHerramienta } from "./oc/herramienta";
import { leerPaquete } from "./oc/paquete";
import { registrarControl, RESULTADOS_CONTROL } from "./oc/registro-control";
import type { Validacion } from "./oc/validacion";

const caso = z
  .string()
  .describe("Nombre de la carpeta del caso en fixtures/reto-03/solicitudes/, por ejemplo sol-001");
const paquete = EsquemaPaquete.describe(
  "Paquete normalizado devuelto por oc_leer_paquete, sin cambios",
);

const AVISO_PAQUETE_DISTINTO =
  "El paquete recibido difiere de los documentos del caso; se validó con los documentos originales.";

function registrarBloqueo(raiz: string, solicitudId: string, validacion: Validacion): void {
  registrarControl(raiz, {
    solicitud_id: solicitudId,
    resultado: RESULTADOS_CONTROL.bloqueada,
    numero_oc: null,
    retroactiva: validacion.retroactiva,
    bloqueos: validacion.bloqueos.map((h) => h.regla),
    confirmaciones: validacion.confirmaciones.map((h) => h.regla),
    ts: relojSistema.ahora().toISOString(),
  });
}

/** `oc_leer_paquete`: lee y normaliza el paquete de compra de un caso (HU-1). */
export const leer_paquete = definirHerramienta({
  description:
    "Lee el correo, la solicitud, la cotización, la aprobación y la factura de un caso y devuelve el paquete normalizado.",
  args: { caso },
  ejecutar: (args, ctx) => leerPaquete(ctx.directory, args.caso),
});

/** `oc_validar`: aplica RC1–RC10 tomando como fuente de verdad los documentos del caso (HU-2). */
export const validar = definirHerramienta({
  description:
    "Valida el paquete contra los maestros y las reglas RC1-RC10 y devuelve bloqueos, confirmaciones, valores derivados y si la compra es retroactiva.",
  args: { caso, paquete },
  ejecutar: (args, ctx) => {
    const evaluado = evaluarCaso(ctx.directory, args.caso);
    if (!evaluado.ok) return evaluado;
    const { paquete: fuente, validacion } = evaluado.data;
    if (!validacion.apta)
      registrarBloqueo(ctx.directory, fuente.solicitud.solicitud_id, validacion);
    const alterado = huella(args.paquete) !== huella(fuente);
    return exito(alterado ? { ...validacion, aviso: AVISO_PAQUETE_DISTINTO } : validacion);
  },
});
