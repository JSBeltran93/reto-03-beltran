import type { CodigoError } from "../comun/errores";
import type { Registrador } from "../comun/registrador";
import { fallo, type Resultado } from "../comun/resultado";
import type {
  AdaptadorLlm,
  HerramientaLlm,
  MensajeLlm,
  OpcionesEnvio,
  RespuestaLlm,
} from "./adapter";

/** Mensaje si no queda ningún adaptador por probar. */
const MENSAJE_SIN_MODELOS = "El modelo no está disponible en este momento.";

/**
 * Fallos del proveedor que justifican probar el siguiente modelo: caídas, límites,
 * tiempos agotados y rechazos. Una clave inválida o una solicitud mal formada fallarían
 * igual con cualquier modelo, así que no se reintentan.
 */
export const CODIGOS_CON_RESPALDO: readonly CodigoError[] = [
  "LLM_TIMEOUT",
  "LLM_LIMITE",
  "LLM_NO_DISPONIBLE",
  "LLM_RECHAZO",
];

/**
 * Quita el contenido propio del proveedor: los bloques de razonamiento de un modelo
 * no se pueden reenviar a otro, así que el turno se reconstruye con texto y llamadas.
 * @param respuesta - respuesta de un adaptador de respaldo
 * @returns la misma respuesta sin `bruto`
 */
function sinContenidoBruto(respuesta: RespuestaLlm): RespuestaLlm {
  const { texto, llamadas, uso, fin } = respuesta;
  return { texto, llamadas, uso, fin };
}

/**
 * Adaptador LLM con modelos de respaldo: prueba los adaptadores en orden y devuelve la
 * primera respuesta exitosa. Solo pasa al siguiente ante los códigos de
 * {@link CODIGOS_CON_RESPALDO}; si todos fallan devuelve el último error. Expone el
 * proveedor y el modelo del adaptador principal (los que muestra /api/health).
 */
export class AdaptadorConRespaldo implements AdaptadorLlm {
  readonly proveedor: string;
  readonly modelo: string;

  /**
   * @param adaptadores - adaptadores en orden de preferencia; el primero es el principal
   * @param registrador - registra qué adaptador respondió y por qué se cambió
   * @throws Error si no se recibe ningún adaptador
   */
  constructor(
    private readonly adaptadores: readonly AdaptadorLlm[],
    private readonly registrador: Registrador,
  ) {
    const [principal] = adaptadores;
    if (principal === undefined) throw new Error("Se requiere al menos un adaptador LLM.");
    this.proveedor = principal.proveedor;
    this.modelo = principal.modelo;
  }

  /** @inheritdoc */
  async enviar(
    mensajes: readonly MensajeLlm[],
    herramientas: readonly HerramientaLlm[],
    opciones: OpcionesEnvio = {},
  ): Promise<Resultado<RespuestaLlm>> {
    let ultimo: Resultado<RespuestaLlm> | undefined;
    for (const [indice, adaptador] of this.adaptadores.entries()) {
      ultimo = await adaptador.enviar(mensajes, herramientas, opciones);
      if (ultimo.ok) return this.respuestaExitosa(ultimo.data, indice, adaptador);
      if (!CODIGOS_CON_RESPALDO.includes(ultimo.error.codigo)) return ultimo;
      this.registrador.error("llm_respaldo", {
        modelo: adaptador.modelo,
        codigo: ultimo.error.codigo,
      });
    }
    return ultimo ?? fallo("LLM_NO_DISPONIBLE", MENSAJE_SIN_MODELOS);
  }

  private respuestaExitosa(
    respuesta: RespuestaLlm,
    indice: number,
    adaptador: AdaptadorLlm,
  ): Resultado<RespuestaLlm> {
    if (indice === 0) return { ok: true, data: respuesta };
    this.registrador.info("llm_respaldo_respondio", { modelo: adaptador.modelo });
    return { ok: true, data: sinContenidoBruto(respuesta) };
  }
}
