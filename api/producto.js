// ════════════════════════════════════════════════════════════════════
//  MercadoRD — SSR de la ficha de producto (/producto/:id)
//  Sirve el index.html REAL (para que cargue la SPA) pero con los meta tags
//  del producto inyectados en el <head>: así WhatsApp/Facebook muestran la
//  foto/título/precio y Google indexa cada anuncio. Vercel Serverless (Node).
// ════════════════════════════════════════════════════════════════════
const SB_URL = 'https://flsixfuzvbapwnfepmwr.supabase.co';
const SB_KEY = 'sb_publishable_zf5bkvNdhlr1AJQNrd8vcA_aCIe2NDH'; // anon/publishable: pública por diseño

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function attr(s) { return esc(s).replace(/\s+/g, ' ').trim(); }

async function getProduct(id) {
  if (!UUID.test(id)) return null;
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/products?id=eq.${id}&select=id,title,description,price,old_price,category,condition,location,seller_name,image_url&limit=1`,
      { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    const rows = await r.json();
    return Array.isArray(rows) && rows[0] ? rows[0] : null;
  } catch (e) { return null; }
}

// Reemplaza el content de un <meta> por property/name; si no existe, lo inyecta.
function setMeta(html, kind, key, value) {
  const re = new RegExp(`(<meta ${kind}="${key.replace(/[:]/g, '\\$&')}" content=")[^"]*(">)`, 'i');
  if (re.test(html)) return html.replace(re, `$1${attr(value)}$2`);
  return html.replace('</head>', `<meta ${kind}="${key}" content="${attr(value)}">\n</head>`);
}

module.exports = async (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'mercadord.net';
  const id = String((req.query && req.query.id) || '');
  const p = await getProduct(id);

  // Plantilla = index.html real (para cargar la SPA completa)
  let html;
  try {
    const r = await fetch(`https://${host}/index.html`, { headers: { 'user-agent': 'mrd-ssr' } });
    html = await r.text();
  } catch (e) { res.statusCode = 500; return res.end('Error'); }

  if (p) {
    const price = p.price != null ? `RD$${Number(p.price).toLocaleString('es-DO')}` : '';
    const titleTag = `${p.title}${price ? ` — ${price}` : ''} | MercadoRD`;
    const ogTitle = `${p.title}${price ? ` — ${price}` : ''}`;
    const desc = (p.description && p.description.trim())
      || `${p.title} en venta en MercadoRD${p.location ? ` (${p.location})` : ''}. Contacta al vendedor por WhatsApp.`;
    const url = `https://${host}/producto/${p.id}`;
    const img = (p.image_url && /^https?:\/\//.test(p.image_url))
      ? p.image_url
      : `https://${host}/api/img?id=${p.id}`;

    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(titleTag)}</title>`);
    html = setMeta(html, 'name', 'description', desc);
    html = setMeta(html, 'property', 'og:title', ogTitle);
    html = setMeta(html, 'property', 'og:description', desc);
    html = setMeta(html, 'property', 'og:url', url);
    html = setMeta(html, 'property', 'og:type', 'product');
    html = setMeta(html, 'property', 'og:image', img);
    html = setMeta(html, 'name', 'twitter:title', ogTitle);
    html = setMeta(html, 'name', 'twitter:description', desc);
    html = setMeta(html, 'name', 'twitter:image', img);

    const ld = {
      '@context': 'https://schema.org', '@type': 'Product',
      name: p.title, description: desc, image: img, category: p.category || undefined,
      itemCondition: p.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      offers: { '@type': 'Offer', price: p.price, priceCurrency: 'DOP', availability: 'https://schema.org/InStock', url },
    };
    html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n</head>`);
  } else {
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>Anuncio no encontrado | MercadoRD</title>`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600');
  res.statusCode = 200;
  res.end(html);
};
