import { useEffect, useRef } from "react";

import { IconoEquis } from "./Iconos";
import { ListaSolicitudes, type PropiedadesListaSolicitudes } from "./ListaSolicitudes";
import { TEXTOS_SOLICITUDES } from "./textos";

/** Identificador del título del panel (lo usa `aria-labelledby`). */
const ID_TITULO = "titulo-solicitudes";
const TECLA_CERRAR = "Escape";

/** Props de {@link PanelSolicitudes}. */
export interface PropiedadesPanelSolicitudes extends PropiedadesListaSolicitudes {
  readonly abierto: boolean;
  /** Cierra el panel (debe ser estable: se registra como manejador de Escape). */
  readonly alCerrar: () => void;
}

/**
 * Al abrir: lleva el foco al botón de cerrar y escucha Escape; al cerrar, devuelve el foco
 * a donde estaba (el botón "Solicitudes").
 * @param abierto - si el panel está abierto
 * @param alCerrar - cierra el panel
 * @returns referencia para el botón de cerrar
 */
function useFocoDelPanel(abierto: boolean, alCerrar: () => void) {
  const botonCerrar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    botonCerrar.current?.focus();
    const alTecla = (evento: KeyboardEvent): void => {
      if (evento.key === TECLA_CERRAR) alCerrar();
    };
    document.addEventListener("keydown", alTecla);
    return () => {
      document.removeEventListener("keydown", alTecla);
      previo?.focus();
    };
  }, [abierto, alCerrar]);
  return botonCerrar;
}

/** Título del panel con el número de solicitudes, si ya se cargaron. */
function TituloPanel({ total }: { readonly total: number | undefined }) {
  return (
    <h2 id={ID_TITULO} className="text-base font-semibold tracking-tight">
      {TEXTOS_SOLICITUDES.titulo}
      {total !== undefined && (
        <span className="ml-2 text-sm font-normal text-texto-suave">
          {TEXTOS_SOLICITUDES.conteo(total)}
        </span>
      )}
    </h2>
  );
}

/**
 * Panel lateral "Solicitudes" (diálogo modal plegable, en móvil y escritorio): la lista de
 * solicitudes con su estado. Se cierra con la equis, con Escape o tocando fuera.
 * @param props - si está abierto, cómo cerrarlo y los datos de la lista
 * @returns el panel, o nada si está cerrado
 */
export function PanelSolicitudes({ abierto, alCerrar, ...lista }: PropiedadesPanelSolicitudes) {
  const botonCerrar = useFocoDelPanel(abierto, alCerrar);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-30">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={alCerrar}
        className="absolute inset-0 size-full cursor-default bg-black/40 motion-safe:animate-aparecer"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ID_TITULO}
        className="absolute inset-y-0 left-0 flex w-[min(24rem,88vw)] flex-col border-r border-borde bg-superficie shadow-elevada motion-safe:animate-deslizar"
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <TituloPanel total={lista.casos?.length} />
          <button
            ref={botonCerrar}
            type="button"
            onClick={alCerrar}
            aria-label={TEXTOS_SOLICITUDES.cerrar}
            className="anillo-foco -mr-2 grid size-11 place-items-center rounded-xl text-texto-suave hover:bg-elevada hover:text-texto"
          >
            <IconoEquis className="size-5" />
          </button>
        </div>
        <p className="px-4 pb-3 text-xs leading-5 text-texto-suave">{TEXTOS_SOLICITUDES.ayuda}</p>
        <div className="flex-1 overflow-y-auto border-t border-borde p-2">
          <ListaSolicitudes {...lista} />
        </div>
      </div>
    </div>
  );
}
