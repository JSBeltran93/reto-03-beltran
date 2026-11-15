import type { Registrador } from "../comun/registrador";
import type { Configuracion } from "../configuracion";
import type { AdaptadorLlm } from "./adapter";
import { AdaptadorGemini } from "./gemini";
import { AdaptadorConRespaldo } from "./respaldo";

/**
 * Crea el adaptador LLM de Gemini con el modelo principal y el de respaldo.
 * @param configuracion - configuración cargada
 * @param registrador - registra los cambios al modelo de respaldo
 * @returns el adaptador con respaldo que usa el agente
 */
export function crearAdaptadoresLlm(
  configuracion: Configuracion,
  registrador: Registrador,
): AdaptadorLlm {
  const crear = (modelo: string): AdaptadorLlm =>
    new AdaptadorGemini({
      apiKey: configuracion.GEMINI_API_KEY,
      modelo,
      timeoutMs: configuracion.LLM_TIMEOUT_MS,
    });
  return new AdaptadorConRespaldo(
    [crear(configuracion.LLM_MODELO), crear(configuracion.LLM_MODELO_RESPALDO)],
    registrador,
  );
}
