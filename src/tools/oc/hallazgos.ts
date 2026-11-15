/** Identificador de una regla de control (PRD §7.3). */
export type IdRegla =
  "RC1" | "RC2" | "RC3" | "RC4" | "RC5" | "RC6" | "RC7" | "RC8" | "RC9" | "RC10";

/** Efecto de un hallazgo: bloquea la OC, exige confirmación o informa un valor derivado. */
export type TipoHallazgo = "bloqueo" | "confirmacion" | "derivado";

/** Resultado de evaluar una regla sobre un paquete. */
export interface Hallazgo {
  readonly regla: IdRegla;
  readonly tipo: TipoHallazgo;
  readonly detalle: string;
  readonly valores?: Readonly<Record<string, string | number>>;
  readonly accion_sugerida?: string;
}

interface Adicionales {
  readonly valores?: Readonly<Record<string, string | number>>;
  readonly accion_sugerida?: string;
}

/**
 * Construye un hallazgo omitiendo los campos opcionales no informados.
 * @param regla - regla que lo produce
 * @param tipo - bloqueo, confirmación o derivado
 * @param detalle - explicación para el usuario
 * @param adicionales - valores y acción sugerida (opcionales)
 * @returns el hallazgo
 */
export function hallazgo(
  regla: IdRegla,
  tipo: TipoHallazgo,
  detalle: string,
  adicionales: Adicionales = {},
): Hallazgo {
  return { regla, tipo, detalle, ...adicionales };
}
