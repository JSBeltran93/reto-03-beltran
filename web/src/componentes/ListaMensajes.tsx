import type { EntradaHistorial } from "@contratos/contratos-api";
import { useEffect, useRef } from "react";

import { BurbujaMensaje } from "./BurbujaMensaje";
import { TarjetaHerramienta } from "./TarjetaHerramienta";

/** Props de {@link ListaMensajes}. */
export interface PropiedadesListaMensajes {
  readonly entradas: readonly EntradaHistorial[];
}

function renderizarEntrada(entrada: EntradaHistorial) {
  switch (entrada.tipo) {
    case "usuario":
      return <BurbujaMensaje autor="usuario" texto={entrada.texto} />;
    case "asistente":
      return <BurbujaMensaje autor="asistente" texto={entrada.texto} />;
    case "herramienta":
      return <TarjetaHerramienta llamada={entrada.llamada} />;
    case "error":
      return (
        <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-900 dark:bg-rose-950 dark:text-rose-100">
          {entrada.texto}
        </p>
      );
  }
}

/**
 * Historial de la conversación: se anuncia a lectores de pantalla y se desplaza al último mensaje.
 * @param props - entradas del historial
 * @returns la lista
 */
export function ListaMensajes({ entradas }: PropiedadesListaMensajes) {
  const finRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entradas.length]);

  return (
    <ol role="log" aria-live="polite" aria-label="Conversación" className="flex flex-col gap-3">
      {entradas.map((entrada, indice) => (
        <li key={indice}>{renderizarEntrada(entrada)}</li>
      ))}
      <li ref={finRef} aria-hidden="true" />
    </ol>
  );
}
