import type { ResumenCaso } from "@contratos/contratos-api";

import { confirmacionesPendientes } from "../estado/resultados";
import type { Conversacion } from "../estado/useConversacion";
import { AvisosConversacion } from "./AvisosConversacion";
import { CabeceraCaso } from "./CabeceraCaso";
import { EstadoVacio } from "./EstadoVacio";
import { ListaMensajes } from "./ListaMensajes";
import { PieCompositor } from "./PieCompositor";
import { useDesplazarAlFinal } from "./useDesplazarAlFinal";

/** Props de {@link PanelConversacion}. */
export interface PropiedadesPanelConversacion {
  readonly conversacion: Conversacion;
  /** Caso abierto (seleccionado o pendiente de confirmación), o null. */
  readonly caso: string | null;
  /** Busca el resumen de un caso en la bandeja. */
  readonly resumenDe: (caso: string | null) => ResumenCaso | undefined;
  /** Clases de visibilidad del panel (móvil / escritorio). */
  readonly clases: string;
  readonly alProcesar: (caso: string) => void;
  readonly alVolver: () => void;
}

/**
 * Mensajes y avisos del panel: estado vacío, historial, pensando, error y confirmación.
 * @param props - conversación, caso abierto y búsqueda de resúmenes
 * @returns el cuerpo de la conversación
 */
function CuerpoConversacion({
  conversacion,
  caso,
  resumenDe,
}: Pick<PropiedadesPanelConversacion, "conversacion" | "caso" | "resumenDe">) {
  const { estado, cargando, enviar, reintentar } = conversacion;
  const { error, entradas, casoPendiente } = estado;
  return (
    <>
      {entradas.length === 0 && caso === null && <EstadoVacio />}
      {entradas.length > 0 && <ListaMensajes entradas={entradas} />}
      <AvisosConversacion
        cargando={cargando}
        error={error}
        mostrarConfirmacion={estado.esperaConfirmacion && !cargando}
        confirmaciones={confirmacionesPendientes(entradas, casoPendiente)}
        caso={casoPendiente}
        resumen={resumenDe(casoPendiente)}
        alReintentar={reintentar}
        alEnviar={enviar}
      />
    </>
  );
}

/**
 * Panel derecho: cabecera del caso con "Procesar", conversación con los pasos del agente,
 * avisos (pensando, error, confirmación) y el cuadro de mensaje fijo abajo.
 * @param props - conversación, caso abierto y acciones
 * @returns el panel
 */
export function PanelConversacion(props: PropiedadesPanelConversacion) {
  const { conversacion, caso, resumenDe, clases, alProcesar, alVolver } = props;
  const { estado, cargando, enviar } = conversacion;
  const mostrarConfirmacion = estado.esperaConfirmacion && !cargando;
  const cambios = [caso, estado.entradas.length, cargando, mostrarConfirmacion, estado.error];
  const marcadorFin = useDesplazarAlFinal(cambios);

  return (
    <main className={`${clases} min-w-0 flex-col gap-4 px-4 pt-4 lg:px-0 lg:pt-6`}>
      <CabeceraCaso
        caso={caso}
        resumen={resumenDe(caso)}
        deshabilitado={cargando}
        alProcesar={alProcesar}
        alVolver={alVolver}
      />
      <CuerpoConversacion conversacion={conversacion} caso={caso} resumenDe={resumenDe} />
      <div ref={marcadorFin} aria-hidden="true" className="flex-1" />
      <PieCompositor
        deshabilitado={cargando}
        esperandoConfirmacion={mostrarConfirmacion}
        alEnviar={enviar}
      />
    </main>
  );
}
