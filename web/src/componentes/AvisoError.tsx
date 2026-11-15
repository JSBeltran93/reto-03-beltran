import { TEXTOS_ESTADO } from "./textos";

/** Props de {@link AvisoError}. */
export interface PropiedadesAvisoError {
  readonly mensaje: string;
  /** Acción de reintento; si no se da (error no reintentable), no se muestra el botón. */
  readonly alReintentar?: () => void;
}

/**
 * Mensaje de error claro, con la acción de reintentar cuando tiene sentido (CA5).
 * @param props - mensaje y acción de reintento opcional
 * @returns el aviso
 */
export function AvisoError({ mensaje, alReintentar }: PropiedadesAvisoError) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-danger bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:bg-rose-950 dark:text-rose-100"
    >
      <p className="[overflow-wrap:anywhere]">{mensaje}</p>
      {alReintentar && (
        <button
          type="button"
          onClick={alReintentar}
          className="ml-auto rounded-lg border border-rose-700 px-3 py-1 font-medium hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-brand dark:hover:bg-rose-900"
        >
          {TEXTOS_ESTADO.reintentar}
        </button>
      )}
    </div>
  );
}
