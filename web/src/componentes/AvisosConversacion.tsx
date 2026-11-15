import type { ErrorVisible } from "../estado/conversacion";
import type { Hallazgo } from "../estado/resultados";
import { AvisoError } from "./AvisoError";
import { IndicadorPensando } from "./IndicadorPensando";
import { TarjetaConfirmacion } from "./TarjetaConfirmacion";
import { RESPUESTAS_CONFIRMACION } from "./textos";

/** Props de {@link AvisosConversacion}. */
export interface PropiedadesAvisosConversacion {
  readonly cargando: boolean;
  readonly error: ErrorVisible | null;
  readonly mostrarConfirmacion: boolean;
  /** Confirmaciones pendientes que se listan en la tarjeta. */
  readonly confirmaciones: readonly Hallazgo[];
  readonly alReintentar: () => void;
  readonly alEnviar: (texto: string) => void;
}

/**
 * Zona bajo el historial: estado "pensando", error con reintento y tarjeta de confirmación.
 * @param props - estado de la conversación y acciones
 * @returns los avisos
 */
export function AvisosConversacion({
  cargando,
  error,
  mostrarConfirmacion,
  confirmaciones,
  alReintentar,
  alEnviar,
}: PropiedadesAvisosConversacion) {
  return (
    <>
      <IndicadorPensando activo={cargando} />
      {error && (
        <AvisoError mensaje={error.mensaje} {...(error.reintentable && { alReintentar })} />
      )}
      {mostrarConfirmacion && (
        <TarjetaConfirmacion
          confirmaciones={confirmaciones}
          deshabilitado={cargando}
          alConfirmar={() => {
            alEnviar(RESPUESTAS_CONFIRMACION.confirmar);
          }}
          alCancelar={() => {
            alEnviar(RESPUESTAS_CONFIRMACION.cancelar);
          }}
        />
      )}
    </>
  );
}
