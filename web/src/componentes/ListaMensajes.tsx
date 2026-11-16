import type { EntradaHistorial } from "@contratos/contratos-api";

import { agruparEnTurnos } from "../estado/turnos";
import { BurbujaMensaje } from "./BurbujaMensaje";
import { TEXTOS_ESTADO } from "./textos";
import { TurnoAsistente } from "./TurnoAsistente";

/** Props de {@link ListaMensajes}. */
export interface PropiedadesListaMensajes {
  readonly entradas: readonly EntradaHistorial[];
  /**
   * Reintento del último turno: si se da y el historial termina en un error, ese error
   * se muestra con el botón "Reintentar" (una sola representación del error).
   */
  readonly alReintentarUltimo?: (() => void) | undefined;
}

/**
 * Historial de la conversación por turnos, anunciado a lectores de pantalla. La lista
 * solo crece o se reemplaza completa al rehidratar, por eso la posición sirve de clave.
 * @param props - entradas del historial y reintento del último turno
 * @returns la lista
 */
export function ListaMensajes({ entradas, alReintentarUltimo }: PropiedadesListaMensajes) {
  const turnos = agruparEnTurnos(entradas);
  const ultimo = turnos.length - 1;
  return (
    <div role="log" aria-live="polite" aria-label={TEXTOS_ESTADO.conversacion}>
      <ol className="flex flex-col gap-8">
        {turnos.map((turno, indice) => (
          <li key={indice}>
            {turno.tipo === "usuario" ? (
              <BurbujaMensaje autor="usuario" texto={turno.texto} />
            ) : (
              <TurnoAsistente
                llamadas={turno.llamadas}
                respuesta={turno.respuesta}
                alReintentar={indice === ultimo ? alReintentarUltimo : undefined}
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
