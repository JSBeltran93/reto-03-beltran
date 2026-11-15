/** Mensajes sugeridos antes del primer mensaje; el segundo es el del PRD §11. */
export const MENSAJES_SUGERIDOS = [
  "Procesa la solicitud sol-001.",
  'Procesa la solicitud "sol-004". Muéstrame la OC como quedaría en SAP, qué validaciones pasó y cuáles no, y no la crees hasta que yo lo confirme.',
  "¿Por qué no se puede crear la OC de sol-002?",
] as const;

/** Casos de prueba del reto que se ofrecen como accesos rápidos. */
export const CASOS_RAPIDOS = [
  "sol-001",
  "sol-002",
  "sol-003",
  "sol-004",
  "sol-005",
  "sol-006",
] as const;

/**
 * Mensaje que envía el acceso rápido de un caso.
 * @param caso - carpeta del caso
 * @returns el mensaje para el agente
 */
export const mensajeCaso = (caso: string): string => `Procesa la solicitud ${caso}.`;

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
  ayuda: "Enter envía · Shift + Enter agrega una línea",
} as const;

/** Textos del encabezado. */
export const TEXTOS_ENCABEZADO = {
  titulo: "Órdenes de Compra",
  subtitulo: "Agente que prepara, valida y crea OC en SAP",
  sigla: "OC",
  nuevaSesion: "Nueva sesión",
  conectando: "Conectando…",
  sinServidor: "Servidor no disponible",
  estadoServidor: "Estado del servidor: ",
} as const;

/** Textos del estado vacío. */
export const TEXTOS_ESTADO_VACIO = {
  titulo: "¿Qué solicitud de compra procesamos?",
  descripcion:
    "El agente lee el paquete de compra, valida los controles RC1–RC10 contra los maestros y crea la OC en SAP solo cuando corresponde.",
  pasos: [
    "Lee correo, solicitud, cotización y aprobación",
    "Valida proveedor, aprobador, topes, IVA y fechas",
    "Crea la OC en SAP solo con tu confirmación",
  ],
  casos: "Casos de prueba",
  sugerencias: "Prueba con",
} as const;

/** Textos de la tarjeta de confirmación. */
export const TEXTOS_CONFIRMACION = {
  titulo: "Se necesita tu confirmación antes de crear la OC",
  ayuda: "Revisa los puntos que requieren confirmación y decide.",
  confirmar: "Confirmar y crear OC",
  cancelar: "Cancelar",
} as const;

/** Textos de una llamada a herramienta y de los resultados enriquecidos. */
export const TEXTOS_HERRAMIENTA = {
  etiqueta: (nombre: string): string => `Llamada a ${nombre}`,
  correcta: "Llamada correcta: ",
  conError: "Llamada con error: ",
  resumen: "Resultado",
  argumentos: "Argumentos",
  detalles: "Ver detalles",
  pasos: "Pasos del agente",
} as const;

/** Textos del resultado de la validación. */
export const TEXTOS_VALIDACION = {
  apta: "Apta para crear la OC",
  noApta: "No se puede crear la OC",
  retroactiva:
    "OC retroactiva: la factura es anterior a la solicitud. Quedará marcada para medición.",
  controles: "Controles",
  tipos: {
    bloqueo: "Bloqueo",
    confirmacion: "Requiere confirmación",
    derivado: "Valor derivado",
  },
  accion: "Acción sugerida: ",
} as const;

/** Textos de la orden de compra propuesta y creada. */
export const TEXTOS_ORDEN = {
  titulo: "Orden de compra propuesta",
  campos: {
    proveedor: "Proveedor",
    centro: "Centro / subárea",
    descripcion: "Descripción",
    cantidad: "Cantidad",
    precio: "Precio unitario",
    iva: "Indicador IVA",
    condiciones: "Condiciones de pago",
    aprobador: "Aprobador",
  },
  creada: (numero: string): string => `OC ${numero} creada en SAP`,
  existente: (numero: string): string => `La OC ${numero} ya existía (idempotencia)`,
  evidencia: "Evidencia de aprobación: ",
  fecha: "Fecha: ",
} as const;

/** Textos de estado y error. */
export const TEXTOS_ESTADO = {
  pensando: "El agente está trabajando…",
  reintentar: "Reintentar",
  conversacion: "Conversación",
  agente: "Agente",
  usuario: "Tú",
} as const;
