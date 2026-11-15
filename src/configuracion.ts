import { z } from "zod";

const enteroPositivo = (porDefecto: number) =>
  z.coerce.number().int().positive().default(porDefecto);

const EsquemaConfiguracion = z.object({
  ANTHROPIC_API_KEY: z.string().default(""),
  LLM_MODELO: z.string().min(1).default("claude-opus-5-5"),
  LLM_TIMEOUT_MS: enteroPositivo(60_000),
  MAX_ITERACIONES: enteroPositivo(25),
  MAX_TOKENS_SESION: enteroPositivo(200_000),
  MAX_TOKENS_DIA: enteroPositivo(3_000_000),
  MAX_SESIONES: enteroPositivo(200),
  PORT: enteroPositivo(3000),
});

/** Configuración de ejecución, leída solo de variables de entorno. */
export type Configuracion = z.infer<typeof EsquemaConfiguracion>;

/**
 * Valida el entorno y falla de inmediato nombrando las variables inválidas, sin imprimir sus valores.
 * @param entorno - variables de entorno (por defecto `process.env`)
 * @returns la configuración tipada
 * @throws Error si alguna variable es inválida
 */
export function cargarConfiguracion(entorno: NodeJS.ProcessEnv = process.env): Configuracion {
  const validada = EsquemaConfiguracion.safeParse(entorno);
  if (!validada.success) {
    const nombres = validada.error.issues.map((problema) => problema.path.join(".")).join(", ");
    throw new Error(`Configuración inválida en: ${nombres}`);
  }
  return validada.data;
}
