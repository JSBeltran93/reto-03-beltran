import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { PDFDocument } from "pdf-lib";
import { afterAll, describe, expect, it } from "vitest";

import { ajustarLinea, escribirPdf, normalizarTextoPdf } from "../../../src/tools/oc/pdf";

const carpeta = mkdtempSync(path.join(tmpdir(), "reto03-pdf-"));
afterAll(() => {
  rmSync(carpeta, { recursive: true, force: true });
});

describe("PDF de evidencia", () => {
  it("quita retornos de carro y reemplaza caracteres que la fuente no puede dibujar", () => {
    expect(normalizarTextoPdf("Aprobado ✅\r\nmonto ≥ 25 → ok — ñandú")).toBe(
      "Aprobado ?\nmonto ? 25 ? ok — ñandú",
    );
  });

  it("parte las líneas largas en espacios", () => {
    const partes = ajustarLinea("uno dos tres cuatro", 9);

    expect(partes).toEqual(["uno dos", "tres", "cuatro"]);
  });

  it("escribe varias páginas cuando el texto no cabe en una", async () => {
    const archivo = path.join(carpeta, "largo.pdf");
    const texto = Array.from({ length: 120 }, (_, i) => `Línea ${String(i)} con emoji 🚀`).join(
      "\n",
    );

    await escribirPdf(archivo, texto);

    const pdf = await PDFDocument.load(readFileSync(archivo));
    expect(pdf.getPageCount()).toBeGreaterThan(1);
  });
});
