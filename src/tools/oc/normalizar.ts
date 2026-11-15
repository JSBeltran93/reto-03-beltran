/**
 * Quita tildes y diacríticos para comparar sin importar acentos.
 * @param texto - cualquier texto
 * @returns el texto sin acentos ("á" → "a", "ñ" → "n")
 */
export function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

const SUFIJO_SOCIETARIO = /(sas|ltda|sa)$/;

/**
 * Normaliza la razón social para comparar: minúsculas, sin tildes, sin
 * puntuación ni espacios y sin sufijo societario (S.A.S., Ltda., S.A.).
 * @param nombre - razón social tal como aparece en un documento
 * @returns clave comparable, p. ej. "TecnoSuministros S.A.S." → "tecnosuministros"
 */
export function normalizarNombre(nombre: string): string {
  const compacto = sinTildes(nombre)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return compacto.replace(SUFIJO_SOCIETARIO, "");
}

/**
 * Fecha calendario de una fecha o fecha-hora ISO, en su propia zona horaria.
 * @param iso - "2026-08-21" o "2026-08-21T10:02:00-05:00"
 * @returns la parte YYYY-MM-DD
 */
export function fechaCalendario(iso: string): string {
  return iso.slice(0, 10);
}

/** La palabra "aprobado" completa (no "desaprobado"). */
const PALABRA_APROBADO = /\baprobado\b/;

/**
 * "no" seguido de hasta tres palabras de la misma frase y "aprobado": "no aprobado",
 * "no está aprobado", "aún no ha sido aprobado". La puntuación corta la negación, así
 * "No tengo objeciones. Aprobado." sí es una aprobación.
 */
const NEGACION_APROBADO = /\bno\s+(?:[^\s.,;:!?]+\s+){0,3}aprobado\b/;

/**
 * Detecta una aprobación explícita en el cuerpo de un correo.
 * @param texto - cuerpo del correo
 * @returns true si contiene la palabra "aprobado" y no está negada
 */
export function contieneAprobado(texto: string): boolean {
  const limpio = sinTildes(texto).toLowerCase();
  return PALABRA_APROBADO.test(limpio) && !NEGACION_APROBADO.test(limpio);
}
