import { TEXTOS_ESTADO } from "./textos";
import { AvatarAsistente } from "./TurnoAsistente";

/** Retraso de cada punto para que suban en secuencia. */
const RETRASOS_PUNTOS = [
  "[animation-delay:0ms]",
  "[animation-delay:150ms]",
  "[animation-delay:300ms]",
];

/** Props de {@link IndicadorPensando}. */
export interface PropiedadesIndicadorPensando {
  /** true mientras el agente trabaja. */
  readonly activo: boolean;
}

/**
 * Región de estado persistente: los lectores de pantalla anuncian el texto cuando el
 * agente empieza a trabajar (PRD §6.1). Se ve como un turno del asistente con tres puntos
 * que suben en secuencia; sin animación si el usuario pidió movimiento reducido.
 * @param props - si el agente está trabajando
 * @returns la región de estado
 */
export function IndicadorPensando({ activo }: PropiedadesIndicadorPensando) {
  return (
    <div role="status" className={activo ? "mt-8" : undefined}>
      {activo && (
        <div className="flex items-center gap-3 motion-safe:animate-aparecer sm:gap-4">
          <AvatarAsistente />
          <p className="flex items-center gap-3 rounded-full bg-elevada px-4 py-2 text-sm font-medium text-texto-suave">
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
        </div>
      )}
    </div>
  );
}
