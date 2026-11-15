import { AvisoError } from "./componentes/AvisoError";
import { BannerConfirmacion } from "./componentes/BannerConfirmacion";
import { Encabezado } from "./componentes/Encabezado";
import { EstadoVacio } from "./componentes/EstadoVacio";
import { IndicadorPensando } from "./componentes/IndicadorPensando";
import { ListaMensajes } from "./componentes/ListaMensajes";
import { PieCompositor } from "./componentes/PieCompositor";
import { RESPUESTAS_CONFIRMACION } from "./componentes/textos";
import { useSalud } from "./consultas/useSalud";
import { useConversacion } from "./estado/useConversacion";

/**
 * Aplicación de chat: historial con llamadas a herramientas, confirmación destacada y cuadro de mensaje.
 * @returns la página
 */
export default function Aplicacion() {
  const { estado, cargando, enviar, reintentar, nuevaSesion } = useConversacion();
  const salud = useSalud();
  const mostrarConfirmacion = estado.esperaConfirmacion && !cargando;

  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado salud={salud.data} alNuevaSesion={nuevaSesion} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-4">
        {estado.entradas.length === 0 ? (
          <EstadoVacio alElegir={enviar} />
        ) : (
          <ListaMensajes entradas={estado.entradas} />
        )}
        {cargando && <IndicadorPensando />}
        {estado.error && <AvisoError mensaje={estado.error} alReintentar={reintentar} />}
        {mostrarConfirmacion && (
          <BannerConfirmacion
            deshabilitado={cargando}
            alConfirmar={() => {
              enviar(RESPUESTAS_CONFIRMACION.confirmar);
            }}
            alCancelar={() => {
              enviar(RESPUESTAS_CONFIRMACION.cancelar);
            }}
          />
        )}
      </main>
      <PieCompositor
        deshabilitado={cargando}
        esperandoConfirmacion={mostrarConfirmacion}
        alEnviar={enviar}
      />
    </div>
  );
}
