# 🔐 Activar cuentas reales + Google en MercadoRD

> ✅ **YA CONFIGURADO (jun 2026)**: el proyecto `flsixfuzvbapwnfepmwr` está
> activo con el esquema nuevo (RLS + triggers), las URLs de retorno, la
> confirmación por email y el provider de Google con sus credenciales.
> Este documento queda como referencia para recrear la configuración
> desde cero si algún día hace falta.

---

## Paso 1 — Crear el proyecto Supabase (5 min)

1. Entra a https://app.supabase.com → **New project**
2. Nombre: `mercadord` · Región: **East US (North Virginia)** · Define una
   contraseña de base de datos y **guárdala**.
3. Espera 1-2 minutos a que el proyecto se aprovisione.

## Paso 2 — Crear las tablas (2 min)

1. En el dashboard → **SQL Editor** → New query.
2. Pega TODO el contenido de [`supabase/setup.sql`](supabase/setup.sql) y dale **Run**.
3. Debe decir "Success. No rows returned". Esto crea:
   - `profiles` — un perfil por usuario (se crea solo al registrarse, vía trigger)
   - `verifications` — solicitudes de verificación de identidad
   - `products`, `orders`, `favorites` — para la futura migración de localStorage
   - **RLS activado**: cada usuario solo puede ver/editar SUS datos.

## Paso 3 — Copiar credenciales al código (1 min)

1. Dashboard → **Settings → API**:
   - **Project URL** → ej. `https://abcdefgh.supabase.co`
   - **anon public** key → empieza con `eyJ...` o `sb_publishable_...`
2. En `js/auth.js` (líneas 11-13):

```js
const SUPABASE_ENABLED = true;
const SB_URL = 'https://TU_REF_REAL.supabase.co';
const SB_KEY = 'TU_ANON_KEY_REAL';
```

> La anon key es pública por diseño (va en el navegador). La seguridad
> la dan las políticas RLS del Paso 2. **Nunca** pegues aquí la
> `service_role` key.

## Paso 4 — Configurar las URLs de retorno (2 min)

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://mercadord.net`
- **Redirect URLs** (añadir las tres):
  - `https://mercadord.net`
  - `https://mercadord.vercel.app`
  - `http://localhost:4173`

Sin esto, los enlaces de confirmación de correo y el retorno de Google
llevarían a una URL equivocada.

## Paso 5 — Login con Google (10 min, solo la primera vez)

### 5a. Crear el cliente OAuth en Google Cloud

1. Entra a https://console.cloud.google.com → crea un proyecto (ej. "MercadoRD").
2. **APIs & Services → OAuth consent screen**:
   - Tipo: **External** · Nombre: MercadoRD · Tu correo de soporte.
   - Publica la app (Publishing status → In production) para que cualquier
     persona pueda iniciar sesión, no solo cuentas de prueba.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Tipo: **Web application**
   - **Authorized JavaScript origins**:
     - `https://TU_REF.supabase.co`  ← tu Project URL del Paso 3
   - **Authorized redirect URIs**:
     - `https://TU_REF.supabase.co/auth/v1/callback`
4. Copia el **Client ID** y el **Client Secret**.

### 5b. Activarlo en Supabase

1. Dashboard → **Authentication → Providers → Google** (en algunas versiones:
   Authentication → Sign In / Providers)
2. Enable → pega **Client ID** y **Client Secret** → Save.

Listo: el botón "Continuar con Google" del sitio ya hace OAuth real.

## Paso 6 — Probar

1. Despliega (push a GitHub) o prueba en local (`http://localhost:4173`).
2. **Crear cuenta**: usa un correo real → te llega el email "Confirm your
   signup" → al hacer clic vuelves al sitio ya logueado.
3. **Google**: clic en "Continuar con Google" → pantalla de Google → vuelves
   logueado con tu nombre y foto de perfil de Google.
4. Verifica en Supabase → **Table Editor → profiles**: aparece tu fila con
   nombre, teléfono, cédula y provincia.

---

## Qué valida ahora el registro

| Dato | Validación |
|---|---|
| Email | Formato + **verificación real por enlace** (Supabase) |
| Contraseña | Mínimo 8 caracteres, mayúscula y número |
| Teléfono | Formato RD; OTP demo (real al configurar Twilio: Auth → Phone) |
| Cédula | 11 dígitos + **dígito verificador (Luhn, algoritmo JCE)** — rechaza números inventados |
| Edad | Mayor de 18 años |
| Duplicados | Un correo = una cuenta; cédula única en `profiles` |

> Cédula de prueba válida para desarrollo: `001-1234567-3`
> (pasa el dígito verificador; no pertenece a nadie).

## Notas

- **Emails**: Supabase incluye SMTP de prueba (límite ~2/hora). Para
  producción configura un SMTP propio en Settings → Auth → SMTP
  (Resend, Brevo y Amazon SES tienen plan gratis).
- **SMS real**: el OTP del registro es de prueba (consola F12) hasta
  configurar Twilio. Importante: la verificación real de teléfono debe
  hacerse DESPUÉS de crear la cuenta con `updateUser({phone})` +
  `verifyOtp({type:'phone_change'})` — hacerla antes crearía un usuario
  fantasma solo-teléfono separado de la cuenta de email.
- **Recuperar contraseña**: ya funciona — el enlace del correo abre el
  sitio con el formulario "Nueva contraseña".

## Aprobar verificaciones de identidad

Las solicitudes quedan en la tabla `verifications` con estado `pending` y
el perfil se marca `verification_status='pending'`. Para **aprobar**:

1. Dashboard → Table Editor → `profiles` → fila del usuario →
   `is_verified` = `true` y `verification_status` = `verified`.

La base de datos está protegida con un trigger: un usuario **no puede**
auto-marcarse `is_verified=true` desde el navegador aunque manipule la
consola — solo el dashboard/service_role puede. Mientras montas el proceso
de aprobación, el sitio trata `pending` como verificado para no bloquear a
los vendedores (para endurecerlo: en `js/auth.js`, función `loadProfile`,
deja solo `!!data.is_verified`).
