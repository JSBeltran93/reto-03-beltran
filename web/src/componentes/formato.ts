/** Configuración regional de los números y fechas que ve la analista. */
const REGION = "es-CO";

const formatoNumero = new Intl.NumberFormat(REGION, { maximumFractionDigits: 2 });
/** Formatos de moneda ya creados, por código ISO (crear un Intl.NumberFormat es costoso). */
const formatosMoneda = new Map<string, Intl.NumberFormat>();

const formatoFecha = new Intl.DateTimeFormat(REGION, { dateStyle: "long", timeStyle: "short" });
/** Día calendario sin hora; en UTC porque las fechas "AAAA-MM-DD" se leen como medianoche UTC. */
const formatoDia = new Intl.DateTimeFormat(REGION, { dateStyle: "long", timeZone: "UTC" });

/** Fecha sin hora en formato ISO (AAAA-MM-DD). */
const PATRON_DIA = /^\d{4}-\d{2}-\d{2}$/;

/** Moneda con la que se muestran los montos de los hallazgos (el maestro trabaja en pesos). */
const MONEDA_HALLAZGOS = "COP";

/** Claves de los valores de un hallazgo que son montos y se muestran como moneda. */
const CLAVES_MONTO: ReadonlySet<string> = new Set([
  "solicitud",
  "cotizacion",
  "valor_total",
  "tope",
  "calculado",
]);

/** Sufijo de las claves que son porcentajes (p. ej. "diferencia_pct"). */
const SUFIJO_PORCENTAJE = "_pct";

/**
 * Formatea un número con separadores de miles y decimales de Colombia.
 * @param valor - número a formatear
 * @returns el número formateado (p. ej. "1.234.567,5")
 */
export function formatearNumero(valor: number): string {
  return formatoNumero.format(valor);
}

/**
 * Formatea un valor de un hallazgo según su clave: montos como pesos con separador de
 * miles, porcentajes con "%", fechas AAAA-MM-DD como fecha larga y el resto tal cual.
 * @param clave - clave del valor (p. ej. "cotizacion", "diferencia_pct")
 * @param valor - valor del hallazgo
 * @returns el valor listo para mostrar (p. ej. "COP 26.500.000", "6 %")
 */
export function formatearValorHallazgo(clave: string, valor: string | number): string {
  if (typeof valor === "number") {
    if (CLAVES_MONTO.has(clave)) return formatearMonto(valor, MONEDA_HALLAZGOS);
    if (clave.endsWith(SUFIJO_PORCENTAJE)) return `${formatearNumero(valor)} %`;
    return formatearNumero(valor);
  }
  return PATRON_DIA.test(valor) ? formatoDia.format(new Date(valor)) : valor;
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
