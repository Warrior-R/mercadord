// ════════════════════════════════════════════════════════════════════
//  MercadoRD — SSR de la ficha de producto (/producto/:slug-:id)
//  Sirve el index.html REAL (para que cargue la SPA) pero con los meta tags
//  del producto inyectados en el <head>: así WhatsApp/Facebook muestran la
//  foto/título/precio, Google indexa cada anuncio y el canonical apunta a la
//  ficha (no a la home). Vercel Serverless (Node).
//  Seguridad: el Host se valida contra una whitelist antes de usarlo para
//  re-fetchear la plantilla y reflejarlo en las URLs (evita SSRF/cache poison).
// ════════════════════════════════════════════════════════════════════
const SB_URL = 'https://flsixfuzvbapwnfepmwr.supabase.co';
const SB_KEY = 'sb_publishable_zf5bkvNdhlr1AJQNrd8vcA_aCIe2NDH'; // anon/publishable: pública por diseño

const UUID = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
const UUID_END = /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const ALLOWED_HOSTS = new Set(['mercadord.net', 'www.mercadord.net']);
const CAT_SLUG = { electronics:'electronica', vehicles:'vehiculos', fashion:'moda', home2:'hogar', sports:'deportes', services:'servicios', agro:'agropecuario' };
const CAT_NAME = { electronics:'Electrónica', vehicles:'Vehículos', fashion:'Moda', home2:'Hogar', sports:'Deportes', services:'Servicios', agro:'Agropecuario' };

// Solo hosts propios: cualquier otro Host/X-Forwarded-Host cae al dominio canónico.
function safeHost(h) {
  h = String(h || '').toLowerCase().split(':')[0];
  return (ALLOWED_HOSTS.has(h) || /\.vercel\.app$/.test(h)) ? h : 'mercadord.net';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function attr(s) { return esc(s).replace(/\s+/g, ' ').trim(); }
function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'anuncio';
}

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
  const host = safeHost(req.headers['x-forwarded-host'] || req.headers.host);
  // El id puede venir como "slug-uuid" o como uuid pelado: extraemos el UUID final.
  const raw = String((req.query && req.query.id) || '');
  const um = raw.match(UUID_END);
  const id = um ? um[1] : raw;
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
    const slug = slugify(p.title);
    const url = `https://${host}/producto/${slug}-${p.id}`;
    const img = (p.image_url && /^https?:\/\//.test(p.image_url))
      ? p.image_url
      : `https://${host}/api/img?id=${p.id}`;

    html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(titleTag)}</title>`);
    // Canonical propio de la ficha (antes heredaba el de la home)
    html = html.replace(/<link rel="canonical"[^>]*>/i, `<link rel="canonical" href="${attr(url)}">`);
    html = setMeta(html, 'name', 'description', desc);
    html = setMeta(html, 'property', 'og:title', ogTitle);
    html = setMeta(html, 'property', 'og:description', desc);
    html = setMeta(html, 'property', 'og:url', url);
    html = setMeta(html, 'property', 'og:type', 'product');
    html = setMeta(html, 'property', 'og:image', img);
    html = setMeta(html, 'name', 'twitter:title', ogTitle);
    html = setMeta(html, 'name', 'twitter:description', desc);
    html = setMeta(html, 'name', 'twitter:image', img);

    const validUntil = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);
    const ld = {
      '@context': 'https://schema.org', '@type': 'Product',
      name: p.title, description: desc, image: img,
      category: CAT_NAME[p.category] || p.category || undefined,
      itemCondition: p.condition === 'new' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      offers: {
        '@type': 'Offer', price: p.price, priceCurrency: 'DOP',
        availability: 'https://schema.org/InStock', url, priceValidUntil: validUntil,
        seller: p.seller_name ? { '@type': 'Person', name: p.seller_name } : undefined,
      },
    };
    // Migas de pan: Inicio > Categoría > Producto
    const crumbs = [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: `https://${host}/` }];
    if (CAT_NAME[p.category]) {
      crumbs.push({ '@type': 'ListItem', position: 2, name: CAT_NAME[p.category], item: `https://${host}/categoria/${CAT_SLUG[p.category]}` });
    }
    crumbs.push({ '@type': 'ListItem', position: crumbs.length + 1, name: p.title, item: url });
    const bc = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs };

    const jsonld = `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`
      + `<script type="application/ld+json">${JSON.stringify(bc).replace(/</g, '\\u003c')}</script>\n</head>`;
    html = html.replace('</head>', jsonld);
  } else {
    html = html.replace(/<title>[^<]*<\/title>/i, `<title>Anuncio no encontrado | MercadoRD</title>`);
    html = html.replace(/(<meta name="robots" content=")[^"]*(">)/i, '$1noindex$2');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600');
  res.statusCode = p ? 200 : 404;   // 404 real si el anuncio no existe (mejor SEO que un 200)
  res.end(html);
};
