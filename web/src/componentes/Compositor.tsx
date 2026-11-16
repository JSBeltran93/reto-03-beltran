import { EsquemaSolicitudChat } from "@contratos/contratos-api";
import { type KeyboardEvent, type SyntheticEvent, useEffect, useRef, useState } from "react";

import { IconoEnviar } from "./Iconos";
import { TEXTOS_COMPOSITOR } from "./textos";

/** Caja redondeada del compositor; el anillo de foco se dibuja en la caja, no en el campo. */
const CLASE_CAJA =
  "flex items-end gap-2 rounded-[1.75rem] border border-borde-fuerte/40 bg-superficie py-2 pr-2 pl-5 shadow-elevada transition focus-within:border-marca focus-within:ring-2 focus-within:ring-anillo/30";
/** El campo crece con el texto (field-sizing) hasta un alto máximo y luego se desplaza. */
const CLASE_TEXTO =
  "max-h-48 min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-6 text-texto [field-sizing:content] outline-none placeholder:text-texto-suave aria-disabled:opacity-60";
const CLASE_BOTON =
  "anillo-foco grid size-10 shrink-0 place-items-center rounded-full bg-marca text-sobre-marca transition hover:bg-marca-fuerte disabled:cursor-not-allowed disabled:bg-elevada disabled:text-texto-suave";
const TECLA_ENVIAR = "Enter";
const FILAS_TEXTO = 1;

/** Largo máximo de un mensaje, tomado del contrato compartido de la API. */
const LARGO_MAXIMO_MENSAJE = EsquemaSolicitudChat.shape.message.maxLength ?? undefined;

/** Props de {@link Compositor}. */
export interface PropiedadesCompositor {
  readonly deshabilitado: boolean;
  readonly textoGuia: string;
  /** Id del texto de ayuda que describe el campo (atajos de teclado). */
  readonly idAyuda?: string;
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
export function Compositor({ deshabilitado, textoGuia, idAyuda, alEnviar }: PropiedadesCompositor) {
  const { texto, fijarTexto, campo, alPresionarTecla, alEnviarFormulario } = useCompositor({
    deshabilitado,
    alEnviar,
  });
  return (
    <form onSubmit={alEnviarFormulario} className={CLASE_CAJA}>
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
        aria-describedby={idAyuda}
        maxLength={LARGO_MAXIMO_MENSAJE}
        placeholder={textoGuia}
        onChange={(evento) => {
          fijarTexto(evento.target.value);
        }}
        onKeyDown={alPresionarTecla}
        className={CLASE_TEXTO}
      />
      <button
        type="submit"
        aria-label={TEXTOS_COMPOSITOR.enviar}
        disabled={deshabilitado || texto.trim() === ""}
        className={CLASE_BOTON}
      >
        <IconoEnviar className="size-5" />
      </button>
    </form>
  );
}
