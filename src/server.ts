/**
 * API HTTP del agente (PRD §6.4) y punto de entrada. `crearAplicacion` arma la app sin
 * escuchar (se prueba con supertest); al ejecutarse directamente, este archivo
 * compone las dependencias reales (Anthropic, sesiones, prompt) y levanta el servidor.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

import express, { type Express, type NextFunction, type Request, type Response } from "express";

import { type DependenciasCiclo, ejecutarTurno } from "./agente/ciclo";
import { cargarPromptSistema } from "./agente/prompt-sistema";
import { AlmacenSesiones } from "./agente/sesiones";
import { EsquemaSolicitudChat, type Salud, type VistaSesion } from "./comun/contratos-api";
import { registradorJson } from "./comun/registrador";
import { relojSistema } from "./comun/reloj";
import { cargarConfiguracion } from "./configuracion";
import { AdaptadorAnthropic } from "./llm/anthropic";

/** Dependencias para construir la aplicación HTTP. */
export interface DependenciasAplicacion {
  readonly ciclo: DependenciasCiclo;
  /** Ruta absoluta del front compilado (web/dist). */
  readonly carpetaEstaticos: string;
}

/** Códigos HTTP usados por la API. */
const HTTP = { solicitudInvalida: 400, noEncontrado: 404, errorInterno: 500 } as const;

/** Tamaño máximo del cuerpo JSON aceptado. */
const LIMITE_CUERPO_JSON = "32kb";

function cabecerasSeguridad(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
}

function rutasApi(app: Express, deps: DependenciasAplicacion): void {
  app.get("/api/health", (_req, res) => {
    const salud: Salud = {
      ok: true,
      provider: deps.ciclo.llm.proveedor,
      model: deps.ciclo.llm.modelo,
    };
    res.json(salud);
  });

  app.post("/api/chat", async (req, res) => {
    const cuerpo = EsquemaSolicitudChat.safeParse(req.body);
    if (!cuerpo.success) {
      res
        .status(HTTP.solicitudInvalida)
        .json({ error: "Solicitud inválida: se requieren sessionId y message." });
      return;
    }
    res.json(await ejecutarTurno(deps.ciclo, cuerpo.data.sessionId, cuerpo.data.message));
  });

  app.get("/api/sessions/:id", (req, res) => {
    const sesion = deps.ciclo.sesiones.obtener(req.params.id);
    if (!sesion) {
      res.status(HTTP.noEncontrado).json({ error: "Sesión no encontrada." });
      return;
    }
    const vista: VistaSesion = { id: sesion.id, historial: sesion.historial };
    res.json(vista);
  });
}

/**
 * Construye la aplicación Express: rutas de la API (PRD §6.4) y el front estático.
 * @param deps - dependencias del ciclo y carpeta de estáticos
 * @returns la aplicación configurada (sin escuchar)
 */
export function crearAplicacion(deps: DependenciasAplicacion): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(cabecerasSeguridad);
  app.use(express.json({ limit: LIMITE_CUERPO_JSON }));
  rutasApi(app, deps);
  app.use(express.static(deps.carpetaEstaticos));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(deps.carpetaEstaticos, "index.html"));
  });
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    deps.ciclo.registrador.error("error_http", {
      mensaje: err instanceof Error ? err.message : "desconocido",
    });
    res.status(HTTP.errorInterno).json({ error: "Error interno. Intenta de nuevo." });
  });
  return app;
}

/** Compone las dependencias reales y levanta el servidor (raíz de composición). */
function iniciar(): void {
  const config = cargarConfiguracion();
  const raiz = process.cwd();
  const app = crearAplicacion({
    carpetaEstaticos: path.join(raiz, "web", "dist"),
    ciclo: {
      llm: new AdaptadorAnthropic({
        apiKey: config.ANTHROPIC_API_KEY,
        modelo: config.LLM_MODELO,
        timeoutMs: config.LLM_TIMEOUT_MS,
      }),
      sesiones: new AlmacenSesiones({
        maxSesiones: config.MAX_SESIONES,
        maxTokensDia: config.MAX_TOKENS_DIA,
      }),
      promptSistema: cargarPromptSistema(raiz),
      raiz,
      reloj: relojSistema,
      registrador: registradorJson,
      maxIteraciones: config.MAX_ITERACIONES,
      maxTokensSesion: config.MAX_TOKENS_SESION,
    },
  });
  app.listen(config.PORT, () => {
    registradorJson.info("servidor_iniciado", {
      puerto: config.PORT,
      modelo: config.LLM_MODELO,
      claveConfigurada: config.ANTHROPIC_API_KEY !== "",
    });
  });
}

const esPuntoDeEntrada =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (esPuntoDeEntrada) iniciar();
