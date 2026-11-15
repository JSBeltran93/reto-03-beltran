import type { ResumenCaso } from "@contratos/contratos-api";

import { CLASES } from "./clases";
import { FichaEstadoCaso } from "./FichaEstadoCaso";
import { formatearMonto } from "./formato";
import { TEXTOS_BANDEJA } from "./textos";

/** Identificador de la ayuda de "Procesar" (lo usa `aria-describedby`). */
const ID_AYUDA_PROCESAR = "ayuda-procesar";

/** Props de {@link CabeceraCaso}. */
export interface PropiedadesCabeceraCaso {
  /** Caso abierto; null si aún no se eligió ninguno. */
  readonly caso: string | null;
  /** Resumen del caso en la bandeja, si ya se cargó. */
  readonly resumen: ResumenCaso | undefined;
  readonly deshabilitado: boolean;
  readonly alProcesar: (caso: string) => void;
  /** Vuelve a la bandeja (solo en móvil). */
  readonly alVolver: () => void;
}

function BotonVolver({ alVolver }: Pick<PropiedadesCabeceraCaso, "alVolver">) {
  return (
    <button
      type="button"
      onClick={alVolver}
      className="anillo-foco -ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-medium text-info lg:hidden"
    >
      <span aria-hidden="true">←</span>
      {TEXTOS_BANDEJA.volver}
    </button>
  );
}

function DatosCaso({ resumen }: { readonly resumen: ResumenCaso }) {
  return (
    <>
      <p className="mt-1 text-sm text-texto-suave">
        {resumen.proveedor} · {TEXTOS_BANDEJA.centro} {resumen.centro_costo}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xl font-semibold tabular-nums">
          {formatearMonto(resumen.valor_total, resumen.moneda)}
        </span>
        <FichaEstadoCaso estado={resumen.estado} />
        {resumen.numero_oc && (
          <span className="text-sm font-medium">{TEXTOS_BANDEJA.numeroOc(resumen.numero_oc)}</span>
        )}
      </p>
    </>
  );
}

/**
 * Cabecera del caso abierto: datos de negocio, estado y la acción principal "Procesar",
 * que envía al agente el mensaje del PRD §11. En móvil incluye "← Bandeja".
 * @param props - caso, resumen, estado y acciones
 * @returns la cabecera, o solo el botón de volver si no hay caso
 */
export function CabeceraCaso({
  caso,
  resumen,
  deshabilitado,
  alProcesar,
  alVolver,
}: PropiedadesCabeceraCaso) {
  if (caso === null) return <BotonVolver alVolver={alVolver} />;
  return (
    <section aria-label={caso} className={`${CLASES.tarjeta} p-4 sm:p-5`}>
      <BotonVolver alVolver={alVolver} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-texto-suave">
            {caso}
            {resumen && ` · ${resumen.solicitud_id}`}
          </p>
          <h2 className="mt-0.5 text-base font-semibold wrap-anywhere">
            {resumen?.descripcion ?? caso}
          </h2>
          {resumen && <DatosCaso resumen={resumen} />}
        </div>
        <button
          type="button"
          disabled={deshabilitado}
          aria-describedby={ID_AYUDA_PROCESAR}
          onClick={() => {
            alProcesar(caso);
          }}
          className={`${CLASES.botonPrimario} min-h-11 shrink-0`}
        >
          {TEXTOS_BANDEJA.procesar}
        </button>
      </div>
      <p id={ID_AYUDA_PROCESAR} className="mt-3 text-xs text-texto-suave">
        {TEXTOS_BANDEJA.ayudaProcesar}
      </p>
    </section>
  );
}
