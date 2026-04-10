# 🇩🇴 MercadoRD — Marketplace de República Dominicana

**Plataforma segura de compra y venta en línea con verificación obligatoria de identidad (Ley 172-13 RD)**

---

## 📋 Índice

1. [Características](#-características)
2. [Instalación local](#-instalación-local)
3. [Deployment a producción](#-deployment-a-producción)
4. [Estructura del proyecto](#-estructura-del-proyecto)
5. [Guía de usuario](#-guía-de-usuario)
6. [Soporte técnico](#-soporte-técnico)

---

## ✨ Características

### 🏪 Marketplace
- ✅ **16+ productos** con categorías (Electrónica, Vehículos, Inmuebles, etc.)
- ✅ **Filtros avanzados**: categoría, rango de precio (RD$0 → RD$200k), condición, ubicación
- ✅ **Búsqueda en tiempo real** con autocompletado
- ✅ **Carrusel interactivo** con 3 tabs:
  - 🔥 **Ofertas** - Descuentos especiales hasta 40%
  - ⏰ **Subastas por finalizar** - Lotes en tiempo real
  - 📈 **Trending** - Productos más vistos
- ✅ **Perfil detallado del producto** con imágenes, reseñas, ubicación del vendedor
- ✅ **Carrito de compras** con cálculo de ITBIS (18%) + envío RD$350
- ✅ **Sistema de favoritos** para guardas productos
- ✅ **Publicación de anuncios** - Vendedores pueden crear listados propios
- ✅ **5 subastas activas** con contador regresivo y pujas en vivo
- ✅ **Diseño 100% responsivo** (móvil, tablet, desktop)

### 🔐 Verificación de Identidad (Obligatoria)
**Cumple Ley 172-13 de la República Dominicana - Ley Contra el Lavado de Dinero**

- ✅ **Paso 1 - Documento**: Cédula dominicana o pasaporte
- ✅ **Paso 2 - Carga de archivo**: Foto del documento (DNI/Pasaporte)
- ✅ **Paso 3 - Verificación biométrica**: Captura de rostro en vivo con cámara
- ✅ **Verificación obligatoria** para comprar o vender
- ✅ **Almacenamiento seguro** en Supabase con encriptación
- ✅ **Sistema anti-fraude** automático

### 🔓 Autenticación (Supabase)
- ✅ **Multiple métodos**: 
  - Email + contraseña
  - Google OAuth
  - SMS OTP (vía Twilio)
- ✅ **Registro en 4 pasos**:
  1. Email + contraseña
  2. Verificación por SMS (6 dígitos)
  3. Datos personales (edad, cédula)
  4. Verificación biométrica + documento
- ✅ **Recuperación de contraseña** automática
- ✅ **2FA (autenticación de dos factores)**
- ✅ **Bloqueo anti-brute-force** (máx 5 intentos fallidos)
- ✅ **Modo demo automático** si no has configurado Supabase

### 📱 Footer Inteligente
- ✅ **Para Compradores**: Cómo comprar, guía de seguridad, preguntas frecuentes
- ✅ **Para Vendedores**: Cómo vender, comisiones, publicación de anuncios
- ✅ **Sobre MercadoRD**: Quiénes somos, contacto, redes sociales
- ✅ **Términos legales**: 10 cláusulas completas de términos de uso
- ✅ **Modales interactivos** con iconos y información detallada

---

## 🚀 Instalación Local

### Requisitos
- **Git** (opcional: para clonar el repo)
- **Navegador moderno** (Chrome, Firefox, Safari, Edge)
- **VS Code** (opcional: para editar código)

### Paso 1 — Descargar el proyecto
```bash
# Opción A: Clonar desde GitHub (cuando esté disponible)
git clone https://github.com/tunombre/mercadord.git
cd mercadord

# Opción B: Descargar ZIP manualmente
# Ve a https://github.com/tunombre/mercadord
# Click "Code" → Download ZIP
# Descomprime la carpeta
```

### Paso 2 — Ejecutar con Live Server
**En VS Code:**
1. Abre la carpeta `mercadord` en VS Code
2. Instala la extensión **Live Server** (opción: haz click en el ícono de Extensions en la barra izquierda)
3. Haz click derecho en `index.html` → **"Open with Live Server"**
4. Se abre automáticamente en `http://localhost:5500`

**O simplemente abre en tu navegador:**
- Arrastra `index.html` al navegador (funciona sin servidor)
- Acceso en la mayoría de casos sin Supabase configurada (modo DEMO)

### Paso 3 — Variables de entorno (opcional)
Para conectar con la base de datos real en desarrollo:

1. Crea un archivo `.env.local` en la raíz del proyecto:
```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_aqui
```

2. Reemplaza en `js/auth.js` líneas 8-9 con tus credenciales reales de Supabase

---

## 🌐 Deployment a Producción

### Opción Recomendada: Vercel + Supabase

**⏱️ Tiempo aproximado: 30 minutos**

Lee la **[GUÍA COMPLETA DE DEPLOYMENT](DEPLOY_GUIDE.md)** que incluye:
- ✅ Paso 1: Crear archivo `.env.local`
- ✅ Paso 2: Registrarse en Supabase + crear proyecto + deploy SQL
- ✅ Paso 3: Subir código a GitHub
- ✅ Paso 4: Conectar Vercel con GitHub (auto-deploy)
- ✅ Paso 5: Configurar variables de entorno en Vercel
- ✅ Paso 6: Probar en producción

**Resultado:** Tu sitio estará en vivo en `https://mercadord.vercel.app` (o tu dominio personalizado)

---

## 📁 Estructura del Proyecto

```
mercadord/
│
├── 📄 index.html                ← SPA HTML principal
├── 📄 index_original.html       ← Respaldo original
│
├── 📁 css/
│   ├── styles.css               ← Estilos globales (header, productos)
│   ├── auth.css                 ← Modal autenticación
│   ├── footer.css               ← Pie de página + subsecciones
│   ├── carousel.css             ← Carrusel 3 tabs (ofertas/subastas/trending)
│   ├── subsections.css          ← Modales para el footer
│   └── verification.css         ← Modal verificación identidad biométrica
│
├── 📁 js/
│   ├── auth.js                  ← Autenticación Supabase + gates
│   ├── app.js                   ← Lógica: carrousel, carrito, modales
│   └── data.js                  ← Productos, subastas, contenido legal
│
├── 📁 assets/                   ← Imágenes y recursos
│
├── 📄 package.json              ← Dependencias del proyecto
├── 📄 vercel.json               ← Configuración Vercel
├── 📄 .env.local.example        ← Plantilla variables de entorno
├── 📄 .gitignore                ← Archivos ignorados por Git
├── 📄 .github/workflows/        ← CI/CD automático (futuro)
│
├── 📄 DEPLOY_GUIDE.md           ← **LEER ESTO para ir a producción**
├── 📄 README.md                 ← Este archivo
└── 📄 mercadord.code-workspace  ← Abre esto en VS Code
```

### Descripción de archivos clave:

| Archivo | Descripción |
|---------|-------------|
| `index.html` | SPA con modales para auth, verificación, carrusel, footer subsecciones |
| `js/auth.js` | Integración Supabase + funciones login/register + requireAuth() |
| `js/app.js` | Lógica producto, carrito, verificación, carrusel automático, favoritos |
| `js/data.js` | Base datos local: productos, subastas, términos legales, SQL schemas |
| `DEPLOY_GUIDE.md` | **MÁS IMPORTANTE**: Pasos exactos para llevar a producción |
| `package.json` | Info proyecto + dependencias (esencialmente Supabase SDK) |

---

## 👤 Guía de Usuario

### Para Compradores
1. **Explorar**: Navega productos en la página principal
2. **Filtrar**: Usa categoría, precio, condición, ubicación
3. **Favoritar**: Click en ⭐ (requiere login)
4. **Carrito**: Add to cart → Sumariza ITBIS + envío
5. **Comprar**: Checkout → Verifica identidad si es tu primer compra
6. **Leer términos**: Footer → "Para Compradores"

### Para Vendedores
1. **Registrarse**: Email + contraseña + verificación SMS + identidad
2. **Publicar**: "Publicar Anuncio" → Llena formulario (foto, descripción, precio)
3. **Subastar**: Crea subastas con contador regresivo
4. **Gestionar**: Perfil → Mis Anuncios → Editar/Borrar
5. **Cobrar**: Configura método de pago en Settings
6. **Leer términos**: Footer → "Para Vendedores"

### Seguridad
- 🔒 **Verify antes de comprar/vender**: Cámara + documento
- 🔒 **No compartir contraseña** con nadie
- 🔒 **Usar 2FA** en Settings
- 🔒 **Reportar estafas**: Footer → Contacto

---

## 🧪 Stack Técnico

| Componente | Tecnología | Propósito |
|-----------|-----------|----------|
| Frontend | HTML5 + CSS3 + Vanilla JS | UI responsivo, sin frameworks |
| Backend | Supabase PostgreSQL | Base datos usuarios, productos, órdenes |
| Auth | Supabase Auth | Login, registro, 2FA, OAuth |
| Hosting | Vercel | Deploy estático + serverless functions |
| Versionado | GitHub + Git | Control cambios + CI/CD |
| Verificación | WebRTC API | Captura cámara real-time biométrica |

### Dependencias instaladas
```json
{
  "@supabase/supabase-js": "^2.38.0"  ← Base datos + auth
}
```

---

## 🧩 Extensiones VS Code Recomendadas

| Extensión | Propósito |
|-----------|----------|
| **Live Server** | Sirve HTML localmente con auto-refresh |
| **Prettier** | Formatea código automáticamente |
| **Auto Rename Tag** | Renombra etiquetas HTML pareadas |
| **Color Highlight** | Visualiza colores CSS inline |
| **HTML CSS Support** | Autocompletado de clases CSS |
| **Material Icon Theme** | Íconos vistosos en el explorador |
| **Thunder Client** | Prueba APIs REST (cuando haya backend propio) |

---

## 🔧 Configuración Supabase

### Crear proyecto en Supabase

1. Ve a https://supabase.com
2. Sign up con tu email o GitHub
3. Crea nuevo proyecto:
   - Nombre: `mercadord`
   - Región: **Americas (sudamérica)** 
   - Contraseña: genera segura (min 12 caracteres)
4. Espera ~2 minutos a que provisione

### Obtener credenciales

1. Dashboard → Settings → API
2. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
3. Pega en `.env.local`

### Deploy SQL (tablas de BD)

1. Dashboard → SQL Editor
2. Copia **TODO** de `DEPLOY_GUIDE.md PASO 2.3`
3. Pega en Supabase SQL Editor
4. Click "RUN" (botón play)
5. ✅ Verifica que ves 6 tablas nuevas: `users`, `verifications`, `products`, `orders`, `auctions`, `favorites`

### Configurar autenticación

1. Dashboard → Authentication → Providers
2. Habilita:
   - ✅ **Email** (default ya está)
   - ✅ **Google** (necesitas OAuth credentials de Google Cloud)
   - ✅ **Phone** (opcional, requiere Twilio)
3. Email Templates → Personaliza para MercadoRD

---

## 🐛 Solucionar Problemas

### Problema: Las imágenes no cargan
**Solución**: Supabase Storage no está configurado. Por ahora usa URLs externas (imgur, imgbb, etc)

### Problema: Login no funciona
**Solución 1**: ¿Actualizaste `.env.local` con credenciales reales? Si no, está en MODO DEMO (OK)
**Solución 2**: ¿Supabase project está activo? Revisa en https://app.supabase.com

### Problema: Verificación de identidad no guarda datos
**Solución**: La cámara captura OK, pero la tabla `verifications` de Supabase no existe. Ejecuta el SQL del DEPLOY_GUIDE.md

### Problema: "Module not found @supabase/supabase-js"
**Solución**: El navegador la descarga del CDN automáticamente. Si no funciona en producción, instala: `npm install` (si usas build tools)

### Problema: CORS error en consola
**Solución**: Normal en desarrollo local. Al deploy a Vercel + Supabase, se resuelve automáticamente.

### Ver más ayuda
Consulta la sección **"Problemas Comunes"** en [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

---

## 📞 Soporte

| Canal | Para qué | Respuesta |
|-------|---------|----------|
| **Issues en GitHub** | Bugs, features requests | 24-48h |
| **Email**: support@mercadord.do | Soporte usuario | 24h |
| **WhatsApp**: +1 (XXX) XXX-XXXX | Urgencias | 1-2h |
| **Discord** (futuro) | Chat comunidad | Real-time |

---

## 📄 Licencia

MercadoRD © 2024 Todos los derechos reservados.

**Cumplimiento legal:**
- ✅ Ley 172-13 RD (Verificación de identidad)
- ✅ Términos de uso (10 cláusulas completas)
- ✅ Política de privacidad (en footer)
- ✅ Protección datos personales

---

## 🎯 Próximas Mejoras

- 🔄 Sistema de pagos (mPago, Stripe)
- 📸 Almacenamiento de imágenes en Supabase Storage
- 💬 Chat en vivo entre comprador-vendedor
- 📊 Dashboard vendedor con analytics
- 🏆 Sistema de reputación (estrellas)
- 🤖 Validación automática de documentos (Google Vision API)
- 📧 Notificaciones por email
- 📲 App móvil nativa

---

**¿Listo para ir a producción?** Sigue la [GUÍA DE DEPLOYMENT](DEPLOY_GUIDE.md) 🚀

### Footer
- ✅ Newsletter
- ✅ 5 columnas: Compradores, Vendedores, MercadoRD, Contacto + Redes
- ✅ 6 redes sociales con íconos SVG
- ✅ Sitios especiales: Seller Center, Retorno, Comunidad...
- ✅ 6 modales legales: Términos, Privacidad, Cookies, Anti-fraude, Devoluciones, Accesibilidad
- ✅ Métodos de pago dominicanos

---

## 🔮 Próximos pasos

- [ ] Base de datos real (Supabase PostgreSQL)
- [ ] Subida de imágenes (Supabase Storage)
- [ ] Pasarela de pago (CardNet, Azul, PayPal)
- [ ] Sistema de mensajería
- [ ] Panel de administrador
- [ ] Notificaciones WhatsApp
- [ ] App móvil (React Native)

---

**Desarrollado con ❤️ para la República Dominicana 🇩🇴**
