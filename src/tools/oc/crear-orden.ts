import { z } from "zod";

import { huella } from "../../comun/huella";
import type { Reloj } from "../../comun/reloj";
import { exito, fallo, type Resultado } from "../../comun/resultado";
import { ARCHIVOS_SALIDA, rutaSalidaRelativa } from "../../comun/rutas";
import type { OrdenRegistrada, SapAdapter } from "../../sap/adapter";
import { type CasoEvaluado, evaluarCaso } from "./caso";
import type { OrdenCompra } from "./esquemas";
import { hashEvidenciaCaso } from "./evidencia";
import { NOMBRES_HERRAMIENTAS } from "./nombres";
import { construirOrden } from "./payload";
import { registrarControl, type ResultadoControl, RESULTADOS_CONTROL } from "./registro-control";
import type { Validacion } from "./validacion";

/** Salida de `oc_crear`: campos del PRD más la ruta de la evidencia que se muestra al usuario. */
export interface OrdenCreada extends OrdenRegistrada {
  readonly idempotente: boolean;
  readonly ruta_evidencia: string;
}

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

interface Base {
  solicitudId: string;
  validacion: Validacion;
}

function registrar(
  deps: DependenciasCrear,
  base: Base,
  resultado: ResultadoControl,
  numeroOc: string | null,
): void {
  registrarControl(deps.raiz, {
    solicitud_id: base.solicitudId,
    resultado,
    numero_oc: numeroOc,
    retroactiva: base.validacion.retroactiva,
    bloqueos: base.validacion.bloqueos.map((h) => h.regla),
    confirmaciones: base.validacion.confirmaciones.map((h) => h.regla),
    ts: deps.reloj.ahora().toISOString(),
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
  const hash = hashEvidenciaCaso(raiz, caso);
  if (!hash.ok) return hash;
  const orden = construirOrden(evaluado.paquete, evaluado.validacion, hash.data);
  return orden.ok ? exito(orden.data.orden) : orden;
}

function conExcepcionesConfirmadas(orden: OrdenCompra, confirmadoPor: string): OrdenCompra {
  return {
    ...orden,
    excepciones: orden.excepciones.map((e) => ({ ...e, confirmado_por: confirmadoPor })),
  };
}

function respuestaIdempotente(
  deps: DependenciasCrear,
  base: Base,
  existente: Pick<OrdenRegistrada, "numero_oc">,
  rutaEvidencia: string,
): Resultado<OrdenCreada> {
  registrar(deps, base, RESULTADOS_CONTROL.idempotente, existente.numero_oc);
  const { fecha } = EsquemaOrdenExistente.parse(existente);
  const fechaOriginal = fecha ?? deps.reloj.ahora().toISOString();
  return exito({
    numero_oc: existente.numero_oc,
    fecha: fechaOriginal,
    idempotente: true,
    ruta_evidencia: rutaEvidencia,
  });
}

/**
 * Crea la orden de compra de un caso en SAP (HU-5).
 * Verifica en orden: idempotencia → reglas de bloqueo → confirmación del usuario →
 * integridad del payload (debe ser igual a la orden reconstruida desde los documentos).
 * Cada intento queda en out/control.csv.
 * @param deps - raíz del proyecto, adaptador SAP, reloj y usuario que confirma
 * @param pedido - caso, payload y bandera de confirmación
 * @returns número de OC, fecha e idempotencia, o un error de dominio
 */
export async function crearOrdenCaso(
  deps: DependenciasCrear,
  pedido: PedidoCreacion,
): Promise<Resultado<OrdenCreada>> {
  const evaluado = evaluarCaso(deps.raiz, pedido.caso);
  if (!evaluado.ok) return evaluado;
  const { paquete, validacion } = evaluado.data;
  const base: Base = { solicitudId: paquete.solicitud.solicitud_id, validacion };
  const ruta_evidencia = rutaSalidaRelativa(pedido.caso, ARCHIVOS_SALIDA.evidenciaTexto);
  const existente = await deps.sap.buscarOrdenPorReferencia(base.solicitudId);
  if (existente) return respuestaIdempotente(deps, base, existente, ruta_evidencia);
  const permiso = verificarPermiso(validacion, pedido.confirmado);
  if (!permiso.ok) {
    const resultado = validacion.apta ? RESULTADOS_CONTROL.pendiente : RESULTADOS_CONTROL.bloqueada;
    registrar(deps, base, resultado, null);
    return permiso;
  }
  const esperada = reconstruirOrden(deps.raiz, pedido.caso, evaluado.data);
  if (!esperada.ok) return esperada;
  if (huella(pedido.payload) !== huella(esperada.data)) {
    return fallo(
      "PAYLOAD_ALTERADO",
      "El payload no coincide con el validado.",
      `Vuelva a ejecutar ${NOMBRES_HERRAMIENTAS.construirPayload} y envíe su resultado sin cambios.`,
    );
  }
  const creada = await deps.sap.crearOrden(
    conExcepcionesConfirmadas(esperada.data, deps.confirmadoPor),
  );
  registrar(deps, base, RESULTADOS_CONTROL.creada, creada.numero_oc);
  return exito({ ...creada, idempotente: false, ruta_evidencia });
}
