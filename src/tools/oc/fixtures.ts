import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import type { z } from "zod";

import { exito, fallo, type Resultado } from "../../comun/resultado";
import {
  EsquemaCentroCosto,
  EsquemaCondicionPago,
  EsquemaIndicadorIva,
  EsquemaProveedor,
  type Maestros,
} from "./esquemas";

const RAIZ_FIXTURES = ["fixtures", "reto-03"] as const;
const PATRON_CASO = /^[a-z0-9-]+$/;

/** Campos de la solicitud cuyo error de validación se informa como monto inválido. */
const CAMPOS_MONTO = /cantidad|valor/;

/**
 * Carpeta con los casos de solicitudes de compra.
 * @param raiz - raíz del proyecto
 * @returns ruta absoluta de `fixtures/reto-03/solicitudes`
 */
export function carpetaSolicitudes(raiz: string): string {
  return path.join(raiz, ...RAIZ_FIXTURES, "solicitudes");
}

/**
 * Lista las carpetas de casos disponibles.
 * @param raiz - raíz del proyecto
 * @returns nombres ordenados, p. ej. ["sol-001", …]
 */
export function listarCasos(raiz: string): string[] {
  const carpeta = carpetaSolicitudes(raiz);
  if (!existsSync(carpeta)) return [];
  return readdirSync(carpeta, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort();
}

/**
 * Valida el nombre de un caso contra las carpetas existentes (evita rutas arbitrarias).
 * @param raiz - raíz del proyecto
 * @param caso - nombre de la carpeta pedido por el modelo
 * @returns ruta absoluta del caso, o CASO_INEXISTENTE
 */
export function resolverCaso(raiz: string, caso: string): Resultado<string> {
  const casos = listarCasos(raiz);
  if (!PATRON_CASO.test(caso) || !casos.includes(caso)) {
    return fallo(
      "CASO_INEXISTENTE",
      `El caso "${caso}" no existe.`,
      `Casos disponibles: ${casos.join(", ")}.`,
    );
  }
  return exito(path.join(carpetaSolicitudes(raiz), caso));
}

/**
 * Lee un archivo de texto si existe.
 * @param archivo - ruta absoluta
 * @returns su contenido, o null si no existe
 */
export function leerTextoOpcional(archivo: string): string | null {
  return existsSync(archivo) ? readFileSync(archivo, "utf8") : null;
}

function pedirReenvio(nombre: string): string {
  return `Pida al solicitante reenviar ${nombre} corregido.`;
}

/**
 * Lee y valida un archivo JSON.
 * @param archivo - ruta absoluta
 * @param esquema - esquema zod del contenido
 * @returns datos validados; JSON_INVALIDO si está mal formado, MONTO_INVALIDO si un monto no es numérico
 */
export function leerJson<T>(archivo: string, esquema: z.ZodType<T>): Resultado<T> {
  const nombre = path.basename(archivo);
  let crudo: unknown;
  try {
    crudo = JSON.parse(readFileSync(archivo, "utf8"));
  } catch {
    return fallo(
      "JSON_INVALIDO",
      `El archivo ${nombre} no es un JSON válido.`,
      pedirReenvio(nombre),
    );
  }
  const validado = esquema.safeParse(crudo);
  if (validado.success) return exito(validado.data);
  const campos = validado.error.issues.map((problema) => problema.path.join(".")).join(", ");
  const esMonto = CAMPOS_MONTO.test(campos);
  return fallo(
    esMonto ? "MONTO_INVALIDO" : "JSON_INVALIDO",
    `El archivo ${nombre} tiene campos inválidos: ${campos}.`,
    pedirReenvio(nombre),
  );
}

const cacheMaestros = new Map<string, Maestros>();

function leerMaestro<T>(raiz: string, archivo: string, esquema: z.ZodType<T>): Resultado<T[]> {
  return leerJson(path.join(raiz, ...RAIZ_FIXTURES, "maestros", archivo), esquema.array());
}

/**
 * Carga los cuatro maestros, con caché por raíz de proyecto.
 * @param raiz - raíz del proyecto
 * @returns proveedores, centros de costo, indicadores de IVA y condiciones de pago
 */
export function leerMaestros(raiz: string): Resultado<Maestros> {
  const enCache = cacheMaestros.get(raiz);
  if (enCache) return exito(enCache);
  const proveedores = leerMaestro(raiz, "proveedores.json", EsquemaProveedor);
  const centros = leerMaestro(raiz, "centros-costo.json", EsquemaCentroCosto);
  const iva = leerMaestro(raiz, "indicadores-iva.json", EsquemaIndicadorIva);
  const pago = leerMaestro(raiz, "condiciones-pago.json", EsquemaCondicionPago);
  if (!proveedores.ok) return proveedores;
  if (!centros.ok) return centros;
  if (!iva.ok) return iva;
  if (!pago.ok) return pago;
  const maestros: Maestros = {
    proveedores: proveedores.data,
    centrosCosto: centros.data,
    indicadoresIva: iva.data,
    condicionesPago: pago.data,
  };
  cacheMaestros.set(raiz, maestros);
  return exito(maestros);
}
