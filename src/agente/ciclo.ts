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
import { alMensajeUsuario, autorizar, casoPendiente, trasHerramienta } from "./confirmacion";
import {
  type Catalogo,
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
  /** Plazo máximo de un turno completo, en segundos. */
  readonly maxSegundosTurno: number;
  /** Herramientas disponibles; por defecto, las del PRD con SAP simulado. */
  readonly catalogo?: Catalogo;
}

/** Milisegundos por segundo, para convertir el plazo del turno. */
const MS_POR_SEGUNDO = 1000;

const CATALOGO_POR_DEFECTO = catalogoOc();
const definicionesPorCatalogo = new WeakMap<Catalogo, readonly HerramientaLlm[]>();

/** Catálogo del turno: el inyectado o el por defecto. */
function catalogoDe(dependencias: DependenciasCiclo): Catalogo {
  return dependencias.catalogo ?? CATALOGO_POR_DEFECTO;
}

/** Definiciones JSON Schema del catálogo, calculadas una vez por catálogo. */
function herramientasDe(dependencias: DependenciasCiclo): readonly HerramientaLlm[] {
  const catalogo = catalogoDe(dependencias);
  const enCache = definicionesPorCatalogo.get(catalogo);
  if (enCache) return enCache;
  const definiciones = definicionesLlm(catalogo);
  definicionesPorCatalogo.set(catalogo, definiciones);
  return definiciones;
}
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
  plazo:
    "El turno superó el tiempo máximo. Lo hecho hasta aquí quedó registrado; intenta de nuevo.",
} as const;

/** Turnos en curso por sesión: los turnos de una misma sesión se ejecutan en orden. */
const turnosEnCurso = new Map<string, Promise<unknown>>();

interface Turno {
  readonly sesion: Sesion;
  readonly dependencias: DependenciasCiclo;
  readonly llamadas: VistaLlamada[];
  /** Se activa cuando se agota el plazo del turno. */
  readonly senal: AbortSignal;
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
    needsConfirmation: turno.sesion.confirmacion.pendientes.length > 0,
    casoPendiente: casoPendiente(turno.sesion.confirmacion),
    ...(tipo === "error" && { esError: true }),
  };
}

function hoy(reloj: Reloj): string {
  return reloj.ahora().toISOString().slice(0, 10);
}

function presupuestoAgotado(turno: Turno): boolean {
  const { sesion, dependencias } = turno;
  return (
    sesion.tokensUsados >= dependencias.maxTokensSesion ||
    dependencias.sesiones.presupuestoDiarioAgotado(hoy(dependencias.reloj))
  );
}

/** Ejecuta la llamada; cualquier excepción se vuelve ERROR_INTERNO para que la sesión siga viva (CA5). */
async function ejecutarSeguro(turno: Turno, llamada: LlamadaHerramienta): Promise<Ejecucion> {
  const { sesion, dependencias } = turno;
  try {
    return await ejecutarLlamada(catalogoDe(dependencias), llamada, {
      directory: dependencias.raiz,
      sessionId: sesion.id,
    });
  } catch (error) {
    dependencias.registrador.error("error_herramienta", {
      herramienta: llamada.nombre,
      tipo: error instanceof Error ? error.constructor.name : "desconocido",
    });
    return ejecucionFallida(llamada, "ERROR_INTERNO", MENSAJES_SISTEMA.errorHerramienta);
  }
}

/** Escribe la bitácora; si falla, solo lo registra: la auditoría no debe romper el turno. */
function auditar(turno: Turno, vista: VistaLlamada, inicio: number): void {
  const { sesion, dependencias } = turno;
  try {
    registrarLlamada(dependencias.raiz, {
      sessionId: sesion.id,
      llamada: vista,
      duracionMs: Date.now() - inicio,
      ts: dependencias.reloj.ahora().toISOString(),
    });
  } catch (error) {
    dependencias.registrador.error("error_bitacora", {
      tipo: error instanceof Error ? error.constructor.name : "desconocido",
    });
  }
}

async function ejecutarHerramienta(
  turno: Turno,
  llamada: LlamadaHerramienta,
): Promise<ResultadoHerramienta> {
  const inicio = Date.now();
  // Se ejecuta (y se muestra en CA4) la llamada que pasó la compuerta, no la que pidió el modelo.
  const efectiva = autorizar(turno.sesion.confirmacion, llamada);
  if (efectiva !== llamada)
    turno.dependencias.registrador.info("confirmacion_no_otorgada", {
      sessionId: turno.sesion.id,
      herramienta: llamada.nombre,
    });
  const ejecucion = await ejecutarSeguro(turno, efectiva);
  trasHerramienta(turno.sesion.confirmacion, efectiva, ejecucion);
  turno.llamadas.push(ejecucion.vista);
  turno.sesion.historial.push({ tipo: "herramienta", llamada: ejecucion.vista });
  auditar(turno, ejecucion.vista, inicio);
  return { id: llamada.id, contenido: ejecucion.serializado, error: !ejecucion.vista.ok };
}

async function consultarModelo(
  turno: Turno,
  opciones: OpcionesEnvio = {},
): ReturnType<AdaptadorLlm["enviar"]> {
  const { sesion, dependencias } = turno;
  const mensajes: MensajeLlm[] = [
    { rol: "sistema", contenido: dependencias.promptSistema },
    ...sesion.mensajes,
  ];
  const resultado = await dependencias.llm.enviar(mensajes, herramientasDe(dependencias), {
    ...opciones,
    senal: turno.senal,
  });
  if (resultado.ok) {
    const { entrada, salida } = resultado.data.uso;
    dependencias.sesiones.registrarTokens(sesion, entrada + salida, hoy(dependencias.reloj));
  } else {
    dependencias.registrador.error("error_llm", {
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
  dependencias: DependenciasCiclo,
  sessionId: string,
  mensaje: string,
): Promise<RespuestaChat> {
  const sesion = dependencias.sesiones.obtenerOCrear(sessionId);
  const senal = AbortSignal.timeout(dependencias.maxSegundosTurno * MS_POR_SEGUNDO);
  const turno: Turno = { sesion, dependencias, llamadas: [], senal };
  alMensajeUsuario(sesion.confirmacion, mensaje);
  sesion.historial.push({ tipo: "usuario", texto: mensaje });
  sesion.mensajes.push({ rol: "usuario", contenido: mensaje });

  for (let iteracion = 0; iteracion < dependencias.maxIteraciones; iteracion++) {
    if (presupuestoAgotado(turno)) return responder(turno, MENSAJES_SISTEMA.presupuesto, "error");
    if (senal.aborted) return responder(turno, MENSAJES_SISTEMA.plazo, "error");
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
 * @param dependencias - dependencias del ciclo
 * @param sessionId - sesión enviada por el front
 * @param mensaje - mensaje del usuario
 * @returns respuesta, llamadas de este turno y si hay una confirmación pendiente
 */
export async function ejecutarTurno(
  dependencias: DependenciasCiclo,
  sessionId: string,
  mensaje: string,
): Promise<RespuestaChat> {
  const anterior = turnosEnCurso.get(sessionId) ?? Promise.resolve();
  const actual = anterior.then(() => ejecutarTurnoSinBloqueo(dependencias, sessionId, mensaje));
  const cola = actual.catch(() => undefined);
  turnosEnCurso.set(sessionId, cola);
  void cola.then(() => {
    if (turnosEnCurso.get(sessionId) === cola) turnosEnCurso.delete(sessionId);
  });
  return actual;
}
