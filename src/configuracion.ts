import { z } from "zod";

/** Proveedor de modelo elegido (único): Google Gemini, con su adaptador en src/llm/gemini.ts. */
export const PROVEEDOR_LLM = "gemini";

/** Valores por defecto de la configuración (se sobrescriben con variables de entorno). */
export const VALORES_POR_DEFECTO = {
  modelo: "gemini-3.6-flash",
  modeloRespaldo: "gemini-3.5-flash-lite",
  timeoutMs: 60_000,
  maxIteraciones: 25,
  maxTokensSesion: 200_000,
  maxTokensDia: 3_000_000,
  maxSesiones: 200,
  maxSegundosTurno: 240,
  maxSolicitudesMinuto: 20,
  puerto: 3000,
} as const;

/** Texto opcional: una variable vacía (`LLM_MODELO=`) cuenta como no definida. */
const textoOpcional = z.preprocess(
  (valor) => (valor === "" ? undefined : valor),
  z.string().min(1).optional(),
);

const enteroPositivo = (porDefecto: number) =>
  z.coerce.number().int().positive().default(porDefecto);

/**
 * Esquema de las variables de entorno; ver `.env.example`. Si no se fijan los modelos,
 * se usan los valores por defecto.
 */
const EsquemaConfiguracion = z
  .object({
    GEMINI_API_KEY: z.string().default(""),
    LLM_MODELO: textoOpcional,
    LLM_MODELO_RESPALDO: textoOpcional,
    LLM_TIMEOUT_MS: enteroPositivo(VALORES_POR_DEFECTO.timeoutMs),
    MAX_ITERACIONES: enteroPositivo(VALORES_POR_DEFECTO.maxIteraciones),
    MAX_TOKENS_SESION: enteroPositivo(VALORES_POR_DEFECTO.maxTokensSesion),
    MAX_TOKENS_DIA: enteroPositivo(VALORES_POR_DEFECTO.maxTokensDia),
    MAX_SESIONES: enteroPositivo(VALORES_POR_DEFECTO.maxSesiones),
    MAX_SEGUNDOS_TURNO: enteroPositivo(VALORES_POR_DEFECTO.maxSegundosTurno),
    MAX_SOLICITUDES_MINUTO: enteroPositivo(VALORES_POR_DEFECTO.maxSolicitudesMinuto),
    PORT: enteroPositivo(VALORES_POR_DEFECTO.puerto),
  })
  .transform((entorno) => ({
    ...entorno,
    LLM_MODELO: entorno.LLM_MODELO ?? VALORES_POR_DEFECTO.modelo,
    LLM_MODELO_RESPALDO: entorno.LLM_MODELO_RESPALDO ?? VALORES_POR_DEFECTO.modeloRespaldo,
  }));

/** Configuración de ejecución, leída solo de variables de entorno. */
export type Configuracion = z.output<typeof EsquemaConfiguracion>;

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
