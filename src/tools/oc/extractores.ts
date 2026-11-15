import { exito, fallo, type Resultado } from "../../comun/resultado";

/** Monto con su moneda, extraído de un texto. */
export interface Monto {
  readonly moneda: string;
  readonly valor: number;
}

/** Campos extraídos de `cotizacion.txt`. */
export interface CotizacionExtraida {
  readonly referencia: string | null;
  readonly fecha: string | null;
  readonly proveedor: string;
  readonly nit: string | null;
  readonly total: number;
  readonly moneda: string;
  readonly validez_hasta: string | null;
  readonly texto: string;
}

/** Campos extraídos de `factura.txt`. */
export interface FacturaExtraida {
  readonly numero: string;
  readonly fecha: string;
  readonly total: number;
}

/**
 * Convierte un número escrito con separadores de miles y decimales.
 * @param crudo - "11.400.000", "120,000.00" o "1.234,56"
 * @returns el valor numérico
 */
export function aNumero(crudo: string): number {
  const sinMiles = crudo.trim().replace(/[.,](?=\d{3}(?:[.,]|$))/g, "");
  return Number(sinMiles.replace(",", "."));
}

/**
 * Extrae un monto con su código de moneda.
 * @param texto - p. ej. "COP 11.400.000" o "USD 120,000.00"
 * @returns moneda y valor, o MONTO_INVALIDO
 */
export function extraerMonto(texto: string): Resultado<Monto> {
  const coincidencia = /([A-Z]{3})\s*\$?\s*([\d.,]+)/.exec(texto);
  const crudo = coincidencia?.[2];
  const valor = crudo === undefined || !/\d/.test(crudo) ? Number.NaN : aNumero(crudo);
  if (coincidencia?.[1] === undefined || Number.isNaN(valor)) {
    return fallo("MONTO_INVALIDO", `No se pudo interpretar el monto "${texto.trim()}".`);
  }
  return exito({ moneda: coincidencia[1], valor });
}

/**
 * Normaliza un NIT: solo dígitos y sin dígito de verificación.
 * @param nit - p. ej. "900.555.111-2"
 * @returns p. ej. "900555111"
 */
export function normalizarNit(nit: string): string {
  const [base = ""] = nit.split("-");
  return base.replace(/\D/g, "");
}

/**
 * Suma días calendario a una fecha.
 * @param fecha - YYYY-MM-DD
 * @param dias - días a sumar
 * @returns la fecha resultante YYYY-MM-DD
 */
export function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

function campo(texto: string, patron: RegExp): string | null {
  return patron.exec(texto)?.[1]?.trim() ?? null;
}

function validezHasta(texto: string, fecha: string | null): string | null {
  const dias = campo(texto, /Validez de la oferta:\s*(\d+)\s*d[ií]as/i);
  return fecha === null || dias === null ? null : sumarDias(fecha, Number(dias));
}

/**
 * Extrae los campos de la cotización que usan el paquete y el payload.
 * @param texto - contenido de `cotizacion.txt`
 * @returns cotización extraída, o MONTO_INVALIDO si faltan proveedor o total
 */
export function extraerCotizacion(texto: string): Resultado<CotizacionExtraida> {
  const textoTotal = campo(texto, /^TOTAL[^:\n]*:\s*(.+)$/m);
  const proveedor = campo(texto, /^Proveedor:\s*(.+)$/m);
  if (textoTotal === null || proveedor === null) {
    return fallo("MONTO_INVALIDO", "La cotización no tiene proveedor o total identificables.");
  }
  const monto = extraerMonto(textoTotal);
  if (!monto.ok) return monto;
  const fecha = campo(texto, /^Fecha:\s*(\d{4}-\d{2}-\d{2})/m);
  const nit = campo(texto, /^NIT:\s*([\d.-]+)/m);
  return exito({
    referencia: campo(texto, /COTIZACI[ÓO]N\s+(\S+)/),
    fecha,
    proveedor,
    nit: nit === null ? null : normalizarNit(nit),
    total: monto.data.valor,
    moneda: monto.data.moneda,
    validez_hasta: validezHasta(texto, fecha),
    texto,
  });
}

/**
 * Extrae número, fecha de emisión y total de una factura.
 * @param texto - contenido de `factura.txt`
 * @returns factura extraída, o MONTO_INVALIDO si falta algún campo
 */
export function extraerFactura(texto: string): Resultado<FacturaExtraida> {
  const numero = campo(texto, /No\.\s*(\S+)/);
  const fecha = campo(texto, /Fecha de emisi[óo]n:\s*(\d{4}-\d{2}-\d{2})/);
  const textoTotal = campo(texto, /^TOTAL:\s*(.+)$/m);
  if (numero === null || fecha === null || textoTotal === null) {
    return fallo("MONTO_INVALIDO", "La factura no tiene número, fecha o total identificables.");
  }
  const monto = extraerMonto(textoTotal);
  return monto.ok ? exito({ numero, fecha, total: monto.data.valor }) : monto;
}
