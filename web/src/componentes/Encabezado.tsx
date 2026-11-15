import type { QueryStatus } from "@tanstack/react-query";

import { TEXTOS_ENCABEZADO } from "./textos";

/** Props de {@link Encabezado}. */
export interface PropiedadesEncabezado {
  /** Estado de la consulta de salud: cargando, con error o correcta. */
  readonly estadoSalud: QueryStatus;
  /** Modelo informado por el servidor cuando la salud es correcta. */
  readonly modelo: string | undefined;
  /** Deshabilita "Nueva sesión" mientras el agente trabaja. */
  readonly deshabilitado: boolean;
  /** Inicia una conversación nueva. */
  readonly alNuevaSesion: () => void;
}

/** Color del indicador y texto según el estado de la salud del servidor. */
const PRESENTACION_SALUD: Readonly<Record<QueryStatus, { color: string; texto: string }>> = {
  pending: { color: "bg-warn", texto: TEXTOS_ENCABEZADO.conectando },
  error: { color: "bg-danger", texto: TEXTOS_ENCABEZADO.sinServidor },
  success: { color: "bg-ok", texto: "" },
};

/**
 * Barra superior con el título, el estado del servidor y la acción "Nueva sesión".
 * @param props - estado de la salud, modelo y acción de nueva sesión
 * @returns el encabezado de la página
 */
export function Encabezado({
  estadoSalud,
  modelo,
  deshabilitado,
  alNuevaSesion,
}: PropiedadesEncabezado) {
  const presentacion = PRESENTACION_SALUD[estadoSalud];
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <h1 className="text-base font-semibold sm:text-lg">{TEXTOS_ENCABEZADO.titulo}</h1>
        <span className="ml-auto flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${presentacion.color}`} />
          {estadoSalud === "success" ? modelo : presentacion.texto}
        </span>
        <button
          type="button"
          onClick={alNuevaSesion}
          disabled={deshabilitado}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {TEXTOS_ENCABEZADO.nuevaSesion}
        </button>
      </div>
    </header>
  );
}
