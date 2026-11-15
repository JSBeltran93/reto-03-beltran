# ADR-0004: Node 22, Express 5, React 19 + Vite + Tailwind + TanStack Query + axios, TypeScript 6

- **Estado:** aceptada
- **Contexto:** el PRD permite Bun o Node 20+ y cualquier front. El reto tiene un límite de 2 horas y debe desplegarse en una URL pública.
- **Decisión:** Node 22 LTS con tsx (sin paso de compilación del back), Express 5 (`crearAplicacion` probada con supertest), React 19 con la plantilla oficial de Vite, Tailwind v4, **TanStack Query** para el estado remoto (mutación del chat y consulta de salud) y **axios** como cliente HTTP con una instancia configurada. npm workspaces para un solo `npm install` y un solo `npm run dev`. TypeScript fijado en 6.0 porque `typescript-eslint` aún no soporta TypeScript 7; ESLint 9 porque `eslint-plugin-jsx-a11y` aún no soporta ESLint 10.
- **Consecuencias:** un solo proceso sirve API y front; lint con tipos y de accesibilidad en todo el repositorio; estados de carga, error y reintento declarativos en el front.
- **Alternativas consideradas:** Bun (más rápido, menos habitual en el hosting objetivo); HTML plano (menos dependencias, peor estructura y testabilidad); `fetch` con un reducer propio (menos dependencias, más código de estado a mano); oxlint de la plantilla (rápido, pero sin reglas con tipos).
