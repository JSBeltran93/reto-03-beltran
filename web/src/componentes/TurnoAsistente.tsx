import type { VistaLlamada } from "@contratos/contratos-api";
import type { ReactNode } from "react";

import { resultadosDelTurno } from "../estado/resultados";
import type { RespuestaTurno } from "../estado/turnos";
import { AvisoError } from "./AvisoError";
import { BurbujaMensaje } from "./BurbujaMensaje";
import { TONOS } from "./clases";
import { IconoDestello } from "./Iconos";
import { PasoHerramienta } from "./PasoHerramienta";
import { DocumentoOrden, TarjetaOrdenCreada } from "./ResultadoOrden";
import { TEXTOS_ESTADO, TEXTOS_HERRAMIENTA } from "./textos";

/** Props de {@link TurnoAsistente}. */
export interface PropiedadesTurnoAsistente {
  readonly llamadas: readonly VistaLlamada[];
  readonly respuesta: RespuestaTurno | null;
  /** Reintento: si se da y la respuesta es un error, el error ofrece "Reintentar". */
  readonly alReintentar?: (() => void) | undefined;
}

/** Ícono del asistente al inicio de cada turno suyo (desde `sm`; en móvil se gana ancho). */
export function AvatarAsistente() {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 hidden size-7 shrink-0 place-items-center rounded-full bg-marca text-sobre-marca shadow-suave sm:grid"
    >
      <IconoDestello className="size-4" />
    </span>
  );
}

/**
 * Fila de un turno del asistente: avatar a la izquierda y el contenido en la columna.
 * @param props - etiqueta accesible y contenido
 * @returns la fila
 */
export function FilaAsistente({
  etiqueta,
  children,
}: {
  readonly etiqueta: string;
  readonly children: ReactNode;
}) {
  return (
    <article aria-label={etiqueta} className="flex gap-3 sm:gap-4">
      <AvatarAsistente />
      <div className="min-w-0 flex-1 space-y-4">{children}</div>
    </article>
  );
}

/**
 * Actividad del turno (PRD §6.1, CA4): cada llamada a herramienta, siempre visible, con su
 * nombre, argumentos y resultado resumido.
 * @param props - llamadas del turno
 * @returns la lista de actividad
 */
function Actividad({ llamadas }: { readonly llamadas: readonly VistaLlamada[] }) {
  return (
    <section
      aria-label={TEXTOS_HERRAMIENTA.pasos}
      className="overflow-hidden rounded-xl border border-borde bg-superficie"
    >
      <h3 className="flex items-center justify-between gap-2 border-b border-borde bg-elevada/60 px-3 py-2 text-xs font-medium text-texto-suave sm:px-4">
        {TEXTOS_HERRAMIENTA.pasos}
        <span className="font-normal">{TEXTOS_HERRAMIENTA.conteo(llamadas.length)}</span>
      </h3>
      <ol className="divide-y divide-borde">
        {llamadas.map((llamada, indice) => (
          <li key={indice}>
            <PasoHerramienta llamada={llamada} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function Respuesta({
  respuesta,
  alReintentar,
}: Pick<PropiedadesTurnoAsistente, "respuesta" | "alReintentar">) {
  if (respuesta === null) return null;
  if (respuesta.tipo === "asistente")
    return <BurbujaMensaje autor="asistente" texto={respuesta.texto} />;
  if (alReintentar) return <AvisoError mensaje={respuesta.texto} alReintentar={alReintentar} />;
  return (
    <p className={`rounded-xl px-4 py-3 text-sm wrap-anywhere ${TONOS.peligro}`}>
      {respuesta.texto}
    </p>
  );
}

/**
 * Un turno del asistente: primero lo que hizo (herramientas), luego su respuesta en
 * Markdown y, debajo, la OC como documento y la creación si las hubo en el turno.
 * @param props - llamadas, respuesta y reintento
 * @returns el turno
 */
export function TurnoAsistente({ llamadas, respuesta, alReintentar }: PropiedadesTurnoAsistente) {
  const { orden, creacion } = resultadosDelTurno(llamadas);
  return (
    <FilaAsistente etiqueta={TEXTOS_ESTADO.agente}>
      {llamadas.length > 0 && <Actividad llamadas={llamadas} />}
      <Respuesta respuesta={respuesta} alReintentar={alReintentar} />
      {orden && <DocumentoOrden datos={orden} />}
      {creacion && <TarjetaOrdenCreada datos={creacion} />}
    </FilaAsistente>
  );
}
