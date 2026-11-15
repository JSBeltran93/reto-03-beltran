import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

/** Props de {@link BurbujaMensaje}. */
export interface PropiedadesBurbujaMensaje {
  readonly autor: "usuario" | "asistente";
  readonly texto: string;
}

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
  code: ({ children }) => (
    <code className="rounded bg-slate-100 px-1 font-mono text-xs dark:bg-slate-800">
      {children}
    </code>
  ),
};

/**
 * Un mensaje del chat. Las respuestas del agente se muestran como Markdown
 * (con tablas) sin permitir HTML crudo.
 * @param props - autor y texto
 * @returns la burbuja del mensaje
 */
export function BurbujaMensaje({ autor, texto }: PropiedadesBurbujaMensaje) {
  if (autor === "usuario") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand px-4 py-2 text-sm text-white">
          {texto}
        </p>
      </div>
    );
  }
  return (
    <div className="max-w-full rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Markdown remarkPlugins={[remarkGfm]} components={componentesMarkdown}>
        {texto}
      </Markdown>
    </div>
  );
}
