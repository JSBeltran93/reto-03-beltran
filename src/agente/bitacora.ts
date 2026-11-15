import { appendFileSync, mkdirSync } from "node:fs";

import type { VistaLlamada } from "../comun/contratos-api";
import { ARCHIVOS_SALIDA, rutaSalida } from "../comun/rutas";

/** Llamada a herramienta auditada. */
export interface EntradaBitacora {
  readonly sessionId: string;
  readonly llamada: VistaLlamada;
  readonly duracionMs: number;
  readonly ts: string;
}

/**
 * Agrega una línea JSON por llamada a `out/log.jsonl` (CA4). Nunca registra secretos.
 * @param raiz - raíz del proyecto
 * @param entrada - llamada auditada
 */
export function registrarLlamada(raiz: string, entrada: EntradaBitacora): void {
  const archivo = rutaSalida(raiz, ARCHIVOS_SALIDA.bitacora);
  mkdirSync(rutaSalida(raiz), { recursive: true });
  const { nombre, args, ok, resumen } = entrada.llamada;
  const linea = {
    ts: entrada.ts,
    sessionId: entrada.sessionId,
    herramienta: nombre,
    args,
    ok,
    resumen,
    duracion_ms: entrada.duracionMs,
  };
  appendFileSync(archivo, `${JSON.stringify(linea)}\n`);
}
