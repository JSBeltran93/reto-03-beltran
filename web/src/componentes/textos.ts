/**
 * Mensaje constante que envía "Procesar" para un caso (el del PRD §11): pide la OC como
 * quedaría en SAP, las validaciones y no crearla sin confirmación.
 * @param caso - carpeta del caso
 * @returns el mensaje para el agente
 */
export const mensajeProcesar = (caso: string): string =>
  `Procesa la solicitud "${caso}". Muéstrame la OC como quedaría en SAP, qué validaciones pasó y cuáles no, y no la crees hasta que yo lo confirme.`;

/** Mensajes que envían los botones de confirmación como un mensaje normal del chat. */
export const RESPUESTAS_CONFIRMACION = {
  confirmar: "Confirmo",
  cancelar: "Cancelar",
} as const;

/** Textos del cuadro de mensaje. */
export const TEXTOS_COMPOSITOR = {
  etiqueta: "Mensaje para el agente",
  enviar: "Enviar",
  /** Textos guía cortos: deben caber en el cuadro de mensaje en pantallas de 320 px. */
  normal: "Escribe un mensaje para el agente…",
  esperandoConfirmacion: "Responde «Confirmo» o «Cancelar»…",
  ayuda: "Enter envía · Shift + Enter agrega una línea",
} as const;

/** Textos del encabezado. */
export const TEXTOS_ENCABEZADO = {
  titulo: "Órdenes de Compra",
  subtitulo: "Agente que prepara, valida y crea OC en SAP",
  sigla: "OC",
  nuevaSesion: "Nueva sesión",
  enLinea: "En línea",
  modelo: (modelo: string): string => `Modelo: ${modelo}`,
  conectando: "Conectando…",
  sinServidor: "Servidor no disponible",
  estadoServidor: "Estado del servidor: ",
  claveInvalida: "Clave del modelo inválida",
} as const;

/** Textos del estado vacío del panel de conversación. */
export const TEXTOS_ESTADO_VACIO = {
  titulo: "Elige una solicitud de la bandeja",
  descripcion:
    "El agente lee el paquete de compra, valida los controles RC1–RC10 contra los maestros y te muestra la OC antes de crearla en SAP.",
  pasos: [
    "Lee correo, solicitud, cotización y aprobación",
    "Valida proveedor, aprobador, topes, IVA y fechas",
    "Crea la OC en SAP solo con tu confirmación",
  ],
} as const;

/** Textos de la bandeja de solicitudes y de la cabecera del caso. */
export const TEXTOS_BANDEJA = {
  titulo: "Bandeja",
  region: "Solicitudes de compra",
  conteo: (total: number): string => (total === 1 ? "1 solicitud" : `${total} solicitudes`),
  cargando: "Cargando solicitudes…",
  error: "No se pudo cargar la bandeja.",
  reintentar: "Reintentar",
  abrirConversacion: "Ir a la conversación",
  ayudaSinBandeja: "Puedes escribirle al agente aunque la bandeja no cargue.",
  vacia: "No hay solicitudes en la bandeja.",
  volver: "Bandeja",
  procesar: "Procesar",
  ayudaProcesar:
    "El agente valida la solicitud y te muestra la OC; no la crea sin tu confirmación.",
  estado: "Estado: ",
  numeroOc: (numero: string): string => `OC ${numero}`,
  centro: "Centro de costo",
} as const;

/** Textos de la tarjeta de confirmación. */
export const TEXTOS_CONFIRMACION = {
  titulo: "Se necesita tu confirmación antes de crear la OC",
  tituloCaso: (caso: string): string => `Confirma la OC de ${caso}`,
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
  datos: "Datos completos",
  detalles: "Detalle técnico",
  pasos: "Pasos del agente",
  validacion: "Resultado de la validación",
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
  valores: "Valores",
} as const;

/** Textos de la orden de compra propuesta y creada. */
export const TEXTOS_ORDEN = {
  titulo: "Orden de compra propuesta",
  borrador: "Borrador · así quedaría en SAP",
  posiciones: "Posiciones",
  columnas: {
    descripcion: "Descripción",
    cantidad: "Cantidad",
    precio: "Precio unitario",
    subtotal: "Subtotal",
  },
  referencia: "Solicitud",
  sociedad: "Sociedad / Org. compras",
  moneda: "Moneda",
  campos: {
    proveedor: "Proveedor",
    centro: "Centro / subárea",
    iva: "IVA",
    condiciones: "Condiciones de pago",
    aprobador: "Aprobador",
    total: "Total",
    excepciones: "Excepciones",
  },
  sinExcepciones: "Ninguna",
  creada: (numero: string): string => `OC ${numero} creada en SAP`,
  existente: (numero: string): string => `La OC ${numero} ya existía (idempotencia)`,
  evidencia: "Evidencia de aprobación: ",
  fecha: "Fecha: ",
} as const;

/** Textos de estado y error. */
export const TEXTOS_ESTADO = {
  pensando: "El agente está trabajando…",
  reintentar: "Reintentar",
  esperaReintento: (segundos: number): string => `Podrás reintentar en ${segundos} s`,
  conversacion: "Conversación",
  agente: "Agente",
  usuario: "Tú",
} as const;
