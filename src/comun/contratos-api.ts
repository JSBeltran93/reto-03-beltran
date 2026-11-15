/**
 * Contratos de la API HTTP compartidos por back y front (alias `@contratos`).
 * Los campos de chat y salud son literales del PRD §6.4.
 */
import { z } from "zod";

/** Cuerpo de POST /api/chat. */
export const EsquemaSolicitudChat = z.object({
  sessionId: z.uuid(),
  message: z.string().trim().min(1).max(4000),
});
/** Cuerpo de POST /api/chat. */
export type SolicitudChat = z.infer<typeof EsquemaSolicitudChat>;

/** Llamada a herramienta mostrada en el chat: nombre, argumentos y resultado resumido (PRD §6.1). */
export const EsquemaVistaLlamada = z.object({
  nombre: z.string(),
  args: z.unknown(),
  ok: z.boolean(),
  resumen: z.string(),
  /** Resultado completo de la herramienta si tuvo éxito (para mostrarlo con detalle en el front). */
  datos: z.unknown().optional(),
});
/** Llamada a herramienta mostrada en el chat. */
export type VistaLlamada = z.infer<typeof EsquemaVistaLlamada>;

/** Respuesta de POST /api/chat. */
export const EsquemaRespuestaChat = z.object({
  reply: z.string(),
  toolCalls: z.array(EsquemaVistaLlamada),
  needsConfirmation: z.boolean(),
  /** true cuando `reply` es un error del sistema (modelo no disponible, presupuesto agotado…). */
  esError: z.boolean().optional(),
});
/** Respuesta de POST /api/chat. */
export type RespuestaChat = z.infer<typeof EsquemaRespuestaChat>;

/** Entrada del historial visible. */
export const EsquemaEntradaHistorial = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("usuario"), texto: z.string() }),
  z.object({ tipo: z.literal("asistente"), texto: z.string() }),
  z.object({ tipo: z.literal("error"), texto: z.string() }),
  z.object({ tipo: z.literal("herramienta"), llamada: EsquemaVistaLlamada }),
]);
/** Entrada del historial visible. */
export type EntradaHistorial = z.infer<typeof EsquemaEntradaHistorial>;

/** Respuesta de GET /api/sessions/:id. */
export const EsquemaVistaSesion = z.object({
  id: z.string(),
  historial: z.array(EsquemaEntradaHistorial),
});
/** Respuesta de GET /api/sessions/:id. */
export type VistaSesion = z.infer<typeof EsquemaVistaSesion>;

/** Respuesta de GET /api/health (nunca incluye secretos). */
export const EsquemaSalud = z.object({
  ok: z.literal(true),
  provider: z.string(),
  model: z.string(),
});
/** Respuesta de GET /api/health. */
export type Salud = z.infer<typeof EsquemaSalud>;
