import type { VistaLlamada } from "@contratos/contratos-api";

import { TEXTOS_HERRAMIENTA } from "./textos";

/** Props de {@link TarjetaHerramienta}. */
export interface PropiedadesTarjetaHerramienta {
  readonly llamada: VistaLlamada;
}

const ESTILO_EXITO = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
const ESTILO_ERROR = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";

/**
 * Extracto corto de los argumentos para verlo sin expandir (p. ej. `caso: "sol-004"`).
 * @param args - argumentos de la llamada
 * @returns el extracto, o null si la llamada no tiene caso
 */
function extractoArgumentos(args: unknown): string | null {
  const caso = (args as { caso?: unknown } | null)?.caso;
  return typeof caso === "string" ? `caso: "${caso}"` : null;
}

/**
 * Tarjeta plegable de una llamada a herramienta (PRD §6.1): nombre, caso, estado y
 * resultado resumido a la vista; al expandir, el resultado completo y los argumentos.
 * @param props - la llamada
 * @returns la tarjeta
 */
export function TarjetaHerramienta({ llamada }: PropiedadesTarjetaHerramienta) {
  const extracto = extractoArgumentos(llamada.args);
  return (
    <details
      aria-label={TEXTOS_HERRAMIENTA.etiqueta(llamada.nombre)}
      className="group rounded-xl border border-slate-200 bg-slate-100/60 text-xs dark:border-slate-800 dark:bg-slate-900/60"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 focus-visible:outline-2 focus-visible:outline-brand">
        <span aria-hidden="true">🔧</span>
        <span className="font-mono font-semibold">{llamada.nombre}</span>
        {extracto && <span className="font-mono text-slate-500">{extracto}</span>}
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${llamada.ok ? ESTILO_EXITO : ESTILO_ERROR}`}
        >
          <span className="sr-only">
            {llamada.ok ? TEXTOS_HERRAMIENTA.correcta : TEXTOS_HERRAMIENTA.conError}
          </span>
          {llamada.ok ? "✓" : "✕"}
        </span>
        <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-400">
          {llamada.resumen}
        </span>
        <span aria-hidden="true" className="text-slate-400 group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-800">
        <p className="mb-1 font-semibold">{TEXTOS_HERRAMIENTA.resumen}</p>
        <p className="mb-2 [overflow-wrap:anywhere]">{llamada.resumen}</p>
        <p className="mb-1 font-semibold">{TEXTOS_HERRAMIENTA.argumentos}</p>
        <pre className="max-h-64 overflow-auto font-mono break-all whitespace-pre-wrap">
          {JSON.stringify(llamada.args, null, 2)}
        </pre>
      </div>
    </details>
  );
}
