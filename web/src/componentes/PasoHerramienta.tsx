import type { VistaLlamada } from "@contratos/contratos-api";

import { etiquetaPaso } from "../estado/herramientas";
import { casoDeLlamada } from "../estado/resultados";
import { TONOS } from "./clases";
import { IconoEquis, IconoVerificado } from "./Iconos";
import { TEXTOS_HERRAMIENTA } from "./textos";

/** Props de {@link PasoHerramienta}. */
export interface PropiedadesPasoHerramienta {
  readonly llamada: VistaLlamada;
}

function IconoEstado({ ok }: { readonly ok: boolean }) {
  return (
    <span
      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${TONOS[ok ? "exito" : "peligro"]}`}
    >
      <span className="sr-only">
        {ok ? TEXTOS_HERRAMIENTA.correcta : TEXTOS_HERRAMIENTA.conError}
      </span>
      {ok ? <IconoVerificado className="size-3.5" /> : <IconoEquis className="size-3.5" />}
    </span>
  );
}

function BloqueJson({ valor }: { readonly valor: unknown }) {
  return (
    <pre className="mt-1 max-h-80 overflow-auto rounded-xl bg-elevada p-3 font-mono break-all whitespace-pre-wrap">
      {JSON.stringify(valor, null, 2)}
    </pre>
  );
}

/**
 * "Ver detalle" plegable (PRD §6.1, CA4): la herramienta que se llamó, el caso, los
 * argumentos y el resultado completo en JSON. El nombre técnico se asoma en el resumen.
 * @param props - la llamada
 * @returns los detalles
 */
function DetalleTecnico({ llamada }: PropiedadesPasoHerramienta) {
  const caso = casoDeLlamada(llamada);
  return (
    <details className="mt-1 text-xs">
      <summary className="anillo-foco inline-flex cursor-pointer items-center gap-2 rounded py-1 text-texto-suave hover:text-texto">
        <span>{TEXTOS_HERRAMIENTA.detalles}</span>
        <code className="font-mono text-[0.6875rem] opacity-80">
          {llamada.nombre}
          {caso && ` · ${caso}`}
        </code>
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
 * Un paso del agente (PRD §6.1), siempre visible: estado y qué hizo en lenguaje natural,
 * con el resultado resumido como texto secundario; la herramienta técnica, el caso, los
 * argumentos y los datos quedan en "Ver detalle".
 * @param props - la llamada
 * @returns el paso
 */
export function PasoHerramienta({ llamada }: PropiedadesPasoHerramienta) {
  const etiqueta = etiquetaPaso(llamada.nombre);
  return (
    <div role="group" aria-label={etiqueta} className="flex gap-3">
      <IconoEstado ok={llamada.ok} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-6 font-medium">{etiqueta}</p>
        <p className="text-xs leading-5 text-texto-suave wrap-anywhere">{llamada.resumen}</p>
        <DetalleTecnico llamada={llamada} />
      </div>
    </div>
  );
}
