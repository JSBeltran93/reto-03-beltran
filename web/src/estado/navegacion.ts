import { useCallback, useState } from "react";

/** Paneles de la aplicación; en móvil se ve uno a la vez, en escritorio ambos. */
export const PANELES = { bandeja: "bandeja", conversacion: "conversacion" } as const;
/** Panel visible en móvil. */
export type Panel = (typeof PANELES)[keyof typeof PANELES];

/** Clases de visibilidad de cada panel. */
export interface ClasesPaneles {
  readonly bandeja: string;
  readonly conversacion: string;
}

/** En escritorio (≥ lg) ambos paneles se ven siempre; en móvil, solo el activo. */
const VISIBLE = "flex";
const OCULTO_EN_MOVIL = "hidden lg:flex";

/**
 * Visibilidad de la bandeja y la conversación según el panel activo en móvil.
 * @param panel - panel activo en móvil
 * @returns clases de Tailwind para cada panel
 */
export function clasesPaneles(panel: Panel): ClasesPaneles {
  return {
    bandeja: panel === PANELES.bandeja ? VISIBLE : OCULTO_EN_MOVIL,
    conversacion: panel === PANELES.conversacion ? VISIBLE : OCULTO_EN_MOVIL,
  };
}

/** Estado de navegación: caso seleccionado y panel activo en móvil. */
export interface Navegacion {
  readonly seleccionado: string | null;
  readonly panel: Panel;
  /** Selecciona un caso y, en móvil, abre la conversación. */
  readonly seleccionar: (caso: string) => void;
  /** En móvil, vuelve a la bandeja (conserva la selección). */
  readonly volver: () => void;
  /** En móvil, abre la conversación sin cambiar la selección (p. ej. si la bandeja no carga). */
  readonly abrirConversacion: () => void;
}

/**
 * Navegación entre la bandeja y la conversación. La bandeja es la primera pantalla.
 * @param inicial - caso seleccionado al montar (p. ej. el de la sesión restaurada)
 * @returns caso seleccionado, panel activo y acciones
 */
export function useNavegacion(inicial: string | null = null): Navegacion {
  const [seleccionado, setSeleccionado] = useState<string | null>(inicial);
  const [panel, setPanel] = useState<Panel>(PANELES.bandeja);
  const seleccionar = useCallback((caso: string) => {
    setSeleccionado(caso);
    setPanel(PANELES.conversacion);
  }, []);
  const volver = useCallback(() => {
    setPanel(PANELES.bandeja);
  }, []);
  const abrirConversacion = useCallback(() => {
    setPanel(PANELES.conversacion);
  }, []);
  return { seleccionado, panel, seleccionar, volver, abrirConversacion };
}
