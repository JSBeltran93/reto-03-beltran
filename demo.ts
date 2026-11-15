/**
 * Verificación sin modelo (PRD §6.6): procesa los seis casos de los fixtures
 * llamando directamente a las herramientas, sin LLM ni clave.
 *
 *   npm run demo
 */
import { rmSync } from "node:fs";

import type { Resultado } from "./src/comun/resultado";
import { rutaSalida } from "./src/comun/rutas";
import { construir_payload, crear, generar_evidencia, leer_paquete, validar } from "./src/tools/oc";
import type { OrdenCreada } from "./src/tools/oc/crear-orden";
import type { OrdenCompra, Paquete } from "./src/tools/oc/esquemas";
import type { Hallazgo } from "./src/tools/oc/hallazgos";
import type { ContextoHerramienta } from "./src/tools/oc/herramienta";
import type { Validacion } from "./src/tools/oc/validacion";

const CASOS = ["sol-001", "sol-002", "sol-003", "sol-004", "sol-005", "sol-006"] as const;
const CASOS_CONFIRMADOS = ["sol-004", "sol-005"] as const;
const ANCHO_CASO = 8;
const LARGO_MAXIMO_LINEA = 120;
const ctx: ContextoHerramienta = { directory: process.cwd(), sessionId: "demo" };

/** Casos aptos que quedaron esperando confirmación, con su validación. */
const pendientes = new Map<string, Validacion>();

/** Las herramientas devuelven un `Resultado` serializado (PRD §6.2). */
const interpretar = <T>(json: string): Resultado<T> => JSON.parse(json) as Resultado<T>;
const reglas = (hallazgos: readonly Hallazgo[]): string =>
  hallazgos.length ? hallazgos.map((h) => h.regla).join(", ") : "—";

function imprimirFila(caso: string, v: Validacion, resultado: string): void {
  console.log(
    `${caso.padEnd(ANCHO_CASO)} | apta=${String(v.apta).padEnd(5)} | bloqueos=${reglas(v.bloqueos).padEnd(9)} | ` +
      `confirmaciones=${reglas(v.confirmaciones).padEnd(4)} | retroactiva=${String(v.retroactiva).padEnd(5)} | ${resultado}`,
  );
}

async function intentarCrear(
  caso: string,
  payload: OrdenCompra,
  confirmado: boolean,
): Promise<string> {
  const r = interpretar<OrdenCreada>(await crear.execute({ caso, payload, confirmado }, ctx));
  if (r.ok) return `OC ${r.data.numero_oc}${r.data.idempotente ? " (idempotente)" : ""}`;
  return `${r.error.codigo}: ${r.error.mensaje}`.slice(0, LARGO_MAXIMO_LINEA);
}

async function leerYValidar(caso: string): Promise<[Paquete, Validacion] | null> {
  const paquete = interpretar<Paquete>(await leer_paquete.execute({ caso }, ctx));
  if (!paquete.ok) {
    console.log(`${caso.padEnd(ANCHO_CASO)} | ${paquete.error.codigo}`);
    return null;
  }
  const v = interpretar<Validacion>(await validar.execute({ caso, paquete: paquete.data }, ctx));
  return v.ok ? [paquete.data, v.data] : null;
}

async function procesarCaso(caso: string): Promise<OrdenCompra | null> {
  const leido = await leerYValidar(caso);
  if (!leido) return null;
  const [paquete, v] = leido;
  if (!v.apta) {
    imprimirFila(
      caso,
      v,
      `sin OC → ${v.bloqueos[0]?.accion_sugerida ?? ""}`.slice(0, LARGO_MAXIMO_LINEA),
    );
    return null;
  }
  const payload = interpretar<{ orden: OrdenCompra }>(
    await construir_payload.execute({ caso, paquete, derivados: { ...v.derivados } }, ctx),
  );
  await generar_evidencia.execute({ caso }, ctx);
  if (!payload.ok) return null;
  imprimirFila(caso, v, await intentarCrear(caso, payload.data.orden, false));
  if (v.confirmaciones.length > 0) pendientes.set(caso, v);
  return payload.data.orden;
}

async function principal(): Promise<void> {
  rmSync(rutaSalida(ctx.directory), { recursive: true, force: true });
  console.log("== Pasada 1: los 6 casos sin confirmación ==");
  const ordenes = new Map<string, OrdenCompra>();
  for (const caso of CASOS) {
    const orden = await procesarCaso(caso);
    if (orden) ordenes.set(caso, orden);
  }

  console.log("\n== Idempotencia: sol-001 por segunda vez ==");
  const primera = ordenes.get("sol-001");
  if (primera)
    console.log(
      `${"sol-001".padEnd(ANCHO_CASO)} | ${await intentarCrear("sol-001", primera, false)}`,
    );

  console.log("\n== Confirmación explícita del usuario (confirmado: true) ==");
  for (const caso of CASOS_CONFIRMADOS) {
    const orden = ordenes.get(caso);
    if (orden)
      console.log(`${caso.padEnd(ANCHO_CASO)} | ${await intentarCrear(caso, orden, true)}`);
  }
  for (const [caso, v] of pendientes) {
    if (CASOS_CONFIRMADOS.some((confirmado) => confirmado === caso)) continue;
    const iva = v.derivados.indicador_iva ? ` · IVA derivado ${v.derivados.indicador_iva}` : "";
    console.log(
      `${caso.padEnd(ANCHO_CASO)} | queda pendiente de confirmación: ${reglas(v.confirmaciones)}${iva}`,
    );
  }

  console.log("\nArchivos generados: out/control.csv, out/sap/ordenes.jsonl,");
  console.log("out/<caso>/trazabilidad.json, out/<caso>/aprobacion.txt y aprobacion.pdf");
}

await principal();
