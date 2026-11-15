import { CLASES } from "./clases";
import { TEXTOS_ESTADO } from "./textos";

const CLASE_LINEA = "h-3 rounded-full bg-elevada motion-safe:animate-pulse";

/** Props de {@link IndicadorPensando}. */
export interface PropiedadesIndicadorPensando {
  /** true mientras el agente trabaja. */
  readonly activo: boolean;
}

/**
 * Región de estado persistente: los lectores de pantalla anuncian el texto cuando el
 * agente empieza a trabajar (PRD §6.1). Mientras tanto se ve un esqueleto de la
 * respuesta; sin animación si el usuario pidió movimiento reducido.
 * @param props - si el agente está trabajando
 * @returns la región de estado
 */
export function IndicadorPensando({ activo }: PropiedadesIndicadorPensando) {
  return (
    <div role="status">
      {activo && (
        <div className={`${CLASES.tarjeta} space-y-3 px-4 py-4`}>
          <p className="text-sm font-medium text-texto-suave">{TEXTOS_ESTADO.pensando}</p>
          <div aria-hidden="true" className="space-y-2">
            <div className={`${CLASE_LINEA} w-3/4`} />
            <div className={`${CLASE_LINEA} w-1/2`} />
          </div>
        </div>
      )}
    </div>
  );
}
