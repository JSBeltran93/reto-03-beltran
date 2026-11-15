import type { VistaLlamada } from "@contratos/contratos-api";

import { etiquetaPaso } from "../estado/herramientas";
import { casoDeLlamada } from "../estado/resultados";
import { TONOS } from "./clases";
import { TEXTOS_HERRAMIENTA } from "./textos";

/** Props de {@link PasoHerramienta}. */
export interface PropiedadesPasoHerramienta {
  readonly llamada: VistaLlamada;
}

function IconoEstado({ ok }: { readonly ok: boolean }) {
  return (
    <span
      className={`grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold ${TONOS[ok ? "exito" : "peligro"]}`}
    >
      <span className="sr-only">
        {ok ? TEXTOS_HERRAMIENTA.correcta : TEXTOS_HERRAMIENTA.conError}
      </span>
      <span aria-hidden="true">{ok ? "✓" : "✕"}</span>
    </span>
  );
}

function BloqueJson({ valor }: { readonly valor: unknown }) {
  return (
    <pre className="mt-1 max-h-80 overflow-auto rounded-lg bg-elevada p-3 font-mono break-all whitespace-pre-wrap">
      {JSON.stringify(valor, null, 2)}
    </pre>
  );
}

/**
 * "Detalle técnico" plegable: argumentos y resultado completo en JSON.
 * @param props - la llamada
 * @returns los detalles
 */
function DetalleTecnico({ llamada }: PropiedadesPasoHerramienta) {
  return (
    <details className="mt-1 text-xs">
      <summary className="anillo-foco w-fit cursor-pointer rounded py-1 text-texto-suave hover:text-texto">
        {TEXTOS_HERRAMIENTA.detalles}
      </summary>
      <p className="mt-1 font-semibold">{TEXTOS_HERRAMIENTA.argumentos}</p>
      <BloqueJson valor={llamada.args} />
      {llamada.datos !== undefined && (
        <>
          <p className="mt-2 font-semibold">{TEXTOS_HERRAMIENTA.datos}</p>
          <BloqueJson valor={llamada.datos} />
        </>
      )}
    </details>
  );
}

/**
 * Un paso del agente (PRD §6.1), siempre visible: estado, nombre legible, herramienta
 * técnica, caso y resultado resumido; argumentos y datos en "Detalle técnico".
 * @param props - la llamada
 * @returns el paso
 */
export function PasoHerramienta({ llamada }: PropiedadesPasoHerramienta) {
  const caso = casoDeLlamada(llamada);
  return (
    <div
      role="group"
      aria-label={TEXTOS_HERRAMIENTA.etiqueta(llamada.nombre)}
      className="flex gap-3"
    >
      <IconoEstado ok={llamada.ok} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-medium">{etiquetaPaso(llamada.nombre)}</span>
          <span className="text-xs text-texto-suave">
            {llamada.nombre}
            {caso && ` · ${caso}`}
          </span>
        </p>
        <p className="text-sm text-texto-suave wrap-anywhere">{llamada.resumen}</p>
        <DetalleTecnico llamada={llamada} />
      </div>
    </div>
  );
}
