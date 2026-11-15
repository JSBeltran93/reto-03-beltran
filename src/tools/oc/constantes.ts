/** Diferencia relativa máxima entre cotización y solicitud (RC5). */
export const TOLERANCIA_COTIZACION = 0.02;

/** Diferencia absoluta máxima entre cantidad × valor unitario y valor total (RC10). */
export const TOLERANCIA_TOTAL = 1;

/** Largo máximo del texto breve de una posición en SAP (PRD §7.4). */
export const MAX_DESCRIPCION_SAP = 40;

/** Las OC se numeran a partir de esta base (primera OC = 4500000001). */
export const BASE_NUMERO_OC = 4_500_000_000;

/** Código de sociedad de Periferia en SAP (PRD §7.4). */
export const SOCIEDAD = "1000";

/** Código de la organización de compras en SAP (PRD §7.4). */
export const ORGANIZACION_COMPRAS = "1000";

/** Número de la primera posición de una OC en SAP (10, 20, 30…). */
export const NUMERO_PRIMERA_POSICION = 10;

/** Regla que marca una OC como retroactiva (factura anterior a la solicitud). */
export const REGLA_RETROACTIVA = "RC8";

/** Extensión de los libros de Excel que acepta `oc_leer_excel`. */
export const EXTENSION_EXCEL = ".xlsx";

/** Tamaño máximo de un libro de Excel (5 MB): evita leer archivos desproporcionados. */
export const MAX_BYTES_EXCEL = 5 * 1024 * 1024;

/** Filas de datos máximas que devuelve `oc_leer_excel` (más allá se truncan). */
export const MAX_FILAS_EXCEL = 500;
