# ADR 0001 — Re-plataformar MarketplaceDR a Next.js

- **Estado:** Aceptado
- **Fecha:** 2026-07-01
- **Decisores:** Dueño del proyecto + CTO (Claude, rol asumido)
- **Relacionados:** `docs/AUDIT.md`, `docs/PRODUCT_REQUIREMENTS.md`

## Contexto

El proyecto actual es un **SPA de HTML + JS vanilla** (sin framework, sin bundler, sin build) servido estático por Vercel, con Supabase (Postgres + Edge Functions Deno) como backend. La auditoría integral (89 hallazgos, **40/100**) concluyó que:

- El contenido se renderiza 100% en cliente → **invisible/frágil para buscadores**, sin URLs por producto/categoría (H4/H5), sitemap de 1 URL.
- `js/app.js` es un **monolito de 3.925 líneas** sin tipos ni tests; ~185 handlers `onclick` inline obligan a `unsafe-inline` en la CSP.
- El **flujo de dinero y confianza está simulado** (pago = `setTimeout`, reseñas/comisiones = copy).
- La mayoría de la lista objetivo (SSR, ISR, code-splitting, `next/image`, tests, DDD) **no es implementable** sobre un estático sin build.

El objetivo de negocio es un marketplace nacional con calidad tipo Mercado Libre. Ese objetivo **no es alcanzable parcheando** el stack actual.

## Decisión

Re-plataformar a **Next.js (App Router) + TypeScript**, manteniendo **Supabase** (Postgres, RLS, Auth) como backend y fuente de verdad. La migración es **incremental y por fases**, en la rama `feat/nextjs-migration`, preservando la lógica server-side que ya es correcta.

### Stack destino

| Capa | Tecnología |
|---|---|
| Frontend/SSR | Next.js App Router + TypeScript + React Server Components |
| Estilos | (a definir en F1) CSS Modules o Tailwind — decisión de ADR 0002 |
| Datos/Auth | Supabase (Postgres + RLS + Auth), `@supabase/ssr` |
| Server logic | Server Actions + Route Handlers; Edge Functions solo donde aporten |
| Imágenes | `next/image` (WebP/AVIF, `srcset`) |
| Caché | ISR + Redis (Upstash) para lectura caliente |
| Pagos | Azul/CardNet (RD) + Stripe/PayPal (intl), confirmados por webhook |
| Búsqueda | Postgres FTS → Meilisearch/Typesense si escala |
| Tests | Vitest (unit) + Playwright (E2E) |
| Observabilidad | Sentry + logs estructurados |
| Deploy | Vercel + Supabase migrations versionadas |

### Qué preservar / rehacer / descartar (del audit)

- **Preservar (portar tal cual):** RPCs de subastas (`place_bid`/`buy_now`), `create_order`, **toda la RLS**, triggers que congelan columnas privilegiadas, KYC (Edge Function + webhook HMAC), `webhook_events`, MFA/TOTP.
- **Rehacer:** capa render/estado → Server/Client Components tipados; routing con URLs reales + SSR/ISR + `generateMetadata`; componentes accesibles; pagos, reseñas, monetización.
- **Descartar:** `index_original.html`, handlers inline, datos demo, "Mejores ofertas"/chat/reseñas simulados.

## Principios de código (del master prompt)

SOLID, DRY, KISS, Clean Architecture (capas: UI → aplicación → dominio → infraestructura), DDD donde aporte (dinero, pedidos, subastas), 100% tipado, todo testeable y documentado. **Ninguna operación monetaria confía en el cliente.**

## Plan por fases

> Cada fase se mergea a `main` solo cuando pasa sus tests y no rompe lo existente. Producción actual (vanilla) sigue viva hasta el cutover.

### Fase 0 — Contención (paralela, sobre el stack actual, NO espera a Next.js)
Cerrar la exposición viva del audit: correr `hardening-2026-06-23.sql` + `hardening2-2026-06-23.sql` y confirmar; `esc(a.icon)` (C2); binding OTP en `phone-verify` (H2). **Acción del dueño en Supabase + parches mínimos.**

### Fase 1 — Fundaciones + catálogo indexable
Scaffold Next.js + TS + Supabase SSR. Auth (email/Google/MFA). Catálogo con **rutas reales** (`/producto/[slug]-[id]`, `/categoria/[slug]`), SSR/ISR, `generateMetadata`, `next/image`, sitemap dinámico, breadcrumbs, Schema.org. Subastas portadas (RPCs intactos). Base a11y/SEO. Suite de tests arranca aquí.
**Salida:** sitio indexable, tipado, con tests, sin cobrar dinero real todavía.

### Fase 2 — Dinero y confianza
Pagos reales (PSP + webhooks + escrow), comisiones/wallet/liquidaciones, reseñas reales, Q&A, chat comprador-vendedor, moderación, notificaciones (email/SMS/push), panel admin con auditoría.
**Salida:** marketplace transaccional real. Aquí se puede anunciar como comercial.

### Fase 3 — Logística y escala
Envíos/tracking con couriers RD, búsqueda avanzada + recomendaciones, i18n, optimizaciones de escala (Redis, motor de búsqueda dedicado).

### Cutover
Cuando F1+F2 estén estables en `feat/nextjs-migration`, migrar el dominio de Vercel al proyecto Next.js. Rollback = repuntar el dominio al deploy estático anterior.

## Consecuencias

**Positivas:** SEO/CWV resueltos de raíz; tipos + tests reducen regresiones; arquitectura escalable; el flujo de dinero deja de ser ficción; la seguridad se apoya en RLS + server-side.

**Negativas / costos:** es una reescritura de la capa de presentación (semanas, no días); dos stacks conviven durante la transición; requiere disciplina de ramas (no volver a auto-pushear a `main`); nuevas dependencias (PSP, Redis, Sentry) con su propia configuración y costo.

**Riesgos y mitigación:**
- *Romper lo que hoy funciona* → la producción vanilla sigue viva; se mergea por fases con tests.
- *La BD/RLS actual tiene deuda* → se consolida en `supabase/migrations` con las columnas privilegiadas congeladas desde el archivo base.
- *Auto-push a producción* → trabajo en `feat/nextjs-migration`; el hook sube la rama, no `main`.

## Alternativas descartadas

- **Endurecer el stack vanilla:** techo bajo; SSR/ISR/tests/DDD no aplican. Rechazada por no alcanzar el objetivo de negocio.
- **Remix / SvelteKit / Astro:** válidas, pero Next.js + Vercel + Supabase es el camino de menor fricción dado el hosting actual y el ecosistema. Reevaluable, pero no bloquea.

## Próximos ADRs

- ADR 0002 — Estrategia de estilos (Tailwind vs CSS Modules) y sistema de diseño.
- ADR 0003 — Arquitectura de pagos y escrow (PSP, máquina de estados, idempotencia).
- ADR 0004 — Modelo de datos de reputación y comisiones.
