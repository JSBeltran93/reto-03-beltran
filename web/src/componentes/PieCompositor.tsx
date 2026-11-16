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
    <footer className="sticky bottom-0 z-10 bg-linear-to-t from-fondo from-70% to-transparent px-4 pt-6">
      <div className="mx-auto w-full max-w-(--ancho-chat) pb-3">
        <Compositor
          deshabilitado={deshabilitado}
          textoGuia={textoGuia}
          idAyuda={ID_AYUDA}
          alEnviar={alEnviar}
        />
        <p id={ID_AYUDA} className="mt-2 text-center text-xs text-texto-suave">
          {TEXTOS_COMPOSITOR.ayuda}
        </p>
      </div>
    </footer>
  );
}
