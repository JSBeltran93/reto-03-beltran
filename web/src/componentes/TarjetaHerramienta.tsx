import type { VistaLlamada } from "@contratos/contratos-api";

import { etiquetaPaso } from "../estado/herramientas";
import { type ResultadoRico, resultadoRico } from "../estado/resultados";
import { TONOS } from "./clases";
import { TablaOrden, TarjetaOrdenCreada } from "./ResultadoOrden";
import { ResultadoValidacion } from "./ResultadoValidacion";
import { TEXTOS_HERRAMIENTA } from "./textos";

/** Props de {@link TarjetaHerramienta}. */
export interface PropiedadesTarjetaHerramienta {
  readonly llamada: VistaLlamada;
}

/**
 * Extracto corto de los argumentos para verlo sin expandir (p. ej. `caso: "sol-004"`).
 * @param args - argumentos de la llamada
 * @returns el extracto, o null si la llamada no tiene caso
 */
function extractoArgumentos(args: unknown): string | null {
  const caso = (args as { caso?: unknown } | null)?.caso;
  return typeof caso === "string" ? `caso: "${caso}"` : null;
}

function ResultadoEnriquecido({ resultado }: { readonly resultado: ResultadoRico }) {
  switch (resultado.tipo) {
    case "validacion":
      return <ResultadoValidacion datos={resultado.datos} />;
    case "payload":
      return <TablaOrden datos={resultado.datos} />;
    case "creacion":
      return <TarjetaOrdenCreada datos={resultado.datos} />;
  }
}

function IconoEstado({ ok }: { readonly ok: boolean }) {
  return (
    <span
      className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${TONOS[ok ? "exito" : "peligro"]}`}
    >
      <span className="sr-only">
        {ok ? TEXTOS_HERRAMIENTA.correcta : TEXTOS_HERRAMIENTA.conError}
      </span>
      <span aria-hidden="true">{ok ? "✓" : "✕"}</span>
    </span>
  );
}

/**
 * Paso de la línea de tiempo del turno (PRD §6.1): ícono de estado, nombre del paso,
 * herramienta, caso y resultado resumido; el resultado enriquecido (controles, OC o
 * creación) a la vista, y en los detalles el resultado completo y los argumentos.
 * @param props - la llamada
 * @returns el paso
 */
export function TarjetaHerramienta({ llamada }: PropiedadesTarjetaHerramienta) {
  const extracto = extractoArgumentos(llamada.args);
  const resultado = resultadoRico(llamada);
  return (
    <div
      role="group"
      aria-label={TEXTOS_HERRAMIENTA.etiqueta(llamada.nombre)}
      className="flex gap-3"
    >
      <IconoEstado ok={llamada.ok} />
      <div className="min-w-0 flex-1 space-y-2 pb-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold">{etiquetaPaso(llamada.nombre)}</span>
          <span className="font-mono text-xs text-texto-suave">{llamada.nombre}</span>
          {extracto && <span className="font-mono text-xs text-texto-suave">{extracto}</span>}
        </p>
        <p className="text-sm text-texto-suave wrap-anywhere">{llamada.resumen}</p>
        {resultado && <ResultadoEnriquecido resultado={resultado} />}
        <details className="text-xs">
          <summary className="anillo-foco w-fit cursor-pointer rounded text-texto-suave hover:text-texto">
            {TEXTOS_HERRAMIENTA.detalles}
          </summary>
          <p className="mt-2 font-semibold">{TEXTOS_HERRAMIENTA.resumen}</p>
          <p className="mb-2 wrap-anywhere">{llamada.resumen}</p>
          <p className="font-semibold">{TEXTOS_HERRAMIENTA.argumentos}</p>
          <pre className="mt-1 max-h-64 overflow-auto rounded-xl bg-elevada p-3 font-mono break-all whitespace-pre-wrap">
            {JSON.stringify(llamada.args, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
