/** Mensajes sugeridos antes del primer mensaje; el segundo es el del PRD §11. */
export const MENSAJES_SUGERIDOS = [
  "Procesa la solicitud sol-001.",
  'Procesa la solicitud "sol-004". Muéstrame la OC como quedaría en SAP, qué validaciones pasó y cuáles no, y no la crees hasta que yo lo confirme.',
  "¿Por qué no se puede crear la OC de sol-002?",
] as const;

/** Mensajes que envían los botones de confirmación como un mensaje normal del chat. */
export const RESPUESTAS_CONFIRMACION = {
  confirmar: "Confirmo",
  cancelar: "Cancelar",
} as const;

/** Textos del cuadro de mensaje. */
export const TEXTOS_COMPOSITOR = {
  etiqueta: "Mensaje para el agente",
  enviar: "Enviar",
  normal: "Escribe un mensaje, por ejemplo: procesa la solicitud sol-001",
  esperandoConfirmacion: "Responde «Confirmo» o «Cancelar», o haz una pregunta…",
} as const;

/** Textos del encabezado. */
export const TEXTOS_ENCABEZADO = {
  titulo: "Órdenes de Compra · Agente",
  nuevaSesion: "Nueva sesión",
  conectando: "Conectando…",
  sinServidor: "Servidor no disponible",
} as const;

/** Textos del estado vacío. */
export const TEXTOS_ESTADO_VACIO = {
  titulo: "¿Qué solicitud de compra procesamos?",
  descripcion:
    "El agente lee el paquete, valida los controles RC1–RC10 y crea la OC en SAP solo cuando corresponde.",
} as const;

/** Textos del aviso de confirmación. */
export const TEXTOS_CONFIRMACION = {
  titulo: "El agente necesita tu confirmación antes de crear la OC.",
  ayuda: "Revisa las validaciones de arriba y decide.",
} as const;

/** Textos de la tarjeta de una llamada a herramienta. */
export const TEXTOS_HERRAMIENTA = {
  etiqueta: (nombre: string): string => `Llamada a ${nombre}`,
  correcta: "Llamada correcta: ",
  conError: "Llamada con error: ",
  resumen: "Resultado",
  argumentos: "Argumentos",
} as const;

/** Textos de estado y error. */
export const TEXTOS_ESTADO = {
  pensando: "El agente está trabajando…",
  reintentar: "Reintentar",
  conversacion: "Conversación",
} as const;
