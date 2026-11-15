import type { QueryStatus } from "@tanstack/react-query";

import { CLASES, type Tono, TONOS } from "./clases";
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
  /** true si la última respuesta indicó que la clave del modelo falta o no es válida. */
  readonly claveInvalida?: boolean;
}

/** Presentación del estado cuando el servidor responde pero la clave del modelo falla. */
const PRESENTACION_CLAVE_INVALIDA = {
  tono: "aviso",
  texto: TEXTOS_ENCABEZADO.claveInvalida,
} as const;

/** Tono y texto del estado según la salud del servidor. */
const PRESENTACION_SALUD: Readonly<Record<QueryStatus, { tono: Tono; texto: string }>> = {
  pending: { tono: "aviso", texto: TEXTOS_ENCABEZADO.conectando },
  error: { tono: "peligro", texto: TEXTOS_ENCABEZADO.sinServidor },
  success: { tono: "exito", texto: TEXTOS_ENCABEZADO.enLinea },
};

/**
 * Estado del servidor: punto de color más texto. En móvil el texto queda solo para
 * lectores de pantalla; el modelo se ve al pasar el puntero (no ocupa espacio).
 * @param props - estado de la salud, modelo y si la clave falló
 * @returns el indicador de estado
 */
function EstadoServidor({
  estadoSalud,
  modelo,
  claveInvalida,
}: Pick<PropiedadesEncabezado, "estadoSalud" | "modelo"> & { readonly claveInvalida: boolean }) {
  const conectado = estadoSalud === "success";
  const { tono, texto } =
    conectado && claveInvalida ? PRESENTACION_CLAVE_INVALIDA : PRESENTACION_SALUD[estadoSalud];
  const detalle = conectado && modelo ? TEXTOS_ENCABEZADO.modelo(modelo) : undefined;
  return (
    <p title={detalle} className={`${CLASES.ficha} ${TONOS[tono]} ml-auto`}>
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
      <span className="sr-only">{TEXTOS_ENCABEZADO.estadoServidor}</span>
      <span className="sr-only sm:not-sr-only">{texto}</span>
    </p>
  );
}

function IconoNuevaSesion() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path d="M10 4a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4H5a1 1 0 1 1 0-2h4V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

/**
 * Barra superior: marca del producto, estado del servidor (texto, no solo color) y
 * "Nueva sesión" (ícono con nombre accesible en móvil, botón con texto en escritorio).
 * @param props - estado de la salud, modelo y acción de nueva sesión
 * @returns el encabezado de la página
 */
export function Encabezado({
  estadoSalud,
  modelo,
  deshabilitado,
  alNuevaSesion,
  claveInvalida = false,
}: PropiedadesEncabezado) {
  return (
    <header className="sticky top-0 z-10 h-(--alto-encabezado) border-b border-borde bg-superficie/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-7xl items-center gap-3 px-4 lg:px-6">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca text-sm font-bold text-sobre-marca"
        >
          {TEXTOS_ENCABEZADO.sigla}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base leading-tight font-semibold">
            {TEXTOS_ENCABEZADO.titulo}
          </h1>
          <p className="hidden truncate text-xs text-texto-suave md:block">
            {TEXTOS_ENCABEZADO.subtitulo}
          </p>
        </div>
        <EstadoServidor estadoSalud={estadoSalud} modelo={modelo} claveInvalida={claveInvalida} />
        <button
          type="button"
          onClick={alNuevaSesion}
          disabled={deshabilitado}
          aria-label={TEXTOS_ENCABEZADO.nuevaSesion}
          className={`${CLASES.botonIcono} sm:inline-flex sm:w-auto sm:gap-1.5 sm:px-4 sm:text-sm sm:font-medium`}
        >
          <IconoNuevaSesion />
          <span className="hidden sm:inline">{TEXTOS_ENCABEZADO.nuevaSesion}</span>
        </button>
      </div>
    </header>
  );
}
