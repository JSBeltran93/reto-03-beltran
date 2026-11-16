import type { ResumenCaso } from "@contratos/contratos-api";

import { CLASES } from "./clases";
import { FilaCaso } from "./FilaCaso";
import { TEXTOS_SOLICITUDES } from "./textos";

/** Filas de esqueleto mientras cargan las solicitudes. */
const FILAS_ESQUELETO = 4;

/** Props de {@link ListaSolicitudes}. */
export interface PropiedadesListaSolicitudes {
  /** Casos cargados; undefined mientras carga o si falló. */
  readonly casos: readonly ResumenCaso[] | undefined;
  readonly cargando: boolean;
  readonly conError: boolean;
  /** Casos que trata la conversación abierta (se marcan con `aria-current`). */
  readonly actuales: readonly string[];
  /** Si es true no se puede elegir otra solicitud (el agente está trabajando). */
  readonly deshabilitado?: boolean;
  readonly alElegir: (caso: string) => void;
  readonly alReintentar: () => void;
}

function ErrorSolicitudes({ alReintentar }: Pick<PropiedadesListaSolicitudes, "alReintentar">) {
  return (
    <div className={`${CLASES.tarjeta} space-y-3 p-4 text-sm`}>
      <p role="alert" className="font-medium">
        {TEXTOS_SOLICITUDES.error}
      </p>
      <button type="button" onClick={alReintentar} className={CLASES.botonSecundario}>
        {TEXTOS_SOLICITUDES.reintentar}
      </button>
    </div>
  );
}

function Esqueleto() {
  return (
    <div role="status" className="space-y-2">
      <span className="sr-only">{TEXTOS_SOLICITUDES.cargando}</span>
      {Array.from({ length: FILAS_ESQUELETO }, (_, indice) => (
        <div key={indice} aria-hidden="true" className="space-y-2 rounded-xl bg-elevada/60 p-4">
          <div className="h-3 w-4/5 rounded-full bg-elevada motion-safe:animate-pulse" />
          <div className="h-3 w-1/2 rounded-full bg-elevada motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * Solicitudes de compra con su estado (creada, pendiente, bloqueada o por revisar).
 * Muestra esqueleto al cargar, error con reintento y vacío.
 * @param props - casos, estado de la consulta, casos actuales y acciones
 * @returns la lista
 */
export function ListaSolicitudes(props: PropiedadesListaSolicitudes) {
  const { casos, cargando, conError, actuales, deshabilitado = false, alElegir } = props;
  if (cargando) return <Esqueleto />;
  if (conError || !casos) return <ErrorSolicitudes alReintentar={props.alReintentar} />;
  if (casos.length === 0) {
    return <p className="p-4 text-center text-sm text-texto-suave">{TEXTOS_SOLICITUDES.vacia}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {casos.map((resumen) => (
        <li key={resumen.caso}>
          <FilaCaso
            resumen={resumen}
            seleccionado={actuales.includes(resumen.caso)}
            deshabilitado={deshabilitado}
            alSeleccionar={alElegir}
          />
        </li>
      ))}
    </ul>
  );
}
