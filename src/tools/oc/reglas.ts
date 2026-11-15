/**
 * Reglas de control RC1–RC10 (PRD §7.3). Cada regla es un objeto independiente:
 * una regla nueva se agrega a `REGLAS` sin tocar el motor (abierto/cerrado).
 */
import { REGLA_RETROACTIVA, TOLERANCIA_COTIZACION, TOLERANCIA_TOTAL } from "./constantes";
import type { CentroCosto, Maestros, Paquete, Proveedor } from "./esquemas";
import { normalizarNit } from "./extractores";
import { formatearMonto } from "./formato";
import { type Hallazgo, hallazgo, type IdRegla, type TipoHallazgo } from "./hallazgos";
import { fechaCalendario, normalizarNombre } from "./normalizar";

/** Datos que toda regla puede leer. */
export interface ContextoReglas {
  readonly paquete: Paquete;
  readonly maestros: Maestros;
  /** Proveedores que coinciden con la solicitud (por NIT o, sin NIT, por nombre normalizado). */
  readonly candidatos: readonly Proveedor[];
  readonly centro: CentroCosto | undefined;
}

/** Regla de control: identificador, efecto y evaluación. */
export interface Regla {
  readonly id: IdRegla;
  readonly tipo: TipoHallazgo;
  /**
   * Evalúa la regla.
   * @param ctx - paquete y maestros
   * @returns cero o más hallazgos
   */
  evaluar(ctx: ContextoReglas): Hallazgo[];
}

/**
 * Busca los proveedores que coinciden con la solicitud: por NIT si viene, si no por nombre.
 * @param paquete - paquete normalizado
 * @param maestros - maestros
 * @returns proveedores que coinciden (0, 1 o varios)
 */
export function buscarCandidatos(paquete: Paquete, maestros: Maestros): Proveedor[] {
  const { proveedor_nit, proveedor_nombre } = paquete.solicitud;
  if (proveedor_nit !== undefined) {
    const nit = normalizarNit(proveedor_nit);
    return maestros.proveedores.filter((p) => normalizarNit(p.nit) === nit);
  }
  const nombre = normalizarNombre(proveedor_nombre);
  return maestros.proveedores.filter((p) => normalizarNombre(p.nombre) === nombre);
}

/**
 * El único proveedor que coincide.
 * @param ctx - contexto de reglas
 * @returns el proveedor, o undefined si no hay o es ambiguo
 */
export function proveedorUnico(ctx: ContextoReglas): Proveedor | undefined {
  return ctx.candidatos.length === 1 ? ctx.candidatos[0] : undefined;
}

function aprobadorEnCentro(ctx: ContextoReglas): CentroCosto["aprobadores"][number] | undefined {
  const email = ctx.paquete.aprobacion?.de.toLowerCase();
  return ctx.centro?.aprobadores.find((a) => a.email.toLowerCase() === email);
}

const RC1: Regla = {
  id: "RC1",
  tipo: "bloqueo",
  evaluar(ctx) {
    const { proveedor_nit, proveedor_nombre } = ctx.paquete.solicitud;
    const referencia = proveedor_nit ? `NIT ${proveedor_nit}` : `"${proveedor_nombre}"`;
    if (ctx.candidatos.length === 0) {
      return [
        hallazgo("RC1", "bloqueo", `El proveedor ${referencia} no existe en el maestro.`, {
          accion_sugerida:
            "Solicitar la creación del proveedor en SAP (RUT y certificación bancaria) antes de la OC.",
        }),
      ];
    }
    if (ctx.candidatos.length > 1) {
      return [
        hallazgo("RC1", "bloqueo", `El nombre ${referencia} coincide con varios proveedores.`, {
          accion_sugerida: "Pedir al solicitante el NIT del proveedor.",
        }),
      ];
    }
    const proveedor = proveedorUnico(ctx);
    if (proveedor && !proveedor.activo) {
      return [
        hallazgo("RC1", "bloqueo", `El proveedor ${proveedor.nombre} está inactivo.`, {
          accion_sugerida: "Validar con compras su reactivación o elegir un proveedor activo.",
        }),
      ];
    }
    return [];
  },
};

function sugerenciaAprobador(ctx: ContextoReglas, email: string): string {
  const mismoEmail = (a: { email: string }): boolean =>
    a.email.toLowerCase() === email.toLowerCase();
  const otrosCentros = ctx.maestros.centrosCosto
    .filter((c) => c.aprobadores.some(mismoEmail))
    .map((c) => {
      const tope = c.aprobadores.find(mismoEmail)?.tope ?? 0;
      return `${c.centro_costo} ${c.nombre} (tope ${formatearMonto(tope)})`;
    })
    .join(", ");
  const validos = (ctx.centro?.aprobadores ?? [])
    .map((a) => `${a.email} (tope ${formatearMonto(a.tope)})`)
    .join(", ");
  const verificar = otrosCentros
    ? `${email} aprueba en ${otrosCentros}: verificar si el gasto corresponde a ese centro. `
    : "";
  return `${verificar}Para ${ctx.paquete.solicitud.centro_costo} aprueban: ${validos || "nadie registrado"}.`;
}

const RC2: Regla = {
  id: "RC2",
  tipo: "bloqueo",
  evaluar(ctx) {
    const aprobacion = ctx.paquete.aprobacion;
    if (aprobacion === null) {
      return [
        hallazgo("RC2", "bloqueo", "No hay correo de aprobación del líder.", {
          accion_sugerida: "Pedir al solicitante el correo de aprobación de su líder.",
        }),
      ];
    }
    if (!aprobacion.aprobado) {
      return [
        hallazgo("RC2", "bloqueo", 'El correo de aprobación no contiene "Aprobado".', {
          accion_sugerida: "Pedir al líder una aprobación explícita.",
        }),
      ];
    }
    if (aprobadorEnCentro(ctx) === undefined) {
      const centro = ctx.paquete.solicitud.centro_costo;
      return [
        hallazgo(
          "RC2",
          "bloqueo",
          `${aprobacion.de} no es aprobador del centro de costo ${centro}.`,
          {
            accion_sugerida: sugerenciaAprobador(ctx, aprobacion.de),
          },
        ),
      ];
    }
    return [];
  },
};

const RC3: Regla = {
  id: "RC3",
  tipo: "bloqueo",
  evaluar(ctx) {
    const aprobacion = ctx.paquete.aprobacion;
    if (aprobacion === null) return [];
    const { valor_total, centro_costo } = ctx.paquete.solicitud;
    const tope = aprobadorEnCentro(ctx)?.tope ?? 0;
    if (valor_total <= tope) return [];
    const cubren = (ctx.centro?.aprobadores ?? []).filter((a) => a.tope >= valor_total);
    const accion = cubren.length
      ? `Solicitar aprobación de ${cubren.map((a) => a.email).join(" o ")}.`
      : `Ningún aprobador de ${centro_costo} cubre ${formatearMonto(valor_total)}: escalar a la dirección.`;
    return [
      hallazgo(
        "RC3",
        "bloqueo",
        `El valor ${formatearMonto(valor_total)} supera el tope de ${aprobacion.de} en ${centro_costo} (${formatearMonto(tope)}).`,
        { valores: { valor_total, tope }, accion_sugerida: accion },
      ),
    ];
  },
};

const RC4: Regla = {
  id: "RC4",
  tipo: "bloqueo",
  evaluar(ctx) {
    const { centro_costo, subarea } = ctx.paquete.solicitud;
    if (ctx.centro === undefined) {
      return [hallazgo("RC4", "bloqueo", `El centro de costo ${centro_costo} no existe.`)];
    }
    if (ctx.centro.subareas.includes(subarea)) return [];
    return [
      hallazgo("RC4", "bloqueo", `La subárea "${subarea}" no pertenece a ${centro_costo}.`, {
        accion_sugerida: `Subáreas válidas: ${ctx.centro.subareas.join(", ")}.`,
      }),
    ];
  },
};

const RC5: Regla = {
  id: "RC5",
  tipo: "confirmacion",
  evaluar(ctx) {
    const { cotizacion, solicitud } = ctx.paquete;
    if (cotizacion === null) {
      return [hallazgo("RC5", "confirmacion", "No hay cotización que respalde el valor.")];
    }
    if (cotizacion.moneda !== solicitud.moneda) {
      return [
        hallazgo(
          "RC5",
          "confirmacion",
          `La cotización está en ${cotizacion.moneda} y la solicitud en ${solicitud.moneda}: los valores no son comparables.`,
          { valores: { moneda_solicitud: solicitud.moneda, moneda_cotizacion: cotizacion.moneda } },
        ),
      ];
    }
    const diferencia = Math.abs(cotizacion.total - solicitud.valor_total);
    const relativa = solicitud.valor_total === 0 ? diferencia : diferencia / solicitud.valor_total;
    if (relativa <= TOLERANCIA_COTIZACION) return [];
    const porcentaje = Math.round(relativa * 1000) / 10;
    return [
      hallazgo(
        "RC5",
        "confirmacion",
        `La cotización (${formatearMonto(cotizacion.total)}) difiere ${porcentaje} % de la solicitud (${formatearMonto(solicitud.valor_total)}).`,
        {
          valores: {
            solicitud: solicitud.valor_total,
            cotizacion: cotizacion.total,
            diferencia_pct: porcentaje,
          },
        },
      ),
    ];
  },
};

/** Confirmación cuando la solicitud informa un código que no existe en su maestro. */
function codigoDesconocido(regla: IdRegla, campo: string, codigo: string): Hallazgo {
  return hallazgo(
    regla,
    "confirmacion",
    `El código ${codigo} de ${campo} no existe en el maestro.`,
    {
      valores: { [campo]: codigo },
      accion_sugerida: `Confirmar con el solicitante un código válido de ${campo}.`,
    },
  );
}

const RC6: Regla = {
  id: "RC6",
  tipo: "confirmacion",
  evaluar(ctx) {
    const informado = ctx.paquete.solicitud.indicador_iva;
    if (informado !== undefined) {
      const existe = ctx.maestros.indicadoresIva.some((i) => i.codigo === informado);
      return existe ? [] : [codigoDesconocido("RC6", "indicador_iva", informado)];
    }
    const proveedor = proveedorUnico(ctx);
    if (proveedor === undefined) return [];
    const codigo = proveedor.indicador_iva_default;
    const indicador = ctx.maestros.indicadoresIva.find((i) => i.codigo === codigo);
    return [
      hallazgo(
        "RC6",
        "confirmacion",
        `La solicitud no informa IVA; se propone ${codigo} (${indicador?.descripcion ?? "sin descripción"}) del proveedor.`,
        { valores: { indicador_iva: codigo } },
      ),
    ];
  },
};

const RC7: Regla = {
  id: "RC7",
  tipo: "derivado",
  evaluar(ctx) {
    const informado = ctx.paquete.solicitud.condiciones_pago;
    if (informado !== undefined) {
      const existe = ctx.maestros.condicionesPago.some((c) => c.codigo === informado);
      return existe ? [] : [codigoDesconocido("RC7", "condiciones_pago", informado)];
    }
    const proveedor = proveedorUnico(ctx);
    if (proveedor === undefined) return [];
    const codigo = proveedor.condiciones_pago_default;
    const condicion = ctx.maestros.condicionesPago.find((c) => c.codigo === codigo);
    return [
      hallazgo(
        "RC7",
        "derivado",
        `Condiciones de pago tomadas del proveedor: ${codigo} (${condicion?.descripcion ?? "sin descripción"}).`,
        { valores: { condiciones_pago: codigo } },
      ),
    ];
  },
};

const RC8: Regla = {
  id: REGLA_RETROACTIVA,
  tipo: "confirmacion",
  evaluar(ctx) {
    const { factura, solicitud } = ctx.paquete;
    if (factura === null || factura.fecha >= solicitud.fecha_solicitud) return [];
    return [
      hallazgo(
        REGLA_RETROACTIVA,
        "confirmacion",
        `OC retroactiva: la factura ${factura.numero} (${factura.fecha}) es anterior a la solicitud (${solicitud.fecha_solicitud}).`,
        { valores: { fecha_factura: factura.fecha, fecha_solicitud: solicitud.fecha_solicitud } },
      ),
    ];
  },
};

const RC9: Regla = {
  id: "RC9",
  tipo: "confirmacion",
  evaluar(ctx) {
    const { aprobacion, solicitud } = ctx.paquete;
    if (aprobacion === null) return [];
    const fecha = fechaCalendario(aprobacion.fecha);
    if (fecha >= solicitud.fecha_solicitud) return [];
    return [
      hallazgo(
        "RC9",
        "confirmacion",
        `La aprobación (${fecha}) es anterior a la solicitud (${solicitud.fecha_solicitud}).`,
      ),
    ];
  },
};

const RC10: Regla = {
  id: "RC10",
  tipo: "bloqueo",
  evaluar(ctx) {
    const { cantidad, valor_unitario, valor_total } = ctx.paquete.solicitud;
    const calculado = cantidad * valor_unitario;
    if (Math.abs(calculado - valor_total) <= TOLERANCIA_TOTAL) return [];
    return [
      hallazgo(
        "RC10",
        "bloqueo",
        `Cantidad × valor unitario (${formatearMonto(calculado)}) no coincide con el total (${formatearMonto(valor_total)}).`,
        {
          valores: { calculado, valor_total },
          accion_sugerida: "Pedir al solicitante corregir la solicitud.",
        },
      ),
    ];
  },
};

/** Todas las reglas de control, evaluadas en este orden. */
export const REGLAS: readonly Regla[] = [RC1, RC2, RC3, RC4, RC5, RC6, RC7, RC8, RC9, RC10];
