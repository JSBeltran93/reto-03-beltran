import { type EstadoCaso, ESTADOS_CASO, type ResumenCaso } from "../../comun/contratos-api";
import type { SapAdapter } from "../../sap/adapter";
import { listarCasos } from "./insumos";
import { leerPaquete } from "./paquete";
import { RESULTADOS_CONTROL, type UltimoControl, ultimoControl } from "./registro-control";

/** Estado de la bandeja según el último resultado de control.csv. */
const ESTADO_POR_RESULTADO: Readonly<Record<string, EstadoCaso>> = {
  [RESULTADOS_CONTROL.creada]: ESTADOS_CASO.creada,
  [RESULTADOS_CONTROL.idempotente]: ESTADOS_CASO.creada,
  [RESULTADOS_CONTROL.pendiente]: ESTADOS_CASO.pendiente,
  [RESULTADOS_CONTROL.bloqueada]: ESTADOS_CASO.bloqueada,
};

/**
 * Número de OC en SAP para una solicitud; si SAP falla se trata como "sin orden".
 * @param sap - adaptador SAP
 * @param solicitudId - identificador de la solicitud
 * @returns número de OC, o null
 */
async function ordenEnSap(sap: SapAdapter, solicitudId: string): Promise<string | null> {
  try {
    return (await sap.buscarOrdenPorReferencia(solicitudId))?.numero_oc ?? null;
  } catch {
    return null;
  }
}

/**
 * Estado y número de OC de una solicitud: una orden en SAP gana sobre el registro de control.
 * @param control - último registro de control, o null
 * @param numeroSap - número de OC encontrado en SAP, o null
 * @returns estado de la bandeja y número de OC
 */
export function estadoCaso(
  control: UltimoControl | null,
  numeroSap: string | null,
): Pick<ResumenCaso, "estado" | "numero_oc"> {
  if (numeroSap) return { estado: ESTADOS_CASO.creada, numero_oc: numeroSap };
  const estado = (control && ESTADO_POR_RESULTADO[control.resultado]) ?? ESTADOS_CASO.sinProcesar;
  const numero_oc = estado === ESTADOS_CASO.creada ? (control?.numero_oc ?? null) : null;
  return { estado, numero_oc };
}

/**
 * Resume un caso para la bandeja; null si su paquete no se puede leer.
 * @param raiz - raíz del proyecto
 * @param caso - carpeta del caso
 * @param sap - adaptador SAP
 * @returns el resumen, o null
 */
async function resumirCaso(
  raiz: string,
  caso: string,
  sap: SapAdapter,
): Promise<ResumenCaso | null> {
  const paquete = leerPaquete(raiz, caso);
  if (!paquete.ok) return null;
  const { solicitud_id, descripcion, proveedor_nombre, valor_total, moneda, centro_costo } =
    paquete.data.solicitud;
  const numeroSap = await ordenEnSap(sap, solicitud_id);
  return {
    caso,
    solicitud_id,
    descripcion,
    proveedor: proveedor_nombre,
    valor_total,
    moneda,
    centro_costo,
    ...estadoCaso(ultimoControl(raiz, solicitud_id), numeroSap),
  };
}

/**
 * Lista los casos de la bandeja con su estado (solo lectura). Nunca lanza: los casos con
 * paquete ilegible se omiten, porque no hay datos de negocio que mostrar.
 * @param raiz - raíz del proyecto
 * @param sap - adaptador SAP para saber qué solicitudes ya tienen orden
 * @returns resúmenes ordenados por carpeta
 */
export async function resumirCasos(raiz: string, sap: SapAdapter): Promise<ResumenCaso[]> {
  const resumenes = await Promise.all(listarCasos(raiz).map((c) => resumirCaso(raiz, c, sap)));
  return resumenes.filter((r): r is ResumenCaso => r !== null);
}
