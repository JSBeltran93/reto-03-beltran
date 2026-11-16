import type { VistaLlamada } from "@contratos/contratos-api";

import { resumirArgumentos } from "../estado/argumentos";
import { etiquetaPaso } from "../estado/herramientas";
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
      className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${TONOS[ok ? "exito" : "peligro"]}`}
    >
      <span className="sr-only">
        {ok ? TEXTOS_HERRAMIENTA.correcta : TEXTOS_HERRAMIENTA.conError}
      </span>
      {ok ? <IconoVerificado className="size-3" /> : <IconoEquis className="size-3" />}
    </span>
  );
}

function BloqueJson({ titulo, valor }: { readonly titulo: string; readonly valor: unknown }) {
  return (
    <>
      <p className="mt-2 font-semibold text-texto">{titulo}</p>
      <pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-elevada p-3 font-mono text-[0.6875rem] leading-5 break-all whitespace-pre-wrap">
        {JSON.stringify(valor, null, 2)}
      </pre>
    </>
  );
}

/**
 * Nombre técnico de la herramienta con sus argumentos, como una llamada de código:
 * `oc_leer_paquete(caso: "sol-004")`. Los objetos grandes se resumen con sus claves.
 * @param props - la llamada
 * @returns la línea de código
 */
function LineaLlamada({ llamada }: PropiedadesPasoHerramienta) {
  const argumentos = resumirArgumentos(llamada.args);
  return (
    <p className="font-mono text-xs leading-5 wrap-break-word text-texto-suave">
      <code className="font-semibold text-texto">{llamada.nombre}</code>
      <span aria-hidden="true">(</span>
      <span className="sr-only">{` ${TEXTOS_HERRAMIENTA.argumentos}: `}</span>
      {argumentos.length > 0 ? argumentos.join(", ") : TEXTOS_HERRAMIENTA.sinArgumentos}
      <span aria-hidden="true">)</span>
    </p>
  );
}

/**
 * Un paso del agente (PRD §6.1, CA4), siempre visible: estado, qué hizo en lenguaje
 * natural, la herramienta con sus argumentos y el resultado resumido. El JSON completo de
 * argumentos y respuesta queda en "Ver JSON".
 * @param props - la llamada
 * @returns el paso
 */
export function PasoHerramienta({ llamada }: PropiedadesPasoHerramienta) {
  const etiqueta = etiquetaPaso(llamada.nombre);
  return (
    <div role="group" aria-label={etiqueta} className="flex gap-3 px-3 py-2.5 sm:px-4">
      <IconoEstado ok={llamada.ok} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm leading-5 font-medium">{etiqueta}</p>
        <LineaLlamada llamada={llamada} />
        <details className="group text-xs">
          <summary className="anillo-foco flex cursor-pointer list-none gap-2 rounded leading-5 [&::-webkit-details-marker]:hidden">
            <span
              className={`min-w-0 wrap-anywhere ${llamada.ok ? "text-texto-suave" : "text-peligro"}`}
            >
              <span className="sr-only">{TEXTOS_HERRAMIENTA.resultado}</span>
              <span aria-hidden="true">→ </span>
              {llamada.resumen}
            </span>
            <span className="ml-auto shrink-0 font-medium text-info group-open:underline">
              {TEXTOS_HERRAMIENTA.detalles}
            </span>
          </summary>
          <BloqueJson titulo={TEXTOS_HERRAMIENTA.argumentos} valor={llamada.args} />
          {llamada.datos !== undefined && (
            <BloqueJson titulo={TEXTOS_HERRAMIENTA.datos} valor={llamada.datos} />
          )}
        </details>
      </div>
    </div>
  );
}
