import type { ResumenCaso } from "@contratos/contratos-api";

import { CLASES } from "./clases";
import { FilaCaso } from "./FilaCaso";
import { TEXTOS_BANDEJA } from "./textos";

/** Identificador del título de la bandeja (lo usa `aria-labelledby`). */
const ID_TITULO = "titulo-bandeja";
/** Filas de esqueleto mientras carga la bandeja. */
const FILAS_ESQUELETO = 4;

/** Props de {@link Bandeja}. */
export interface PropiedadesBandeja {
  /** Casos cargados; undefined mientras carga o si falló. */
  readonly casos: readonly ResumenCaso[] | undefined;
  readonly cargando: boolean;
  readonly conError: boolean;
  readonly seleccionado: string | null;
  /** Si es true, solo el caso seleccionado sigue habilitado (el agente está trabajando). */
  readonly deshabilitado?: boolean;
  readonly alSeleccionar: (caso: string) => void;
  readonly alReintentar: () => void;
}

function Esqueleto() {
  return (
    <div role="status" className="space-y-2">
      <span className="sr-only">{TEXTOS_BANDEJA.cargando}</span>
      {Array.from({ length: FILAS_ESQUELETO }, (_, indice) => (
        <div key={indice} aria-hidden="true" className={`${CLASES.tarjeta} space-y-2 p-4`}>
          <div className="h-3 w-4/5 rounded-full bg-elevada motion-safe:animate-pulse" />
          <div className="h-3 w-1/2 rounded-full bg-elevada motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function Contenido(props: PropiedadesBandeja) {
  const { casos, cargando, conError, seleccionado, deshabilitado, alSeleccionar, alReintentar } =
    props;
  if (cargando) return <Esqueleto />;
  if (conError || !casos) {
    return (
      <div role="alert" className={`${CLASES.tarjeta} space-y-3 p-4 text-sm`}>
        <p>{TEXTOS_BANDEJA.error}</p>
        <button type="button" onClick={alReintentar} className={CLASES.botonSecundario}>
          {TEXTOS_BANDEJA.reintentar}
        </button>
      </div>
    );
  }
  if (casos.length === 0) {
    return (
      <p className={`${CLASES.tarjeta} p-4 text-sm text-texto-suave`}>{TEXTOS_BANDEJA.vacia}</p>
    );
  }
  return (
    <ul className="space-y-2">
      {casos.map((resumen) => (
        <li key={resumen.caso}>
          <FilaCaso
            resumen={resumen}
            seleccionado={resumen.caso === seleccionado}
            deshabilitado={deshabilitado === true && resumen.caso !== seleccionado}
            alSeleccionar={alSeleccionar}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Bandeja de la analista: las solicitudes de compra con su estado (creada, pendiente,
 * bloqueada o sin procesar). Muestra esqueleto al cargar, error con reintento y vacío.
 * @param props - casos, estado de la consulta, selección y acciones
 * @returns la bandeja
 */
export function Bandeja(props: PropiedadesBandeja) {
  return (
    <section aria-labelledby={ID_TITULO} className="flex w-full flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={ID_TITULO} className="text-xl font-semibold">
          {TEXTOS_BANDEJA.titulo}
        </h2>
        {props.casos && (
          <p className="text-sm text-texto-suave">{TEXTOS_BANDEJA.conteo(props.casos.length)}</p>
        )}
      </div>
      <Contenido {...props} />
    </section>
  );
}
