import type { ResumenCaso } from "@contratos/contratos-api";
import type { UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";

import { Bandeja } from "./componentes/Bandeja";
import { Encabezado } from "./componentes/Encabezado";
import { PanelConversacion } from "./componentes/PanelConversacion";
import { TEXTOS_BANDEJA } from "./componentes/textos";
import { useCasos } from "./consultas/useCasos";
import { useSalud } from "./consultas/useSalud";
import { clasesPaneles } from "./estado/navegacion";
import { useConversacion } from "./estado/useConversacion";
import { useSesionesPorCaso } from "./estado/useSesionesPorCaso";

/** Dos columnas en escritorio (bandeja | conversación); una sola en móvil. */
const CLASES_CONTENEDOR =
  "mx-auto flex w-full max-w-7xl flex-1 flex-col lg:grid lg:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] lg:gap-8 lg:px-6";

/** Bandeja a la izquierda en escritorio: fija bajo el encabezado y con su propio desplazamiento. */
const CLASES_ASIDE =
  "flex-col px-4 py-4 lg:sticky lg:top-(--alto-encabezado) lg:h-[calc(100dvh-var(--alto-encabezado))] lg:self-start lg:overflow-y-auto lg:px-1 lg:py-6";

/** Props de {@link PanelBandeja}. */
interface PropiedadesPanelBandeja {
  readonly casos: UseQueryResult<ResumenCaso[]>;
  readonly seleccionado: string | null;
  /** true mientras el agente trabaja: no se puede abrir otro caso. */
  readonly deshabilitado: boolean;
  readonly clases: string;
  readonly alSeleccionar: (caso: string) => void;
  readonly alAbrirConversacion: () => void;
}

function PanelBandeja(props: PropiedadesPanelBandeja) {
  const { casos, seleccionado, deshabilitado, clases, alSeleccionar, alAbrirConversacion } = props;
  return (
    <aside aria-label={TEXTOS_BANDEJA.region} className={`${clases} ${CLASES_ASIDE}`}>
      <Bandeja
        casos={casos.data}
        cargando={casos.isPending}
        conError={casos.isError}
        seleccionado={seleccionado}
        deshabilitado={deshabilitado}
        alSeleccionar={alSeleccionar}
        alReintentar={() => void casos.refetch()}
        alAbrirConversacion={alAbrirConversacion}
      />
    </aside>
  );
}

/**
 * Búsqueda del resumen de un caso en la bandeja.
 * @param casos - casos cargados (undefined mientras carga)
 * @returns función que devuelve el resumen de un caso, si está cargado
 */
function useResumenDe(casos: readonly ResumenCaso[] | undefined) {
  return useCallback(
    (caso: string | null): ResumenCaso | undefined => casos?.find((c) => c.caso === caso),
    [casos],
  );
}

/**
 * Bandeja de la analista: a la izquierda las solicitudes con su estado; a la derecha el
 * caso abierto, la conversación con el agente (pasos, OC, confirmación) y el mensaje.
 * En móvil la bandeja es la primera pantalla y el caso se abre en otra.
 * @returns la página
 */
export default function Aplicacion() {
  const conversacion = useConversacion();
  const salud = useSalud();
  const casos = useCasos();
  const { casoActivo, panel, seleccionar, volver, abrirConversacion, procesar, nuevaSesion } =
    useSesionesPorCaso(conversacion);
  const paneles = clasesPaneles(panel);
  const resumenDe = useResumenDe(casos.data);

  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado
        estadoSalud={salud.status}
        modelo={salud.data?.model}
        deshabilitado={conversacion.cargando}
        alNuevaSesion={nuevaSesion}
        claveInvalida={conversacion.estado.claveInvalida}
      />
      <div className={CLASES_CONTENEDOR}>
        <PanelBandeja
          casos={casos}
          seleccionado={casoActivo}
          deshabilitado={conversacion.cargando}
          clases={paneles.bandeja}
          alSeleccionar={seleccionar}
          alAbrirConversacion={abrirConversacion}
        />
        <PanelConversacion
          conversacion={conversacion}
          caso={casoActivo}
          resumenDe={resumenDe}
          clases={paneles.conversacion}
          alProcesar={procesar}
          alVolver={volver}
        />
      </div>
    </div>
  );
}
