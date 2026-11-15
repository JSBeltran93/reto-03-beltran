import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { exito, fallo, type Resultado } from "../../comun/resultado";
import { ARCHIVOS_SALIDA, rutaSalida, rutaSalidaRelativa } from "../../comun/rutas";
import {
  MAX_DESCRIPCION_SAP,
  NUMERO_PRIMERA_POSICION,
  ORGANIZACION_COMPRAS,
  SOCIEDAD,
} from "./constantes";
import { EsquemaOrdenCompra, type OrdenCompra, type Paquete } from "./esquemas";
import { extraerCotizacion } from "./extractores";
import type { Validacion } from "./validacion";

/** Origen de cada valor del payload (HU-3). */
export type Trazabilidad = Record<string, { readonly fuente: string; readonly detalle?: string }>;

/** Orden de compra con su mapa de trazabilidad. */
export interface OrdenConTrazabilidad {
  readonly orden: OrdenCompra;
  readonly trazabilidad: Trazabilidad;
}

/**
 * Acorta una descripción al largo del texto breve de SAP, cortando en un límite de palabra.
 * @param texto - descripción completa
 * @param maximo - largo máximo incluyendo los puntos suspensivos
 * @returns el texto, sin cambios si ya cabe
 */
export function truncarDescripcion(texto: string, maximo = MAX_DESCRIPCION_SAP): string {
  if (texto.length <= maximo) return texto;
  const corte = texto.slice(0, maximo - 1);
  const espacio = corte.lastIndexOf(" ");
  return `${(espacio > 0 ? corte.slice(0, espacio) : corte).replace(/[,;:\s]+$/, "")}…`;
}

/**
 * Infiere la unidad de medida de SAP a partir de la descripción.
 * @param descripcion - descripción de la solicitud
 * @returns "H" para horas, "MES" para cuotas mensuales, si no "UN"
 */
export function derivarUnidad(descripcion: string): OrdenCompra["posiciones"][number]["unidad"] {
  if (/\bhoras?\b/i.test(descripcion)) return "H";
  if (/\b(mensual|mensualidad|por mes)\b/i.test(descripcion)) return "MES";
  return "UN";
}

function excepciones(validacion: Validacion): OrdenCompra["excepciones"] {
  return validacion.confirmaciones.map((h) => ({
    codigo: h.regla,
    detalle: h.detalle,
    confirmado_por: null,
  }));
}

function trazar(paquete: Paquete, validacion: Validacion): Trazabilidad {
  const { solicitud } = paquete;
  const origen = (campo: "indicador_iva" | "condiciones_pago"): { fuente: string } =>
    solicitud[campo] === undefined ? { fuente: "maestro.proveedores" } : { fuente: "solicitud" };
  return {
    "referencia.solicitud_id": { fuente: "solicitud" },
    "referencia.correo_id": { fuente: "correo" },
    "referencia.cotizacion_ref": { fuente: "cotizacion" },
    sociedad: { fuente: "derivado", detalle: "constante de la sociedad" },
    organizacion_compras: { fuente: "derivado", detalle: "constante de la organización" },
    proveedor: {
      fuente: "maestro.proveedores",
      detalle: validacion.derivados.proveedor?.nit ?? "",
    },
    moneda: { fuente: "solicitud" },
    condiciones_pago: origen("condiciones_pago"),
    "aprobador.email": { fuente: "aprobacion" },
    "aprobador.fecha_aprobacion": { fuente: "aprobacion" },
    "aprobador.evidencia_sha256": { fuente: "derivado", detalle: "sha256 de la evidencia" },
    "posiciones[0].descripcion": { fuente: "solicitud", detalle: solicitud.descripcion },
    "posiciones[0].cantidad": { fuente: "solicitud" },
    "posiciones[0].unidad": { fuente: "derivado", detalle: "inferida de la descripción" },
    "posiciones[0].precio_unitario": { fuente: "solicitud", detalle: "valor_unitario" },
    "posiciones[0].centro_costo": { fuente: "solicitud" },
    "posiciones[0].subarea": { fuente: "solicitud" },
    "posiciones[0].indicador_iva": origen("indicador_iva"),
  };
}

function posicion(paquete: Paquete, validacion: Validacion): Record<string, unknown> {
  const { solicitud } = paquete;
  return {
    numero: NUMERO_PRIMERA_POSICION,
    descripcion: truncarDescripcion(solicitud.descripcion),
    cantidad: solicitud.cantidad,
    unidad: derivarUnidad(solicitud.descripcion),
    precio_unitario: solicitud.valor_unitario,
    centro_costo: solicitud.centro_costo,
    subarea: solicitud.subarea,
    indicador_iva: solicitud.indicador_iva ?? validacion.derivados.indicador_iva,
  };
}

/**
 * Construye la orden de compra de SAP a partir de un paquete validado (HU-3).
 * @param paquete - paquete normalizado
 * @param validacion - resultado de las reglas de control
 * @param evidenciaSha256 - hash de la evidencia de aprobación
 * @returns orden válida contra el esquema del PRD y su trazabilidad, o NO_APTA
 */
export function construirOrden(
  paquete: Paquete,
  validacion: Validacion,
  evidenciaSha256: string,
): Resultado<OrdenConTrazabilidad> {
  const { solicitud, correo, aprobacion, cotizacion } = paquete;
  const { proveedor } = validacion.derivados;
  if (!validacion.apta || proveedor === undefined || aprobacion === null) {
    return fallo("NO_APTA", "La solicitud tiene bloqueos y no puede convertirse en OC.");
  }
  const extraida = cotizacion ? extraerCotizacion(cotizacion.texto) : null;
  const orden = EsquemaOrdenCompra.parse({
    referencia: {
      solicitud_id: solicitud.solicitud_id,
      correo_id: correo.id,
      cotizacion_ref: extraida?.ok ? extraida.data.referencia : null,
    },
    sociedad: SOCIEDAD,
    organizacion_compras: ORGANIZACION_COMPRAS,
    proveedor,
    moneda: solicitud.moneda,
    condiciones_pago: solicitud.condiciones_pago ?? validacion.derivados.condiciones_pago,
    aprobador: {
      email: aprobacion.de,
      fecha_aprobacion: aprobacion.fecha,
      evidencia_sha256: evidenciaSha256,
    },
    posiciones: [posicion(paquete, validacion)],
    excepciones: excepciones(validacion),
  });
  return exito({ orden, trazabilidad: trazar(paquete, validacion) });
}

/**
 * Escribe `out/<caso>/trazabilidad.json`.
 * @param raiz - raíz del proyecto
 * @param caso - nombre de la carpeta del caso
 * @param datos - orden y trazabilidad
 * @returns ruta relativa a la raíz del proyecto
 */
export function guardarTrazabilidad(
  raiz: string,
  caso: string,
  datos: OrdenConTrazabilidad,
): string {
  const relativa = rutaSalidaRelativa(caso, ARCHIVOS_SALIDA.trazabilidad);
  mkdirSync(rutaSalida(raiz, caso), { recursive: true });
  writeFileSync(path.join(raiz, relativa), `${JSON.stringify(datos, null, 2)}\n`);
  return relativa;
}
