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
  verificationStatus: 'none', // 'none' | 'pending' | 'verified' | 'rejected'
  roleType: null
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
  if (p.img) return `<img src="${p.img}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover">`;
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
  restoreHome();
  catScats().forEach((x, i) => x.classList.toggle('active', i === 0));
  document.querySelectorAll('.nav-item').forEach((x, i) => x.classList.toggle('active', i === 0));
  acat = 'all';
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
  if (cview !== 'home') { cview = 'home'; goHome(); } else renderProducts();
}

function filterCat(cat, el) {
  acat = cat;
  catScats().forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  if (cview !== 'home') { cview = 'home'; goHome(); } else renderProducts();
}

function filterCond(c, el) {
  el.classList.toggle('active');
  fconds.has(c) ? fconds.delete(c) : fconds.add(c);
  if (cview !== 'home') { cview = 'home'; goHome(); } else renderProducts();
}

function filterLoc(l, el) {
  el.classList.toggle('active');
  flocs.has(l) ? flocs.delete(l) : flocs.add(l);
  if (cview !== 'home') { cview = 'home'; goHome(); } else renderProducts();
}

function filterPrice(v) {
  pmax = parseInt(v);
  document.getElementById('priceOut').textContent = fmt(parseInt(v));
  if (cview !== 'home') { cview = 'home'; goHome(); } else renderProducts();
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
            <div class="product-title">${p.title}</div>
            <div class="product-seller">🏪 ${p.seller}</div>
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
  const mt = document.getElementById('mainTabs');
  if (mt) mt.style.display = 'none';
  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="backProd()">← Volver</button>
    <div class="detail-panel">
      <div class="detail-img-area" style="overflow:hidden">${prodImg(p, true)}</div>
      <div class="detail-title">${p.title}</div>
      <div>
        <span class="detail-price">${fmt(p.price)}</span>
        ${p.old ? `<span style="font-size:14px;color:var(--text2);text-decoration:line-through;margin-left:8px">${fmt(p.old)}</span>` : ''}
      </div>
      <div class="detail-meta">
        <span>📍 ${p.loc}</span>
        <span>📦 ${p.cond === 'new' ? 'Nuevo' : p.cond === 'used' ? 'Usado' : 'Reacondicionado'}</span>
        <span>⭐ ${p.rating} (${p.reviews})</span>
        <span>🚚 Envío RD</span>
        <span>🔒 Compra segura</span>
      </div>
      <div class="detail-desc">
        ${p.desc || 'Producto disponible para entrega en todo RD. Garantía incluida. Acepta tarjeta y efectivo.'}
      </div>
      <div class="detail-actions">
        <button class="btn-buy"   onclick="buyNow(${p.id})">Comprar ahora</button>
        <button class="btn-cart2" onclick="addCart(${p.id})">Añadir al carrito</button>
        <button class="btn-cart2" onclick="tryOffer(${p.id})" style="border-color:var(--primary);color:var(--primary)">💰 Hacer oferta</button>
        <button class="btn-fav2"  onclick="toggleFav(${p.id},this)" aria-label="Favorito">${favs.has(p.id) ? '❤️' : '♡'}</button>
      </div>
      <div class="seller-card">
        <div class="seller-avatar">${p.seller[0]}</div>
        <div>
          <div style="font-size:14px;font-weight:600">${p.seller}</div>
          <div style="font-size:12px;color:var(--text2)">⭐ ${p.rating || '—'} · ${p.mine ? 'Tu anuncio' : 'Vendedor'}</div>
        </div>
        <button style="margin-left:auto;padding:7px 14px;border:1px solid var(--border);border-radius:6px;background:none;cursor:pointer;font-size:13px;font-family:'Sora',sans-serif"
                onclick="requireAuth('chat')">💬 Contactar</button>
      </div>
    </div>`;
}

function backProd() {
  cview = 'home';
  restoreHome();
  renderProducts();
}

// ─── Comprar ahora: añade al carrito y va directo al checkout ───
function buyNow(id) {
  addCart(id, true);
  requireAuth('checkout');
}

// ─── Vistas ───
function showView(v) {
  if (v === 'bid') v = 'auctions';
  cview = v;
  document.getElementById('heroBanner').style.display = 'none';
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

function renderAuctions() {
  clearInterval(aucTimer);
  document.getElementById('contentArea').innerHTML = `
    <div class="section-header" style="margin-bottom:18px">
      <div class="section-title">🔥 Subastas Activas en RD</div>
      <button onclick="requireAuth('sell')"
        style="background:var(--accent);color:#fff;border:none;padding:7px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
        + Subastar producto
      </button>
    </div>
    ${auctions.map(a => {
      const left = aucLeft(a);
      const over = !left;
      return `
      <div class="auction-card"${over ? ' style="opacity:.6"' : ''}>
        <div class="auction-img">${a.icon}</div>
        <div class="auction-info">
          <div class="auction-title">${a.title} ${a.myBid && !over ? '<span style="font-size:11px;background:#e6f4ea;color:var(--green,#0a8a4a);padding:2px 8px;border-radius:10px;font-weight:600">🏆 Vas ganando</span>' : ''}${a.sold ? ' <span style="font-size:11px;background:#fdecea;color:#c0392b;padding:2px 8px;border-radius:10px;font-weight:600">VENDIDO</span>' : ''}</div>
          <div class="auction-meta">📍 ${a.loc} · <strong>${a.seller}</strong></div>
          <div class="auction-bids">👥 <span class="auc-bids" data-id="${a.id}">${a.bids}</span> pujas · ⏰ <strong style="color:var(--accent)" class="auc-count" data-id="${a.id}">${over ? (a.sold ? 'Comprado ya ⚡' : 'Finalizada') : left}</strong></div>
          <div class="auction-price-row">
            <div>
              <div style="font-size:11px;color:var(--text2)">Puja actual</div>
              <div class="auction-price auc-cur" data-id="${a.id}">${fmt(a.cur)}</div>
            </div>
            ${over ? '' : a.mine
              ? '<span style="font-size:12px;color:var(--text2);font-weight:600">🏷️ Tu subasta</span>'
              : `
            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
              <button class="bid-btn" style="background:var(--primary)" onclick="tryBuyNow(${a.id})">⚡ ¡Cómpralo ya! ${fmt(a.buy)}</button>
              <button class="bid-btn" onclick="tryBid(${a.id})">Pujar →</button>
            </div>`}
          </div>
        </div>
      </div>`;
    }).join('')}`;
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
  const a = auctions.find(x => x.id === id);
  if (!a) return;
  if (!aucLeft(a)) { showToast('Esta subasta ya finalizó'); renderAuctions(); return; }
  bidAucId = id;
  const min = a.cur + bidStep(a);
  document.getElementById('bidItemTitle').textContent = `${a.icon} ${a.title}`;
  document.getElementById('bidCur').textContent   = fmt(a.cur);
  document.getElementById('bidCount').textContent = a.bids;
  document.getElementById('bidEnds').textContent  = aucLeft(a);
  document.getElementById('bidMin').textContent   = fmt(min);
  const inp = document.getElementById('bidAmount');
  inp.value = min;
  inp.min = min;
  fe('bidErr', '');
  document.getElementById('bidOverlay').style.display = 'flex';
}

function closeBid() { document.getElementById('bidOverlay').style.display = 'none'; }

function placeBid() {
  const a = auctions.find(x => x.id === bidAucId);
  if (!a) return;
  if (!aucLeft(a)) { closeBid(); showToast('La subasta finalizó'); renderAuctions(); return; }
  const amt = parseFloat(document.getElementById('bidAmount').value);
  const min = a.cur + bidStep(a);
  if (!amt || amt < min) { fe('bidErr', 'Tu puja debe ser de al menos ' + fmt(min)); return; }
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
function tryBuyNow(id) {
  const a = auctions.find(x => x.id === id);
  if (!a) return;
  if (!user) {
    pending = 'auctions';
    openAuth('login');
    showAlert('info', 'Inicia sesión para usar ¡Cómpralo ya!');
    return;
  }
  if (!aucLeft(a)) { showToast('Esta subasta ya finalizó'); renderAuctions(); return; }
  a.sold = true;
  a.endAt = Date.now();
  saveAuctions();
  cart.push({ id: 90000 + a.id, title: a.title + ' (¡Cómpralo ya!)', price: a.buy, icon: a.icon, img: null, qty: 1 });
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
      <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Vendedor</span><strong>${p.seller}</strong></div>
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
      <div class="vc-desc"><strong>${p.seller}</strong> aceptó tu oferta de <strong>${fmt(amt)}</strong>. El producto ya está en tu carrito con el precio negociado.</div></div>
      <button class="auth-btn btn-pri" onclick="closeOffer();requireAuth('checkout')">Ir al checkout →</button>
      <button class="auth-btn" style="background:#f0f3f8;color:var(--text2);margin-top:10px" onclick="closeOffer()">Seguir comprando</button>`;
  } else if (ratio >= 0.7) {
    const counter = Math.round(p.price * 0.95);
    body.innerHTML = `
      <div class="vc"><div class="vc-icon">🤝</div><div class="vc-title">Contraoferta del vendedor</div>
      <div class="vc-desc"><strong>${p.seller}</strong> no acepta ${fmt(amt)}, pero te ofrece el artículo por <strong>${fmt(counter)}</strong>.</div></div>
      <button class="auth-btn btn-pri" onclick="acceptCounter(${counter})">Aceptar ${fmt(counter)} ✓</button>
      <button class="auth-btn" style="background:#f0f3f8;color:var(--text2);margin-top:10px" onclick="openOffer(${p.id})">Hacer otra oferta</button>`;
  } else {
    body.innerHTML = `
      <div class="vc"><div class="vc-icon">😕</div><div class="vc-title">Oferta rechazada</div>
      <div class="vc-desc"><strong>${p.seller}</strong> rechazó tu oferta de ${fmt(amt)} por estar muy por debajo del precio publicado.</div></div>
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
              <div class="product-title">${p.title}</div>
              <div class="product-seller">🏪 ${p.seller}</div>
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
      <p style="font-size:13px;color:var(--text2);margin-bottom:16px">Hola <strong>${name}</strong> — ${userState.verified ? 'Vendedor verificado ✓' : 'Identidad sin verificar'}</p>
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
      <p style="font-size:13px;color:var(--text2);margin-bottom:20px">Hola <strong>${uname}</strong> — ${userState.verified ? 'Cuenta verificada ✓' : 'Verificación pendiente ⏳'}</p>
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
        <div class="photo-area" id="sellPhotoArea" onclick="document.getElementById('sellPhotoInput').click()">
          <div style="font-size:30px;margin-bottom:8px" id="sellPhotoIcon">📷</div>
          <strong id="sellPhotoLabel">Subir foto principal</strong>
          <div style="font-size:12px;margin-top:4px">JPG, PNG · 5MB máx (opcional)</div>
          <img id="sellPhotoPreview" style="display:none;max-height:140px;border-radius:8px;margin-top:10px" alt="Vista previa">
        </div>
        <input type="file" id="sellPhotoInput" accept="image/*" style="display:none" onchange="handleSellPhoto(this)">
        <button type="submit" class="submit-btn">✓ Publicar gratis</button>
      </form>
    </div>`;
}

function handleSellPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('La imagen supera 5MB'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = e => {
    sellImgData = e.target.result;
    const prev = document.getElementById('sellPhotoPreview');
    prev.src = sellImgData;
    prev.style.display = 'inline-block';
    document.getElementById('sellPhotoLabel').textContent = '✓ ' + file.name;
    showToast('Foto cargada ✓');
  };
  reader.readAsDataURL(file);
}

function publishProduct() {
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
    auctions.push({
      id: Date.now(),
      title,
      icon: catIcons[cat] || '📦',
      cur: Math.round(price),
      bids: 0,
      buy: Math.round(price * 1.35),
      seller: sellerName,
      loc,
      endAt: Date.now() + 3 * 24 * 60 * 60 * 1000,
      mine: true
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
            <div class="auction-title">${p.title}</div>
            <div class="auction-meta">📍 ${p.loc} · Publicado ${new Date(p.createdAt || Date.now()).toLocaleDateString('es-DO')}</div>
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

  document.getElementById('contentArea').innerHTML = `
    <button class="back-btn" onclick="goHome()">← Seguir comprando</button>
    <div class="sell-form">
      <h2 style="font-size:20px;font-weight:700;margin-bottom:18px">💳 Finalizar compra</h2>

      <div style="background:#f8f9fc;border-radius:8px;padding:14px;margin-bottom:18px">
        ${cart.map(c => `
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)">
            <span>${c.title.slice(0, 38)}${c.title.length > 38 ? '…' : ''} × ${c.qty}</span>
            <strong>${fmt(c.price * c.qty)}</strong>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0"><span>Envío</span><span>RD$350</span></div>
        <div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0"><span>ITBIS (18%)</span><span>${fmt(itbis)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:var(--primary);padding-top:8px;border-top:1px solid var(--border)"><span>Total</span><span>${fmt(total)}</span></div>
      </div>

      <form id="checkoutForm" onsubmit="event.preventDefault();confirmOrder()">
        <div class="form-grid">
          <div class="fg2"><label for="coName">Nombre completo *</label><input type="text" id="coName" value="${user?.user_metadata?.full_name || ''}" required></div>
          <div class="fg2"><label for="coPhone">Teléfono *</label><input type="tel" id="coPhone" placeholder="809-000-0000" required></div>
          <div class="fg2" style="grid-column:1/-1"><label for="coAddr">Dirección de entrega *</label><input type="text" id="coAddr" placeholder="Calle, número, sector" required></div>
          <div class="fg2"><label for="coProv">Provincia *</label>
            <select id="coProv"><option>Santo Domingo</option><option>Distrito Nacional</option><option>Santiago</option><option>Puerto Plata</option><option>La Romana</option><option>La Altagracia</option><option>Otra</option></select>
          </div>
          <div class="fg2"><label for="coPay">Método de pago *</label>
            <select id="coPay">
              <option value="cash">💵 Efectivo contra entrega</option>
              <option value="transfer">🏦 Transferencia bancaria</option>
              <option value="card" disabled>💳 Tarjeta (Cardnet/Azul) — próximamente</option>
              <option value="mpago" disabled>📱 mPago — próximamente</option>
            </select>
          </div>
        </div>
        <div class="verification-info-box" style="margin:14px 0">
          ℹ️ El pago en línea con <strong>Cardnet / Azul / mPago</strong> se activará al conectar la pasarela. Por ahora el pedido se registra para coordinación directa.
        </div>
        <button type="submit" class="submit-btn">Confirmar pedido · ${fmt(total)}</button>
      </form>
    </div>`;
  document.getElementById('cartOverlay').style.display = 'none';
}

function confirmOrder() {
  const name  = document.getElementById('coName').value.trim();
  const phone = document.getElementById('coPhone').value.trim();
  const addr  = document.getElementById('coAddr').value.trim();
  if (name.length < 3 || phone.length < 7 || addr.length < 5) {
    showToast('Completa todos los campos de entrega');
    return;
  }

  const sub   = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const itbis = Math.round(sub * 0.18);
  const order = {
    id: 'MRD-' + Date.now().toString(36).toUpperCase(),
    items: cart.map(c => ({ id: c.id, title: c.title, qty: c.qty, price: c.price })),
    subtotal: sub, shipping: 350, itbis, total: sub + 350 + itbis,
    buyer: { name, phone, addr, prov: document.getElementById('coProv').value },
    payment: document.getElementById('coPay').value,
    status: 'pendiente',
    date: new Date().toISOString()
  };
  orders.push(order);
  saveOrders();

  cart = [];
  saveCart();
  updateCartBadge();

  document.getElementById('contentArea').innerHTML = `
    <div class="sell-form" style="text-align:center;padding:50px 30px">
      <div style="font-size:60px;margin-bottom:14px">✅</div>
      <h2 style="font-size:22px;font-weight:700;margin-bottom:8px">¡Pedido confirmado!</h2>
      <p style="font-size:14px;color:var(--text2);margin-bottom:6px">Número de pedido: <strong style="color:var(--primary)">${order.id}</strong></p>
      <p style="font-size:13px;color:var(--text2);margin-bottom:24px">Total: <strong>${fmt(order.total)}</strong> · Te contactaremos al ${phone} para coordinar la entrega.</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="submit-btn" style="width:auto;padding:13px 26px" onclick="showView('orders')">Ver mis compras</button>
        <button class="submit-btn" style="width:auto;padding:13px 26px;background:var(--primary)" onclick="goHome()">Seguir comprando</button>
      </div>
    </div>`;
  showToast('Pedido ' + order.id + ' registrado 🎉');
}

function renderOrders() {
  const statusLabel = { pendiente:'⏳ Pendiente', enviado:'🚚 Enviado', entregado:'✅ Entregado' };
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
            <div class="auction-meta">${o.items.map(i => `${i.title.slice(0, 30)} ×${i.qty}`).join(' · ')}</div>
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
          <div style="font-size:20px;font-weight:700">${name}</div>
          <div style="font-size:13px;color:var(--text2)">${email}</div>
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
        ${[['⚙️','Configuración',"showToast('Configuración: próximamente')"],
           ['💳','Métodos de pago',"openInfo('payments')"],
           ['🚚','Direcciones',"showToast('Direcciones: próximamente')"],
           ['🔔','Notificaciones',"showToast('Notificaciones: próximamente')"],
           ['🛡️','Protección al comprador',"openInfo('protection')"],
           ['🔒','Seguridad y 2FA',"showToast('Seguridad y 2FA: próximamente')"],
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
        <div class="cart-item-title">${c.title}</div>
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
      <div class="payment-icons">💵 Efectivo &nbsp; 🏦 Transferencia &nbsp; 💳 Tarjeta (próx.)</div>
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
function openBuyers()  { document.getElementById('buyersSection').classList.add('show'); }
function openSellers() { document.getElementById('sellersSection').classList.add('show'); }
function openAbout()   { document.getElementById('aboutSection').classList.add('show'); }
function openContact() { document.getElementById('contactSection').classList.add('show'); }
function closeSubsection() {
  document.querySelectorAll('.subsection-overlay').forEach(el => el.classList.remove('show'));
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('subsection-overlay')) closeSubsection();
});

// ─── Carrusel ───
let carouselState = { tab: 'deals', index: 0, autoScrollTimer: null };

function getCarouselData() {
  if (carouselState.tab === 'deals')    return products.filter(p => p.badge === 'deal' || p.old).slice(0, 12);
  if (carouselState.tab === 'auctions') return auctions.slice(0, 12);
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
  document.getElementById('verificationOverlay').classList.add('show');
  verificationData = { docType: null, docNumber: null, fullName: null, docFile: null, faceCapture: null, timestamp: null, reason };
  showVerificationStep(1);
}

function closeVerification() {
  document.getElementById('verificationOverlay').classList.remove('show');
  resetCamera();
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

function handleDocUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { showToast('El archivo es demasiado grande (máximo 10MB)'); return; }
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

  // En producción: subir docFile y faceCapture a Supabase Storage
  // e insertar registro en la tabla `verifications` con estado 'pending'.
  userState.verified = true;            // demo: aprobación inmediata
  userState.verificationStatus = 'pending';
  saveUserState();
  refreshHeader();

  resetCamera();
  document.querySelectorAll('.verification-step-container').forEach(s => s.style.display = 'none');
  document.getElementById('verificationSuccess').style.display = 'block';
  showToast('✅ Verificación enviada correctamente');

  const reason = verificationData.reason;
  if (reason === 'sell' || reason === 'bid') {
    setTimeout(() => { closeVerification(); showView(reason === 'bid' ? 'auctions' : 'sell'); }, 1200);
  }
}

// ─── Legal modal ───
function openLegal(key) {
  const c = legalContent[key];
  if (!c) return;
  document.getElementById('legalTitle').textContent = c.title;
  document.getElementById('legalBody').innerHTML    = c.body;
  document.getElementById('legalOverlay').style.display = 'flex';
}
document.getElementById('legalOverlay').addEventListener('click', e => {
  if (e.target.id === 'legalOverlay') document.getElementById('legalOverlay').style.display = 'none';
});

// ─── Info modal (reutiliza el modal legal para las secciones informativas) ───
function openInfo(key) {
  const c = infoContent[key];
  if (!c) return;
  closeSubsection();
  document.getElementById('legalTitle').textContent = c.title;
  document.getElementById('legalBody').innerHTML    = c.body;
  document.getElementById('legalOverlay').style.display = 'flex';
}

// Cerrar modales de puja/oferta al hacer clic fuera
['bidOverlay', 'offerOverlay'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target.id === id) e.target.style.display = 'none';
  });
});

// ─── Init ───
cview = 'home';
updateCartBadge();
refreshHeader();
doRender();
renderCarousel();
resetCarouselAutoScroll();
