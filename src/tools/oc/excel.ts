/**
 * Lectura de libros `.xlsx` para `oc_leer_excel` (PRD §6.2, P1 opcional).
 * La ruta queda confinada a `fixtures/`: se rechazan rutas absolutas, segmentos `..`
 * y enlaces simbólicos, y el libro solo se lee si su ruta real sigue dentro de esa carpeta.
 */
import { lstatSync, readFileSync, realpathSync, type Stats } from "node:fs";
import path from "node:path";

import readXlsxFile from "read-excel-file/node";

import { exito, fallo, type Resultado } from "../../comun/resultado";
import { CARPETA_FIXTURES } from "../../comun/rutas";
import { EXTENSION_EXCEL, MAX_BYTES_EXCEL, MAX_FILAS_EXCEL } from "./constantes";

/** Valor de una celda tal como se devuelve al modelo (las fechas, en ISO). */
export type ValorCelda = string | number | boolean | null;

/** Fila de datos indexada por el encabezado de cada columna. */
export type FilaExcel = Readonly<Record<string, ValorCelda>>;

/** Primera hoja del libro, con la primera fila como encabezados. */
export interface LibroExcel {
  /** Ruta relativa a la raíz del proyecto. */
  readonly ruta: string;
  /** Nombre de la hoja leída (la primera del libro). */
  readonly hoja: string;
  readonly columnas: readonly string[];
  readonly filas: readonly FilaExcel[];
  /** `true` si el libro tenía más de `MAX_FILAS_EXCEL` filas de datos y se recortó. */
  readonly truncado: boolean;
}

const SEGMENTO_PADRE = "..";
const SEPARADORES_RUTA = /[\\/]/;
const PREFIJO_COLUMNA_SIN_NOMBRE = "columna_";
const LARGO_FECHA_ISO = "YYYY-MM-DD".length;
const ACCION_RUTA = `Indica una ruta relativa a la raíz del proyecto dentro de ${CARPETA_FIXTURES}/, terminada en ${EXTENSION_EXCEL}.`;

const rutaNoPermitida = (mensaje: string): Resultado<never> =>
  fallo("RUTA_NO_PERMITIDA", mensaje, ACCION_RUTA);

/** `true` si `destino` está estrictamente dentro de `base` (ambas absolutas). */
function estaDentro(base: string, destino: string): boolean {
  const relativa = path.relative(base, destino);
  return (
    relativa !== "" && !path.isAbsolute(relativa) && relativa.split(path.sep)[0] !== SEGMENTO_PADRE
  );
}

function validarForma(raiz: string, ruta: string): Resultado<string> {
  if (path.isAbsolute(ruta) || ruta.split(SEPARADORES_RUTA).includes(SEGMENTO_PADRE)) {
    return rutaNoPermitida(
      `La ruta "${ruta}" no es válida: no se aceptan rutas absolutas ni "..".`,
    );
  }
  if (path.extname(ruta).toLowerCase() !== EXTENSION_EXCEL) {
    return rutaNoPermitida(`Solo se leen libros ${EXTENSION_EXCEL}; "${ruta}" no lo es.`);
  }
  const absoluta = path.resolve(raiz, ruta);
  if (!estaDentro(path.resolve(raiz, CARPETA_FIXTURES), absoluta)) {
    return rutaNoPermitida(`La ruta "${ruta}" está fuera de ${CARPETA_FIXTURES}/.`);
  }
  return exito(absoluta);
}

function estadoDe(absoluta: string): Stats | null {
  try {
    return lstatSync(absoluta);
  } catch {
    return null;
  }
}

/**
 * Resuelve la ruta pedida por el modelo a un archivo real dentro de `fixtures/`.
 * @param raiz - raíz del proyecto (`ctx.directory`)
 * @param ruta - ruta relativa a la raíz, p. ej. `fixtures/compras/solicitud.xlsx`
 * @returns ruta real del libro, o RUTA_NO_PERMITIDA / ARCHIVO_INEXISTENTE / EXCEL_INVALIDO
 */
export function resolverRutaExcel(raiz: string, ruta: string): Resultado<string> {
  const forma = validarForma(raiz, ruta);
  if (!forma.ok) return forma;
  const estado = estadoDe(forma.data);
  if (estado?.isSymbolicLink()) {
    return rutaNoPermitida(`La ruta "${ruta}" es un enlace simbólico; no se siguen enlaces.`);
  }
  if (!estado?.isFile()) {
    return fallo("ARCHIVO_INEXISTENTE", `No existe el archivo "${ruta}".`, ACCION_RUTA);
  }
  const real = realpathSync(forma.data);
  if (!estaDentro(realpathSync(path.resolve(raiz, CARPETA_FIXTURES)), real)) {
    return rutaNoPermitida(`La ruta "${ruta}" sale de ${CARPETA_FIXTURES}/ a través de un enlace.`);
  }
  if (estado.size > MAX_BYTES_EXCEL) {
    return fallo("EXCEL_INVALIDO", `El archivo "${ruta}" supera el tamaño máximo permitido.`);
  }
  return exito(real);
}

function aValorCelda(valor: unknown): ValorCelda {
  if (valor instanceof Date) {
    const iso = valor.toISOString();
    const esSoloFecha = valor.getUTCHours() + valor.getUTCMinutes() + valor.getUTCSeconds() === 0;
    return esSoloFecha ? iso.slice(0, LARGO_FECHA_ISO) : iso;
  }
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number" || typeof valor === "boolean") return valor;
  return null;
}

function nombrarColumnas(encabezados: readonly unknown[]): string[] {
  const usados = new Set<string>();
  return encabezados.map((celda, indice) => {
    const texto = aValorCelda(celda);
    const base =
      texto === null || texto === "" ? `${PREFIJO_COLUMNA_SIN_NOMBRE}${indice + 1}` : String(texto);
    const nombre = usados.has(base) ? `${base}_${indice + 1}` : base;
    usados.add(nombre);
    return nombre;
  });
}

function aFila(columnas: readonly string[], celdas: readonly unknown[]): FilaExcel {
  return Object.fromEntries(columnas.map((columna, i) => [columna, aValorCelda(celdas[i])]));
}

/**
 * Convierte los datos crudos de una hoja en filas con encabezados; omite las filas vacías.
 * @param ruta - ruta relativa pedida
 * @param hoja - nombre de la hoja
 * @param datos - filas crudas de la hoja (la primera son los encabezados)
 * @returns el libro normalizado
 */
export function normalizarHoja(
  ruta: string,
  hoja: string,
  datos: readonly (readonly unknown[])[],
): LibroExcel {
  const [encabezados = [], ...resto] = datos;
  const columnas = nombrarColumnas(encabezados);
  const filas = resto
    .map((celdas) => aFila(columnas, celdas))
    .filter((fila) => Object.values(fila).some((valor) => valor !== null && valor !== ""));
  return {
    ruta: path.normalize(ruta),
    hoja,
    columnas,
    filas: filas.slice(0, MAX_FILAS_EXCEL),
    truncado: filas.length > MAX_FILAS_EXCEL,
  };
}

/**
 * Lee la primera hoja de un libro `.xlsx` dentro de `fixtures/`.
 * @param raiz - raíz del proyecto (`ctx.directory`)
 * @param ruta - ruta relativa a la raíz
 * @returns filas con encabezados, o un error de dominio legible (nunca lanza)
 */
export async function leerExcel(raiz: string, ruta: string): Promise<Resultado<LibroExcel>> {
  const real = resolverRutaExcel(raiz, ruta);
  if (!real.ok) return real;
  try {
    const [primera] = await readXlsxFile(readFileSync(real.data));
    if (!primera) return fallo("EXCEL_INVALIDO", `El libro "${ruta}" no tiene hojas.`);
    return exito(normalizarHoja(ruta, primera.sheet, primera.data as unknown[][]));
  } catch {
    return fallo(
      "EXCEL_INVALIDO",
      `No se pudo leer "${ruta}" como libro de Excel.`,
      `Verifica que el archivo sea un ${EXTENSION_EXCEL} válido y no esté protegido.`,
    );
  }
}
