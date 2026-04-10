// ═══════════════════════════════════════════════════
//  MercadoRD — Lógica principal de la aplicación
//  Archivo: js/app.js
// ═══════════════════════════════════════════════════

// ─── Estado ───
let cart  = [];
let pmax  = 200000;
let acat  = 'all';
let stxt  = '';
let favs  = new Set();
let cview = 'home';
let userState = {
  loggedIn: false,
  verified: false,
  verificationStatus: 'none', // 'none' | 'pending' | 'verified' | 'rejected'
  roleType: null  // 'buyer' | 'seller' | null
};

// Simulación de estado de usuario (en producción sería de base de datos)
let verificationData = {
  docType: null,
  docNumber: null,
  fullName: null,
  docFile: null,
  faceCapture: null,
  timestamp: null
};

// ─── Utils ───
function fmt(n) { return 'RD$' + Math.round(n).toLocaleString('es-DO'); }

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

function goHome() {
  cview = 'home';
  document.getElementById('heroBanner').style.display = '';
  restoreHome();
  document.querySelectorAll('.scat').forEach((x,i)  => x.classList.toggle('active', i===0));
  document.querySelectorAll('.nav-item').forEach((x,i) => x.classList.toggle('active', i===0));
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
  document.querySelectorAll('.scat').forEach((x,i) => x.classList.toggle('active', i===idx));
  doRender();
}

function setTab(el) {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  renderProducts();
}

// ─── Filtros ───
function filterProducts() {
  stxt = document.getElementById('searchInput').value;
  if (cview !== 'home') { cview='home'; goHome(); } else renderProducts();
}

function filterCat(cat, el) {
  acat = cat;
  document.querySelectorAll('.scat').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  if (cview !== 'home') { cview='home'; goHome(); } else renderProducts();
}

function filterPrice(v) {
  pmax = parseInt(v);
  document.getElementById('priceOut').textContent = fmt(parseInt(v));
  if (cview !== 'home') { cview='home'; goHome(); } else renderProducts();
}

// ─── Render productos ───
function renderProducts() {
  if (cview !== 'home') { cview='home'; goHome(); return; }
  doRender();
}

function doRender() {
  const area = document.getElementById('productArea');
  if (!area) return;

  const fp = products.filter(p => {
    const mc = acat === 'all' || p.cat === acat;
    const mp = p.price <= pmax;
    const ms = !stxt || p.title.toLowerCase().includes(stxt.toLowerCase()) || p.seller.toLowerCase().includes(stxt.toLowerCase());
    return mc && mp && ms;
  });

  if (!fp.length) {
    area.innerHTML = '<div class="no-results"><div>🔍</div><p>No se encontraron productos.</p></div>';
    return;
  }

  area.innerHTML = `
    <div class="section-header">
      <div class="section-title">${fp.length} producto${fp.length !== 1 ? 's' : ''}</div>
      <select class="sort-select" onchange="doRender()">
        <option>Relevancia</option>
        <option>Menor precio</option>
        <option>Mayor precio</option>
        <option>Mejor calificados</option>
      </select>
    </div>
    <div class="products-grid">
      ${fp.map(p => `
        <div class="product-card" onclick="showDetail(${p.id})">
          <div class="product-img">
            ${p.badge==='new'  ? '<div class="badge badge-new">NUEVO</div>' : ''}
            ${p.badge==='hot'  ? '<div class="badge badge-hot">🔥 HOT</div>' : ''}
            ${p.badge==='deal' ? '<div class="badge badge-deal">OFERTA</div>' : ''}
            <div class="fav-btn" onclick="event.stopPropagation();toggleFav(${p.id},this)">
              ${favs.has(p.id) ? '❤️' : '♡'}
            </div>
            ${p.icon}
          </div>
          <div class="product-info">
            <div class="product-title">${p.title}</div>
            <div class="product-seller">🏪 ${p.seller}</div>
            <div>
              <span class="product-price">${fmt(p.price)}</span>
              ${p.old ? `<span class="product-price-old">${fmt(p.old)}</span><span class="product-discount">-${Math.round((1-p.price/p.old)*100)}%</span>` : ''}
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
      <div class="detail-img-area">${p.icon}</div>
      <div class="detail-title">${p.title}</div>
      <div>
        <span class="detail-price">${fmt(p.price)}</span>
        ${p.old ? `<span style="font-size:14px;color:var(--text2);text-decoration:line-through;margin-left:8px">${fmt(p.old)}</span>` : ''}
      </div>
      <div class="detail-meta">
        <span>📍 ${p.loc}</span>
        <span>📦 ${p.cond==='new'?'Nuevo':p.cond==='used'?'Usado':'Reacondicionado'}</span>
        <span>⭐ ${p.rating} (${p.reviews})</span>
        <span>🚚 Envío RD</span>
        <span>🔒 Compra segura</span>
      </div>
      <div class="detail-desc">
        Producto disponible para entrega en todo RD. Garantía incluida.
        Acepta BHD, Popular, BanReservas, tarjeta y efectivo.
      </div>
      <div class="detail-actions">
        <button class="btn-buy"   onclick="requireAuth('buy')">Comprar ahora</button>
        <button class="btn-cart2" onclick="addCart(${p.id})">Añadir al carrito</button>
        <button class="btn-fav2"  onclick="toggleFav(${p.id},this)">${favs.has(p.id)?'❤️':'♡'}</button>
      </div>
      <div class="seller-card">
        <div class="seller-avatar">${p.seller[0]}</div>
        <div>
          <div style="font-size:14px;font-weight:600">${p.seller}</div>
          <div style="font-size:12px;color:var(--text2)">⭐ 4.9 · Verificado ✓</div>
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

// ─── Vistas (subastas, vender, cuenta) ───
function showView(v) {
  cview = v;
  document.getElementById('heroBanner').style.display = 'none';

  if (v === 'auctions') {
    document.getElementById('contentArea').innerHTML = `
      <div class="section-header" style="margin-bottom:18px">
        <div class="section-title">🔥 Subastas Activas en RD</div>
        <button onclick="requireAuth('sell')"
          style="background:var(--accent);color:#fff;border:none;padding:7px 16px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">
          + Subastar producto
        </button>
      </div>
      ${auctions.map(a => `
        <div class="auction-card">
          <div class="auction-img">${a.icon}</div>
          <div class="auction-info">
            <div class="auction-title">${a.title}</div>
            <div class="auction-meta">📍 ${a.loc} · <strong>${a.seller}</strong></div>
            <div class="auction-bids">👥 ${a.bids} pujas · ⏰ <strong style="color:var(--accent)">${a.ends}</strong></div>
            <div class="auction-price-row">
              <div>
                <div style="font-size:11px;color:var(--text2)">Puja actual</div>
                <div class="auction-price">${fmt(a.cur)}</div>
              </div>
              <button class="bid-btn" onclick="requireAuth('bid')">Pujar →</button>
            </div>
          </div>
        </div>`).join('')}`;

  } else if (v === 'sell') {
    const uname = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'usuario';
    document.getElementById('contentArea').innerHTML = `
      <div class="sell-form">
        <h2 style="font-size:20px;font-weight:700;margin-bottom:4px">📦 Publicar un anuncio</h2>
        <p style="font-size:13px;color:var(--text2);margin-bottom:20px">Hola <strong>${uname}</strong> — Cuenta verificada ✓</p>
        <div class="form-grid">
          <div class="fg2"><label>Título *</label><input type="text" placeholder="Describe tu producto"></div>
          <div class="fg2"><label>Precio (RD$) *</label><input type="number" placeholder="0.00"></div>
          <div class="fg2"><label>Categoría *</label>
            <select><option>Electrónica</option><option>Vehículos</option><option>Moda</option><option>Hogar</option><option>Deportes</option><option>Servicios</option></select>
          </div>
          <div class="fg2"><label>Condición *</label>
            <select><option>Nuevo</option><option>Usado – Como nuevo</option><option>Usado – Buen estado</option><option>Reacondicionado</option></select>
          </div>
          <div class="fg2"><label>Tipo de anuncio</label>
            <select><option>Precio fijo</option><option>Subasta</option><option>Mejor oferta</option></select>
          </div>
          <div class="fg2"><label>Provincia</label>
            <select><option>Santo Domingo</option><option>Santiago</option><option>Puerto Plata</option><option>La Romana</option></select>
          </div>
        </div>
        <div class="fg2" style="margin-bottom:14px">
          <label>Descripción</label>
          <textarea placeholder="Describe el producto, estado, qué incluye..."></textarea>
        </div>
        <div class="photo-area" onclick="showToast('Subida de fotos próximamente 📷')">
          <div style="font-size:30px;margin-bottom:8px">📷</div>
          <strong>Subir fotos</strong>
          <div style="font-size:12px;margin-top:4px">Hasta 10 imágenes · JPG, PNG · 5MB máx</div>
        </div>
        <button class="submit-btn" onclick="showToast('¡Anuncio publicado! 🎉')">✓ Publicar gratis</button>
      </div>`;

  } else if (v === 'account') {
    const name  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
    const email = user?.email || '';
    const ini   = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('contentArea').innerHTML = `
      <div class="account-panel">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--border)">
          <div style="width:64px;height:64px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700">${ini}</div>
          <div>
            <div style="font-size:20px;font-weight:700">${name}</div>
            <div style="font-size:13px;color:var(--text2)">${email}</div>
            <div style="font-size:12px;color:var(--green);margin-top:4px">✓ Email · 📱 Teléfono · 🪪 Identidad — Todo verificado</div>
          </div>
        </div>
        <div class="stats-grid">
          ${[['📦','Compras','12'],['🏷️','Ventas','8'],['❤️','Favoritos',favs.size],
             ['⏰','Subastas','3'],['💬','Mensajes','2'],['⭐','Reseñas','87']].map(([i,l,n]) => `
            <div class="stat-box" onclick="showToast('${l}: próximamente')">
              <div style="font-size:24px;margin-bottom:4px">${i}</div>
              <div style="font-size:11px;color:var(--text2)">${l}</div>
              <div style="font-size:18px;font-weight:700;color:var(--primary)">${n}</div>
            </div>`).join('')}
        </div>
        <div class="menu-list">
          ${[['⚙️','Configuración'],['💳','Métodos de pago'],['🚚','Direcciones'],
             ['🔔','Notificaciones'],['🛡️','Protección al comprador'],['🔒','Seguridad y 2FA'],['❓','Centro de ayuda']].map(([i,l]) => `
            <div class="menu-item" onclick="showToast('${l}: próximamente')">
              <div class="menu-item-left"><span>${i}</span><span>${l}</span></div>
              <span style="color:var(--text2)">›</span>
            </div>`).join('')}
          <div class="menu-item" onclick="doLogout()" style="color:var(--red)">
            <div class="menu-item-left"><span>🚪</span><span>Cerrar sesión</span></div>
          </div>
        </div>
      </div>`;
  }
}

// ══════════════════════════════════════════════════
// CARRITO
// ══════════════════════════════════════════════════
function addCart(id) {
  if (!userState.verified) {
    showToast('⚠️ Debes verificar tu identidad para comprar');
    return openVerification('buy');
  }
  addCartSimple(id);
}

function addCartSimple(id) {
  if (!id) id = event.target.dataset.productId;
  const p = products.find(x => x.id === id);
  if (!p) return;
  const ex = cart.find(c => c.id === id);
  if (ex) ex.qty++;
  else cart.push({ ...p, qty: 1 });
  updateCartBadge();
  showToast(`"${p.title.slice(0,26)}..." añadido 🛒`);
}

function updateCartBadge() {
  document.getElementById('cartCount').textContent = cart.reduce((s,c) => s+c.qty, 0);
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
      <div class="cart-item-img">${c.icon}</div>
      <div class="cart-item-info">
        <div class="cart-item-title">${c.title}</div>
        <div style="font-size:11px;color:var(--text2)">${fmt(c.price)} c/u</div>
        <div class="cart-qty">
          <button class="qty-btn" onclick="chQty(${c.id},-1)">−</button>
          <span class="qty-num">${c.qty}</span>
          <button class="qty-btn" onclick="chQty(${c.id},1)">+</button>
          <span class="remove-item" onclick="rmCart(${c.id})">✕</span>
        </div>
      </div>
      <div class="cart-item-total">${fmt(c.price*c.qty)}</div>
    </div>`).join('');

  const sub   = cart.reduce((s,c) => s + c.price*c.qty, 0);
  const itbis = Math.round(sub * .18);
  te.innerHTML = `
    <div class="cart-total-section">
      <div class="total-row"><span>Subtotal</span><span>${fmt(sub)}</span></div>
      <div class="total-row"><span>Envío</span><span>RD$350</span></div>
      <div class="total-row"><span>ITBIS 18%</span><span>${fmt(itbis)}</span></div>
      <div class="total-row final"><span>Total</span><span>${fmt(sub+350+itbis)}</span></div>
      <button class="checkout-btn" onclick="requireAuth('checkout')">Proceder al pago →</button>
      <div class="payment-icons">🏦 BHD &nbsp; 🏦 Popular &nbsp; 💳 Visa/MC &nbsp; 💵 Efectivo</div>
    </div>`;
}

function chQty(id, d) {
  const c = cart.find(x => x.id===id);
  if (!c) return;
  c.qty += d;
  if (c.qty <= 0) cart = cart.filter(x => x.id !== id);
  updateCartBadge();
  renderCart();
}
function rmCart(id) { cart = cart.filter(x => x.id!==id); updateCartBadge(); renderCart(); }
function toggleCart() {
  const ov   = document.getElementById('cartOverlay');
  const open = ov.style.display === 'none' || !ov.style.display;
  ov.style.display = open ? 'flex' : 'none';
  if (open) renderCart();
}
function closeCartOut(e) { if (e.target === document.getElementById('cartOverlay')) toggleCart(); }

// ─── Favoritos ───
function toggleFav(id, el) {
  if (favs.has(id)) { favs.delete(id); if(el) el.textContent='♡'; showToast('Eliminado de favoritos'); }
  else              { favs.add(id);    if(el) el.textContent='❤️'; showToast('Añadido a favoritos ❤️'); }
}

// ─── Subsecciones del Footer ───
function openBuyers() {
  document.getElementById('buyersSection').classList.add('show');
}

function openSellers() {
  document.getElementById('sellersSection').classList.add('show');
}

function openAbout() {
  document.getElementById('aboutSection').classList.add('show');
}

function openContact() {
  document.getElementById('contactSection').classList.add('show');
}

function closeSubsection() {
  document.querySelectorAll('.subsection-overlay').forEach(el => el.classList.remove('show'));
}

// Cerrar subsecciones al hacer click fuera
document.addEventListener('click', e => {
  if (e.target.classList.contains('subsection-overlay')) {
    closeSubsection();
  }
});

// ─── Carrusel ───
let carouselState = {
  tab: 'deals',
  index: 0,
  autoScrollTimer: null
};

function getCarouselData() {
  if (carouselState.tab === 'deals') {
    return products.filter(p => p.badge === 'deal' || p.old).slice(0, 12);
  } else if (carouselState.tab === 'auctions') {
    return auctions.slice(0, 12);
  } else {
    return products.filter(p => p.badge === 'hot' || p.reviews > 200).slice(0, 12);
  }
}

function renderCarousel() {
  const data = getCarouselData();
  const content = document.getElementById('carouselContent');
  const indicators = document.getElementById('carouselIndicators');
  
  if (!content) return;

  content.innerHTML = data.map((item, idx) => {
    if (carouselState.tab === 'auctions') {
      return `
        <div class="carousel-item" onclick="showDetail(${item.id})">
          <div class="carousel-card">
            <div class="carousel-img">
              ${item.icon}
              <span class="carousel-badge hot">⏰ SUBASTA</span>
            </div>
            <div class="carousel-info">
              <div class="carousel-title">${item.title}</div>
              <div class="carousel-seller">🏪 ${item.seller}</div>
              <div class="carousel-price">RD$${item.cur.toLocaleString('es-DO')}</div>
              <div class="carousel-meta">
                <span>📍 ${item.bids} pujas</span>
                <span class="carousel-time">${item.ends}</span>
              </div>
            </div>
          </div>
        </div>`;
    } else {
      return `
        <div class="carousel-item" onclick="showDetail(${item.id})">
          <div class="carousel-card">
            <div class="carousel-img">
              ${item.icon}
              ${item.badge === 'deal' ? '<span class="carousel-badge deal">OFERTA</span>' : ''}
              ${item.badge === 'hot' ? '<span class="carousel-badge hot">🔥 HOT</span>' : ''}
              ${item.badge === 'new' ? '<span class="carousel-badge">NUEVO</span>' : ''}
            </div>
            <div class="carousel-info">
              <div class="carousel-title">${item.title}</div>
              <div class="carousel-seller">🏪 ${item.seller}</div>
              <div>
                <span class="carousel-price">${fmt(item.price)}</span>
                ${item.old ? `<span class="carousel-old-price">${fmt(item.old)}</span><span class="carousel-discount">-${Math.round((1-item.price/item.old)*100)}%</span>` : ''}
              </div>
              <div class="carousel-meta">
                <span class="carousel-rating">★ ${item.rating}</span>
                <span>(${item.reviews})</span>
              </div>
            </div>
          </div>
        </div>`;
    }
  }).join('');

  indicators.innerHTML = Array.from({ length: Math.ceil(data.length / 4) }).map((_, i) => 
    `<button class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="carouselGoTo(${i})"></button>`
  ).join('');

  carouselState.index = 0;
  updateCarouselPosition();
}

function updateCarouselPosition() {
  const content = document.getElementById('carouselContent');
  if (!content) return;
  const offset = -carouselState.index * 100;
  content.style.transform = `translateX(${offset}%)`;
  
  const dots = document.querySelectorAll('.carousel-dot');
  dots.forEach((d, i) => d.classList.toggle('active', i === carouselState.index));
}

function carouselNext() {
  const data = getCarouselData();
  const maxIndex = Math.ceil(data.length / 4) - 1;
  carouselState.index = (carouselState.index + 1) % (maxIndex + 1);
  updateCarouselPosition();
  resetCarouselAutoScroll();
}

function carouselPrev() {
  const data = getCarouselData();
  const maxIndex = Math.ceil(data.length / 4) - 1;
  carouselState.index = (carouselState.index - 1 + (maxIndex + 1)) % (maxIndex + 1);
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
  carouselState.autoScrollTimer = setInterval(() => {
    carouselNext();
  }, 5000);
}

// ─── Verificación de Identidad ───
function openVerification(reason) {
  if (userState.verified) {
    if (reason === 'sell') requireAuth('sell');
    if (reason === 'buy') addCartSimple();
    return;
  }
  document.getElementById('verificationOverlay').classList.add('show');
  verificationData = { docType: null, docNumber: null, fullName: null, docFile: null, faceCapture: null, timestamp: null };
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
  const docType = document.getElementById('docType').value;
  const docNumber = document.getElementById('docNumber').value;
  const fullName = document.getElementById('fullName').value;

  if (!docType || !docNumber || !fullName) {
    showToast('Por favor completa todos los campos');
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

function handleDocUpload(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    showToast('El archivo es demasiado grande (máximo 10MB)');
    return;
  }

  verificationData.docFile = file;
  document.getElementById('docUploadName').textContent = '✓ ' + file.name;
  document.getElementById('docUploadArea').classList.add('has-file');
  document.getElementById('docUploadBtn').disabled = false;
  showToast('Archivo cargado correctamente');
}

function verificationNext2() {
  if (!verificationData.docFile) {
    showToast('Por favor carga el documento');
    return;
  }
  showVerificationStep(3);
  setTimeout(() => initCamera(), 500);
}

let cameraStream = null;

function initCamera() {
  navigator.mediaDevices.getUserMedia({ 
    video: { facingMode: 'user' },
    audio: false 
  })
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

function toggleCamera() {
  if (cameraStream) {
    resetCamera();
  } else {
    initCamera();
  }
}

function capturePhoto() {
  const video = document.getElementById('cameraFeed');
  const canvas = document.getElementById('capturedCanvas');
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);

  // Simular captura de rostro
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
  document.getElementById('cameraBtnToggle').textContent = '📹 Iniciar cámara';
  document.getElementById('cameraBtnCapture').disabled = true;
  document.getElementById('cameraBtnToggle').disabled = false;
}

function submitVerification() {
  if (!verificationData.faceCapture) {
    showToast('Por favor captura una foto de tu rostro');
    return;
  }

  // Simular envío de verificación
  verificationData.timestamp = new Date().toISOString();
  
  // En producción: enviar a servidor
  // await fetch('/api/verify-identity', { method: 'POST', body: JSON.stringify(verificationData) })
  
  userState.verified = true;
  userState.verificationStatus = 'pending';
  userState.loggedIn = true;
  
  document.querySelectorAll('.verification-step-container').forEach(s => s.style.display = 'none');
  document.getElementById('verificationSuccess').style.display = 'block';
  
  showToast('✅ Verificación enviada correctamente');
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

// ─── Init ───
cview = 'home';
doRender();
renderCarousel();
resetCarouselAutoScroll();
