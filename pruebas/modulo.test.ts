import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import * as herramientasModulo from "../modulo/tools/oc";
import * as herramientasAplicacion from "../src/tools/oc";
import { RAIZ_PROYECTO } from "./apoyo/proyecto";

const leer = (relativa: string): string => readFileSync(path.join(RAIZ_PROYECTO, relativa), "utf8");

/** Cuerpo de un Markdown sin su frontmatter. */
const cuerpoSinFrontmatter = (texto: string): string =>
  texto.replace(/^---\n[\s\S]*?\n---\n/, "").trim();

describe("bonus modulo/ (PRD §9.4)", () => {
  it("agent.md usa exactamente el system prompt de la aplicación", () => {
    expect(cuerpoSinFrontmatter(leer("modulo/agent.md"))).toBe(leer("agent/prompt.md").trim());
  });

  it("SKILL.md usa exactamente el conocimiento del proceso de la aplicación", () => {
    expect(cuerpoSinFrontmatter(leer("modulo/skill/ordenes-compra/SKILL.md"))).toBe(
      leer("src/knowledge/ordenes-compra.md").trim(),
    );
  });

  it("tools/oc.ts expone exactamente las seis herramientas del PRD, sin copias", () => {
    const nombres = [
      "construir_payload",
      "crear",
      "generar_evidencia",
      "leer_excel",
      "leer_paquete",
      "validar",
    ];

    expect(Object.keys(herramientasModulo).sort()).toEqual(nombres);
    for (const nombre of nombres) {
      expect(herramientasModulo[nombre as keyof typeof herramientasModulo]).toBe(
        herramientasAplicacion[nombre as keyof typeof herramientasAplicacion],
      );
    }
  });
});
