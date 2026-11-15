import { existsSync } from "node:fs";

import { z } from "zod";

import { huella } from "../../comun/huella";
import type { Reloj } from "../../comun/reloj";
import { exito, fallo, type Resultado } from "../../comun/resultado";
import { ARCHIVOS_SALIDA, rutaSalida, rutaSalidaRelativa } from "../../comun/rutas";
import type { OrdenRegistrada, SapAdapter } from "../../sap/adapter";
import { type CasoEvaluado, evaluarCaso } from "./caso";
import type { OrdenCompra } from "./esquemas";
import { generarEvidencia, huellaEvidenciaCaso } from "./evidencia";
import { construirOrden } from "./payload";
import { registrarControl, type ResultadoControl, RESULTADOS_CONTROL } from "./registro-control";
import type { Validacion } from "./validacion";

/** Salida de `oc_crear`: campos del PRD más la ruta de la evidencia que se muestra al usuario. */
export interface OrdenCreada extends OrdenRegistrada {
  readonly idempotente: boolean;
  readonly ruta_evidencia: string;
  /** Presente si el modelo envió un payload distinto: se creó con el validado. */
  readonly aviso?: string;
}

/** Aviso cuando el payload recibido no coincide con el reconstruido desde los documentos. */
export const AVISO_PAYLOAD_DISTINTO =
  "El payload recibido difiere del validado; la OC se creó con el payload validado desde los documentos.";

/** Dependencias de la creación de la OC, inyectadas para poder probarla. */
export interface DependenciasCrear {
  readonly raiz: string;
  readonly sap: SapAdapter;
  readonly reloj: Reloj;
  /** Quién confirma las excepciones (sesión de la analista). */
  readonly confirmadoPor: string;
}

/** Datos de una solicitud de creación. */
export interface PedidoCreacion {
  readonly caso: string;
  readonly payload: OrdenCompra;
  readonly confirmado: boolean;
}

const EsquemaOrdenExistente = z.object({ numero_oc: z.string(), fecha: z.string().optional() });
/** El SAP simulado indica si la orden ya existía (creación concurrente de la misma solicitud). */
const EsquemaOrdenGuardada = z.object({ existente: z.boolean().optional() });

interface Base {
  solicitudId: string;
  validacion: Validacion;
}

function registrar(
  dependencias: DependenciasCrear,
  base: Base,
  resultado: ResultadoControl,
  numeroOc: string | null,
): void {
  registrarControl(dependencias.raiz, {
    solicitud_id: base.solicitudId,
    resultado,
    numero_oc: numeroOc,
    retroactiva: base.validacion.retroactiva,
    bloqueos: base.validacion.bloqueos.map((h) => h.regla),
    confirmaciones: base.validacion.confirmaciones.map((h) => h.regla),
    ts: dependencias.reloj.ahora().toISOString(),
  });
}

function verificarPermiso(validacion: Validacion, confirmado: boolean): Resultado<true> {
  if (!validacion.apta) {
    const detalle = validacion.bloqueos.map((h) => `${h.regla}: ${h.detalle}`).join(" ");
    return fallo("NO_APTA", `La OC no se puede crear. ${detalle}`);
  }
  if (validacion.confirmaciones.length > 0 && !confirmado) {
    const detalle = validacion.confirmaciones.map((h) => `${h.regla}: ${h.detalle}`).join(" ");
    return fallo(
      "REQUIERE_CONFIRMACION",
      `Se requiere confirmación explícita del usuario. ${detalle}`,
      "Muestre las confirmaciones al usuario y espere su respuesta.",
    );
  }
  return exito(true);
}

function reconstruirOrden(
  raiz: string,
  caso: string,
  evaluado: CasoEvaluado,
): Resultado<OrdenCompra> {
  const huellaEvidencia = huellaEvidenciaCaso(raiz, caso);
  if (!huellaEvidencia.ok) return huellaEvidencia;
  const orden = construirOrden(evaluado.paquete, evaluado.validacion, huellaEvidencia.data);
  return orden.ok ? exito(orden.data.orden) : orden;
}

function conExcepcionesConfirmadas(orden: OrdenCompra, confirmadoPor: string): OrdenCompra {
  return {
    ...orden,
    excepciones: orden.excepciones.map((e) => ({ ...e, confirmado_por: confirmadoPor })),
  };
}

function respuestaIdempotente(
  dependencias: DependenciasCrear,
  base: Base,
  existente: Pick<OrdenRegistrada, "numero_oc">,
  rutaEvidencia: string,
): Resultado<OrdenCreada> {
  registrar(dependencias, base, RESULTADOS_CONTROL.idempotente, existente.numero_oc);
  const { fecha } = EsquemaOrdenExistente.parse(existente);
  const fechaOriginal = fecha ?? dependencias.reloj.ahora().toISOString();
  return exito({
    numero_oc: existente.numero_oc,
    fecha: fechaOriginal,
    idempotente: true,
    ruta_evidencia: rutaEvidencia,
  });
}

/** Genera la evidencia si el modelo no la pidió antes, para que `ruta_evidencia` siempre exista. */
async function asegurarEvidencia(raiz: string, caso: string): Promise<Resultado<true>> {
  if (existsSync(rutaSalida(raiz, caso, ARCHIVOS_SALIDA.evidenciaTexto))) return exito(true);
  const evidencia = await generarEvidencia(raiz, caso);
  return evidencia.ok ? exito(true) : evidencia;
}

/**
 * Crea la orden de compra de un caso en SAP (HU-5).
 * Verifica en orden: idempotencia → reglas de bloqueo → confirmación del usuario →
 * payload: siempre se crea con la orden reconstruida desde los documentos; si el modelo
 * envió otra, se ignora y se avisa (el modelo no puede alterar el payload validado).
 * Cada intento queda en out/control.csv.
 * @param dependencias - raíz del proyecto, adaptador SAP, reloj y usuario que confirma
 * @param pedido - caso, payload y bandera de confirmación
 * @returns número de OC, fecha e idempotencia, o un error de dominio
 */
export async function crearOrdenCaso(
  dependencias: DependenciasCrear,
  pedido: PedidoCreacion,
): Promise<Resultado<OrdenCreada>> {
  const evaluado = evaluarCaso(dependencias.raiz, pedido.caso);
  if (!evaluado.ok) return evaluado;
  const { paquete, validacion } = evaluado.data;
  const base: Base = { solicitudId: paquete.solicitud.solicitud_id, validacion };
  const ruta_evidencia = rutaSalidaRelativa(pedido.caso, ARCHIVOS_SALIDA.evidenciaTexto);
  const existente = await dependencias.sap.buscarOrdenPorReferencia(base.solicitudId);
  if (existente) return respuestaIdempotente(dependencias, base, existente, ruta_evidencia);
  const permiso = verificarPermiso(validacion, pedido.confirmado);
  if (!permiso.ok) {
    const resultado = validacion.apta ? RESULTADOS_CONTROL.pendiente : RESULTADOS_CONTROL.bloqueada;
    registrar(dependencias, base, resultado, null);
    return permiso;
  }
  const esperada = reconstruirOrden(dependencias.raiz, pedido.caso, evaluado.data);
  if (!esperada.ok) return esperada;
  const alterado = huella(pedido.payload) !== huella(esperada.data);
  return guardarEnSap(
    dependencias,
    base,
    conExcepcionesConfirmadas(esperada.data, dependencias.confirmadoPor),
    {
      caso: pedido.caso,
      rutaEvidencia: ruta_evidencia,
      alterado,
    },
  );
}

/**
 * Asegura la evidencia, crea la orden en SAP y registra el resultado; si otra creación
 * concurrente ya la había guardado, responde como idempotente.
 */
async function guardarEnSap(
  dependencias: DependenciasCrear,
  base: Base,
  orden: OrdenCompra,
  destino: { caso: string; rutaEvidencia: string; alterado: boolean },
): Promise<Resultado<OrdenCreada>> {
  const evidencia = await asegurarEvidencia(dependencias.raiz, destino.caso);
  if (!evidencia.ok) return evidencia;
  const creada = await dependencias.sap.crearOrden(orden);
  const { existente = false } = EsquemaOrdenGuardada.parse(creada);
  const resultado = existente ? RESULTADOS_CONTROL.idempotente : RESULTADOS_CONTROL.creada;
  registrar(dependencias, base, resultado, creada.numero_oc);
  return exito({
    numero_oc: creada.numero_oc,
    fecha: creada.fecha,
    idempotente: existente,
    ruta_evidencia: destino.rutaEvidencia,
    ...(destino.alterado && { aviso: AVISO_PAYLOAD_DISTINTO }),
  });
}
