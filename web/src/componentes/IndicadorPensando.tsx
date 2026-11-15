import { CLASES } from "./clases";
import { TEXTOS_ESTADO } from "./textos";

/** Retraso de cada punto para que suban en secuencia. */
const RETRASOS_PUNTOS = [
  "[animation-delay:0ms]",
  "[animation-delay:150ms]",
  "[animation-delay:300ms]",
];

const CLASE_LINEA = "h-2.5 rounded-full bg-elevada motion-safe:animate-pulse";

/** Props de {@link IndicadorPensando}. */
export interface PropiedadesIndicadorPensando {
  /** true mientras el agente trabaja. */
  readonly activo: boolean;
}

/**
 * Región de estado persistente: los lectores de pantalla anuncian el texto cuando el
 * agente empieza a trabajar (PRD §6.1). Se ven tres puntos que suben en secuencia y un
 * esqueleto de la respuesta; sin animación si el usuario pidió movimiento reducido.
 * @param props - si el agente está trabajando
 * @returns la región de estado
 */
export function IndicadorPensando({ activo }: PropiedadesIndicadorPensando) {
  return (
    <div role="status">
      {activo && (
        <div className={`${CLASES.tarjeta} space-y-4 px-5 py-4 motion-safe:animate-aparecer`}>
          <p className="flex items-center gap-3 text-sm font-medium text-texto-suave">
            <span aria-hidden="true" className="flex items-center gap-1 text-info">
              {RETRASOS_PUNTOS.map((retraso) => (
                <span
                  key={retraso}
                  className={`size-1.5 rounded-full bg-current motion-safe:animate-punto ${retraso}`}
                />
              ))}
            </span>
            {TEXTOS_ESTADO.pensando}
          </p>
          <div aria-hidden="true" className="space-y-2">
            <div className={`${CLASE_LINEA} w-3/4`} />
            <div className={`${CLASE_LINEA} w-1/2`} />
          </div>
        </div>
      )}
    </div>
  );
}
