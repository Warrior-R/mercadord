// ════════════════════════════════════════════════════════════════════
//  MercadoRD — imagen del producto para vista previa social (/api/img?id=UUID)
//  La foto se guarda como dataURL base64 en products.image_url; aquí se decodifica
//  y se devuelve como imagen real para que WhatsApp/Facebook la muestren.
//  Si es una URL de Supabase Storage se redirige; cualquier otra URL externa o
//  ausencia de foto cae al og-image por defecto (evita open redirect vía image_url).
// ════════════════════════════════════════════════════════════════════
const SB_URL = 'https://flsixfuzvbapwnfepmwr.supabase.co';
const SB_KEY = 'sb_publishable_zf5bkvNdhlr1AJQNrd8vcA_aCIe2NDH';
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || '');
  const fallback = () => { res.statusCode = 302; res.setHeader('Location', '/og-image.svg'); res.end(); };
  if (!UUID.test(id)) return fallback();

  let img = '';
  try {
    const r = await fetch(`${SB_URL}/rest/v1/products?id=eq.${id}&select=image_url&limit=1`,
      { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    const rows = await r.json();
    img = (rows && rows[0] && rows[0].image_url) || '';
  } catch (e) { /* fallback */ }

  const m = img.match(/^data:(image\/[a-z0-9+.\-]+);base64,(.+)$/i);
  if (m) {
    const buf = Buffer.from(m[2], 'base64');
    res.setHeader('Content-Type', m[1]);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.statusCode = 200;
    return res.end(buf);
  }
  // Redirigir SOLO a almacenamiento propio (Supabase Storage); no a URLs externas arbitrarias.
  if (/^https:\/\/[a-z0-9-]+\.supabase\.co\//i.test(img)) { res.statusCode = 302; res.setHeader('Location', img); return res.end(); }
  return fallback();
};
