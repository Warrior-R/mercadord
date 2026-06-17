// ═══════════════════════════════════════════════════
//  MercadoRD — Lógica principal de la aplicación
//  Archivo: js/app.js  (v2 — persistencia + checkout + publicar)
// ═══════════════════════════════════════════════════

// ─── Estado (restaurado desde localStorage) ───
let cart  = MRD.get(K.CART, []);
let favs  = new Set(MRD.get(K.FAVS, []));
let pmax  = 200000;
let acat  = 'all';
let stxt  = '';
let cview = 'home';
let sortMode = 'relevance';
let fconds = new Set();   // filtro condición (vacío = todas)
let flocs  = new Set();   // filtro ubicación (vacío = todas)

let userProducts = MRD.get(K.PRODUCTS, []);
userProducts.forEach(p => { if (!products.find(x => x.id === p.id)) products.push(p); });

let orders = MRD.get(K.ORDERS, []);

// ─── Estado de subastas: pujas y hora de cierre persisten entre recargas ───
// Las subastas publicadas por el usuario se guardan como objetos completos
MRD.get('mrd_user_auctions', []).forEach(a => {
  if (!auctions.find(x => x.id === a.id)) auctions.push(a);
});
const aucSaved = MRD.get('mrd_auctions', {});
auctions.forEach(a => {
  const s = aucSaved[a.id];
  if (s) Object.assign(a, s);
  if (!a.endAt) a.endAt = Date.now() + (a.endsMin || 4320) * 60000;
});
function saveAuctions() {
  const o = {};
  const mine = [];
  auctions.forEach(a => {
    o[a.id] = { cur: a.cur, bids: a.bids, endAt: a.endAt, myBid: !!a.myBid, sold: !!a.sold };
    if (a.mine) mine.push(a);
  });
  MRD.set('mrd_auctions', o);
  MRD.set('mrd_user_auctions', mine);
}
saveAuctions();

let userState = MRD.get(K.USERSTATE, {
  loggedIn: false,
  verified: false,
  verificationStatus: 'none' // 'none' | 'pending' | 'verified' | 'rejected'
});

function saveCart()      { MRD.set(K.CART, cart); }
function saveFavs()      { MRD.set(K.FAVS, [...favs]); }
function saveOrders()    { MRD.set(K.ORDERS, orders); }
function saveUserState() { MRD.set(K.USERSTATE, userState); }
function saveUserProducts() { MRD.set(K.PRODUCTS, userProducts); }

let verificationData = {
  docType: null, docNumber: null, fullName: null,
  docFile: null, faceCapture: null, timestamp: null
};

// ─── Utils ───
function fmt(n) { return 'RD$' + Math.round(n).toLocaleString('es-DO'); }

// Normaliza texto para búsqueda (minúsculas + sin acentos/diacríticos)
function norm(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Escapa HTML para insertar texto libre del usuario sin romper el render ni inyectar
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3200);
}

function setBNav(id) {
  document.querySelectorAll('.bnav-item').forEach(x => x.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

function prodImg(p, big) {
  if (p.img) return `<img src="${p.img}" alt="${esc(p.title)}" style="width:100%;height:100%;object-fit:cover">`;
  return p.icon;
}

// ─── Restaurar vista home ───
function restoreHome() {
  if (!document.getElementById('productArea')) {
    document.getElementById('contentArea').innerHTML = `
      <div class="tabs" id="mainTabs">
        <button class="tab active" onclick="setTab(this)">⭐ Destacados</button>
        <button class="tab" onclick="setTab(this)">🆕 Más nuevos</button>
        <button class="tab" onclick="setTab(this)">🔥 Ofertas del día</button>
        <button class="tab" onclick="setTab(this)">📍 Cerca de mí</button>
      </div>
      <div id="productArea"></div>`;
  }
  const mt = document.getElementById('mainTabs');
  if (mt) mt.style.display = '';
}

// Solo los .scat de la tarjeta "Categorías" (no toca condición/ubicación)
function catScats() {
  return document.querySelectorAll('.sidebar .scard:first-child .scat');
}

function goHome() {
  cview = 'home';
  document.getElementById('heroBanner').style.display = '';
  const cs0 = document.querySelector('.carousel-section'); if (cs0) cs0.style.display = '';
  restoreHome();
  // "Inicio" = listado limpio: reiniciar TODOS los filtros y su UI
  acat = 'all';
  stxt = '';
  fconds.clear();
  flocs.clear();
  pmax = 200000;
  const si = document.getElementById('searchInput'); if (si) si.value = '';
  catScats().forEach((x, i) => x.classList.toggle('active', i === 0));
  document.querySelectorAll('.sidebar .scard:not(:first-child) .scat').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((x, i) => x.classList.toggle('active', i === 0));
  const pr = document.querySelector('.sidebar input[type="range"]'); if (pr) pr.value = 200000;
  const po = document.getElementById('priceOut'); if (po) po.textContent = fmt(200000);
  doRender();
}

// Restaura la vista de listado (home) SIN reiniciar los filtros activos
// (categoría, condición, ubicación, precio, búsqueda). Lo usan los filtros
// para seguir funcionando aunque se activen desde el detalle u otra vista.
function showHomeListing() {
  cview = 'home';
  const hb = document.getElementById('heroBanner');
  if (hb) hb.style.display = '';
  restoreHome();
  doRender();
}

function setNav(el, cat) {
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  cview = 'home';
  acat  = cat;
  document.getElementById('heroBanner').style.display = '';
  restoreHome();
  const cats = ['all','electronics','vehicles','fashion','home2','sports','services','agro'];
  const idx = cats.indexOf(cat);
  catScats().forEach((x, i) => x.classList.toggle('active', i === idx));
  doRender();
}

function setTab(el) {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  const label = el.textContent;
  if (label.includes('nuevos'))       sortMode = 'newest';
  else if (label.includes('Ofertas')) sortMode = 'deals';
  else if (label.includes('Cerca'))   sortMode = 'near';
  else                                sortMode = 'relevance';
  renderProducts();
}

// ─── Filtros ───
function filterProducts() {
  stxt = document.getElementById('searchInput').value;
  showHomeListing();
}

function filterCat(cat, el) {
  acat = cat;
  catScats().forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  showHomeListing();
}

function filterCond(c, el) {
  el.classList.toggle('active');
  fconds.has(c) ? fconds.delete(c) : fconds.add(c);
  showHomeListing();
}

function filterLoc(l, el) {
  el.classList.toggle('active');
  flocs.has(l) ? flocs.delete(l) : flocs.add(l);
  showHomeListing();
}

function filterPrice(v) {
  pmax = parseInt(v);
  document.getElementById('priceOut').textContent = fmt(parseInt(v));
  showHomeListing();
}

function setSort(sel) {
  const map = { 'Relevancia':'relevance', 'Menor precio':'priceAsc', 'Mayor precio':'priceDesc', 'Mejor calificados':'rating' };
  sortMode = map[sel.value] || 'relevance';
  doRender();
}

// ─── Render productos ───
function renderProducts() {
  if (cview !== 'home') { cview = 'home'; goHome(); return; }
  doRender();
}

function doRender() {
  const area = document.getElementById('productArea');
  if (!area) return;

  const q = norm(stxt);
  let fp = products.filter(p => {
    const mc = acat === 'all' || p.cat === acat;
    const mp = p.price <= pmax;
    const ms = !q || norm(p.title).includes(q) || norm(p.seller).includes(q);
    const md = !fconds.size || fconds.has(p.cond);
    const ml = !flocs.size  || flocs.has(p.loc);
    return mc && mp && ms && md && ml;
  });

  // Ordenamiento
  if (sortMode === 'priceAsc')  fp = [...fp].sort((a,b) => a.price - b.price);
  if (sortMode === 'priceDesc') fp = [...fp].sort((a,b) => b.price - a.price);
  if (sortMode === 'rating')    fp = [...fp].sort((a,b) => b.rating - a.rating);
  if (sortMode === 'newest')    fp = [...fp].sort((a,b) => b.id - a.id);
  if (sortMode === 'deals')     fp = [...fp].sort((a,b) => (b.old ? 1 : 0) - (a.old ? 1 : 0));
  if (sortMode === 'near')      fp = [...fp].sort((a,b) => (a.loc === 'SD' ? 0 : 1) - (b.loc === 'SD' ? 0 : 1));

  if (!fp.length) {
    area.innerHTML = '<div class="no-results"><div>🔍</div><p>No se encontraron productos.</p></div>';
    return;
  }

  const sortLabels = { relevance:'Relevancia', priceAsc:'Menor precio', priceDesc:'Mayor precio', rating:'Mejor calificados' };

  area.innerHTML = `
    <div class="section-header">
      <div class="section-title">${fp.length} producto${fp.length !== 1 ? 's' : ''}</div>
      <select class="sort-select" onchange="setSort(this)" aria-label="Ordenar productos">
        ${Object.values(sortLabels).map(l => `<option ${sortLabels[sortMode] === l ? 'selected' : ''}>${l}</option>`).join('')}
      </select>
    </div>
    <div class="products-grid">
      ${fp.map(p => `
        <div class="product-card" onclick="showDetail(${p.id})">
          <div class="product-img">
            ${p.badge === 'new'  ? '<div class="badge badge-new">NUEVO</div>' : ''}
            ${p.badge === 'hot'  ? '<div class="badge badge-hot">🔥 HOT</div>' : ''}
            ${p.badge === 'deal' ? '<div class="badge badge-deal">OFERTA</div>' : ''}
            <div class="fav-btn" onclick="event.stopPropagation();toggleFav(${p.id},this)" role="button" aria-label="Añadir a favoritos">
              ${favs.has(p.id) ? '❤️' : '♡'}
            </div>
            ${prodImg(p)}
          </div>
          <div class="product-info">
            <div class="product-title">${esc(p.title)}</div>
            <div class="product-seller">🏪 ${esc(p.seller)}</div>
            <div>
              <span class="product-price">${fmt(p.price)}</span>
              ${p.old ? `<span class="product-price-old">${fmt(p.old)}</span><span class="product-discount">-${Math.round((1 - p.price / p.old) * 100)}%</span>` : ''}
            </div>
            <div class="product-footer">
              <div class="rating">★ ${p.rating} <span style="color:var(--text2)">(${p.reviews})</span></div>
              <button class="add-cart" onclick="event.stopPropagation();addCart(${p.id})">+ Carrito</button>
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

// ─── Detalle de producto ───
function showDetail(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  cview = 'detail';
  const mt = document.getElementById('mainTabs');
  if (mt) mt.style.display = 'none';
  document.getElementById('heroBanner').style.display = 'none';

  const condLabel = p.cond === 'new' ? '✨ Nuevo' : p.cond === 'used' ? '♻️ Usado' : '🔧 Reacondicionado';
  const catLabel  = { electronics:'Electrónica', vehicles:'Vehículos', fashion:'Moda', home2:'Hogar', sports:'Deportes', services:'Servicios', agro:'Agropecuario' }[p.cat] || 'General';
  const locLabel  = { SD:'Santo Domingo', STI:'Santiago', PP:'Puerto Plata', LR:'La Romana', PC:'Punta Cana' }[p.loc] || p.loc;
  const rr = Math.round(p.rating || 0);
  const stars = '★★★★★☆☆☆☆☆'.slice(5 - rr, 10 - rr);
  const reviews = genReviews(p);

  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="backProd()">← Volver</button>
    <div class="detail-panel">
      <div class="detail-img-area" style="overflow:hidden">${prodImg(p, true)}</div>
      <div class="detail-title">${esc(p.title)}</div>
      <div style="display:flex;align-items:center;gap:8px;margin:2px 0 6px">
        <span style="color:var(--accent2)">${stars}</span>
        <span style="font-size:12px;color:var(--text2)">${p.rating || '—'} · ${p.reviews} reseña${p.reviews === 1 ? '' : 's'}</span>
      </div>
      <div>
        <span class="detail-price">${fmt(p.price)}</span>
        ${p.old ? `<span style="font-size:14px;color:var(--text2);text-decoration:line-through;margin-left:8px">${fmt(p.old)}</span><span class="product-discount" style="margin-left:6px">-${Math.round((1 - p.price / p.old) * 100)}%</span>` : ''}
      </div>
      <div class="detail-meta">
        <span>📍 ${locLabel}</span>
        <span>📦 ${condLabel}</span>
        <span>🚚 Envío a todo RD · RD$350</span>
        <span>🔄 Devolución 15 días</span>
        <span>🔒 Compra protegida</span>
      </div>

      <div class="detail-buybox">
        <div class="qty-stepper">
          <span style="font-size:13px;color:var(--text2)">Cantidad</span>
          <button type="button" onclick="detQtyStep(-1)" aria-label="Restar">−</button>
          <input type="number" id="detQty" value="1" min="1" max="99" inputmode="numeric">
          <button type="button" onclick="detQtyStep(1)" aria-label="Sumar">+</button>
        </div>
        <div class="detail-actions">
          <button class="btn-buy"   onclick="buyNowN(${p.id})">Comprar ahora</button>
          <button class="btn-cart2" onclick="addCartN(${p.id})">Añadir al carrito</button>
          <button class="btn-cart2" onclick="tryOffer(${p.id})" style="border-color:var(--primary);color:var(--primary)">💰 Hacer oferta</button>
          <button class="btn-fav2"  onclick="toggleFav(${p.id},this)" aria-label="Favorito">${favs.has(p.id) ? '❤️' : '♡'}</button>
        </div>
      </div>

      <div class="detail-desc">
        ${esc(p.desc || 'Producto disponible para entrega en todo el país. Garantía incluida. Acepta tarjeta y efectivo contra entrega.')}
      </div>

      <h3 class="co-sec">📋 Características del artículo</h3>
      <div class="spec-table">
        <div class="spec-row"><span>Condición</span><strong>${condLabel}</strong></div>
        <div class="spec-row"><span>Categoría</span><strong>${catLabel}</strong></div>
        <div class="spec-row"><span>Ubicación</span><strong>${locLabel}</strong></div>
        <div class="spec-row"><span>Disponibilidad</span><strong>En stock</strong></div>
        <div class="spec-row"><span>Vendedor</span><strong>${esc(p.seller)}</strong></div>
      </div>

      <div class="seller-card">
        <div class="seller-avatar">${esc(p.seller[0])}</div>
        <div>
          <div style="font-size:14px;font-weight:600">${esc(p.seller)}</div>
          <div style="font-size:12px;color:var(--text2)">⭐ ${p.rating || '—'} · ${p.mine ? 'Tu anuncio' : 'Vendedor verificado ✓'}</div>
        </div>
        <button style="margin-left:auto;padding:7px 14px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:13px;font-family:'Sora',sans-serif"
                onclick="contactSellerById(${p.id})">💬 Contactar</button>
      </div>

      ${reviews.length ? `
      <h3 class="co-sec">⭐ Reseñas de compradores</h3>
      <div class="rev-summary">
        <div class="rev-big">${(p.rating || 0).toFixed(1)}</div>
        <div>
          <div style="color:var(--accent2);font-size:16px">${stars}</div>
          <div style="font-size:12px;color:var(--text2)">Basado en ${p.reviews} reseña${p.reviews === 1 ? '' : 's'}</div>
        </div>
      </div>
      <div class="rev-list">
        ${reviews.map(r => `
          <div class="rev-card">
            <div class="rev-head"><span class="rev-name">${esc(r.name)}</span><span style="color:var(--accent2)">${'★'.repeat(r.stars)}</span></div>
            <div class="rev-text">${esc(r.text)}</div>
            <div class="rev-when">${r.when}</div>
          </div>`).join('')}
      </div>` : ''}
    </div>`;
  window.scrollTo(0, 0);
}

// Reseñas de muestra deterministas (derivadas del id, no aleatorias)
function genReviews(p) {
  if (!p.reviews) return [];
  const names = ['José M.','María P.','Carlos R.','Ana G.','Luis F.','Rosa V.','Pedro S.','Laura D.'];
  const texts = ['Llegó rápido y tal como se describe. Recomendado 👍','Buen producto y el vendedor muy atento.','Excelente relación precio-calidad.','Todo perfecto, volvería a comprar.','Justo lo que buscaba, bien empacado.'];
  const whens = ['hace 3 días','hace 1 semana','hace 2 semanas','el mes pasado'];
  const n = Math.min(3, 1 + (p.id % 3));
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = p.id + i * 3;
    out.push({ name: names[k % names.length], text: texts[k % texts.length], when: whens[k % whens.length], stars: p.rating >= 4.5 ? 5 : 4 });
  }
  return out;
}

// Cantidad en el detalle
function detQtyStep(d) {
  const el = document.getElementById('detQty');
  if (!el) return;
  el.value = Math.min(99, Math.max(1, (parseInt(el.value || '1', 10) || 1) + d));
}
function detQty() {
  return Math.min(99, Math.max(1, parseInt(document.getElementById('detQty')?.value || '1', 10) || 1));
}
function addCartN(id) {
  const q = detQty();
  for (let i = 0; i < q; i++) addCart(id, i < q - 1);
}
function buyNowN(id) {
  const q = detQty();
  for (let i = 0; i < q; i++) addCart(id, true);
  requireAuth('checkout');
}

function backProd() {
  cview = 'home';
  restoreHome();
  renderProducts();
}

// ─── Vistas ───
function showView(v) {
  if (v === 'bid') v = 'auctions';
  cview = v;
  document.getElementById('heroBanner').style.display = 'none';
  const csv = document.querySelector('.carousel-section'); if (csv) csv.style.display = '';
  closeSubsection();

  if (v === 'auctions') {
    renderAuctions();

  } else if (v === 'sell') {
    renderSellForm();

  } else if (v === 'checkout') {
    renderCheckout();

  } else if (v === 'orders') {
    renderOrders();

  } else if (v === 'myads') {
    renderMyAds();

  } else if (v === 'account') {
    renderAccount();

  } else if (v === 'favs') {
    renderFavs();

  } else if (v === 'seller') {
    renderSeller();

  } else if (v === 'addresses') {
    renderAddresses();

  } else if (v === 'settings') {
    renderSettings();

  } else if (v === 'notifs') {
    renderNotifPrefs();

  } else if (v === 'security') {
    renderSecurity();

  } else if (v === 'messages' || v === 'chat') {
    cview = 'messages';
    // Si veníamos de "Contactar" sin sesión, reanudar abriendo el hilo del vendedor
    if (pendingContact != null) { const pc = pendingContact; pendingContact = null; contactSellerById(pc); }
    else renderMessages();
  }
}

// ══════════════════════════════════════════════════
// SUBASTAS (pujas reales, ¡Cómpralo ya! y cuenta regresiva — estilo eBay)
// ══════════════════════════════════════════════════
function aucLeft(a) {
  const ms = a.endAt - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}min`;
  if (m) return `${m}min ${s % 60}s`;
  return `${s}s`;
}

// Incremento mínimo de puja: 2% redondeado a centenas (mínimo RD$500)
function bidStep(a) {
  return Math.max(500, Math.round(a.cur * 0.02 / 100) * 100);
}

let aucTimer = null;

function isLiveAuction(a) {
  return a.status !== 'ended' && a.status !== 'sold' && !!aucLeft(a);
}

function renderAuctions() {
  clearInterval(aucTimer);
  const live = auctions.filter(isLiveAuction);
  const cards = live.map(a => {
    const left = aucLeft(a);
    return `
      <div class="auction-card" onclick="openAuctionById('${a.id}')" style="cursor:pointer">
        <div class="auction-img">${a.icon}</div>
        <div class="auction-info">
          <div class="auction-title">${esc(a.title)} ${a.myBid ? '<span style="font-size:11px;background:#e6f4ea;color:var(--green,#0a8a4a);padding:2px 8px;border-radius:10px;font-weight:600">🏆 Vas ganando</span>' : ''}</div>
          <div class="auction-meta">📍 ${esc(a.loc)} · <strong>${esc(a.seller)}</strong></div>
          <div class="auction-bids">👥 <span class="auc-bids" data-id="${a.id}">${a.bids}</span> pujas · ⏰ <strong style="color:var(--accent)" class="auc-count" data-id="${a.id}">${left}</strong><span class="auc-leader" data-id="${a.id}">${a.leader && !a.mine && !a.myBid ? ` · 🏆 <b style="color:var(--green,#0a8a4a)">${esc(a.leader)}</b> va ganando` : ''}</span></div>
          <div class="auction-price-row">
            <div>
              <div style="font-size:11px;color:var(--text2)">Puja actual</div>
              <div class="auction-price auc-cur" data-id="${a.id}">${fmt(a.cur)}</div>
            </div>
            ${a.mine
              ? '<span style="font-size:12px;color:var(--text2);font-weight:600">🏷️ Tu subasta</span>'
              : `
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end" onclick="event.stopPropagation()">
              ${a.buy ? `<button class="bid-btn" style="background:var(--primary)" onclick="tryBuyNow('${a.id}')">⚡ ¡Cómpralo ya! ${fmt(a.buy)}</button>` : ''}
              <button class="bid-btn" onclick="tryBid('${a.id}')">Pujar →</button>
            </div>`}
          </div>
        </div>
      </div>`;
  }).join('');
  document.getElementById('contentArea').innerHTML = `
    <div class="section-header" style="margin-bottom:18px">
      <div class="section-title">🔥 Subastas Activas en RD</div>
      <button onclick="requireAuth('sell')"
        style="background:var(--accent);color:#fff;border:none;padding:7px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
        + Subastar producto
      </button>
    </div>
    ${live.length ? cards : '<div class="no-results"><div>🔥</div><p>No hay subastas activas en este momento. Las subastas finalizadas ya no son públicas. ¡Vuelve pronto o publica la tuya!</p></div>'}`;
  aucTimer = setInterval(tickAuctions, 1000);
}

function tickAuctions() {
  if (cview !== 'auctions') { clearInterval(aucTimer); return; }
  let expired = false;
  document.querySelectorAll('.auc-count').forEach(el => {
    const a = auctions.find(x => x.id == el.dataset.id);
    if (!a) return;
    const left = aucLeft(a);
    if (left) el.textContent = left;
    else if (!/Finalizada|Comprado/.test(el.textContent)) expired = true;
  });
  if (expired) renderAuctions();
}

// ─── Pujar ───
let bidAucId = null;

function tryBid(id) {
  if (!user) {
    pending = 'auctions';
    openAuth('login');
    showAlert('info', 'Inicia sesión para pujar en subastas.');
    return;
  }
  if (!userState.verified) {
    showToast('🪪 Verifica tu identidad para pujar');
    openVerification('bid');
    return;
  }
  openBid(id);
}

function openBid(id) {
  const a = auctions.find(x => x.id == id);
  if (!a) return;
  if (!aucLeft(a)) { showToast('Esta subasta ya finalizó'); renderAuctions(); return; }
  bidAucId = a.id;
  const min = a.cur + bidStep(a);
  document.getElementById('bidItemTitle').textContent = `${a.icon} ${a.title}`;
  document.getElementById('bidCur').textContent   = fmt(a.cur);
  document.getElementById('bidCount').textContent = a.bids;
  document.getElementById('bidEnds').textContent  = aucLeft(a) || 'Finalizada';
  document.getElementById('bidMin').textContent   = fmt(min);
  const inp = document.getElementById('bidAmount');
  inp.value = min;
  inp.min = min;
  inp.step = bidStep(a);
  fe('bidErr', '');
  document.getElementById('bidOverlay').style.display = 'flex';
  loadBidFeed(a.id);
  startBidModalTimer();
}

let bidModalTimer = null;
function startBidModalTimer() {
  stopBidModalTimer();
  bidModalTimer = setInterval(() => {
    const ov = document.getElementById('bidOverlay');
    const a  = auctions.find(x => x.id == bidAucId);
    if (!ov || ov.style.display !== 'flex' || !a) { stopBidModalTimer(); return; }
    const left = aucLeft(a);
    const el = document.getElementById('bidEnds');
    if (el) { el.textContent = left || 'Finalizada'; el.style.color = (left && a.endAt - Date.now() < 120000) ? 'var(--red)' : 'var(--accent2)'; }
  }, 1000);
}
function stopBidModalTimer() { if (bidModalTimer) { clearInterval(bidModalTimer); bidModalTimer = null; } }

function closeBid() { document.getElementById('bidOverlay').style.display = 'none'; stopBidModalTimer(); bidAucId = null; }

async function placeBid() {
  const a = auctions.find(x => x.id == bidAucId);
  if (!a) return;
  if (!aucLeft(a)) { closeBid(); showToast('La subasta finalizó'); renderAuctions(); return; }
  const amt = parseFloat(document.getElementById('bidAmount').value);
  const min = a.cur + bidStep(a);
  if (!amt || amt < min) { fe('bidErr', 'Tu puja debe ser de al menos ' + fmt(min)); return; }

  // ── Modo real (multi-usuario): la puja se valida en el servidor (atómica) ──
  if (a.db && typeof sb !== 'undefined' && sb) {
    const btn = document.querySelector('#bidOverlay .btn-pri');
    const prevHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Pujando…'; }
    try {
      const { data, error } = await sb.rpc('place_bid', { p_auction: a.id, p_amount: Math.round(amt) });
      if (error) throw error;
      a.cur = Number(data.current_bid); a.bids = data.bid_count; a.myBid = true;
      a.endAt = new Date(data.ends_at).getTime();
      closeBid();
      renderAuctions();
      showToast(`🏆 ¡Eres el mejor postor con ${fmt(a.cur)}!`);
    } catch (e) {
      const m = String((e && e.message) || e || '');
      if (m.includes('BID_TOO_LOW')) {
        const v = parseFloat(m.split('BID_TOO_LOW:')[1]);
        await refreshAuction(a.id);
        const nm = a.cur + bidStep(a);
        document.getElementById('bidCur').textContent   = fmt(a.cur);
        document.getElementById('bidCount').textContent = a.bids;
        document.getElementById('bidMin').textContent   = fmt(nm);
        loadBidFeed(a.id);
        fe('bidErr', 'Otra persona pujó primero. Mínimo ahora: ' + fmt(isNaN(v) ? nm : v));
      } else if (m.includes('AUCTION_CLOSED')) {
        closeBid(); showToast('La subasta ya cerró'); await loadAuctionsDB();
      } else if (m.includes('OWN_AUCTION')) {
        fe('bidErr', 'No puedes pujar en tu propia subasta.');
      } else if (m.includes('AUTH_REQUIRED')) {
        closeBid(); showToast('Inicia sesión de nuevo para pujar'); openAuth('login');
      } else {
        fe('bidErr', 'No se pudo registrar la puja. Intenta otra vez.');
      }
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = prevHtml || 'Confirmar puja 🔨'; }
    }
    return;
  }

  // ── Modo demo (local) ──
  a.cur  = Math.round(amt);
  a.bids++;
  a.myBid = true;
  // Anti-sniping estilo eBay: pujar en los últimos 2 minutos extiende el cierre
  if (a.endAt - Date.now() < 120000) a.endAt = Date.now() + 120000;
  saveAuctions();
  closeBid();
  renderAuctions();
  showToast(`🏆 ¡Eres el mejor postor con ${fmt(a.cur)}!`);
}

// ─── ¡Cómpralo ya! (cierra la subasta y va al checkout) ───
async function tryBuyNow(id) {
  const a = auctions.find(x => x.id == id);
  if (!a) return;
  if (!user) {
    pending = 'auctions';
    openAuth('login');
    showAlert('info', 'Inicia sesión para usar ¡Cómpralo ya!');
    return;
  }
  if (!aucLeft(a)) { showToast('Esta subasta ya finalizó'); renderAuctions(); return; }

  // ── Modo real: cierra la subasta en el servidor y notifica a los demás ──
  if (a.db && typeof sb !== 'undefined' && sb) {
    try {
      const { data, error } = await sb.rpc('buy_now', { p_auction: a.id });
      if (error) throw error;
      a.sold = true; a.status = 'sold'; a.endAt = Date.now();
      cart.push({ id: 'auc-' + a.id, title: a.title + ' (¡Cómpralo ya!)', price: Number(data.price), icon: a.icon, img: null, qty: 1 });
      saveCart(); updateCartBadge();
      showToast('⚡ ¡Cómpralo ya! La subasta se cerró para ti');
      showView('checkout');
    } catch (e) {
      const m = String((e && e.message) || e || '');
      if (m.includes('AUCTION_CLOSED')) { showToast('Esta subasta ya cerró'); await loadAuctionsDB(); }
      else if (m.includes('AUTH_REQUIRED')) { openAuth('login'); }
      else showToast('No se pudo completar la compra');
    }
    return;
  }

  // ── Modo demo (local) ──
  a.sold = true;
  a.endAt = Date.now();
  saveAuctions();
  cart.push({ id: 90000 + (typeof a.id === 'number' ? a.id : 0), title: a.title + ' (¡Cómpralo ya!)', price: a.buy, icon: a.icon, img: null, qty: 1 });
  saveCart();
  updateCartBadge();
  showToast('⚡ ¡Cómpralo ya! La subasta se cerró para ti');
  showView('checkout');
}

// ══════════════════════════════════════════════════
// MEJOR OFERTA (negociación estilo eBay "Best Offer")
// ══════════════════════════════════════════════════
let offerProdId = null;

function tryOffer(id) {
  if (!user) {
    openAuth('login');
    showAlert('info', 'Inicia sesión para hacer una oferta al vendedor.');
    return;
  }
  openOffer(id);
}

function openOffer(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  offerProdId = id;
  document.getElementById('offerItemTitle').textContent = p.title;
  document.getElementById('offerBody').innerHTML = `
    <div style="background:#f8f9fc;border-radius:8px;padding:14px;margin-bottom:14px;font-size:13px">
      <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Precio publicado</span><strong>${fmt(p.price)}</strong></div>
      <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Vendedor</span><strong>${esc(p.seller)}</strong></div>
    </div>
    <div class="fg"><label>Tu oferta (RD$)</label><input type="number" id="offerAmount" placeholder="0" min="1"><div class="ferr" id="offerErr"></div></div>
    <button class="auth-btn btn-pri" onclick="sendOffer()">Enviar oferta 💰</button>
    <p style="font-size:11px;color:var(--text2);text-align:center;margin-top:10px">El vendedor puede aceptar, rechazar o contraofertar.</p>`;
  document.getElementById('offerOverlay').style.display = 'flex';
}

function closeOffer() { document.getElementById('offerOverlay').style.display = 'none'; }

function sendOffer() {
  const p = products.find(x => x.id === offerProdId);
  if (!p) return;
  const amt = parseFloat(document.getElementById('offerAmount').value);
  if (!amt || amt <= 0) { fe('offerErr', 'Ingresa una oferta válida.'); return; }
  const ratio = amt / p.price;
  const body  = document.getElementById('offerBody');
  // Demo: el "vendedor" responde según qué tan cerca esté la oferta del precio
  if (ratio >= 0.9) {
    addOfferToCart(p, Math.round(amt));
    body.innerHTML = `
      <div class="vc"><div class="vc-icon">🎉</div><div class="vc-title">¡Oferta aceptada!</div>
      <div class="vc-desc"><strong>${esc(p.seller)}</strong> aceptó tu oferta de <strong>${fmt(amt)}</strong>. El producto ya está en tu carrito con el precio negociado.</div></div>
      <button class="auth-btn btn-pri" onclick="closeOffer();requireAuth('checkout')">Ir al checkout →</button>
      <button class="auth-btn" style="background:#f0f3f8;color:var(--text2);margin-top:10px" onclick="closeOffer()">Seguir comprando</button>`;
  } else if (ratio >= 0.7) {
    const counter = Math.round(p.price * 0.95);
    body.innerHTML = `
      <div class="vc"><div class="vc-icon">🤝</div><div class="vc-title">Contraoferta del vendedor</div>
      <div class="vc-desc"><strong>${esc(p.seller)}</strong> no acepta ${fmt(amt)}, pero te ofrece el artículo por <strong>${fmt(counter)}</strong>.</div></div>
      <button class="auth-btn btn-pri" onclick="acceptCounter(${counter})">Aceptar ${fmt(counter)} ✓</button>
      <button class="auth-btn" style="background:#f0f3f8;color:var(--text2);margin-top:10px" onclick="openOffer(${p.id})">Hacer otra oferta</button>`;
  } else {
    body.innerHTML = `
      <div class="vc"><div class="vc-icon">😕</div><div class="vc-title">Oferta rechazada</div>
      <div class="vc-desc"><strong>${esc(p.seller)}</strong> rechazó tu oferta de ${fmt(amt)} por estar muy por debajo del precio publicado.</div></div>
      <button class="auth-btn btn-pri" onclick="openOffer(${p.id})">Intentar otra oferta</button>
      <button class="auth-btn" style="background:#f0f3f8;color:var(--text2);margin-top:10px" onclick="closeOffer()">Cerrar</button>`;
  }
}

function acceptCounter(price) {
  const p = products.find(x => x.id === offerProdId);
  if (!p) return;
  addOfferToCart(p, price);
  closeOffer();
  showToast(`🤝 Trato cerrado: ${fmt(price)} — ya está en tu carrito`);
}

function addOfferToCart(p, price) {
  cart = cart.filter(c => c.id !== p.id);
  cart.push({ id: p.id, title: p.title + ' (oferta aceptada)', price, icon: p.icon, img: p.img || null, qty: 1 });
  saveCart();
  updateCartBadge();
}

// ══════════════════════════════════════════════════
// FAVORITOS (watchlist estilo eBay)
// ══════════════════════════════════════════════════
function renderFavs() {
  const list = products.filter(p => favs.has(p.id));
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="goHome()">← Volver</button>
    <div class="section-header" style="margin-bottom:14px">
      <div class="section-title">❤️ Mis favoritos (${list.length})</div>
    </div>
    ${!list.length
      ? '<div class="no-results"><div>❤️</div><p>Aún no tienes favoritos. Toca el corazón ♡ de cualquier producto para guardarlo aquí.</p></div>'
      : `<div class="products-grid">
          ${list.map(p => `
          <div class="product-card" onclick="showDetail(${p.id})">
            <div class="product-img">
              <div class="fav-btn" onclick="event.stopPropagation();toggleFav(${p.id},this);renderFavs()" role="button" aria-label="Quitar de favoritos">❤️</div>
              ${prodImg(p)}
            </div>
            <div class="product-info">
              <div class="product-title">${esc(p.title)}</div>
              <div class="product-seller">🏪 ${esc(p.seller)}</div>
              <div>
                <span class="product-price">${fmt(p.price)}</span>
                ${p.old ? `<span class="product-price-old">${fmt(p.old)}</span>` : ''}
              </div>
              <div class="product-footer">
                <div class="rating">★ ${p.rating} <span style="color:var(--text2)">(${p.reviews})</span></div>
                <button class="add-cart" onclick="event.stopPropagation();addCart(${p.id})">+ Carrito</button>
              </div>
            </div>
          </div>`).join('')}
        </div>`}`;
}

// ══════════════════════════════════════════════════
// SELLER CENTER (panel del vendedor)
// ══════════════════════════════════════════════════
function renderSeller() {
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Vendedor';
  const totalVal = userProducts.reduce((s, p) => s + p.price, 0);
  const views = userProducts.length * 47 + 12; // demo: métricas simuladas
  document.getElementById('contentArea').innerHTML = `
    <div class="account-panel">
      <div class="section-header" style="margin-bottom:16px">
        <div class="section-title">📊 Seller Center</div>
        <button onclick="requireAuth('sell')" style="background:var(--accent);color:#fff;border:none;padding:7px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">+ Publicar anuncio</button>
      </div>
      <p style="font-size:13px;color:var(--text2);margin-bottom:16px">Hola <strong>${esc(name)}</strong> — ${userState.verified ? 'Vendedor verificado ✓' : 'Identidad sin verificar'}</p>
      ${!userState.verified ? `
      <div class="verification-info-box" style="margin-bottom:16px">
        🪪 <strong>Verifica tu identidad</strong> para empezar a vender.
        <span class="alink" onclick="openVerification('sell')">Verificar ahora →</span>
      </div>` : ''}
      <div class="stats-grid">
        <div class="stat-box" onclick="showView('myads')"><div style="font-size:24px;margin-bottom:4px">🏷️</div><div style="font-size:11px;color:var(--text2)">Anuncios activos</div><div style="font-size:18px;font-weight:700;color:var(--primary)">${userProducts.length}</div></div>
        <div class="stat-box"><div style="font-size:24px;margin-bottom:4px">💵</div><div style="font-size:11px;color:var(--text2)">Valor publicado</div><div style="font-size:18px;font-weight:700;color:var(--primary)">${fmt(totalVal)}</div></div>
        <div class="stat-box"><div style="font-size:24px;margin-bottom:4px">👁</div><div style="font-size:11px;color:var(--text2)">Visitas (30 días)</div><div style="font-size:18px;font-weight:700;color:var(--primary)">${views}</div></div>
      </div>
      <div class="menu-list">
        <div class="menu-item" onclick="showView('myads')"><div class="menu-item-left"><span>🏷️</span><span>Gestionar mis anuncios</span></div><span style="color:var(--text2)">›</span></div>
        <div class="menu-item" onclick="requireAuth('sell')"><div class="menu-item-left"><span>➕</span><span>Publicar nuevo anuncio</span></div><span style="color:var(--text2)">›</span></div>
        <div class="menu-item" onclick="openInfo('fees')"><div class="menu-item-left"><span>💰</span><span>Tarifas y comisiones</span></div><span style="color:var(--text2)">›</span></div>
        <div class="menu-item" onclick="openInfo('premium')"><div class="menu-item-left"><span>⭐</span><span>Hazte Vendedor Premium</span></div><span style="color:var(--text2)">›</span></div>
        <div class="menu-item" onclick="openInfo('ads')"><div class="menu-item-left"><span>📣</span><span>Crear campaña publicitaria</span></div><span style="color:var(--text2)">›</span></div>
        <div class="menu-item" onclick="openInfo('rules')"><div class="menu-item-left"><span>📋</span><span>Reglas del vendedor</span></div><span style="color:var(--text2)">›</span></div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════
// PUBLICAR ANUNCIO (funcional)
// ══════════════════════════════════════════════════
let sellImgData = null;

function renderSellForm() {
  const uname = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'usuario';
  sellImgData = null;
  document.getElementById('contentArea').innerHTML = `
    <div class="sell-form">
      <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">📦 Publicar un anuncio</h2>
      <p style="font-size:13px;color:var(--text2);margin-bottom:20px">Hola <strong>${esc(uname)}</strong> — ${userState.verified ? 'Cuenta verificada ✓' : 'Verificación pendiente ⏳'}</p>
      <form id="sellForm" onsubmit="event.preventDefault();publishProduct()">
        <div class="form-grid">
          <div class="fg2"><label for="sellTitle">Título *</label><input type="text" id="sellTitle" placeholder="Describe tu producto" maxlength="80" required></div>
          <div class="fg2"><label for="sellPrice">Precio (RD$) *</label><input type="number" id="sellPrice" placeholder="0.00" min="1" step="0.01" required></div>
          <div class="fg2"><label for="sellCat">Categoría *</label>
            <select id="sellCat" required>
              <option value="electronics">Electrónica</option><option value="vehicles">Vehículos</option>
              <option value="fashion">Moda</option><option value="home2">Hogar</option>
              <option value="sports">Deportes</option><option value="services">Servicios</option>
              <option value="agro">Agropecuario</option>
            </select>
          </div>
          <div class="fg2"><label for="sellCond">Condición *</label>
            <select id="sellCond"><option value="new">Nuevo</option><option value="used">Usado – Como nuevo</option><option value="used2">Usado – Buen estado</option><option value="refurb">Reacondicionado</option></select>
          </div>
          <div class="fg2"><label for="sellType">Tipo de anuncio</label>
            <select id="sellType"><option>Precio fijo</option><option>Subasta</option><option>Mejor oferta</option></select>
          </div>
          <div class="fg2"><label for="sellProv">Provincia</label>
            <select id="sellProv"><option value="SD">Santo Domingo</option><option value="STI">Santiago</option><option value="PP">Puerto Plata</option><option value="LR">La Romana</option><option value="PC">Punta Cana</option></select>
          </div>
        </div>
        <div class="fg2" style="margin-bottom:14px">
          <label for="sellDesc">Descripción</label>
          <textarea id="sellDesc" placeholder="Describe el producto, estado, qué incluye..." maxlength="1000"></textarea>
        </div>
        <div class="photo-area" id="sellPhotoArea" onclick="document.getElementById('sellPhotoInput').click()" tabindex="0" role="button" aria-label="Subir foto del producto (JPG, PNG o WEBP, máximo 5MB)">
          <div style="font-size:30px;margin-bottom:8px" id="sellPhotoIcon">📷</div>
          <strong id="sellPhotoLabel">Subir foto principal</strong>
          <div style="font-size:12px;margin-top:4px">JPG, PNG · 5MB máx (opcional)</div>
          <img id="sellPhotoPreview" style="display:none;max-height:140px;border-radius:8px;margin-top:10px" alt="Vista previa">
        </div>
        <input type="file" id="sellPhotoInput" accept="image/jpeg,image/png,image/webp" style="display:none" onchange="handleSellPhoto(this)">
        <button type="submit" class="submit-btn">✓ Publicar gratis</button>
      </form>
    </div>`;
}

// ══════════════════════════════════════════════════
// VALIDACIÓN SEGURA DE IMÁGENES (carga de archivos)
// Whitelist de tipo + firma real (magic bytes) + verificación de decodificación.
// Bloquea PDF/ejecutable renombrado, SVG con script, HEIC no soportado y archivos corruptos.
// ══════════════════════════════════════════════════
const ALLOWED_IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Detecta el tipo REAL por los primeros bytes (no por la extensión ni el MIME declarado)
function sniffImageType(b) {
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return null; // PDF (%PDF), ejecutable (MZ/ELF), SVG (<svg/<?xml), etc. → no es imagen permitida
}

// Valida un archivo de imagen de forma asíncrona. Devuelve {ok:true} o {ok:false, error}.
function validateImageFile(file, maxBytes) {
  return new Promise(resolve => {
    if (!file) { resolve({ ok: false, error: 'No se seleccionó ningún archivo.' }); return; }
    if (file.size > maxBytes) { resolve({ ok: false, error: `La imagen supera ${Math.round(maxBytes / 1048576)}MB.` }); return; }
    if (!ALLOWED_IMG_TYPES.includes(file.type)) { resolve({ ok: false, error: 'Formato no permitido. Usa JPG, PNG o WEBP.' }); return; }
    const fr = new FileReader();
    fr.onerror = () => resolve({ ok: false, error: 'No se pudo leer el archivo.' });
    fr.onload = () => {
      const sig = sniffImageType(new Uint8Array(fr.result));
      if (!sig || !ALLOWED_IMG_TYPES.includes(sig)) { resolve({ ok: false, error: 'El archivo no es una imagen real (firma inválida).' }); return; }
      // Confirmar que el navegador puede decodificarla (descarta corruptas)
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload  = () => { URL.revokeObjectURL(url); resolve({ ok: true }); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve({ ok: false, error: 'La imagen está dañada o no se puede abrir.' }); };
      img.src = url;
    };
    fr.readAsArrayBuffer(file.slice(0, 16));
  });
}

// Re-codifica a JPEG en un canvas: normaliza tamaño, elimina EXIF y cualquier carga útil incrustada.
function reencodeToJpeg(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale)); h = Math.max(1, Math.round(h * scale));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try { resolve(c.toDataURL('image/jpeg', quality)); } catch (e) { reject(e); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
    img.src = url;
  });
}

async function handleSellPhoto(input) {
  const file = input.files[0];
  const v = await validateImageFile(file, 5 * 1024 * 1024);
  if (!v.ok) { showToast(v.error); input.value = ''; return; }
  try {
    sellImgData = await reencodeToJpeg(file, 1280, 0.82); // re-codifica: limpia carga útil + comprime (evita reventar localStorage)
  } catch (_) { showToast('No se pudo procesar la imagen.'); input.value = ''; return; }
  const prev = document.getElementById('sellPhotoPreview');
  prev.src = sellImgData;
  prev.style.display = 'inline-block';
  document.getElementById('sellPhotoLabel').textContent = '✓ ' + file.name;
  showToast('Foto cargada ✓');
}

function publishProduct() {
  if (!userState.verified) {
    showToast('🪪 Necesitas identidad verificada para publicar');
    return;
  }
  const title = document.getElementById('sellTitle').value.trim();
  const price = parseFloat(document.getElementById('sellPrice').value);
  const cat   = document.getElementById('sellCat').value;
  const cond  = document.getElementById('sellCond').value.startsWith('used') ? 'used' : document.getElementById('sellCond').value === 'refurb' ? 'refurb' : 'new';
  const loc   = document.getElementById('sellProv').value;
  const desc  = document.getElementById('sellDesc').value.trim();

  if (title.length < 4)        { showToast('El título debe tener al menos 4 caracteres'); return; }
  if (!price || price <= 0)    { showToast('Ingresa un precio válido'); return; }

  const catIcons = { electronics:'📱', vehicles:'🚗', fashion:'👗', home2:'🏠', sports:'⚽', services:'🔧', agro:'🌿' };
  const sellerName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Vendedor';
  const adType = document.getElementById('sellType').value;

  // Tipo "Subasta": crea una subasta real de 3 días (estilo eBay)
  if (adType === 'Subasta') {
    // Modo real: la subasta vive en la BD y es visible para todos
    if (typeof sb !== 'undefined' && sb && user?.id) {
      (async () => {
        try {
          const { error } = await sb.from('auctions').insert({
            seller_id: user.id, seller_name: sellerName, title,
            icon: catIcons[cat] || '📦', location: loc,
            start_price: Math.round(price), current_bid: Math.round(price), bid_count: 0,
            buy_now_price: Math.round(price * 1.35),
            min_increment: Math.max(500, Math.round(price * 0.02 / 100) * 100),
            ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          });
          if (error) throw error;
          await loadAuctionsDB();
          showToast('¡Subasta publicada! 🔨 Precio inicial ' + fmt(price) + ' · 3 días');
          showView('auctions');
        } catch (e) { showToast('No se pudo publicar la subasta: ' + (e.message || e)); }
      })();
      return;
    }
    // Modo demo (local)
    auctions.push({
      id: Date.now(), title, icon: catIcons[cat] || '📦',
      cur: Math.round(price), bids: 0, buy: Math.round(price * 1.35),
      seller: sellerName, loc, endAt: Date.now() + 3 * 24 * 60 * 60 * 1000, mine: true
    });
    saveAuctions();
    showToast('¡Subasta publicada! 🔨 Precio inicial ' + fmt(price) + ' · 3 días');
    showView('auctions');
    return;
  }

  const np = {
    id: Date.now(),
    title, price, old: null,
    icon: catIcons[cat] || '📦',
    img: sellImgData,
    cat, cond, loc, desc,
    rating: 0, reviews: 0,
    seller: sellerName,
    badge: 'new',
    mine: true,
    createdAt: new Date().toISOString()
  };

  products.push(np);
  userProducts.push(np);
  saveUserProducts();

  showToast('¡Anuncio publicado! 🎉 Ya aparece en el listado');
  goHome();
}

function deleteAd(id) {
  userProducts = userProducts.filter(p => p.id !== id);
  const idx = products.findIndex(p => p.id === id);
  if (idx >= 0) products.splice(idx, 1);
  saveUserProducts();
  showToast('Anuncio eliminado');
  renderMyAds();
}

function renderMyAds() {
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="showView('account')">← Mi cuenta</button>
    <div class="section-header" style="margin-bottom:14px">
      <div class="section-title">🏷️ Mis anuncios (${userProducts.length})</div>
      <button onclick="requireAuth('sell')" style="background:var(--accent);color:#fff;border:none;padding:7px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">+ Publicar</button>
    </div>
    ${!userProducts.length
      ? '<div class="no-results"><div>🏷️</div><p>Aún no has publicado anuncios.</p></div>'
      : userProducts.map(p => `
        <div class="auction-card">
          <div class="auction-img" style="overflow:hidden">${prodImg(p)}</div>
          <div class="auction-info">
            <div class="auction-title">${esc(p.title)}</div>
            <div class="auction-meta">📍 ${esc(p.loc)} · Publicado ${new Date(p.createdAt || Date.now()).toLocaleDateString('es-DO')}</div>
            <div class="auction-price-row">
              <div class="auction-price">${fmt(p.price)}</div>
              <div style="display:flex;gap:8px">
                <button class="bid-btn" style="background:var(--primary)" onclick="showDetail(${p.id})">Ver</button>
                <button class="bid-btn" onclick="deleteAd(${p.id})">Eliminar</button>
              </div>
            </div>
          </div>
        </div>`).join('')}`;
}

// ══════════════════════════════════════════════════
// CHECKOUT (funcional)
// ══════════════════════════════════════════════════
function renderCheckout() {
  if (!cart.length) {
    showToast('Tu carrito está vacío');
    goHome();
    return;
  }
  const sub   = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const itbis = Math.round(sub * 0.18);
  const total = sub + 350 + itbis;

  // Prellenar con la dirección predeterminada / perfil del usuario
  const da = (typeof defaultAddress === 'function') ? defaultAddress() : null;
  const pf = (typeof getProfile === 'function') ? getProfile() : {};
  const vName  = da?.name  || pf.name || user?.user_metadata?.full_name || '';
  const vPhone = da?.phone || pf.phone || '';
  const vAddr  = da?.addr  || '';
  const selProv = da?.prov || pf.province || 'Santo Domingo';
  const provs = ['Santo Domingo','Distrito Nacional','Santiago','Puerto Plata','La Romana','La Altagracia','San Cristóbal','San Pedro de Macorís','La Vega','Otra'];

  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="goHome()">← Seguir comprando</button>
    <div class="sell-form">
      <h2 style="font-size:20px;font-weight:700;margin-bottom:18px">💳 Finalizar compra</h2>

      <div style="background:#f8f9fc;border-radius:8px;padding:14px;margin-bottom:18px">
        ${cart.map(c => `
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)">
            <span>${esc(c.title.slice(0, 38))}${c.title.length > 38 ? '…' : ''} × ${c.qty}</span>
            <strong>${fmt(c.price * c.qty)}</strong>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0"><span>Envío</span><span>RD$350</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0"><span>ITBIS (18%)</span><span>${fmt(itbis)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:var(--primary);padding-top:8px;border-top:1px solid var(--border)"><span>Total</span><span>${fmt(total)}</span></div>
      </div>

      <form id="checkoutForm" onsubmit="event.preventDefault();confirmOrder()">
        <h3 class="co-sec">📍 Dirección de entrega</h3>
        <div class="form-grid">
          <div class="fg2"><label for="coName">Nombre completo *</label><input type="text" id="coName" value="${esc(vName)}" autocomplete="name" required></div>
          <div class="fg2"><label for="coPhone">Teléfono *</label><input type="tel" id="coPhone" value="${esc(vPhone)}" placeholder="809-000-0000" autocomplete="tel" required></div>
          <div class="fg2" style="grid-column:1/-1"><label for="coAddr">Dirección de entrega *</label><input type="text" id="coAddr" value="${esc(vAddr)}" placeholder="Calle, número, sector" autocomplete="street-address" required></div>
          <div class="fg2"><label for="coProv">Provincia *</label>
            <select id="coProv">${provs.map(p => `<option ${p === selProv ? 'selected' : ''}>${p}</option>`).join('')}</select>
          </div>
        </div>
        <label class="co-check"><input type="checkbox" id="coSaveAddr"> Guardar esta dirección en mi libreta</label>

        <h3 class="co-sec">💳 Método de pago</h3>
        <div class="pay-methods">
          <label class="pay-opt"><input type="radio" name="payMethod" value="card" checked onchange="onPayMethod()"><span>💳 Tarjeta de crédito o débito</span></label>
          <label class="pay-opt"><input type="radio" name="payMethod" value="cash" onchange="onPayMethod()"><span>💵 Efectivo contra entrega</span></label>
        </div>

        <div id="cardFields">
          <div class="fg2" style="margin-bottom:12px"><label for="ccNum">Número de tarjeta *</label>
            <input type="text" id="ccNum" inputmode="numeric" placeholder="0000 0000 0000 0000" maxlength="23" oninput="fmtCardInput(this)" autocomplete="cc-number">
            <div class="ferr" id="ccNumE"></div>
          </div>
          <div class="form-grid">
            <div class="fg2"><label for="ccExp">Vencimiento *</label><input type="text" id="ccExp" inputmode="numeric" placeholder="MM/AA" maxlength="5" oninput="fmtExpiryInput(this)" autocomplete="cc-exp"><div class="ferr" id="ccExpE"></div></div>
            <div class="fg2"><label for="ccCvv">CVV *</label><input type="password" id="ccCvv" inputmode="numeric" placeholder="123" maxlength="4" oninput="this.value=this.value.replace(/\\D/g,'')" autocomplete="cc-csc"><div class="ferr" id="ccCvvE"></div></div>
            <div class="fg2" style="grid-column:1/-1"><label for="ccName">Titular de la tarjeta *</label><input type="text" id="ccName" value="${esc(vName)}" placeholder="Como aparece en la tarjeta" autocomplete="cc-name"></div>
          </div>
          <div class="cc-brands">🔒 Aceptamos <strong id="ccBrand">Visa · Mastercard · Amex</strong> — pago cifrado SSL 256-bit</div>
        </div>
        <div id="cashNote" class="verification-info-box" style="display:none;margin:14px 0">
          💵 Pagarás en efectivo al recibir tu pedido. Disponible en zonas con cobertura de mensajería.
        </div>

        <button type="submit" class="submit-btn" id="payBtn">🔒 Pagar ${fmt(total)}</button>
        <p style="font-size:11px;color:var(--text2);text-align:center;margin-top:10px">Tus datos viajan cifrados. MercadoRD nunca guarda el número completo de tu tarjeta ni tu CVV.</p>
      </form>
    </div>`;
  document.getElementById('cartOverlay').style.display = 'none';
}

// ─── Utilidades de pago con tarjeta (validación Luhn + marca) ───
function cardBrand(num) {
  num = String(num || '').replace(/\D/g, '');
  if (/^4/.test(num)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'Mastercard';
  if (/^3[47]/.test(num)) return 'American Express';
  if (/^(6011|65|64[4-9])/.test(num)) return 'Discover';
  return 'Tarjeta';
}
function luhnValid(num) {
  num = String(num || '').replace(/\D/g, '');
  if (num.length < 13 || num.length > 19) return false;
  let sum = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = parseInt(num[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
function fmtCardInput(el) {
  const v = el.value.replace(/\D/g, '').slice(0, 19);
  el.value = v.replace(/(.{4})/g, '$1 ').trim();
  const b = document.getElementById('ccBrand');
  if (b) b.textContent = v.length >= 2 ? cardBrand(v) : 'Visa · Mastercard · Amex';
}
function fmtExpiryInput(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 4);
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
  el.value = v;
}
function validExpiry(exp) {
  const m = /^(\d{2})\/(\d{2})$/.exec(exp || '');
  if (!m) return false;
  const mm = parseInt(m[1], 10), yy = 2000 + parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return false;
  return new Date(yy, mm, 1) > new Date();   // primer día tras el mes de vencimiento
}
function onPayMethod() {
  const m = document.querySelector('input[name="payMethod"]:checked')?.value || 'card';
  document.getElementById('cardFields').style.display = m === 'card' ? '' : 'none';
  document.getElementById('cashNote').style.display   = m === 'cash' ? '' : 'none';
}

async function confirmOrder() {
  const name  = document.getElementById('coName').value.trim();
  const phone = document.getElementById('coPhone').value.trim();
  const addr  = document.getElementById('coAddr').value.trim();
  const prov  = document.getElementById('coProv').value;
  if (name.length < 3 || phone.length < 7 || addr.length < 5) {
    showToast('Completa todos los campos de entrega');
    return;
  }

  const method = document.querySelector('input[name="payMethod"]:checked')?.value || 'card';
  let card = null;
  if (method === 'card') {
    ['ccNumE', 'ccExpE', 'ccCvvE'].forEach(id => fe(id, ''));
    const num    = (document.getElementById('ccNum').value || '').replace(/\D/g, '');
    const exp    = document.getElementById('ccExp').value.trim();
    const cvv    = (document.getElementById('ccCvv').value || '').replace(/\D/g, '');
    const holder = document.getElementById('ccName').value.trim();
    let ok = true;
    if (!luhnValid(num))     { fe('ccNumE', 'Número de tarjeta no válido'); ok = false; }
    if (!validExpiry(exp))   { fe('ccExpE', 'Vencimiento no válido'); ok = false; }
    if (cvv.length < 3)      { fe('ccCvvE', 'CVV no válido'); ok = false; }
    if (holder.length < 3)   { showToast('Ingresa el titular de la tarjeta'); ok = false; }
    if (!ok) return;
    card = { brand: cardBrand(num), last4: num.slice(-4) };
  }

  // Guardar dirección en la libreta si se marcó
  if (document.getElementById('coSaveAddr')?.checked && typeof addAddress === 'function') {
    addAddress({ label: 'Entrega', name, phone, addr, prov, def: getAddresses().length === 0 });
  }

  const sub   = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const itbis = Math.round(sub * 0.18);
  const total = sub + 350 + itbis;

  // Bloquear el botón antes de crear el pedido para evitar duplicados por doble clic (ambos métodos)
  const payBtn = document.getElementById('payBtn');
  if (payBtn) payBtn.disabled = true;

  // Procesamiento de pago con tarjeta (simulado de forma segura — sin pasarela real)
  if (method === 'card') {
    if (payBtn) payBtn.innerHTML = '<span class="spin"></span> Procesando pago seguro…';
    await new Promise(r => setTimeout(r, 1400));
  }

  const order = {
    id: 'MRD-' + Date.now().toString(36).toUpperCase(),
    items: cart.map(c => ({ id: c.id, title: c.title, qty: c.qty, price: c.price })),
    subtotal: sub, shipping: 350, itbis, total,
    buyer: { name, phone, addr, prov },
    payment: method,
    card,
    status: method === 'card' ? 'pagado' : 'pendiente',
    date: new Date().toISOString()
  };
  orders.push(order);
  saveOrders();

  cart = [];
  saveCart();
  updateCartBadge();

  const payLine = method === 'card'
    ? `✅ Pago aprobado con <strong>${card.brand} •••• ${card.last4}</strong>.`
    : `💵 Pagarás <strong>${fmt(order.total)}</strong> en efectivo al recibir.`;

  document.getElementById('contentArea').innerHTML = `
    <div class="sell-form" style="text-align:center;padding:50px 30px">
      <div style="font-size:60px;margin-bottom:14px">✅</div>
      <h2 style="font-size:22px;font-weight:700;margin-bottom:8px">¡Pedido confirmado!</h2>
      <p style="font-size:14px;color:var(--text2);margin-bottom:6px">Número de pedido: <strong style="color:var(--primary)">${order.id}</strong></p>
      <p style="font-size:13px;color:var(--text2);margin-bottom:6px">${payLine}</p>
      <p style="font-size:13px;color:var(--text2);margin-bottom:24px">Total: <strong>${fmt(order.total)}</strong> · Te contactaremos al ${phone} para coordinar la entrega.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="submit-btn" style="width:auto;padding:13px 26px" onclick="showView('orders')">Ver mis compras</button>
        <button class="submit-btn" style="width:auto;padding:13px 26px;background:var(--primary)" onclick="goHome()">Seguir comprando</button>
      </div>
    </div>`;
  showToast('Pedido ' + order.id + ' confirmado 🎉');
}

function renderOrders() {
  const statusLabel = { pagado:'💳 Pagado', pendiente:'⏳ Pendiente', enviado:'🚚 Enviado', entregado:'✅ Entregado' };
  const payLabel = { card:'💳 Tarjeta', cash:'💵 Efectivo' };
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="showView('account')">← Mi cuenta</button>
    <div class="section-header" style="margin-bottom:14px">
      <div class="section-title">📦 Mis compras (${orders.length})</div>
    </div>
    ${!orders.length
      ? '<div class="no-results"><div>📦</div><p>Aún no has realizado compras.</p></div>'
      : [...orders].reverse().map(o => `
        <div class="auction-card" style="cursor:default">
          <div class="auction-img">🧾</div>
          <div class="auction-info">
            <div class="auction-title">${o.id} <span style="font-size:12px;font-weight:400;color:var(--text2)">· ${new Date(o.date).toLocaleString('es-DO')}</span></div>
            <div class="auction-meta">${o.items.map(i => `${esc(i.title.slice(0, 30))} ×${i.qty}`).join(' · ')}</div>
            <div class="auction-meta">${payLabel[o.payment] || ''}${o.card ? ` ${o.card.brand} •••• ${o.card.last4}` : ''} · 🚚 ${o.buyer?.prov || 'RD'}</div>
            <div class="auction-price-row">
              <div class="auction-price">${fmt(o.total)}</div>
              <span style="font-size:13px;font-weight:600">${statusLabel[o.status] || o.status}</span>
            </div>
          </div>
        </div>`).join('')}`;
}

// ══════════════════════════════════════════════════
// CUENTA
// ══════════════════════════════════════════════════
function renderAccount() {
  const name  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const email = user?.email || '';
  const ini   = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const vline = userState.verified
    ? '✓ Email · 📱 Teléfono · 🪪 Identidad verificada'
    : (userState.verificationStatus === 'pending' ? '⏳ Verificación de identidad en proceso' : '⚠️ Identidad sin verificar — requerida para vender');

  document.getElementById('contentArea').innerHTML = `
    <div class="account-panel">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--border)">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700">${ini}</div>
        <div>
          <div style="font-size:20px;font-weight:700">${esc(name)}</div>
          <div style="font-size:13px;color:var(--text2)">${esc(email)}</div>
          <div style="font-size:12px;color:${userState.verified ? 'var(--green)' : 'var(--accent2)'};margin-top:4px">${vline}</div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-box" onclick="showView('orders')"><div style="font-size:24px;margin-bottom:4px">📦</div><div style="font-size:11px;color:var(--text2)">Compras</div><div style="font-size:18px;font-weight:700;color:var(--primary)">${orders.length}</div></div>
        <div class="stat-box" onclick="showView('myads')"><div style="font-size:24px;margin-bottom:4px">🏷️</div><div style="font-size:11px;color:var(--text2)">Anuncios</div><div style="font-size:18px;font-weight:700;color:var(--primary)">${userProducts.length}</div></div>
        <div class="stat-box" onclick="showView('favs')"><div style="font-size:24px;margin-bottom:4px">❤️</div><div style="font-size:11px;color:var(--text2)">Favoritos</div><div style="font-size:18px;font-weight:700;color:var(--primary)">${favs.size}</div></div>
      </div>
      <div class="menu-list">
        ${!userState.verified ? `
        <div class="menu-item" onclick="openVerification('account')" style="color:var(--primary);font-weight:600">
          <div class="menu-item-left"><span>🪪</span><span>Verificar mi identidad ahora</span></div>
          <span style="color:var(--text2)">›</span>
        </div>` : ''}
        ${[['💬','Mensajes',"showView('messages')"],
           ['⚙️','Configuración',"showView('settings')"],
           ['🚚','Direcciones',"showView('addresses')"],
           ['🔔','Notificaciones',"showView('notifs')"],
           ['💳','Métodos de pago',"openInfo('payments')"],
           ['🛡️','Protección al comprador',"openInfo('protection')"],
           ['🔒','Seguridad y 2FA',"showView('security')"],
           ['❓','Centro de ayuda',"openInfo('help')"]].map(([i, l, fn]) => `
          <div class="menu-item" onclick="${fn}">
            <div class="menu-item-left"><span>${i}</span><span>${l}</span></div>
            <span style="color:var(--text2)">›</span>
          </div>`).join('')}
        <div class="menu-item" onclick="doLogout()" style="color:var(--red)">
          <div class="menu-item-left"><span>🚪</span><span>Cerrar sesión</span></div>
        </div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════
// CARRITO (persistente)
// ══════════════════════════════════════════════════
function addCart(id, silent) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const ex = cart.find(c => c.id === id);
  if (ex) ex.qty++;
  else cart.push({ id: p.id, title: p.title, price: p.price, icon: p.icon, img: p.img || null, qty: 1 });
  saveCart();
  updateCartBadge();
  if (!silent) showToast(`"${p.title.slice(0, 26)}..." añadido 🛒`);
}

function updateCartBadge() {
  document.getElementById('cartCount').textContent = cart.reduce((s, c) => s + c.qty, 0);
}

function renderCart() {
  const ie = document.getElementById('cartItems');
  const te = document.getElementById('cartTotal');
  if (!cart.length) {
    ie.innerHTML = '<div style="text-align:center;padding:50px 0;color:var(--text2)"><div style="font-size:48px">🛒</div><p style="margin-top:10px">Carrito vacío</p></div>';
    te.innerHTML = '';
    return;
  }
  ie.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="cart-item-img" style="overflow:hidden">${c.img ? `<img src="${c.img}" alt="" style="width:100%;height:100%;object-fit:cover">` : c.icon}</div>
      <div class="cart-item-info">
        <div class="cart-item-title">${esc(c.title)}</div>
        <div style="font-size:11px;color:var(--text2)">${fmt(c.price)} c/u</div>
        <div class="cart-qty">
          <button class="qty-btn" onclick="chQty(${c.id},-1)" aria-label="Restar">−</button>
          <span class="qty-num">${c.qty}</span>
          <button class="qty-btn" onclick="chQty(${c.id},1)" aria-label="Sumar">+</button>
          <span class="remove-item" onclick="rmCart(${c.id})">✕</span>
        </div>
      </div>
      <div class="cart-item-total">${fmt(c.price * c.qty)}</div>
    </div>`).join('');

  const sub   = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const itbis = Math.round(sub * 0.18);
  te.innerHTML = `
    <div class="cart-total-section">
      <div class="total-row"><span>Subtotal</span><span>${fmt(sub)}</span></div>
      <div class="total-row"><span>Envío</span><span>RD$350</span></div>
      <div class="total-row"><span>ITBIS 18%</span><span>${fmt(itbis)}</span></div>
      <div class="total-row final"><span>Total</span><span>${fmt(sub + 350 + itbis)}</span></div>
      <button class="checkout-btn" onclick="requireAuth('checkout')">Proceder al pago →</button>
      <div class="payment-icons">💳 Tarjeta &nbsp; 💵 Efectivo contra entrega &nbsp; 🔒 Pago seguro</div>
    </div>`;
}

function chQty(id, d) {
  const c = cart.find(x => x.id === id);
  if (!c) return;
  c.qty += d;
  if (c.qty <= 0) cart = cart.filter(x => x.id !== id);
  saveCart();
  updateCartBadge();
  renderCart();
}
function rmCart(id) { cart = cart.filter(x => x.id !== id); saveCart(); updateCartBadge(); renderCart(); }
function toggleCart() {
  const ov   = document.getElementById('cartOverlay');
  const open = ov.style.display === 'none' || !ov.style.display;
  ov.style.display = open ? 'flex' : 'none';
  if (open) renderCart();
}
function closeCartOut(e) { if (e.target === document.getElementById('cartOverlay')) toggleCart(); }

// ─── Favoritos (persistentes) ───
function toggleFav(id, el) {
  if (favs.has(id)) { favs.delete(id); if (el) el.textContent = '♡';  showToast('Eliminado de favoritos'); }
  else              { favs.add(id);    if (el) el.textContent = '❤️'; showToast('Añadido a favoritos ❤️'); }
  saveFavs();
}

// ─── Subsecciones del Footer ───
function openBuyers()  { openSubPage('buyersSection'); }
function openSellers() { openSubPage('sellersSection'); }
function openAbout()   { openSubPage('aboutSection'); }
function openContact() { openSubPage('contactSection'); }

// Muestra el contenido de una de las secciones del footer como página propia (no modal)
function openSubPage(id) {
  const sec = document.getElementById(id);
  if (!sec) return;
  const head = sec.querySelector('.subsection-header h2');
  const cont = sec.querySelector('.subsection-content');
  showPage(cont ? cont.innerHTML : '', head ? head.innerHTML : '');
}

function closeSubsection() {
  document.querySelectorAll('.subsection-overlay').forEach(el => el.classList.remove('show'));
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('subsection-overlay')) closeSubsection();
});

// ─── Páginas de contenido del footer: se muestran como sección dentro del flujo, no como ventana emergente ───
function showPage(bodyHtml, titleHtml) {
  cview = 'page';
  closeSubsection();
  const lo = document.getElementById('legalOverlay'); if (lo) lo.style.display = 'none';
  const hb = document.getElementById('heroBanner');   if (hb) hb.style.display = 'none';
  const cs = document.querySelector('.carousel-section'); if (cs) cs.style.display = 'none';
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="goHome()">← Volver</button>
    <div class="static-page">
      <h1 class="static-page-title" id="pageTitle" tabindex="-1">${titleHtml}</h1>
      <div class="static-page-body">${bodyHtml}</div>
    </div>`;
  window.scrollTo(0, 0);
  const t = document.getElementById('pageTitle'); if (t) t.focus();
}

// ─── Carrusel ───
let carouselState = { tab: 'deals', index: 0, autoScrollTimer: null };

function getCarouselData() {
  if (carouselState.tab === 'deals')    return products.filter(p => p.badge === 'deal' || p.old).slice(0, 12);
  if (carouselState.tab === 'auctions') return auctions.filter(isLiveAuction).slice(0, 12);
  return products.filter(p => p.badge === 'hot' || p.reviews > 200).slice(0, 12);
}

function renderCarousel() {
  const data = getCarouselData();
  const content = document.getElementById('carouselContent');
  const indicators = document.getElementById('carouselIndicators');
  if (!content) return;

  content.innerHTML = data.map(item => {
    if (carouselState.tab === 'auctions') {
      return `
        <div class="carousel-item" onclick="showView('auctions')">
          <div class="carousel-card">
            <div class="carousel-img">${item.icon}<span class="carousel-badge hot">⏰ SUBASTA</span></div>
            <div class="carousel-info">
              <div class="carousel-title">${item.title}</div>
              <div class="carousel-seller">🏪 ${item.seller}</div>
              <div class="carousel-price">${fmt(item.cur)}</div>
              <div class="carousel-meta"><span>👥 ${item.bids} pujas</span><span class="carousel-time">${aucLeft(item) || 'Finalizada'}</span></div>
            </div>
          </div>
        </div>`;
    }
    return `
      <div class="carousel-item" onclick="showDetail(${item.id})">
        <div class="carousel-card">
          <div class="carousel-img" style="overflow:hidden">
            ${prodImg(item)}
            ${item.badge === 'deal' ? '<span class="carousel-badge deal">OFERTA</span>' : ''}
            ${item.badge === 'hot'  ? '<span class="carousel-badge hot">🔥 HOT</span>' : ''}
            ${item.badge === 'new'  ? '<span class="carousel-badge">NUEVO</span>' : ''}
          </div>
          <div class="carousel-info">
            <div class="carousel-title">${item.title}</div>
            <div class="carousel-seller">🏪 ${item.seller}</div>
            <div>
              <span class="carousel-price">${fmt(item.price)}</span>
              ${item.old ? `<span class="carousel-old-price">${fmt(item.old)}</span><span class="carousel-discount">-${Math.round((1 - item.price / item.old) * 100)}%</span>` : ''}
            </div>
            <div class="carousel-meta"><span class="carousel-rating">★ ${item.rating}</span><span>(${item.reviews})</span></div>
          </div>
        </div>
      </div>`;
  }).join('');

  indicators.innerHTML = Array.from({ length: Math.max(1, Math.ceil(data.length / 4)) }).map((_, i) =>
    `<button class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="carouselGoTo(${i})" aria-label="Página ${i + 1}"></button>`
  ).join('');

  carouselState.index = 0;
  updateCarouselPosition();
}

function updateCarouselPosition() {
  const content = document.getElementById('carouselContent');
  if (!content) return;
  content.style.transform = `translateX(${-carouselState.index * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === carouselState.index));
}

function carouselNext() {
  const max = Math.max(1, Math.ceil(getCarouselData().length / 4));
  carouselState.index = (carouselState.index + 1) % max;
  updateCarouselPosition();
  resetCarouselAutoScroll();
}
function carouselPrev() {
  const max = Math.max(1, Math.ceil(getCarouselData().length / 4));
  carouselState.index = (carouselState.index - 1 + max) % max;
  updateCarouselPosition();
  resetCarouselAutoScroll();
}
function carouselGoTo(i) {
  carouselState.index = i;
  updateCarouselPosition();
  resetCarouselAutoScroll();
}
function switchCarouselTab(btn, tab) {
  document.querySelectorAll('.carousel-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  carouselState.tab = tab;
  carouselState.index = 0;
  renderCarousel();
  resetCarouselAutoScroll();
}
function resetCarouselAutoScroll() {
  clearInterval(carouselState.autoScrollTimer);
  carouselState.autoScrollTimer = setInterval(carouselNext, 5000);
}

// ─── Verificación de Identidad ───
function openVerification(reason) {
  if (userState.verified) { showToast('Tu identidad ya está verificada ✓'); return; }
  const real = typeof sb !== 'undefined' && !!sb;
  // En modo demo (sin servidor) el estado pendiente bloquea; con Didit el
  // panel permite ver el estado y reintentar.
  if (!real && userState.verificationStatus === 'pending') {
    showToast('⏳ Tu verificación está en revisión — te avisaremos al aprobarse');
    return;
  }
  document.getElementById('verificationOverlay').classList.add('show');
  verificationData = { docType: null, docNumber: null, fullName: null, docFile: null, faceCapture: null, timestamp: null, reason };
  resetPhoneCapture();
  if (real) showDiditPanel();
  else showVerificationStep(1);
}

function closeVerification() {
  document.getElementById('verificationOverlay').classList.remove('show');
  resetCamera();
  resetPhoneCapture();
  clearInterval(diditPoll);
}

// ══════════════════════════════════════════════════
// VERIFICACIÓN AUTOMÁTICA CON DIDIT (modo real)
// El navegador solo pide la sesión; la decisión (detección de documentos
// falsos/editados, liveness, face match) ocurre en Didit y llega por
// webhook firmado a la Edge Function, que es la única que puede aprobar.
// ══════════════════════════════════════════════════
let diditPoll = null;

function showDiditPanel() {
  document.querySelectorAll('.verification-step-container').forEach(s => s.style.display = 'none');
  document.getElementById('verificationDidit').style.display = 'block';
  document.getElementById('diditLaunch').style.display = 'none';
  const btn = document.getElementById('diditStartBtn');
  btn.style.display = '';
  btn.disabled = false;
  const pending = userState.verificationStatus === 'pending';
  btn.textContent = pending ? '↻ Continuar / crear nueva sesión' : '🚀 Iniciar verificación';
  document.getElementById('diditStatus').textContent = pending
    ? '⏳ Tienes una verificación en proceso. Si no la terminaste, crea una nueva sesión.'
    : '';
  if (pending) startDiditPolling();
  window.scrollTo(0, 0);
}

async function diditStart() {
  const btn = document.getElementById('diditStartBtn');
  btn.disabled = true;
  btn.textContent = 'Creando sesión segura…';
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { showToast('Inicia sesión de nuevo para verificarte'); closeVerification(); openAuth('login'); return; }
    const res = await fetch(SB_URL + '/functions/v1/kyc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
        'apikey': SB_KEY
      },
      body: JSON.stringify({ action: 'create-session', callback: location.origin + location.pathname })
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.url) throw new Error(out.error || 'No se pudo crear la sesión');

    document.getElementById('diditLaunch').style.display = 'block';
    document.getElementById('diditOpenBtn').onclick = () => window.open(out.url, '_blank', 'noopener');
    document.getElementById('diditLink').textContent = out.url;
    ensureQRLib(ok => {
      const box = document.getElementById('diditQrBox');
      box.innerHTML = '';
      if (ok) new QRCode(box, { text: out.url, width: 170, height: 170, correctLevel: QRCode.CorrectLevel.M });
      else box.style.display = 'none';
    });
    document.getElementById('diditStatus').textContent =
      'Completa la verificación en la ventana segura o desde tu celular — esta pantalla se actualizará sola.';
    btn.style.display = 'none';
    userState.verificationStatus = 'pending';
    saveUserState();
    startDiditPolling();
  } catch (e) {
    showToast('⚠️ ' + (e.message || 'No se pudo iniciar la verificación'));
    btn.disabled = false;
    btn.textContent = '🚀 Iniciar verificación';
  }
}

function startDiditPolling() {
  clearInterval(diditPoll);
  diditPoll = setInterval(async () => {
    await loadProfile();
    saveUserState();
    if (userState.verified) {
      clearInterval(diditPoll);
      refreshHeader();
      document.querySelectorAll('.verification-step-container').forEach(s => s.style.display = 'none');
      const ok = document.getElementById('verificationSuccess');
      ok.querySelector('.verification-success-title').textContent = '¡Identidad verificada! ✅';
      ok.querySelector('.verification-success-msg').textContent =
        'El sistema validó tu documento y tu rostro automáticamente. Ya puedes vender y pujar en MercadoRD.';
      ok.style.display = 'block';
      showToast('✅ ¡Identidad verificada!');
      const reason = verificationData.reason;
      if (reason === 'sell' || reason === 'bid') {
        setTimeout(() => { closeVerification(); showView(reason === 'bid' ? 'auctions' : 'sell'); }, 1800);
      }
    } else if (userState.verificationStatus === 'rejected') {
      clearInterval(diditPoll);
      document.getElementById('diditStatus').textContent =
        '❌ La verificación fue rechazada: el documento o el rostro no pasaron los controles. Puedes intentarlo de nuevo con el documento original y buena iluminación.';
      const btn = document.getElementById('diditStartBtn');
      btn.style.display = '';
      btn.disabled = false;
      btn.textContent = '↻ Intentar de nuevo';
    }
  }, 5000);
}

// ══════════════════════════════════════════════════
// CAPTURA REMOTA: escanea un QR y usa la cámara del celular.
// El celular abre mercadord.net#fv=TOKEN, captura el rostro y lo envía
// por un canal Realtime de Supabase; la computadora lo recibe y el
// flujo de verificación continúa solo.
// ══════════════════════════════════════════════════
let fvChannel = null;
let fvChunks  = null;
let fvTimer   = null;

function resetPhoneCapture() {
  if (fvChannel && typeof sb !== 'undefined' && sb) { try { sb.removeChannel(fvChannel); } catch (e) {} }
  fvChannel = null;
  fvChunks = null;
  clearTimeout(fvTimer);
  const area = document.getElementById('qrArea');
  if (area) area.style.display = 'none';
}

function ensureQRLib(cb) {
  if (window.QRCode) return cb(true);
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@master/qrcode.min.js';
  s.onload = () => cb(true);
  s.onerror = () => cb(false);
  document.head.appendChild(s);
}

function startPhoneCapture() {
  if (typeof sb === 'undefined' || !sb) {
    showToast('La captura por celular requiere conexión con el servidor (no disponible en modo demo)');
    return;
  }
  const token = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const url = location.origin + location.pathname + '#fv=' + token;

  const area = document.getElementById('qrArea');
  area.style.display = 'block';
  document.getElementById('qrLink').textContent = url;
  document.getElementById('qrStatus').textContent = 'Generando código…';

  ensureQRLib(ok => {
    const box = document.getElementById('qrBox');
    box.innerHTML = '';
    if (ok) {
      new QRCode(box, { text: url, width: 190, height: 190, correctLevel: QRCode.CorrectLevel.M });
      document.getElementById('qrStatus').textContent = '📷 Escanea el código con la cámara de tu celular';
    } else {
      box.style.display = 'none';
      document.getElementById('qrStatus').textContent = 'No se pudo generar el QR — usa el enlace de abajo';
    }
  });

  resetChannelOnly();
  fvChunks = {};
  fvChannel = sb.channel('fv-' + token);
  fvChannel
    .on('broadcast', { event: 'hello' }, () => {
      document.getElementById('qrStatus').textContent = '📱 Celular conectado — captura tu rostro allí';
    })
    .on('broadcast', { event: 'face' }, ({ payload }) => {
      if (!fvChunks) return;
      fvChunks[payload.seq] = payload.data;
      const got = Object.keys(fvChunks).length;
      document.getElementById('qrStatus').textContent = `Recibiendo foto… ${Math.round(got / payload.total * 100)}%`;
      // si en 15s no llegan todos los pedazos, avisar
      clearTimeout(fvTimer);
      fvTimer = setTimeout(() => {
        if (fvChunks && Object.keys(fvChunks).length < payload.total) {
          document.getElementById('qrStatus').textContent = '⚠️ La foto no llegó completa — reintenta desde el celular';
        }
      }, 15000);
      if (got === payload.total) {
        clearTimeout(fvTimer);
        const img = Array.from({ length: payload.total }, (_, i) => fvChunks[i]).join('');
        fvChannel.send({ type: 'broadcast', event: 'ack', payload: {} });
        receivePhoneCapture(img);
      }
    })
    .subscribe();
}

function resetChannelOnly() {
  if (fvChannel && sb) { try { sb.removeChannel(fvChannel); } catch (e) {} }
  fvChannel = null;
}

function receivePhoneCapture(dataUrl) {
  verificationData.faceCapture = dataUrl;
  resetCamera();

  const canvas = document.getElementById('capturedCanvas');
  const img = new Image();
  img.onload = () => {
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext('2d').drawImage(img, 0, 0);
  };
  img.src = dataUrl;

  document.getElementById('capturedPhotoArea').style.display = 'block';
  document.getElementById('cameraBtnCapture').disabled = true;
  document.getElementById('cameraBtnToggle').disabled = true;
  document.getElementById('submitVerification').disabled = false;
  document.getElementById('qrStatus').textContent = '✅ Foto recibida — completando verificación…';
  showToast('✅ Foto recibida desde tu celular');

  // Reanuda el flujo en la computadora automáticamente
  setTimeout(() => {
    if (verificationData.faceCapture) submitVerification();
  }, 1500);
}

// ─── Modo celular: la página se abrió desde el QR (#fv=TOKEN) ───
function fvMobileMode() {
  const m = location.hash.match(/^#fv=([A-Za-z0-9-]+)$/);
  if (!m) return false;
  const token = m[1];

  document.body.innerHTML = `
    <div style="max-width:440px;margin:0 auto;padding:24px 18px;font-family:'Sora',sans-serif">
      <div style="text-align:center;margin-bottom:18px">
        <div style="font-size:22px;font-weight:700;color:#003087">Mercado<span style="color:#f5a623">RD</span></div>
        <div style="font-size:15px;font-weight:600;margin-top:10px">🪪 Verificación facial</div>
        <div style="font-size:13px;color:#666;margin-top:4px" id="fvMsg">Conectando con tu computadora…</div>
      </div>
      <video id="fvVideo" autoplay playsinline style="width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:14px;background:#111;display:block"></video>
      <canvas id="fvCanvas" style="width:100%;border-radius:14px;display:none"></canvas>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;justify-content:center">
        <button id="fvStart" style="flex:1;min-width:130px;padding:13px;border:none;border-radius:10px;background:#003087;color:#fff;font-size:14px;font-weight:600;font-family:inherit">📹 Iniciar cámara</button>
        <button id="fvShot" disabled style="flex:1;min-width:130px;padding:13px;border:none;border-radius:10px;background:#e84a3f;color:#fff;font-size:14px;font-weight:600;font-family:inherit;opacity:.5">📸 Capturar</button>
        <button id="fvRetake" style="display:none;flex:1;min-width:130px;padding:13px;border:1.5px solid #ccc;border-radius:10px;background:#fff;font-size:14px;font-weight:600;font-family:inherit">↻ Tomar otra</button>
        <button id="fvSend" style="display:none;flex:1;min-width:130px;padding:13px;border:none;border-radius:10px;background:#0a8a4a;color:#fff;font-size:14px;font-weight:600;font-family:inherit">✅ Enviar a la computadora</button>
      </div>
      <p style="font-size:12px;color:#888;text-align:center;margin-top:14px">Tu foto se envía cifrada a tu sesión de verificación y no se comparte con terceros.</p>
      <div class="toast" id="toast"></div>
    </div>`;

  let stream = null, photo = null, channel = null, ready = false;
  const $ = id => document.getElementById(id);
  const msg = t => { $('fvMsg').textContent = t; };

  // El SDK de Supabase carga con defer: esperar a que esté listo
  let tries = 0;
  (function join() {
    if (typeof initSupabase === 'function') initSupabase();
    if (typeof sb === 'undefined' || !sb) {
      if (++tries > 50) { msg('❌ No se pudo conectar. Recarga la página.'); return; }
      setTimeout(join, 200);
      return;
    }
    channel = sb.channel('fv-' + token);
    channel
      .on('broadcast', { event: 'ack' }, () => { msg('✅ Confirmado — ya puedes volver a tu computadora'); })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          ready = true;
          channel.send({ type: 'broadcast', event: 'hello', payload: {} });
          msg('Conectado ✓ — inicia la cámara y captura tu rostro');
        }
      });
  })();

  $('fvStart').onclick = () => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(s => {
        stream = s;
        $('fvVideo').srcObject = s;
        $('fvShot').disabled = false;
        $('fvShot').style.opacity = '1';
        msg('Ubica tu rostro en el centro y captura');
      })
      .catch(() => msg('❌ No se pudo acceder a la cámara. Revisa los permisos del navegador.'));
  };

  $('fvShot').onclick = () => {
    const v = $('fvVideo'), c = $('fvCanvas');
    const scale = Math.min(1, 640 / v.videoWidth);
    c.width  = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    photo = c.toDataURL('image/jpeg', 0.8);
    v.style.display = 'none';
    c.style.display = 'block';
    $('fvShot').style.display = 'none';
    $('fvStart').style.display = 'none';
    $('fvRetake').style.display = 'block';
    $('fvSend').style.display = 'block';
    msg('¿Se ve bien? Envíala a tu computadora');
  };

  $('fvRetake').onclick = () => {
    photo = null;
    $('fvCanvas').style.display = 'none';
    $('fvVideo').style.display = 'block';
    $('fvShot').style.display = 'block';
    $('fvStart').style.display = 'block';
    $('fvRetake').style.display = 'none';
    $('fvSend').style.display = 'none';
  };

  $('fvSend').onclick = async () => {
    if (!photo) return;
    if (!ready) { msg('Aún conectando… intenta en unos segundos'); return; }
    $('fvSend').disabled = true;
    msg('Enviando foto…');
    const CH = 60000;
    const total = Math.ceil(photo.length / CH);
    try {
      for (let i = 0; i < total; i++) {
        await channel.send({ type: 'broadcast', event: 'face', payload: { seq: i, total, data: photo.slice(i * CH, (i + 1) * CH) } });
      }
      if (stream) stream.getTracks().forEach(t => t.stop());
      msg('✅ Foto enviada — vuelve a tu computadora para terminar');
      $('fvRetake').style.display = 'none';
      $('fvSend').style.display = 'none';
    } catch (e) {
      $('fvSend').disabled = false;
      msg('❌ Error al enviar. Intenta de nuevo.');
    }
  };

  return true;
}

function showVerificationStep(step) {
  document.querySelectorAll('.verification-step-container').forEach(s => s.style.display = 'none');
  document.getElementById('verificationStep' + step).style.display = 'block';
  window.scrollTo(0, 0);
}

function verificationNext1() {
  const docType   = document.getElementById('docType').value;
  const docNumber = document.getElementById('docNumber').value;
  const fullName  = document.getElementById('fullName').value;
  if (!docType || !docNumber || !fullName) { showToast('Por favor completa todos los campos'); return; }
  if (docType === 'cedula' && !validCedula(docNumber)) {
    showToast('❌ Cédula no válida: el dígito verificador no corresponde');
    return;
  }
  if (docType === 'passport' && docNumber.replace(/\s/g, '').length < 6) {
    showToast('❌ Número de pasaporte no válido');
    return;
  }
  if (fullName.trim().split(/\s+/).length < 2) {
    showToast('Escribe tu nombre completo como aparece en el documento');
    return;
  }
  verificationData.docType = docType;
  verificationData.docNumber = docNumber;
  verificationData.fullName = fullName;
  showVerificationStep(2);
}

function verificationBack() {
  const currentStep = document.querySelector('.verification-step-container:not([style*="display: none"])');
  const stepNum = parseInt(currentStep.id.replace('verificationStep', ''));
  showVerificationStep(stepNum - 1);
}

async function handleDocUpload(input) {
  const file = input.files[0];
  const v = await validateImageFile(file, 10 * 1024 * 1024);
  if (!v.ok) { showToast(v.error); input.value = ''; return; }
  verificationData.docFile = file;
  document.getElementById('docUploadName').textContent = '✓ ' + file.name;
  document.getElementById('docUploadArea').classList.add('has-file');
  document.getElementById('docUploadBtn').disabled = false;
  showToast('Archivo cargado correctamente');
}

function verificationNext2() {
  if (!verificationData.docFile) { showToast('Por favor carga el documento'); return; }
  showVerificationStep(3);
  setTimeout(() => initCamera(), 500);
}

let cameraStream = null;

function initCamera() {
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then(stream => {
      cameraStream = stream;
      document.getElementById('cameraFeed').srcObject = stream;
      document.getElementById('cameraBtnToggle').textContent = '⏹️ Detener cámara';
      document.getElementById('cameraBtnCapture').disabled = false;
      showToast('Cámara iniciada - Ubícate en el marco');
    })
    .catch(err => {
      console.error('Error acceso cámara:', err);
      showToast('No se pudo acceder a la cámara. Verifica los permisos.');
    });
}

function toggleCamera() { cameraStream ? resetCamera() : initCamera(); }

function capturePhoto() {
  const video  = document.getElementById('cameraFeed');
  const canvas = document.getElementById('capturedCanvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  verificationData.faceCapture = canvas.toDataURL('image/jpeg');
  document.getElementById('capturedPhotoArea').style.display = 'block';
  document.getElementById('cameraBtnCapture').disabled = true;
  document.getElementById('cameraBtnToggle').disabled = true;
  document.getElementById('submitVerification').disabled = false;
  showToast('Foto capturada - Puedes completar la verificación');
}

function retakePhoto() {
  document.getElementById('capturedPhotoArea').style.display = 'none';
  document.getElementById('cameraBtnCapture').disabled = false;
  document.getElementById('cameraBtnToggle').disabled = false;
  document.getElementById('submitVerification').disabled = true;
  verificationData.faceCapture = null;
}

function resetCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const t = document.getElementById('cameraBtnToggle');
  if (t) { t.textContent = '📹 Iniciar cámara'; t.disabled = false; }
  const c = document.getElementById('cameraBtnCapture');
  if (c) c.disabled = true;
}

function submitVerification() {
  if (!verificationData.faceCapture) { showToast('Por favor captura una foto de tu rostro'); return; }
  verificationData.timestamp = new Date().toISOString();

  // Con Supabase activo: registra la solicitud en la tabla `verifications`
  // y marca el perfil como pendiente. `is_verified` solo lo cambia el admin
  // (protegido por trigger en la BD). Subir docFile/faceCapture a Storage
  // queda para cuando se cree el bucket — ver SUPABASE_SETUP.md.
  if (typeof sb !== 'undefined' && sb && user?.id) {
    (async () => {
      try {
        let r = await sb.from('verifications').insert({
          user_id:    user.id,
          doc_type:   verificationData.docType,
          doc_number: verificationData.docNumber,
          full_name:  verificationData.fullName,
          status:     'pending'
        });
        if (r.error) throw r.error;
        r = await sb.from('profiles')
          .update({ verification_status: 'pending' })
          .eq('id', user.id);
        if (r.error) throw r.error;
      } catch (e) {
        console.warn('No se pudo registrar la verificación:', e.message || e);
        showToast('⚠️ No se pudo registrar la verificación en el servidor. Intenta de nuevo.');
      }
    })();
  }

  if (typeof sb !== 'undefined' && sb) {
    // Modo real: queda EN REVISIÓN. La aprobación la da el proveedor KYC
    // automático (o el admin en Table Editor) escribiendo profiles.is_verified
    // — protegido por trigger, el cliente no puede auto-aprobarse.
    userState.verified = false;
    userState.verificationStatus = 'pending';
  } else {
    userState.verified = true;          // solo en modo demo local
    userState.verificationStatus = 'pending';
  }
  saveUserState();
  refreshHeader();

  resetCamera();
  document.querySelectorAll('.verification-step-container').forEach(s => s.style.display = 'none');
  document.getElementById('verificationSuccess').style.display = 'block';
  showToast('✅ Verificación enviada correctamente');

  const reason = verificationData.reason;
  if (userState.verified && (reason === 'sell' || reason === 'bid')) {
    setTimeout(() => { closeVerification(); showView(reason === 'bid' ? 'auctions' : 'sell'); }, 1200);
  }
}

// ─── Contenido legal: se muestra como sección propia (antes era ventana emergente) ───
function openLegal(key) {
  const c = legalContent[key];
  if (!c) return;
  showPage(c.body, c.title);
}

// ─── Contenido informativo: se muestra como sección propia (antes reutilizaba el modal legal) ───
function openInfo(key) {
  const c = infoContent[key];
  if (!c) return;
  showPage(c.body, c.title);
}

// Cerrar modales de puja/oferta al hacer clic fuera
['bidOverlay', 'offerOverlay'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target.id === id) e.target.style.display = 'none';
  });
});

// ─── Init ───
// Si la URL trae #fv=TOKEN, la página fue abierta escaneando el QR de
// verificación: solo se muestra la pantalla de captura para el celular.
if (!fvMobileMode()) {
  cview = 'home';
  updateCartBadge();
  refreshHeader();
  doRender();
  renderCarousel();
  resetCarouselAutoScroll();
}

// ══════════════════════════════════════════════════
// SUBASTAS EN TIEMPO REAL (multi-usuario, Supabase)
// Carga desde la BD, pujas vía RPC, feed enmascarado,
// notificaciones y Realtime. En modo demo todo sigue local.
// ══════════════════════════════════════════════════
let aucChannel = null;

// Cargar todas las subastas desde la BD y reemplazar el arreglo local
async function loadAuctionsDB() {
  if (typeof sb === 'undefined' || !sb) return;
  try {
    // Solo subastas ACTIVAS y no vencidas: las finalizadas dejan de ser públicas
    // (siguen accesibles por enlace directo para los participantes, vía openAuctionById)
    const { data, error } = await sb.from('auctions').select('*')
      .eq('status', 'active').gt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: true });
    if (error || !data) return;
    const uid = (typeof user !== 'undefined' && user) ? user.id : null;
    const mapped = data.map(r => ({
      id: r.id, title: r.title, icon: r.icon || '📦', loc: r.location || 'RD',
      seller: r.seller_name || 'MercadoRD',
      cur: Number(r.current_bid), bids: r.bid_count || 0,
      buy: r.buy_now_price != null ? Number(r.buy_now_price) : null,
      endAt: new Date(r.ends_at).getTime(),
      mine: !!(r.seller_id && uid && r.seller_id === uid),
      myBid: !!(r.high_bidder && uid && r.high_bidder === uid),
      sold: r.status === 'sold', status: r.status,
      leader: r.leader_masked || null, db: true
    }));
    auctions.splice(0, auctions.length, ...mapped);
    if (typeof cview !== 'undefined') {
      if (cview === 'auctions') renderAuctions();
      else if (cview === 'home' && typeof renderCarousel === 'function') renderCarousel();
    }
  } catch (e) { console.warn('loadAuctionsDB', e); }
}

// Refrescar una sola subasta (tras un rechazo por puja baja, etc.)
async function refreshAuction(id) {
  if (typeof sb === 'undefined' || !sb) return;
  try {
    const { data } = await sb.from('auctions').select('*').eq('id', id).maybeSingle();
    if (!data) return;
    const a = auctions.find(x => x.id == id); if (!a) return;
    const uid = (typeof user !== 'undefined' && user) ? user.id : null;
    a.cur = Number(data.current_bid); a.bids = data.bid_count; a.endAt = new Date(data.ends_at).getTime();
    a.status = data.status; a.sold = data.status === 'sold'; a.leader = data.leader_masked || a.leader;
    a.myBid = !!(data.high_bidder && uid && data.high_bidder === uid);
  } catch (e) {}
}

// Realtime: cambios en cualquier subasta (pujas de otros usuarios en vivo)
function subscribeAuctions() {
  if (typeof sb === 'undefined' || !sb || aucChannel) return;
  aucChannel = sb.channel('auctions-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, payload => {
      const r = payload.new || payload.old; if (!r) return;
      const idx = auctions.findIndex(x => x.id == r.id);

      if (payload.eventType === 'INSERT') {
        // Nueva subasta activa publicada → recargar el listado público
        if (idx < 0 && r.status === 'active') loadAuctionsDB();
        return;
      }
      if (payload.eventType === 'DELETE' || !payload.new) {
        if (idx >= 0) { auctions.splice(idx, 1); if (cview === 'auctions') renderAuctions(); }
        return;
      }
      // UPDATE: si la subasta dejó de estar activa, quitarla del listado público
      if (r.status !== 'active' || new Date(r.ends_at).getTime() <= Date.now()) {
        if (idx >= 0) { auctions.splice(idx, 1); if (cview === 'auctions') renderAuctions(); }
        // Si estoy viendo su detalle (por enlace), refrescarlo con el estado final
        if (cview === 'auctiondetail' && currentAuctionDetailId == r.id) openAuctionById(r.id);
        return;
      }
      const a = auctions[idx]; if (!a) return;
      const uid = (typeof user !== 'undefined' && user) ? user.id : null;
      a.cur = Number(r.current_bid); a.bids = r.bid_count; a.endAt = new Date(r.ends_at).getTime();
      a.status = r.status; a.sold = r.status === 'sold'; a.leader = r.leader_masked || a.leader;
      a.myBid = !!(r.high_bidder && uid && r.high_bidder === uid);
      patchAuctionDOM(a);
      if (bidAucId != null && bidAucId == a.id) {
        const c = document.getElementById('bidCur'); if (c) c.textContent = fmt(a.cur);
        const n = document.getElementById('bidCount'); if (n) n.textContent = a.bids;
        loadBidFeed(a.id);
      }
    })
    .subscribe();
}

// Actualizar en vivo las tarjetas sin re-render completo (salvo cambio de estado)
function patchAuctionDOM(a) {
  document.querySelectorAll(`.auc-cur[data-id="${a.id}"]`).forEach(el => el.textContent = fmt(a.cur));
  document.querySelectorAll(`.auc-bids[data-id="${a.id}"]`).forEach(el => el.textContent = a.bids);
  document.querySelectorAll(`.auc-leader[data-id="${a.id}"]`).forEach(el => {
    el.innerHTML = (a.leader && a.status === 'active' && !a.mine && !a.myBid)
      ? ` · 🏆 <b style="color:var(--green,#0a8a4a)">${a.leader}</b> va ganando` : '';
  });
  if (typeof cview !== 'undefined' && cview === 'auctions' && a.status !== 'active') renderAuctions();
}

// Feed de pujadores con nombres ENMASCARADOS (servidos así por el servidor)
async function loadBidFeed(id) {
  const box = document.getElementById('bidFeed'); if (!box) return;
  if (typeof sb === 'undefined' || !sb) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="bf-empty">Cargando pujas…</div>';
  try {
    const { data, error } = await sb.rpc('get_auction_bids', { p_auction: id, p_limit: 10 });
    if (error) throw error;
    if (!data || !data.length) { box.innerHTML = '<div class="bf-empty">Sé el primero en pujar 🔨</div>'; return; }
    box.innerHTML = data.map((b, i) => `
      <div class="bf-row${i === 0 ? ' bf-top' : ''}">
        <span class="bf-name">${i === 0 ? '🏆 ' : ''}${b.masked}</span>
        <span class="bf-amt">${fmt(b.amount)}</span>
        <span class="bf-time">${relTime(b.created_at)}</span>
      </div>`).join('');
  } catch (e) { box.innerHTML = ''; }
}

function relTime(ts) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return 'hace ' + s + 's';
  const m = Math.floor(s / 60); if (m < 60) return 'hace ' + m + 'min';
  const h = Math.floor(m / 60); if (h < 24) return 'hace ' + h + 'h';
  return 'hace ' + Math.floor(h / 24) + 'd';
}

// ══════════════════════════════════════════════════
// DETALLE DE SUBASTA POR ENLACE (#subasta=ID)
// Las subastas finalizadas NO salen en el listado público, pero siguen
// accesibles aquí para el vendedor, el ganador y quienes pujaron. La
// privacidad la decide la RLS de Supabase (devuelve null a los demás).
// ══════════════════════════════════════════════════
let currentAuctionDetailId = null;
let auctionDetailData = null;

async function openAuctionById(id) {
  // Modo demo (sin servidor): buscar en el arreglo local
  if (typeof sb === 'undefined' || !sb) {
    const a = auctions.find(x => x.id == id);
    if (!a) { showToast('Subasta no disponible'); return; }
    renderAuctionDetail(a);
    return;
  }
  try {
    const { data } = await sb.from('auctions').select('*').eq('id', id).maybeSingle();
    if (!data) {
      // La RLS la ocultó (finalizada y no soy participante) o no existe
      cview = 'auctiondetail';
      currentAuctionDetailId = id;
      document.getElementById('heroBanner').style.display = 'none';
      closeSubsection();
      document.getElementById('contentArea').innerHTML = `
        <button class="back-btn" onclick="leaveAuctionDetail()">← Subastas</button>
        <div class="no-results">
          <div>🔒</div>
          <p>Esta subasta finalizó y ya no es pública. Solo el vendedor, el ganador y quienes pujaron pueden verla.${user ? '' : '<br>Si participaste en ella, inicia sesión para verla.'}</p>
          ${user ? '' : '<button class="submit-btn" style="width:auto;padding:11px 22px;margin-top:14px" onclick="openAuth(\'login\')">Iniciar sesión</button>'}
        </div>`;
      window.scrollTo(0, 0);
      return;
    }
    const uid = (typeof user !== 'undefined' && user) ? user.id : null;
    const a = {
      id: data.id, title: data.title, icon: data.icon || '📦', loc: data.location || 'RD',
      seller: data.seller_name || 'MercadoRD', cur: Number(data.current_bid), bids: data.bid_count || 0,
      buy: data.buy_now_price != null ? Number(data.buy_now_price) : null,
      endAt: new Date(data.ends_at).getTime(),
      mine: !!(data.seller_id && uid && data.seller_id === uid),
      myBid: !!(data.high_bidder && uid && data.high_bidder === uid),
      sold: data.status === 'sold', status: data.status, leader: data.leader_masked || null,
      winner_id: data.winner_id, high_bidder: data.high_bidder, db: true
    };
    // Si está activa y no está en el listado cargado, agregarla para que tryBid/tryBuyNow la encuentren
    if (isLiveAuction(a) && !auctions.find(x => x.id == a.id)) auctions.push(a);
    renderAuctionDetail(a);
  } catch (e) { showToast('No se pudo abrir la subasta'); }
}

function renderAuctionDetail(a) {
  cview = 'auctiondetail';
  currentAuctionDetailId = a.id;
  auctionDetailData = a;
  document.getElementById('heroBanner').style.display = 'none';
  closeSubsection();
  const left = aucLeft(a);
  const over = !left || a.status === 'ended' || a.status === 'sold';
  const uid = (typeof user !== 'undefined' && user) ? user.id : null;
  const iWon = over && uid && ((a.winner_id && a.winner_id === uid) || (a.high_bidder && a.high_bidder === uid));
  const link = location.origin + location.pathname + '#subasta=' + a.id;
  const badge = a.status === 'sold' ? '<span class="adt-badge sold">VENDIDA</span>'
              : over ? '<span class="adt-badge ended">FINALIZADA</span>'
              : '<span class="adt-badge live">EN VIVO</span>';

  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="leaveAuctionDetail()">← Subastas</button>
    <div class="detail-panel">
      <div class="detail-img-area" style="font-size:84px;display:flex;align-items:center;justify-content:center">${a.icon}</div>
      <div class="detail-title">${esc(a.title)} ${badge}</div>
      <div class="detail-meta">
        <span>📍 ${esc(a.loc)}</span>
        <span>🏪 ${esc(a.seller)}</span>
        <span>👥 ${a.bids} pujas</span>
        <span>⏰ ${over ? (a.status === 'sold' ? 'Comprada con ¡Cómpralo ya!' : 'Finalizada') : left}</span>
      </div>
      <div style="margin:10px 0">
        <div style="font-size:11px;color:var(--text2)">${over ? 'Puja final' : 'Puja actual'}</div>
        <div class="detail-price auc-cur" data-id="${a.id}">${fmt(a.cur)}</div>
      </div>
      ${iWon ? `
        <div class="verification-info-box" style="margin:6px 0 14px">🏆 <strong>¡Ganaste esta subasta!</strong> Completa el pago para coordinar la entrega.</div>
        <button class="btn-buy" style="width:100%;margin-bottom:6px" onclick="payAuction('${a.id}')">Pagar ${fmt(a.cur)} y coordinar entrega</button>` : ''}
      ${!over && !a.mine ? `
        <div class="detail-actions">
          ${a.buy ? `<button class="btn-buy" onclick="tryBuyNow('${a.id}')">⚡ ¡Cómpralo ya! ${fmt(a.buy)}</button>` : ''}
          <button class="btn-cart2" onclick="tryBid('${a.id}')" style="border-color:var(--primary);color:var(--primary)">🔨 Pujar</button>
        </div>` : ''}
      ${a.mine ? '<div style="font-size:13px;color:var(--text2);font-weight:600;margin:8px 0">🏷️ Esta es tu subasta</div>' : ''}
      <div class="bid-feed-wrap" style="margin-top:16px">
        <div class="bid-feed-head">👥 Pujas ${over ? '(historial)' : 'recientes'} <span>· nombres parciales por seguridad</span></div>
        <div id="bidFeed" class="bid-feed"></div>
      </div>
      <div class="adt-share">
        <span>🔗 Enlace de esta subasta</span>
        <div class="adt-share-row">
          <input id="adtLink" value="${esc(link)}" readonly onclick="this.select()">
          <button class="mrd-btn-ghost" onclick="copyAuctionLink()">Copiar</button>
        </div>
      </div>
      ${over ? '<p style="font-size:12px;color:var(--text2);margin-top:10px">Esta subasta ya finalizó: no aparece en el listado público. Solo el vendedor, el ganador y quienes pujaron pueden verla con este enlace.</p>' : ''}
    </div>`;
  loadBidFeed(a.id);
  window.scrollTo(0, 0);
}

function payAuction(id) {
  const a = auctionDetailData;
  if (!a || a.id != id) return;
  cart.push({ id: 'auc-' + a.id, title: a.title + ' (subasta ganada)', price: a.cur, icon: a.icon, img: null, qty: 1 });
  saveCart(); updateCartBadge();
  showToast('🏆 Artículo ganado añadido al carrito');
  requireAuth('checkout');
}

function copyAuctionLink() {
  const el = document.getElementById('adtLink');
  if (!el) return;
  el.select();
  const done = () => showToast('🔗 Enlace copiado');
  if (navigator.clipboard) navigator.clipboard.writeText(el.value).then(done).catch(() => { try { document.execCommand('copy'); done(); } catch (e) {} });
  else { try { document.execCommand('copy'); done(); } catch (e) {} }
}

function leaveAuctionDetail() {
  // Limpiar el hash para que un evento de auth posterior no reabra el detalle
  if (location.hash.indexOf('#subasta=') === 0) history.replaceState(null, '', location.pathname + location.search);
  currentAuctionDetailId = null;
  showView('auctions');
}

function openAuctionFromNotif(id) {
  const p = document.getElementById('notifPanel'); if (p) p.style.display = 'none';
  openAuctionById(id);
}

function checkAuctionHash() {
  const m = location.hash.match(/^#subasta=([\w-]+)$/);
  if (m) { openAuctionById(m[1]); return true; }
  return false;
}
window.addEventListener('hashchange', () => {
  const m = location.hash.match(/^#subasta=([\w-]+)$/);
  if (m) openAuctionById(m[1]);
});

// ─── Notificaciones (campana en el header) ───
let notifItems = [];
let notifChannel = null;

async function loadNotifications() {
  if (typeof sb === 'undefined' || !sb || !(typeof user !== 'undefined' && user && user.id)) {
    notifItems = []; renderNotifBadge(); renderNotifList(); return;
  }
  try {
    const { data } = await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(30);
    notifItems = data || []; renderNotifList();
  } catch (e) {}
}
function unreadCount() { return notifItems.filter(n => !n.read).length; }
function renderNotifBadge() {
  const b = document.getElementById('notifBadge'); if (!b) return;
  const c = unreadCount(); b.textContent = c > 9 ? '9+' : String(c); b.style.display = c ? 'flex' : 'none';
}
function renderNotifList() {
  renderNotifBadge();
  const box = document.getElementById('notifList'); if (!box) return;
  if (!notifItems.length) { box.innerHTML = '<div class="nt-empty">Sin notificaciones aún 🔔</div>'; return; }
  box.innerHTML = notifItems.map(n => `
    <div class="nt-row${n.read ? '' : ' nt-unread'}${n.auction_id ? ' nt-click' : ''}"${n.auction_id ? ` onclick="openAuctionFromNotif('${n.auction_id}')"` : ''}>
      <div class="nt-title">${esc(n.title || '')}</div>
      <div class="nt-body">${esc(n.body || '')}</div>
      <div class="nt-time">${relTime(n.created_at)}</div>
    </div>`).join('');
}
function toggleNotif() {
  if (!(typeof user !== 'undefined' && user)) { openAuth('login'); return; }
  const p = document.getElementById('notifPanel'); if (!p) return;
  const open = p.style.display !== 'block';
  p.style.display = open ? 'block' : 'none';
  if (open) { renderNotifList(); markNotifRead(); }
}
async function markNotifRead() {
  if (typeof sb === 'undefined' || !sb || !(typeof user !== 'undefined' && user && user.id)) return;
  if (!unreadCount()) return;
  notifItems.forEach(n => n.read = true); renderNotifBadge();
  try { await sb.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false); } catch (e) {}
}
function subscribeNotifications() {
  if (typeof sb === 'undefined' || !sb || !(typeof user !== 'undefined' && user && user.id)) return;
  if (notifChannel) { try { sb.removeChannel(notifChannel); } catch (e) {} notifChannel = null; }
  const uid = user.id;
  notifChannel = sb.channel('notif-' + uid)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + uid }, payload => {
      const n = payload.new; if (!n) return;
      notifItems.unshift(n); renderNotifList();
      showToast(n.title || 'Notificación');
      dingNotif();
    })
    .subscribe();
}
function unsubscribeNotifications() {
  if (notifChannel) { try { sb.removeChannel(notifChannel); } catch (e) {} notifChannel = null; }
  notifItems = []; renderNotifBadge(); renderNotifList();
}
function dingNotif() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    const ctx = dingNotif._c || (dingNotif._c = new Ctx());
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.05;
    o.connect(g); g.connect(ctx.destination); o.start();
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.stop(ctx.currentTime + 0.26);
  } catch (e) {}
}

// Cerrar el panel de notificaciones al hacer clic fuera
document.addEventListener('click', e => {
  const wrap = e.target.closest && e.target.closest('.notif-wrap');
  const p = document.getElementById('notifPanel');
  if (!wrap && p && p.style.display === 'block') p.style.display = 'none';
});

// Punto de entrada llamado por auth.js cuando cambia la sesión (login/logout/carga)
function onUserChanged() {
  if (typeof sb === 'undefined' || !sb) return;
  loadAuctionsDB();
  subscribeAuctions();
  if (typeof user !== 'undefined' && user && user.id) {
    loadNotifications();
    subscribeNotifications();
  } else {
    unsubscribeNotifications();
  }
  // Si la URL trae #subasta=ID, abrir el detalle (al cargar y tras iniciar sesión)
  if (location.hash.indexOf('#subasta=') === 0 && cview !== 'auctiondetail') checkAuctionHash();
}

// Respaldo: si ningún evento de auth disparó la carga, intentarlo igual (subastas son públicas)
setTimeout(() => { if (typeof sb !== 'undefined' && sb && !aucChannel) onUserChanged(); }, 1800);

// ══════════════════════════════════════════════════
// MI CUENTA — MÓDULOS estilo "My eBay"
// Direcciones · Configuración · Notificaciones · Seguridad · Mensajes
// Todo persistente en localStorage (y Supabase cuando aplica).
// ══════════════════════════════════════════════════

// ─── Libreta de direcciones ───
function getAddresses()   { return MRD.get(K.ADDRESSES, []); }
function saveAddresses(l) { MRD.set(K.ADDRESSES, l); }
function defaultAddress() {
  const l = getAddresses();
  return l.find(a => a.def) || l[0] || null;
}
function addAddress(a) {
  const l = getAddresses();
  a.id = a.id || (Date.now() + Math.floor(Math.random() * 100000));
  if (a.def) l.forEach(x => x.def = false);
  if (!l.length) a.def = true;
  l.push(a);
  saveAddresses(l);
  return a;
}
function deleteAddress(id) {
  const l = getAddresses().filter(a => a.id !== id);
  if (l.length && !l.some(a => a.def)) l[0].def = true;
  saveAddresses(l);
  renderAddresses();
  showToast('Dirección eliminada');
}
function setDefaultAddress(id) {
  const l = getAddresses();
  l.forEach(a => a.def = (a.id === id));
  saveAddresses(l);
  renderAddresses();
  showToast('Dirección predeterminada actualizada ✓');
}
let editingAddr = null;
function renderAddresses() {
  const l = getAddresses();
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="showView('account')">← Mi cuenta</button>
    <div class="account-panel">
      <div class="section-header" style="margin-bottom:16px">
        <div class="section-title">🚚 Mis direcciones</div>
        <button class="mrd-btn-accent" onclick="openAddrForm()">+ Agregar dirección</button>
      </div>
      <div id="addrFormBox"></div>
      ${!l.length
        ? '<div class="no-results"><div>🚚</div><p>Aún no tienes direcciones guardadas. Agrega una para acelerar tus compras.</p></div>'
        : `<div class="addr-list">${l.map(a => `
          <div class="addr-card${a.def ? ' addr-def' : ''}">
            <div class="addr-main">
              <div class="addr-name">${esc(a.name)} ${a.def ? '<span class="addr-badge">Predeterminada</span>' : ''}</div>
              <div class="addr-line">${esc(a.addr)}</div>
              <div class="addr-line">${esc(a.prov)} · 📞 ${esc(a.phone)}</div>
            </div>
            <div class="addr-actions">
              ${a.def ? '' : `<button class="mrd-link" onclick="setDefaultAddress(${a.id})">Predeterminar</button>`}
              <button class="mrd-link" onclick="openAddrForm(${a.id})">Editar</button>
              <button class="mrd-link mrd-link-danger" onclick="deleteAddress(${a.id})">Eliminar</button>
            </div>
          </div>`).join('')}</div>`}
    </div>`;
}
function openAddrForm(id) {
  editingAddr = id || null;
  const a = id ? getAddresses().find(x => x.id === id) : null;
  const provs = ['Santo Domingo','Distrito Nacional','Santiago','Puerto Plata','La Romana','La Altagracia','San Cristóbal','San Pedro de Macorís','La Vega','Otra'];
  document.getElementById('addrFormBox').innerHTML = `
    <div class="addr-form">
      <div class="form-grid">
        <div class="fg2"><label>Nombre del destinatario *</label><input type="text" id="afName" value="${esc(a?.name || '')}"></div>
        <div class="fg2"><label>Teléfono *</label><input type="tel" id="afPhone" value="${esc(a?.phone || '')}" placeholder="809-000-0000"></div>
        <div class="fg2" style="grid-column:1/-1"><label>Dirección *</label><input type="text" id="afAddr" value="${esc(a?.addr || '')}" placeholder="Calle, número, sector"></div>
        <div class="fg2"><label>Provincia</label><select id="afProv">${provs.map(p => `<option ${a?.prov === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        <label class="co-check" style="grid-column:1/-1"><input type="checkbox" id="afDef" ${a?.def ? 'checked' : ''}> Usar como predeterminada</label>
      </div>
      <div style="display:flex;gap:10px;margin-top:6px">
        <button class="submit-btn" style="width:auto;padding:11px 22px" onclick="saveAddrForm()">Guardar</button>
        <button class="mrd-btn-ghost" onclick="document.getElementById('addrFormBox').innerHTML=''">Cancelar</button>
      </div>
    </div>`;
}
function saveAddrForm() {
  const name  = document.getElementById('afName').value.trim();
  const phone = document.getElementById('afPhone').value.trim();
  const addr  = document.getElementById('afAddr').value.trim();
  const prov  = document.getElementById('afProv').value;
  const def   = document.getElementById('afDef').checked;
  if (name.length < 3 || phone.length < 7 || addr.length < 5) { showToast('Completa nombre, teléfono y dirección'); return; }
  if (editingAddr) {
    const l = getAddresses();
    const a = l.find(x => x.id === editingAddr);
    if (a) {
      Object.assign(a, { name, phone, addr, prov });
      if (def) { l.forEach(x => x.def = false); a.def = true; }
      else { a.def = false; if (l.length && !l.some(x => x.def)) { (l.find(x => x.id !== a.id) || a).def = true; } }
    }
    saveAddresses(l);
  } else {
    addAddress({ name, phone, addr, prov, def });
  }
  editingAddr = null;
  renderAddresses();
  showToast('Dirección guardada ✓');
}

// ─── Configuración del perfil ───
function getProfile() {
  return MRD.get(K.PROFILE, {
    name: user?.user_metadata?.full_name || '',
    phone: user?.user_metadata?.phone || '',
    province: user?.user_metadata?.province || ''
  });
}
function renderSettings() {
  const pf = getProfile();
  const provs = ['','Distrito Nacional','Santo Domingo','Santiago','Puerto Plata','La Romana','San Cristóbal','San Pedro de Macorís','La Vega','La Altagracia','Otra'];
  const email = user?.email || '';
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="showView('account')">← Mi cuenta</button>
    <div class="account-panel">
      <div class="section-title" style="margin-bottom:16px">⚙️ Configuración de la cuenta</div>
      <div class="form-grid">
        <div class="fg2"><label>Nombre para mostrar</label><input type="text" id="stName" value="${esc(pf.name || '')}"></div>
        <div class="fg2"><label>Teléfono</label><input type="tel" id="stPhone" value="${esc(pf.phone || '')}" placeholder="809-000-0000"></div>
        <div class="fg2"><label>Correo (no editable)</label><input type="email" value="${esc(email)}" disabled style="opacity:.6;cursor:not-allowed"></div>
        <div class="fg2"><label>Provincia</label><select id="stProv">${provs.map(p => `<option value="${p}" ${pf.province === p ? 'selected' : ''}>${p || 'Selecciona…'}</option>`).join('')}</select></div>
      </div>
      <button class="submit-btn" style="width:auto;padding:12px 24px;margin-top:6px" onclick="saveSettings()">Guardar cambios</button>
      <p style="font-size:12px;color:var(--text2);margin-top:10px">El correo de acceso no se cambia aquí. Para cambiarlo escribe a soporte@mercadord.net.</p>
    </div>`;
}
async function saveSettings() {
  const name = document.getElementById('stName').value.trim();
  const phone = document.getElementById('stPhone').value.trim();
  const prov = document.getElementById('stProv').value;
  if (name.length < 2) { showToast('Ingresa un nombre válido'); return; }
  MRD.set(K.PROFILE, { name, phone, province: prov });
  if (typeof user !== 'undefined' && user) {
    user.user_metadata = { ...(user.user_metadata || {}), full_name: name, phone, province: prov };
    if (typeof persistUser === 'function') persistUser();
  }
  if (typeof sb !== 'undefined' && sb && user?.id) {
    try {
      await sb.auth.updateUser({ data: { full_name: name, phone, province: prov } });
      await sb.from('profiles').update({ full_name: name }).eq('id', user.id);
    } catch (e) {}
  }
  if (typeof refreshHeader === 'function') refreshHeader();
  showToast('Cambios guardados ✓');
}

// ─── Preferencias de notificación ───
function getNotifPrefs() {
  return MRD.get(K.NOTIFPREFS, { offers: true, bids: true, orders: true, newsletter: true, email: true, push: true });
}
function renderNotifPrefs() {
  const p = getNotifPrefs();
  const row = (key, icon, title, desc) => `
    <label class="pref-row">
      <div class="pref-text"><div class="pref-title">${icon} ${title}</div><div class="pref-desc">${desc}</div></div>
      <span class="switch"><input type="checkbox" id="np_${key}" ${p[key] ? 'checked' : ''} onchange="saveNotifPrefs()"><span class="slider"></span></span>
    </label>`;
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="showView('account')">← Mi cuenta</button>
    <div class="account-panel">
      <div class="section-title" style="margin-bottom:16px">🔔 Preferencias de notificación</div>
      ${row('offers','💰','Ofertas y descuentos','Alertas de ofertas del día y bajadas de precio.')}
      ${row('bids','🔨','Subastas y pujas','Avisos cuando te superan en una puja o ganas un artículo.')}
      ${row('orders','📦','Pedidos y envíos','Estado de tus compras y seguimiento de entregas.')}
      ${row('newsletter','📬','Boletín MercadoRD','Novedades, consejos y lanzamientos.')}
      <div class="pref-divider"></div>
      ${row('email','📧','Por correo','Enviar estas notificaciones a tu email.')}
      ${row('push','📱','En el sitio','Mostrar notificaciones dentro de MercadoRD.')}
    </div>`;
}
function saveNotifPrefs() {
  const keys = ['offers','bids','orders','newsletter','email','push'];
  const p = {}; keys.forEach(k => p[k] = !!document.getElementById('np_' + k)?.checked);
  MRD.set(K.NOTIFPREFS, p);
  showToast('Preferencias guardadas ✓');
}

// ─── Seguridad y acceso ───
function renderSecurity() {
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="showView('account')">← Mi cuenta</button>
    <div class="account-panel">
      <div class="section-title" style="margin-bottom:16px">🔒 Seguridad y acceso</div>
      <div class="sec-card">
        <div class="sec-head">🔑 Cambiar contraseña</div>
        <div class="fg2" style="margin-bottom:10px"><label>Nueva contraseña</label>
          <div class="iicon"><input type="password" id="secPwd" placeholder="Mínimo 8, con mayúscula y número"><span class="eye" onclick="toggleEye('secPwd',this)">👁</span></div>
          <div class="ferr" id="secPwdE"></div>
        </div>
        <button class="submit-btn" style="width:auto;padding:11px 22px" onclick="changePassword()">Actualizar contraseña</button>
      </div>
      <div class="sec-card">
        <div class="sec-head">🛡️ Verificación en dos pasos (2FA)</div>
        <p style="font-size:13px;color:var(--text2);margin-bottom:10px">Agrega una capa extra de seguridad con un código por SMS al iniciar sesión.</p>
        <button class="mrd-btn-ghost" onclick="showToast('2FA por SMS — se activa junto con la verificación de teléfono')">Configurar 2FA</button>
      </div>
      <div class="sec-card">
        <div class="sec-head">💻 Sesión activa</div>
        <p style="font-size:13px;color:var(--text2);margin-bottom:10px">Este dispositivo · ${navigator.platform || 'Navegador'} · sesión iniciada</p>
        <button class="mrd-link mrd-link-danger" onclick="doLogout()">Cerrar sesión en este dispositivo</button>
      </div>
    </div>`;
}
async function changePassword() {
  fe('secPwdE', '');
  const pw = document.getElementById('secPwd').value;
  if (pw.length < 8)      { fe('secPwdE', 'Mínimo 8 caracteres.'); return; }
  if (!/[A-Z]/.test(pw))  { fe('secPwdE', 'Debe tener al menos una mayúscula.'); return; }
  if (!/[0-9]/.test(pw))  { fe('secPwdE', 'Debe tener al menos un número.'); return; }
  if (typeof sb !== 'undefined' && sb) {
    try { const { error } = await sb.auth.updateUser({ password: pw }); if (error) throw error; }
    catch (e) { fe('secPwdE', e.message || 'No se pudo actualizar.'); return; }
  }
  document.getElementById('secPwd').value = '';
  showToast('Contraseña actualizada ✓');
}

// ─── Mensajería comprador-vendedor ───
function getThreads()   { return MRD.get(K.MESSAGES, []); }
function saveThreads(t) { MRD.set(K.MESSAGES, t); }
function threadFor(seller, productTitle) {
  const threads = getThreads();
  let t = threads.find(x => x.seller === seller);
  if (!t) {
    t = { id: Date.now() + Math.floor(Math.random() * 1000), seller, product: productTitle || '', msgs: [] };
    threads.push(t); saveThreads(threads);
  } else if (productTitle && !t.product) {
    t.product = productTitle; saveThreads(threads);
  }
  return t;
}
let activeThread = null;
function renderMessages() {
  const threads = getThreads();
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="showView('account')">← Mi cuenta</button>
    <div class="account-panel">
      <div class="section-title" style="margin-bottom:14px">💬 Mensajes</div>
      ${!threads.length
        ? '<div class="no-results"><div>💬</div><p>No tienes conversaciones. Abre un producto y toca “💬 Contactar” para escribirle al vendedor.</p></div>'
        : `<div class="msg-threads">${threads.slice().reverse().map(t => {
            const last = t.msgs[t.msgs.length - 1];
            return `<div class="msg-thread" onclick="openThread(${t.id})">
              <div class="msg-avatar">${esc((t.seller || '?')[0])}</div>
              <div class="msg-thread-main">
                <div class="msg-thread-name">${esc(t.seller)}</div>
                <div class="msg-thread-last">${last ? (last.from === 'me' ? 'Tú: ' : '') + esc(last.text.slice(0, 46)) : 'Sin mensajes'}</div>
              </div>
            </div>`;
          }).join('')}</div>`}
    </div>`;
}
function openThread(id) {
  const t = getThreads().find(x => x.id === id);
  if (!t) return;
  activeThread = id;
  cview = 'messages';
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="renderMessages()">← Mensajes</button>
    <div class="account-panel msg-panel">
      <div class="msg-chat-head"><div class="msg-avatar">${esc((t.seller || '?')[0])}</div><div><div class="msg-thread-name">${esc(t.seller)}</div>${t.product ? `<div class="msg-thread-last">Sobre: ${esc(t.product)}</div>` : ''}</div></div>
      <div class="msg-body" id="msgBody">${t.msgs.map(renderMsg).join('') || '<div class="bf-empty" style="margin:20px 0">Escribe el primer mensaje 👇</div>'}</div>
      <div class="msg-compose">
        <input type="text" id="msgInput" placeholder="Escribe un mensaje…" onkeydown="if(event.key==='Enter')sendMessage()">
        <button class="mrd-btn-accent" onclick="sendMessage()">Enviar</button>
      </div>
    </div>`;
  const b = document.getElementById('msgBody'); if (b) b.scrollTop = b.scrollHeight;
}
function renderMsg(m) {
  return `<div class="msg-bubble ${m.from === 'me' ? 'msg-me' : 'msg-them'}">${esc(m.text)}<span class="msg-time">${relTime(m.at)}</span></div>`;
}
function sendMessage() {
  const inp = document.getElementById('msgInput');
  const text = (inp.value || '').trim();
  if (!text) return;
  const threads = getThreads();
  const t = threads.find(x => x.id === activeThread);
  if (!t) return;
  t.msgs.push({ from: 'me', text, at: new Date().toISOString() });
  saveThreads(threads);
  inp.value = '';
  openThread(activeThread);
  // Respuesta automática del vendedor (demo)
  setTimeout(() => {
    const th = getThreads(); const tt = th.find(x => x.id === activeThread); if (!tt) return;
    const replies = ['¡Hola! Sí, está disponible 😊', 'Gracias por tu interés. ¿Para cuándo lo necesitas?', 'Puedo coordinar la entrega esta semana.', 'Claro, te confirmo en un momento.'];
    tt.msgs.push({ from: 'them', text: replies[Math.floor(Math.random() * replies.length)], at: new Date().toISOString() });
    saveThreads(th);
    if (activeThread === tt.id && cview === 'messages') openThread(tt.id);
  }, 1200);
}
let pendingContact = null;   // producto pendiente de contactar tras iniciar sesión
function contactSellerById(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  if (!user) { pendingContact = id; pending = 'messages'; openAuth('login'); showAlert('info', 'Inicia sesión para escribirle al vendedor.'); return; }
  const t = threadFor(p.seller, p.title);
  cview = 'messages';
  document.getElementById('heroBanner').style.display = 'none';
  closeSubsection();
  openThread(t.id);
}

// ══════════════════════════════════════════════════
// ACCESIBILIDAD (WCAG 2.2 AA) — añadidos no intrusivos
// ══════════════════════════════════════════════════

// Newsletter: valida el correo y lo guarda localmente (antes era un toast de éxito falso)
function subscribeNewsletter() {
  const el = document.getElementById('nlEmail');
  const v  = ((el && el.value) || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { showToast('Ingresa un correo válido 📧'); if (el) el.focus(); return; }
  try {
    const subs = JSON.parse(localStorage.getItem('mrd_newsletter') || '[]');
    if (!subs.includes(v)) { subs.push(v); localStorage.setItem('mrd_newsletter', JSON.stringify(subs)); }
  } catch (_) {}
  if (el) el.value = '';
  showToast('¡Suscrito! 🎉 Te avisaremos de ofertas y subastas nuevas');
}

// Cerrar con Escape el modal/panel que esté abierto (de más reciente a más antiguo)
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' && e.keyCode !== 27) return;
  const isOpen = el => el && getComputedStyle(el).display !== 'none';
  const offer = document.getElementById('offerOverlay');
  const bid   = document.getElementById('bidOverlay');
  const ver   = document.getElementById('verificationOverlay');
  const legal = document.getElementById('legalOverlay');
  const auth  = document.getElementById('authOverlay');
  const cart  = document.getElementById('cartOverlay');
  const sub   = [...document.querySelectorAll('.subsection-overlay')].find(isOpen);
  if (isOpen(offer)) return closeOffer();
  if (isOpen(bid))   return closeBid();
  if (isOpen(ver) && typeof closeVerification === 'function') return closeVerification();
  if (sub && typeof closeSubsection === 'function') return closeSubsection();
  if (isOpen(legal)) { legal.style.display = 'none'; return; }
  if (isOpen(auth) && typeof cancelAuth === 'function') return cancelAuth();
  if (isOpen(cart) && typeof toggleCart === 'function') return toggleCart();
  const np = document.getElementById('notifPanel');
  if (isOpen(np)) { np.style.display = 'none'; }
});

// Activar con Enter/Espacio cualquier control no nativo enfocable (div/span/<a> sin href con onclick o rol)
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
  const t = e.target;
  if (!t || !t.matches) return;
  const native = t.tagName === 'BUTTON' || (t.tagName === 'A' && t.hasAttribute('href')) ||
                 t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
  if (native) return;
  const interactive = t.hasAttribute('onclick') || t.getAttribute('role') === 'button' || t.getAttribute('role') === 'link';
  if (interactive && t.tabIndex >= 0) { e.preventDefault(); t.click(); }
});

// Marcar diálogos para lectores de pantalla y hacer alcanzables por teclado los controles no nativos
(function a11yEnhance() {
  [['authOverlay', 'Cuenta'], ['legalOverlay', 'Información'], ['verificationOverlay', 'Verificación de identidad'],
   ['bidOverlay', 'Hacer una puja'], ['offerOverlay', 'Hacer una oferta'], ['cartOverlay', 'Carrito de compras']]
    .forEach(([id, label]) => {
      const el = document.getElementById(id);
      if (el) { el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', label); }
    });
  document.querySelectorAll('.subsection-overlay').forEach(el => {
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  });
  document.querySelectorAll('.nav-item, .scat').forEach(el => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role'))     el.setAttribute('role', 'button');
  });
  // Enlaces del footer (sin href), encabezados de columna y tarjetas: alcanzables por teclado
  document.querySelectorAll('.footer a[onclick]:not([href]), .footer-col h4[onclick], .footer-badge-link[onclick], .app-btn[onclick], .social-btn[onclick]').forEach(el => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role'))     el.setAttribute('role', 'link');
  });
  const badge = document.getElementById('notifBadge');
  if (badge) { badge.setAttribute('aria-live', 'polite'); badge.setAttribute('role', 'status'); }
})();
