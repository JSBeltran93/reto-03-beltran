/// <reference types="vitest/config" />
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** Puerto del back si `PORT` no está definido (mismo valor por defecto que el servidor). */
const PUERTO_BACK_POR_DEFECTO = 3000;

/** Grupos de librerías en archivos aparte: cambian poco y el navegador los guarda en caché. */
const GRUPOS_LIBRERIAS: Readonly<Record<string, readonly string[]>> = {
  "bib-react": ["/react/", "/react-dom/", "/scheduler/"],
  "bib-markdown": [
    "react-markdown",
    "remark",
    "micromark",
    "mdast",
    "unified",
    "hast",
    "unist",
    "vfile",
  ],
  "bib-datos": ["@tanstack", "axios", "zod"],
};

/**
 * Asigna cada dependencia de node_modules a su grupo de librerías.
 * @param id - ruta del módulo
 * @returns nombre del archivo del grupo, o undefined para dejarlo en el principal
 */
function separarLibrerias(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  return Object.entries(GRUPOS_LIBRERIAS).find(([, patrones]) =>
    patrones.some((p) => id.includes(p)),
  )?.[0];
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@contratos": fileURLToPath(new URL("../src/comun", import.meta.url)) },
  },
  server: { proxy: { "/api": `http://localhost:${process.env.PORT ?? PUERTO_BACK_POR_DEFECTO}` } },
  build: { rollupOptions: { output: { manualChunks: separarLibrerias } } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/pruebas/configuracion.ts"],
  },
});
