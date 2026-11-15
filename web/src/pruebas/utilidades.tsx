import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * Renderiza un elemento dentro de un QueryClientProvider aislado y sin reintentos.
 * @param elemento - elemento a renderizar
 * @returns resultado de Testing Library
 */
export function renderizarConConsultas(elemento: ReactElement): RenderResult {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={cliente}>{elemento}</QueryClientProvider>);
}
