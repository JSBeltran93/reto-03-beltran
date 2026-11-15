import { TEXTOS_ESTADO } from "./textos";

const CLASE_PUNTO = "h-2 w-2 animate-bounce rounded-full bg-brand motion-reduce:animate-none";

/** Props de {@link IndicadorPensando}. */
export interface PropiedadesIndicadorPensando {
  /** true mientras el agente trabaja. */
  readonly activo: boolean;
}

/**
 * Región de estado persistente: los lectores de pantalla anuncian el cambio de texto
 * cuando el agente empieza a trabajar (PRD §6.1). Respeta el movimiento reducido.
 * @param props - si el agente está trabajando
 * @returns la región de estado
 */
export function IndicadorPensando({ activo }: PropiedadesIndicadorPensando) {
  return (
    <p
      role="status"
      className="flex min-h-5 items-center gap-2 text-sm text-slate-600 dark:text-slate-400"
    >
      {activo && (
        <>
          <span aria-hidden="true" className="flex gap-1">
            <span className={CLASE_PUNTO} />
            <span className={`${CLASE_PUNTO} [animation-delay:150ms]`} />
            <span className={`${CLASE_PUNTO} [animation-delay:300ms]`} />
          </span>
          {TEXTOS_ESTADO.pensando}
        </>
      )}
    </p>
  );
}
