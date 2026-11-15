/**
 * Herramientas de órdenes de compra expuestas al agente. Cada export lo ve el
 * modelo como `oc_<export>` (PRD §6.2). La lógica de negocio vive en `./oc/`.
 */
import { z } from "zod";

import { definirHerramienta } from "./oc/herramienta";
import { leerPaquete } from "./oc/paquete";

const caso = z
  .string()
  .describe("Nombre de la carpeta del caso en fixtures/reto-03/solicitudes/, por ejemplo sol-001");

/** `oc_leer_paquete`: lee y normaliza el paquete de compra de un caso (HU-1). */
export const leer_paquete = definirHerramienta({
  description:
    "Lee el correo, la solicitud, la cotización, la aprobación y la factura de un caso y devuelve el paquete normalizado.",
  args: { caso },
  ejecutar: (args, ctx) => leerPaquete(ctx.directory, args.caso),
});
