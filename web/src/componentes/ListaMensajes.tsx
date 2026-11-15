import type { EntradaHistorial } from "@contratos/contratos-api";

import { agruparEnBloques, type Bloque } from "../estado/bloques";
import { AvisoError } from "./AvisoError";
import { BurbujaMensaje } from "./BurbujaMensaje";
import { TONOS } from "./clases";
import { PasosTurno } from "./PasosTurno";
import { TEXTOS_ESTADO } from "./textos";

/** Props de {@link ListaMensajes}. */
export interface PropiedadesListaMensajes {
  readonly entradas: readonly EntradaHistorial[];
  /**
   * Reintento del último turno: si se da y el historial termina en un error, ese error
   * se muestra con el botón "Reintentar" (una sola representación del error).
   */
  readonly alReintentarUltimo?: (() => void) | undefined;
}

function renderizarBloque(bloque: Bloque, alReintentar: (() => void) | undefined) {
  if (bloque.tipo === "pasos") return <PasosTurno llamadas={bloque.llamadas} />;
  const { entrada } = bloque;
  if (entrada.tipo === "error" && alReintentar) {
    return <AvisoError mensaje={entrada.texto} alReintentar={alReintentar} />;
  }
  if (entrada.tipo === "error") {
    return (
      <p className={`rounded-xl px-4 py-3 text-sm wrap-anywhere ${TONOS.peligro}`}>
        {entrada.texto}
      </p>
    );
  }
  return <BurbujaMensaje autor={entrada.tipo} texto={entrada.texto} />;
}

/**
 * Historial de la conversación, anunciado a lectores de pantalla. La lista solo crece
 * o se reemplaza completa al rehidratar, por eso la posición sirve de clave.
 * @param props - entradas del historial y reintento del último turno
 * @returns la lista
 */
export function ListaMensajes({ entradas, alReintentarUltimo }: PropiedadesListaMensajes) {
  const bloques = agruparEnBloques(entradas);
  const ultimo = bloques.length - 1;
  return (
    <div role="log" aria-live="polite" aria-label={TEXTOS_ESTADO.conversacion}>
      <ol className="flex flex-col gap-4">
        {bloques.map((bloque, indice) => (
          <li key={indice}>
            {renderizarBloque(bloque, indice === ultimo ? alReintentarUltimo : undefined)}
          </li>
        ))}
      </ol>
    </div>
  );
}
