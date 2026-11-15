/** Configuración regional de los números y fechas que ve la analista. */
const REGION = "es-CO";

const formatoNumero = new Intl.NumberFormat(REGION, { maximumFractionDigits: 2 });
/** Formatos de moneda ya creados, por código ISO (crear un Intl.NumberFormat es costoso). */
const formatosMoneda = new Map<string, Intl.NumberFormat>();

const formatoFecha = new Intl.DateTimeFormat(REGION, { dateStyle: "long", timeStyle: "short" });

/**
 * Formatea un número con separadores de miles y decimales de Colombia.
 * @param valor - número a formatear
 * @returns el número formateado (p. ej. "1.234.567,5")
 */
export function formatearNumero(valor: number): string {
  return formatoNumero.format(valor);
}

/**
 * Formatea un valor de un hallazgo: los números con formato regional, el texto tal cual.
 * @param valor - valor del hallazgo
 * @returns el valor listo para mostrar
 */
export function formatearValor(valor: string | number): string {
  return typeof valor === "number" ? formatearNumero(valor) : valor;
}

/**
 * Formatea una fecha ISO con fecha larga y hora corta; si no es una fecha válida, la deja igual.
 * @param iso - fecha en formato ISO 8601
 * @returns la fecha legible (p. ej. "15 de noviembre de 2026, 10:30 a. m.")
 */
export function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? iso : formatoFecha.format(fecha);
}

/**
 * Formatea un monto con su moneda en formato regional (p. ej. "$ 25.000.000" para COP).
 * Si el código de moneda no es válido, muestra el código seguido del número.
 * @param valor - monto
 * @param moneda - código ISO 4217 (COP, USD…)
 * @returns el monto legible
 */
export function formatearMonto(valor: number, moneda: string): string {
  try {
    let formato = formatosMoneda.get(moneda);
    if (!formato) {
      formato = new Intl.NumberFormat(REGION, {
        style: "currency",
        currency: moneda,
        currencyDisplay: "code",
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      });
      formatosMoneda.set(moneda, formato);
    }
    return formato.format(valor);
  } catch {
    return `${moneda} ${formatearNumero(valor)}`;
  }
}
