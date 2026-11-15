import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { sha256 } from "../../comun/huella";
import { exito, fallo, type Resultado } from "../../comun/resultado";
import { ARCHIVOS_CASO, ARCHIVOS_SALIDA, rutaSalida, rutaSalidaRelativa } from "../../comun/rutas";
import { type AprobacionArchivo, EsquemaAprobacionArchivo } from "./esquemas";
import { leerJson, resolverCaso } from "./fixtures";
import { escribirPdf } from "./pdf";

/** Salida de `oc_generar_evidencia`: `ruta` y `sha256` del PRD más la ruta del PDF. */
export interface Evidencia {
  readonly ruta: string;
  readonly sha256: string;
  readonly ruta_pdf: string;
}

/**
 * Texto de la evidencia: encabezados (de, para, fecha, asunto) y cuerpo del correo de aprobación.
 * @param aprobacion - correo de aprobación
 * @returns texto cuyo SHA-256 es la huella de la evidencia
 */
export function textoEvidencia(aprobacion: AprobacionArchivo): string {
  return [
    "EVIDENCIA DE APROBACIÓN DE ORDEN DE COMPRA",
    `De: ${aprobacion.de}`,
    `Para: ${aprobacion.para}`,
    `Fecha: ${aprobacion.fecha}`,
    `Asunto: ${aprobacion.asunto}`,
    "",
    aprobacion.cuerpo,
  ].join("\n");
}

/**
 * Lee el correo de aprobación de un caso.
 * @param raiz - raíz del proyecto
 * @param caso - nombre de la carpeta del caso
 * @returns el correo, o PAQUETE_INCOMPLETO si falta o es inválido
 */
export function leerAprobacionCaso(raiz: string, caso: string): Resultado<AprobacionArchivo> {
  const carpeta = resolverCaso(raiz, caso);
  if (!carpeta.ok) return carpeta;
  const aprobacion = leerJson(
    path.join(carpeta.data, ARCHIVOS_CASO.aprobacion),
    EsquemaAprobacionArchivo,
  );
  if (aprobacion.ok) return aprobacion;
  return fallo(
    "PAQUETE_INCOMPLETO",
    `El caso ${caso} no tiene un correo de aprobación válido.`,
    "Pedir al solicitante el correo de aprobación de su líder.",
  );
}

/**
 * SHA-256 de la evidencia de un caso; lo comparten el payload y el archivo de
 * evidencia, así el payload nunca queda sin hash aunque se construya primero.
 * @param raiz - raíz del proyecto
 * @param caso - nombre de la carpeta del caso
 * @returns digest hexadecimal o un error de dominio
 */
export function hashEvidenciaCaso(raiz: string, caso: string): Resultado<string> {
  const aprobacion = leerAprobacionCaso(raiz, caso);
  return aprobacion.ok ? exito(sha256(textoEvidencia(aprobacion.data))) : aprobacion;
}

/**
 * Escribe `out/<caso>/aprobacion.txt` (P0, con su sha256) y `aprobacion.pdf` (P1).
 * @param raiz - raíz del proyecto
 * @param caso - nombre de la carpeta del caso
 * @returns rutas relativas a la raíz del proyecto y el hash
 */
export async function generarEvidencia(raiz: string, caso: string): Promise<Resultado<Evidencia>> {
  const aprobacion = leerAprobacionCaso(raiz, caso);
  if (!aprobacion.ok) return aprobacion;
  const contenido = textoEvidencia(aprobacion.data);
  const hash = sha256(contenido);
  const conHash = `${contenido}\n\n---\nsha256: ${hash}\n`;
  const carpeta = rutaSalida(raiz, caso);
  mkdirSync(carpeta, { recursive: true });
  writeFileSync(path.join(carpeta, ARCHIVOS_SALIDA.evidenciaTexto), conHash);
  await escribirPdf(path.join(carpeta, ARCHIVOS_SALIDA.evidenciaPdf), conHash);
  return exito({
    ruta: rutaSalidaRelativa(caso, ARCHIVOS_SALIDA.evidenciaTexto),
    sha256: hash,
    ruta_pdf: rutaSalidaRelativa(caso, ARCHIVOS_SALIDA.evidenciaPdf),
  });
}
