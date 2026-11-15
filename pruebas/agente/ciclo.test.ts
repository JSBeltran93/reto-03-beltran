import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ejecutarTurno } from "../../src/agente/ciclo";
import { fallo } from "../../src/comun/resultado";
import type { MensajeLlm } from "../../src/llm/adapter";
import { dependenciasCiclo } from "../apoyo/ciclo";
import { crearProyectoTemporal } from "../apoyo/proyecto";
import { LlmFalso, pedirHerramientas, respuestaTexto, ultimoResultado } from "../dobles/llm-falso";

/** Guion que procesa sol-004 hasta la pregunta de confirmación, con resultados reales de herramientas. */
function guionHastaPregunta() {
  let paquete: unknown;
  return [
    pedirHerramientas({ nombre: "oc_leer_paquete", args: { caso: "sol-004" } }),
    (mensajes: readonly MensajeLlm[]) => {
      paquete = (ultimoResultado(mensajes) as { data: unknown }).data;
      return pedirHerramientas({ nombre: "oc_validar", args: { caso: "sol-004", paquete } });
    },
    () =>
      pedirHerramientas(
        { nombre: "oc_construir_payload", args: { caso: "sol-004", paquete, derivados: {} } },
        { nombre: "oc_generar_evidencia", args: { caso: "sol-004" } },
      ),
    respuestaTexto("La cotización difiere 6 %. ¿Confirmas la creación de la OC?"),
  ];
}

function payloadConstruido(llm: LlmFalso): unknown {
  for (const peticion of [...llm.peticiones].reverse()) {
    const resultado = ultimoResultado(peticion.mensajes) as
      { data?: { orden?: unknown } } | undefined;
    if (resultado?.data?.orden) return resultado.data.orden;
  }
  return undefined;
}

describe("ciclo del agente", () => {
  it("ejecuta herramientas, muestra cada llamada y pide confirmación (sol-004)", async () => {
    const raiz = crearProyectoTemporal();
    const llm = new LlmFalso(guionHastaPregunta());

    const r = await ejecutarTurno(
      dependenciasCiclo(llm, raiz),
      "s1",
      "Procesa la solicitud sol-004",
    );

    expect(r.toolCalls.map((t) => t.nombre)).toEqual([
      "oc_leer_paquete",
      "oc_validar",
      "oc_construir_payload",
      "oc_generar_evidencia",
    ]);
    expect(r.toolCalls[1]?.resumen).toContain("confirmaciones: RC5");
    expect(r.needsConfirmation).toBe(true);
    expect(r.reply).toContain("¿Confirmas");
    const bitacora = readFileSync(path.join(raiz, "out", "log.jsonl"), "utf8")
      .trim()
      .split("\n");
    expect(bitacora).toHaveLength(4);
  });

  it("bloquea la autoconfirmación y crea la OC solo después de que el usuario confirma", async () => {
    const llm = new LlmFalso(guionHastaPregunta());
    const deps = dependenciasCiclo(llm, crearProyectoTemporal());
    await ejecutarTurno(deps, "s1", "Procesa sol-004 y no la crees hasta que confirme");
    const payload = payloadConstruido(llm);

    llm.guion.push(
      pedirHerramientas({
        nombre: "oc_crear",
        args: { caso: "sol-004", payload, confirmado: true },
      }),
      respuestaTexto("Intenté crearla."),
    );
    const sinConfirmar = await ejecutarTurno(deps, "s1", "¿Qué pasó con el proveedor?");
    expect(sinConfirmar.toolCalls[0]?.resumen).toBe("CONFIRMACION_NO_OTORGADA");

    llm.guion.push(
      pedirHerramientas({
        nombre: "oc_crear",
        args: { caso: "sol-004", payload, confirmado: true },
      }),
      respuestaTexto("OC creada."),
    );
    const confirmada = await ejecutarTurno(deps, "s1", "Confirmo");
    expect(confirmada.toolCalls[0]).toMatchObject({ ok: true, resumen: "OC 4500000001" });
    expect(confirmada.needsConfirmation).toBe(false);
  });

  it("devuelve al modelo los errores de argumentos en lugar de fallar (validación zod)", async () => {
    const llm = new LlmFalso([
      pedirHerramientas({ nombre: "oc_leer_paquete", args: { caso: 42 } }),
      (mensajes) => respuestaTexto(JSON.stringify(ultimoResultado(mensajes))),
    ]);

    const r = await ejecutarTurno(dependenciasCiclo(llm, crearProyectoTemporal()), "s1", "hola");

    expect(r.toolCalls[0]?.ok).toBe(false);
    expect(r.reply).toContain("ARGS_INVALIDOS");
  });

  it("se detiene en el tope de iteraciones y pide un resumen sin herramientas (CA1)", async () => {
    const pasos = Array.from({ length: 3 }, () =>
      pedirHerramientas({ nombre: "oc_leer_paquete", args: { caso: "sol-001" } }),
    );
    const llm = new LlmFalso([...pasos, respuestaTexto("Resumen: leí el paquete, falta validar.")]);

    const r = await ejecutarTurno(
      dependenciasCiclo(llm, crearProyectoTemporal(), { maxIteraciones: 3 }),
      "s1",
      "procesa",
    );

    expect(r.toolCalls).toHaveLength(3);
    expect(r.reply).toContain("Resumen");
    expect(llm.peticiones.at(-1)?.herramientas).toEqual([]);
  });

  it("muestra con claridad los errores del proveedor y mantiene viva la sesión (CA5)", async () => {
    const llm = new LlmFalso([
      fallo("LLM_TIMEOUT", "El modelo tardó demasiado."),
      respuestaTexto("Hola de nuevo"),
    ]);
    const deps = dependenciasCiclo(llm, crearProyectoTemporal());

    const primero = await ejecutarTurno(deps, "s1", "hola");
    const segundo = await ejecutarTurno(deps, "s1", "¿sigues ahí?");

    expect(primero.reply).toBe("El modelo tardó demasiado.");
    expect(segundo.reply).toBe("Hola de nuevo");
    expect(deps.sesiones.obtener("s1")?.historial.map((e) => e.tipo)).toEqual([
      "usuario",
      "error",
      "usuario",
      "asistente",
    ]);
  });

  it("no llama al modelo si se agotó el presupuesto de la sesión", async () => {
    const llm = new LlmFalso([respuestaTexto("no debería llamarse")]);
    const deps = dependenciasCiclo(llm, crearProyectoTemporal(), { maxTokensSesion: 1 });
    deps.sesiones.obtenerOCrear("s1").tokensUsados = 5;

    const r = await ejecutarTurno(deps, "s1", "hola");

    expect(r.reply).toContain("presupuesto");
    expect(llm.peticiones).toHaveLength(0);
  });

  it("no crea la bitácora si no se llamó ninguna herramienta", async () => {
    const raiz = crearProyectoTemporal();
    await ejecutarTurno(
      dependenciasCiclo(new LlmFalso([respuestaTexto("hola")]), raiz),
      "s1",
      "hola",
    );

    expect(existsSync(path.join(raiz, "out", "log.jsonl"))).toBe(false);
  });
});
