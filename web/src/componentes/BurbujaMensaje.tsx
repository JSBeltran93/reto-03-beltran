import type { EntradaHistorial } from "@contratos/contratos-api";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { TEXTOS_ESTADO } from "./textos";

/** Autor de una burbuja: los tipos de entrada del historial que son mensajes. */
export type AutorMensaje = Extract<EntradaHistorial["tipo"], "usuario" | "asistente">;

/** Props de {@link BurbujaMensaje}. */
export interface PropiedadesBurbujaMensaje {
  readonly autor: AutorMensaje;
  readonly texto: string;
}

const CLASE_TITULO = "mt-5 mb-2 text-base font-semibold tracking-tight first:mt-0";

/** Elementos que el Markdown del agente no puede producir (se conserva su contenido). */
const ELEMENTOS_BLOQUEADOS = ["img"];

const componentesMarkdown: Components = {
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border border-borde bg-superficie">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-borde bg-elevada px-3 py-2 text-xs font-semibold text-texto-suave">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-t border-borde px-3 py-2 align-top first:font-medium">{children}</td>
  ),
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5">{children}</ol>,
  p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
  hr: () => <hr className="my-5 border-borde" />,
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
 * Un mensaje del chat: el del usuario como burbuja a la derecha; el del agente como texto
 * corrido con Markdown (con tablas) sin HTML crudo, dentro de su turno. El texto largo se
 * corta para no desbordar en móvil.
 * @param props - autor y texto
 * @returns el mensaje
 */
export function BurbujaMensaje({ autor, texto }: PropiedadesBurbujaMensaje) {
  if (autor === "usuario") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-3xl bg-elevada px-4 py-2.5 text-[0.9375rem] leading-6 whitespace-pre-wrap text-texto wrap-anywhere">
          <span className="sr-only">{TEXTOS_ESTADO.usuario}: </span>
          {texto}
        </p>
      </div>
    );
  }
  return (
    <div className="text-[0.9375rem] leading-7 wrap-anywhere">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={componentesMarkdown}
        disallowedElements={ELEMENTOS_BLOQUEADOS}
        unwrapDisallowed
      >
        {texto}
      </Markdown>
    </div>
  );
}
