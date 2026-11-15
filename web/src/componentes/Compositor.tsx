import { type KeyboardEvent, type SyntheticEvent, useState } from "react";

const CLASE_TEXTO =
  "min-h-12 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900";
const CLASE_BOTON =
  "rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";
const TECLA_ENVIAR = "Enter";
const FILAS_TEXTO = 2;

/** Props de {@link Compositor}. */
export interface PropiedadesCompositor {
  readonly deshabilitado: boolean;
  readonly textoGuia: string;
  readonly alEnviar: (texto: string) => void;
}

/**
 * Estado del texto y comportamiento del teclado: Enter envía, Shift+Enter agrega una línea.
 * @param props - acción de envío y estado deshabilitado
 * @returns texto, actualizador y manejadores de eventos
 */
function useCompositor({
  deshabilitado,
  alEnviar,
}: Pick<PropiedadesCompositor, "deshabilitado" | "alEnviar">) {
  const [texto, setTexto] = useState("");
  const enviar = (): void => {
    const mensaje = texto.trim();
    if (!mensaje || deshabilitado) return;
    alEnviar(mensaje);
    setTexto("");
  };
  const alPresionarTecla = (evento: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (evento.key === TECLA_ENVIAR && !evento.shiftKey) {
      evento.preventDefault();
      enviar();
    }
  };
  const alEnviarFormulario = (evento: SyntheticEvent): void => {
    evento.preventDefault();
    enviar();
  };
  return { texto, setTexto, alPresionarTecla, alEnviarFormulario };
}

/**
 * Cuadro de mensaje del chat.
 * @param props - acción de envío, texto guía y estado deshabilitado
 * @returns el formulario
 */
export function Compositor({ deshabilitado, textoGuia, alEnviar }: PropiedadesCompositor) {
  const { texto, setTexto, alPresionarTecla, alEnviarFormulario } = useCompositor({
    deshabilitado,
    alEnviar,
  });
  return (
    <form onSubmit={alEnviarFormulario} className="flex items-end gap-2">
      <label htmlFor="mensaje" className="sr-only">
        Mensaje para el agente
      </label>
      <textarea
        id="mensaje"
        rows={FILAS_TEXTO}
        value={texto}
        disabled={deshabilitado}
        placeholder={textoGuia}
        onChange={(evento) => {
          setTexto(evento.target.value);
        }}
        onKeyDown={alPresionarTecla}
        className={CLASE_TEXTO}
      />
      <button type="submit" disabled={deshabilitado || texto.trim() === ""} className={CLASE_BOTON}>
        Enviar
      </button>
    </form>
  );
}
