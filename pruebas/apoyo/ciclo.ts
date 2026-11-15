import type { DependenciasCiclo } from "../../src/agente/ciclo";
import { AlmacenSesiones } from "../../src/agente/sesiones";
import { registradorSilencioso } from "../../src/comun/registrador";
import { relojFijo } from "../../src/comun/reloj";
import type { AdaptadorLlm } from "../../src/llm/adapter";

/**
 * Dependencias del ciclo con LLM falso, registrador silencioso y una raíz dada.
 * @param llm - LLM falso
 * @param raiz - raíz del proyecto
 * @param cambios - campos a sobrescribir
 * @returns dependencias del ciclo
 */
export function dependenciasCiclo(
  llm: AdaptadorLlm,
  raiz: string,
  cambios: Partial<DependenciasCiclo> = {},
): DependenciasCiclo {
  return {
    llm,
    sesiones: new AlmacenSesiones({ maxSesiones: 10, maxTokensDia: 1_000_000 }),
    promptSistema: "Eres un agente de prueba.",
    raiz,
    reloj: relojFijo("2026-09-03T15:00:00Z"),
    registrador: registradorSilencioso,
    maxIteraciones: 25,
    maxTokensSesion: 100_000,
    ...cambios,
  };
}
