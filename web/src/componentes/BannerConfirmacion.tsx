import { RESPUESTAS_CONFIRMACION } from "./textos";

/** Props de {@link BannerConfirmacion}. */
export interface PropiedadesBannerConfirmacion {
  /** Deshabilita los botones mientras hay una petición en curso. */
  readonly deshabilitado: boolean;
  readonly alConfirmar: () => void;
  readonly alCancelar: () => void;
}

/**
 * Aviso destacado cuando el agente espera la confirmación del usuario (PRD §6.1, CA3).
 * Los botones envían "Confirmo" o "Cancelar" como un mensaje normal.
 * @param props - acciones y estado deshabilitado
 * @returns el banner
 */
export function BannerConfirmacion({
  deshabilitado,
  alConfirmar,
  alCancelar,
}: PropiedadesBannerConfirmacion) {
  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-warn bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
    >
      <p className="font-semibold">⚠️ El agente necesita tu confirmación antes de crear la OC.</p>
      <p className="mt-1">Revisa las validaciones de arriba y decide.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={deshabilitado}
          onClick={alConfirmar}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
        >
          {RESPUESTAS_CONFIRMACION.confirmar}
        </button>
        <button
          type="button"
          disabled={deshabilitado}
          onClick={alCancelar}
          className="rounded-lg border border-amber-700 px-4 py-2 font-medium hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 dark:hover:bg-amber-900"
        >
          {RESPUESTAS_CONFIRMACION.cancelar}
        </button>
      </div>
    </div>
  );
}
