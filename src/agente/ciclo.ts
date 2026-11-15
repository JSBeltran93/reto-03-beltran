import type { RespuestaChat, VistaLlamada } from "../comun/contratos-api";
import type { Registrador } from "../comun/registrador";
import type { Reloj } from "../comun/reloj";
import type {
  AdaptadorLlm,
  HerramientaLlm,
  LlamadaHerramienta,
  MensajeLlm,
  OpcionesEnvio,
  RespuestaLlm,
  ResultadoHerramienta,
} from "../llm/adapter";
import { registrarLlamada } from "./bitacora";
import { alMensajeUsuario, autorizar, trasHerramienta } from "./confirmacion";
import {
  catalogoOc,
  definicionesLlm,
  type Ejecucion,
  ejecucionFallida,
  ejecutarLlamada,
} from "./registro-herramientas";
import type { AlmacenSesiones, Sesion } from "./sesiones";

/** Dependencias del ciclo del agente, inyectadas desde `server.ts`. */
export interface DependenciasCiclo {
  readonly llm: AdaptadorLlm;
  readonly sesiones: AlmacenSesiones;
  readonly promptSistema: string;
  readonly raiz: string;
  readonly reloj: Reloj;
  readonly registrador: Registrador;
  readonly maxIteraciones: number;
  readonly maxTokensSesion: number;
}

const CATALOGO = catalogoOc();
const HERRAMIENTAS: readonly HerramientaLlm[] = definicionesLlm(CATALOGO);
const AVISO_TOPE =
  "Se alcanzó el límite de pasos de este turno. Resume para el usuario lo que ya se hizo y lo que falta, sin llamar herramientas.";
const MENSAJES_SISTEMA = {
  presupuesto:
    "Se agotó el presupuesto de uso del modelo. Abre una sesión nueva o intenta más tarde.",
  truncada:
    "La respuesta del modelo quedó incompleta por su largo y no se ejecutó ninguna acción. Pide algo más acotado.",
  rechazo:
    "El modelo no puede ayudar con esa solicitud. Reformúlala sobre el proceso de órdenes de compra.",
  errorHerramienta: "Error inesperado al ejecutar la herramienta.",
} as const;

/** Turnos en curso por sesión: los turnos de una misma sesión se ejecutan en orden. */
const turnosEnCurso = new Map<string, Promise<unknown>>();

interface Turno {
  readonly sesion: Sesion;
  readonly deps: DependenciasCiclo;
  readonly llamadas: VistaLlamada[];
}

function responder(
  turno: Turno,
  texto: string,
  tipo: "asistente" | "error" = "asistente",
): RespuestaChat {
  turno.sesion.historial.push({ tipo, texto });
  return {
    reply: texto,
    toolCalls: turno.llamadas,
    needsConfirmation: turno.sesion.confirmacion.pendiente !== null,
    ...(tipo === "error" && { esError: true }),
  };
}

function hoy(reloj: Reloj): string {
  return reloj.ahora().toISOString().slice(0, 10);
}

function presupuestoAgotado(turno: Turno): boolean {
  const { sesion, deps } = turno;
  return (
    sesion.tokensUsados >= deps.maxTokensSesion ||
    deps.sesiones.presupuestoDiarioAgotado(hoy(deps.reloj))
  );
}

/** Ejecuta la llamada; cualquier excepción se vuelve ERROR_INTERNO para que la sesión siga viva (CA5). */
async function ejecutarSeguro(turno: Turno, llamada: LlamadaHerramienta): Promise<Ejecucion> {
  const { sesion, deps } = turno;
  const denegada = autorizar(sesion.confirmacion, llamada);
  if (denegada) return denegada;
  try {
    return await ejecutarLlamada(CATALOGO, llamada, { directory: deps.raiz, sessionId: sesion.id });
  } catch (error) {
    deps.registrador.error("error_herramienta", {
      herramienta: llamada.nombre,
      tipo: error instanceof Error ? error.constructor.name : "desconocido",
    });
    return ejecucionFallida(llamada, "ERROR_INTERNO", MENSAJES_SISTEMA.errorHerramienta);
  }
}

/** Escribe la bitácora; si falla, solo lo registra: la auditoría no debe romper el turno. */
function auditar(turno: Turno, vista: VistaLlamada, inicio: number): void {
  const { sesion, deps } = turno;
  try {
    registrarLlamada(deps.raiz, {
      sessionId: sesion.id,
      llamada: vista,
      duracionMs: Date.now() - inicio,
      ts: deps.reloj.ahora().toISOString(),
    });
  } catch (error) {
    deps.registrador.error("error_bitacora", {
      tipo: error instanceof Error ? error.constructor.name : "desconocido",
    });
  }
}

async function ejecutarHerramienta(
  turno: Turno,
  llamada: LlamadaHerramienta,
): Promise<ResultadoHerramienta> {
  const inicio = Date.now();
  const ejecucion = await ejecutarSeguro(turno, llamada);
  trasHerramienta(turno.sesion.confirmacion, llamada, ejecucion.data);
  turno.llamadas.push(ejecucion.vista);
  turno.sesion.historial.push({ tipo: "herramienta", llamada: ejecucion.vista });
  auditar(turno, ejecucion.vista, inicio);
  return { id: llamada.id, contenido: ejecucion.json, error: !ejecucion.vista.ok };
}

async function consultarModelo(
  turno: Turno,
  opciones: OpcionesEnvio = {},
): ReturnType<AdaptadorLlm["enviar"]> {
  const { sesion, deps } = turno;
  const mensajes: MensajeLlm[] = [
    { rol: "sistema", contenido: deps.promptSistema },
    ...sesion.mensajes,
  ];
  const resultado = await deps.llm.enviar(mensajes, HERRAMIENTAS, opciones);
  if (resultado.ok) {
    const { entrada, salida } = resultado.data.uso;
    deps.sesiones.registrarTokens(sesion, entrada + salida, hoy(deps.reloj));
  } else {
    deps.registrador.error("error_llm", {
      sessionId: sesion.id,
      codigo: resultado.error.codigo,
      ...resultado.error.diagnostico,
    });
  }
  return resultado;
}

async function cerrarPorTope(turno: Turno): Promise<RespuestaChat> {
  turno.sesion.mensajes.push({ rol: "usuario", contenido: AVISO_TOPE });
  const resultado = await consultarModelo(turno, { sinLlamadas: true });
  if (!resultado.ok) return responder(turno, resultado.error.mensaje, "error");
  const { texto, bruto } = resultado.data;
  turno.sesion.mensajes.push({ rol: "asistente", texto, llamadas: [], bruto });
  return responder(turno, texto);
}

/**
 * Procesa una respuesta del modelo.
 * @returns la respuesta final del turno, o null si hay que seguir iterando
 */
async function procesarRespuesta(
  turno: Turno,
  respuesta: RespuestaLlm,
): Promise<RespuestaChat | null> {
  const { texto, llamadas, bruto, fin } = respuesta;
  if (fin === "limite") return responder(turno, MENSAJES_SISTEMA.truncada, "error");
  if (fin === "rechazo") return responder(turno, MENSAJES_SISTEMA.rechazo, "error");
  turno.sesion.mensajes.push({ rol: "asistente", texto, llamadas, bruto });
  if (llamadas.length === 0) return responder(turno, texto);
  const resultados: ResultadoHerramienta[] = [];
  for (const llamada of llamadas) resultados.push(await ejecutarHerramienta(turno, llamada));
  turno.sesion.mensajes.push({ rol: "resultados", resultados });
  return null;
}

async function ejecutarTurnoSinBloqueo(
  deps: DependenciasCiclo,
  sessionId: string,
  mensaje: string,
): Promise<RespuestaChat> {
  const sesion = deps.sesiones.obtenerOCrear(sessionId);
  const turno: Turno = { sesion, deps, llamadas: [] };
  alMensajeUsuario(sesion.confirmacion, mensaje);
  sesion.historial.push({ tipo: "usuario", texto: mensaje });
  sesion.mensajes.push({ rol: "usuario", contenido: mensaje });

  for (let iteracion = 0; iteracion < deps.maxIteraciones; iteracion++) {
    if (presupuestoAgotado(turno)) return responder(turno, MENSAJES_SISTEMA.presupuesto, "error");
    const resultado = await consultarModelo(turno);
    if (!resultado.ok) return responder(turno, resultado.error.mensaje, "error");
    const final = await procesarRespuesta(turno, resultado.data);
    if (final) return final;
  }
  return cerrarPorTope(turno);
}

/**
 * Ejecuta un turno del chat (PRD §6.3): modelo → herramientas → modelo… hasta la
 * respuesta final, el tope de iteraciones (CA1) o el presupuesto de tokens. Cada
 * llamada se valida, pasa por la compuerta de confirmación (CA3) y se registra (CA4);
 * todo error se vuelve un mensaje claro y la sesión sigue viva (CA5). Los turnos de una
 * misma sesión se ejecutan en orden para no mezclar el historial.
 * @param deps - dependencias del ciclo
 * @param sessionId - sesión enviada por el front
 * @param mensaje - mensaje del usuario
 * @returns respuesta, llamadas de este turno y si hay una confirmación pendiente
 */
export async function ejecutarTurno(
  deps: DependenciasCiclo,
  sessionId: string,
  mensaje: string,
): Promise<RespuestaChat> {
  const anterior = turnosEnCurso.get(sessionId) ?? Promise.resolve();
  const actual = anterior.then(() => ejecutarTurnoSinBloqueo(deps, sessionId, mensaje));
  const cola = actual.catch(() => undefined);
  turnosEnCurso.set(sessionId, cola);
  void cola.then(() => {
    if (turnosEnCurso.get(sessionId) === cola) turnosEnCurso.delete(sessionId);
  });
  return actual;
}
