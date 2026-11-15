import { RESPUESTAS_CONFIRMACION, TEXTOS_CONFIRMACION } from "./textos";

/** Identificador del título del aviso (lo usa `aria-labelledby`). */
const ID_TITULO = "titulo-confirmacion";

/** Props de {@link BannerConfirmacion}. */
export interface PropiedadesBannerConfirmacion {
  /** Deshabilita los botones mientras hay una petición en curso. */
  readonly deshabilitado: boolean;
  readonly alConfirmar: () => void;
  readonly alCancelar: () => void;
}

/**
 * Aviso destacado cuando el agente espera la confirmación del usuario (PRD §6.1, CA3).
 * Es una región etiquetada (la pregunta ya se anuncia en el historial) y los botones
 * envían "Confirmo" o "Cancelar" como un mensaje normal.
 * @param props - acciones y estado deshabilitado
 * @returns el aviso
 */
export function BannerConfirmacion({
  deshabilitado,
  alConfirmar,
  alCancelar,
}: PropiedadesBannerConfirmacion) {
  return (
    <section
      aria-labelledby={ID_TITULO}
      className="rounded-xl border-2 border-warn bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"
    >
      <p id={ID_TITULO} className="font-semibold">
        <span aria-hidden="true">⚠️ </span>
        {TEXTOS_CONFIRMACION.titulo}
      </p>
      <p className="mt-1">{TEXTOS_CONFIRMACION.ayuda}</p>
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
    </section>
  );
}
