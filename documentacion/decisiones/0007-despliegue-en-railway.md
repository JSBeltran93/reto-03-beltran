# ADR-0007: Despliegue en Railway con configuración como código

- **Estado:** aceptada
- **Fecha:** 2026-11-15

## Contexto

El PRD exige una URL pública activa durante la defensa (§9.3). El servicio sirve la API y el front compilado en un solo proceso Node.

## Decisión

Railway con `railway.json` versionado: build por defecto de Railpack (instala dependencias y ejecuta `npm run build`), arranque `npm start`, health check en `/api/health` y reinicio ante fallas. El servicio despliega desde la rama `develop` de GitHub; como alternativa equivalente, `railway up` desde la terminal o el CI. La clave del modelo se configura solo en las variables de Railway.

## Consecuencias

- **Positivas:** build, arranque y health check reproducibles y revisables en el repositorio; un push a `develop` despliega.
- **Negativas:** el disco es efímero: `out/` (órdenes del SAP simulado, `control.csv`, bitácora) se pierde al redesplegar y la numeración se reinicia; en producción se usaría un volumen o una base de datos. Railway marca la configuración como código en JSON como obsoleta a partir del 2026-12-01 (aviso de la CLI de Railway 5.74; migración a su formato de infraestructura como código).
- **Por qué no `npm ci`:** una primera versión usaba `npm ci --include=dev && npm run build`. Falló en el despliegue desde GitHub porque Railpack ya instala las dependencias y monta `node_modules/.cache` como caché; `npm ci` intenta borrar `node_modules` sobre ese montaje y el build se cae. El build por defecto de Railpack ya incluye las dependencias de desarrollo que necesita `npm run build`.

## Alternativas consideradas

- Render: plan gratuito con arranque en frío de ~50 s, riesgoso en la defensa.
- Fly.io o Vercel: requieren Dockerfile o adaptar el servidor a funciones.
