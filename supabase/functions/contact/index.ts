// ═══════════════════════════════════════════════════
//  MercadoRD — Edge Function: formulario de contacto (Resend)
//
//  Hace funcionales los correos publicados del portal (soporte,
//  accesibilidad, prensa, talento, inversión) SIN exponer la API key:
//  el visitante envía el formulario → esta función manda el mensaje por
//  Resend a un buzón real (CONTACT_TO), con Reply-To = correo del usuario
//  para poder responderle directo, y el departamento en el asunto.
//
//  · POST { dept, name, email, subject, message, website }
//    - `website` es un honeypot anti-bots (debe ir vacío).
//  · Anónimo (no requiere sesión), pero con rate-limit por IP.
//
//  Secrets (supabase secrets set):
//    RESEND_API_KEY   — clave de Resend (obligatoria)
//    CONTACT_TO       — buzón real que recibe los mensajes (obligatorio)
//    CONTACT_FROM     — remitente verificado; por defecto el de prueba de Resend
// ═══════════════════════════════════════════════════

const ALLOWED_ORIGINS = new Set([
  'https://mercadord.net',
  'https://www.mercadord.net',
]);
function corsFor(origin: string) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://mercadord.net',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Departamentos = los correos publicados en el portal.
const DEPARTMENTS: Record<string, { label: string; addr: string }> = {
  soporte:       { label: 'Soporte',             addr: 'soporte@mercadord.net' },
  accesibilidad: { label: 'Accesibilidad',       addr: 'accesibilidad@mercadord.net' },
  prensa:        { label: 'Prensa',              addr: 'prensa@mercadord.net' },
  talento:       { label: 'Talento / Empleos',   addr: 'talento@mercadord.net' },
  inversion:     { label: 'Inversionistas',      addr: 'inversion@mercadord.net' },
};

// Rate-limit por IP (memoria del isolate): los formularios son de baja
// frecuencia, así que un tope estricto frena spam y protege la cuota de Resend.
const RL = new Map<string, { n: number; t: number }>();
function rateLimit(ip: string, max = 3, windowMs = 600_000): boolean {
  const now = Date.now();
  const e = RL.get(ip);
  if (!e || now - e.t > windowMs) { RL.set(ip, { n: 1, t: now }); return true; }
  if (e.n >= max) return false;
  e.n++; return true;
}

// Escape HTML para no inyectar markup en el cuerpo del correo.
function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

Deno.serve(async (req) => {
  const cors = corsFor(req.headers.get('origin') || '');
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!rateLimit(ip)) return json({ error: 'rate_limited' }, 429);

  const key  = Deno.env.get('RESEND_API_KEY');
  const to   = Deno.env.get('CONTACT_TO');
  const from = Deno.env.get('CONTACT_FROM') || 'MercadoRD <onboarding@resend.dev>';
  if (!key || !to) {
    return json({ error: 'El formulario de contacto todavía no está configurado.', notConfigured: true }, 503);
  }

  const body = await req.json().catch(() => ({}));

  // Honeypot: si un bot rellenó el campo oculto, fingimos éxito y no enviamos.
  if (typeof body.website === 'string' && body.website.trim() !== '') return json({ ok: true });

  const deptKey = DEPARTMENTS[String(body.dept || '')] ? String(body.dept) : 'soporte';
  const dept    = DEPARTMENTS[deptKey];
  const name    = String(body.name || '').trim().slice(0, 100);
  const email   = String(body.email || '').trim().slice(0, 160);
  const subject = String(body.subject || '').trim().slice(0, 160);
  const message = String(body.message || '').trim().slice(0, 5000);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'email_invalid' }, 400);
  if (message.length < 5) return json({ error: 'message_empty' }, 400);

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:20px;color:#1a1a2e">
      <div style="font-size:20px;font-weight:700;color:#2b50d6">Mercado<span style="color:#ff7a00">RD</span> · Contacto</div>
      <div style="height:3px;background:#2b50d6;border-radius:2px;margin:10px 0 16px"></div>
      <p style="font-size:13px;color:#444;margin:0 0 4px"><strong>Departamento:</strong> ${esc(dept.label)} (${esc(dept.addr)})</p>
      <p style="font-size:13px;color:#444;margin:0 0 4px"><strong>De:</strong> ${esc(name) || '(sin nombre)'} &lt;${esc(email)}&gt;</p>
      <p style="font-size:13px;color:#444;margin:0 0 4px"><strong>Asunto:</strong> ${esc(subject) || '(sin asunto)'}</p>
      <div style="margin-top:14px;padding:14px;background:#f8f9fc;border-radius:8px;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(message)}</div>
      <p style="color:#9aa0b8;font-size:11px;margin-top:20px">Responde directamente a este correo para contestarle a ${esc(email)} (Reply-To configurado).</p>
    </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `[${dept.label}] ${subject || 'Nuevo mensaje de contacto'}`,
        html,
      }),
    });
    if (!r.ok) {
      console.error('resend contact failed', r.status, await r.text().catch(() => ''));
      return json({ error: 'send_failed' }, 502);
    }
  } catch (e) {
    console.error('contact error:', e);
    return json({ error: 'send_failed' }, 502);
  }

  return json({ ok: true });
});
