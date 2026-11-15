import type { OrdenCompra } from "../tools/oc/esquemas";

/** Orden registrada en SAP: número asignado y fecha de creación. */
export interface OrdenRegistrada {
  readonly numero_oc: string;
  readonly fecha: string;
}

/** Estado de un proveedor en SAP. */
export interface ProveedorSap {
  readonly codigo_sap: string;
  readonly activo: boolean;
}

/**
 * Puerto hacia el sistema de compras de SAP: interfaz literal del PRD §7.4.
 * `mock.ts` la implementa sobre archivos; el adaptador real (OData o BAPI) se diseña en SOLUCION.md §6.
 */
export interface SapAdapter {
  /**
   * Consulta un proveedor por NIT.
   * @param nit - NIT con o sin dígito de verificación
   * @returns código SAP y estado, o null si no existe
   */
  consultarProveedor(nit: string): Promise<ProveedorSap | null>;
  /**
   * Crea una orden de compra.
   * @param orden - payload validado
   * @returns número asignado y fecha de creación
   */
  crearOrden(orden: OrdenCompra): Promise<OrdenRegistrada>;
  /**
   * Busca la orden creada para una solicitud (idempotencia).
   * @param solicitud_id - identificador de la solicitud
   * @returns el número de OC existente, o null
   */
  buscarOrdenPorReferencia(
    solicitud_id: string,
  ): Promise<Pick<OrdenRegistrada, "numero_oc"> | null>;
}
