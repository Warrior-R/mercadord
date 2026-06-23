// ═══════════════════════════════════════════════════
//  MercadoRD — Edge Function: asistente con IA (Claude)
//
//  · POST { messages: [{role:'user'|'assistant', content:'...'}, ...] }
//    → responde como asistente de MercadoRD. Conoce toda la plataforma
//      (comprar, vender, verificación, subastas, cuenta…).
//    → si el usuario quiere reportar fraude / spam / un perfil sospechoso,
//      Claude llama a la tool `crear_reporte` y la función lo guarda en la
//      tabla `reports` (service role). El admin lo revisa en su panel.
//
//  Auth: opcional. Si llega Authorization Bearer (JWT) se asocia el reporte
//  al usuario; si no, el chat y el reporte funcionan de forma anónima.
//
//  Secret requerido:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//  Modelo:            claude-sonnet-4-6
// ═══════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

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

// ─── Conocimiento de la plataforma (system prompt) ───
const SYSTEM = `Eres "Asistente MercadoRD", el asistente virtual del marketplace MercadoRD (mercadord.net), una plataforma de compra-venta entre personas en República Dominicana, al estilo eBay.

TU PERSONALIDAD
- Hablas en español dominicano, cercano y claro. Tuteas al usuario.
- Respuestas breves y útiles (2-5 frases). Usa emojis con moderación.
- Si no sabes algo o no es parte de MercadoRD, dilo con honestidad y sugiere escribir a soporte. No inventes funciones, precios ni políticas.

QUÉ OFRECE MERCADORD (úsalo para responder dudas)
- COMPRAR: navegar anuncios por categorías, buscar, ver detalle, agregar al carrito y hacer checkout. Se pueden marcar productos como favoritos (❤️).
- VENDER: con el botón "+ Vender" se publica un anuncio (título, descripción, precio, categoría, condición, ubicación, fotos).
- VERIFICACIÓN DE IDENTIDAD (KYC): los usuarios pueden verificar su identidad con su cédula dominicana para generar más confianza. Aparece una insignia de verificado. La aprobación es automática y segura; nadie puede auto-verificarse manualmente.
- SUBASTAS: algunos productos se venden por puja (ofreces un monto y ganas si eres la oferta más alta). También existe la opción de hacer una OFERTA al vendedor.
- CUENTA: registro e inicio de sesión por correo o con Google. Desde la cuenta se ven pedidos, favoritos y el estado de verificación.
- SEGURIDAD: recomienda siempre verificar al vendedor/comprador, no pagar por fuera de medios seguros, y desconfiar de precios demasiado bajos o de quien apura el pago.

REPORTES (función clave)
Si el usuario quiere reportar un perfil sospechoso, un fraude/estafa, o spam de otro usuario, AYÚDALO a reportarlo:
1. Pregunta lo que falte: a QUIÉN o QUÉ reporta (nombre del perfil, enlace o anuncio) y QUÉ pasó (descripción).
2. Cuando tengas el tipo, el objetivo y una descripción mínima, llama a la herramienta "crear_reporte".
3. Tras registrarlo, confirma al usuario que el reporte fue enviado y que el equipo lo revisará. Agradece el aviso.
No pidas datos personales sensibles innecesarios. No prometas resultados ni plazos exactos.`;

// ─── Tool: registrar un reporte ───
const REPORT_TOOL = {
  name: 'crear_reporte',
  description:
    'Registra un reporte de un perfil sospechoso, fraude/estafa o spam de un usuario en MercadoRD. ' +
    'Úsala SOLO cuando ya tengas el tipo de reporte, a quién/qué se reporta y una descripción de lo ocurrido.',
  input_schema: {
    type: 'object',
    properties: {
      tipo: {
        type: 'string',
        enum: ['fraude', 'spam', 'sospechoso', 'otro'],
        description: 'Categoría del reporte.',
      },
      objetivo: {
        type: 'string',
        description: 'A quién o qué se reporta: nombre del perfil/vendedor, enlace o anuncio.',
      },
      descripcion: {
        type: 'string',
        description: 'Qué ocurrió, con el detalle que dio el usuario.',
      },
    },
    required: ['tipo', 'objetivo', 'descripcion'],
  },
};

const TIPOS = ['fraude', 'spam', 'sospechoso', 'otro'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    // El widget enseña este mensaje hasta que configures la API key.
    return json(
      { reply: 'El asistente todavía no está configurado. Vuelve pronto 🙏', notConfigured: true },
      503,
    );
  }

  // ─── Auth opcional: asociar el reporte al usuario si hay sesión ───
  let userId: string | null = null;
  let userEmail: string | null = null;
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (jwt) {
    try {
      const { data: { user } } = await admin.auth.getUser(jwt);
      if (user) { userId = user.id; userEmail = user.email ?? null; }
    } catch (_) { /* anónimo */ }
  }

  // ─── Historial entrante (saneado) ───
  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: any[] = raw
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!messages.length) return json({ error: 'Mensaje vacío' }, 400);

  const client = new Anthropic({ apiKey });
  let reportFiled = false;

  try {
    // Bucle de tool-use (máx. 4 vueltas como tope de seguridad).
    for (let i = 0; i < 4; i++) {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        tools: [REPORT_TOOL as any],
        thinking: { type: 'disabled' },
        output_config: { effort: 'low' },
        messages,
      } as any);

      if (resp.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: resp.content });
        const results: any[] = [];
        for (const block of resp.content as any[]) {
          if (block.type === 'tool_use' && block.name === 'crear_reporte') {
            const inp = block.input || {};
            let ok = false;
            try {
              const { error } = await admin.from('reports').insert({
                reporter_id: userId,
                reporter_email: userEmail,
                target: String(inp.objetivo || '').slice(0, 300) || '(no especificado)',
                report_type: TIPOS.includes(inp.tipo) ? inp.tipo : 'otro',
                description: String(inp.descripcion || '').slice(0, 4000) || '(sin detalle)',
                context: messages
                  .filter((m) => m.role === 'user' && typeof m.content === 'string')
                  .slice(-3)
                  .map((m) => m.content)
                  .join('\n---\n')
                  .slice(0, 2000),
                source: 'chatbot',
              });
              ok = !error;
              if (error) console.error('insert report error:', error);
            } catch (e) {
              console.error('insert report exception:', e);
            }
            reportFiled = reportFiled || ok;
            results.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: ok
                ? 'Reporte registrado correctamente. El equipo de MercadoRD lo revisará.'
                : 'No se pudo registrar el reporte por un error técnico. Pide disculpas al usuario y sugiere reintentar.',
              is_error: !ok,
            });
          }
        }
        messages.push({ role: 'user', content: results });
        continue; // que el modelo redacte la confirmación
      }

      // Respuesta final
      const text = (resp.content as any[])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      return json({ reply: text || 'Disculpa, no pude generar una respuesta. ¿Puedes reformular?', reportFiled });
    }

    return json({ reply: 'La conversación se hizo muy larga. Intenta de nuevo, por favor.', reportFiled });
  } catch (e) {
    console.error('chatbot error:', e);
    return json({ reply: 'Tuve un problema técnico al responder. Intenta de nuevo en un momento 🙏', error: true }, 502);
  }
});
