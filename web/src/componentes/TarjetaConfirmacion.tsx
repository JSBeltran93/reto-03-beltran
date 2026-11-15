import type { Hallazgo } from "../estado/resultados";
import { CLASES } from "./clases";
import { FichaHallazgo } from "./ResultadoValidacion";
import { TEXTOS_CONFIRMACION } from "./textos";

/** Identificador del título de la tarjeta (lo usa `aria-labelledby`). */
const ID_TITULO = "titulo-confirmacion";

/** Props de {@link TarjetaConfirmacion}. */
export interface PropiedadesTarjetaConfirmacion {
  /** Confirmaciones pendientes de la última validación (vacío si no hay datos). */
  readonly confirmaciones: readonly Hallazgo[];
  /** Deshabilita los botones mientras hay una petición en curso. */
  readonly deshabilitado: boolean;
  readonly alConfirmar: () => void;
  readonly alCancelar: () => void;
}

function BotonesConfirmacion({
  deshabilitado,
  alConfirmar,
  alCancelar,
}: Omit<PropiedadesTarjetaConfirmacion, "confirmaciones">) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={deshabilitado}
        onClick={alConfirmar}
        className={CLASES.botonPrimario}
      >
        {TEXTOS_CONFIRMACION.confirmar}
      </button>
      <button
        type="button"
        disabled={deshabilitado}
        onClick={alCancelar}
        className={CLASES.botonSecundario}
      >
        {TEXTOS_CONFIRMACION.cancelar}
      </button>
    </div>
  );
}

/**
 * Tarjeta destacada cuando el agente espera la confirmación del usuario (PRD §6.1, CA3):
 * lista lo que hay que confirmar con sus valores y ofrece "Confirmar y crear OC" o
 * "Cancelar", que se envían al agente como "Confirmo" o "Cancelar".
 * @param props - confirmaciones, acciones y estado deshabilitado
 * @returns la tarjeta
 */
export function TarjetaConfirmacion({
  confirmaciones,
  deshabilitado,
  alConfirmar,
  alCancelar,
}: PropiedadesTarjetaConfirmacion) {
  return (
    <section
      aria-labelledby={ID_TITULO}
      className="rounded-2xl border-2 border-aviso-borde bg-aviso-suave p-4 shadow-sm sm:p-5"
    >
      <h2 id={ID_TITULO} className="text-base font-semibold text-aviso">
        <span aria-hidden="true">⚠️ </span>
        {TEXTOS_CONFIRMACION.titulo}
      </h2>
      <p className="mt-1 text-sm text-texto">{TEXTOS_CONFIRMACION.ayuda}</p>
      {confirmaciones.length > 0 && (
        <ul className="mt-3 space-y-2">
          {confirmaciones.map((hallazgo) => (
            <FichaHallazgo key={hallazgo.regla} hallazgo={hallazgo} />
          ))}
        </ul>
      )}
      <BotonesConfirmacion
        deshabilitado={deshabilitado}
        alConfirmar={alConfirmar}
        alCancelar={alCancelar}
      />
    </section>
  );
}
