import type { EntradaHistorial } from "@contratos/contratos-api";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { CLASES } from "./clases";
import { TEXTOS_ENCABEZADO, TEXTOS_ESTADO } from "./textos";

/** Autor de una burbuja: los tipos de entrada del historial que son mensajes. */
export type AutorMensaje = Extract<EntradaHistorial["tipo"], "usuario" | "asistente">;

/** Props de {@link BurbujaMensaje}. */
export interface PropiedadesBurbujaMensaje {
  readonly autor: AutorMensaje;
  readonly texto: string;
}

const CLASE_TITULO = "mt-3 mb-1 text-sm font-semibold first:mt-0";

/** Elementos que el Markdown del agente no puede producir (se conserva su contenido). */
const ELEMENTOS_BLOQUEADOS = ["img"];

const componentesMarkdown: Components = {
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-borde">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="bg-elevada px-3 py-2 text-xs font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-t border-borde px-3 py-2 align-top">{children}</td>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  h1: ({ children }) => <p className={CLASE_TITULO}>{children}</p>,
  h2: ({ children }) => <p className={CLASE_TITULO}>{children}</p>,
  h3: ({ children }) => <p className={CLASE_TITULO}>{children}</p>,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-xl bg-elevada p-3 text-xs">{children}</pre>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="anillo-foco rounded text-info underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-elevada px-1 font-mono text-xs break-all">{children}</code>
  ),
};

/**
 * Un mensaje del chat: el del usuario como burbuja a la derecha; el del agente como
 * tarjeta con su etiqueta y Markdown (con tablas) sin HTML crudo. El texto largo se
 * corta para no desbordar en móvil.
 * @param props - autor y texto
 * @returns el mensaje
 */
export function BurbujaMensaje({ autor, texto }: PropiedadesBurbujaMensaje) {
  if (autor === "usuario") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-marca px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap text-sobre-marca wrap-anywhere">
          <span className="sr-only">{TEXTOS_ESTADO.usuario}: </span>
          {texto}
        </p>
      </div>
    );
  }
  return (
    <article className={`${CLASES.tarjeta} px-4 py-3 text-sm leading-6 wrap-anywhere`}>
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-texto-suave">
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-full bg-marca-suave text-xs font-bold text-info"
        >
          {TEXTOS_ENCABEZADO.sigla}
        </span>
        {TEXTOS_ESTADO.agente}
      </p>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={componentesMarkdown}
        disallowedElements={ELEMENTOS_BLOQUEADOS}
        unwrapDisallowed
      >
        {texto}
      </Markdown>
    </article>
  );
}
