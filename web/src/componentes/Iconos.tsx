import type { ReactNode } from "react";

/** Props comunes de los íconos: tamaño por clases de Tailwind. */
interface PropiedadesIcono {
  readonly className?: string;
}

/**
 * Lienzo común de 20 × 20 con trazo redondeado; siempre decorativo (`aria-hidden`):
 * el significado lo da el texto que lo acompaña.
 * @param props - clases y trazos del ícono
 * @returns el SVG
 */
function Lienzo({ className = "size-4", children }: PropiedadesIcono & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

/**
 * Marca de verificación.
 * @param props - clases
 * @returns el ícono
 */
export function IconoVerificado(props: PropiedadesIcono) {
  return (
    <Lienzo {...props}>
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </Lienzo>
  );
}

/**
 * Equis (error o cierre).
 * @param props - clases
 * @returns el ícono
 */
export function IconoEquis(props: PropiedadesIcono) {
  return (
    <Lienzo {...props}>
      <path d="m5.5 5.5 9 9m0-9-9 9" />
    </Lienzo>
  );
}

/**
 * Triángulo de advertencia (requiere atención).
 * @param props - clases
 * @returns el ícono
 */
export function IconoAlerta(props: PropiedadesIcono) {
  return (
    <Lienzo {...props}>
      <path d="M8.6 3.6a1.6 1.6 0 0 1 2.8 0l6 10.6a1.6 1.6 0 0 1-1.4 2.3H4a1.6 1.6 0 0 1-1.4-2.3Z" />
      <path d="M10 8v3.2m0 2.6v.1" />
    </Lienzo>
  );
}

/**
 * Círculo tachado (bloqueado).
 * @param props - clases
 * @returns el ícono
 */
export function IconoBloqueo(props: PropiedadesIcono) {
  return (
    <Lienzo {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="m5.2 5.2 9.6 9.6" />
    </Lienzo>
  );
}

/**
 * Círculo con "i" (informativo).
 * @param props - clases
 * @returns el ícono
 */
export function IconoInfo(props: PropiedadesIcono) {
  return (
    <Lienzo {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 9.2v4.3m0-6.8v.1" />
    </Lienzo>
  );
}

/**
 * Círculo vacío (por revisar).
 * @param props - clases
 * @returns el ícono
 */
export function IconoPendiente(props: PropiedadesIcono) {
  return (
    <Lienzo {...props}>
      <circle cx="10" cy="10" r="6" strokeDasharray="2.5 2.5" />
    </Lienzo>
  );
}

/**
 * Flecha hacia la izquierda (volver).
 * @param props - clases
 * @returns el ícono
 */
export function IconoVolver(props: PropiedadesIcono) {
  return (
    <Lienzo {...props}>
      <path d="M16 10H4m5-5-5 5 5 5" />
    </Lienzo>
  );
}

/**
 * Más (nueva conversación).
 * @param props - clases
 * @returns el ícono
 */
export function IconoMas(props: PropiedadesIcono) {
  return (
    <Lienzo {...props}>
      <path d="M10 4.5v11M4.5 10h11" />
    </Lienzo>
  );
}

/**
 * Destellos (asistente trabajando o acción del asistente).
 * @param props - clases
 * @returns el ícono
 */
export function IconoDestello(props: PropiedadesIcono) {
  return (
    <Lienzo {...props}>
      <path d="M9 3.5 10.4 7.6 14.5 9l-4.1 1.4L9 14.5 7.6 10.4 3.5 9l4.1-1.4Z" />
      <path d="M15 13.5v3m-1.5-1.5h3" />
    </Lienzo>
  );
}
