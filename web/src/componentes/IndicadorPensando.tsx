const CLASE_PUNTO = "h-2 w-2 animate-bounce rounded-full bg-brand motion-reduce:animate-none";

/**
 * Indicador de "pensando" mientras el agente trabaja (PRD §6.1); respeta el movimiento reducido.
 * @returns el indicador
 */
export function IndicadorPensando() {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span aria-hidden="true" className="flex gap-1">
        <span className={CLASE_PUNTO} />
        <span className={`${CLASE_PUNTO} [animation-delay:150ms]`} />
        <span className={`${CLASE_PUNTO} [animation-delay:300ms]`} />
      </span>
      El agente está trabajando…
    </p>
  );
}
