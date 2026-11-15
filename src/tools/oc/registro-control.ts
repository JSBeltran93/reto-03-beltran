import { appendFileSync, existsSync, mkdirSync } from "node:fs";

import { ARCHIVOS_SALIDA, rutaSalida } from "../../comun/rutas";

/** Resultados posibles de un intento de OC, tal como se escriben en el registro de control. */
export const RESULTADOS_CONTROL = {
  creada: "creada",
  idempotente: "idempotente",
  pendiente: "pendiente",
  bloqueada: "bloqueada",
} as const;

/** Resultado de un intento de OC. */
export type ResultadoControl = (typeof RESULTADOS_CONTROL)[keyof typeof RESULTADOS_CONTROL];

/** Fila de `out/control.csv`; el orden de columnas lo fija el PRD (HU-5). */
export interface FilaControl {
  readonly solicitud_id: string;
  readonly resultado: ResultadoControl;
  readonly numero_oc: string | null;
  readonly retroactiva: boolean;
  readonly bloqueos: readonly string[];
  readonly confirmaciones: readonly string[];
  readonly ts: string;
}

const ENCABEZADO = "solicitud_id,resultado,numero_oc,retroactiva,bloqueos,confirmaciones,ts";

function celda(valor: string): string {
  return /[",\n]/.test(valor) ? `"${valor.replace(/"/g, '""')}"` : valor;
}

/**
 * Serializa una fila de control como CSV; las listas de reglas se unen con ";".
 * @param fila - fila de control
 * @returns una línea CSV sin salto de línea
 */
export function filaCsv(fila: FilaControl): string {
  return [
    fila.solicitud_id,
    fila.resultado,
    fila.numero_oc ?? "",
    String(fila.retroactiva),
    fila.bloqueos.join(";"),
    fila.confirmaciones.join(";"),
    fila.ts,
  ]
    .map(celda)
    .join(",");
}

/**
 * Agrega una fila a `<raiz>/out/control.csv`; escribe el encabezado la primera vez.
 * @param raiz - raíz del proyecto
 * @param fila - fila a agregar
 */
export function registrarControl(raiz: string, fila: FilaControl): void {
  const archivo = rutaSalida(raiz, ARCHIVOS_SALIDA.control);
  mkdirSync(rutaSalida(raiz), { recursive: true });
  if (!existsSync(archivo)) appendFileSync(archivo, `${ENCABEZADO}\n`);
  appendFileSync(archivo, `${filaCsv(fila)}\n`);
}
