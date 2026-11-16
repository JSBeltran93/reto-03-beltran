/**
 * Mensaje con el que se procesa un caso (el del PRD §11): pide la OC como quedaría en SAP,
 * las validaciones y no crearla sin confirmación.
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
  sigla: "OC",
  nuevaSesion: "Nueva conversación",
  enLinea: "Conectado",
  modelo: (modelo: string): string => `Modelo: ${modelo}`,
  conectando: "Conectando…",
  sinServidor: "Sin conexión",
  estadoServidor: "Estado del asistente: ",
  claveInvalida: "Asistente sin acceso",
  solicitudes: "Solicitudes",
} as const;

/** Textos del estado vacío de la conversación. */
export const TEXTOS_ESTADO_VACIO = {
  titulo: "¿Qué solicitud revisamos hoy?",
  descripcion:
    "Yo reviso los documentos y los datos maestros; tú decides. Nada llega a SAP sin tu confirmación.",
  sugerencias: "Prueba con",
  verTodas: "Ver todas las solicitudes",
} as const;

/**
 * Sugerencias del estado vacío: mensajes reales para la analista. La primera es el
 * mensaje de la demo del PRD §11.
 */
export const SUGERENCIAS = [
  {
    caso: "sol-004",
    etiqueta: "Procesa la solicitud sol-004",
    mensaje: mensajeProcesar("sol-004"),
  },
  {
    caso: "sol-002",
    etiqueta: "¿Por qué no se puede crear la OC de sol-002?",
    mensaje: "¿Por qué no se puede crear la OC de sol-002?",
  },
  {
    caso: "sol-001",
    etiqueta: "Procesa sol-001 y créala si es apta",
    mensaje: "Procesa sol-001 y créala si es apta.",
  },
  {
    caso: "sol-005",
    etiqueta: "¿La factura de sol-005 es anterior a la solicitud?",
    mensaje: "Revisa sol-005: ¿la factura es anterior a la solicitud? ¿Qué implica para la OC?",
  },
] as const;

/** Textos del panel de solicitudes. */
export const TEXTOS_SOLICITUDES = {
  titulo: "Solicitudes",
  ayuda: "Elige una para revisarla conmigo. Si ya hablamos de ella, vuelves a esa conversación.",
  conteo: (total: number): string => (total === 1 ? "1 solicitud" : `${total} solicitudes`),
  cargando: "Cargando tus solicitudes…",
  error: "No pude cargar las solicitudes. Reintenta en unos segundos.",
  reintentar: "Reintentar",
  vacia: "No tienes solicitudes por revisar. ¡Todo al día!",
  cerrar: "Cerrar solicitudes",
  estado: "Estado: ",
  estados: {
    creada: "Creada",
    pendiente: "Esperando tu confirmación",
    bloqueada: "Bloqueada",
    sinProcesar: "Por revisar",
  },
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
  argumentos: "Argumentos",
  datos: "Respuesta completa",
  detalles: "Ver JSON",
  pasos: "Lo que hice",
  conteo: (total: number): string => (total === 1 ? "1 herramienta" : `${total} herramientas`),
  sinArgumentos: "sin argumentos",
  resultado: "Resultado: ",
} as const;

/** Textos del resultado de la validación. */
export const TEXTOS_VALIDACION = {
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
