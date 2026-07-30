# AUDIT.md — Auditoría integral de MarketplaceDR (MercadoRD)

> **Estado del stack auditado:** HTML + JS vanilla, sin framework/bundler/build. Sitio estático (Vercel) + Supabase (Postgres + 5 Edge Functions Deno).
> **Decisión estratégica:** re-plataformar a **Next.js (App Router) + TypeScript + Supabase**. Esta auditoría es el insumo de la migración: qué **preservar**, qué **rehacer**, qué **descartar**.
> **Método:** panel de 8 auditores especializados en paralelo → **verificación adversarial de cada hallazgo** → 92 crudos, **89 confirmados**, 3 falsos positivos descartados.
> **Fecha:** 2026-07-01 · **CTO:** Claude (rol asumido)

---

## 1. Resumen ejecutivo

MarketplaceDR **no está listo para producción** medido contra el estándar Amazon/Mercado Libre, y hay que decirlo sin rodeos: hoy es una **vitrina de marketplace con la mecánica de dinero y confianza simulada**. Dicho eso, tiene **cimientos reales y valiosos** que sí se portan: las subastas son atómicas y server-side, el KYC (Didit) es real y firmado, la RLS está activada en todas las tablas y el diseño de base de datos es sólido.

**Lo grave (bloqueante para producción):**
- 🔴 **Escalada a admin abierta en el esquema base** (B1). El trigger de `setup.sql` no congela `is_admin` y la política UPDATE no tiene `WITH CHECK`. El fix existe solo en `hardening-2026-06-23.sql`, **que no está confirmado como aplicado**. Cualquier usuario autenticado podría hacerse admin con la anon key.
- 🔴 **XSS almacenado** vía el campo `icon` de subastas (render sin `esc()` + RLS sin validar contenido). Ejecutable en el navegador de todo visitante del listado.
- 🔴 **No hay pasarela de pago real**: el cobro con tarjeta es un `setTimeout(1400)`. Los pedidos se marcan "pagados" sin cobro.
- 🔴 **La reputación y la monetización son ficción**: reseñas generadas en el cliente, comisión 5% y liquidaciones solo como texto de marketing.

**Lo bueno (se preserva en la migración):**
- ✅ Subastas: RPC `place_bid`/`buy_now` server-side, atómicas, con Realtime.
- ✅ Base de datos: RLS en todas las tablas, escrituras sensibles vía RPC `SECURITY DEFINER`, `webhook_events` para idempotencia. **Es el área más fuerte del proyecto.**
- ✅ KYC real (Edge Function + webhook HMAC), MFA/TOTP real, base de accesibilidad por encima de la media (skip-link, focus-trap, `:focus-visible`).

---

## 2. Calificación del proyecto: **40 / 100**

*(para "marketplace nacional listo para producción tipo Mercado Libre" — no para "demo", donde estaría alto)*

| Dominio | Nota | Lectura |
|---|:--:|---|
| Base de datos | **70** | Lo mejor. RLS + RPC server-side + idempotencia. Faltan índices y aplicar hardenings. |
| UX / Accesibilidad | **55** | Base sólida; filtros móviles ausentes, modales fuera del focus-trap. |
| Backend / Edge Functions | **55** | Bien pensadas; bugs reales (OTP sin binding, open-redirect). |
| Seguridad | **45** | Buenos huesos, pero escalada admin + XSS + CSP `unsafe-inline` bajan la nota. |
| Navegación / Indexación | **40** | SPA sin URLs propias; invisible para crawlers. |
| Arquitectura / Deuda | **30** | Monolito de 3.925 líneas, sin tipos ni tests. |
| Features de marketplace | **30** | Flujo de dinero/confianza simulado. |
| SEO / Performance | **25** | Render 100% cliente, sitemap de 1 URL. |

**Distribución de los 89 hallazgos:** 🔴 4 críticos · 🟠 7 altos · 🟡 37 medios · 🔵 35 bajos · ⚪ 6 info.

| Dimensión | Total | Crit | High | Med | Low |
|---|:--:|:--:|:--:|:--:|:--:|
| features-marketplace | 18 | 1 | 2 | 11 | 4 |
| arquitectura | 14 | 0 | 0 | 9 | 5 |
| base-datos | 11 | 1 | 1 | 3 | 4 |
| ux-a11y | 11 | 0 | 1 | 5 | 4 |
| seguridad | 9 | 2 | 0 | 2 | 3 |
| seo-perf | 9 | 0 | 1 | 3 | 5 |
| navegacion-enlaces | 9 | 0 | 1 | 2 | 5 |
| backend-api | 8 | 0 | 1 | 2 | 5 |

---

## 3. 🔴 Críticos (4)

### C1 · Escalada a admin (B1) abierta en el esquema base
**`supabase/setup.sql:27,33` · `hardening-2026-06-23.sql:16`**
La política `perfil: actualizar propio` permite `UPDATE` de la propia fila **sin `WITH CHECK`**, y el trigger `protect_verification_fields()` congela `is_verified`/`verification_status` pero **no `is_admin`** (columna añadida después en `publicidad-2026-06-22.sql:11`). Con solo el esquema base, un usuario con la anon key hace `update profiles set is_admin=true where id=auth.uid()` y gana control de reports, banners y destacados. El gate cliente `isAdmin()` lee `localStorage` → trivialmente falsificable. El fix está solo en `hardening-2026-06-23.sql:23`, **no confirmado en producción**.
**Fix:** correr `hardening-2026-06-23.sql`, verificar `select id,email,is_admin from profiles where is_admin`, endurecer la política con `WITH CHECK`, y sanear admins colados.
**Migración:** PRESERVAR. En `supabase/migrations`, crear `protect_verification_fields` ya con `is_admin/is_verified/phone_verified/cedula/email` congelados en el mismo archivo que crea `profiles`. Considerar mover `is_admin` a tabla `admin_users` aparte. Gestión admin en Server Actions que verifican `is_admin` server-side, nunca en `userState`.

### C2 · XSS almacenado vía `icon` de subastas
**`js/app.js:557` y `:2765` · `supabase/auctions.sql:14,44`**
El `icon` se interpola en `innerHTML` **sin `esc()`** en el listado (público) y el detalle, y viaja crudo desde la fila (`loadAuctionsDB`). La RLS de INSERT solo valida `auth.uid()=seller_id`; la columna no tiene `CHECK`. Un usuario verificado inserta vía REST con anon key `icon = <img src=x onerror=...>` y el payload se ejecuta en el navegador de todo visitante.
**Fix:** `${esc(a.icon)}` en ambos puntos (ya se hace en el carrusel, `app.js:1833`) + defensa server-side: `CHECK` de emoji/longitud o trigger que derive el icono de la categoría ignorando el cliente.
**Migración:** REHACER. JSX escapa por defecto (no `dangerouslySetInnerHTML`). Portar la lección: **todo campo que hoy entra por anon-key INSERT se valida en la capa de datos, no solo en la UI.**

### C3 · No existe pasarela de pago real (cobro simulado)
**`js/app.js:1422`**
El checkout valida Luhn en cliente y "procesa" con `await new Promise(r => setTimeout(r, 1400))`. `create_order()` marca el pedido `pagado` con `p_payment='card'` sin cobro. Sin PSP (Azul/CardNet/tPago/Stripe/PayPal), sin tokenización PCI, sin escrow, sin webhooks.
**Fix:** módulo de pagos server-side con pasarela RD (Azul/CardNet) + internacional (Stripe/PayPal); estado del pedido derivado de webhooks del PSP; escrow.
**Migración:** módulo NUEVO. `create_order()` pasa a `pendiente_pago`; solo el webhook confirma. Tabla `payments/transactions`. Rehacer el paso de pago por completo.

### C4 · Reputación y monetización son ficción
**`js/app.js:424` (reseñas) · `js/data.js:216` (comisiones)**
`genReviews()` inventa reseñas desde el `id` del producto; no hay tabla `reviews`, ni RPC, ni UI de calificación post-compra. La comisión 5%, Premium RD$990/mes y CPC son **solo texto**: no hay ledger, ni cálculo de neto al vendedor, ni liquidaciones. `get_my_sales()` devuelve bruto.
**Fix:** sistema de reseñas real (solo compradores con pedido entregado, agregación por producto y vendedor) + motor de monetización (comisión configurable, wallet/ledger, liquidación/retiro, integrado con escrow).
**Migración:** módulos NUEVOS. Es el pilar de confianza y el modelo de ingresos — no puede ser copy.

---

## 4. 🟠 Altos (7)

| # | Dominio | Hallazgo | Ubicación | Fix corto |
|---|---|---|---|---|
| H1 | base-datos | Gate KYC + tope anti-shill en `place_bid`/`buy_now` solo en `hardening2` (¿no aplicado?). Sin él, no-verificados pujan sin límite. | `hardening2-2026-06-23.sql:41` · `auctions.sql:114` | Confirmar `prosrc` en prod contiene `KYC_REQUIRED`; consolidar como única definición. |
| H2 | backend-api | `phone-verify` no vincula el OTP a un usuario: cualquiera marca un número como verificado y hereda `phone_verified` al registrarse. | `functions/phone-verify/index.ts:92` | Exigir JWT en `check`, guardar `user_id`, token de un solo uso `send`→`check`. |
| H3 | ux-a11y | Todos los filtros del listado (categoría, precio, condición, provincia) desaparecen en móvil sin alternativa. | `css/styles.css:244` | Botón "Filtros" → drawer/bottom-sheet accesible (role=dialog, focus-trap, Esc). |
| H4 | seo-perf | No hay URLs por producto/categoría: todo vive en `/`. Sin deep-links, sin señales de relevancia. | `js/app.js:334` | Rutas `/producto/[slug]-[id]`, `/categoria/[cat]`; sitemap dinámico. |
| H5 | nav-enlaces | Contenido renderizado por conmutación de vistas en JS: invisible para crawlers sin JS y bots sociales. | `js/app.js:468` | SSR/ISR con rutas reales para producto/subasta/categoría/legal. |
| H6 | features | Reseñas/calificaciones generadas en cliente (duplica C4, foco reseñas). | `js/app.js:424` | Tabla `reviews` + flujo post-compra real. |
| H7 | features | Comisión y liquidaciones no existen en código (duplica C4, foco dinero). | `js/data.js:216` | Motor de comisiones + wallet/ledger + liquidación. |

---

## 5. Falsos positivos descartados (transparencia del verificador)

1. **`index_original.html` como contenido duplicado indexable** → FALSO: está en `.gitignore:44` y no trackeado; Vercel no lo despliega. Solo housekeeping local (info).
2. **`chatbot` usa params no estándar del SDK Anthropic** → FALSO: `output_config.effort` y `thinking:{type:'disabled'}` son GA y válidos para `claude-sonnet-4-6`. Solo quitar `as any` al actualizar tipos.
3. **Toggle "mostrar contraseña" no accesible** → FALSO: `toggleEye` sí actualiza `aria-pressed`/`aria-label` y hay handler global de teclado (Enter/Space). Es botón ARIA válido.

---

## 6. Implicaciones para la migración a Next.js

| Categoría | Qué hacer en la migración |
|---|---|
| **PRESERVAR (portar la lógica tal cual)** | RPCs de subastas (`place_bid`/`buy_now`), `create_order`, RLS de todas las tablas, triggers que congelan columnas privilegiadas, KYC (Edge Function + webhook HMAC), `webhook_events` (idempotencia), MFA/TOTP. |
| **REHACER (nuevo diseño en el nuevo stack)** | Toda la capa render/estado (Server/Client Components + tipos), routing con URLs reales + SSR/ISR + `generateMetadata` + `next/image`, componentes accesibles (Dialog con focus-trap nativo, Tabs con roving tabindex, filtros responsive), pagos (webhooks PSP), reseñas y monetización. |
| **DESCARTAR** | `index_original.html`, handlers `onclick` inline (~185), datos demo hardcodeados, "Mejores ofertas"/chat en `localStorage`, 2FA/reseñas simuladas. |
| **CERRAR YA (independiente de la migración)** | C1 (correr hardenings + confirmar), C2 (escapar `icon`), H1/H2 en la BD y Edge Functions actuales — son exposición viva hoy en producción. |

---

## 7. Próximas tareas (orden recomendado)

1. **Contención inmediata en producción** (no esperar a la migración): correr `hardening-2026-06-23.sql` + `hardening2-2026-06-23.sql`, confirmar `is_admin`/`KYC_REQUIRED` en `pg_proc`, parchear `esc(a.icon)`, y arreglar el binding del OTP en `phone-verify`.
2. **`PRODUCT_REQUIREMENTS.md`** — alcance funcional completo del marketplace nacional (el PRD).
3. **ADR de migración** (`docs/adr/0001-nextjs.md`) — arquitectura destino y plan por fases sin romper lo actual.
4. **Rama `feat/nextjs-migration`** + scaffold Next.js + TypeScript + Supabase SSR, con la BD y RLS existentes como fuente de verdad.
5. Migración por módulos, cada uno con tests, empezando por catálogo/rutas (desbloquea SEO) y luego el flujo de dinero (pagos → reseñas → comisiones).

---

*El detalle completo de los 89 hallazgos (incluidos los 37 medios y 35 bajos) está en el resultado estructurado del workflow. Este documento prioriza lo accionable; los medios/bajos se abordan dentro de cada fase de la migración.*

---

## 8. Apéndice — hallazgos medios y bajos (72)

### 🟡 Medios (37)

| Dominio | Hallazgo | Ubicación | Fix |
|---|---|---|---|
| arquitectura | js/app.js es un monolito de 3925 líneas con responsabilidades entremezcladas | js/app.js:1 | Trocear por dominio y por capa: services/data (Supabase), hooks de estado, y componentes de presentación. No portar el archivo tal cual. |
| arquitectura | ~185 handlers onclick inline en el HTML acoplados a funciones globales de app.js/auth.js | index.html:1 | En el nuevo stack, reemplazar todos los onclick inline por handlers de React (onClick={...}) ligados a componentes; eliminar la dependencia de funciones globale |
| arquitectura | Ausencia total de TypeScript, tests y validación de esquemas de datos | js/app.js:2472 | Introducir TypeScript + validación en runtime (zod) para las respuestas de Supabase y pruebas unitarias de la lógica pura. |
| arquitectura | Render de toda la UI por innerHTML con template strings (SPA casera sin diffing) | js/app.js:260 | Migrar a un motor con diffing y escapado por defecto (React/JSX). |
| arquitectura | Enrutamiento SPA ad-hoc: showView() con switch gigante y estado 'cview' global | js/app.js:468 | Sustituir por rutas de archivo reales; eliminar cview y el switch. |
| arquitectura | Código muerto: index_original.html (98 KB) — confirmado por .gitignore | index_original.html:1 | Eliminar el archivo. Si se quiere conservar como referencia histórica, moverlo fuera del árbol de trabajo o a un /archive documentado. |
| arquitectura | Marcado de tarjeta de producto triplicado (existe helper productCardHTML pero no se reutiliza) | js/app.js:300 | Unificar en un solo componente de tarjeta y usarlo en listado, favoritos y resultados visuales. |
| arquitectura | Lógica bifurcada 'modo demo (local) vs modo real (Supabase)' duplicada en cada acción de escritura | js/app.js:1083 | Separar el modo demo detrás de una interfaz de repositorio única, o eliminarlo si producción ya usa siempre Supabase. |
| arquitectura | Persistencia por localStorage entrelazada con la lógica (MRD/K) y como fuente de PII | js/app.js:7 | Definir claramente qué es caché (efímero) vs verdad de servidor; mover PII y datos compartidos a Supabase. |
| seguridad | CSP con 'unsafe-inline' en script-src anula la protección XSS | vercel.json:12 | Eliminar 'unsafe-inline' de script-src. Como el sitio actual no puede sin refactor masivo, priorizar esto en la migración. Mientras tanto, no hay parche compati |
| seguridad | Rate-limit de Edge Functions en memoria del isolate (evadible) y CORS que no frena curl | supabase/functions/chatbot/index.ts:37 | Mover el rate-limit a almacenamiento compartido (tabla Postgres con ventana, o Upstash/Redis) para que sea consistente entre isolates y no dependa de X-Forwarde |
| base-datos | Sin migraciones versionadas, re-correr archivos en el orden equivocado reabre huecos ya cerrados | supabase/chatbot-2026-06-22.sql:34 | Reconstruir todo como migraciones numeradas/timestamped en supabase/migrations con orden determinista. Auditar el estado REAL de prod (pg_policies, pg_proc) ant |
| base-datos | profiles.phone_verified nunca se marca si el usuario verifica el teléfono después del registro | supabase/phone.sql:4 | Crear un trigger AFTER INSERT on phone_verifications (o hacer que la Edge Function actualice profiles con service_role) que marque phone_verified=true en el/los |
| base-datos | Borrado de cuenta hace CASCADE destructivo: se pierden pedidos, pujas y ventas de contrapartes | supabase/functions/delete-account/index.ts:62 | Introducir soft-delete (deleted_at / status) en profiles, products, orders y anonimizar en vez de CASCADE-borrar. Cambiar FKs sensibles (orders.buyer_id, bids.b |
| ux-a11y | Pestañas y navegación de categorías sin patrón ARIA de tabs (4.1.2) | index.html:853 | Aplicar patrón WAI-ARIA Tabs: tablist/tab/aria-selected/tabpanel + roving tabindex (flechas). O convertir las categorías de .nav en enlaces reales con aria-curr |
| ux-a11y | Modales de subsecciones, 2FA-enroll y contacto quedan fuera de la trampa de foco | js/app.js:3703 | Corto plazo: añadir los IDs faltantes a la lista y considerar el toggle por clase .show (subsecciones usan class, no style). Aplicar inert/aria-hidden al fondo  |
| ux-a11y | Controles interactivos como div/span/<a sin href> con onclick inline | index.html:475 | Usar <button> para acciones y <a href> para navegación; reservar div/span para presentación. |
| ux-a11y | Indicadores de progreso (step-dots y verification-steps) no accesibles | index.html:127 | Añadir texto visible/oculto 'Paso X de N', aria-current='step' en el punto activo y un contenedor aria-live que anuncie el cambio de paso. |
| ux-a11y | Botón de notificaciones y campana sin aria-expanded ni gestión de foco | index.html:743 | Añadir aria-haspopup='true', aria-expanded sincronizado, aria-controls='notifPanel'; mover foco al panel al abrir. |
| seo-perf | Contenido principal (catálogo) no está en el HTML inicial: SPA renderizado 100% en cliente | index.html:808 | En Next.js renderizar el catálogo en servidor (Server Components + fetch a Supabase en el servidor) para que el HTML llegue con productos y texto ya presentes.  |
| seo-perf | Sitemap con una sola URL y estático | sitemap.xml:3 | Generar el sitemap dinámicamente desde la BD (productos + categorías + subastas + páginas informativas) con lastmod real. |
| seo-perf | OG/Twitter image es SVG únicamente: previews rotas en WhatsApp/Facebook | index.html:22 | Exportar og-image.png 1200x630 (JPG/PNG) y apuntar og:image/twitter:image a él. Añadir og:image:type. |
| features-marketplace | El chat comprador-vendedor es simulado en localStorage con auto-respuestas | js/app.js:3352 | Mensajería real: tabla messages/threads con RLS (solo participantes), realtime (Supabase channels), notificaciones, y moderación básica anti-contacto-fuera-de-p |
| features-marketplace | 'Mejor oferta' (negociación de precio) es teatro client-side sin llegar al vendedor | js/app.js:795 | Sistema de ofertas real: tabla offers (producto, comprador, monto, estado), notificación al vendedor, aceptar/contraofertar/rechazar por el vendedor, y un preci |
| features-marketplace | Envío fijo hardcodeado RD$350; sin cálculo por zona, transportistas ni tracking | supabase/orders-seller-2026-06-19.sql:60 | Módulo de envíos: tarifas por zona/peso, opción retiro en persona, integración con couriers RD, generación de guía y tracking; el estado 'enviado/entregado' ide |
| features-marketplace | Sin moderación de anuncios: cualquier publicación entra pública al instante | supabase/setup.sql:108 | Añadir estado de moderación a products, cola de revisión en admin, listas de categorías/keywords prohibidas, auto-flag y posible moderación con IA. Publicacione |
| features-marketplace | Panel admin mínimo: solo banners, destacados y reportes; sin gestión de usuarios/anuncios/pedidos ni auditoría | js/app.js:3467 | Backoffice completo: gestión de usuarios y roles, moderación de anuncios, gestión de pedidos/disputas/reembolsos, revisión KYC, métricas, y tabla de auditoría ( |
| features-marketplace | Notificaciones limitadas a in-app + email de subastas; sin push ni SMS transaccional ni email de pedidos | supabase/emails.sql:517 | Ampliar a email transaccional para todo el ciclo de pedido, push web (y móvil si hay app), preferencias de notificación reales (ya hay UI de prefs pero sin back |
| features-marketplace | Sin perfil de tienda / vendedor público navegable | js/app.js:880 | Página pública de tienda/vendedor: catálogo del vendedor, reputación, antigüedad, verificación, seguir vendedor. Opcional: tiendas oficiales/marcas. |
| features-marketplace | Sin cupones, descuentos ni promociones | N/A:0 | Motor de promociones: cupones (plataforma y por vendedor), reglas (mínimo de compra, categoría, fecha), validación server-side en create_order, y campañas. |
| features-marketplace | Protección al comprador / devoluciones / disputas prometidas pero sin implementación | js/data.js:148 | Construir flujo de disputas/devoluciones: apertura de caso con evidencia, estados, mediación en backoffice, y reembolso ligado al escrow del PSP. |
| features-marketplace | Carrito multi-vendedor: el backend lo soporta pero la UX no lo modela (un solo envío/entrega global) | js/app.js:1414 | Modelar el checkout por sub-pedido/vendedor: envío y estado por vendedor, resumen agrupado. Aprovechar que order_items ya lleva seller_id. |
| features-marketplace | SEO/catálogo indexable inexistente: SPA estática con sitemap de 1 URL y sin páginas de producto server-rendered | sitemap.xml:1 | En Next.js: rutas SSR/ISR por producto, categoría y vendedor; metadata dinámica, Open Graph, JSON-LD (Product/Offer/AggregateRating), sitemap generado. Es una g |
| backend-api | Validación de callback de Didit por startsWith permite open-redirect | supabase/functions/kyc/index.ts:187 | Parsear con new URL(body.callback) y comparar url.origin === 'https://mercadord.net' // url.origin === 'https://www.mercadord.net' (igualdad exacta de origin),  |
| backend-api | Rate-limit en memoria del isolate: best-effort y evadible en Edge multi-instancia | supabase/functions/chatbot/index.ts:37 | Mover el rate-limit a un backing store compartido (tabla Postgres con conteo por ventana, Upstash Redis, o Supabase KV) con clave por IP+acción y, donde aplique |
| navegacion-enlaces | 71 anclas <a> y solo 1 tiene href: navegación no rastreable ni accesible por teclado | index.html:990 | Usar <a href> reales (o <button> para acciones). En Next.js emplear <Link href> para navegación interna y <a href> con las URLs reales de redes sociales; reserv |
| navegacion-enlaces | og:image y twitter:image apuntan a un SVG que no renderiza en WhatsApp/Facebook | index.html:22 | Exportar og-image.png (1200x630) y apuntar og:image/twitter:image a él. En Next.js se puede generar dinámicamente con @vercel/og / opengraph-image.tsx. |

### 🔵 Bajos (35)

| Dominio | Hallazgo | Ubicación |
|---|---|---|
| arquitectura | Mapas de categoría duplicados (iconos y etiquetas ES) en 4 lugares | js/app.js:62 |
| arquitectura | Tres arrays locales 'provs' declarados y nunca usados (código muerto) | js/app.js:1279 |
| arquitectura | fvMobileMode() reescribe document.body por completo para el modo captura móvil | js/app.js:2144 |
| arquitectura | Función esc() (escape HTML) reimplementada en app.js y chatbot.js | js/chatbot.js:79 |
| arquitectura | Listeners globales, timers e IIFE de arranque dispersos por app.js sin ciclo de vida | js/app.js:2445 |
| seguridad | Suplantación de reporter_email en reports (RLS base no valida el correo del reportante) | supabase/chatbot-2026-06-22.sql:34 |
| seguridad | El perfil (incl. isAdmin) se carga en AAL1 antes de completar el 2º factor | js/auth.js:87 |
| seguridad | create_order confía en el precio del cliente para ítems sin producto en BD | supabase/orders-seller-2026-06-19.sql:93 |
| base-datos | verifications.doc_number sin índice ni UNIQUE: el webhook KYC hace seq-scan y puede actualizar filas equivocadas | supabase/functions/kyc/index.ts:117 |
| base-datos | Índices faltantes en columnas usadas por policies RLS y subconsultas EXISTS repetidas | supabase/setup.sql:26 |
| base-datos | orders carece de policy/RPC de UPDATE del comprador; el estado agregado solo lo mueve el vendedor | supabase/hardening-2026-06-23.sql:48 |
| base-datos | Admin y email_from hardcodeados en SQL; is_admin se auto-asigna por email en publicidad-*.sql | supabase/publicidad-2026-06-22.sql:12 |
| ux-a11y | Texto gris #999 sobre blanco no alcanza contraste 4.5:1 (1.4.3) | css/carousel.css:178 |
| ux-a11y | Labels de formularios sin for= dependen de JS para asociarse a su input | index.html:84 |
| ux-a11y | Feed de cámara <video autoplay> sin texto alternativo del estado de captura | index.html:410 |
| ux-a11y | Acciones importantes solo confirman vía toast efímero | js/app.js:88 |
| seo-perf | Imágenes de catálogo en JPG sin WebP/AVIF, sin srcset ni sizes | js/app.js:102 |
| seo-perf | app.js monolítico de 199 KB sin minificar ni code-splitting | js/app.js:1 |
| seo-perf | 9 hojas de CSS render-blocking en el head sin critical CSS | index.html:43 |
| seo-perf | Sin fallback <noscript> en un sitio dependiente de JS | index.html:56 |
| seo-perf | Falta schema.org Product/Offer y BreadcrumbList (solo Organization+WebSite) | index.html:28 |
| features-marketplace | Sin sección de Preguntas y Respuestas en los productos | js/app.js:330 |
| features-marketplace | Favoritos existe pero no hay wishlist/alertas de precio ni guardar búsquedas | js/app.js:845 |
| features-marketplace | Taxonomía de categorías plana (7 categorías, sin subcategorías ni atributos por categoría) | js/app.js:62 |
| features-marketplace | Sin gestión de planes de vendedor (free/premium) ni onboarding de tienda real | js/data.js:221 |
| backend-api | Idempotencia del webhook KYC depende de webhook_events, tabla en hardening2 no desplegado | supabase/functions/kyc/index.ts:97 |
| backend-api | UPDATE de verifications por (user_id, doc_number=session_id) sin unicidad garantizada | supabase/functions/kyc/index.ts:116 |
| backend-api | phone-verify: destructuring de req.json() sin catch específico degrada a internal_error genérico | supabase/functions/phone-verify/index.ts:70 |
| backend-api | KYC usa CORS Access-Control-Allow-Origin '*' mientras las demás restringen a mercadord.net | supabase/functions/kyc/index.ts:20 |
| backend-api | chatbot inserta contexto de conversación de usuarios anónimos con service_role sin límite de reportes | supabase/functions/chatbot/index.ts:171 |
| navegacion-enlaces | Sitemap.xml contiene una sola URL (la home) pese a tener catálogo, subastas y páginas legales | sitemap.xml:3 |
| navegacion-enlaces | 22 imágenes de producto (~948 KB) huérfanas: no referenciadas en ningún lado | assets/products/1.jpg:1 |
| navegacion-enlaces | Manifest PWA con display standalone pero sin service worker: instalable sin funcionalidad offline | manifest.json:8 |
| navegacion-enlaces | Deep-links de subasta finalizada/inexistente devuelven HTTP 200 con mensaje in-page (soft 404) | js/app.js:2712 |
| navegacion-enlaces | Banners publicitarios enlazan a link_url de la BD sin validación de esquema/destino | js/app.js:3456 |

### ⚪ Informativos (6)

- **[seguridad]** auctions carece de los CHECK de longitud/esquema que sí tiene products — `supabase/hardening2-2026-06-23.sql`
- **[seguridad]** Anon/publishable key embebida en cliente (por diseño) y sin fuga de service_role — `js/auth.js`
- **[base-datos]** notifications.auction_id sin FK: notificaciones huérfanas y sin ON DELETE — `supabase/auctions.sql`
- **[base-datos]** Datos de pedido duplicados en orders.items (jsonb) y order_items (relacional) sin fuente única de verdad — `supabase/orders-seller-2026-06-19.sql`
- **[ux-a11y]** Iconografía basada en emojis sin ocultar a lectores de pantalla — `index.html`
- **[navegacion-enlaces]** Enlaces de redes sociales y contacto son placeholders showToast(), no destinos reales — `index.html`
