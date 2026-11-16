import type { ResumenCaso } from "@contratos/contratos-api";

import { FichaEstadoCaso } from "./FichaEstadoCaso";
import { formatearMonto } from "./formato";

/** Props de {@link FilaCaso}. */
export interface PropiedadesFilaCaso {
  readonly resumen: ResumenCaso;
  /** true si la conversación abierta trata este caso. */
  readonly seleccionado: boolean;
  /** Si es true, no se puede abrir (el agente está trabajando). */
  readonly deshabilitado?: boolean;
  readonly alSeleccionar: (caso: string) => void;
}

/** Estilo de la fila según trate o no la conversación abierta (fondo de acento suave). */
const CLASES_FILA = {
  base: "anillo-foco flex min-h-11 w-full flex-col gap-1.5 rounded-xl px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
  normal: "enabled:hover:bg-elevada",
  seleccionada: "bg-marca-suave ring-1 ring-marca/40",
} as const;

/**
 * Una solicitud: descripción, proveedor, monto, caso y estado. `aria-current` anuncia
 * las que trata la conversación abierta.
 * @param props - resumen del caso, si está seleccionado o deshabilitado y la acción al elegirlo
 * @returns el botón de la fila
 */
export function FilaCaso({
  resumen,
  seleccionado,
  deshabilitado = false,
  alSeleccionar,
}: PropiedadesFilaCaso) {
  return (
    <button
      type="button"
      disabled={deshabilitado}
      aria-current={seleccionado ? "true" : undefined}
      onClick={() => {
        alSeleccionar(resumen.caso);
      }}
      className={`${CLASES_FILA.base} ${seleccionado ? CLASES_FILA.seleccionada : CLASES_FILA.normal}`}
    >
      <span className="line-clamp-2 text-sm leading-5 font-semibold text-texto">
        {resumen.descripcion}
      </span>
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
        <span className="min-w-0 truncate text-texto-suave">{resumen.proveedor}</span>
        <span className="font-semibold text-texto tabular-nums">
          {formatearMonto(resumen.valor_total, resumen.moneda)}
        </span>
      </span>
      <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-texto-suave">
        <span>{resumen.solicitud_id}</span>
        <FichaEstadoCaso estado={resumen.estado} />
      </span>
    </button>
  );
}
