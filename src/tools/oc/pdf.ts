import { writeFileSync } from "node:fs";

import { PDFDocument, type PDFFont, type PDFPage, StandardFonts } from "pdf-lib";

/** Diseño de la página de evidencia (puntos PDF). */
export const DISENO_PDF = {
  margen: 50,
  tamanoFuente: 10,
  altoLinea: 16,
  maxCaracteresLinea: 95,
} as const;

/** Caracteres fuera de Latin-1 que la fuente estándar (WinAnsi) sí puede dibujar. */
const EXTRAS_WINANSI = new Set(["–", "—", "‘", "’", "“", "”", "•", "…", "€"]);

/** Último punto de código de Latin-1, todo lo anterior es codificable en WinAnsi. */
const MAX_LATIN1 = 0xff;

/** Reemplazo de los caracteres que la fuente no puede dibujar (emojis, flechas, etc.). */
const REEMPLAZO = "?";

/**
 * Deja el texto dibujable con la fuente estándar: quita retornos de carro y reemplaza los
 * caracteres no codificables en WinAnsi.
 * @param texto - texto original
 * @returns texto seguro para pdf-lib con Helvetica
 */
export function normalizarTextoPdf(texto: string): string {
  return Array.from(texto.replace(/\r/g, ""))
    .map((c) =>
      c === "\n" || (c.codePointAt(0) ?? 0) <= MAX_LATIN1 || EXTRAS_WINANSI.has(c) ? c : REEMPLAZO,
    )
    .join("")
    .replace(/\t/g, " ");
}

/**
 * Parte una línea larga en varias, cortando en espacios cuando es posible.
 * @param linea - línea original
 * @param maximo - caracteres máximos por línea
 * @returns líneas que caben en el ancho de la página
 */
export function ajustarLinea(
  linea: string,
  maximo: number = DISENO_PDF.maxCaracteresLinea,
): string[] {
  const partes: string[] = [];
  let resto = linea;
  while (resto.length > maximo) {
    const corte = resto.lastIndexOf(" ", maximo);
    const posicion = corte > 0 ? corte : maximo;
    partes.push(resto.slice(0, posicion));
    resto = resto.slice(posicion).trimStart();
  }
  partes.push(resto);
  return partes;
}

function nuevaPagina(pdf: PDFDocument): { pagina: PDFPage; lineasPorPagina: number } {
  const pagina = pdf.addPage();
  const { height } = pagina.getSize();
  const lineasPorPagina = Math.floor((height - 2 * DISENO_PDF.margen) / DISENO_PDF.altoLinea);
  return { pagina, lineasPorPagina };
}

function dibujar(pagina: PDFPage, fuente: PDFFont, linea: string, indice: number): void {
  const { height } = pagina.getSize();
  pagina.drawText(linea, {
    x: DISENO_PDF.margen,
    y: height - DISENO_PDF.margen - indice * DISENO_PDF.altoLinea,
    size: DISENO_PDF.tamanoFuente,
    font: fuente,
  });
}

/**
 * Escribe un PDF de texto con ajuste de líneas y paginación.
 * @param archivo - ruta absoluta del PDF
 * @param contenido - texto a escribir (se normaliza para la fuente estándar)
 */
export async function escribirPdf(archivo: string, contenido: string): Promise<void> {
  const pdf = await PDFDocument.create();
  const fuente = await pdf.embedFont(StandardFonts.Helvetica);
  const lineas = normalizarTextoPdf(contenido)
    .split("\n")
    .flatMap((l) => ajustarLinea(l));
  let { pagina, lineasPorPagina } = nuevaPagina(pdf);
  let indice = 0;
  for (const linea of lineas) {
    if (indice >= lineasPorPagina) {
      ({ pagina, lineasPorPagina } = nuevaPagina(pdf));
      indice = 0;
    }
    dibujar(pagina, fuente, linea, indice);
    indice += 1;
  }
  writeFileSync(archivo, await pdf.save());
}
