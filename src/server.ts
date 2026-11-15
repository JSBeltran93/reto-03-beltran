/**
 * API HTTP del agente (PRD §6.4) y punto de entrada. `crearAplicacion` arma la aplicacion sin
 * escuchar (se prueba con supertest); al ejecutarse directamente, este archivo
 * compone las dependencias reales (Gemini, sesiones, prompt) y levanta el servidor.
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

import express, { type Express, type NextFunction, type Request, type Response } from "express";

import { type DependenciasCiclo, ejecutarTurno } from "./agente/ciclo";
import { casoPendiente } from "./agente/confirmacion";
import { cargarPromptSistema } from "./agente/prompt-sistema";
import { catalogoOc } from "./agente/registro-herramientas";
import { AlmacenSesiones } from "./agente/sesiones";
import {
  EsquemaSolicitudChat,
  type ListaCasos,
  type Salud,
  type VistaSesion,
} from "./comun/contratos-api";
import { LimitadorSolicitudes } from "./comun/limitador";
import { registradorJson } from "./comun/registrador";
import { relojSistema } from "./comun/reloj";
import { RUTAS_API } from "./comun/rutas-api";
import { cargarConfiguracion, PROVEEDOR_LLM } from "./configuracion";
import { crearAdaptadoresLlm } from "./llm/fabrica";
import type { SapAdapter } from "./sap/adapter";
import { SapSimulado } from "./sap/mock";
import { crearHerramientasOc } from "./tools/oc";
import { resumirCasos } from "./tools/oc/bandeja";

/** Dependencias para construir la aplicación HTTP. */
export interface DependenciasAplicacion {
  readonly ciclo: DependenciasCiclo;
  /** Ruta absoluta del front compilado (web/dist). */
  readonly carpetaEstaticos: string;
  /** Limitador de mensajes de chat por IP; sin él no se limita (tests). */
  readonly limitador?: LimitadorSolicitudes;
  /** SAP que consulta la bandeja; por defecto, el simulado sobre la raíz del ciclo. */
  readonly sap?: SapAdapter;
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

function limitarChat(dependencias: DependenciasAplicacion) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const espera = dependencias.limitador?.registrar(req.ip ?? "desconocida") ?? 0;
    if (espera === 0) {
      next();
      return;
    }
    res.setHeader("Retry-After", String(espera));
    res.status(HTTP.demasiadasSolicitudes).json({ error: MENSAJES_HTTP.demasiadasSolicitudes });
  };
}

/** GET /api/casos: bandeja de solo lectura; un fallo de lectura pasa al manejador de errores. */
function rutaCasos(aplicacion: Express, dependencias: DependenciasAplicacion): void {
  const { raiz } = dependencias.ciclo;
  const sap = dependencias.sap ?? new SapSimulado(raiz);
  aplicacion.get(RUTAS_API.casos, async (_req, res) => {
    const lista: ListaCasos = { casos: await resumirCasos(raiz, sap) };
    res.json(lista);
  });
}

function rutasApi(aplicacion: Express, dependencias: DependenciasAplicacion): void {
  aplicacion.get(RUTAS_API.salud, (_req, res) => {
    const salud: Salud = {
      ok: true,
      provider: dependencias.ciclo.llm.proveedor,
      model: dependencias.ciclo.llm.modelo,
    };
    res.json(salud);
  });

  aplicacion.post(RUTAS_API.chat, limitarChat(dependencias), async (req, res) => {
    const cuerpo = EsquemaSolicitudChat.safeParse(req.body);
    if (!cuerpo.success) {
      res.status(HTTP.solicitudInvalida).json({ error: MENSAJES_HTTP.solicitudInvalida });
      return;
    }
    res.json(await ejecutarTurno(dependencias.ciclo, cuerpo.data.sessionId, cuerpo.data.message));
  });

  aplicacion.get(RUTAS_API.sesionPatron, (req, res) => {
    const sesion = dependencias.ciclo.sesiones.obtener(req.params.id);
    if (!sesion) {
      res.status(HTTP.noEncontrado).json({ error: MENSAJES_HTTP.sesionNoEncontrada });
      return;
    }
    const vista: VistaSesion = {
      id: sesion.id,
      historial: sesion.historial,
      needsConfirmation: sesion.confirmacion.pendientes.length > 0,
      casoPendiente: casoPendiente(sesion.confirmacion),
    };
    res.json(vista);
  });

  rutaCasos(aplicacion, dependencias);

  aplicacion.all(RUTAS_API.desconocidaPatron, (_req, res) => {
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

function manejarError(dependencias: DependenciasAplicacion) {
  return (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    const estadoCliente = estadoErrorCliente(err);
    if (estadoCliente !== null) {
      res.status(estadoCliente).json({ error: MENSAJES_HTTP.errorCliente });
      return;
    }
    dependencias.ciclo.registrador.error("error_http", {
      tipo: err instanceof Error ? err.constructor.name : "desconocido",
    });
    res.status(HTTP.errorInterno).json({ error: MENSAJES_HTTP.errorInterno });
  };
}

/**
 * Construye la aplicación Express: rutas de la API (PRD §6.4) y el front estático.
 * @param dependencias - dependencias del ciclo y carpeta de estáticos
 * @returns la aplicación configurada (sin escuchar)
 */
export function crearAplicacion(dependencias: DependenciasAplicacion): Express {
  const aplicacion = express();
  aplicacion.disable("x-powered-by");
  aplicacion.set("trust proxy", PROXIES_CONFIABLES);
  aplicacion.use(cabecerasSeguridad);
  aplicacion.use(express.json({ limit: LIMITE_CUERPO_JSON }));
  rutasApi(aplicacion, dependencias);
  aplicacion.use(express.static(dependencias.carpetaEstaticos));
  aplicacion.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(dependencias.carpetaEstaticos, "index.html"));
  });
  aplicacion.use(manejarError(dependencias));
  return aplicacion;
}

/** Compone las dependencias reales y levanta el servidor (raíz de composición). */
function iniciar(): void {
  const configuracion = cargarConfiguracion();
  const raiz = process.cwd();
  const herramientas = crearHerramientasOc({
    crearSap: (raizCaso) => new SapSimulado(raizCaso, relojSistema),
    reloj: relojSistema,
  });
  const aplicacion = crearAplicacion({
    carpetaEstaticos: path.join(raiz, "web", "dist"),
    limitador: new LimitadorSolicitudes(configuracion.MAX_SOLICITUDES_MINUTO, relojSistema),
    ciclo: {
      llm: crearAdaptadoresLlm(configuracion, registradorJson),
      sesiones: new AlmacenSesiones({
        maxSesiones: configuracion.MAX_SESIONES,
        maxTokensDia: configuracion.MAX_TOKENS_DIA,
      }),
      promptSistema: cargarPromptSistema(raiz),
      raiz,
      reloj: relojSistema,
      registrador: registradorJson,
      maxIteraciones: configuracion.MAX_ITERACIONES,
      maxTokensSesion: configuracion.MAX_TOKENS_SESION,
      maxSegundosTurno: configuracion.MAX_SEGUNDOS_TURNO,
      catalogo: catalogoOc(herramientas),
    },
  });
  aplicacion.listen(configuracion.PORT, () => {
    registradorJson.info("servidor_iniciado", {
      puerto: configuracion.PORT,
      modelo: configuracion.LLM_MODELO,
      modelosRespaldo: configuracion.LLM_MODELOS_RESPALDO,
      proveedor: PROVEEDOR_LLM,
      claveConfigurada: configuracion.GEMINI_API_KEY !== "",
    });
  });
}

const esPuntoDeEntrada =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (esPuntoDeEntrada) iniciar();
