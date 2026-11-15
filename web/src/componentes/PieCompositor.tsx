import { Compositor } from "./Compositor";
import { TEXTOS_COMPOSITOR } from "./textos";

/** Props de {@link PieCompositor}. */
export interface PropiedadesPieCompositor {
  readonly deshabilitado: boolean;
  /** true si el agente espera una confirmación (cambia el texto guía). */
  readonly esperandoConfirmacion: boolean;
  readonly alEnviar: (texto: string) => void;
}

/**
 * Pie fijo con el cuadro de mensaje.
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
    <footer className="sticky bottom-0 border-t border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <Compositor deshabilitado={deshabilitado} textoGuia={textoGuia} alEnviar={alEnviar} />
      </div>
    </footer>
  );
}
