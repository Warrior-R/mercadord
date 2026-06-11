// ═══════════════════════════════════════════════════
//  MercadoRD — Capa de persistencia local
//  Archivo: js/storage.js
//  Guarda carrito, favoritos, sesión, anuncios y pedidos
//  en localStorage para que sobrevivan al recargar la página.
//  Cuando Supabase esté activo, esta capa sigue sirviendo
//  como caché local / modo offline.
// ═══════════════════════════════════════════════════

const MRD = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      console.warn('MRD.get error', key, e);
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('MRD.set error', key, e);
      return false;
    }
  },
  del(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }
};

// Claves usadas por la app
const K = {
  CART:      'mrd_cart',
  FAVS:      'mrd_favs',
  USER:      'mrd_user',
  USERSTATE: 'mrd_userstate',
  PRODUCTS:  'mrd_user_products',
  ORDERS:    'mrd_orders'
};
