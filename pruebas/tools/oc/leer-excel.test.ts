import { copyFileSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { catalogoOc, ejecutarLlamada } from "../../../src/agente/registro-herramientas";
import { leer_excel } from "../../../src/tools/oc";
import { MAX_FILAS_EXCEL } from "../../../src/tools/oc/constantes";
import { normalizarHoja } from "../../../src/tools/oc/excel";
import {
  contexto,
  crearProyectoTemporal,
  leerJsonTexto,
  RAIZ_PROYECTO,
} from "../../apoyo/proyecto";

/** Libro de ejemplo (dos solicitudes) generado con write-excel-file; nunca se escribe en fixtures/ real. */
const LIBRO_EJEMPLO = path.join(RAIZ_PROYECTO, "pruebas", "apoyo", "solicitudes.xlsx");
const RUTA_LIBRO = "fixtures/compras/solicitudes.xlsx";

interface RespuestaExcel {
  ok: boolean;
  data?: {
    hoja: string;
    columnas: string[];
    filas: Record<string, unknown>[];
    truncado: boolean;
  };
  error?: { codigo: string; mensaje: string };
}

/** Raíz temporal con el libro de ejemplo copiado en fixtures/compras/. */
function proyectoConLibro(): string {
  const raiz = crearProyectoTemporal();
  mkdirSync(path.join(raiz, "fixtures", "compras"), { recursive: true });
  copyFileSync(LIBRO_EJEMPLO, path.join(raiz, RUTA_LIBRO));
  return raiz;
}

const leer = async (raiz: string, ruta: string) =>
  leerJsonTexto(await leer_excel.execute({ ruta }, contexto(raiz))) as RespuestaExcel;

describe("oc_leer_excel", () => {
  it("devuelve las filas de la primera hoja con los encabezados como claves", async () => {
    const { ok, data } = await leer(proyectoConLibro(), RUTA_LIBRO);

    expect(ok).toBe(true);
    expect(data?.hoja).toBe("Solicitudes");
    expect(data?.truncado).toBe(false);
    expect(data?.columnas).toContain("valor_total");
    expect(data?.filas).toHaveLength(2);
    expect(data?.filas[0]).toMatchObject({
      solicitud_id: "SOL-2026-001",
      proveedor_nit: "900555111",
      cantidad: 120,
      valor_total: 11400000,
      fecha_solicitud: "2026-08-20",
    });
  });

  it("llega al catálogo del agente como oc_leer_excel con un resumen para el chat", async () => {
    const llamada = { id: "1", nombre: "oc_leer_excel", args: { ruta: RUTA_LIBRO } };

    const { vista } = await ejecutarLlamada(catalogoOc(), llamada, contexto(proyectoConLibro()));

    expect(vista).toMatchObject({ ok: true, resumen: "hoja Solicitudes · 2 filas" });
  });

  it("devuelve null en las celdas vacías", async () => {
    const { data } = await leer(proyectoConLibro(), RUTA_LIBRO);

    expect(data?.filas[1]).toMatchObject({ proveedor_nit: null, indicador_iva: null });
  });

  it.each([
    ["una ruta absoluta", () => path.join(RAIZ_PROYECTO, RUTA_LIBRO)],
    ["un segmento ..", () => "fixtures/../pruebas/apoyo/solicitudes.xlsx"],
    ["una ruta fuera de fixtures/", () => "pruebas/apoyo/solicitudes.xlsx"],
    ["un archivo que no es .xlsx", () => "fixtures/reto-03/maestros/proveedores.json"],
  ])("rechaza %s con RUTA_NO_PERMITIDA", async (_caso, ruta) => {
    const { ok, error } = await leer(proyectoConLibro(), ruta());

    expect(ok).toBe(false);
    expect(error?.codigo).toBe("RUTA_NO_PERMITIDA");
  });

  it("rechaza un enlace simbólico dentro de fixtures/ que apunta afuera", async () => {
    const raiz = proyectoConLibro();
    symlinkSync(LIBRO_EJEMPLO, path.join(raiz, "fixtures", "compras", "enlace.xlsx"));

    const { error } = await leer(raiz, "fixtures/compras/enlace.xlsx");

    expect(error?.codigo).toBe("RUTA_NO_PERMITIDA");
  });

  it("rechaza una carpeta enlazada que sale de fixtures/", async () => {
    const raiz = proyectoConLibro();
    symlinkSync(path.join(RAIZ_PROYECTO, "pruebas", "apoyo"), path.join(raiz, "fixtures", "fuera"));

    const { error } = await leer(raiz, "fixtures/fuera/solicitudes.xlsx");

    expect(error?.codigo).toBe("RUTA_NO_PERMITIDA");
  });

  it("informa ARCHIVO_INEXISTENTE si el libro no existe", async () => {
    const { ok, error } = await leer(proyectoConLibro(), "fixtures/compras/no-existe.xlsx");

    expect(ok).toBe(false);
    expect(error?.codigo).toBe("ARCHIVO_INEXISTENTE");
  });

  it("informa EXCEL_INVALIDO si el archivo no es un libro de Excel", async () => {
    const raiz = proyectoConLibro();
    writeFileSync(path.join(raiz, "fixtures", "compras", "roto.xlsx"), "no soy un zip");

    const { ok, error } = await leer(raiz, "fixtures/compras/roto.xlsx");

    expect(ok).toBe(false);
    expect(error?.codigo).toBe("EXCEL_INVALIDO");
    expect(error?.mensaje).toContain("roto.xlsx");
  });
});

describe("normalizarHoja", () => {
  it("nombra las columnas sin encabezado o repetidas y omite las filas vacías", () => {
    const libro = normalizarHoja("fixtures/a.xlsx", "Hoja1", [
      ["id", null, "id"],
      [1, "x", 2],
      [null, "", null],
    ]);

    expect(libro.columnas).toEqual(["id", "columna_2", "id_3"]);
    expect(libro.filas).toEqual([{ id: 1, columna_2: "x", id_3: 2 }]);
  });

  it("recorta a MAX_FILAS_EXCEL filas y lo indica", () => {
    const datos = [["n"], ...Array.from({ length: MAX_FILAS_EXCEL + 1 }, (_, i) => [i])];

    const libro = normalizarHoja("fixtures/a.xlsx", "Hoja1", datos);

    expect(libro.filas).toHaveLength(MAX_FILAS_EXCEL);
    expect(libro.truncado).toBe(true);
  });
});
