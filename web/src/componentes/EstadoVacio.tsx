import { CLASES } from "./clases";
import { CASOS_RAPIDOS, mensajeCaso, MENSAJES_SUGERIDOS, TEXTOS_ESTADO_VACIO } from "./textos";

/** Identificador del título del estado vacío (lo usa `aria-labelledby`). */
const ID_TITULO = "titulo-vacio";

/** Props de {@link EstadoVacio}. */
export interface PropiedadesEstadoVacio {
  /** Envía el mensaje elegido. */
  readonly alElegir: (mensaje: string) => void;
}

/**
 * Bienvenida: qué hace el agente en tres pasos, accesos rápidos a los seis casos del
 * reto y mensajes sugeridos (incluido el del PRD §11).
 * @param props - acción al elegir un mensaje
 * @returns el estado vacío
 */
export function EstadoVacio({ alElegir }: PropiedadesEstadoVacio) {
  return (
    <section aria-labelledby={ID_TITULO} className={`${CLASES.tarjeta} p-6 sm:p-8`}>
      <h2 id={ID_TITULO} className="text-xl font-semibold">
        {TEXTOS_ESTADO_VACIO.titulo}
      </h2>
      <p className="mt-2 text-sm leading-6 text-texto-suave">{TEXTOS_ESTADO_VACIO.descripcion}</p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {TEXTOS_ESTADO_VACIO.pasos.map((paso, indice) => (
          <li key={paso} className="flex gap-3 rounded-xl bg-elevada p-3 text-sm">
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full bg-marca text-xs font-semibold text-sobre-marca"
            >
              {indice + 1}
            </span>
            {paso}
          </li>
        ))}
      </ol>
      <AccesosRapidos alElegir={alElegir} />
    </section>
  );
}

function AccesosRapidos({ alElegir }: PropiedadesEstadoVacio) {
  return (
    <>
      <h3 className="mt-6 text-sm font-semibold">{TEXTOS_ESTADO_VACIO.casos}</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {CASOS_RAPIDOS.map((caso) => (
          <li key={caso}>
            <button
              type="button"
              onClick={() => {
                alElegir(mensajeCaso(caso));
              }}
              className={`${CLASES.botonSecundario} rounded-full px-3 py-1.5 font-mono text-xs`}
            >
              {caso}
            </button>
          </li>
        ))}
      </ul>
      <h3 className="mt-6 text-sm font-semibold">{TEXTOS_ESTADO_VACIO.sugerencias}</h3>
      <ul className="mt-2 grid gap-2">
        {MENSAJES_SUGERIDOS.map((sugerencia) => (
          <li key={sugerencia}>
            <button
              type="button"
              onClick={() => {
                alElegir(sugerencia);
              }}
              className="anillo-foco w-full rounded-xl border border-borde bg-superficie px-4 py-3 text-left text-sm leading-6 transition-colors hover:border-marca hover:bg-marca-suave"
            >
              {sugerencia}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
