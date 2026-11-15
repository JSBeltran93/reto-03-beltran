import { type DatosCreacion, type DatosPayload, totalOrden } from "../estado/resultados";
import { CLASES, TONOS } from "./clases";
import { formatearFecha, formatearMonto, formatearNumero } from "./formato";
import { IconoVerificado } from "./Iconos";
import { TEXTOS_ORDEN } from "./textos";

type Orden = DatosPayload["orden"];

/** Celdas numéricas alineadas a la derecha con cifras tabulares. */
const CELDA_NUMERO = "px-3 py-2 text-right align-top tabular-nums whitespace-nowrap";
const CELDA_ENCABEZADO = "px-3 py-2 text-xs font-semibold text-texto-suave";

/**
 * Datos de cabecera de la OC, en el orden en que la analista los revisa.
 * @param orden - orden de `oc_construir_payload`
 * @returns pares etiqueta/valor (solo los que vienen en los datos)
 */
function camposCabecera(orden: Orden): readonly (readonly [string, string])[] {
  const campos = TEXTOS_ORDEN.campos;
  const filas: [string, string][] = [
    [
      campos.proveedor,
      `${orden.proveedor.nombre} · SAP ${orden.proveedor.codigo_sap} · NIT ${orden.proveedor.nit}`,
    ],
    [campos.aprobador, orden.aprobador.email],
    [campos.condiciones, orden.condiciones_pago],
    [TEXTOS_ORDEN.moneda, orden.moneda],
  ];
  if (orden.sociedad && orden.organizacion_compras) {
    filas.push([TEXTOS_ORDEN.sociedad, `${orden.sociedad} / ${orden.organizacion_compras}`]);
  }
  return filas;
}

type Posicion = Orden["posiciones"][number];

function FilaPosicion({
  posicion: p,
  moneda,
}: {
  readonly posicion: Posicion;
  readonly moneda: string;
}) {
  const { campos } = TEXTOS_ORDEN;
  return (
    <tr className="border-b border-borde">
      <td className="min-w-40 px-3 py-2 align-top">
        <p className="wrap-anywhere">{p.descripcion}</p>
        <p className="mt-0.5 text-xs text-texto-suave">
          {campos.centro}: {p.centro_costo} / {p.subarea} · {campos.iva}: {p.indicador_iva}
        </p>
      </td>
      <td className={CELDA_NUMERO}>{`${formatearNumero(p.cantidad)} ${p.unidad}`}</td>
      <td className={CELDA_NUMERO}>{formatearMonto(p.precio_unitario, moneda)}</td>
      <td className={CELDA_NUMERO}>{formatearMonto(p.cantidad * p.precio_unitario, moneda)}</td>
    </tr>
  );
}

function TablaPosiciones({ orden }: { readonly orden: Orden }) {
  const { columnas } = TEXTOS_ORDEN;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{TEXTOS_ORDEN.posiciones}</caption>
        <thead>
          <tr className="border-b border-borde">
            <th scope="col" className={CELDA_ENCABEZADO}>
              {columnas.descripcion}
            </th>
            <th scope="col" className={`${CELDA_ENCABEZADO} text-right`}>
              {columnas.cantidad}
            </th>
            <th scope="col" className={`${CELDA_ENCABEZADO} text-right`}>
              {columnas.precio}
            </th>
            <th scope="col" className={`${CELDA_ENCABEZADO} text-right`}>
              {columnas.subtotal}
            </th>
          </tr>
        </thead>
        <tbody>
          {orden.posiciones.map((posicion, indice) => (
            <FilaPosicion key={indice} posicion={posicion} moneda={orden.moneda} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Excepciones({ orden }: { readonly orden: Orden }) {
  return (
    <div className="px-4 py-4 text-sm sm:px-6">
      <h4 className="text-xs font-semibold text-texto-suave">{TEXTOS_ORDEN.campos.excepciones}</h4>
      {orden.excepciones.length === 0 ? (
        <p className="mt-1">{TEXTOS_ORDEN.sinExcepciones}</p>
      ) : (
        <ul aria-label={TEXTOS_ORDEN.campos.excepciones} className="mt-2 space-y-1.5">
          {orden.excepciones.map((e) => (
            <li
              key={e.codigo}
              className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg px-3 py-2 ${TONOS.aviso}`}
            >
              <span className="text-texto">{e.detalle}</span>
              <span className={CLASES.etiquetaTecnica}>{e.codigo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * La OC como documento, tal como quedaría en SAP (resultado de `oc_construir_payload`):
 * cabecera con proveedor, aprobador y condiciones; posiciones; total y excepciones.
 * @param props - datos del payload
 * @returns el documento
 */
export function DocumentoOrden({ datos }: { readonly datos: DatosPayload }) {
  const { orden } = datos;
  return (
    <article aria-label={TEXTOS_ORDEN.titulo} className={`${CLASES.tarjeta} overflow-hidden`}>
      <header className="border-b border-borde bg-elevada px-4 py-4 sm:px-6">
        <h3 className="text-base font-semibold tracking-tight">{TEXTOS_ORDEN.titulo}</h3>
        <p className="mt-0.5 text-xs text-texto-suave">
          {TEXTOS_ORDEN.borrador}
          {orden.referencia && ` · ${TEXTOS_ORDEN.referencia} ${orden.referencia.solicitud_id}`}
        </p>
      </header>
      <dl className="grid gap-x-6 gap-y-3 px-4 py-4 text-sm sm:grid-cols-2 sm:px-6">
        {camposCabecera(orden).map(([etiqueta, valor]) => (
          <div key={etiqueta} className="min-w-0">
            <dt className="text-xs text-texto-suave">{etiqueta}</dt>
            <dd className="wrap-anywhere">{valor}</dd>
          </div>
        ))}
      </dl>
      <TablaPosiciones orden={orden} />
      <p className="flex items-baseline justify-between gap-3 border-b border-borde px-4 py-4 sm:px-6">
        <span className="text-sm font-semibold">{TEXTOS_ORDEN.campos.total}</span>
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {formatearMonto(totalOrden(datos), orden.moneda)}
        </span>
      </p>
      <Excepciones orden={orden} />
    </article>
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
    <div className={`rounded-2xl p-5 text-sm shadow-suave ${TONOS.exito}`}>
      <p className="flex items-center gap-2 text-base font-semibold">
        <IconoVerificado className="size-5" />
        {titulo}
      </p>
      <p className={`mt-1 ${CLASES.textoSuave}`}>
        {TEXTOS_ORDEN.fecha}
        <time dateTime={datos.fecha}>{formatearFecha(datos.fecha)}</time>
      </p>
      {datos.ruta_evidencia && (
        <p className="mt-1 text-texto wrap-anywhere">
          {TEXTOS_ORDEN.evidencia}
          <span className="font-medium">{datos.ruta_evidencia}</span>
        </p>
      )}
    </div>
  );
}
