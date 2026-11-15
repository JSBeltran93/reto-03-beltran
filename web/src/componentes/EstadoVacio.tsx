import { PROMPTS_SUGERIDOS } from "./textos";

/** Props de {@link EstadoVacio}. */
export interface PropiedadesEstadoVacio {
  /** Envía el prompt elegido. */
  readonly alElegir: (prompt: string) => void;
}

/**
 * Panel de bienvenida con prompts sugeridos.
 * @param props - acción al elegir un prompt
 * @returns el estado vacío
 */
export function EstadoVacio({ alElegir }: PropiedadesEstadoVacio) {
  return (
    <section className="py-10 text-center" aria-labelledby="titulo-vacio">
      <h2 id="titulo-vacio" className="text-lg font-semibold">
        ¿Qué solicitud de compra procesamos?
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        El agente lee el paquete, valida los controles RC1–RC10 y crea la OC en SAP solo cuando
        corresponde.
      </p>
      <ul className="mt-6 grid gap-2 text-left">
        {PROMPTS_SUGERIDOS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => {
                alElegir(prompt);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm hover:border-brand focus-visible:outline-2 focus-visible:outline-brand dark:border-slate-800 dark:bg-slate-900"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
