import { type EstadoCaso, ESTADOS_CASO } from "@contratos/contratos-api";
import type { ComponentType } from "react";

import { CLASES, type Tono, TONOS } from "./clases";
import { IconoAlerta, IconoBloqueo, IconoPendiente, IconoVerificado } from "./Iconos";
import { TEXTOS_SOLICITUDES } from "./textos";

/** Ícono, texto y tono de cada estado: el estado nunca depende solo del color. */
const PRESENTACION_ESTADO: Readonly<
  Record<EstadoCaso, { Icono: ComponentType<{ className?: string }>; texto: string; tono: Tono }>
> = {
  [ESTADOS_CASO.creada]: {
    Icono: IconoVerificado,
    texto: TEXTOS_SOLICITUDES.estados.creada,
    tono: "exito",
  },
  [ESTADOS_CASO.pendiente]: {
    Icono: IconoAlerta,
    texto: TEXTOS_SOLICITUDES.estados.pendiente,
    tono: "aviso",
  },
  [ESTADOS_CASO.bloqueada]: {
    Icono: IconoBloqueo,
    texto: TEXTOS_SOLICITUDES.estados.bloqueada,
    tono: "peligro",
  },
  [ESTADOS_CASO.sinProcesar]: {
    Icono: IconoPendiente,
    texto: TEXTOS_SOLICITUDES.estados.sinProcesar,
    tono: "neutro",
  },
};

/**
 * Ficha con el estado de una solicitud (ícono + texto).
 * @param props - estado del caso
 * @returns la ficha
 */
export function FichaEstadoCaso({ estado }: { readonly estado: EstadoCaso }) {
  const { Icono, texto, tono } = PRESENTACION_ESTADO[estado];
  return (
    <span className={`${CLASES.ficha} ${TONOS[tono]} shrink-0`}>
      <span className="sr-only">{TEXTOS_SOLICITUDES.estado}</span>
      <Icono className="size-3.5" />
      {texto}
    </span>
  );
}
