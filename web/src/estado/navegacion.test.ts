import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { clasesPaneles, PANELES, useNavegacion } from "./navegacion";

describe("clasesPaneles", () => {
  it("en móvil muestra solo el panel activo; en escritorio (lg) ambos", () => {
    expect(clasesPaneles(PANELES.bandeja)).toEqual({
      bandeja: "flex",
      conversacion: "hidden lg:flex",
    });
    expect(clasesPaneles(PANELES.conversacion)).toEqual({
      bandeja: "hidden lg:flex",
      conversacion: "flex",
    });
  });
});

describe("useNavegacion", () => {
  it("empieza en la bandeja, abre la conversación al elegir y vuelve sin perder la selección", () => {
    const { result } = renderHook(() => useNavegacion());
    expect(result.current).toMatchObject({ panel: PANELES.bandeja, seleccionado: null });

    act(() => {
      result.current.seleccionar("sol-004");
    });
    expect(result.current).toMatchObject({ panel: PANELES.conversacion, seleccionado: "sol-004" });

    act(() => {
      result.current.volver();
    });
    expect(result.current).toMatchObject({ panel: PANELES.bandeja, seleccionado: "sol-004" });
  });
});
