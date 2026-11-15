import type { ErrorVisible } from "../estado/conversacion";
import { AvisoError } from "./AvisoError";
import { BannerConfirmacion } from "./BannerConfirmacion";
import { IndicadorPensando } from "./IndicadorPensando";
import { RESPUESTAS_CONFIRMACION } from "./textos";

/** Props de {@link AvisosConversacion}. */
export interface PropiedadesAvisosConversacion {
  readonly cargando: boolean;
  readonly error: ErrorVisible | null;
  readonly mostrarConfirmacion: boolean;
  readonly alReintentar: () => void;
  readonly alEnviar: (texto: string) => void;
}

/**
 * Zona bajo el historial: estado "pensando", error con reintento y aviso de confirmación.
 * @param props - estado de la conversación y acciones
 * @returns los avisos
 */
export function AvisosConversacion({
  cargando,
  error,
  mostrarConfirmacion,
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
        <BannerConfirmacion
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
