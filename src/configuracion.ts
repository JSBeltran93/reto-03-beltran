import { z } from "zod";

/** Proveedor de modelo elegido (único): Google Gemini, con su adaptador en src/llm/gemini.ts. */
export const PROVEEDOR_LLM = "gemini";

/**
 * Niveles de razonamiento admitidos en `LLM_RAZONAMIENTO`; el adaptador de Gemini los
 * traduce a `thinkingLevel`. Las decisiones de negocio son deterministas en las
 * herramientas y el modelo solo orquesta, por eso el valor por defecto es bajo.
 */
export const NIVELES_RAZONAMIENTO = ["minimo", "bajo", "medio", "alto"] as const;

/** Nivel de razonamiento del modelo (`LLM_RAZONAMIENTO`). */
export type NivelRazonamiento = (typeof NIVELES_RAZONAMIENTO)[number];

/** Valores por defecto de la configuración (se sobrescriben con variables de entorno). */
export const VALORES_POR_DEFECTO = {
  modelo: "gemini-3.6-flash",
  /** Modelos de respaldo en orden, separados por comas (el plan gratuito limita el cupo diario por modelo). */
  modelosRespaldo: "gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3-flash-preview",
  razonamiento: "bajo" satisfies NivelRazonamiento,
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

/** Separador de la lista de modelos de respaldo en `LLM_MODELO_RESPALDO`. */
const SEPARADOR_MODELOS = ",";

/**
 * Convierte una lista separada por comas en nombres de modelo: recorta espacios e ignora vacíos.
 * @param lista - texto como `"a, b,,c"`
 * @returns los modelos en el mismo orden
 */
export function separarModelos(lista: string): string[] {
  return lista
    .split(SEPARADOR_MODELOS)
    .map((modelo) => modelo.trim())
    .filter((modelo) => modelo !== "");
}

/**
 * Modelos de respaldo de `LLM_MODELO_RESPALDO`; si la lista queda vacía se usan los de por defecto.
 * @param lista - valor de la variable, si se definió
 * @returns los modelos de respaldo en orden de preferencia
 */
function modelosRespaldo(lista: string | undefined): string[] {
  const modelos = separarModelos(lista ?? "");
  return modelos.length > 0 ? modelos : separarModelos(VALORES_POR_DEFECTO.modelosRespaldo);
}

const enteroPositivo = (porDefecto: number) =>
  z.coerce.number().int().positive().default(porDefecto);

/**
 * Esquema de las variables de entorno; ver `.env.example`. Si no se fijan los modelos,
 * se usan los valores por defecto; `LLM_RAZONAMIENTO` admite `NIVELES_RAZONAMIENTO`.
 * `LLM_MODELO_RESPALDO` (lista separada por comas) se expone como `LLM_MODELOS_RESPALDO`.
 */
const EsquemaConfiguracion = z
  .object({
    GEMINI_API_KEY: z.string().default(""),
    LLM_MODELO: textoOpcional,
    LLM_MODELO_RESPALDO: textoOpcional,
    LLM_RAZONAMIENTO: z.preprocess(
      (valor) => (valor === "" ? undefined : valor),
      z.enum(NIVELES_RAZONAMIENTO).default(VALORES_POR_DEFECTO.razonamiento),
    ),
    LLM_TIMEOUT_MS: enteroPositivo(VALORES_POR_DEFECTO.timeoutMs),
    MAX_ITERACIONES: enteroPositivo(VALORES_POR_DEFECTO.maxIteraciones),
    MAX_TOKENS_SESION: enteroPositivo(VALORES_POR_DEFECTO.maxTokensSesion),
    MAX_TOKENS_DIA: enteroPositivo(VALORES_POR_DEFECTO.maxTokensDia),
    MAX_SESIONES: enteroPositivo(VALORES_POR_DEFECTO.maxSesiones),
    MAX_SEGUNDOS_TURNO: enteroPositivo(VALORES_POR_DEFECTO.maxSegundosTurno),
    MAX_SOLICITUDES_MINUTO: enteroPositivo(VALORES_POR_DEFECTO.maxSolicitudesMinuto),
    PORT: enteroPositivo(VALORES_POR_DEFECTO.puerto),
  })
  .transform(({ LLM_MODELO_RESPALDO, ...entorno }) => ({
    ...entorno,
    LLM_MODELO: entorno.LLM_MODELO ?? VALORES_POR_DEFECTO.modelo,
    LLM_MODELOS_RESPALDO: modelosRespaldo(LLM_MODELO_RESPALDO),
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
