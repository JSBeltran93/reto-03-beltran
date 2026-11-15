/**
 * Herramientas de órdenes de compra expuestas al agente. Cada export lo ve el
 * modelo como `oc_<export>` (PRD §6.2). La lógica de negocio vive en `./oc/`.
 * `crearHerramientasOc` permite inyectar el SAP y el reloj; los exports del PRD
 * son las instancias por defecto (SAP simulado y reloj del sistema).
 */
import { z } from "zod";

import { huella } from "../comun/huella";
import { type Reloj, relojSistema } from "../comun/reloj";
import { exito } from "../comun/resultado";
import type { SapAdapter } from "../sap/adapter";
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

/** Dependencias externas de las herramientas. */
export interface DependenciasHerramientasOc {
  /** Crea el adaptador SAP para la raíz del proyecto de cada llamada. */
  readonly crearSap: (raiz: string) => SapAdapter;
  /** Fuente de la hora para el registro de control. */
  readonly reloj: Reloj;
}

const DEPENDENCIAS_POR_DEFECTO: DependenciasHerramientasOc = {
  crearSap: (raiz) => new SapSimulado(raiz),
  reloj: relojSistema,
};

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
function registrarValidacion(
  raiz: string,
  reloj: Reloj,
  solicitudId: string,
  validacion: Validacion,
): void {
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
    ts: reloj.ahora().toISOString(),
  });
}

const herramientaLeerPaquete = () =>
  definirHerramienta({
    description:
      "Lee el correo, la solicitud, la cotización, la aprobación y la factura de un caso y devuelve el paquete normalizado.",
    args: { caso },
    ejecutar: (args, ctx) => leerPaquete(ctx.directory, args.caso),
  });

const herramientaValidar = (deps: DependenciasHerramientasOc) =>
  definirHerramienta({
    description:
      "Valida el paquete contra los maestros y las reglas RC1-RC10 y devuelve bloqueos, confirmaciones, valores derivados y si la compra es retroactiva.",
    args: { caso, paquete },
    ejecutar: (args, ctx) => {
      const evaluado = evaluarCaso(ctx.directory, args.caso);
      if (!evaluado.ok) return evaluado;
      const { paquete: fuente, validacion } = evaluado.data;
      registrarValidacion(ctx.directory, deps.reloj, fuente.solicitud.solicitud_id, validacion);
      const alterado = huella(args.paquete) !== huella(fuente);
      return exito(alterado ? { ...validacion, aviso: AVISO_PAQUETE_DISTINTO } : validacion);
    },
  });

const herramientaConstruirPayload = () =>
  definirHerramienta({
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

const herramientaGenerarEvidencia = () =>
  definirHerramienta({
    description:
      "Genera la evidencia del correo de aprobación (texto con sha256 y PDF) para adjuntarla a la orden de compra.",
    args: { caso },
    ejecutar: (args, ctx) => generarEvidencia(ctx.directory, args.caso),
  });

const herramientaCrear = (deps: DependenciasHerramientasOc) =>
  definirHerramienta({
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
          sap: deps.crearSap(ctx.directory),
          reloj: deps.reloj,
          confirmadoPor: `sesion:${ctx.sessionId}`,
        },
        { caso: args.caso, payload: args.payload, confirmado: args.confirmado === true },
      ),
  });

/** Las cinco herramientas del PRD, por su nombre de export. */
export interface HerramientasOc {
  readonly leer_paquete: ReturnType<typeof herramientaLeerPaquete>;
  readonly validar: ReturnType<typeof herramientaValidar>;
  readonly construir_payload: ReturnType<typeof herramientaConstruirPayload>;
  readonly generar_evidencia: ReturnType<typeof herramientaGenerarEvidencia>;
  readonly crear: ReturnType<typeof herramientaCrear>;
}

/**
 * Crea las cinco herramientas del PRD con las dependencias indicadas.
 * @param deps - fábrica del adaptador SAP y reloj (por defecto, SAP simulado y reloj del sistema)
 * @returns herramientas indexadas por su nombre de export (el modelo las ve como `oc_<export>`)
 */
export function crearHerramientasOc(
  deps: DependenciasHerramientasOc = DEPENDENCIAS_POR_DEFECTO,
): HerramientasOc {
  return {
    leer_paquete: herramientaLeerPaquete(),
    validar: herramientaValidar(deps),
    construir_payload: herramientaConstruirPayload(),
    generar_evidencia: herramientaGenerarEvidencia(),
    crear: herramientaCrear(deps),
  };
}

/** Herramientas con las dependencias por defecto (las que usan la demo y el servidor por omisión). */
export const HERRAMIENTAS_OC = crearHerramientasOc();

/**
 * Exports del contrato del PRD §6.2: `oc_leer_paquete` (HU-1), `oc_validar` (HU-2),
 * `oc_construir_payload` (HU-3), `oc_generar_evidencia` (HU-4) y `oc_crear` (HU-5).
 */
export const { leer_paquete, validar, construir_payload, generar_evidencia, crear } =
  HERRAMIENTAS_OC;
