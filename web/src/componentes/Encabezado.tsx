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

/** Presentación de la píldora cuando el servidor responde pero la clave del modelo falla. */
const PRESENTACION_CLAVE_INVALIDA = {
  tono: "aviso",
  texto: TEXTOS_ENCABEZADO.claveInvalida,
} as const;

/** Tono y texto de la píldora de estado según la salud del servidor. */
const PRESENTACION_SALUD: Readonly<Record<QueryStatus, { tono: Tono; texto: string }>> = {
  pending: { tono: "aviso", texto: TEXTOS_ENCABEZADO.conectando },
  error: { tono: "peligro", texto: TEXTOS_ENCABEZADO.sinServidor },
  success: { tono: "exito", texto: "" },
};

/**
 * Píldora con el estado del servidor (texto, no solo color): el modelo si todo está bien,
 * o el problema (conectando, sin servidor, clave del modelo inválida).
 * @param props - estado de la salud, modelo y si la clave falló
 * @returns la píldora
 */
function PildoraEstado({
  estadoSalud,
  modelo,
  claveInvalida,
}: Pick<PropiedadesEncabezado, "estadoSalud" | "modelo"> & { readonly claveInvalida: boolean }) {
  const conectado = estadoSalud === "success";
  const { tono, texto } =
    conectado && claveInvalida ? PRESENTACION_CLAVE_INVALIDA : PRESENTACION_SALUD[estadoSalud];
  return (
    <p className={`${CLASES.ficha} ${TONOS[tono]} ml-auto max-w-40 truncate`}>
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
      <span className="sr-only">{TEXTOS_ENCABEZADO.estadoServidor}</span>
      {conectado && !claveInvalida ? modelo : texto}
    </p>
  );
}

/**
 * Barra superior: marca y propósito del producto, píldora con el estado del servidor
 * (texto, no solo color) y la acción "Nueva sesión".
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
    <header className="sticky top-0 z-10 border-b border-borde bg-superficie/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca text-sm font-bold text-sobre-marca"
        >
          {TEXTOS_ENCABEZADO.sigla}
        </span>
        <div className="min-w-0">
          <h1 className="text-base leading-tight font-semibold">{TEXTOS_ENCABEZADO.titulo}</h1>
          <p className="truncate text-xs text-texto-suave">{TEXTOS_ENCABEZADO.subtitulo}</p>
        </div>
        <PildoraEstado estadoSalud={estadoSalud} modelo={modelo} claveInvalida={claveInvalida} />
        <button
          type="button"
          onClick={alNuevaSesion}
          disabled={deshabilitado}
          className={CLASES.botonSecundario}
        >
          {TEXTOS_ENCABEZADO.nuevaSesion}
        </button>
      </div>
    </header>
  );
}
