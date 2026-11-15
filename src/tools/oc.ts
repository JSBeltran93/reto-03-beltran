/**
 * Herramientas de órdenes de compra expuestas al agente. Cada export lo ve el
 * modelo como `oc_<export>` (PRD §6.2). La lógica de negocio vive en `./oc/`.
 * `crearHerramientasOc` permite inyectar el SAP y el reloj; los exports del PRD
 * son las instancias por defecto (SAP simulado y reloj del sistema).
 */
import { z } from "zod";

import { type Reloj, relojSistema } from "../comun/reloj";
import { exito } from "../comun/resultado";
import type { SapAdapter } from "../sap/adapter";
import { SapSimulado } from "../sap/mock";
import { avisoPaqueteRecibido, evaluarCaso } from "./oc/caso";
import { crearOrdenCaso } from "./oc/crear-orden";
import { EsquemaOrdenCompra, EsquemaPaqueteRecibido } from "./oc/esquemas";
import { generarEvidencia, huellaEvidenciaCaso } from "./oc/evidencia";
import { leerExcel } from "./oc/excel";
import { definirHerramienta } from "./oc/herramienta";
import { leerPaquete } from "./oc/paquete";
import { construirOrden, guardarTrazabilidad } from "./oc/payload";
import { registrarControl, RESULTADOS_CONTROL } from "./oc/registro-control";
import type { Validacion } from "./oc/validacion";

/** Dependencias externas de las herramientas. */
export interface DependenciasHerramientasOc {
  /** Crea el adaptador SAP para la raíz del proyecto de cada llamada. */
  readonly crearSap: (raiz: string) => SapAdapter;
  /** Fuente de la hora para el registro de control (`oc_validar` bloqueada y `oc_crear`). */
  readonly reloj: Reloj;
}

const DEPENDENCIAS_POR_DEFECTO: DependenciasHerramientasOc = {
  crearSap: (raiz) => new SapSimulado(raiz),
  reloj: relojSistema,
};

const caso = z
  .string()
  .describe("Nombre de la carpeta del caso en fixtures/reto-03/solicitudes/, por ejemplo sol-001");
// Tolerante (campos opcionales): el servidor relee el caso de disco (CA2), así que un
// paquete incompleto no debe gastar una iteración en ARGS_INVALIDOS; solo genera un aviso.
const paquete = EsquemaPaqueteRecibido.optional().describe(
  "Paquete normalizado devuelto por oc_leer_paquete, sin cambios",
);

/** Agrega el aviso de paquete distinto o incompleto, si lo hay, a los datos de la respuesta. */
const conAviso = <T extends object>(
  data: T,
  aviso: string | undefined,
): T | (T & { aviso: string }) => (aviso === undefined ? data : { ...data, aviso });

const herramientaLeerPaquete = () =>
  definirHerramienta({
    description:
      "Lee el correo, la solicitud, la cotización, la aprobación y la factura de un caso y devuelve el paquete normalizado.",
    args: { caso },
    ejecutar: (args, ctx) => leerPaquete(ctx.directory, args.caso),
  });

/**
 * Un caso bloqueado no llega a `oc_crear` (no hay payload que enviar), así que su
 * intento se registra al validarlo: HU-5 pide una fila por intento, también bloqueado.
 */
function registrarBloqueo(
  raiz: string,
  solicitudId: string,
  validacion: Validacion,
  reloj: Reloj,
): void {
  registrarControl(raiz, {
    solicitud_id: solicitudId,
    resultado: RESULTADOS_CONTROL.bloqueada,
    numero_oc: null,
    retroactiva: validacion.retroactiva,
    bloqueos: validacion.bloqueos.map((h) => h.regla),
    confirmaciones: validacion.confirmaciones.map((h) => h.regla),
    ts: reloj.ahora().toISOString(),
  });
}

const herramientaValidar = (dependencias: DependenciasHerramientasOc) =>
  definirHerramienta({
    description:
      "Valida el paquete contra los maestros y las reglas RC1-RC10 y devuelve bloqueos, confirmaciones, valores derivados y si la compra es retroactiva.",
    args: { caso, paquete },
    ejecutar: (args, ctx) => {
      const evaluado = evaluarCaso(ctx.directory, args.caso);
      if (!evaluado.ok) return evaluado;
      const { paquete: fuente, validacion } = evaluado.data;
      if (!validacion.apta) {
        registrarBloqueo(
          ctx.directory,
          fuente.solicitud.solicitud_id,
          validacion,
          dependencias.reloj,
        );
      }
      return exito(conAviso(validacion, avisoPaqueteRecibido(args.paquete, fuente)));
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
        .optional()
        .describe("Valores derivados devueltos por oc_validar (se recalculan desde el caso)"),
    },
    ejecutar: (args, ctx) => {
      const evaluado = evaluarCaso(ctx.directory, args.caso);
      if (!evaluado.ok) return evaluado;
      const huellaEvidencia = huellaEvidenciaCaso(ctx.directory, args.caso);
      if (!huellaEvidencia.ok) return huellaEvidencia;
      const { paquete: fuente, validacion } = evaluado.data;
      const orden = construirOrden(fuente, validacion, huellaEvidencia.data);
      if (!orden.ok) return orden;
      const ruta = guardarTrazabilidad(ctx.directory, args.caso, orden.data);
      const aviso = avisoPaqueteRecibido(args.paquete, fuente);
      return exito(conAviso({ orden: orden.data.orden, ruta_trazabilidad: ruta }, aviso));
    },
  });

const herramientaGenerarEvidencia = () =>
  definirHerramienta({
    description:
      "Genera la evidencia del correo de aprobación (texto con sha256 y PDF) para adjuntarla a la orden de compra.",
    args: { caso },
    ejecutar: (args, ctx) => generarEvidencia(ctx.directory, args.caso),
  });

const herramientaLeerExcel = () =>
  definirHerramienta({
    description:
      "Lee la primera hoja de un libro .xlsx dentro de fixtures/ y devuelve sus filas con los encabezados como claves.",
    args: {
      ruta: z
        .string()
        .min(1)
        .describe(
          "Ruta del .xlsx relativa a la raíz del proyecto y dentro de fixtures/, por ejemplo fixtures/compras/solicitud.xlsx",
        ),
    },
    ejecutar: (args, ctx) => leerExcel(ctx.directory, args.ruta),
  });

const herramientaCrear = (dependencias: DependenciasHerramientasOc) =>
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
          sap: dependencias.crearSap(ctx.directory),
          reloj: dependencias.reloj,
          confirmadoPor: `sesion:${ctx.sessionId}`,
        },
        { caso: args.caso, payload: args.payload, confirmado: args.confirmado === true },
      ),
  });

/** Las herramientas del PRD (cinco P0 y `leer_excel`, P1), por su nombre de export. */
export interface HerramientasOc {
  readonly leer_paquete: ReturnType<typeof herramientaLeerPaquete>;
  readonly validar: ReturnType<typeof herramientaValidar>;
  readonly construir_payload: ReturnType<typeof herramientaConstruirPayload>;
  readonly generar_evidencia: ReturnType<typeof herramientaGenerarEvidencia>;
  readonly crear: ReturnType<typeof herramientaCrear>;
  readonly leer_excel: ReturnType<typeof herramientaLeerExcel>;
}

/**
 * Crea las herramientas del PRD con las dependencias indicadas.
 * @param dependencias - fábrica del adaptador SAP y reloj (por defecto, SAP simulado y reloj del sistema)
 * @returns herramientas indexadas por su nombre de export (el modelo las ve como `oc_<export>`)
 */
export function crearHerramientasOc(
  dependencias: DependenciasHerramientasOc = DEPENDENCIAS_POR_DEFECTO,
): HerramientasOc {
  return {
    leer_paquete: herramientaLeerPaquete(),
    validar: herramientaValidar(dependencias),
    construir_payload: herramientaConstruirPayload(),
    generar_evidencia: herramientaGenerarEvidencia(),
    crear: herramientaCrear(dependencias),
    leer_excel: herramientaLeerExcel(),
  };
}

/** Herramientas con las dependencias por defecto (las que usan la demo y el servidor por omisión). */
export const HERRAMIENTAS_OC = crearHerramientasOc();

/**
 * Exports del contrato del PRD §6.2: `oc_leer_paquete` (HU-1), `oc_validar` (HU-2),
 * `oc_construir_payload` (HU-3), `oc_generar_evidencia` (HU-4), `oc_crear` (HU-5) y
 * `oc_leer_excel` (P1 opcional: solicitudes que llegan como `.xlsx`).
 */
export const { leer_paquete, validar, construir_payload, generar_evidencia, crear, leer_excel } =
  HERRAMIENTAS_OC;
