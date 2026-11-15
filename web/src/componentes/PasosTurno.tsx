import type { VistaLlamada } from "@contratos/contratos-api";

import { type ResultadoRico, resultadoRico } from "../estado/resultados";
import { CLASES } from "./clases";
import { PasoHerramienta } from "./PasoHerramienta";
import { DocumentoOrden, TarjetaOrdenCreada } from "./ResultadoOrden";
import { ResultadoValidacion } from "./ResultadoValidacion";
import { TEXTOS_HERRAMIENTA } from "./textos";

function ResultadoEnriquecido({ resultado }: { readonly resultado: ResultadoRico }) {
  switch (resultado.tipo) {
    case "validacion":
      return (
        <section
          aria-label={TEXTOS_HERRAMIENTA.validacion}
          className={`${CLASES.tarjeta} p-4 sm:p-5`}
        >
          <ResultadoValidacion datos={resultado.datos} />
        </section>
      );
    case "payload":
      return <DocumentoOrden datos={resultado.datos} />;
    case "creacion":
      return <TarjetaOrdenCreada datos={resultado.datos} />;
  }
}

/**
 * Lo que hizo el agente en un turno: la lista compacta de pasos (todas las llamadas,
 * visibles siempre) y, debajo, los resultados de negocio (controles, OC, creación).
 * @param props - llamadas del turno
 * @returns los pasos y sus resultados
 */
export function PasosTurno({ llamadas }: { readonly llamadas: readonly VistaLlamada[] }) {
  const resultados = llamadas.map(resultadoRico).filter((r) => r !== null);
  return (
    <div className="space-y-3">
      <section
        aria-label={TEXTOS_HERRAMIENTA.pasos}
        className="rounded-2xl border border-borde px-4 py-3"
      >
        <h3 className="mb-2 text-xs font-semibold text-texto-suave">{TEXTOS_HERRAMIENTA.pasos}</h3>
        <ol className="space-y-3">
          {llamadas.map((llamada, indice) => (
            <li key={indice}>
              <PasoHerramienta llamada={llamada} />
            </li>
          ))}
        </ol>
      </section>
      {resultados.map((resultado, indice) => (
        <ResultadoEnriquecido key={indice} resultado={resultado} />
      ))}
    </div>
  );
}
