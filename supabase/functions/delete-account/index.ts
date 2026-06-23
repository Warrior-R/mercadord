// ═══════════════════════════════════════════════════
//  MercadoRD — Edge Function: borrado de cuenta (Ley 172-13)
//
//  Derecho de supresión: el usuario autenticado puede eliminar su
//  propia cuenta de forma permanente.
//
//  · POST con Authorization Bearer (JWT del usuario)
//    → resuelve el usuario con admin.auth.getUser(jwt) (service role)
//      y borra la cuenta con admin.auth.admin.deleteUser(user.id).
//      El `on delete cascade` del esquema limpia automáticamente
//      profiles / orders / verifications / favorites / bids / notifications.
//
//  Un usuario SOLO puede borrarse a sí mismo: el id a borrar se toma
//  del JWT verificado, nunca del cuerpo de la petición.
//
//  No requiere secrets adicionales (usa SUPABASE_URL y
//  SUPABASE_SERVICE_ROLE_KEY, ya disponibles en el entorno).
// ═══════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2';

// CORS restringido: solo el sitio oficial puede invocar este endpoint.
const ALLOWED_ORIGINS = ['https://mercadord.net', 'https://www.mercadord.net'];

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  });
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405, origin);

  // El usuario solo puede borrarse a sí mismo: el id sale del JWT verificado.
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'No autorizado' }, 401, origin);

  const { data: { user }, error: uerr } = await admin.auth.getUser(jwt);
  if (uerr || !user) return json({ error: 'Sesión inválida — inicia sesión de nuevo' }, 401, origin);

  try {
    // deleteUser borra auth.users; el `on delete cascade` del esquema elimina
    // profiles, orders, verifications, favorites, bids y notifications.
    const { error: derr } = await admin.auth.admin.deleteUser(user.id);
    if (derr) {
      console.error('delete-account deleteUser error', user.id, derr.message);
      return json({ error: 'No se pudo eliminar la cuenta. Intenta de nuevo más tarde.' }, 500, origin);
    }
  } catch (e) {
    console.error('delete-account unexpected error', user.id, e);
    return json({ error: 'No se pudo eliminar la cuenta. Intenta de nuevo más tarde.' }, 500, origin);
  }

  return json({ ok: true }, 200, origin);
});
