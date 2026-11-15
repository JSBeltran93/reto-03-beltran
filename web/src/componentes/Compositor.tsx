import { EsquemaSolicitudChat } from "@contratos/contratos-api";
import { type KeyboardEvent, type SyntheticEvent, useEffect, useRef, useState } from "react";

import { TEXTOS_COMPOSITOR } from "./textos";

const CLASE_TEXTO =
  "min-h-12 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand aria-disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900";
const CLASE_BOTON =
  "rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";
const TECLA_ENVIAR = "Enter";
const FILAS_TEXTO = 2;

/** Largo máximo de un mensaje, tomado del contrato compartido de la API. */
const LARGO_MAXIMO_MENSAJE = EsquemaSolicitudChat.shape.message.maxLength ?? undefined;

/** Props de {@link Compositor}. */
export interface PropiedadesCompositor {
  readonly deshabilitado: boolean;
  readonly textoGuia: string;
  readonly alEnviar: (texto: string) => void;
}

/**
 * Estado del texto, teclado (Enter envía, Shift+Enter agrega una línea) y foco: el
 * campo vuelve a tener el foco cuando el agente termina de responder.
 * @param props - acción de envío y estado deshabilitado
 * @returns texto, actualizador, referencia al campo y manejadores
 */
function useCompositor({
  deshabilitado,
  alEnviar,
}: Pick<PropiedadesCompositor, "deshabilitado" | "alEnviar">) {
  const [texto, fijarTexto] = useState("");
  const campo = useRef<HTMLTextAreaElement>(null);
  const estabaDeshabilitado = useRef(deshabilitado);
  useEffect(() => {
    if (estabaDeshabilitado.current && !deshabilitado) campo.current?.focus();
    estabaDeshabilitado.current = deshabilitado;
  }, [deshabilitado]);
  const enviar = (): void => {
    const mensaje = texto.trim();
    if (!mensaje || deshabilitado) return;
    alEnviar(mensaje);
    fijarTexto("");
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
  return { texto, fijarTexto, campo, alPresionarTecla, alEnviarFormulario };
}

/**
 * Cuadro de mensaje del chat. Mientras el agente trabaja queda en solo lectura (no
 * deshabilitado) para no perder el foco del teclado.
 * @param props - acción de envío, texto guía y estado deshabilitado
 * @returns el formulario
 */
export function Compositor({ deshabilitado, textoGuia, alEnviar }: PropiedadesCompositor) {
  const { texto, fijarTexto, campo, alPresionarTecla, alEnviarFormulario } = useCompositor({
    deshabilitado,
    alEnviar,
  });
  return (
    <form onSubmit={alEnviarFormulario} className="flex items-end gap-2">
      <label htmlFor="mensaje" className="sr-only">
        {TEXTOS_COMPOSITOR.etiqueta}
      </label>
      <textarea
        id="mensaje"
        ref={campo}
        rows={FILAS_TEXTO}
        value={texto}
        readOnly={deshabilitado}
        aria-disabled={deshabilitado}
        maxLength={LARGO_MAXIMO_MENSAJE}
        placeholder={textoGuia}
        onChange={(evento) => {
          fijarTexto(evento.target.value);
        }}
        onKeyDown={alPresionarTecla}
        className={CLASE_TEXTO}
      />
      <button type="submit" disabled={deshabilitado || texto.trim() === ""} className={CLASE_BOTON}>
        {TEXTOS_COMPOSITOR.enviar}
      </button>
    </form>
  );
}
