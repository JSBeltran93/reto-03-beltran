import { describe, expect, it } from "vitest";

import { registradorSilencioso } from "../../src/comun/registrador";
import { exito, fallo, type Resultado } from "../../src/comun/resultado";
import type { AdaptadorLlm, RespuestaLlm } from "../../src/llm/adapter";
import { AdaptadorConRespaldo } from "../../src/llm/respaldo";

/** Adaptador de prueba que siempre devuelve el mismo resultado y cuenta sus llamadas. */
function adaptador(modelo: string, resultado: Resultado<RespuestaLlm>) {
  const llamadas = { total: 0 };
  const instancia: AdaptadorLlm = {
    proveedor: "prueba",
    modelo,
    enviar: () => {
      llamadas.total += 1;
      return Promise.resolve(resultado);
    },
  };
  return { instancia, llamadas };
}

const respuesta = (texto: string): Resultado<RespuestaLlm> =>
  exito({ texto, llamadas: [], uso: { entrada: 1, salida: 1 }, fin: "final", bruto: [{ x: 1 }] });

describe("AdaptadorConRespaldo", () => {
  it("usa el modelo de respaldo cuando el principal no está disponible y no reenvía su contenido bruto", async () => {
    const principal = adaptador("principal", fallo("LLM_NO_DISPONIBLE", "caído"));
    const respaldo = adaptador("respaldo", respuesta("hola desde respaldo"));
    const llm = new AdaptadorConRespaldo(
      [principal.instancia, respaldo.instancia],
      registradorSilencioso,
    );

    const r = await llm.enviar([], []);

    expect(r).toMatchObject({ ok: true, data: { texto: "hola desde respaldo" } });
    expect(r.ok && r.data.bruto).toBeUndefined();
    expect(llm.modelo).toBe("principal");
  });

  it.each(["LLM_CLAVE_INVALIDA", "LLM_SOLICITUD_INVALIDA"] as const)(
    "no intenta el respaldo ante %s",
    async (codigo) => {
      const principal = adaptador("principal", fallo(codigo, "error"));
      const respaldo = adaptador("respaldo", respuesta("no debería usarse"));
      const llm = new AdaptadorConRespaldo(
        [principal.instancia, respaldo.instancia],
        registradorSilencioso,
      );

      const r = await llm.enviar([], []);

      expect(r).toMatchObject({ ok: false, error: { codigo } });
      expect(respaldo.llamadas.total).toBe(0);
    },
  );

  it("devuelve el último error si todos los modelos fallan", async () => {
    const llm = new AdaptadorConRespaldo(
      [
        adaptador("a", fallo("LLM_TIMEOUT", "lento")).instancia,
        adaptador("b", fallo("LLM_LIMITE", "límite")).instancia,
      ],
      registradorSilencioso,
    );

    expect(await llm.enviar([], [])).toMatchObject({ ok: false, error: { codigo: "LLM_LIMITE" } });
  });

  it("conserva el contenido bruto cuando responde el principal", async () => {
    const llm = new AdaptadorConRespaldo(
      [adaptador("principal", respuesta("ok")).instancia],
      registradorSilencioso,
    );

    const r = await llm.enviar([], []);

    expect(r.ok && r.data.bruto).toEqual([{ x: 1 }]);
  });

  it("exige al menos un adaptador", () => {
    expect(() => new AdaptadorConRespaldo([], registradorSilencioso)).toThrow();
  });
});
