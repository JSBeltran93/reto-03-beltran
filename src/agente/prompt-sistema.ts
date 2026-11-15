import { readFileSync } from "node:fs";
import path from "node:path";

import { RUTA_CONOCIMIENTO, RUTA_PROMPT } from "../comun/rutas";

/**
 * Arma el system prompt con el comportamiento (`agent/prompt.md`) y el conocimiento
 * del proceso (`src/knowledge/ordenes-compra.md`). Se lee una vez al arrancar.
 * @param raiz - raíz del proyecto
 * @returns el system prompt completo
 */
export function cargarPromptSistema(raiz: string): string {
  const comportamiento = readFileSync(path.join(raiz, RUTA_PROMPT), "utf8");
  const conocimiento = readFileSync(path.join(raiz, RUTA_CONOCIMIENTO), "utf8");
  return `${comportamiento.trim()}\n\n---\n\n# Conocimiento del proceso\n\n${conocimiento.trim()}\n`;
}
