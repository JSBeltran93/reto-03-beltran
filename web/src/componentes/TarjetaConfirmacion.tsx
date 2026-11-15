import type { ResumenCaso } from "@contratos/contratos-api";

import type { Hallazgo } from "../estado/resultados";
import { CLASES } from "./clases";
import { formatearMonto } from "./formato";
import { IconoAlerta } from "./Iconos";
import { FichaHallazgo } from "./ResultadoValidacion";
import { TEXTOS_CONFIRMACION } from "./textos";

/** Identificador del título de la tarjeta (lo usa `aria-labelledby`). */
const ID_TITULO = "titulo-confirmacion";

/** Props de {@link TarjetaConfirmacion}. */
export interface PropiedadesTarjetaConfirmacion {
  /** Confirmaciones pendientes de la última validación (vacío si no hay datos). */
  readonly confirmaciones: readonly Hallazgo[];
  /** Caso cuya OC se confirma; sin él, el título es genérico. */
  readonly caso: string | null;
  /** Resumen del caso en la bandeja, para recordar qué se va a crear. */
  readonly resumen?: ResumenCaso | undefined;
  /** Deshabilita los botones mientras hay una petición en curso. */
  readonly deshabilitado: boolean;
  readonly alConfirmar: () => void;
  readonly alCancelar: () => void;
}

function BotonesConfirmacion({
  deshabilitado,
  alConfirmar,
  alCancelar,
}: Omit<PropiedadesTarjetaConfirmacion, "confirmaciones" | "caso" | "resumen">) {
  return (
    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        disabled={deshabilitado}
        onClick={alConfirmar}
        className={`${CLASES.botonPrimario} min-h-11`}
      >
        {TEXTOS_CONFIRMACION.confirmar}
      </button>
      <button
        type="button"
        disabled={deshabilitado}
        onClick={alCancelar}
        className={`${CLASES.botonSecundario} min-h-11`}
      >
        {TEXTOS_CONFIRMACION.cancelar}
      </button>
    </div>
  );
}

/** Qué se va a crear: descripción, proveedor y monto del caso. */
function ResumenConfirmacion({ resumen }: { readonly resumen: ResumenCaso }) {
  return (
    <p className="mt-1 text-sm text-texto-suave">
      {resumen.descripcion} · {resumen.proveedor} ·{" "}
      <span className="tabular-nums">{formatearMonto(resumen.valor_total, resumen.moneda)}</span>
    </p>
  );
}

/**
 * Pregunta de la tarjeta: con el número de solicitud si se conoce, si no con el caso.
 * @param props - caso y resumen
 * @returns el título
 */
function TituloConfirmacion({
  caso,
  resumen,
}: Pick<PropiedadesTarjetaConfirmacion, "caso" | "resumen">) {
  return (
    <h2
      id={ID_TITULO}
      className="flex items-center gap-2 text-lg font-semibold tracking-tight text-aviso"
    >
      <IconoAlerta className="size-5" />
      {caso === null
        ? TEXTOS_CONFIRMACION.titulo
        : TEXTOS_CONFIRMACION.tituloCaso(resumen?.solicitud_id ?? caso)}
    </h2>
  );
}

/**
 * Tarjeta destacada cuando el agente espera la confirmación del usuario (PRD §6.1, CA3):
 * lista lo que hay que confirmar con sus valores y ofrece "Sí, crear la OC" o
 * "No, cancelar", que se envían al agente como "Confirmo" o "Cancelar".
 * @param props - caso, confirmaciones, acciones y estado deshabilitado
 * @returns la tarjeta
 */
export function TarjetaConfirmacion({
  confirmaciones,
  caso,
  resumen,
  deshabilitado,
  alConfirmar,
  alCancelar,
}: PropiedadesTarjetaConfirmacion) {
  return (
    <section
      aria-labelledby={ID_TITULO}
      className="rounded-2xl border border-aviso-borde bg-aviso-suave p-5 shadow-elevada motion-safe:animate-aparecer sm:p-6"
    >
      <TituloConfirmacion caso={caso} resumen={resumen} />
      {resumen && <ResumenConfirmacion resumen={resumen} />}
      <p className="mt-3 text-sm font-medium text-texto">
        {confirmaciones.length > 0 ? TEXTOS_CONFIRMACION.ayuda : TEXTOS_CONFIRMACION.ayudaSinPuntos}
      </p>
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
