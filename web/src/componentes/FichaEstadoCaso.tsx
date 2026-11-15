import { type EstadoCaso, ESTADOS_CASO } from "@contratos/contratos-api";

import { CLASES, type Tono, TONOS } from "./clases";
import { TEXTOS_BANDEJA } from "./textos";

/** Ícono, texto y tono de cada estado: el estado nunca depende solo del color. */
const PRESENTACION_ESTADO: Readonly<
  Record<EstadoCaso, { icono: string; texto: string; tono: Tono }>
> = {
  [ESTADOS_CASO.creada]: { icono: "✅", texto: "Creada", tono: "exito" },
  [ESTADOS_CASO.pendiente]: { icono: "⚠️", texto: "Pendiente", tono: "aviso" },
  [ESTADOS_CASO.bloqueada]: { icono: "⛔", texto: "Bloqueada", tono: "peligro" },
  [ESTADOS_CASO.sinProcesar]: { icono: "○", texto: "Sin procesar", tono: "neutro" },
};

/**
 * Ficha con el estado de un caso en la bandeja (ícono + texto).
 * @param props - estado del caso
 * @returns la ficha
 */
export function FichaEstadoCaso({ estado }: { readonly estado: EstadoCaso }) {
  const { icono, texto, tono } = PRESENTACION_ESTADO[estado];
  return (
    <span className={`${CLASES.ficha} ${TONOS[tono]} shrink-0`}>
      <span className="sr-only">{TEXTOS_BANDEJA.estado}</span>
      <span aria-hidden="true">{icono}</span>
      {texto}
    </span>
  );
}
