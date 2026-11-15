import type { EntradaHistorial, VistaLlamada } from "@contratos/contratos-api";

import { agruparEnBloques, type Bloque } from "../estado/bloques";
import { BurbujaMensaje } from "./BurbujaMensaje";
import { CLASES, TONOS } from "./clases";
import { TarjetaHerramienta } from "./TarjetaHerramienta";
import { TEXTOS_ESTADO, TEXTOS_HERRAMIENTA } from "./textos";

/** Props de {@link ListaMensajes}. */
export interface PropiedadesListaMensajes {
  readonly entradas: readonly EntradaHistorial[];
}

function LineaDeTiempo({ llamadas }: { readonly llamadas: readonly VistaLlamada[] }) {
  return (
    <section aria-label={TEXTOS_HERRAMIENTA.pasos} className={`${CLASES.tarjeta} p-4`}>
      <ol className="space-y-4 border-l border-borde pl-0">
        {llamadas.map((llamada, indice) => (
          <li key={indice} className="-ml-3">
            <TarjetaHerramienta llamada={llamada} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function renderizarBloque(bloque: Bloque) {
  if (bloque.tipo === "pasos") return <LineaDeTiempo llamadas={bloque.llamadas} />;
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
    <ol
      role="log"
      aria-live="polite"
      aria-label={TEXTOS_ESTADO.conversacion}
      className="flex flex-col gap-4"
    >
      {agruparEnBloques(entradas).map((bloque, indice) => (
        <li key={indice}>{renderizarBloque(bloque)}</li>
      ))}
    </ol>
  );
}
