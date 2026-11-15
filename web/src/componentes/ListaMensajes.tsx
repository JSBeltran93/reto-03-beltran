import type { EntradaHistorial } from "@contratos/contratos-api";

import { BurbujaMensaje } from "./BurbujaMensaje";
import { TarjetaHerramienta } from "./TarjetaHerramienta";
import { TEXTOS_ESTADO } from "./textos";

/** Props de {@link ListaMensajes}. */
export interface PropiedadesListaMensajes {
  readonly entradas: readonly EntradaHistorial[];
}

function renderizarEntrada(entrada: EntradaHistorial) {
  switch (entrada.tipo) {
    case "usuario":
    case "asistente":
      return <BurbujaMensaje autor={entrada.tipo} texto={entrada.texto} />;
    case "herramienta":
      return <TarjetaHerramienta llamada={entrada.llamada} />;
    case "error":
      return (
        <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-900 [overflow-wrap:anywhere] dark:bg-rose-950 dark:text-rose-100">
          {entrada.texto}
        </p>
      );
  }
}

/**
 * Historial de la conversación, anunciado a lectores de pantalla. La lista solo
 * crece o se reemplaza completa al rehidratar, por eso la posición sirve de clave.
 * @param props - entradas del historial
 * @returns la lista
 */
export function ListaMensajes({ entradas }: PropiedadesListaMensajes) {
  return (
    <ol
      role="log"
      aria-live="polite"
      aria-label={TEXTOS_ESTADO.conversacion}
      className="flex flex-col gap-3"
    >
      {entradas.map((entrada, indice) => (
        <li key={indice}>{renderizarEntrada(entrada)}</li>
      ))}
    </ol>
  );
}
