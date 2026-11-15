import type { Registrador } from "../comun/registrador";
import type { Configuracion } from "../configuracion";
import type { AdaptadorLlm } from "./adapter";
import { AdaptadorGemini } from "./gemini";
import { AdaptadorConRespaldo } from "./respaldo";

/**
 * Crea el adaptador LLM de Gemini: un adaptador por modelo, primero el principal y luego
 * los de respaldo en el orden configurado.
 * @param configuracion - configuración cargada
 * @param registrador - registra los cambios a un modelo de respaldo
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
    [configuracion.LLM_MODELO, ...configuracion.LLM_MODELOS_RESPALDO].map(crear),
    registrador,
  );
}
