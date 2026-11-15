import { Compositor } from "./Compositor";
import { TEXTOS_COMPOSITOR } from "./textos";

/** Identificador del texto de ayuda del cuadro de mensaje. */
const ID_AYUDA = "ayuda-compositor";

/** Props de {@link PieCompositor}. */
export interface PropiedadesPieCompositor {
  readonly deshabilitado: boolean;
  /** true si el agente espera una confirmación (cambia el texto guía). */
  readonly esperandoConfirmacion: boolean;
  readonly alEnviar: (texto: string) => void;
}

/**
 * Pie fijo con el cuadro de mensaje y la ayuda de teclado asociada al campo.
 * @param props - estado y acción de envío
 * @returns el pie de página
 */
export function PieCompositor({
  deshabilitado,
  esperandoConfirmacion,
  alEnviar,
}: PropiedadesPieCompositor) {
  const textoGuia = esperandoConfirmacion
    ? TEXTOS_COMPOSITOR.esperandoConfirmacion
    : TEXTOS_COMPOSITOR.normal;
  return (
    <footer className="sticky bottom-0 border-t border-borde bg-fondo/95 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 pt-3 pb-4">
        <Compositor
          deshabilitado={deshabilitado}
          textoGuia={textoGuia}
          idAyuda={ID_AYUDA}
          alEnviar={alEnviar}
        />
        <p id={ID_AYUDA} className="mt-2 text-xs text-texto-suave">
          {TEXTOS_COMPOSITOR.ayuda}
        </p>
      </div>
    </footer>
  );
}
