/** Largo máximo de un texto dentro del resumen de argumentos (el resto se corta con "…"). */
export const LARGO_MAXIMO_TEXTO = 40;
/** Claves de un objeto que se nombran antes de resumir el resto como "+N". */
export const CLAVES_VISIBLES = 3;

const PUNTOS = "…";

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function recortar(texto: string): string {
  return texto.length > LARGO_MAXIMO_TEXTO
    ? `${texto.slice(0, LARGO_MAXIMO_TEXTO)}${PUNTOS}`
    : texto;
}

function resumirObjeto(objeto: Record<string, unknown>): string {
  const claves = Object.keys(objeto);
  if (claves.length === 0) return "{}";
  const visibles = claves.slice(0, CLAVES_VISIBLES).join(", ");
  const resto = claves.length - CLAVES_VISIBLES;
  return resto > 0 ? `{${visibles}, +${resto}}` : `{${visibles}}`;
}

/**
 * Valor de un argumento en una línea: textos entre comillas (recortados), números y
 * booleanos tal cual, listas con su tamaño y objetos con sus primeras claves.
 * @param valor - valor del argumento
 * @returns el valor resumido (p. ej. `"sol-004"`, `{correo, solicitud, cotizacion, +3}`)
 */
export function resumirValor(valor: unknown): string {
  if (typeof valor === "string") return `"${recortar(valor)}"`;
  if (Array.isArray(valor))
    return `[${valor.length} ${valor.length === 1 ? "elemento" : "elementos"}]`;
  if (esObjeto(valor)) return resumirObjeto(valor);
  return recortar(String(valor));
}

/**
 * Argumentos de una llamada a herramienta, compactos para mostrarlos siempre en el chat
 * (PRD §6.1): un `clave: valor` por argumento. Los objetos grandes (`paquete`, `payload`)
 * se resumen con sus claves; el JSON completo queda en el detalle.
 * @param args - argumentos de la llamada
 * @returns las partes `clave: valor` (vacío si no hay argumentos)
 */
export function resumirArgumentos(args: unknown): string[] {
  if (args === undefined || args === null) return [];
  if (!esObjeto(args)) return [resumirValor(args)];
  return Object.entries(args).map(([clave, valor]) => `${clave}: ${resumirValor(valor)}`);
}
