import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

// jsdom no implementa el desplazamiento; el chat se desplaza al último mensaje.
Element.prototype.scrollIntoView = vi.fn();

// jsdom no implementa matchMedia; se simula sin preferencia de movimiento reducido.
window.matchMedia = vi.fn((consulta: string) => ({
  matches: false,
  media: consulta,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
