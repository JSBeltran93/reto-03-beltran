import type { EntradaHistorial } from "@contratos/contratos-api";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Autor de una burbuja: los tipos de entrada del historial que son mensajes. */
export type AutorMensaje = Extract<EntradaHistorial["tipo"], "usuario" | "asistente">;

/** Props de {@link BurbujaMensaje}. */
export interface PropiedadesBurbujaMensaje {
  readonly autor: AutorMensaje;
  readonly texto: string;
}

const CLASE_TITULO = "my-1 font-semibold";

const componentesMarkdown: Components = {
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-slate-300 px-2 py-1 font-semibold dark:border-slate-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-slate-200 px-2 py-1 dark:border-slate-800">{children}</td>
  ),
  ul: ({ children }) => <ul className="my-1 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1 list-decimal pl-5">{children}</ol>,
  p: ({ children }) => <p className="my-1">{children}</p>,
  h1: ({ children }) => <p className={CLASE_TITULO}>{children}</p>,
  h2: ({ children }) => <p className={CLASE_TITULO}>{children}</p>,
  h3: ({ children }) => <p className={CLASE_TITULO}>{children}</p>,
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-slate-100 p-2 text-xs dark:bg-slate-800">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-100 px-1 font-mono text-xs break-all dark:bg-slate-800">
      {children}
    </code>
  ),
};

/**
 * Un mensaje del chat. Las respuestas del agente se muestran como Markdown
 * (con tablas) sin permitir HTML crudo; el texto largo se corta para no desbordar en móvil.
 * @param props - autor y texto
 * @returns la burbuja del mensaje
 */
export function BurbujaMensaje({ autor, texto }: PropiedadesBurbujaMensaje) {
  if (autor === "usuario") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-4 py-2 text-sm whitespace-pre-wrap text-white [overflow-wrap:anywhere]">
          {texto}
        </p>
      </div>
    );
  }
  return (
    <div className="max-w-full rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm [overflow-wrap:anywhere] dark:border-slate-800 dark:bg-slate-900">
      <Markdown remarkPlugins={[remarkGfm]} components={componentesMarkdown}>
        {texto}
      </Markdown>
    </div>
  );
}
