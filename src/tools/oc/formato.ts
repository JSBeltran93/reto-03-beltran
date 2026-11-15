const formatoPesos = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

/**
 * Formatea un monto con separadores de miles colombianos.
 * @param valor - monto numérico
 * @returns p. ej. "11.400.000"
 */
export function formatearMonto(valor: number): string {
  return formatoPesos.format(valor);
}
