import request from "supertest";
import { describe, expect, it } from "vitest";

import { EsquemaRespuestaChat } from "../src/comun/contratos-api";
import { LimitadorSolicitudes } from "../src/comun/limitador";
import { relojFijo } from "../src/comun/reloj";
import { crearAplicacion } from "../src/server";
import { dependenciasCiclo } from "./apoyo/ciclo";
import { crearProyectoTemporal } from "./apoyo/proyecto";
import { LlmFalso, pedirHerramientas, respuestaTexto } from "./dobles/llm-falso";

const SESION = "6f0d3c1e-8a2b-4c5d-9e7f-1a2b3c4d5e6f";

describe("API HTTP: seguridad y límites", () => {
  it("envía Content-Security-Policy y HSTS", async () => {
    const app = crearAplicacion({
      ciclo: dependenciasCiclo(new LlmFalso([]), crearProyectoTemporal()),
      carpetaEstaticos: "/tmp/no-existe",
    });

    const r = await request(app).get("/api/health");

    expect(r.headers["content-security-policy"]).toContain("default-src 'self'");
    expect(r.headers["strict-transport-security"]).toContain("max-age=");
  });

  it("limita los mensajes por IP con 429 y Retry-After", async () => {
    const app = crearAplicacion({
      ciclo: dependenciasCiclo(
        new LlmFalso([respuestaTexto("uno"), respuestaTexto("dos")]),
        crearProyectoTemporal(),
      ),
      carpetaEstaticos: "/tmp/no-existe",
      limitador: new LimitadorSolicitudes(1, relojFijo("2026-09-03T15:00:00Z")),
    });
    const enviar = () =>
      request(app).post("/api/chat").send({ sessionId: SESION, message: "hola" });

    expect((await enviar()).status).toBe(200);
    const segundo = await enviar();

    expect(segundo.status).toBe(429);
    expect(Number(segundo.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("incluye los datos completos de la herramienta en cada tool call", async () => {
    const llm = new LlmFalso([
      pedirHerramientas({ nombre: "oc_leer_paquete", args: { caso: "sol-001" } }),
      respuestaTexto("listo"),
    ]);
    const app = crearAplicacion({
      ciclo: dependenciasCiclo(llm, crearProyectoTemporal()),
      carpetaEstaticos: "/tmp/no-existe",
    });

    const r = await request(app)
      .post("/api/chat")
      .send({ sessionId: SESION, message: "lee sol-001" });

    expect(EsquemaRespuestaChat.parse(r.body).toolCalls[0]).toMatchObject({
      nombre: "oc_leer_paquete",
      ok: true,
      resumen: "paquete leído · completo",
      datos: { solicitud: { solicitud_id: "SOL-2026-001" } },
    });
  });
});
