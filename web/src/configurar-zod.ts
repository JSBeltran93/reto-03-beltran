/**
 * Configura zod antes que cualquier otro módulo: sin compilación con `new Function`,
 * porque la CSP del servidor no permite `unsafe-eval` y zod la probaría al validar,
 * dejando un error en la consola. Se importa primero en `principal.tsx`.
 */
import { z } from "zod";

z.config({ jitless: true });
