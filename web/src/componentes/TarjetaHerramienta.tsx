import type { VistaLlamada } from "@contratos/contratos-api";

/** Props de {@link TarjetaHerramienta}. */
export interface PropiedadesTarjetaHerramienta {
  readonly llamada: VistaLlamada;
}

const ESTILO_EXITO = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
const ESTILO_ERROR = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";

/**
 * Tarjeta plegable de una llamada a herramienta: nombre, estado y resumen;
 * los argumentos se ven al expandir (PRD §6.1).
 * @param props - la llamada
 * @returns la tarjeta
 */
export function TarjetaHerramienta({ llamada }: PropiedadesTarjetaHerramienta) {
  const estado = llamada.ok ? "correcta" : "con error";
  return (
    <details className="group rounded-xl border border-slate-200 bg-slate-100/60 text-xs dark:border-slate-800 dark:bg-slate-900/60">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 focus-visible:outline-2 focus-visible:outline-brand">
        <span aria-hidden="true">🔧</span>
        <span className="font-mono font-semibold">{llamada.nombre}</span>
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${llamada.ok ? ESTILO_EXITO : ESTILO_ERROR}`}
        >
          <span className="sr-only">Llamada {estado}: </span>
          {llamada.ok ? "✓" : "✕"}
        </span>
        <span className="truncate text-slate-600 dark:text-slate-400">{llamada.resumen}</span>
        <span aria-hidden="true" className="ml-auto text-slate-400 group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-800">
        <p className="mb-1 font-semibold">Argumentos</p>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono">
          {JSON.stringify(llamada.args, null, 2)}
        </pre>
      </div>
    </details>
  );
}
