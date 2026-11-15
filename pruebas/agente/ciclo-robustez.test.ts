import { writeFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ejecutarTurno } from "../../src/agente/ciclo";
import type { AdaptadorLlm } from "../../src/llm/adapter";
import * as herramientasOc from "../../src/tools/oc";
import { dependenciasCiclo } from "../apoyo/ciclo";
import { crearProyectoTemporal } from "../apoyo/proyecto";
import {
  LlmFalso,
  pedirHerramientas,
  respuestaConFin,
  respuestaTexto,
  ultimoResultado,
} from "../dobles/llm-falso";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("robustez del ciclo del agente (CA5)", () => {
  it("convierte una excepción de herramienta en ERROR_INTERNO y la sesión sigue funcionando", async () => {
    vi.spyOn(herramientasOc.leer_paquete, "execute").mockRejectedValueOnce(new Error("falla"));
    const llm = new LlmFalso([
      pedirHerramientas({ nombre: "oc_leer_paquete", args: { caso: "sol-001" } }),
      (mensajes) => respuestaTexto(JSON.stringify(ultimoResultado(mensajes))),
      respuestaTexto("Sigo aquí."),
    ]);
    const dependencias = dependenciasCiclo(llm, crearProyectoTemporal());

    const primero = await ejecutarTurno(dependencias, "s1", "procesa sol-001");
    const segundo = await ejecutarTurno(dependencias, "s1", "¿sigues?");

    expect(primero.toolCalls[0]?.resumen).toContain("ERROR_INTERNO");
    expect(primero.reply).toContain("ERROR_INTERNO");
    expect(segundo.reply).toBe("Sigo aquí.");
  });

  it("no rompe el turno si no se puede escribir la bitácora", async () => {
    const raiz = crearProyectoTemporal();
    writeFileSync(path.join(raiz, "out"), "no es una carpeta");
    const llm = new LlmFalso([
      pedirHerramientas({ nombre: "oc_leer_paquete", args: { caso: "sol-001" } }),
      respuestaTexto("Paquete leído."),
    ]);

    const r = await ejecutarTurno(dependenciasCiclo(llm, raiz), "s1", "procesa sol-001");

    expect(r.toolCalls[0]?.ok).toBe(true);
    expect(r.reply).toBe("Paquete leído.");
  });

  it("ejecuta en orden dos turnos simultáneos de la misma sesión", async () => {
    const llm = new LlmFalso([respuestaTexto("uno"), respuestaTexto("dos")]);
    const dependencias = dependenciasCiclo(llm, crearProyectoTemporal());

    const [a, b] = await Promise.all([
      ejecutarTurno(dependencias, "s1", "primero"),
      ejecutarTurno(dependencias, "s1", "segundo"),
    ]);

    expect([a.reply, b.reply]).toEqual(["uno", "dos"]);
    expect(dependencias.sesiones.obtener("s1")?.historial.map((e) => e.tipo)).toEqual([
      "usuario",
      "asistente",
      "usuario",
      "asistente",
    ]);
  });

  it.each([
    ["limite", "incompleta"],
    ["rechazo", "no puede ayudar"],
  ] as const)(
    "con fin=%s no ejecuta herramientas y responde un error claro",
    async (fin, texto) => {
      const llm = new LlmFalso([respuestaConFin(fin)]);

      const r = await ejecutarTurno(dependenciasCiclo(llm, crearProyectoTemporal()), "s1", "hola");

      expect(r.toolCalls).toHaveLength(0);
      expect(r.reply).toContain(texto);
      expect(r.esError).toBe(true);
    },
  );
});

describe("plazo máximo del turno", () => {
  it("corta el turno con un mensaje claro cuando se agota el plazo", async () => {
    const lento: AdaptadorLlm = {
      proveedor: "falso",
      modelo: "lento",
      enviar: (_mensajes, _herramientas, opciones) =>
        new Promise((resolver) => {
          opciones?.senal?.addEventListener("abort", () => {
            resolver(pedirHerramientas({ nombre: "oc_leer_paquete", args: { caso: "sol-001" } }));
          });
        }),
    };
    const dependencias = dependenciasCiclo(lento, crearProyectoTemporal(), { maxSegundosTurno: 1 });

    const r = await ejecutarTurno(dependencias, "s-plazo", "procesa sol-001");

    expect(r.esError).toBe(true);
    expect(r.reply).toContain("tiempo máximo");
  });
});
