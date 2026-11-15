import { REGLA_RETROACTIVA } from "./constantes";
import type { Maestros, OrdenCompra, Paquete } from "./esquemas";
import type { Hallazgo } from "./hallazgos";
import { buscarCandidatos, type ContextoReglas, proveedorUnico, REGLAS } from "./reglas";

/** Valores completados desde los maestros que el agente debe informar (`derivados`, HU-2). */
export interface Derivados {
  readonly proveedor?: OrdenCompra["proveedor"];
  readonly indicador_iva?: string;
  readonly condiciones_pago?: string;
}

/** Salida de `oc_validar` (PRD §6.2) más los hallazgos informativos. */
export interface Validacion {
  readonly apta: boolean;
  readonly bloqueos: readonly Hallazgo[];
  readonly confirmaciones: readonly Hallazgo[];
  readonly derivados: Derivados;
  readonly retroactiva: boolean;
  /** Hallazgos informativos (valores derivados) que se muestran al usuario. */
  readonly informativos: readonly Hallazgo[];
}

function calcularDerivados(ctx: ContextoReglas): Derivados {
  const proveedor = proveedorUnico(ctx);
  if (proveedor === undefined) return {};
  const { solicitud } = ctx.paquete;
  return {
    proveedor: { codigo_sap: proveedor.codigo_sap, nit: proveedor.nit, nombre: proveedor.nombre },
    ...(solicitud.indicador_iva === undefined && {
      indicador_iva: proveedor.indicador_iva_default,
    }),
    ...(solicitud.condiciones_pago === undefined && {
      condiciones_pago: proveedor.condiciones_pago_default,
    }),
  };
}

/**
 * Aplica todas las reglas de control a un paquete (HU-2).
 * @param paquete - paquete normalizado
 * @param maestros - proveedores, centros de costo, indicadores de IVA y condiciones de pago
 * @returns hallazgos separados por efecto; `apta` es false si alguna regla bloquea
 */
export function validarPaquete(paquete: Paquete, maestros: Maestros): Validacion {
  const ctx: ContextoReglas = {
    paquete,
    maestros,
    candidatos: buscarCandidatos(paquete, maestros),
    centro: maestros.centrosCosto.find((c) => c.centro_costo === paquete.solicitud.centro_costo),
  };
  const hallazgos = REGLAS.flatMap((regla) => regla.evaluar(ctx));
  const bloqueos = hallazgos.filter((h) => h.tipo === "bloqueo");
  return {
    apta: bloqueos.length === 0,
    bloqueos,
    confirmaciones: hallazgos.filter((h) => h.tipo === "confirmacion"),
    derivados: calcularDerivados(ctx),
    retroactiva: hallazgos.some((h) => h.regla === REGLA_RETROACTIVA),
    informativos: hallazgos.filter((h) => h.tipo === "derivado"),
  };
}
