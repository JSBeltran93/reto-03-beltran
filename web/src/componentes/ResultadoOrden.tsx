import { type DatosCreacion, type DatosPayload, totalOrden } from "../estado/resultados";
import { CLASES, TONOS } from "./clases";
import { formatearFecha, formatearNumero } from "./formato";
import { TEXTOS_ORDEN } from "./textos";

function textoExcepciones(datos: DatosPayload): string {
  const codigos = datos.orden.excepciones.map((e) => e.codigo);
  return codigos.length > 0 ? codigos.join(", ") : TEXTOS_ORDEN.sinExcepciones;
}

/**
 * Filas de la tabla de la OC propuesta, en el orden en que la analista las revisa.
 * @param datos - datos de `oc_construir_payload`
 * @returns pares etiqueta/valor
 */
function filasOrden(datos: DatosPayload): readonly (readonly [string, string])[] {
  const { orden } = datos;
  const [posicion] = orden.posiciones;
  const campos = TEXTOS_ORDEN.campos;
  if (!posicion) return [];
  return [
    [
      campos.proveedor,
      `${orden.proveedor.nombre} (SAP ${orden.proveedor.codigo_sap} · NIT ${orden.proveedor.nit})`,
    ],
    [campos.centro, `${posicion.centro_costo} / ${posicion.subarea}`],
    [campos.descripcion, posicion.descripcion],
    [campos.cantidad, `${formatearNumero(posicion.cantidad)} ${posicion.unidad}`],
    [campos.precio, `${orden.moneda} ${formatearNumero(posicion.precio_unitario)}`],
    [campos.iva, posicion.indicador_iva],
    [campos.condiciones, orden.condiciones_pago],
    [campos.aprobador, orden.aprobador.email],
    [campos.total, `${orden.moneda} ${formatearNumero(totalOrden(datos))}`],
    [campos.excepciones, textoExcepciones(datos)],
  ];
}

/**
 * Tabla de la OC tal como quedaría en SAP (resultado de `oc_construir_payload`).
 * @param props - datos del payload
 * @returns la tabla
 */
export function TablaOrden({ datos }: { readonly datos: DatosPayload }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-borde">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="bg-elevada px-3 py-2 text-left text-xs font-semibold">
          {TEXTOS_ORDEN.titulo}
        </caption>
        <tbody>
          {filasOrden(datos).map(([etiqueta, valor]) => (
            <tr key={etiqueta} className="border-t border-borde">
              <th
                scope="row"
                className="w-40 px-3 py-2 align-top text-xs font-medium text-texto-suave"
              >
                {etiqueta}
              </th>
              <td className="px-3 py-2 wrap-anywhere">{valor}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Tarjeta de éxito de `oc_crear`: número de OC, fecha y ruta de la evidencia (PRD §11).
 * @param props - datos de la creación
 * @returns la tarjeta
 */
export function TarjetaOrdenCreada({ datos }: { readonly datos: DatosCreacion }) {
  const titulo = datos.idempotente
    ? TEXTOS_ORDEN.existente(datos.numero_oc)
    : TEXTOS_ORDEN.creada(datos.numero_oc);
  return (
    <div className={`rounded-xl p-3 text-sm ${TONOS.exito}`}>
      <p className="text-base font-semibold">
        <span aria-hidden="true">✅ </span>
        {titulo}
      </p>
      <p className={`mt-1 ${CLASES.textoSuave}`}>
        {TEXTOS_ORDEN.fecha}
        <time dateTime={datos.fecha}>{formatearFecha(datos.fecha)}</time>
      </p>
      {datos.ruta_evidencia && (
        <p className="mt-1 text-texto wrap-anywhere">
          {TEXTOS_ORDEN.evidencia}
          <code className="font-mono text-xs">{datos.ruta_evidencia}</code>
        </p>
      )}
    </div>
  );
}
