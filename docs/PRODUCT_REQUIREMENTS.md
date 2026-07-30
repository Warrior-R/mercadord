# PRODUCT_REQUIREMENTS.md — MarketplaceDR

> Alcance funcional del marketplace nacional (República Dominicana), estilo Mercado Libre.
> **Complementa** `docs/AUDIT.md` (estado actual) y `docs/adr/0001-nextjs.md` (arquitectura).
> Estado de cada requisito: **✅ existe** · **🟡 parcial/simulado** · **🔴 no existe**. Fase de entrega: **F1/F2/F3**.
> Fecha: 2026-07-01 · Dueño de producto: pendiente · CTO: Claude (rol asumido).

---

## 1. Visión y objetivos

MarketplaceDR es una plataforma de compra-venta y subastas para RD que conecta **compradores** y **vendedores** con confianza (KYC + reputación), pagos reales locales e internacionales, logística con tracking, y una experiencia rápida e indexable. El objetivo de calidad es paridad funcional y de estabilidad con Mercado Libre / eBay a escala nacional.

**Métricas de éxito (norte):** GMV mensual, tasa de conversión visita→compra, % pedidos entregados a tiempo, tasa de disputas < 2%, LCP < 2.5s en móvil, cobertura de tests > 70% en módulos de dinero.

## 2. Actores y roles

| Rol | Descripción |
|---|---|
| **Visitante** | Sin cuenta. Navega, busca, ve productos/subastas (todo indexable). |
| **Comprador** | Cuenta verificada por email. Compra, puja, favoritos, reseña, disputa. |
| **Vendedor** | Comprador + KYC aprobado + perfil de tienda. Publica, gestiona stock, cobra liquidaciones. |
| **Moderador** | Revisa anuncios reportados, resuelve disputas, aplica sanciones. |
| **Administrador** | Configuración global, comisiones, usuarios, finanzas, auditoría. |

> Regla de seguridad (del audit): el rol vive en **BD (RLS + `is_admin` congelado)**, nunca en flag de cliente.

---

## 3. Módulos y requisitos funcionales

### 3.1 Cuentas y autenticación — *F1*
| ID | Requisito | Estado |
|---|---|---|
| AUTH-1 | Registro con email + verificación | ✅ |
| AUTH-2 | Login email/contraseña; recuperar y cambiar contraseña | ✅ |
| AUTH-3 | OAuth Google | ✅ |
| AUTH-4 | OAuth Apple y Facebook | 🔴 |
| AUTH-5 | MFA/TOTP (enroll + reto en login) | 🟡 (código real; falta habilitar TOTP en Dashboard + enforcement server-side por AAL) |
| AUTH-6 | KYC de identidad (Didit, server-side, webhook firmado) | ✅ |
| AUTH-7 | Verificación de teléfono (OTP) **vinculada al usuario** | 🟡 (existe pero sin binding OTP↔usuario — ver H2) |
| AUTH-8 | Roles y permisos (comprador/vendedor/moderador/admin) en BD | 🟡 (solo `is_admin`; falta modelo de roles completo) |
| AUTH-9 | Eliminación de cuenta (Ley 172-13) | ✅ |

**Criterios de aceptación clave:** ningún campo privilegiado (`is_admin`, `is_verified`, `phone_verified`, `cedula`) es mutable por el rol `authenticated`; MFA enforzado por `auth.jwt()->>'aal'` en RLS sensibles cuando el usuario tiene factor.

### 3.2 Catálogo de productos — *F1*
| ID | Requisito | Estado |
|---|---|---|
| CAT-1 | Productos con título, descripción, precio, condición, imágenes | ✅ |
| CAT-2 | Categorías y subcategorías jerárquicas | 🟡 (categorías planas) |
| CAT-3 | Variantes (talla/color), atributos, marcas, SKU, código de barras | 🔴 |
| CAT-4 | Inventario y control de stock (decremento atómico al vender) | 🟡 |
| CAT-5 | Etiquetas, productos relacionados, comparador | 🔴 |
| CAT-6 | Favoritos / wishlist | ✅ |
| CAT-7 | Historial de navegación | 🔴 |
| CAT-8 | URLs canónicas por producto/categoría (SEO) | 🔴 (todo en `/` — ver H4/H5) |

### 3.3 Búsqueda y descubrimiento — *F2*
| ID | Requisito | Estado |
|---|---|---|
| SRCH-1 | Búsqueda por texto con filtros (categoría, precio, condición, ubicación, atributos, vendedor) | 🟡 (filtros existen; desaparecen en móvil — H3) |
| SRCH-2 | Autocomplete, corrección ortográfica, sinónimos | 🔴 |
| SRCH-3 | Ranking por relevancia + señales (ventas, reputación, recencia) | 🔴 |
| SRCH-4 | Motor dedicado (Postgres FTS → Meilisearch/Typesense si escala) | 🔴 |
| SRCH-5 | Recomendaciones ("también te puede interesar") | 🔴 |

### 3.4 Subastas — *F1 (preservar)*
| ID | Requisito | Estado |
|---|---|---|
| AUC-1 | Pujas atómicas server-side (`place_bid`) con Realtime | ✅ |
| AUC-2 | Comprar-ya (`buy_now`) | ✅ |
| AUC-3 | Gate KYC + tope anti-shill | 🟡 (solo en `hardening2`, confirmar aplicado — H1) |
| AUC-4 | Notificaciones de puja superada / cierre | ✅ (in-app + email) |
| AUC-5 | Anti-sniping (extensión de tiempo), reserva mínima | 🔴 |

### 3.5 Carrito, checkout y pedidos — *F1*
| ID | Requisito | Estado |
|---|---|---|
| ORD-1 | Carrito **multi-vendedor** (subórdenes por vendedor) | 🟡 (pedidos multi-vendedor con recálculo server-side; carrito UI a rehacer) |
| ORD-2 | Checkout con dirección, envío y método de pago | 🟡 |
| ORD-3 | Creación de pedido server-side anti-manipulación (`create_order`) | ✅ |
| ORD-4 | Estados de pedido (pendiente_pago→pagado→enviado→entregado→cerrado) derivados de eventos, no del cliente | 🟡 |
| ORD-5 | Facturas / comprobantes | 🔴 |
| ORD-6 | Historial de pedidos comprador y vendedor | ✅ |

### 3.6 Pagos y dinero — *F2 (crítico, nuevo)*
| ID | Requisito | Estado |
|---|---|---|
| PAY-1 | Pasarela RD (Azul y/o CardNet, tarjetas locales) con tokenización PCI | 🔴 (hoy `setTimeout` — C3) |
| PAY-2 | Método internacional (Stripe / PayPal) | 🔴 |
| PAY-3 | Estado de pago derivado de **webhooks del PSP** | 🔴 |
| PAY-4 | Escrow (retención hasta confirmación de entrega) | 🔴 |
| PAY-5 | Comisión configurable por categoría/plan + ITBIS | 🔴 (solo copy — C4/H7) |
| PAY-6 | Wallet/ledger de saldos por vendedor | 🔴 |
| PAY-7 | Ciclo de liquidación/retiro a vendedores | 🔴 |
| PAY-8 | Reembolsos y contracargos | 🔴 |
| PAY-9 | Cupones y promociones | 🔴 |

### 3.7 Confianza y reputación — *F2 (crítico, nuevo)*
| ID | Requisito | Estado |
|---|---|---|
| REP-1 | Reseñas reales (solo comprador con pedido entregado) | 🔴 (fabricadas en cliente — C4/H6) |
| REP-2 | Calificación de vendedor calculada (ventas, % a tiempo, disputas) | 🔴 |
| REP-3 | Q&A en productos (preguntas y respuestas públicas) | 🔴 |
| REP-4 | Chat comprador↔vendedor (persistido, moderable) | 🔴 (teatro en localStorage) |
| REP-5 | Reportes de anuncios + moderación | 🟡 (reportes existen; flujo de moderación mínimo) |

### 3.8 Vendedores y tiendas — *F2*
| ID | Requisito | Estado |
|---|---|---|
| SEL-1 | Perfil público de tienda (con reputación, catálogo) | 🔴 |
| SEL-2 | Dashboard de vendedor: ventas, pedidos, métricas | 🟡 |
| SEL-3 | Publicaciones gratuitas vs premium/destacadas | 🟡 (destacados admin; sin planes de vendedor) |
| SEL-4 | Gestión de inventario y precios en lote | 🔴 |

### 3.9 Envíos y logística — *F3*
| ID | Requisito | Estado |
|---|---|---|
| SHIP-1 | Cálculo de costo de envío por zona/peso | 🔴 |
| SHIP-2 | Integración courier(s) RD + tracking | 🔴 |
| SHIP-3 | Estados de envío + notificaciones | 🔴 |
| SHIP-4 | Direcciones múltiples del comprador | ✅ |

### 3.10 Notificaciones — *F2*
| ID | Requisito | Estado |
|---|---|---|
| NOT-1 | In-app | ✅ |
| NOT-2 | Email (transaccional) | 🟡 (subastas + contacto vía Resend) |
| NOT-3 | SMS | 🔴 |
| NOT-4 | Push (web push / PWA) | 🔴 |

### 3.11 Panel administrativo — *F2*
| ID | Requisito | Estado |
|---|---|---|
| ADM-1 | Dashboard con analytics (GMV, usuarios, pedidos) | 🟡 |
| ADM-2 | Gestión de usuarios y roles | 🔴 |
| ADM-3 | Gestión de productos/categorías/moderación | 🟡 |
| ADM-4 | Configuración de comisiones y planes | 🔴 |
| ADM-5 | Finanzas: liquidaciones, reembolsos, disputas | 🔴 |
| ADM-6 | **Auditoría y trazabilidad** (log inmutable de acciones admin) | 🔴 |
| ADM-7 | CMS de banners/destacados | ✅ |

---

## 4. Requisitos transversales

### 4.1 SEO técnico — *F1*
URLs limpias, canonical, meta dinámicos (`generateMetadata`), OG/Twitter con **imagen raster** (PNG/JPG, no solo SVG), Schema.org (Product, Offer, BreadcrumbList, Organization, WebSite), breadcrumbs, sitemap **dinámico** (producto/categoría), robots, redirecciones 301, 404 personalizada, **SSR/ISR** para que el catálogo esté en el HTML servido.

### 4.2 Rendimiento / Core Web Vitals — *F1*
LCP < 2.5s, INP < 200ms, CLS < 0.1 en móvil. `next/image` (WebP/AVIF + `srcset`), code-splitting, streaming SSR, caché (ISR + Redis para datos calientes), CDN, prefetch/preload.

### 4.3 Accesibilidad WCAG 2.2 AA — *F1→continuo*
Componentes accesibles nativos (Dialog con focus-trap, Tabs con roving tabindex), filtros usables en móvil, contraste AA (evitar `#999` sobre blanco), navegación por teclado, labels en todos los formularios.

### 4.4 Seguridad (OWASP) — *continuo*
Escapado por defecto (JSX), validación server-side de todo input, CSP **sin `unsafe-inline`**, HSTS, rate-limiting durable (no solo en memoria del isolate), RLS como barrera real, secretos server-side (mover `ANTHROPIC_API_KEY` fuera del cliente), auditoría, backups automáticos.

### 4.5 Legal / RD — *F2*
Términos, privacidad, política de cookies con **consentimiento**, Ley 172-13 (protección de datos, borrado ya existente), facturación con ITBIS, protección al comprador (respaldada por escrow real, hoy es promesa).

### 4.6 i18n / l10n — *F3*
Español como base; arquitectura preparada para i18n. Moneda RD$, formatos de fecha/número locales.

### 4.7 Observabilidad — *F2*
Logging estructurado, error tracking (Sentry), health checks, métricas de rendimiento, tracing de las rutas de dinero.

### 4.8 Calidad — *continuo*
Unit + integration + E2E (Playwright) + tests de carga en módulos de dinero; objetivo > 70% cobertura en pagos/pedidos/subastas.

---

## 5. Requisitos no funcionales

- **Escalabilidad:** arquitectura sin estado en la capa web (Next.js en Vercel), BD como fuente de verdad, caché para lectura caliente; preparada para picos (lanzamientos, subastas populares).
- **Disponibilidad:** objetivo 99.9%; degradación elegante si un PSP o courier cae.
- **Consistencia del dinero:** toda operación monetaria es transaccional, idempotente (webhooks con `webhook_events`) y auditable.
- **Portabilidad de datos:** migraciones versionadas en `supabase/migrations`.

---

## 6. Priorización por fases (resumen)

| Fase | Foco | Desbloquea |
|---|---|---|
| **F1** | Scaffold Next.js + auth + catálogo con **rutas reales y SSR** + subastas portadas + a11y/SEO base | Indexabilidad, base sólida, cierre de deuda de arquitectura |
| **F2** | **Dinero y confianza**: pagos reales + escrow + comisiones/wallet + reseñas + chat + moderación + notificaciones + admin | Operar como marketplace comercial de verdad |
| **F3** | Logística (envíos/tracking), búsqueda avanzada/recomendaciones, i18n, optimizaciones de escala | Madurez y crecimiento |

> **Nota de secuencia:** F1 no incluye cobrar dinero real; hasta que PAY-* (F2) exista, no se debe anunciar como marketplace transaccional. La contención de seguridad del audit (C1/C2/H1/H2) se aplica **ya** sobre el stack actual, en paralelo a F1.
