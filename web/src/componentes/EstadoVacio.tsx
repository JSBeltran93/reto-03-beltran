import type { Sugerencia } from "../estado/sugerencias";
import { FichaEstadoCaso } from "./FichaEstadoCaso";
import { formatearMonto } from "./formato";
import { IconoDestello } from "./Iconos";
import { TEXTOS_ESTADO_VACIO } from "./textos";

/** Identificador del título del estado vacío (lo usa `aria-labelledby`). */
const ID_TITULO = "titulo-vacio";

/** Props de {@link EstadoVacio}. */
export interface PropiedadesEstadoVacio {
  readonly sugerencias: readonly Sugerencia[];
  /** Deshabilita las sugerencias mientras el agente trabaja. */
  readonly deshabilitado: boolean;
  readonly alElegir: (sugerencia: Sugerencia) => void;
  /** Abre el panel con todas las solicitudes. */
  readonly alVerSolicitudes: () => void;
}

function TarjetaSugerencia({
  sugerencia,
  deshabilitado,
  alElegir,
}: Pick<PropiedadesEstadoVacio, "deshabilitado" | "alElegir"> & {
  readonly sugerencia: Sugerencia;
}) {
  const { resumen } = sugerencia;
  return (
    <button
      type="button"
      disabled={deshabilitado}
      title={sugerencia.mensaje}
      onClick={() => {
        alElegir(sugerencia);
      }}
      className="anillo-foco flex h-full w-full flex-col gap-1.5 rounded-2xl border border-borde bg-superficie px-4 py-3.5 text-left transition-colors enabled:hover:border-borde-fuerte/50 enabled:hover:bg-elevada/60 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="text-sm leading-5 font-medium text-texto">{sugerencia.etiqueta}</span>
      {resumen && (
        <>
          <span className="line-clamp-1 text-xs text-texto-suave">{resumen.descripcion}</span>
          <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-texto-suave">
            <span className="flex min-w-0 items-baseline gap-1">
              <span className="min-w-0 truncate">{resumen.proveedor}</span>
              <span aria-hidden="true">·</span>
              <span className="shrink-0 tabular-nums">
                {formatearMonto(resumen.valor_total, resumen.moneda)}
              </span>
            </span>
            <FichaEstadoCaso estado={resumen.estado} />
          </span>
        </>
      )}
    </button>
  );
}

/**
 * Conversación vacía: saludo breve y sugerencias que envían mensajes reales al agente
 * (la primera es la del PRD §11), con el resumen de cada solicitud si ya se cargó.
 * @param props - sugerencias y acciones
 * @returns el estado vacío
 */
export function EstadoVacio(props: PropiedadesEstadoVacio) {
  const { sugerencias, deshabilitado, alElegir, alVerSolicitudes } = props;
  return (
    <section
      aria-labelledby={ID_TITULO}
      className="flex flex-col items-center pt-[6vh] text-center sm:pt-[10vh]"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-marca text-sobre-marca shadow-elevada">
        <IconoDestello className="size-6" />
      </span>
      <h2 id={ID_TITULO} className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
        {TEXTOS_ESTADO_VACIO.titulo}
      </h2>
      <p className="mt-2 max-w-md text-[0.9375rem] leading-6 text-texto-suave">
        {TEXTOS_ESTADO_VACIO.descripcion}
      </p>
      <h3 className="sr-only">{TEXTOS_ESTADO_VACIO.sugerencias}</h3>
      <ul className="mt-8 grid w-full gap-3 text-left sm:grid-cols-2">
        {sugerencias.map((sugerencia) => (
          <li key={sugerencia.caso} className="min-w-0">
            <TarjetaSugerencia
              sugerencia={sugerencia}
              deshabilitado={deshabilitado}
              alElegir={alElegir}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={alVerSolicitudes}
        className="anillo-foco mt-5 min-h-11 rounded-xl px-3 text-sm font-medium text-info hover:underline"
      >
        {TEXTOS_ESTADO_VACIO.verTodas}
      </button>
    </section>
  );
}
