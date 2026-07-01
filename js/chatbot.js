// ═══════════════════════════════════════════════════
//  MercadoRD — Asistente (menús + respuestas predeterminadas)
//  100% en el navegador: NO llama a ninguna IA/Edge Function → costo $0.
//  Árbol de menús con botones; el texto libre se enruta por palabras clave.
//  Comparte el ámbito global con app.js/auth.js (usa requireAuth, showView,
//  openVerification, openAuth, goHome si existen).
// ═══════════════════════════════════════════════════
(function () {
  'use strict';

  // 👉 Cámbialos por los datos reales de soporte.
  const SUPPORT_WA = '18095551234';
  const SUPPORT_EMAIL = 'soporte@mercadord.net';

  const GREETING = '¡Hola! 👋 Soy el asistente de MercadoRD. Elige una opción y te ayudo al instante:';

  // Árbol de nodos. Cada opción tiene `to` (ir a otro nodo) o `act` (acción real).
  const NODES = {
    main: {
      text: '¿En qué te puedo ayudar? 👇',
      opts: [
        { label: '🛒 Comprar / contactar a un vendedor', to: 'buy' },
        { label: '🏷️ Publicar un anuncio', to: 'sell' },
        { label: '🪪 Verificar mi identidad', to: 'verify' },
        { label: '🔨 Subastas', to: 'auctions' },
        { label: '🛡️ ¿Es seguro?', to: 'safety' },
        { label: '🚨 Reportar fraude', to: 'fraud' },
        { label: '💬 Hablar con soporte', to: 'support' },
      ],
    },
    buy: {
      text: 'En MercadoRD el trato es directo con el vendedor por WhatsApp 🟢\n\n' +
            '1. Abre el anuncio que te interese.\n' +
            '2. Toca el botón "💬 Contactar".\n' +
            '3. Se abre WhatsApp con el vendedor: acuerden precio, entrega y pago entre ustedes.\n\n' +
            'ℹ️ Para contactar necesitas tu identidad verificada.',
      opts: [
        { label: '🏠 Ver anuncios', act: 'home' },
        { label: '🪪 Verificar mi identidad', to: 'verify' },
        { label: '↩️ Menú principal', to: 'main' },
      ],
    },
    sell: {
      text: 'Publicar es 100% gratis 🎉\n\n' +
            '1. Toca "➕ Vender".\n' +
            '2. Completa: título, precio, categoría, condición, provincia, municipio, descripción, tu WhatsApp y una foto (todos obligatorios).\n' +
            '3. ¡Listo! Tu anuncio queda visible para todos.\n\n' +
            'ℹ️ Necesitas identidad verificada para publicar.',
      opts: [
        { label: '➕ Publicar ahora', act: 'sell' },
        { label: '🪪 Verificar mi identidad', to: 'verify' },
        { label: '↩️ Menú principal', to: 'main' },
      ],
    },
    verify: {
      text: 'La verificación de identidad (KYC) es gratis y una sola vez 🪪\n\n' +
            'Ve a tu Cuenta → "Verificar mi identidad" y sigue los pasos con tu cédula dominicana o pasaporte. Es un proceso seguro.\n\n' +
            'La necesitas para publicar anuncios y para contactar a vendedores.',
      opts: [
        { label: '🪪 Verificar ahora', act: 'verify' },
        { label: '↩️ Menú principal', to: 'main' },
      ],
    },
    auctions: {
      text: 'Las subastas duran 3 días ⏳\n\n' +
            '• Puja desde la sección "🔨 Subastas".\n' +
            '• Si ganas, coordinas el pago y la entrega con el vendedor por WhatsApp.\n\n' +
            'ℹ️ Para pujar necesitas identidad verificada.',
      opts: [
        { label: '🔨 Ver subastas', act: 'auctions' },
        { label: '↩️ Menú principal', to: 'main' },
      ],
    },
    safety: {
      text: 'Sí, cuidamos tu seguridad 🛡️\n\n' +
            '• Todos los vendedores verifican su identidad con cédula (KYC).\n' +
            '• Revisa el perfil y las fotos del anuncio.\n' +
            '• Acuerda ver el producto en persona, en un lugar público y concurrido.\n' +
            '• Verifica el artículo antes de pagar.\n' +
            '• Desconfía de precios demasiado bajos o de quien pide adelantos.',
      opts: [
        { label: '🚨 Reportar fraude', to: 'fraud' },
        { label: '↩️ Menú principal', to: 'main' },
      ],
    },
    fraud: {
      text: '¿Viste un anuncio o perfil sospechoso? 🚨\n\n' +
            'Escríbenos por WhatsApp o correo con el nombre o enlace del anuncio. Suspendemos de inmediato las cuentas sospechosas.',
      opts: [
        { label: '💬 Reportar por WhatsApp', act: 'wa' },
        { label: '✉️ Reportar por correo', act: 'email' },
        { label: '↩️ Menú principal', to: 'main' },
      ],
    },
    support: {
      text: 'Estamos para ayudarte 💬\n\n' +
            '• WhatsApp: coordina al instante.\n' +
            '• Correo: ' + SUPPORT_EMAIL + '\n' +
            '• Horario: 8am – 8pm.',
      opts: [
        { label: '💬 Escribir por WhatsApp', act: 'wa' },
        { label: '✉️ Enviar correo', act: 'email' },
        { label: '↩️ Menú principal', to: 'main' },
      ],
    },
  };

  // Texto libre → nodo por palabras clave.
  function matchNode(txt) {
    const t = (txt || '').toLowerCase();
    if (/vend|public|anunci|subir|colgar/.test(t)) return 'sell';
    if (/subast|puja|puj/.test(t)) return 'auctions';
    if (/verific|c[eé]dula|kyc|identidad/.test(t)) return 'verify';
    if (/compr|contact|whats|vendedor|mensaj/.test(t)) return 'buy';
    if (/fraud|sospech|falso|denunc|report|estaf/.test(t)) return 'fraud';
    if (/segur|confia|fiable|robo|riesg/.test(t)) return 'safety';
    if (/soport|ayuda|contacto|hablar|humano|agente|tel[eé]fono/.test(t)) return 'support';
    return null;
  }

  let booted = false;
  let els = null;

  function build() {
    const btn = document.createElement('button');
    btn.id = 'mrdChatBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Abrir asistente de MercadoRD');
    btn.innerHTML = '💬<span class="mrd-chat-badge" id="mrdChatBadge"></span>';

    const panel = document.createElement('div');
    panel.id = 'mrdChatPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Asistente de MercadoRD');
    panel.innerHTML = `
      <div class="mrd-chat-head">
        <div class="mrd-chat-avatar">🤖</div>
        <div class="mrd-chat-title"><strong>Asistente MercadoRD</strong><span>Respuestas al instante</span></div>
        <button class="mrd-chat-close" id="mrdChatClose" type="button" aria-label="Cerrar">&times;</button>
      </div>
      <div class="mrd-chat-msgs" id="mrdChatMsgs" aria-live="polite"></div>
      <div class="mrd-chat-suggest" id="mrdChatSuggest"></div>
      <form class="mrd-chat-input" id="mrdChatForm">
        <textarea id="mrdChatText" rows="1" placeholder="Escribe o elige una opción…" aria-label="Mensaje"></textarea>
        <button class="mrd-chat-send" id="mrdChatSend" type="submit" aria-label="Enviar">➤</button>
      </form>`;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    els = {
      btn, panel,
      msgs: document.getElementById('mrdChatMsgs'),
      suggest: document.getElementById('mrdChatSuggest'),
      form: document.getElementById('mrdChatForm'),
      text: document.getElementById('mrdChatText'),
      send: document.getElementById('mrdChatSend'),
    };

    btn.addEventListener('click', toggle);
    document.getElementById('mrdChatClose').addEventListener('click', close);
    els.form.addEventListener('submit', (e) => { e.preventDefault(); submitText(); });
    els.text.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitText(); }
    });
    els.text.addEventListener('input', autoGrow);
  }

  function autoGrow() {
    els.text.style.height = 'auto';
    els.text.style.height = Math.min(els.text.scrollHeight, 96) + 'px';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function addMsg(text, who) {
    const div = document.createElement('div');
    div.className = 'mrd-msg ' + who;
    div.innerHTML = esc(text);
    els.msgs.appendChild(div);
    els.msgs.scrollTop = els.msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    const t = document.createElement('div');
    t.className = 'mrd-chat-typing';
    t.id = 'mrdChatTyping';
    t.innerHTML = '<span></span><span></span><span></span>';
    els.msgs.appendChild(t);
    els.msgs.scrollTop = els.msgs.scrollHeight;
  }
  function hideTyping() {
    const t = document.getElementById('mrdChatTyping');
    if (t) t.remove();
  }

  // Pinta los botones del nodo actual en la barra de sugerencias.
  function renderOpts(node) {
    els.suggest.innerHTML = '';
    (node.opts || []).forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.label;
      b.addEventListener('click', () => pick(o));
      els.suggest.appendChild(b);
    });
  }

  // Muestra un nodo: (typing breve) → mensaje del bot → sus botones.
  function goNode(key) {
    const node = NODES[key];
    if (!node) return;
    els.suggest.innerHTML = '';
    showTyping();
    setTimeout(() => {
      hideTyping();
      addMsg(node.text, 'bot');
      renderOpts(node);
    }, 320);
  }

  // Usuario elige una opción (botón).
  function pick(o) {
    addMsg(o.label, 'user');
    if (o.act) { doAction(o.act); if (!/^(wa|email)$/.test(o.act)) return; }
    if (o.to) goNode(o.to);
    else if (o.act === 'wa' || o.act === 'email') { /* acción externa: dejar el menú actual */ }
  }

  function doAction(act) {
    switch (act) {
      case 'home':
        close();
        if (typeof goHome === 'function') goHome();
        else if (typeof showView === 'function') showView('home');
        break;
      case 'sell':
        close();
        if (typeof requireAuth === 'function') requireAuth('sell');
        break;
      case 'verify':
        close();
        if (typeof user !== 'undefined' && user) {
          if (typeof openVerification === 'function') openVerification('account');
        } else if (typeof openAuth === 'function') {
          openAuth('login');
          if (typeof showAlert === 'function') showAlert('info', 'Inicia sesión para verificar tu identidad.');
        }
        break;
      case 'auctions':
        close();
        if (typeof showView === 'function') showView('auctions');
        break;
      case 'wa': {
        const msg = encodeURIComponent('Hola, necesito ayuda con MercadoRD.');
        window.open(`https://wa.me/${SUPPORT_WA}?text=${msg}`, '_blank', 'noopener');
        break;
      }
      case 'email': {
        const s = encodeURIComponent('Soporte MercadoRD');
        window.open(`mailto:${SUPPORT_EMAIL}?subject=${s}`, '_blank');
        break;
      }
    }
  }

  // Texto libre → keyword match → nodo; si no hay match, vuelve al menú.
  function submitText() {
    const txt = (els.text.value || '').trim();
    if (!txt) return;
    els.text.value = '';
    autoGrow();
    addMsg(txt, 'user');
    const key = matchNode(txt);
    if (key) { goNode(key); return; }
    els.suggest.innerHTML = '';
    showTyping();
    setTimeout(() => {
      hideTyping();
      addMsg('No estoy seguro de eso 🤔. Elige una de estas opciones y te ayudo 👇', 'bot');
      renderOpts(NODES.main);
    }, 320);
  }

  function boot() {
    if (booted) return;
    booted = true;
    addMsg(GREETING, 'bot');
    renderOpts(NODES.main);
  }

  function toggle() { els.panel.classList.contains('open') ? close() : open(); }
  function open() {
    els.panel.classList.add('open');
    boot();
    setTimeout(() => els.text.focus(), 60);
  }
  function close() { els.panel.classList.remove('open'); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
