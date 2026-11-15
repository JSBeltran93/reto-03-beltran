/**
 * Mensaje constante que envía "Revisar solicitud" para un caso (el del PRD §11): pide la OC
 * como quedaría en SAP, las validaciones y no crearla sin confirmación.
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
  etiqueta: "Mensaje para el asistente",
  enviar: "Enviar",
  /** Textos guía cortos: deben caber en el cuadro de mensaje en pantallas de 320 px. */
  normal: "Pregúntame lo que necesites…",
  esperandoConfirmacion: "Responde «Confirmo» o «Cancelar»…",
  ayuda: "Enter para enviar · Shift + Enter para otra línea",
} as const;

/** Textos del encabezado. */
export const TEXTOS_ENCABEZADO = {
  titulo: "Órdenes de compra",
  subtitulo: "Revisa solicitudes y crea OC en SAP sin salir de aquí",
  sigla: "OC",
  nuevaSesion: "Nueva conversación",
  enLinea: "Conectado",
  modelo: (modelo: string): string => `Modelo: ${modelo}`,
  conectando: "Conectando…",
  sinServidor: "Sin conexión",
  estadoServidor: "Estado del asistente: ",
  claveInvalida: "Asistente sin acceso",
} as const;

/** Textos del estado vacío del panel de conversación. */
export const TEXTOS_ESTADO_VACIO = {
  titulo: "Elige una solicitud para empezar",
  descripcion:
    "Yo reviso los documentos y los datos maestros; tú decides. Nada llega a SAP sin tu confirmación.",
  pasos: [
    "Leo el correo, la solicitud, la cotización y la aprobación",
    "Reviso proveedor, aprobador, topes, IVA y fechas",
    "Creo la OC en SAP cuando tú me lo confirmes",
  ],
} as const;

/** Textos de la bandeja de solicitudes y de la cabecera del caso. */
export const TEXTOS_BANDEJA = {
  titulo: "Solicitudes",
  region: "Solicitudes de compra",
  conteo: (total: number): string => (total === 1 ? "1 solicitud" : `${total} solicitudes`),
  cargando: "Cargando tus solicitudes…",
  error: "No pude cargar las solicitudes. Reintenta en unos segundos.",
  reintentar: "Reintentar",
  abrirConversacion: "Ir al chat",
  ayudaSinBandeja: "Mientras tanto, puedes escribirme en el chat.",
  vacia: "No tienes solicitudes por revisar. ¡Todo al día!",
  volver: "Solicitudes",
  procesar: "Revisar solicitud",
  ayudaProcesar: "Te muestro la OC y lo que encontré. No creo nada en SAP sin tu confirmación.",
  estado: "Estado: ",
  estados: {
    creada: "Creada",
    pendiente: "Esperando tu confirmación",
    bloqueada: "Bloqueada",
    sinProcesar: "Por revisar",
  },
  numeroOc: (numero: string): string => `OC ${numero}`,
  centro: "Centro de costo",
} as const;

/** Textos de la tarjeta de confirmación. */
export const TEXTOS_CONFIRMACION = {
  titulo: "¿Creamos la OC con estos datos?",
  tituloCaso: (caso: string): string => `¿Creamos la OC de ${caso}?`,
  ayuda: "Antes de crearla, confirma esto:",
  ayudaSinPuntos: "Revisa los datos de la OC y decide.",
  confirmar: "Sí, crear la OC",
  cancelar: "No, cancelar",
} as const;

/** Textos de los pasos del agente y de los resultados enriquecidos. */
export const TEXTOS_HERRAMIENTA = {
  correcta: "Hecho: ",
  conError: "No se pudo: ",
  argumentos: "Datos enviados",
  datos: "Respuesta completa",
  detalles: "Ver detalle",
  pasos: "Lo que hice",
  validacion: "Resultado de la revisión",
} as const;

/** Textos del resultado de la validación. */
export const TEXTOS_VALIDACION = {
  apta: "Todo en orden para crear la OC",
  noApta: "Esta OC todavía no se puede crear",
  retroactiva:
    "Ojo: la factura es anterior a la solicitud, así que la OC quedará marcada como retroactiva.",
  controles: "Lo que encontré",
  tipos: {
    bloqueo: "Impide crear la OC",
    confirmacion: "Necesita tu confirmación",
    derivado: "Lo completé por ti",
  },
  regla: (regla: string): string => `Regla ${regla}`,
  accion: "Qué hacer: ",
  valores: "Valores",
} as const;

/**
 * Nombre legible de cada valor que acompaña un hallazgo (las claves que devuelve
 * `oc_validar`); una clave desconocida se muestra con {@link etiquetaValor}.
 */
export const ETIQUETAS_VALORES: Readonly<Record<string, string>> = {
  solicitud: "Solicitud",
  cotizacion: "Cotización",
  diferencia_pct: "Diferencia",
  valor_total: "Valor total",
  tope: "Tope del aprobador",
  calculado: "Cantidad × valor unitario",
  moneda: "Moneda",
  moneda_solicitud: "Moneda de la solicitud",
  moneda_cotizacion: "Moneda de la cotización",
  indicador_iva: "Indicador de IVA",
  condiciones_pago: "Condiciones de pago",
  fecha_factura: "Fecha de la factura",
  fecha_solicitud: "Fecha de la solicitud",
};

/**
 * Nombre legible de un valor de un hallazgo: el conocido o la clave sin guiones bajos.
 * @param clave - clave del valor (p. ej. "diferencia_pct")
 * @returns la etiqueta (p. ej. "Diferencia")
 */
export function etiquetaValor(clave: string): string {
  const conocida = ETIQUETAS_VALORES[clave];
  if (conocida) return conocida;
  const texto = clave.replaceAll("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Textos de la orden de compra propuesta y creada. */
export const TEXTOS_ORDEN = {
  titulo: "Así quedaría la OC en SAP",
  borrador: "Borrador · aún no se ha creado",
  posiciones: "Productos y servicios",
  columnas: {
    descripcion: "Descripción",
    cantidad: "Cantidad",
    precio: "Precio unitario",
    subtotal: "Subtotal",
  },
  referencia: "Solicitud",
  sociedad: "Sociedad / Org. de compras",
  moneda: "Moneda",
  campos: {
    proveedor: "Proveedor",
    centro: "Centro / subárea",
    iva: "IVA",
    condiciones: "Condiciones de pago",
    aprobador: "Aprobador",
    total: "Total",
    excepciones: "Excepciones confirmadas",
  },
  sinExcepciones: "Ninguna",
  creada: (numero: string): string => `Listo: OC ${numero} creada en SAP`,
  existente: (numero: string): string => `La OC ${numero} ya estaba creada; no la dupliqué`,
  evidencia: "Evidencia de aprobación: ",
  fecha: "Creada el ",
} as const;

/** Textos de estado y error. */
export const TEXTOS_ESTADO = {
  pensando: "Revisando la solicitud…",
  reintentar: "Reintentar",
  esperaReintento: (segundos: number): string => `Puedes reintentar en ${segundos} s`,
  conversacion: "Conversación",
  agente: "Asistente",
  usuario: "Tú",
} as const;
