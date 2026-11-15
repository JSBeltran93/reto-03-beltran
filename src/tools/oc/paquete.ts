import { existsSync } from "node:fs";
import path from "node:path";

import { exito, fallo, type Resultado } from "../../comun/resultado";
import { ARCHIVOS_CASO } from "../../comun/rutas";
import {
  EsquemaAprobacionArchivo,
  EsquemaCorreoArchivo,
  EsquemaSolicitud,
  type Paquete,
} from "./esquemas";
import { extraerCotizacion, extraerFactura } from "./extractores";
import { leerJson, leerTextoOpcional, resolverCaso } from "./insumos";
import { contieneAprobado } from "./normalizar";

/** Nombre original del adjunto → archivo normalizado del fixture (ver `nota_fixture`). */
const ADJUNTOS_NORMALIZADOS: Readonly<Record<string, string>> = {
  "solicitud.xlsx": ARCHIVOS_CASO.solicitud,
  "cotizacion.pdf": ARCHIVOS_CASO.cotizacion,
  "aprobacion.eml": ARCHIVOS_CASO.aprobacion,
  "factura.pdf": ARCHIVOS_CASO.factura,
};

/** Adjuntos que todo paquete debe traer; la factura solo se espera si se declara. */
const ADJUNTOS_ESPERADOS = ["solicitud.xlsx", "cotizacion.pdf", "aprobacion.eml"] as const;

function calcularFaltantes(carpeta: string, declarados: readonly string[]): string[] {
  const esperados = new Set<string>([...ADJUNTOS_ESPERADOS, ...declarados]);
  return [...esperados].filter((original) => {
    const normalizado = ADJUNTOS_NORMALIZADOS[original];
    return normalizado !== undefined && !existsSync(path.join(carpeta, normalizado));
  });
}

function leerCotizacion(carpeta: string): Resultado<Paquete["cotizacion"]> {
  const texto = leerTextoOpcional(path.join(carpeta, ARCHIVOS_CASO.cotizacion));
  if (texto === null) return exito(null);
  const cotizacion = extraerCotizacion(texto);
  if (!cotizacion.ok) return cotizacion;
  const { proveedor, nit, total, moneda, validez_hasta } = cotizacion.data;
  return exito({ proveedor, nit, total, moneda, validez_hasta, texto });
}

function leerAprobacion(carpeta: string): Resultado<Paquete["aprobacion"]> {
  const archivo = path.join(carpeta, ARCHIVOS_CASO.aprobacion);
  if (!existsSync(archivo)) return exito(null);
  const aprobacion = leerJson(archivo, EsquemaAprobacionArchivo);
  if (!aprobacion.ok) return aprobacion;
  const { de, fecha, cuerpo } = aprobacion.data;
  return exito({ de, fecha, aprobado: contieneAprobado(cuerpo), texto: cuerpo });
}

function leerFactura(carpeta: string): Resultado<Paquete["factura"]> {
  const texto = leerTextoOpcional(path.join(carpeta, ARCHIVOS_CASO.factura));
  return texto === null ? exito(null) : extraerFactura(texto);
}

/**
 * Lee la carpeta de un caso y arma el paquete normalizado (PRD §7.2, HU-1).
 * Los adjuntos ausentes quedan en `null` y se listan en `faltantes`;
 * un archivo mal formado devuelve un error legible en lugar de lanzar.
 * @param raiz - raíz del proyecto
 * @param caso - nombre de la carpeta del caso
 * @returns el paquete normalizado o un error de dominio
 */
export function leerPaquete(raiz: string, caso: string): Resultado<Paquete> {
  const carpeta = resolverCaso(raiz, caso);
  if (!carpeta.ok) return carpeta;
  const archivoCorreo = path.join(carpeta.data, ARCHIVOS_CASO.correo);
  const archivoSolicitud = path.join(carpeta.data, ARCHIVOS_CASO.solicitud);
  if (!existsSync(archivoCorreo) || !existsSync(archivoSolicitud)) {
    return fallo(
      "PAQUETE_INCOMPLETO",
      `El caso ${caso} no tiene correo o solicitud.`,
      "Pida al solicitante reenviar el correo con la solicitud de compra adjunta.",
    );
  }
  const correo = leerJson(archivoCorreo, EsquemaCorreoArchivo);
  if (!correo.ok) return correo;
  const solicitud = leerJson(archivoSolicitud, EsquemaSolicitud);
  if (!solicitud.ok) return solicitud;
  const cotizacion = leerCotizacion(carpeta.data);
  if (!cotizacion.ok) return cotizacion;
  const aprobacion = leerAprobacion(carpeta.data);
  if (!aprobacion.ok) return aprobacion;
  const factura = leerFactura(carpeta.data);
  if (!factura.ok) return factura;
  const { id, de, asunto, fecha, adjuntos } = correo.data;
  return exito({
    correo: { id, de, asunto, fecha },
    solicitud: solicitud.data,
    cotizacion: cotizacion.data,
    aprobacion: aprobacion.data,
    factura: factura.data,
    faltantes: calcularFaltantes(carpeta.data, adjuntos),
  });
}
