import request from "supertest";
import { describe, expect, it } from "vitest";

import { crearAplicacion } from "../src/server";
import { dependenciasCiclo } from "./apoyo/ciclo";
import { crearProyectoTemporal } from "./apoyo/proyecto";

const SESION = "6f0d3c1e-8a2b-4c5d-9e7f-1a2b3c4d5e6f";
const OTRA_SESION = "0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d";
import { fallo } from "../src/comun/resultado";
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
      .send({ sessionId: SESION, message: "hola" });

    expect(r.status).toBe(200);
    expect(r.body).toEqual({
      reply: "Hola, soy el agente.",
      toolCalls: [],
      needsConfirmation: false,
      casoPendiente: null,
    });
  });

  it.each([
    {},
    { sessionId: SESION },
    { sessionId: SESION, message: "   " },
    { sessionId: "s1", message: "hola" },
  ])("POST /api/chat rechaza el cuerpo inválido %j con 400", async (cuerpo) => {
    expect((await request(construirAplicacion()).post("/api/chat").send(cuerpo)).status).toBe(400);
  });

  it("GET /api/sessions/:id devuelve el historial visible o 404", async () => {
    const aplicacion = construirAplicacion();
    await request(aplicacion).post("/api/chat").send({ sessionId: SESION, message: "hola" });

    const r = await request(aplicacion).get(`/api/sessions/${SESION}`);

    expect(r.body).toEqual({
      id: SESION,
      historial: [
        { tipo: "usuario", texto: "hola" },
        { tipo: "asistente", texto: "Hola, soy el agente." },
      ],
      needsConfirmation: false,
      casoPendiente: null,
    });
    expect((await request(aplicacion).get(`/api/sessions/${OTRA_SESION}`)).status).toBe(404);
  });

  it("responde 400 y no 500 ante un JSON mal formado, y 413 ante un cuerpo demasiado grande", async () => {
    const aplicacion = construirAplicacion();
    const malFormado = await request(aplicacion)
      .post("/api/chat")
      .set("Content-Type", "application/json")
      .send("{ roto");
    const grande = await request(aplicacion)
      .post("/api/chat")
      .send({ sessionId: SESION, message: "x".repeat(40_000) });

    expect(malFormado.status).toBe(400);
    expect(grande.status).toBe(413);
  });

  it("responde 404 en JSON para rutas de la API que no existen", async () => {
    const r = await request(construirAplicacion()).get("/api/no-existe");

    expect(r.status).toBe(404);
    expect(r.body).toEqual({ error: "Ruta de la API no encontrada." });
  });

  it("marca con esError las respuestas que son errores del sistema", async () => {
    const llm = new LlmFalso([
      fallo("LLM_CLAVE_INVALIDA", "La clave del modelo no es válida o falta."),
    ]);
    const r = await request(construirAplicacion(llm))
      .post("/api/chat")
      .send({ sessionId: SESION, message: "hola" });

    expect(r.body).toMatchObject({
      reply: "La clave del modelo no es válida o falta.",
      esError: true,
    });
  });
});
