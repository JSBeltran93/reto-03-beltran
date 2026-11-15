/** Esquemas zod de los archivos de fixtures y de los contratos del PRD (§7.1, §7.2, §7.4). */
import { z } from "zod";

const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha con formato YYYY-MM-DD");

/** Solicitud de compra (`solicitud.xlsx` normalizado), PRD §7.1. */
export const EsquemaSolicitud = z.object({
  solicitud_id: z.string().min(1),
  solicitante: z.string().min(1),
  proveedor_nombre: z.string().min(1),
  proveedor_nit: z.string().min(1).optional(),
  descripcion: z.string().min(1),
  centro_costo: z.string().min(1),
  subarea: z.string().min(1),
  cantidad: z.number().positive(),
  valor_unitario: z.number().nonnegative(),
  valor_total: z.number().nonnegative(),
  moneda: z.enum(["COP", "USD"]),
  indicador_iva: z.string().min(1).optional(),
  condiciones_pago: z.string().min(1).optional(),
  fecha_solicitud: fechaIso,
});
/** Solicitud de compra, PRD §7.1. */
export type Solicitud = z.infer<typeof EsquemaSolicitud>;

/** Metadatos del correo de entrada (`correo.json`). */
export const EsquemaCorreoArchivo = z.object({
  id: z.string(),
  de: z.string(),
  asunto: z.string(),
  fecha: z.string(),
  cuerpo: z.string(),
  adjuntos: z.array(z.string()),
});

/** Correo de aprobación del líder (`aprobacion.json`). */
export const EsquemaAprobacionArchivo = z.object({
  de: z.string(),
  para: z.string(),
  fecha: z.string(),
  asunto: z.string(),
  cuerpo: z.string(),
});
/** Correo de aprobación tal como llega. */
export type AprobacionArchivo = z.infer<typeof EsquemaAprobacionArchivo>;

/** Paquete normalizado: forma exacta del PRD §7.2 más `faltantes` (HU-1). */
export const EsquemaPaquete = z.object({
  correo: z.object({ id: z.string(), de: z.string(), asunto: z.string(), fecha: z.string() }),
  solicitud: EsquemaSolicitud,
  cotizacion: z
    .object({
      proveedor: z.string(),
      nit: z.string().nullable(),
      total: z.number(),
      moneda: z.string(),
      validez_hasta: z.string().nullable(),
      texto: z.string(),
    })
    .nullable(),
  aprobacion: z
    .object({ de: z.string(), fecha: z.string(), aprobado: z.boolean(), texto: z.string() })
    .nullable(),
  factura: z.object({ numero: z.string(), fecha: z.string(), total: z.number() }).nullable(),
  faltantes: z.array(z.string()),
});
/** Paquete normalizado, PRD §7.2. */
export type Paquete = z.infer<typeof EsquemaPaquete>;

/** Proveedor del maestro (`proveedores.json`). */
export const EsquemaProveedor = z.object({
  codigo_sap: z.string(),
  nit: z.string(),
  nombre: z.string(),
  condiciones_pago_default: z.string(),
  indicador_iva_default: z.string(),
  activo: z.boolean(),
});
/** Proveedor del maestro. */
export type Proveedor = z.infer<typeof EsquemaProveedor>;

/** Centro de costo con subáreas y topes de aprobación (`centros-costo.json`). */
export const EsquemaCentroCosto = z.object({
  centro_costo: z.string(),
  nombre: z.string(),
  subareas: z.array(z.string()),
  aprobadores: z.array(z.object({ email: z.string(), nombre: z.string(), tope: z.number() })),
});
/** Centro de costo del maestro. */
export type CentroCosto = z.infer<typeof EsquemaCentroCosto>;

/** Indicador de IVA (`indicadores-iva.json`). */
export const EsquemaIndicadorIva = z.object({
  codigo: z.string(),
  descripcion: z.string(),
  tasa: z.number(),
});

/** Condición de pago (`condiciones-pago.json`). */
export const EsquemaCondicionPago = z.object({
  codigo: z.string(),
  descripcion: z.string(),
  dias: z.number(),
});

/** Maestros que usan las reglas de control. */
export interface Maestros {
  readonly proveedores: readonly Proveedor[];
  readonly centrosCosto: readonly CentroCosto[];
  readonly indicadoresIva: readonly z.infer<typeof EsquemaIndicadorIva>[];
  readonly condicionesPago: readonly z.infer<typeof EsquemaCondicionPago>[];
}

/** Orden de compra que se envía a SAP: forma exacta del PRD §7.4. */
export const EsquemaOrdenCompra = z.object({
  referencia: z.object({
    solicitud_id: z.string(),
    correo_id: z.string(),
    cotizacion_ref: z.string().nullable(),
  }),
  sociedad: z.literal("1000"),
  organizacion_compras: z.literal("1000"),
  proveedor: z.object({ codigo_sap: z.string(), nit: z.string(), nombre: z.string() }),
  moneda: z.enum(["COP", "USD"]),
  condiciones_pago: z.string(),
  aprobador: z.object({
    email: z.string(),
    fecha_aprobacion: z.string(),
    evidencia_sha256: z.string(),
  }),
  posiciones: z
    .array(
      z.object({
        numero: z.number().int(),
        descripcion: z.string().max(40),
        cantidad: z.number(),
        unidad: z.enum(["UN", "H", "MES"]),
        precio_unitario: z.number(),
        centro_costo: z.string(),
        subarea: z.string(),
        indicador_iva: z.string(),
      }),
    )
    .min(1),
  excepciones: z.array(
    z.object({ codigo: z.string(), detalle: z.string(), confirmado_por: z.string().nullable() }),
  ),
});
/** Orden de compra, PRD §7.4. */
export type OrdenCompra = z.infer<typeof EsquemaOrdenCompra>;
