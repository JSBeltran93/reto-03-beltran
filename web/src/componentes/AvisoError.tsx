import { CLASES, TONOS } from "./clases";
import { IconoAlerta } from "./Iconos";
import { TEXTOS_ESTADO } from "./textos";
import { useCuentaRegresiva } from "./useCuentaRegresiva";

/** Props de {@link AvisoError}. */
export interface PropiedadesAvisoError {
  readonly mensaje: string;
  /** Acción de reintento; si no se da (error no reintentable), no se muestra el botón. */
  readonly alReintentar?: () => void;
  /** Segundos que pidió el servidor (Retry-After) antes de reintentar. */
  readonly esperaSegundos?: number;
}

/**
 * Mensaje de error claro, con la acción de reintentar cuando tiene sentido (CA5). Si el
 * servidor limitó las solicitudes, "Reintentar" queda deshabilitado con una cuenta regresiva.
 * @param props - mensaje, acción de reintento opcional y espera
 * @returns el aviso
 */
export function AvisoError({ mensaje, alReintentar, esperaSegundos }: PropiedadesAvisoError) {
  const restantes = useCuentaRegresiva(esperaSegundos);
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3.5 text-sm ${TONOS.peligro}`}
    >
      <p role="alert" className="flex min-w-0 flex-1 gap-2 leading-6 font-medium wrap-anywhere">
        <IconoAlerta className="mt-1 size-4" />
        <span className="min-w-0">{mensaje}</span>
      </p>
      {alReintentar && restantes > 0 && (
        <p className="text-xs">{TEXTOS_ESTADO.esperaReintento(restantes)}</p>
      )}
      {alReintentar && (
        <button
          type="button"
          onClick={alReintentar}
          disabled={restantes > 0}
          className={CLASES.botonSecundario}
        >
          {TEXTOS_ESTADO.reintentar}
        </button>
      )}
    </div>
  );
}
