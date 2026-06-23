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

const ALLOWED_ORIGINS = new Set([
  'https://mercadord.net',
  'https://www.mercadord.net',
])
function corsFor(origin: string) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://mercadord.net',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// Anti toll-fraud: tope por IP y cooldown por número (memoria del isolate).
const IP_HITS = new Map<string, { n: number; t: number }>()
const SENT = new Map<string, number>()
function ipLimit(ip: string, max = 5, windowMs = 600_000): boolean {
  const now = Date.now()
  const e = IP_HITS.get(ip)
  if (!e || now - e.t > windowMs) { IP_HITS.set(ip, { n: 1, t: now }); return true }
  if (e.n >= max) return false
  e.n++; return true
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

// json() se define dentro del handler (cierra sobre el cors por-origen).

Deno.serve(async (req) => {
  const cors = corsFor(req.headers.get('origin') || '')
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { action, phone, code } = await req.json()
    const to = normalizePhone(phone)
    if (!to || to.length < 8) return json({ ok: false, error: 'phone_invalid' }, 200)

    if (action === 'send') {
      // Solo Norteamérica (+1: RD/US/CA). Corta destinos premium internacionales (toll-fraud).
      if (!/^\+1\d{10}$/.test(to)) return json({ ok: false, error: 'phone_unsupported' }, 200)
      // Tope por IP + cooldown de 60s por número.
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
      if (!ipLimit(ip)) return json({ ok: false, error: 'rate_limited' }, 429)
      if (Date.now() - (SENT.get(to) || 0) < 60_000) return json({ ok: false, error: 'cooldown' }, 429)
      SENT.set(to, Date.now())

      const r = await twilio('Verifications', { To: to, Channel: 'sms' })
      if (r.status >= 400) {
        // El detalle de Twilio se queda en el log del servidor, no se filtra al cliente.
        console.error('twilio send failed', r.status, r.data?.code, r.data?.message)
        return json({ ok: false, error: 'send_failed' }, 200)
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
    console.error('phone-verify error:', e)
    return json({ ok: false, error: 'internal_error' }, 200)
  }
})
