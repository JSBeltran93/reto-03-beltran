import type { ComponentType } from "react";

import type { DatosValidacion, Hallazgo } from "../estado/resultados";
import { CLASES, type Tono, TONOS } from "./clases";
import { formatearValorHallazgo } from "./formato";
import { IconoAlerta, IconoBloqueo, IconoInfo, IconoVerificado } from "./Iconos";
import { etiquetaValor, TEXTOS_VALIDACION } from "./textos";

/** Ícono y tono de cada tipo de hallazgo; el tipo también se dice con texto. */
const PRESENTACION_HALLAZGO: Readonly<
  Record<Hallazgo["tipo"], { Icono: ComponentType<{ className?: string }>; tono: Tono }>
> = {
  bloqueo: { Icono: IconoBloqueo, tono: "peligro" },
  confirmacion: { Icono: IconoAlerta, tono: "aviso" },
  derivado: { Icono: IconoInfo, tono: "info" },
};

/**
 * Valores con los que se evaluó la regla, con etiqueta legible y formato de pesos,
 * porcentaje o fecha según el valor.
 * @param props - valores del hallazgo
 * @returns la lista de valores
 */
function ValoresHallazgo({ valores }: { readonly valores: NonNullable<Hallazgo["valores"]> }) {
  return (
    <dl
      aria-label={TEXTOS_VALIDACION.valores}
      className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg bg-superficie/60 px-3 py-2"
    >
      {Object.entries(valores).map(([clave, valor]) => (
        <div key={clave} className="contents">
          <dt className="text-texto-suave">{etiquetaValor(clave)}</dt>
          <dd className="font-medium text-texto tabular-nums wrap-anywhere">
            {formatearValorHallazgo(clave, valor)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Ficha de un hallazgo: primero qué pasa en lenguaje natural; debajo, el efecto (texto
 * accesible) y el código de la regla como etiqueta pequeña; luego valores y qué hacer.
 * @param props - el hallazgo
 * @returns la ficha
 */
export function FichaHallazgo({ hallazgo }: { readonly hallazgo: Hallazgo }) {
  const { Icono, tono } = PRESENTACION_HALLAZGO[hallazgo.tipo];
  return (
    <li className={`flex gap-3 rounded-xl px-3 py-3 text-sm sm:px-4 ${TONOS[tono]}`}>
      <Icono className="mt-0.5 size-4" />
      <div className="min-w-0 flex-1">
        <p className="leading-6 font-medium text-texto wrap-anywhere">{hallazgo.detalle}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium">
          {TEXTOS_VALIDACION.tipos[hallazgo.tipo]}
          <span className={CLASES.etiquetaTecnica} title={TEXTOS_VALIDACION.regla(hallazgo.regla)}>
            {hallazgo.regla}
          </span>
        </p>
        {hallazgo.valores && Object.keys(hallazgo.valores).length > 0 && (
          <ValoresHallazgo valores={hallazgo.valores} />
        )}
        {hallazgo.accion_sugerida && (
          <p className="mt-2 leading-6 text-texto">
            <span className="font-semibold">{TEXTOS_VALIDACION.accion}</span>
            {hallazgo.accion_sugerida}
          </p>
        )}
      </div>
    </li>
  );
}

/**
 * Resultado de `oc_validar`: veredicto (apta o no), aviso de OC retroactiva y una
 * ficha por bloqueo, confirmación o valor completado.
 * @param props - datos de la validación
 * @returns el resultado
 */
export function ResultadoValidacion({ datos }: { readonly datos: DatosValidacion }) {
  const hallazgos = [...datos.bloqueos, ...datos.confirmaciones, ...(datos.informativos ?? [])];
  const Veredicto = datos.apta ? IconoVerificado : IconoBloqueo;
  return (
    <div className="space-y-3">
      <p className={`${CLASES.ficha} ${TONOS[datos.apta ? "exito" : "peligro"]} text-sm`}>
        <Veredicto className="size-4" />
        {datos.apta ? TEXTOS_VALIDACION.apta : TEXTOS_VALIDACION.noApta}
      </p>
      {datos.retroactiva && (
        <p className={`flex gap-2 rounded-xl px-3 py-2.5 text-sm leading-6 ${TONOS.aviso}`}>
          <IconoAlerta className="mt-1 size-4" />
          {TEXTOS_VALIDACION.retroactiva}
        </p>
      )}
      {hallazgos.length > 0 && (
        <ul aria-label={TEXTOS_VALIDACION.controles} className="space-y-2">
          {hallazgos.map((hallazgo) => (
            <FichaHallazgo key={`${hallazgo.regla}-${hallazgo.tipo}`} hallazgo={hallazgo} />
          ))}
        </ul>
      )}
    </div>
  );
}
