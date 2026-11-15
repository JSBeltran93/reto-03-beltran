import "./estilos.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const raiz = document.getElementById("root");
if (!raiz) throw new Error("No se encontró el elemento #root en index.html");

createRoot(raiz).render(
  <StrictMode>
    <main className="mx-auto max-w-3xl p-4">Órdenes de Compra · Agente</main>
  </StrictMode>,
);
