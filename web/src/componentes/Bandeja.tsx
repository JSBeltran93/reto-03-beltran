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
  /**
   * Abre la conversación sin elegir caso (solo en móvil, donde la bandeja tapa el chat):
   * si la bandeja no carga, igual se puede hablar con el agente.
   */
  readonly alAbrirConversacion?: () => void;
}

function ErrorBandeja({
  alReintentar,
  alAbrirConversacion,
}: Pick<PropiedadesBandeja, "alReintentar" | "alAbrirConversacion">) {
  return (
    <div className={`${CLASES.tarjeta} space-y-3 p-5 text-sm`}>
      <p role="alert" className="font-medium">
        {TEXTOS_BANDEJA.error}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={alReintentar} className={CLASES.botonSecundario}>
          {TEXTOS_BANDEJA.reintentar}
        </button>
        {alAbrirConversacion && (
          <button
            type="button"
            onClick={alAbrirConversacion}
            className={`${CLASES.botonPrimario} lg:hidden`}
          >
            {TEXTOS_BANDEJA.abrirConversacion}
          </button>
        )}
      </div>
      {alAbrirConversacion && (
        <p className="text-texto-suave lg:hidden">{TEXTOS_BANDEJA.ayudaSinBandeja}</p>
      )}
    </div>
  );
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
  const { casos, cargando, conError, seleccionado, deshabilitado, alSeleccionar } = props;
  if (cargando) return <Esqueleto />;
  if (conError || !casos) {
    return (
      <ErrorBandeja
        alReintentar={props.alReintentar}
        {...(props.alAbrirConversacion && { alAbrirConversacion: props.alAbrirConversacion })}
      />
    );
  }
  if (casos.length === 0) {
    return (
      <p className={`${CLASES.tarjeta} p-6 text-center text-sm text-texto-suave`}>
        {TEXTOS_BANDEJA.vacia}
      </p>
    );
  }
  return (
    <ul className="space-y-2.5">
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
 * bloqueada o sin procesar). Muestra esqueleto al cargar, error con reintento (y, en
 * móvil, acceso directo a la conversación) y vacío.
 * @param props - casos, estado de la consulta, selección y acciones
 * @returns la bandeja
 */
export function Bandeja(props: PropiedadesBandeja) {
  return (
    <section aria-labelledby={ID_TITULO} className="flex w-full flex-col gap-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={ID_TITULO} className="text-xl font-semibold tracking-tight">
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
