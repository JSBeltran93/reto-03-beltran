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
import { catalogoOc } from "./agente/registro-herramientas";
import { AlmacenSesiones } from "./agente/sesiones";
import { EsquemaSolicitudChat, type Salud, type VistaSesion } from "./comun/contratos-api";
import { LimitadorSolicitudes } from "./comun/limitador";
import { registradorJson } from "./comun/registrador";
import { relojSistema } from "./comun/reloj";
import { RUTAS_API } from "./comun/rutas-api";
import { cargarConfiguracion } from "./configuracion";
import type { AdaptadorLlm } from "./llm/adapter";
import { AdaptadorAnthropic } from "./llm/anthropic";
import { AdaptadorConRespaldo } from "./llm/respaldo";
import { SapSimulado } from "./sap/mock";
import { crearHerramientasOc } from "./tools/oc";

/** Dependencias para construir la aplicación HTTP. */
export interface DependenciasAplicacion {
  readonly ciclo: DependenciasCiclo;
  /** Ruta absoluta del front compilado (web/dist). */
  readonly carpetaEstaticos: string;
  /** Limitador de mensajes de chat por IP; sin él no se limita (tests). */
  readonly limitador?: LimitadorSolicitudes;
}

/** Códigos HTTP usados por la API. */
const HTTP = {
  solicitudInvalida: 400,
  noEncontrado: 404,
  demasiadasSolicitudes: 429,
  errorInterno: 500,
  primerErrorCliente: 400,
  primerErrorServidor: 500,
} as const;

/** Mensajes de la API para errores HTTP (sin detalles internos). */
const MENSAJES_HTTP = {
  solicitudInvalida: "Solicitud inválida: se requieren sessionId (UUID) y message.",
  sesionNoEncontrada: "Sesión no encontrada.",
  demasiadasSolicitudes: "Demasiados mensajes seguidos. Espera un momento e intenta de nuevo.",
  rutaNoEncontrada: "Ruta de la API no encontrada.",
  errorCliente: "La solicitud no se pudo procesar. Revisa el formato y el tamaño del mensaje.",
  errorInterno: "Error interno. Intenta de nuevo.",
} as const;

/** Tamaño máximo del cuerpo JSON aceptado. */
const LIMITE_CUERPO_JSON = "32kb";

/** Saltos de proxy confiables (Railway pone uno delante) para obtener la IP real. */
const PROXIES_CONFIABLES = 1;

/** Cabeceras de seguridad de todas las respuestas. */
const CABECERAS_SEGURIDAD: Readonly<Record<string, string>> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

function cabecerasSeguridad(_req: Request, res: Response, next: NextFunction): void {
  for (const [nombre, valor] of Object.entries(CABECERAS_SEGURIDAD)) res.setHeader(nombre, valor);
  next();
}

function limitarChat(deps: DependenciasAplicacion) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const espera = deps.limitador?.registrar(req.ip ?? "desconocida") ?? 0;
    if (espera === 0) {
      next();
      return;
    }
    res.setHeader("Retry-After", String(espera));
    res.status(HTTP.demasiadasSolicitudes).json({ error: MENSAJES_HTTP.demasiadasSolicitudes });
  };
}

function rutasApi(app: Express, deps: DependenciasAplicacion): void {
  app.get(RUTAS_API.salud, (_req, res) => {
    const salud: Salud = {
      ok: true,
      provider: deps.ciclo.llm.proveedor,
      model: deps.ciclo.llm.modelo,
    };
    res.json(salud);
  });

  app.post(RUTAS_API.chat, limitarChat(deps), async (req, res) => {
    const cuerpo = EsquemaSolicitudChat.safeParse(req.body);
    if (!cuerpo.success) {
      res.status(HTTP.solicitudInvalida).json({ error: MENSAJES_HTTP.solicitudInvalida });
      return;
    }
    res.json(await ejecutarTurno(deps.ciclo, cuerpo.data.sessionId, cuerpo.data.message));
  });

  app.get(RUTAS_API.sesionPatron, (req, res) => {
    const sesion = deps.ciclo.sesiones.obtener(req.params.id);
    if (!sesion) {
      res.status(HTTP.noEncontrado).json({ error: MENSAJES_HTTP.sesionNoEncontrada });
      return;
    }
    const vista: VistaSesion = { id: sesion.id, historial: sesion.historial };
    res.json(vista);
  });

  app.all(RUTAS_API.desconocidaPatron, (_req, res) => {
    res.status(HTTP.noEncontrado).json({ error: MENSAJES_HTTP.rutaNoEncontrada });
  });
}

/** Estado HTTP de un error de cliente (JSON mal formado, cuerpo muy grande), o null. */
function estadoErrorCliente(err: unknown): number | null {
  const estado = (err as { status?: unknown } | null)?.status;
  return typeof estado === "number" &&
    estado >= HTTP.primerErrorCliente &&
    estado < HTTP.primerErrorServidor
    ? estado
    : null;
}

function manejarError(deps: DependenciasAplicacion) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    const estadoCliente = estadoErrorCliente(err);
    if (estadoCliente !== null) {
      res.status(estadoCliente).json({ error: MENSAJES_HTTP.errorCliente });
      return;
    }
    deps.ciclo.registrador.error("error_http", {
      tipo: err instanceof Error ? err.constructor.name : "desconocido",
    });
    res.status(HTTP.errorInterno).json({ error: MENSAJES_HTTP.errorInterno });
  };
}

/**
 * Construye la aplicación Express: rutas de la API (PRD §6.4) y el front estático.
 * @param deps - dependencias del ciclo y carpeta de estáticos
 * @returns la aplicación configurada (sin escuchar)
 */
export function crearAplicacion(deps: DependenciasAplicacion): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", PROXIES_CONFIABLES);
  app.use(cabecerasSeguridad);
  app.use(express.json({ limit: LIMITE_CUERPO_JSON }));
  rutasApi(app, deps);
  app.use(express.static(deps.carpetaEstaticos));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(deps.carpetaEstaticos, "index.html"));
  });
  app.use(manejarError(deps));
  return app;
}

/**
 * Modelo principal con respaldo: si el principal no está disponible, responde el de respaldo.
 * @param config - configuración validada
 * @returns adaptador LLM compuesto
 */
function crearLlm(config: ReturnType<typeof cargarConfiguracion>): AdaptadorLlm {
  const anthropic = (modelo: string): AdaptadorLlm =>
    new AdaptadorAnthropic({
      apiKey: config.ANTHROPIC_API_KEY,
      modelo,
      timeoutMs: config.LLM_TIMEOUT_MS,
    });
  return new AdaptadorConRespaldo(
    [anthropic(config.LLM_MODELO), anthropic(config.LLM_MODELO_RESPALDO)],
    registradorJson,
  );
}

/** Compone las dependencias reales y levanta el servidor (raíz de composición). */
function iniciar(): void {
  const config = cargarConfiguracion();
  const raiz = process.cwd();
  const herramientas = crearHerramientasOc({
    crearSap: (raizCaso) => new SapSimulado(raizCaso, relojSistema),
    reloj: relojSistema,
  });
  const app = crearAplicacion({
    carpetaEstaticos: path.join(raiz, "web", "dist"),
    limitador: new LimitadorSolicitudes(config.MAX_SOLICITUDES_MINUTO, relojSistema),
    ciclo: {
      llm: crearLlm(config),
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
      maxSegundosTurno: config.MAX_SEGUNDOS_TURNO,
      catalogo: catalogoOc(herramientas),
    },
  });
  app.listen(config.PORT, () => {
    registradorJson.info("servidor_iniciado", {
      puerto: config.PORT,
      modelo: config.LLM_MODELO,
      modeloRespaldo: config.LLM_MODELO_RESPALDO,
      claveConfigurada: config.ANTHROPIC_API_KEY !== "",
    });
  });
}

const esPuntoDeEntrada =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (esPuntoDeEntrada) iniciar();
