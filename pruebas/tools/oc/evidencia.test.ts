import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { generarEvidencia, huellaEvidenciaCaso } from "../../../src/tools/oc/evidencia";
import { crearProyectoTemporal } from "../../apoyo/proyecto";

describe("evidencia de aprobación", () => {
  it("escribe encabezados, cuerpo y un sha256 estable que comparte el payload", async () => {
    const raiz = crearProyectoTemporal();

    const resultado = await generarEvidencia(raiz, "sol-001");

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    const texto = readFileSync(path.join(raiz, resultado.data.ruta), "utf8");
    expect(texto).toContain("De: mlopez@periferia-ficticia.com");
    expect(texto).toContain("Asunto: RE: Solicitud de orden de compra SOL-001");
    expect(texto).toContain(`sha256: ${resultado.data.sha256}`);
    expect(huellaEvidenciaCaso(raiz, "sol-001")).toEqual({ ok: true, data: resultado.data.sha256 });
    expect(existsSync(path.join(raiz, resultado.data.ruta_pdf))).toBe(true);
  });
});
