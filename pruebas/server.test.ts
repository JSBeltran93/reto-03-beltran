import request from "supertest";
import { describe, expect, it } from "vitest";

import { crearAplicacion } from "../src/server";
import { dependenciasCiclo } from "./apoyo/ciclo";
import { crearProyectoTemporal } from "./apoyo/proyecto";
import { LlmFalso, respuestaTexto } from "./dobles/llm-falso";

const construirAplicacion = (llm = new LlmFalso([respuestaTexto("Hola, soy el agente.")])) =>
  crearAplicacion({
    ciclo: dependenciasCiclo(llm, crearProyectoTemporal()),
    carpetaEstaticos: "/tmp/no-existe",
  });

describe("API HTTP", () => {
  it("GET /api/health informa proveedor y modelo sin secretos", async () => {
    const r = await request(construirAplicacion()).get("/api/health");

    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true, provider: "falso", model: "modelo-falso" });
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("POST /api/chat responde con reply, toolCalls y needsConfirmation", async () => {
    const r = await request(construirAplicacion())
      .post("/api/chat")
      .send({ sessionId: "s1", message: "hola" });

    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      reply: "Hola, soy el agente.",
      toolCalls: [],
      needsConfirmation: false,
    });
  });

  it.each([{}, { sessionId: "s1" }, { sessionId: "s1", message: "   " }])(
    "POST /api/chat rechaza el cuerpo inválido %j con 400",
    async (cuerpo) => {
      expect((await request(construirAplicacion()).post("/api/chat").send(cuerpo)).status).toBe(
        400,
      );
    },
  );

  it("GET /api/sessions/:id devuelve el historial visible o 404", async () => {
    const app = construirAplicacion();
    await request(app).post("/api/chat").send({ sessionId: "s1", message: "hola" });

    const r = await request(app).get("/api/sessions/s1");

    expect(r.body).toEqual({
      id: "s1",
      historial: [
        { tipo: "usuario", texto: "hola" },
        { tipo: "asistente", texto: "Hola, soy el agente." },
      ],
    });
    expect((await request(app).get("/api/sessions/otra")).status).toBe(404);
  });
});
