import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

// jsdom no implementa el desplazamiento; el chat se desplaza al último mensaje.
Element.prototype.scrollIntoView = vi.fn();
