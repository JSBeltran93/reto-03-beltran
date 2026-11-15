import type { Salud } from "@contratos/contratos-api";

/** Props de {@link Encabezado}. */
export interface PropiedadesEncabezado {
  /** Salud del servidor; undefined mientras se desconoce o si no responde. */
  readonly salud: Salud | undefined;
  /** Inicia una conversación nueva. */
  readonly alNuevaSesion: () => void;
}

/**
 * Barra superior con el título, el estado del servidor y la acción "Nueva sesión".
 * @param props - salud del servidor y acción de nueva sesión
 * @returns el encabezado de la página
 */
export function Encabezado({ salud, alNuevaSesion }: PropiedadesEncabezado) {
  const enLinea = salud !== undefined;
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <h1 className="text-base font-semibold sm:text-lg">Órdenes de Compra · Agente</h1>
        <span
          className="ml-auto flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${enLinea ? "bg-ok" : "bg-danger"}`}
          />
          {enLinea ? salud.model : "Servidor no disponible"}
        </span>
        <button
          type="button"
          onClick={alNuevaSesion}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Nueva sesión
        </button>
      </div>
    </header>
  );
}
