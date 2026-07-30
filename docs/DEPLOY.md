# Despliegue de MercadoRD (Next.js) al dominio de producción

La app Next vive en `web/`. El repo GitHub es `Warrior-R/mercadord` → conectado a Vercel → dominio de MercadoRD. Orden recomendado: **datos primero, luego apuntar el dominio** (para no lanzar con catálogo vacío).

## Paso 1 — Supabase (SQL Editor). Correr en este orden. Todo es idempotente.

1. `supabase/verify-contencion.sql` — diagnóstico (solo lectura). Si algo sale FAIL, correr los `hardening-*.sql`.
2. `supabase/f2-contacto-mensajes.sql` — columna `whatsapp` + tabla `messages` + trigger.
3. `supabase/f2-resenas.sql` — `seller_reviews` + vista `seller_reputation`.
4. `supabase/f2-moderacion.sql` — policies admin para retirar anuncios.
5. `supabase/f3-storage.sql` — bucket `product-images` + RLS de Storage.
6. `supabase/auctions.sql` — subastas + `bids` + RPC + cron + Realtime (siembra 5 demos).
7. `supabase/seed-products.sql` — puebla el catálogo con productos demo.

Y en **Auth → URL Configuration**: añadir el dominio de producción a **Redirect URLs** y al allowlist de **Google OAuth** (callback `https://<dominio>/auth/callback`).

## Paso 2 — Vercel (panel del proyecto `mercadord`)

1. **Settings → General → Root Directory = `web`** (así Vercel compila la app Next, no el sitio estático de la raíz).
2. Framework Preset: **Next.js** (se detecta solo).
3. **Settings → Environment Variables** (Production):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://flsixfuzvbapwnfepmwr.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = *(la publishable key `sb_publishable_…`, pública por diseño)*
   - `NEXT_PUBLIC_SITE_URL` = `https://<dominio-de-produccion>`

> Nota: al usar Root Directory = `web`, el `vercel.json` estático de la raíz deja de aplicar. Las cabeceras de seguridad (CSP, HSTS, X-Frame-Options, etc.) ya están trasladadas a `web/next.config.ts` (`headers()`).

## Paso 3 — Publicar (lo hace Claude por GitHub, tras confirmar que el Paso 1 está hecho)

- Fusionar `feat/nextjs-migration` → `main`. Vercel despliega automáticamente con la nueva Root Directory y sirve la app Next en el dominio.

## Paso 4 — Verificación post-despliegue

- Home carga con productos (seed corrido) y `/subastas` muestra las subastas demo.
- `/entrar` con Google funciona (callback en allowlist).
- Publicar un anuncio con foto (bucket Storage) funciona.
- Cabeceras de seguridad presentes: `curl -sI https://<dominio> | grep -i content-security-policy`.
- Abrir una subasta en dos pestañas y pujar en una → la otra se actualiza en vivo (Realtime).

## Rollback

El sitio estático anterior sigue en el historial de `main` (commits previos a la fusión). Para revertir: en Vercel, **Root Directory** de vuelta a la raíz + redeploy de un commit anterior, o `git revert` de la fusión.
