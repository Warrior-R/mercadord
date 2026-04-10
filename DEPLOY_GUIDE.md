# 📋 GUÍA COMPLETA: Publicar MercadoRD con Vercel + Supabase

## ✅ PASO 1: Preparar el Proyecto Localmente

### 1.1 Crear archivo `.env.local` en la raíz del proyecto

En tu carpeta `c:\Users\carlo\OneDrive\Escritorio\mercadord\` crea un archivo llamado `.env.local`:

```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY
```

### 1.2 Crear archivo `.env.production` para producción

```
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY
```

## 🔧 PASO 2: Configurar Supabase (Base de Datos)

### 2.1 Registrarse en Supabase

1. Ve a https://supabase.com
2. Haz clic en "Sign Up" (Registrarse)
3. Crea una cuenta con GitHub o email
4. Crea un nuevo proyecto (elige región: América del Sur o USA)

### 2.2 Obtener Credenciales

Una vez creado el proyecto en Supabase:

1. Ve a **Settings** (Configuración) → **API**
2. Copia estos datos:
   - **Project URL** → Será tu `VITE_SUPABASE_URL`
   - **anon public** (bajo API Keys) → Será tu `VITE_SUPABASE_ANON_KEY`

### 2.3 Crear Tablas en Supabase

En Supabase, ve a **SQL Editor** y ejecuta estas querys:

```sql
-- Tabla de usuarios
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verification_status VARCHAR(50) DEFAULT 'none'
);

-- Tabla de verificaciones
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  doc_type VARCHAR(50),
  doc_number VARCHAR(50),
  full_name VARCHAR(255),
  doc_file_url VARCHAR(500),
  face_capture_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP
);

-- Tabla de productos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL,
  old_price NUMERIC(12, 2),
  category VARCHAR(50),
  condition VARCHAR(50),
  location VARCHAR(100),
  images_urls TEXT[],
  rating NUMERIC(2, 1) DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de compras/órdenes
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  total_price NUMERIC(12, 2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de subastas
CREATE TABLE auctions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  current_bid NUMERIC(12, 2),
  min_bid NUMERIC(12, 2),
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de favoritos
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);
```

## 🚀 PASO 3: Conectar Proyecto con GitHub

### 3.1 Inicializar Git locally

1. Abre PowerShell en tu carpeta `mercadord`
2. Ejecuta:

```powershell
git init
git add .
git commit -m "Initial commit - MercadoRD marketplace"
```

### 3.2 Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. Nombre: `mercadord`
3. Descripción: "Marketplace de República Dominicana"
4. Elige privado o público
5. Copia el URL del repositorio

### 3.3 Conectar y Subir

```powershell
git remote add origin https://github.com/TU_USUARIO/mercadord.git
git branch -M main
git push -u origin main
```

## 📱 PASO 4: Publicar en Vercel

### 4.1 Conectar Vercel con GitHub

1. Ve a https://vercel.com
2. Haz clic en "Sign Up" (Registrarse con GitHub)
3. Autoriza a Vercel acceder a GitHub

### 4.2 Nuevo Proyecto en Vercel

1. En Vercel dashboard, haz clic en "Add New..." → "Project"
2. Busca y selecciona el repositorio `mercadord`
3. Haz clic en "Import"

### 4.3 Configurar Variables de Entorno

En Vercel (durante importación):

1. Ve a **Environment Variables**
2. Añade:
   - **Name**: `VITE_SUPABASE_URL` → **Value**: Tu URL de Supabase
   - **Name**: `VITE_SUPABASE_ANON_KEY` → **Value**: Tu API Key

3. Haz clic en "Deploy"

### 4.4 Esperar despliegue

Vercel construirá y publicará tu proyecto automáticamente. Recibirás un URL tipo:
```
https://mercadord.vercel.app
```

## 🔐 PASO 5: Actualizar Supabase Auth (Opcional pero Recomendado)

En Supabase → Authentication → Providers:

1. Habilita "Email"
2. Si quieres registro social:
   - Google OAuth
   - GitHub OAuth

## 📡 PASO 6: Conectar Base de Datos en el Código

Actualiza tu `js/auth.js` para usar Supabase real:

```javascript
// REEMPLAZA ESTO EN js/auth.js (líneas 6-7):
const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const DEMO = !SB_URL || SB_URL.includes('TU_PROYECTO');
```

## ✅ VERIFICACIÓN FINAL

1. Ve a tu URL de Vercel (ej: https://mercadord.vercel.app)
2. Prueba: Crear cuenta → Verificación → Comprar/Vender
3. Verifica los datos en Supabase Dashboard

## 📊 URLS IMPORTANTES

| Servicio | URL |
|----------|-----|
| Supabase Dashboard | https://app.supabase.com |
| Vercel Dashboard | https://vercel.com/dashboard |
| GitHub Repo | https://github.com/TU_USUARIO/mercadord |
| MercadoRD Live | https://mercadord.vercel.app |

## 🆘 PROBLEMAS COMUNES

### ❌ "VITE_SUPABASE_URL no definida"
**Solución**: Verifica que las variables estén en Vercel → Project Settings → Environment Variables

### ❌ "Error al conectar base de datos"
**Solución**: Asegúrate que el URL y la API Key sean correctos sin espacios

### ❌ "La página no se ve correctamente"
**Solución**: Vercel reconstruye en cada push. Espera 2-3 minutos.

## 🚀 PRÓXIMOS PASOS (DESPUÉS DE PUBLICAR)

1. Implementar email verificación con SendGrid
2. Añadir sistema de pagos (Stripe, mPago)
3. Configurar CDN para imágenes
4. Implementar caché y optimizaciones
5. Añadir analytics (Google Analytics)

---

**¿Necesitas ayuda adicional?** Déjame saber en qué parte te atascas.
