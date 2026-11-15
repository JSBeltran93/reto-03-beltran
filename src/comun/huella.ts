import { createHash } from "node:crypto";

function canonizar(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(canonizar);
  if (valor !== null && typeof valor === "object") {
    const entradas = Object.entries(valor as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return Object.fromEntries(entradas.map(([k, v]) => [k, canonizar(v)]));
  }
  return valor;
}

/**
 * Serializa un valor como JSON con claves ordenadas: objetos iguales producen el mismo texto.
 * @param valor - cualquier valor compatible con JSON
 * @returns JSON canónico
 */
export function jsonCanonico(valor: unknown): string {
  return JSON.stringify(canonizar(valor));
}

/**
 * Calcula el SHA-256 de un texto.
 * @param texto - texto UTF-8
 * @returns digest hexadecimal en minúsculas
 */
export function sha256(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

/**
 * Huella independiente del orden de las claves (detecta payloads alterados).
 * @param valor - cualquier valor compatible con JSON
 * @returns SHA-256 de su JSON canónico
 */
export function huella(valor: unknown): string {
  return sha256(jsonCanonico(valor));
}
