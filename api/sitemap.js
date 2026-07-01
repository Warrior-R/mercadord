// ════════════════════════════════════════════════════════════════════
//  MercadoRD — sitemap.xml dinámico (Vercel Serverless)
//  Home + secciones públicas + una URL por anuncio (tabla products).
//  Servido en /sitemap.xml vía rewrite en vercel.json. robots.txt lo referencia.
// ════════════════════════════════════════════════════════════════════
const SB_URL = 'https://flsixfuzvbapwnfepmwr.supabase.co';
const SB_KEY = 'sb_publishable_zf5bkvNdhlr1AJQNrd8vcA_aCIe2NDH';
const BASE = 'https://mercadord.net';
const CATS = ['electronica', 'vehiculos', 'moda', 'hogar', 'deportes', 'servicios', 'agropecuario'];

function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'anuncio';
}
function xesc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
}

module.exports = async (req, res) => {
  const urls = [];
  const add = (loc, changefreq, priority, lastmod) => urls.push({ loc, changefreq, priority, lastmod });
  add(`${BASE}/`, 'daily', '1.0');
  add(`${BASE}/subastas`, 'hourly', '0.8');
  CATS.forEach((c) => add(`${BASE}/categoria/${c}`, 'daily', '0.7'));

  try {
    const r = await fetch(`${SB_URL}/rest/v1/products?select=id,title,created_at&order=created_at.desc&limit=5000`,
      { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } });
    const rows = await r.json();
    if (Array.isArray(rows)) {
      rows.forEach((p) => {
        if (!p || !p.id) return;
        const lm = p.created_at ? String(p.created_at).slice(0, 10) : undefined;
        add(`${BASE}/producto/${slugify(p.title)}-${p.id}`, 'weekly', '0.6', lm);
      });
    }
  } catch (e) { /* sitemap con solo las secciones estáticas si falla la BD */ }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.map((u) =>
      `  <url><loc>${xesc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
    ).join('\n')
    + `\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.statusCode = 200;
  res.end(body);
};
