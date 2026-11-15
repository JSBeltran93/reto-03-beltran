import { type RefObject, useEffect, useRef } from "react";

/** Consulta de medios del sistema para el movimiento reducido. */
const CONSULTA_MOVIMIENTO_REDUCIDO = "(prefers-reduced-motion: reduce)";

/**
 * Desplaza la vista hasta un marcador cada vez que cambian las dependencias
 * (mensajes nuevos, indicador, error o aviso de confirmación). Sin animación si el
 * usuario pidió movimiento reducido.
 * @param dependencias - valores que, al cambiar, obligan a mostrar el final
 * @returns referencia para el marcador del final de la conversación
 */
export function useDesplazarAlFinal(
  dependencias: readonly unknown[],
): RefObject<HTMLDivElement | null> {
  const marcadorFin = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reducido = window.matchMedia(CONSULTA_MOVIMIENTO_REDUCIDO).matches;
    marcadorFin.current?.scrollIntoView({ behavior: reducido ? "auto" : "smooth", block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- las dependencias las define quien llama
  }, dependencias);
  return marcadorFin;
}
