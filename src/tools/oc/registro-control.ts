import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";

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

/** Caracteres con los que una hoja de cálculo interpreta una celda como fórmula. */
const INICIO_FORMULA = /^[=+\-@\t\r]/;

/** Prefijo que neutraliza una posible fórmula al abrir el CSV en una hoja de cálculo. */
const PREFIJO_TEXTO = "'";

function celda(valor: string): string {
  const seguro = INICIO_FORMULA.test(valor) ? `${PREFIJO_TEXTO}${valor}` : valor;
  return /[",\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
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
 * Celdas de la última fila de una solicitud, sin la columna `solicitud_id`.
 * @param archivo - ruta de control.csv
 * @param solicitudId - identificador de la solicitud
 * @returns las celdas restantes (resultado, numero_oc, …), o null si no hay filas
 */
function ultimaFila(archivo: string, solicitudId: string): string[] | null {
  const prefijo = `${celda(solicitudId)},`;
  const filas = readFileSync(archivo, "utf8").trim().split("\n").slice(1);
  const linea = filas.filter((fila) => fila.startsWith(prefijo)).at(-1);
  return linea === undefined ? null : linea.slice(prefijo.length).split(",");
}

/** Último registro de control de una solicitud, tal como lo lee la bandeja. */
export interface UltimoControl {
  readonly resultado: string;
  readonly numero_oc: string | null;
}

/**
 * Lee el último registro de control de una solicitud; nunca lanza.
 * @param raiz - raíz del proyecto
 * @param solicitudId - identificador de la solicitud
 * @returns resultado y número de OC, o null si no hay registro o no se puede leer
 */
export function ultimoControl(raiz: string, solicitudId: string): UltimoControl | null {
  const archivo = rutaSalida(raiz, ARCHIVOS_SALIDA.control);
  try {
    const celdas = existsSync(archivo) ? ultimaFila(archivo, solicitudId) : null;
    if (!celdas?.[0]) return null;
    const numeroOc = celdas[1];
    return {
      resultado: celdas[0],
      numero_oc: numeroOc === undefined || numeroOc === "" ? null : numeroOc,
    };
  } catch {
    return null;
  }
}

/**
 * Agrega una fila a `<raiz>/out/control.csv` por cada intento de crear la OC (HU-5), sin
 * deduplicar; escribe el encabezado la primera vez.
 * @param raiz - raíz del proyecto
 * @param fila - fila a agregar
 */
export function registrarControl(raiz: string, fila: FilaControl): void {
  const archivo = rutaSalida(raiz, ARCHIVOS_SALIDA.control);
  mkdirSync(rutaSalida(raiz), { recursive: true });
  if (!existsSync(archivo)) appendFileSync(archivo, `${ENCABEZADO}\n`);
  appendFileSync(archivo, `${filaCsv(fila)}\n`);
}
