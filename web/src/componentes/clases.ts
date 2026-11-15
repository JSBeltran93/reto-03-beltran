/**
 * Clases de Tailwind compartidas por varios componentes, construidas solo con los
 * tokens semánticos de `estilos.css` (nunca con la paleta cruda).
 */
export const CLASES = {
  tarjeta: "rounded-2xl border border-borde bg-superficie shadow-sm",
  botonPrimario:
    "anillo-foco inline-flex items-center justify-center rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-sobre-marca transition-colors hover:bg-marca-fuerte disabled:cursor-not-allowed disabled:opacity-50",
  botonSecundario:
    "anillo-foco inline-flex items-center justify-center rounded-xl border border-borde-fuerte bg-superficie px-4 py-2.5 text-sm font-medium text-texto transition-colors hover:bg-elevada disabled:cursor-not-allowed disabled:opacity-50",
  ficha: "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
  textoSuave: "text-texto-suave",
} as const;

/** Estilo de cada estado semántico: fondo suave, texto y borde. */
export const TONOS = {
  exito: "bg-exito-suave text-exito",
  aviso: "bg-aviso-suave text-aviso",
  peligro: "bg-peligro-suave text-peligro",
  info: "bg-info-suave text-info",
} as const;

/** Uno de los tonos semánticos. */
export type Tono = keyof typeof TONOS;
