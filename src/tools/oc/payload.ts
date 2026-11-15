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

/** Fuentes permitidas por el PRD (HU-3) para trazar cada valor del payload. */
const FUENTES = {
  solicitud: "solicitud",
  cotizacion: "cotizacion",
  maestroProveedores: "maestro.proveedores",
  derivado: "derivado",
} as const;

function trazarCabecera(paquete: Paquete, validacion: Validacion): Trazabilidad {
  const { solicitud } = paquete;
  const conCotizacion = paquete.cotizacion !== null;
  return {
    "referencia.solicitud_id": { fuente: FUENTES.solicitud },
    "referencia.correo_id": { fuente: FUENTES.solicitud, detalle: "correo de la solicitud" },
    "referencia.cotizacion_ref": conCotizacion
      ? { fuente: FUENTES.cotizacion }
      : { fuente: FUENTES.derivado, detalle: "sin cotización: null" },
    sociedad: { fuente: FUENTES.derivado, detalle: "constante de la sociedad" },
    organizacion_compras: { fuente: FUENTES.derivado, detalle: "constante de la organización" },
    proveedor: {
      fuente: FUENTES.maestroProveedores,
      detalle: validacion.derivados.proveedor?.nit ?? "",
    },
    moneda: { fuente: FUENTES.solicitud },
    condiciones_pago:
      solicitud.condiciones_pago === undefined
        ? { fuente: FUENTES.maestroProveedores }
        : { fuente: FUENTES.solicitud },
    "aprobador.email": { fuente: FUENTES.solicitud, detalle: "aprobación adjunta" },
    "aprobador.fecha_aprobacion": { fuente: FUENTES.solicitud, detalle: "aprobación adjunta" },
    "aprobador.evidencia_sha256": { fuente: FUENTES.derivado, detalle: "sha256 de la evidencia" },
    excepciones: { fuente: FUENTES.derivado, detalle: "confirmaciones de las reglas de control" },
  };
}

function trazarPosicion(paquete: Paquete): Trazabilidad {
  const { solicitud } = paquete;
  return {
    "posiciones[0].numero": { fuente: FUENTES.derivado, detalle: "primera posición de SAP" },
    "posiciones[0].descripcion": { fuente: FUENTES.solicitud, detalle: solicitud.descripcion },
    "posiciones[0].cantidad": { fuente: FUENTES.solicitud },
    "posiciones[0].unidad": { fuente: FUENTES.derivado, detalle: "inferida de la descripción" },
    "posiciones[0].precio_unitario": { fuente: FUENTES.solicitud, detalle: "valor_unitario" },
    "posiciones[0].centro_costo": { fuente: FUENTES.solicitud },
    "posiciones[0].subarea": { fuente: FUENTES.solicitud },
    "posiciones[0].indicador_iva":
      solicitud.indicador_iva === undefined
        ? { fuente: FUENTES.maestroProveedores }
        : { fuente: FUENTES.solicitud },
  };
}

function trazar(paquete: Paquete, validacion: Validacion): Trazabilidad {
  return { ...trazarCabecera(paquete, validacion), ...trazarPosicion(paquete) };
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
  const validada = EsquemaOrdenCompra.safeParse({
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
  if (!validada.success) {
    return fallo("ERROR_INTERNO", "La orden construida no cumple el esquema de SAP.");
  }
  return exito({ orden: validada.data, trazabilidad: trazar(paquete, validacion) });
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
