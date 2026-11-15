/** Props de {@link AvisoError}. */
export interface PropiedadesAvisoError {
  readonly mensaje: string;
  readonly alReintentar: () => void;
}

/**
 * Mensaje de error claro con la acción de reintentar (CA5).
 * @param props - mensaje y acción de reintento
 * @returns el aviso
 */
export function AvisoError({ mensaje, alReintentar }: PropiedadesAvisoError) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-danger bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:bg-rose-950 dark:text-rose-100"
    >
      <p>{mensaje}</p>
      <button
        type="button"
        onClick={alReintentar}
        className="ml-auto rounded-lg border border-rose-700 px-3 py-1 font-medium hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-brand dark:hover:bg-rose-900"
      >
        Reintentar
      </button>
    </div>
  );
}
