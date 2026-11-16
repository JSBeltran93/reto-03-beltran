import type { ResumenCaso } from "@contratos/contratos-api";

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
  /** Caso cuya OC se confirma (null si el servidor no lo informó). */
  readonly caso: string | null;
  /** Resumen del caso pendiente entre las solicitudes, si ya se cargó. */
  readonly resumen?: ResumenCaso | undefined;
  readonly alReintentar: () => void;
  readonly alEnviar: (texto: string) => void;
}

/** Tarjeta de confirmación cuyos botones envían "Confirmo" o "Cancelar" como mensajes. */
function Confirmacion({
  cargando,
  confirmaciones,
  caso,
  resumen,
  alEnviar,
}: Pick<
  PropiedadesAvisosConversacion,
  "cargando" | "confirmaciones" | "caso" | "resumen" | "alEnviar"
>) {
  return (
    <TarjetaConfirmacion
      confirmaciones={confirmaciones}
      caso={caso}
      resumen={resumen}
      deshabilitado={cargando}
      alConfirmar={() => {
        alEnviar(RESPUESTAS_CONFIRMACION.confirmar);
      }}
      alCancelar={() => {
        alEnviar(RESPUESTAS_CONFIRMACION.cancelar);
      }}
    />
  );
}

/**
 * Zona bajo el historial: estado "pensando", error de comunicación y tarjeta de
 * confirmación, alineados con la columna del asistente. Si hay una confirmación pendiente,
 * la tarjeta manda: sus botones reenvían la decisión, así que el error no ofrece además
 * "Reintentar".
 * @param props - estado de la conversación y acciones
 * @returns los avisos
 */
export function AvisosConversacion(props: PropiedadesAvisosConversacion) {
  const { cargando, error, mostrarConfirmacion, alReintentar } = props;
  return (
    <>
      <IndicadorPensando activo={cargando} />
      {(error !== null || mostrarConfirmacion) && (
        <div className="mt-8 space-y-4 sm:pl-11">
          {error && (
            <AvisoError
              mensaje={error.mensaje}
              {...(error.reintentable && !mostrarConfirmacion && { alReintentar })}
              {...(error.esperaSegundos !== undefined && { esperaSegundos: error.esperaSegundos })}
            />
          )}
          {mostrarConfirmacion && <Confirmacion {...props} />}
        </div>
      )}
    </>
  );
}
