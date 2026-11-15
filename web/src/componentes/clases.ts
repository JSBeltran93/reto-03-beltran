/**
 * Clases de Tailwind compartidas por varios componentes, construidas solo con los
 * tokens semánticos de `estilos.css` (nunca con la paleta cruda).
 */
export const CLASES = {
  tarjeta: "rounded-2xl border border-borde bg-superficie shadow-suave",
  botonPrimario:
    "anillo-foco inline-flex items-center justify-center gap-2 rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-sobre-marca shadow-suave transition hover:bg-marca-fuerte hover:shadow-elevada active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
  botonSecundario:
    "anillo-foco inline-flex items-center justify-center gap-2 rounded-xl border border-borde-fuerte bg-superficie px-4 py-2.5 text-sm font-medium text-texto transition hover:bg-elevada active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
  botonIcono:
    "anillo-foco inline-grid size-11 shrink-0 place-items-center rounded-xl border border-borde-fuerte bg-superficie text-texto transition-colors hover:bg-elevada disabled:cursor-not-allowed disabled:opacity-50",
  ficha: "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
  textoSuave: "text-texto-suave",
  /** Etiqueta pequeña y discreta para códigos técnicos (p. ej. la regla RC5). */
  etiquetaTecnica:
    "inline-flex items-center rounded-md border border-borde-fuerte/40 px-1.5 py-px font-mono text-[0.6875rem] leading-4 font-medium text-texto-suave",
} as const;

/** Estilo de cada estado semántico: fondo suave, texto y borde. */
export const TONOS = {
  exito: "bg-exito-suave text-exito",
  aviso: "bg-aviso-suave text-aviso",
  peligro: "bg-peligro-suave text-peligro",
  info: "bg-info-suave text-info",
  neutro: "bg-elevada text-texto-suave",
} as const;

/** Uno de los tonos semánticos. */
export type Tono = keyof typeof TONOS;
