import type { QueryStatus } from "@tanstack/react-query";
import type { ComponentType } from "react";

import { CLASES, type Tono, TONOS } from "./clases";
import { IconoMas, IconoSolicitudes } from "./Iconos";
import { TEXTOS_ENCABEZADO } from "./textos";

/** Props de {@link Encabezado}. */
export interface PropiedadesEncabezado {
  /** Estado de la consulta de salud: cargando, con error o correcta. */
  readonly estadoSalud: QueryStatus;
  /** Modelo informado por el servidor cuando la salud es correcta. */
  readonly modelo: string | undefined;
  /** Deshabilita "Nueva conversación" mientras el agente trabaja. */
  readonly deshabilitado: boolean;
  /** Inicia una conversación nueva. */
  readonly alNuevaSesion: () => void;
  /** true si la última respuesta indicó que la clave del modelo falta o no es válida. */
  readonly claveInvalida?: boolean;
  /** Abre el panel de solicitudes (si no se da, no se muestra el botón). */
  readonly alAbrirSolicitudes?: () => void;
  /** true mientras el panel de solicitudes está abierto. */
  readonly solicitudesAbiertas?: boolean;
}

/** Botón discreto de la barra: solo ícono en móvil, ícono y texto desde `sm`. */
const CLASE_BOTON_BARRA =
  "anillo-foco inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-medium text-texto transition-colors hover:bg-elevada disabled:cursor-not-allowed disabled:opacity-50 sm:px-3";

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
    <p title={detalle} className={`${CLASES.ficha} ${TONOS[tono]}`}>
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
      <span className="sr-only">{TEXTOS_ENCABEZADO.estadoServidor}</span>
      <span className="sr-only sm:not-sr-only">{texto}</span>
    </p>
  );
}

/** Props de {@link BotonBarra}. */
interface PropiedadesBotonBarra {
  readonly texto: string;
  readonly Icono: ComponentType<{ className?: string }>;
  readonly alPulsar: () => void;
  readonly deshabilitado?: boolean;
  /** Si se da, el botón abre algo y anuncia si está abierto (`aria-expanded`). */
  readonly expandido?: boolean;
}

/**
 * Botón de la barra con nombre accesible: en móvil solo el ícono, desde `sm` también el texto.
 * @param props - texto, ícono, acción y estado
 * @returns el botón
 */
function BotonBarra({ texto, Icono, alPulsar, deshabilitado, expandido }: PropiedadesBotonBarra) {
  return (
    <button
      type="button"
      onClick={alPulsar}
      disabled={deshabilitado}
      aria-expanded={expandido}
      aria-label={texto}
      className={CLASE_BOTON_BARRA}
    >
      <Icono className="size-5" />
      <span className="hidden sm:inline">{texto}</span>
    </button>
  );
}

/** Sigla y nombre del producto. */
function Marca() {
  return (
    <div className="flex min-w-0 items-center gap-2.5 px-1">
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-marca text-xs font-bold tracking-tight text-sobre-marca"
      >
        {TEXTOS_ENCABEZADO.sigla}
      </span>
      <h1 className="truncate text-[0.9375rem] font-semibold tracking-tight">
        {TEXTOS_ENCABEZADO.titulo}
      </h1>
    </div>
  );
}

/**
 * Barra superior: "Solicitudes" (abre el panel lateral), marca del producto, estado del
 * servidor (texto, no solo color) y "Nueva conversación". En móvil los botones son solo
 * íconos con nombre accesible.
 * @param props - estado de la salud, modelo y acciones
 * @returns el encabezado de la página
 */
export function Encabezado({
  estadoSalud,
  modelo,
  deshabilitado,
  alNuevaSesion,
  claveInvalida = false,
  alAbrirSolicitudes,
  solicitudesAbiertas = false,
}: PropiedadesEncabezado) {
  return (
    <header className="sticky top-0 z-20 h-(--alto-encabezado) border-b border-borde/70 bg-fondo/85 backdrop-blur">
      <div className="flex h-full items-center gap-1 px-2 sm:gap-2 sm:px-4">
        {alAbrirSolicitudes && (
          <BotonBarra
            texto={TEXTOS_ENCABEZADO.solicitudes}
            Icono={IconoSolicitudes}
            alPulsar={alAbrirSolicitudes}
            expandido={solicitudesAbiertas}
          />
        )}
        <Marca />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <EstadoServidor estadoSalud={estadoSalud} modelo={modelo} claveInvalida={claveInvalida} />
          <BotonBarra
            texto={TEXTOS_ENCABEZADO.nuevaSesion}
            Icono={IconoMas}
            alPulsar={alNuevaSesion}
            deshabilitado={deshabilitado}
          />
        </div>
      </div>
    </header>
  );
}
