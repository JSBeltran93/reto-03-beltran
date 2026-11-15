import type { DatosValidacion, Hallazgo } from "../estado/resultados";
import { CLASES, type Tono, TONOS } from "./clases";
import { TEXTOS_VALIDACION } from "./textos";

/** Ícono, tono y nombre accesible de cada tipo de hallazgo (no depende solo del color). */
const PRESENTACION_HALLAZGO: Readonly<Record<Hallazgo["tipo"], { icono: string; tono: Tono }>> = {
  bloqueo: { icono: "⛔", tono: "peligro" },
  confirmacion: { icono: "⚠️", tono: "aviso" },
  derivado: { icono: "ℹ️", tono: "info" },
};

/**
 * Ficha de un hallazgo: regla, tipo (texto accesible), detalle y acción sugerida.
 * @param props - el hallazgo
 * @returns la ficha
 */
export function FichaHallazgo({ hallazgo }: { readonly hallazgo: Hallazgo }) {
  const { icono, tono } = PRESENTACION_HALLAZGO[hallazgo.tipo];
  return (
    <li className={`rounded-xl px-3 py-2 text-sm ${TONOS[tono]}`}>
      <p className="font-semibold">
        <span aria-hidden="true">{icono} </span>
        {hallazgo.regla} · {TEXTOS_VALIDACION.tipos[hallazgo.tipo]}
      </p>
      <p className="mt-0.5 text-texto">{hallazgo.detalle}</p>
      {hallazgo.accion_sugerida && (
        <p className="mt-1 text-texto-suave">
          {TEXTOS_VALIDACION.accion}
          {hallazgo.accion_sugerida}
        </p>
      )}
    </li>
  );
}

/**
 * Resultado de `oc_validar`: veredicto (apta o no), aviso de OC retroactiva y una
 * ficha por bloqueo, confirmación o valor derivado.
 * @param props - datos de la validación
 * @returns el resultado
 */
export function ResultadoValidacion({ datos }: { readonly datos: DatosValidacion }) {
  const hallazgos = [...datos.bloqueos, ...datos.confirmaciones, ...(datos.informativos ?? [])];
  return (
    <div className="space-y-2">
      <p className={`${CLASES.ficha} ${TONOS[datos.apta ? "exito" : "peligro"]}`}>
        <span aria-hidden="true">{datos.apta ? "✅" : "⛔"}</span>
        {datos.apta ? TEXTOS_VALIDACION.apta : TEXTOS_VALIDACION.noApta}
      </p>
      {datos.retroactiva && (
        <p className={`rounded-xl px-3 py-2 text-sm ${TONOS.aviso}`}>
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
