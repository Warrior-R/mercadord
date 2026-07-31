# MercadoRD

**Marketplace de compra-venta y subastas para República Dominicana, con verificación de identidad obligatoria.**

Publicar o comprar exige haber pasado un KYC real. La aprobación de identidad no
depende del navegador en ningún punto: se decide en el servidor, a partir de un
webhook firmado por el proveedor, y la base de datos impide por diseño que una
cuenta se marque a sí misma como verificada.

---

## Índice

1. [Qué hace](#qué-hace)
2. [Arquitectura](#arquitectura)
3. [Verificación de identidad (KYC)](#verificación-de-identidad-kyc)
4. [Seguridad](#seguridad)
5. [Estructura del repositorio](#estructura-del-repositorio)
6. [Desarrollo local](#desarrollo-local)
7. [Pruebas y CI](#pruebas-y-ci)
8. [Despliegue](#despliegue)

---

## Qué hace

**Catálogo y descubrimiento**
- Navegación por categorías, búsqueda y filtros por precio, condición y ubicación.
- Fichas de producto y perfiles públicos de vendedor.
- Favoritos y notificaciones.

**Venta**
- Publicación de anuncios con imágenes (Supabase Storage).
- Subastas con puja, cierre programado y resolución del ganador.
- Panel de cuenta con los anuncios propios.

**Compra**
- Carrito con cálculo de ITBIS (18 %) y envío.
- Mensajería entre comprador y vendedor.
- Reseñas y sistema de reportes/moderación.

**Administración**
- Reportes de contenido y gestión de banners publicitarios.
- Estadísticas de plataforma.

**Cuenta**
- Registro con correo o Google OAuth.
- Verificación de teléfono.
- Verificación de identidad (documento + biometría) antes de operar.
- Eliminación de cuenta.

---

## Arquitectura

| Capa | Tecnología |
|---|---|
| Aplicación | Next.js 16 (App Router), React 19, TypeScript |
| Estilos | Tailwind CSS 4, Radix UI |
| Datos | PostgreSQL en Supabase, con Row Level Security |
| Sesión | Supabase Auth (`@supabase/ssr`) — correo y Google OAuth |
| Lógica de servidor | Edge Functions en Deno |
| Archivos | Supabase Storage |
| Pruebas | Vitest (unitarias) y Playwright (end-to-end) |
| CI/CD | GitHub Actions y Vercel |

El repositorio contiene dos generaciones del producto:

- **`web/`** — la aplicación actual en Next.js. Es donde se desarrolla.
- **raíz** (`index.html`, `js/`, `css/`) — la primera versión, un sitio estático
  en HTML y JavaScript sin bundler ni framework. Se conserva porque es lo que
  sirve `vercel.json` mientras se completa el corte a Next.js.

Ambas hablan con el mismo proyecto de Supabase, así que el esquema, las políticas
RLS y las Edge Functions son compartidos.

### Edge Functions

| Función | Responsabilidad |
|---|---|
| `kyc` | Abre la sesión de verificación con el proveedor y recibe su webhook firmado |
| `phone-verify` | Verificación del número de teléfono |
| `contact` | Contacto con el vendedor sin exponer sus datos |
| `chatbot` | Asistente de la tienda |
| `delete-account` | Borrado de cuenta y de sus datos asociados |

---

## Verificación de identidad (KYC)

El requisito de fondo viene de la Ley 172-13: para operar hay que saber quién
está detrás de la cuenta. Lo relevante técnicamente es **dónde se toma la
decisión**.

1. El cliente pide una sesión de verificación. La Edge Function `kyc` la crea
   contra el proveedor (Didit) usando credenciales que nunca salen del servidor.
2. El usuario completa documento y biometría en el flujo del proveedor.
3. El proveedor llama de vuelta al webhook. La función **verifica la firma** del
   mensaje antes de aceptarlo y solo entonces actualiza el perfil.
4. Un trigger de PostgreSQL (`protect_profiles_verification`) rechaza cualquier
   intento de modificar el estado de verificación que no venga de ese camino.

El resultado: aunque alguien manipule por completo el navegador, no puede
otorgarse la verificación. Es una decisión de servidor de principio a fin.

---

## Seguridad

- **Row Level Security** activo en las tablas de datos de usuario. La clave
  publicable de Supabase viaja al navegador por diseño: lo que protege los datos
  son las políticas, no el secreto de la clave.
- **Trigger anti-escalada** sobre el estado de verificación (arriba).
- **Cabeceras de seguridad** configuradas en el despliegue: Content-Security-Policy,
  HSTS con `preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  Referrer-Policy, Cross-Origin-Opener/Resource-Policy y una Permissions-Policy
  que solo concede la cámara al propio origen (la necesita la captura biométrica).
- **Webhooks firmados** — ningún callback se acepta sin validar su firma.
- Las migraciones de endurecimiento viven versionadas en `supabase/*.sql`.

---

## Estructura del repositorio

```
mercadord/
├── web/                      Aplicación Next.js (desarrollo activo)
│   ├── src/app/              Rutas del App Router
│   │   ├── producto/[slug]/    ficha de producto
│   │   ├── categoria/[slug]/   catálogo por categoría
│   │   ├── subasta/[slug]/     subasta con puja
│   │   ├── subastas/crear/     alta de subasta
│   │   ├── vendedor/[id]/      perfil público de vendedor
│   │   ├── vender/             publicar anuncio
│   │   ├── buscar/             búsqueda
│   │   ├── favoritos/          favoritos
│   │   ├── mensajes/           mensajería
│   │   ├── notificaciones/     notificaciones
│   │   ├── cuenta/             cuenta y verificación
│   │   ├── admin/              reportes y banners
│   │   ├── legal/[slug]/       textos legales
│   │   └── auth/, entrar/, registro/
│   ├── src/lib/              Lógica pura (validación, filtros, formato) + sus tests
│   ├── src/components/       Componentes de UI
│   └── e2e/                  Especificaciones de Playwright
│
├── supabase/
│   ├── setup.sql             Esquema base, RLS y triggers
│   ├── *.sql                 Migraciones por función y endurecimientos
│   └── functions/            Edge Functions en Deno
│
├── index.html, js/, css/     Primera versión estática (aún desplegada)
├── api/                      Funciones serverless de la versión estática
├── vercel.json               Rewrites, cabeceras de seguridad y caché
└── .github/workflows/ci.yml  Integración continua
```

---

## Desarrollo local

Requisitos: Node.js 22.

```bash
cd web
npm ci
npm run dev          # http://localhost:3000
```

Crea `web/.env.local` con:

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave publicable (pública por diseño) |

> El `.env.local.example` de la raíz usa el prefijo `VITE_` y corresponde a la
> versión estática original, no a la aplicación de `web/`.

Las claves privilegiadas (`service_role`, credenciales del proveedor de KYC) solo
se configuran como secretos de las Edge Functions. **Nunca** en el cliente.

La configuración de la base de datos está documentada en
[`SUPABASE_SETUP.md`](SUPABASE_SETUP.md); el despliegue, en
[`DEPLOY_GUIDE.md`](DEPLOY_GUIDE.md).

---

## Pruebas y CI

```bash
cd web
npm run lint         # ESLint
npx tsc --noEmit     # Chequeo de tipos
npm test             # Vitest
npm run test:e2e     # Playwright
npm run build        # Build de producción
```

Las pruebas unitarias cubren la lógica pura de `src/lib`: validación de productos,
de reseñas y de reportes, filtros, paginación, utilidades de subasta, formato de
moneda y construcción de URLs de navegación. Los end-to-end recorren catálogo,
exploración, subastas, publicación, autenticación, contacto y páginas estáticas.

El workflow `CI (web)` ejecuta lint, tipos, unitarias y build en un job, y
Playwright en otro, en cada push y pull request que toque `web/`.

---

## Despliegue

Vercel, con despliegue continuo desde `main`. `vercel.json` define los rewrites,
las cabeceras de seguridad y la política de caché (activos versionados de `css/`
y `js/` como inmutables durante un año; imágenes y fuentes con revalidación
diaria).

Tras un despliegue puede hacer falta promover explícitamente la build para que
los dominios apunten a ella:

```bash
vercel promote <url-del-deployment>
```

---

## Licencia

MercadoRD © 2026. Todos los derechos reservados.
