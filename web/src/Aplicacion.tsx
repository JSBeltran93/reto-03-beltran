import type { ResumenCaso } from "@contratos/contratos-api";
import { useCallback, useMemo, useState } from "react";

import { Encabezado } from "./componentes/Encabezado";
import { PanelConversacion } from "./componentes/PanelConversacion";
import { PanelSolicitudes } from "./componentes/PanelSolicitudes";
import { SUGERENCIAS } from "./componentes/textos";
import { useCasos } from "./consultas/useCasos";
import { useSalud } from "./consultas/useSalud";
import { casosDeHistorial } from "./estado/resultados";
import { type Sugerencia, sugerenciasConCasos } from "./estado/sugerencias";
import { useConversacion } from "./estado/useConversacion";
import { useSesionesPorCaso } from "./estado/useSesionesPorCaso";

/**
 * Apertura y cierre del panel "Solicitudes" (acciones estables).
 * @returns si está abierto y cómo abrirlo o cerrarlo
 */
function usePanelSolicitudes() {
  const [abierto, setAbierto] = useState(false);
  const abrir = useCallback(() => {
    setAbierto(true);
  }, []);
  const cerrar = useCallback(() => {
    setAbierto(false);
  }, []);
  return { abierto, abrir, cerrar };
}

/**
 * Búsqueda del resumen de un caso entre las solicitudes cargadas.
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
 * Estado de la página: conversación, salud, solicitudes, panel lateral y sugerencias,
 * con las acciones que los unen.
 * @returns datos y acciones de la página
 */
function useAplicacion() {
  const conversacion = useConversacion();
  const salud = useSalud();
  const casos = useCasos();
  const panel = usePanelSolicitudes();
  const { abrirCaso, enviarSobreCaso } = useSesionesPorCaso(conversacion);
  const resumenDe = useResumenDe(casos.data);
  const sugerencias = useMemo(() => sugerenciasConCasos(SUGERENCIAS, casos.data), [casos.data]);
  const { entradas } = conversacion.estado;
  const actuales = useMemo(() => casosDeHistorial(entradas), [entradas]);
  const elegirCaso = (caso: string): void => {
    panel.cerrar();
    abrirCaso(caso);
  };
  const elegirSugerencia = (sugerencia: Sugerencia): void => {
    enviarSobreCaso(sugerencia.caso, sugerencia.mensaje);
  };
  return {
    conversacion,
    salud,
    casos,
    panel,
    resumenDe,
    sugerencias,
    actuales,
    elegirCaso,
    elegirSugerencia,
  };
}

/**
 * Chat con el agente de órdenes de compra (PRD §6.1): la conversación es la página; las
 * solicitudes viven en un panel lateral plegable y alimentan las sugerencias del inicio.
 * Con el panel abierto el resto de la página queda inerte (el foco no sale del panel).
 * @returns la página
 */
export default function Aplicacion() {
  const { conversacion, salud, casos, panel, ...pagina } = useAplicacion();
  return (
    <>
      <div inert={panel.abierto} className="flex min-h-dvh flex-col">
        <Encabezado
          estadoSalud={salud.status}
          modelo={salud.data?.model}
          deshabilitado={conversacion.cargando}
          alNuevaSesion={() => conversacion.nuevaSesion()}
          claveInvalida={conversacion.estado.claveInvalida}
          alAbrirSolicitudes={panel.abrir}
          solicitudesAbiertas={panel.abierto}
        />
        <PanelConversacion
          conversacion={conversacion}
          resumenDe={pagina.resumenDe}
          sugerencias={pagina.sugerencias}
          alElegirSugerencia={pagina.elegirSugerencia}
          alVerSolicitudes={panel.abrir}
        />
      </div>
      <PanelSolicitudes
        abierto={panel.abierto}
        alCerrar={panel.cerrar}
        casos={casos.data}
        cargando={casos.isPending}
        conError={casos.isError}
        actuales={pagina.actuales}
        deshabilitado={conversacion.cargando}
        alElegir={pagina.elegirCaso}
        alReintentar={() => void casos.refetch()}
      />
    </>
  );
}
