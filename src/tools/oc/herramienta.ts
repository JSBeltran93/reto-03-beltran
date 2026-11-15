import { z } from "zod";

import { fallo, type Resultado } from "../../comun/resultado";

/** Contexto de ejecución de toda herramienta (PRD §6.2). */
export interface ContextoHerramienta {
  /** Raíz del proyecto; toda ruta se resuelve desde aquí, nunca absoluta. */
  readonly directory: string;
  readonly sessionId: string;
}

/** Contrato de herramienta del PRD §6.2: `description`, `args` zod y `execute` que nunca lanza. */
export interface Herramienta<A extends z.ZodRawShape> {
  readonly description: string;
  readonly args: A;
  /**
   * Ejecuta la herramienta.
   * @param args - argumentos validados contra `args`
   * @param ctx - contexto de ejecución
   * @returns `{ ok, data }` o `{ ok: false, error }` serializado
   */
  execute(args: z.infer<z.ZodObject<A>>, ctx: ContextoHerramienta): Promise<string>;
}

interface DefinicionHerramienta<A extends z.ZodRawShape, T> {
  readonly description: string;
  readonly args: A;
  readonly ejecutar: (
    args: z.infer<z.ZodObject<A>>,
    ctx: ContextoHerramienta,
  ) => Resultado<T> | Promise<Resultado<T>>;
}

/**
 * Construye una herramienta que valida sus argumentos, ejecuta la función de
 * dominio y siempre devuelve un resultado serializado (nunca lanza).
 * @param definicion - descripción, argumentos zod y función de dominio
 * @returns herramienta con el contrato del PRD §6.2
 */
export function definirHerramienta<A extends z.ZodRawShape, T>(
  definicion: DefinicionHerramienta<A, T>,
): Herramienta<A> {
  const esquema = z.object(definicion.args);
  return {
    description: definicion.description,
    args: definicion.args,
    async execute(args, ctx) {
      const validados = esquema.safeParse(args);
      if (!validados.success) {
        return JSON.stringify(fallo("ARGS_INVALIDOS", z.prettifyError(validados.error)));
      }
      try {
        return JSON.stringify(await definicion.ejecutar(validados.data, ctx));
      } catch {
        return JSON.stringify(
          fallo("ERROR_INTERNO", "Error inesperado al ejecutar la herramienta."),
        );
      }
    },
  };
}
