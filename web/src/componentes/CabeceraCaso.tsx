import { ESTADOS_CASO, type ResumenCaso } from "@contratos/contratos-api";

import { CLASES } from "./clases";
import { FichaEstadoCaso } from "./FichaEstadoCaso";
import { formatearMonto } from "./formato";
import { IconoVolver } from "./Iconos";
import { TEXTOS_BANDEJA } from "./textos";

/** Identificador de la ayuda de "Revisar solicitud" (lo usa `aria-describedby`). */
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
      <IconoVolver />
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
      <p className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
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
 * Botón "Revisar solicitud": envía al agente el mensaje del PRD §11 para el caso.
 * @param props - caso, estado deshabilitado y acción
 * @returns el botón
 */
function BotonProcesar({
  caso,
  deshabilitado,
  alProcesar,
}: Pick<PropiedadesCabeceraCaso, "deshabilitado" | "alProcesar"> & { readonly caso: string }) {
  return (
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
  );
}

/**
 * Identificación del caso: número de solicitud, descripción y datos de negocio.
 * @param props - caso y su resumen, si ya se cargó
 * @returns el bloque de identificación
 */
function IdentificacionCaso({
  caso,
  resumen,
}: {
  readonly caso: string;
  readonly resumen: ResumenCaso | undefined;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium tracking-wide text-texto-suave uppercase">
        {resumen?.solicitud_id ?? caso}
      </p>
      <h2 className="mt-1 text-lg leading-snug font-semibold tracking-tight wrap-anywhere">
        {resumen?.descripcion ?? caso}
      </h2>
      {resumen && <DatosCaso resumen={resumen} />}
    </div>
  );
}

/**
 * Cabecera del caso abierto: datos de negocio, estado y la acción principal "Revisar solicitud".
 * Un caso con la OC ya creada no ofrece "Revisar solicitud" (no hay nada que crear); se puede seguir
 * preguntando por el chat. En móvil incluye el botón para volver a las solicitudes.
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
  const procesable = resumen?.estado !== ESTADOS_CASO.creada;
  return (
    <section aria-label={resumen?.solicitud_id ?? caso} className={`${CLASES.tarjeta} p-5 sm:p-6`}>
      <BotonVolver alVolver={alVolver} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <IdentificacionCaso caso={caso} resumen={resumen} />
        {procesable && (
          <BotonProcesar caso={caso} deshabilitado={deshabilitado} alProcesar={alProcesar} />
        )}
      </div>
      {procesable && (
        <p id={ID_AYUDA_PROCESAR} className="mt-4 text-xs leading-5 text-texto-suave">
          {TEXTOS_BANDEJA.ayudaProcesar}
        </p>
      )}
    </section>
  );
}
