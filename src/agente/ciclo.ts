import type { RespuestaChat, VistaLlamada } from "../comun/contratos-api";
import type { Registrador } from "../comun/registrador";
import type { Reloj } from "../comun/reloj";
import type {
  AdaptadorLlm,
  HerramientaLlm,
  LlamadaHerramienta,
  MensajeLlm,
  ResultadoHerramienta,
} from "../llm/adapter";
import { registrarLlamada } from "./bitacora";
import { alMensajeUsuario, autorizar, trasHerramienta } from "./confirmacion";
import { catalogoOc, definicionesLlm, ejecutarLlamada } from "./registro-herramientas";
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
const MENSAJE_PRESUPUESTO =
  "Se agotó el presupuesto de uso del modelo. Abre una sesión nueva o intenta más tarde.";

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

async function ejecutarHerramienta(
  turno: Turno,
  llamada: LlamadaHerramienta,
): Promise<ResultadoHerramienta> {
  const { sesion, deps } = turno;
  const denegada = autorizar(sesion.confirmacion, llamada);
  const inicio = Date.now();
  const ejecucion = denegada
    ? {
        vista: {
          nombre: llamada.nombre,
          args: llamada.args,
          ok: false,
          resumen: "CONFIRMACION_NO_OTORGADA",
        },
        json: denegada,
        data: undefined,
      }
    : await ejecutarLlamada(CATALOGO, llamada, { directory: deps.raiz, sessionId: sesion.id });
  trasHerramienta(sesion.confirmacion, llamada, ejecucion.data);
  turno.llamadas.push(ejecucion.vista);
  sesion.historial.push({ tipo: "herramienta", llamada: ejecucion.vista });
  registrarLlamada(deps.raiz, {
    sessionId: sesion.id,
    llamada: ejecucion.vista,
    duracionMs: Date.now() - inicio,
    ts: deps.reloj.ahora().toISOString(),
  });
  return { id: llamada.id, contenido: ejecucion.json, error: !ejecucion.vista.ok };
}

async function consultarModelo(
  turno: Turno,
  herramientas: readonly HerramientaLlm[],
): ReturnType<AdaptadorLlm["enviar"]> {
  const { sesion, deps } = turno;
  const mensajes: MensajeLlm[] = [
    { rol: "sistema", contenido: deps.promptSistema },
    ...sesion.mensajes,
  ];
  const resultado = await deps.llm.enviar(mensajes, herramientas);
  if (resultado.ok) {
    const { entrada, salida } = resultado.data.uso;
    deps.sesiones.registrarTokens(sesion, entrada + salida, hoy(deps.reloj));
  }
  return resultado;
}

async function cerrarPorTope(turno: Turno): Promise<RespuestaChat> {
  turno.sesion.mensajes.push({ rol: "usuario", contenido: AVISO_TOPE });
  const resultado = await consultarModelo(turno, []);
  if (!resultado.ok) return responder(turno, resultado.error.mensaje, "error");
  const { texto, bruto } = resultado.data;
  turno.sesion.mensajes.push({ rol: "asistente", texto, llamadas: [], bruto });
  return responder(turno, texto);
}

/**
 * Ejecuta un turno del chat (PRD §6.3): modelo → herramientas → modelo… hasta la
 * respuesta final, el tope de iteraciones (CA1) o el presupuesto de tokens. Cada
 * llamada se valida, pasa por la compuerta de confirmación (CA3) y se registra (CA4);
 * todo error se vuelve un mensaje claro y la sesión sigue viva (CA5).
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
  const sesion = deps.sesiones.obtenerOCrear(sessionId);
  const turno: Turno = { sesion, deps, llamadas: [] };
  alMensajeUsuario(sesion.confirmacion, mensaje);
  sesion.historial.push({ tipo: "usuario", texto: mensaje });
  sesion.mensajes.push({ rol: "usuario", contenido: mensaje });

  for (let iteracion = 0; iteracion < deps.maxIteraciones; iteracion++) {
    if (presupuestoAgotado(turno)) return responder(turno, MENSAJE_PRESUPUESTO, "error");
    const resultado = await consultarModelo(turno, HERRAMIENTAS);
    if (!resultado.ok) {
      deps.registrador.error("error_llm", { sessionId, codigo: resultado.error.codigo });
      return responder(turno, resultado.error.mensaje, "error");
    }
    const { texto, llamadas, bruto } = resultado.data;
    sesion.mensajes.push({ rol: "asistente", texto, llamadas, bruto });
    if (llamadas.length === 0) return responder(turno, texto);
    const resultados: ResultadoHerramienta[] = [];
    for (const llamada of llamadas) resultados.push(await ejecutarHerramienta(turno, llamada));
    sesion.mensajes.push({ rol: "resultados", resultados });
  }
  return cerrarPorTope(turno);
}
