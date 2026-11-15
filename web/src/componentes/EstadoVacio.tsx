import { CLASES } from "./clases";
import { IconoDestello } from "./Iconos";
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
    <section aria-labelledby={ID_TITULO} className={`${CLASES.tarjeta} p-6 sm:p-10`}>
      <span className="grid size-11 place-items-center rounded-2xl bg-marca-suave text-info">
        <IconoDestello className="size-6" />
      </span>
      <h2 id={ID_TITULO} className="mt-4 text-2xl font-semibold tracking-tight">
        {TEXTOS_ESTADO_VACIO.titulo}
      </h2>
      <p className="mt-2 max-w-prose text-base leading-7 text-texto-suave">
        {TEXTOS_ESTADO_VACIO.descripcion}
      </p>
      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {TEXTOS_ESTADO_VACIO.pasos.map((paso, indice) => (
          <li key={paso} className="flex gap-3 rounded-2xl bg-elevada p-4 text-sm leading-6">
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-marca text-xs font-semibold text-sobre-marca"
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
