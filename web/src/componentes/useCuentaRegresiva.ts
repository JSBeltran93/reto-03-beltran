import { useEffect, useState } from "react";

/** Cada cuánto se descuenta un segundo de la espera. */
const UN_SEGUNDO_MS = 1_000;

/**
 * Cuenta regresiva en segundos que baja de uno en uno hasta cero.
 * @param inicial - segundos iniciales (0 o undefined: sin espera)
 * @returns los segundos que faltan
 */
export function useCuentaRegresiva(inicial: number | undefined): number {
  const [restantes, setRestantes] = useState(inicial ?? 0);
  const activa = restantes > 0;
  useEffect(() => {
    if (!activa) return undefined;
    const intervalo = setInterval(() => {
      setRestantes((actual) => Math.max(actual - 1, 0));
    }, UN_SEGUNDO_MS);
    return () => {
      clearInterval(intervalo);
    };
  }, [activa]);
  return restantes;
}
