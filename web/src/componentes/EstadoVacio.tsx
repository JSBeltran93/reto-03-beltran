import { MENSAJES_SUGERIDOS, TEXTOS_ESTADO_VACIO } from "./textos";

/** Props de {@link EstadoVacio}. */
export interface PropiedadesEstadoVacio {
  /** Envía el mensaje sugerido elegido. */
  readonly alElegir: (sugerencia: string) => void;
}

/**
 * Panel de bienvenida con mensajes sugeridos.
 * @param props - acción al elegir una sugerencia
 * @returns el estado vacío
 */
export function EstadoVacio({ alElegir }: PropiedadesEstadoVacio) {
  return (
    <section className="py-10 text-center" aria-labelledby="titulo-vacio">
      <h2 id="titulo-vacio" className="text-lg font-semibold">
        {TEXTOS_ESTADO_VACIO.titulo}
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {TEXTOS_ESTADO_VACIO.descripcion}
      </p>
      <ul className="mt-6 grid gap-2 text-left">
        {MENSAJES_SUGERIDOS.map((sugerencia) => (
          <li key={sugerencia}>
            <button
              type="button"
              onClick={() => {
                alElegir(sugerencia);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm hover:border-brand focus-visible:outline-2 focus-visible:outline-brand dark:border-slate-800 dark:bg-slate-900"
            >
              {sugerencia}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
