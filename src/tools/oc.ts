/**
 * Herramientas de órdenes de compra expuestas al agente. Cada export lo ve el
 * modelo como `oc_<export>` (PRD §6.2). La lógica de negocio vive en `./oc/`.
 */
import { z } from "zod";

import { huella } from "../comun/huella";
import { relojSistema } from "../comun/reloj";
import { exito } from "../comun/resultado";
import { SapSimulado } from "../sap/mock";
import { evaluarCaso } from "./oc/caso";
import { crearOrdenCaso } from "./oc/crear-orden";
import { EsquemaOrdenCompra, EsquemaPaquete } from "./oc/esquemas";
import { generarEvidencia, hashEvidenciaCaso } from "./oc/evidencia";
import { definirHerramienta } from "./oc/herramienta";
import { leerPaquete } from "./oc/paquete";
import { construirOrden, guardarTrazabilidad } from "./oc/payload";
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

/**
 * Registra en el control el resultado de una validación (HU-5): `bloqueada` si no es apta,
 * `pendiente` si es apta pero espera confirmación; las aptas sin confirmaciones se registran al crear.
 */
function registrarValidacion(raiz: string, solicitudId: string, validacion: Validacion): void {
  const resultado = !validacion.apta
    ? RESULTADOS_CONTROL.bloqueada
    : validacion.confirmaciones.length > 0
      ? RESULTADOS_CONTROL.pendiente
      : null;
  if (resultado === null) return;
  registrarControl(raiz, {
    solicitud_id: solicitudId,
    resultado,
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
    registrarValidacion(ctx.directory, fuente.solicitud.solicitud_id, validacion);
    const alterado = huella(args.paquete) !== huella(fuente);
    return exito(alterado ? { ...validacion, aviso: AVISO_PAQUETE_DISTINTO } : validacion);
  },
});

/** `oc_construir_payload`: construye la OC de SAP y su archivo de trazabilidad (HU-3). */
export const construir_payload = definirHerramienta({
  description:
    "Construye la orden de compra tal como quedaría en SAP, con la trazabilidad de cada valor, a partir de un paquete validado.",
  args: {
    caso,
    paquete,
    derivados: z
      .record(z.string(), z.unknown())
      .describe("Valores derivados devueltos por oc_validar"),
  },
  ejecutar: (args, ctx) => {
    const evaluado = evaluarCaso(ctx.directory, args.caso);
    if (!evaluado.ok) return evaluado;
    const hash = hashEvidenciaCaso(ctx.directory, args.caso);
    if (!hash.ok) return hash;
    const orden = construirOrden(evaluado.data.paquete, evaluado.data.validacion, hash.data);
    if (!orden.ok) return orden;
    const ruta = guardarTrazabilidad(ctx.directory, args.caso, orden.data);
    return exito({ orden: orden.data.orden, ruta_trazabilidad: ruta });
  },
});

/** `oc_generar_evidencia`: escribe la evidencia de aprobación (txt con sha256 y pdf) (HU-4). */
export const generar_evidencia = definirHerramienta({
  description:
    "Genera la evidencia del correo de aprobación (texto con sha256 y PDF) para adjuntarla a la orden de compra.",
  args: { caso },
  ejecutar: (args, ctx) => generarEvidencia(ctx.directory, args.caso),
});

/** `oc_crear`: crea la orden de compra en el SAP simulado (HU-5). */
export const crear = definirHerramienta({
  description:
    "Crea la orden de compra en SAP; solo funciona si el caso es apto y, cuando hay confirmaciones, si el usuario ya confirmó.",
  args: {
    caso,
    payload: EsquemaOrdenCompra.describe(
      "Orden de compra devuelta por oc_construir_payload, sin cambios",
    ),
    confirmado: z
      .boolean()
      .optional()
      .describe("true solo si el usuario confirmó explícitamente en su último mensaje"),
  },
  ejecutar: (args, ctx) =>
    crearOrdenCaso(
      {
        raiz: ctx.directory,
        sap: new SapSimulado(ctx.directory),
        reloj: relojSistema,
        confirmadoPor: `sesion:${ctx.sessionId}`,
      },
      { caso: args.caso, payload: args.payload, confirmado: args.confirmado === true },
    ),
});
