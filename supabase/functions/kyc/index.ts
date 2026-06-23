// ═══════════════════════════════════════════════════
//  MercadoRD — Edge Function: verificación de identidad (KYC) con Didit
//
//  Dos roles en un endpoint:
//  · POST con Authorization Bearer (JWT del usuario) + {action:'create-session'}
//    → crea una sesión de verificación en Didit y devuelve su URL.
//  · POST con cabeceras X-Signature/X-Timestamp (webhook de Didit)
//    → verifica la firma HMAC y actualiza profiles/verifications con la
//      decisión automática (Approved/Declined). Solo este código (service
//      role) puede aprobar: el trigger de la BD bloquea al cliente.
//
//  Secrets requeridos (supabase secrets set):
//    DIDIT_API_KEY, DIDIT_WORKFLOW_ID, DIDIT_WEBHOOK_SECRET
// ═══════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2';

const DIDIT_API = 'https://verification.didit.me/v3/session/';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

async function hmacHex(secret: string, data: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const sigHeader = req.headers.get('x-signature');
  const tsHeader = req.headers.get('x-timestamp');

  // ───────────────────────────────────────────────
  // WEBHOOK de Didit (firmado)
  // ───────────────────────────────────────────────
  if (sigHeader && tsHeader) {
    const secret = Deno.env.get('DIDIT_WEBHOOK_SECRET');
    if (!secret) return json({ error: 'Webhook secret no configurado' }, 500);

    const now = Math.floor(Date.now() / 1000);
    const ts = parseInt(tsHeader, 10);
    if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) {
      return json({ error: 'Timestamp fuera de ventana' }, 401);
    }

    // X-Signature = HMAC-SHA256 hex de los bytes crudos del cuerpo
    const raw = new Uint8Array(await req.arrayBuffer());
    const expected = await hmacHex(secret, raw);
    if (!timingSafeEq(expected, sigHeader)) {
      return json({ error: 'Firma inválida' }, 401);
    }

    const evt = JSON.parse(new TextDecoder().decode(raw));
    const userId = evt.vendor_data as string | undefined;
    const status = evt.status as string | undefined;
    const sessionId = evt.session_id as string | undefined;

    // Defensa en profundidad: vendor_data debe ser un UUID (id de usuario).
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userId && !UUID_RE.test(userId)) return json({ error: 'vendor_data inválido' }, 400);

    // Idempotencia defensiva: Didit puede reentregar el mismo evento. Si este
    // (session_id, status) YA se procesó con éxito antes, salimos sin reaplicar.
    // IMPORTANTE: el marcador se escribe DESPUÉS de aplicar el UPDATE con éxito
    // (más abajo), nunca antes — así un apply fallido NO bloquea la reentrega
    // legítima. Si la tabla aún no existe, el error NO bloquea la verificación.
    if (sessionId && status) {
      const { data: prev, error: prevErr } = await admin
        .from('webhook_events')
        .select('id')
        .eq('source', 'didit').eq('session_id', sessionId).eq('status', status)
        .maybeSingle();
      if (prevErr) console.error('webhook_events lookup (no bloqueante)', prevErr);
      else if (prev) return json({ ok: true, deduped: true });
    }

    let applyOk = true;
    if (userId && status) {
      if (status === 'Approved') {
        const { error: pErr } = await admin.from('profiles')
          .update({ is_verified: true, verification_status: 'verified' })
          .eq('id', userId);
        if (pErr) { applyOk = false; console.error('profiles update (Approved)', pErr); }
        if (sessionId) {
          const { error: vErr } = await admin.from('verifications')
            .update({ status: 'verified', verified_at: new Date().toISOString() })
            .eq('user_id', userId).eq('doc_number', sessionId);
          if (vErr) { applyOk = false; console.error('verifications update (Approved)', vErr); }
        }
      } else if (status === 'Declined') {
        const { error: pErr } = await admin.from('profiles')
          .update({ is_verified: false, verification_status: 'rejected' })
          .eq('id', userId);
        if (pErr) { applyOk = false; console.error('profiles update (Declined)', pErr); }
        if (sessionId) {
          const { error: vErr } = await admin.from('verifications')
            .update({ status: 'rejected' })
            .eq('user_id', userId).eq('doc_number', sessionId);
          if (vErr) { applyOk = false; console.error('verifications update (Declined)', vErr); }
        }
      } else if (['Abandoned', 'Expired', 'KYC Expired'].includes(status)) {
        // Sesión no terminada: liberar el estado para permitir reintento
        const { error: pErr } = await admin.from('profiles')
          .update({ verification_status: 'none' })
          .eq('id', userId).eq('is_verified', false);
        if (pErr) { applyOk = false; console.error('profiles update (release)', pErr); }
      }
      // 'In Review' / 'In Progress' → se mantiene 'pending'
    }

    // Marcar el evento como procesado SOLO si el apply fue correcto. Si falló,
    // no dejamos marcador para que la reentrega de Didit pueda re-aplicarlo.
    // El 23505 (carrera de dos reentregas a la vez) también implica ya-hecho.
    if (applyOk && sessionId && status) {
      const { error: markErr } = await admin
        .from('webhook_events')
        .insert({ source: 'didit', session_id: sessionId, status });
      if (markErr && markErr.code !== '23505') {
        console.error('webhook_events insert (no bloqueante)', markErr);
      }
    }
    return json({ ok: true });
  }

  // ───────────────────────────────────────────────
  // CREAR SESIÓN (navegador, usuario autenticado)
  // ───────────────────────────────────────────────
  const apiKey = Deno.env.get('DIDIT_API_KEY');
  const workflowId = Deno.env.get('DIDIT_WORKFLOW_ID');
  if (!apiKey || !workflowId) {
    return json({ error: 'KYC no configurado todavía (faltan credenciales de Didit)' }, 503);
  }

  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'No autorizado' }, 401);
  const { data: { user }, error: uerr } = await admin.auth.getUser(jwt);
  if (uerr || !user) return json({ error: 'Sesión inválida — inicia sesión de nuevo' }, 401);

  const body = await req.json().catch(() => ({}));
  if (body.action !== 'create-session') return json({ error: 'Acción desconocida' }, 400);

  // Anti-abuso: no crear muchas sesiones de verificación en paralelo (costo Didit).
  const { count } = await admin.from('verifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('status', 'pending')
    .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString());
  if ((count ?? 0) >= 3) {
    return json({ error: 'Ya tienes una verificación en proceso. Espera unos minutos e intenta de nuevo.' }, 429);
  }

  const resp = await fetch(DIDIT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({
      workflow_id: workflowId,
      vendor_data: user.id,
      callback: (typeof body.callback === 'string' &&
                 ['https://mercadord.net', 'https://www.mercadord.net']
                   .some((o) => body.callback.startsWith(o)))
        ? body.callback
        : 'https://mercadord.net',
    }),
  });

  if (!resp.ok) {
    console.error('Didit create-session error', resp.status, await resp.text());
    return json({ error: 'No se pudo crear la sesión de verificación' }, 502);
  }

  const session = await resp.json();

  await admin.from('profiles')
    .update({ verification_status: 'pending' })
    .eq('id', user.id).eq('is_verified', false);
  await admin.from('verifications').insert({
    user_id: user.id,
    doc_type: 'didit',
    doc_number: session.session_id ?? null,
    full_name: user.user_metadata?.full_name ?? null,
    status: 'pending',
  });

  return json({ url: session.url, session_id: session.session_id });
});
