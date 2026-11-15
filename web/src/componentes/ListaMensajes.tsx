import type { EntradaHistorial } from "@contratos/contratos-api";

import { agruparEnBloques, type Bloque } from "../estado/bloques";
import { BurbujaMensaje } from "./BurbujaMensaje";
import { TONOS } from "./clases";
import { PasosTurno } from "./PasosTurno";
import { TEXTOS_ESTADO } from "./textos";

/** Props de {@link ListaMensajes}. */
export interface PropiedadesListaMensajes {
  readonly entradas: readonly EntradaHistorial[];
}

function renderizarBloque(bloque: Bloque) {
  if (bloque.tipo === "pasos") return <PasosTurno llamadas={bloque.llamadas} />;
  const { entrada } = bloque;
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
 * @param props - entradas del historial
 * @returns la lista
 */
export function ListaMensajes({ entradas }: PropiedadesListaMensajes) {
  return (
    <div role="log" aria-live="polite" aria-label={TEXTOS_ESTADO.conversacion}>
      <ol className="flex flex-col gap-4">
        {agruparEnBloques(entradas).map((bloque, indice) => (
          <li key={indice}>{renderizarBloque(bloque)}</li>
        ))}
      </ol>
    </div>
  );
}
