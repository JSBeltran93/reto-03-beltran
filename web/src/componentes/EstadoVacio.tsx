import { CLASES } from "./clases";
import { TEXTOS_ESTADO_VACIO } from "./textos";

/** Identificador del título del estado vacío (lo usa `aria-labelledby`). */
const ID_TITULO = "titulo-vacio";

/**
 * Panel de conversación sin caso abierto: invita a elegir una solicitud de la bandeja
 * y explica en tres pasos qué hace el agente.
 * @returns el estado vacío
 */
export function EstadoVacio() {
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
    </section>
  );
}
