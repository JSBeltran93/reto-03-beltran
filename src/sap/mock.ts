import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

import { z } from "zod";

import { type Reloj, relojSistema } from "../comun/reloj";
import { ARCHIVOS_SALIDA, rutaSalida } from "../comun/rutas";
import { BASE_NUMERO_OC } from "../tools/oc/constantes";
import type { OrdenCompra } from "../tools/oc/esquemas";
import { normalizarNit } from "../tools/oc/extractores";
import { leerMaestros } from "../tools/oc/insumos";
import type { OrdenRegistrada, ProveedorSap, SapAdapter } from "./adapter";

const EsquemaOrdenGuardada = z.object({
  numero_oc: z.string(),
  fecha: z.string(),
  orden: z.object({ referencia: z.object({ solicitud_id: z.string() }) }).loose(),
});
type OrdenGuardada = z.infer<typeof EsquemaOrdenGuardada>;

/** Serializa las escrituras entre instancias: dos sesiones simultáneas nunca reciben el mismo número. */
let colaEscritura: Promise<unknown> = Promise.resolve();

/** SAP simulado sobre archivos: numera desde 4500000001 y escribe en `out/sap/ordenes.jsonl` (HU-5). */
export class SapSimulado implements SapAdapter {
  private readonly archivo: string;

  /**
   * @param raiz - raíz del proyecto (las órdenes se guardan en `out/sap/`)
   * @param reloj - fuente de la fecha de creación
   */
  constructor(
    private readonly raiz: string,
    private readonly reloj: Reloj = relojSistema,
  ) {
    this.archivo = rutaSalida(raiz, ARCHIVOS_SALIDA.ordenesSap);
  }

  /** @inheritdoc */
  consultarProveedor(nit: string): Promise<ProveedorSap | null> {
    const maestros = leerMaestros(this.raiz);
    const proveedor = maestros.ok
      ? maestros.data.proveedores.find((p) => normalizarNit(p.nit) === normalizarNit(nit))
      : undefined;
    return Promise.resolve(
      proveedor ? { codigo_sap: proveedor.codigo_sap, activo: proveedor.activo } : null,
    );
  }

  /**
   * Crea la orden dentro de la cola de escritura.
   * @param orden - payload validado
   * @returns número y fecha; `existente` es true si la solicitud ya tenía una orden
   */
  crearOrden(orden: OrdenCompra): Promise<OrdenRegistrada & { existente: boolean }> {
    const tarea = colaEscritura.then(() => this.guardar(orden));
    colaEscritura = tarea.catch(() => undefined);
    return tarea;
  }

  /**
   * Busca la orden creada para una solicitud; también devuelve su fecha de creación.
   * @param solicitud_id - identificador de la solicitud
   * @returns número y fecha, o null
   */
  buscarOrdenPorReferencia(solicitud_id: string): Promise<OrdenRegistrada | null> {
    const encontrada = this.leerTodas().find(
      (o) => o.orden.referencia.solicitud_id === solicitud_id,
    );
    return Promise.resolve(
      encontrada ? { numero_oc: encontrada.numero_oc, fecha: encontrada.fecha } : null,
    );
  }

  /**
   * Guarda la orden dentro de la cola de escritura. Si ya existe una orden para la misma
   * solicitud la devuelve sin crear otra: la idempotencia no depende del llamador.
   */
  private guardar(orden: OrdenCompra): OrdenRegistrada & { existente: boolean } {
    const existente = this.leerTodas().find(
      (o) => o.orden.referencia.solicitud_id === orden.referencia.solicitud_id,
    );
    if (existente) {
      return { numero_oc: existente.numero_oc, fecha: existente.fecha, existente: true };
    }
    const numero_oc = String(BASE_NUMERO_OC + this.leerTodas().length + 1);
    const fecha = this.reloj.ahora().toISOString();
    mkdirSync(dirname(this.archivo), { recursive: true });
    appendFileSync(this.archivo, `${JSON.stringify({ numero_oc, fecha, orden })}\n`);
    return { numero_oc, fecha, existente: false };
  }

  private leerTodas(): OrdenGuardada[] {
    if (!existsSync(this.archivo)) return [];
    return readFileSync(this.archivo, "utf8")
      .split("\n")
      .filter((linea) => linea.trim() !== "")
      .map((linea) => EsquemaOrdenGuardada.parse(JSON.parse(linea)));
  }
}
