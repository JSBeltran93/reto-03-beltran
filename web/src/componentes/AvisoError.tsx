import { CLASES, TONOS } from "./clases";
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
      className={`flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm ${TONOS.peligro}`}
    >
      <p className="min-w-0 flex-1 font-medium wrap-anywhere">
        <span aria-hidden="true">⛔ </span>
        {mensaje}
      </p>
      {alReintentar && (
        <button type="button" onClick={alReintentar} className={CLASES.botonSecundario}>
          {TEXTOS_ESTADO.reintentar}
        </button>
      )}
    </div>
  );
}
