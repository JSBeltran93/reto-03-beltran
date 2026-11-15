import { exito, type Resultado } from "../../src/comun/resultado";
import type {
  AdaptadorLlm,
  HerramientaLlm,
  LlamadaHerramienta,
  MensajeLlm,
  RespuestaLlm,
} from "../../src/llm/adapter";

/** Paso del guion: respuesta fija o función de la conversación hasta ese momento. */
export type PasoGuion =
  Resultado<RespuestaLlm> | ((mensajes: readonly MensajeLlm[]) => Resultado<RespuestaLlm>);

/** LLM falso que reproduce un guion y registra cada petición para las aserciones. */
export class LlmFalso implements AdaptadorLlm {
  readonly proveedor = "falso";
  readonly modelo = "modelo-falso";
  readonly peticiones: {
    mensajes: readonly MensajeLlm[];
    herramientas: readonly HerramientaLlm[];
  }[] = [];

  /** @param guion - respuestas que se devuelven en orden */
  constructor(readonly guion: PasoGuion[]) {}

  /** @inheritdoc */
  enviar(
    mensajes: readonly MensajeLlm[],
    herramientas: readonly HerramientaLlm[],
  ): Promise<Resultado<RespuestaLlm>> {
    this.peticiones.push({ mensajes: [...mensajes], herramientas });
    const paso = this.guion.shift();
    if (paso === undefined) return Promise.resolve(respuestaTexto("(fin del guion)"));
    return Promise.resolve(typeof paso === "function" ? paso(mensajes) : paso);
  }
}

/**
 * @param texto - texto final
 * @returns respuesta final del modelo
 */
export function respuestaTexto(texto: string): Resultado<RespuestaLlm> {
  return exito({ texto, llamadas: [], uso: { entrada: 10, salida: 5 }, fin: "final" });
}

/**
 * @param llamadas - llamadas sin id
 * @returns respuesta que pide esas llamadas a herramientas
 */
export function pedirHerramientas(
  ...llamadas: Omit<LlamadaHerramienta, "id">[]
): Resultado<RespuestaLlm> {
  return exito({
    texto: "",
    llamadas: llamadas.map((l, i) => ({ ...l, id: `llamada_${String(i)}_${l.nombre}` })),
    uso: { entrada: 10, salida: 5 },
    fin: "herramientas",
  });
}

/**
 * Interpreta el contenido del último resultado de herramienta enviado al modelo.
 * @param mensajes - conversación
 * @param indice - posición dentro del último mensaje de resultados
 * @returns JSON interpretado, o undefined
 */
export function ultimoResultado(mensajes: readonly MensajeLlm[], indice = 0): unknown {
  const ultimo = [...mensajes].reverse().find((m) => m.rol === "resultados");
  const contenido = ultimo?.rol === "resultados" ? ultimo.resultados[indice]?.contenido : undefined;
  return contenido === undefined ? undefined : JSON.parse(contenido);
}
