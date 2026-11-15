import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll } from "vitest";

import type { ContextoHerramienta } from "../../src/tools/oc/herramienta";

/** Raíz del repositorio, donde viven los fixtures reales. */
export const RAIZ_PROYECTO = path.resolve(import.meta.dirname, "../..");

/** Raíces temporales creadas por el archivo de pruebas en curso. */
const raicesTemporales: string[] = [];

// Cada archivo de pruebas importa este módulo: al terminar se borran sus raíces temporales.
afterAll(() => {
  for (const raiz of raicesTemporales.splice(0)) rmSync(raiz, { recursive: true, force: true });
});

/**
 * Copia los fixtures a una raíz temporal para que los tests puedan escribir `out/` o dañar archivos.
 * @returns ruta absoluta de la raíz temporal
 */
export function crearProyectoTemporal(): string {
  const raiz = mkdtempSync(path.join(tmpdir(), "reto03-"));
  cpSync(path.join(RAIZ_PROYECTO, "fixtures"), path.join(raiz, "fixtures"), { recursive: true });
  raicesTemporales.push(raiz);
  return raiz;
}

/**
 * @param directory - raíz del proyecto
 * @param sessionId - identificador de sesión
 * @returns contexto de herramienta
 */
export function contexto(directory: string, sessionId = "test"): ContextoHerramienta {
  return { directory, sessionId };
}

/**
 * @param json - texto JSON devuelto por una herramienta
 * @returns el valor interpretado
 */
export function leerJsonTexto(json: string): unknown {
  return JSON.parse(json);
}
