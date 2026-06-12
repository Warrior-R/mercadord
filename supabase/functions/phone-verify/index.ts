// ═══════════════════════════════════════════════════
//  MercadoRD — Edge Function: verificación de teléfono (Twilio Verify)
//  El navegador NUNCA ve las credenciales de Twilio: se quedan aquí (secrets).
//  Acciones (POST JSON):
//    { action: 'send',  phone }        -> envía OTP por SMS
//    { action: 'check', phone, code }  -> valida el OTP; si aprueba, lo registra
// ═══════════════════════════════════════════════════
const SID    = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!
const VERIFY = Deno.env.get('TWILIO_VERIFY_SERVICE_SID')!
const SUPA_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Normaliza a E.164. RD usa +1; 10 dígitos locales -> +1XXXXXXXXXX
function normalizePhone(p: string): string | null {
  if (!p) return null
  let d = String(p).trim()
  if (d.startsWith('+')) return '+' + d.slice(1).replace(/\D/g, '')
  d = d.replace(/\D/g, '')
  if (d.length === 10) return '+1' + d
  if (d.length === 11 && d.startsWith('1')) return '+' + d
  return '+' + d
}

async function twilio(path: string, body: Record<string, string>) {
  const auth = btoa(`${SID}:${TOKEN}`)
  const res = await fetch(`https://verify.twilio.com/v2/Services/${VERIFY}/${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body).toString(),
  })
  let data: any = {}
  try { data = await res.json() } catch (_) { /* ignore */ }
  return { status: res.status, data }
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { action, phone, code } = await req.json()
    const to = normalizePhone(phone)
    if (!to || to.length < 8) return json({ ok: false, error: 'phone_invalid' }, 200)

    if (action === 'send') {
      const r = await twilio('Verifications', { To: to, Channel: 'sms' })
      if (r.status >= 400) {
        // 60200/60203 = número inválido; 60410 = bloqueado; trial = solo verified caller IDs
        return json({ ok: false, error: r.data?.message || 'send_failed', tw: r.data?.code || r.status }, 200)
      }
      return json({ ok: true, status: r.data?.status || 'pending' })
    }

    if (action === 'check') {
      if (!code) return json({ ok: false, error: 'code_missing' }, 200)
      const r = await twilio('VerificationCheck', { To: to, Code: String(code) })
      const approved = r.data?.status === 'approved'
      if (approved) {
        // Registro server-side de confianza (lo lee el trigger handle_new_user).
        // Insert vía PostgREST con la service_role key (sin dependencias externas).
        try {
          await fetch(`${SUPA_URL}/rest/v1/phone_verifications`, {
            method: 'POST',
            headers: {
              'apikey': SERVICE,
              'Authorization': `Bearer ${SERVICE}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ phone: to }),
          })
        } catch (_) { /* no romper la verificación si falla el registro */ }
      }
      return json({ ok: true, approved, status: r.data?.status || 'unknown' })
    }

    return json({ ok: false, error: 'action_invalid' }, 200)
  } catch (e) {
    return json({ ok: false, error: String((e as Error)?.message || e) }, 200)
  }
})
