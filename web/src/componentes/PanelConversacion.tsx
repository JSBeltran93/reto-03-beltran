import type { ResumenCaso } from "@contratos/contratos-api";

import { terminoEnError } from "../estado/conversacion";
import { confirmacionesPendientes } from "../estado/resultados";
import type { Sugerencia } from "../estado/sugerencias";
import type { Conversacion } from "../estado/useConversacion";
import { AvisosConversacion } from "./AvisosConversacion";
import { EstadoVacio } from "./EstadoVacio";
import { ListaMensajes } from "./ListaMensajes";
import { PieCompositor } from "./PieCompositor";
import { useDesplazarAlFinal } from "./useDesplazarAlFinal";

/** Props de {@link PanelConversacion}. */
export interface PropiedadesPanelConversacion {
  readonly conversacion: Conversacion;
  /** Busca el resumen de un caso entre las solicitudes cargadas. */
  readonly resumenDe: (caso: string | null) => ResumenCaso | undefined;
  readonly sugerencias: readonly Sugerencia[];
  readonly alElegirSugerencia: (sugerencia: Sugerencia) => void;
  readonly alVerSolicitudes: () => void;
}

/**
 * Historial y avisos: si el último turno fue un error y no hay confirmación pendiente,
 * ese error del historial ofrece "Reintentar"; con confirmación pendiente manda la tarjeta.
 * @param props - conversación y búsqueda de resúmenes
 * @returns el historial con sus avisos
 */
function Historial({
  conversacion,
  resumenDe,
}: Pick<PropiedadesPanelConversacion, "conversacion" | "resumenDe">) {
  const { estado, cargando, enviar, reintentar } = conversacion;
  const { error, entradas, casoPendiente } = estado;
  const mostrarConfirmacion = estado.esperaConfirmacion && !cargando;
  const reintentable = terminoEnError(entradas) && !mostrarConfirmacion && !cargando;
  return (
    <>
      {entradas.length > 0 && (
        <ListaMensajes
          entradas={entradas}
          alReintentarUltimo={reintentable ? reintentar : undefined}
        />
      )}
      <AvisosConversacion
        cargando={cargando}
        error={error}
        mostrarConfirmacion={mostrarConfirmacion}
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
 * La conversación, protagonista de la página: una columna centrada con el estado vacío
 * (saludo y sugerencias) o el historial por turnos, y el compositor fijo abajo.
 * @param props - conversación, sugerencias y acciones
 * @returns el panel principal
 */
export function PanelConversacion(props: PropiedadesPanelConversacion) {
  const { conversacion, resumenDe, sugerencias, alElegirSugerencia, alVerSolicitudes } = props;
  const { estado, cargando, enviar } = conversacion;
  const mostrarConfirmacion = estado.esperaConfirmacion && !cargando;
  const vacia = estado.entradas.length === 0 && !cargando && estado.error === null;
  const marcadorFin = useDesplazarAlFinal([
    estado.sessionId,
    estado.entradas.length,
    cargando,
    mostrarConfirmacion,
    estado.error,
  ]);

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-(--ancho-chat) flex-1 flex-col px-4 pt-6 pb-4 sm:pt-10">
        {vacia && (
          <EstadoVacio
            sugerencias={sugerencias}
            deshabilitado={cargando}
            alElegir={alElegirSugerencia}
            alVerSolicitudes={alVerSolicitudes}
          />
        )}
        <Historial conversacion={conversacion} resumenDe={resumenDe} />
        <div ref={marcadorFin} aria-hidden="true" />
      </div>
      <PieCompositor
        deshabilitado={cargando}
        esperandoConfirmacion={mostrarConfirmacion}
        alEnviar={enviar}
      />
    </main>
  );
}
