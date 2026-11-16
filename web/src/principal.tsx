import "./configurar-zod";
import "./estilos.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import Aplicacion from "./Aplicacion";
import { crearClienteConsultas } from "./consultas/cliente-consultas";

const elementoRaiz = document.getElementById("root");
if (!elementoRaiz) {
  throw new Error("No se encontró el elemento #root en index.html");
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <QueryClientProvider client={crearClienteConsultas()}>
      <Aplicacion />
    </QueryClientProvider>
  </StrictMode>,
);
