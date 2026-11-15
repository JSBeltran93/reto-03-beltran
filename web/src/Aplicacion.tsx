import { AvisosConversacion } from "./componentes/AvisosConversacion";
import { Encabezado } from "./componentes/Encabezado";
import { EstadoVacio } from "./componentes/EstadoVacio";
import { ListaMensajes } from "./componentes/ListaMensajes";
import { PieCompositor } from "./componentes/PieCompositor";
import { useDesplazarAlFinal } from "./componentes/useDesplazarAlFinal";
import { useSalud } from "./consultas/useSalud";
import { confirmacionesPendientes } from "./estado/resultados";
import { useConversacion } from "./estado/useConversacion";

/**
 * Aplicación de chat: historial con llamadas a herramientas, confirmación destacada y cuadro de mensaje.
 * @returns la página
 */
export default function Aplicacion() {
  const { estado, cargando, enviar, reintentar, nuevaSesion } = useConversacion();
  const salud = useSalud();
  const { error, entradas } = estado;
  const mostrarConfirmacion = estado.esperaConfirmacion && !cargando && error === null;
  const marcadorFin = useDesplazarAlFinal([entradas.length, cargando, mostrarConfirmacion, error]);

  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado
        estadoSalud={salud.status}
        modelo={salud.data?.model}
        deshabilitado={cargando}
        alNuevaSesion={nuevaSesion}
      />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
        {entradas.length === 0 ? (
          <EstadoVacio alElegir={enviar} />
        ) : (
          <ListaMensajes entradas={entradas} />
        )}
        <AvisosConversacion
          cargando={cargando}
          error={error}
          mostrarConfirmacion={mostrarConfirmacion}
          confirmaciones={confirmacionesPendientes(entradas)}
          alReintentar={reintentar}
          alEnviar={enviar}
        />
        <div ref={marcadorFin} aria-hidden="true" />
      </main>
      <PieCompositor
        deshabilitado={cargando}
        esperandoConfirmacion={mostrarConfirmacion}
        alEnviar={enviar}
      />
    </div>
  );
}
