/** Prompts sugeridos antes del primer mensaje; el segundo es el del PRD §11. */
export const PROMPTS_SUGERIDOS = [
  "Procesa la solicitud sol-001.",
  'Procesa la solicitud "sol-004". Muéstrame la OC como quedaría en SAP, qué validaciones pasó y cuáles no, y no la crees hasta que yo lo confirme.',
  "¿Por qué no se puede crear la OC de sol-002?",
] as const;

/** Mensajes que envían los botones de confirmación como un mensaje normal del chat. */
export const RESPUESTAS_CONFIRMACION = {
  confirmar: "Confirmo",
  cancelar: "Cancelar",
} as const;

/** Textos guía del cuadro de mensaje según el estado de la conversación. */
export const TEXTOS_COMPOSITOR = {
  normal: "Escribe un mensaje, por ejemplo: procesa la solicitud sol-001",
  esperandoConfirmacion: "Responde «Confirmo» o «Cancelar», o haz una pregunta…",
} as const;
