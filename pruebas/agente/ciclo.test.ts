import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ejecutarTurno } from "../../src/agente/ciclo";
import { fallo } from "../../src/comun/resultado";
import type { MensajeLlm } from "../../src/llm/adapter";
import { dependenciasCiclo } from "../apoyo/ciclo";
import { crearProyectoTemporal } from "../apoyo/proyecto";
import { LlmFalso, pedirHerramientas, respuestaTexto, ultimoResultado } from "../dobles/llm-falso";

/** Guion que procesa un caso hasta construir el payload y la evidencia, con resultados reales de herramientas. */
function guionHastaPayload(caso: string) {
  let paquete: unknown;
  return [
    pedirHerramientas({ nombre: "oc_leer_paquete", args: { caso } }),
    (mensajes: readonly MensajeLlm[]) => {
      paquete = (ultimoResultado(mensajes) as { data: unknown }).data;
      return pedirHerramientas({ nombre: "oc_validar", args: { caso, paquete } });
    },
    () =>
      pedirHerramientas(
        { nombre: "oc_construir_payload", args: { caso, paquete, derivados: {} } },
        { nombre: "oc_generar_evidencia", args: { caso } },
      ),
  ];
}

/** Guion que procesa sol-004 hasta la pregunta de confirmación. */
function guionHastaPregunta() {
  return [
    ...guionHastaPayload("sol-004"),
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
    const dependencias = dependenciasCiclo(llm, crearProyectoTemporal());
    await ejecutarTurno(dependencias, "s1", "Procesa sol-004 y no la crees hasta que confirme");
    const payload = payloadConstruido(llm);

    llm.guion.push(
      pedirHerramientas({
        nombre: "oc_crear",
        args: { caso: "sol-004", payload, confirmado: true },
      }),
      respuestaTexto("Intenté crearla."),
    );
    const sinConfirmar = await ejecutarTurno(dependencias, "s1", "¿Qué pasó con el proveedor?");
    // La compuerta ejecuta con confirmado=false y la vista muestra lo que realmente se ejecutó.
    expect(sinConfirmar.toolCalls[0]).toMatchObject({
      ok: false,
      args: { confirmado: false },
    });
    expect(sinConfirmar.toolCalls[0]?.resumen).toContain("REQUIERE_CONFIRMACION");
    expect(sinConfirmar.needsConfirmation).toBe(true);

    llm.guion.push(
      pedirHerramientas({
        nombre: "oc_crear",
        args: { caso: "sol-004", payload, confirmado: true },
      }),
      respuestaTexto("OC creada."),
    );
    const confirmada = await ejecutarTurno(dependencias, "s1", "Confirmo");
    expect(confirmada.toolCalls[0]).toMatchObject({
      ok: true,
      args: { confirmado: true },
      resumen: "OC 4500000001",
    });
    expect(confirmada.needsConfirmation).toBe(false);
  });

  it("crea la OC de un caso sin confirmaciones aunque el modelo envíe confirmado=true (sol-001, O1)", async () => {
    const llm = new LlmFalso(guionHastaPayload("sol-001"));
    llm.guion.push(
      () =>
        pedirHerramientas({
          nombre: "oc_crear",
          args: { caso: "sol-001", payload: payloadConstruido(llm), confirmado: true },
        }),
      respuestaTexto("OC creada."),
    );

    const r = await ejecutarTurno(
      dependenciasCiclo(llm, crearProyectoTemporal()),
      "s1",
      "Procesa la solicitud sol-001",
    );

    expect(r.toolCalls[1]?.resumen).toContain("confirmaciones: ninguna");
    expect(r.toolCalls.at(-1)).toMatchObject({
      nombre: "oc_crear",
      ok: true,
      args: { confirmado: false },
      resumen: "OC 4500000001",
    });
    expect(r.needsConfirmation).toBe(false);
    expect(r.casoPendiente).toBeNull();
  });

  it("no marca confirmación pendiente tras construir el payload de un caso sin confirmaciones", async () => {
    const llm = new LlmFalso([...guionHastaPayload("sol-001"), respuestaTexto("Payload listo.")]);

    const r = await ejecutarTurno(dependenciasCiclo(llm, crearProyectoTemporal()), "s1", "sol-001");

    expect(r.toolCalls.map((t) => t.nombre)).toContain("oc_construir_payload");
    expect(r.needsConfirmation).toBe(false);
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

  it("se detiene en el tope de iteraciones y pide un resumen sin llamar herramientas (CA1)", async () => {
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
    const cierre = llm.peticiones.at(-1);
    expect(cierre?.herramientas.length).toBeGreaterThan(0);
    expect(cierre?.opciones).toMatchObject({ sinLlamadas: true });
    expect(cierre?.opciones.senal).toBeInstanceOf(AbortSignal);
  });

  it("muestra con claridad los errores del proveedor y mantiene viva la sesión (CA5)", async () => {
    const llm = new LlmFalso([
      fallo("LLM_TIMEOUT", "El modelo tardó demasiado."),
      respuestaTexto("Hola de nuevo"),
    ]);
    const dependencias = dependenciasCiclo(llm, crearProyectoTemporal());

    const primero = await ejecutarTurno(dependencias, "s1", "hola");
    const segundo = await ejecutarTurno(dependencias, "s1", "¿sigues ahí?");

    expect(primero.reply).toBe("El modelo tardó demasiado.");
    expect(segundo.reply).toBe("Hola de nuevo");
    expect(dependencias.sesiones.obtener("s1")?.historial.map((e) => e.tipo)).toEqual([
      "usuario",
      "error",
      "usuario",
      "asistente",
    ]);
  });

  it("no llama al modelo si se agotó el presupuesto de la sesión", async () => {
    const llm = new LlmFalso([respuestaTexto("no debería llamarse")]);
    const dependencias = dependenciasCiclo(llm, crearProyectoTemporal(), { maxTokensSesion: 1 });
    dependencias.sesiones.obtenerOCrear("s1").tokensUsados = 5;

    const r = await ejecutarTurno(dependencias, "s1", "hola");

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
