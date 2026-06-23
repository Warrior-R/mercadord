// ═══════════════════════════════════════════════════
//  MercadoRD — Widget del Asistente IA (chatbot)
//  Botón flotante + panel. Llama a la Edge Function `chatbot`, que conoce
//  toda la plataforma y registra reportes de fraude/spam/perfiles sospechosos.
//  Comparte el ámbito global con auth.js (usa `sb`, `initSupabase`, `DEMO`).
// ═══════════════════════════════════════════════════
(function () {
  'use strict';

  const GREETING =
    '¡Hola! 👋 Soy el Asistente de MercadoRD. Puedo ayudarte a comprar, vender, ' +
    'verificar tu identidad o reportar un perfil sospechoso, fraude o spam. ¿En qué te ayudo?';

  const SUGGESTIONS = [
    '¿Cómo vendo un producto?',
    '¿Cómo verifico mi identidad?',
    'Reportar un perfil sospechoso',
  ];

  // Historial de la conversación (lo que se envía a la IA).
  const history = [];
  let booted = false;   // ¿se mostró el saludo?
  let busy = false;     // ¿esperando respuesta?
  let els = null;       // referencias DOM

  // ─── Construcción del DOM ───
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
        <div class="mrd-chat-title"><strong>Asistente MercadoRD</strong><span>Responde al instante</span></div>
        <button class="mrd-chat-close" id="mrdChatClose" type="button" aria-label="Cerrar">&times;</button>
      </div>
      <div class="mrd-chat-msgs" id="mrdChatMsgs" aria-live="polite"></div>
      <div class="mrd-chat-suggest" id="mrdChatSuggest"></div>
      <form class="mrd-chat-input" id="mrdChatForm">
        <textarea id="mrdChatText" rows="1" placeholder="Escribe tu mensaje…" aria-label="Mensaje"></textarea>
        <button class="mrd-chat-send" id="mrdChatSend" type="submit" aria-label="Enviar">➤</button>
      </form>`;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    els = {
      btn, panel,
      badge: panel.ownerDocument.getElementById('mrdChatBadge'),
      msgs: document.getElementById('mrdChatMsgs'),
      suggest: document.getElementById('mrdChatSuggest'),
      form: document.getElementById('mrdChatForm'),
      text: document.getElementById('mrdChatText'),
      send: document.getElementById('mrdChatSend'),
    };

    btn.addEventListener('click', toggle);
    document.getElementById('mrdChatClose').addEventListener('click', close);
    els.form.addEventListener('submit', (e) => { e.preventDefault(); send(); });
    els.text.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    els.text.addEventListener('input', autoGrow);
  }

  function autoGrow() {
    els.text.style.height = 'auto';
    els.text.style.height = Math.min(els.text.scrollHeight, 96) + 'px';
  }

  // ─── Escapado básico (no inyectar HTML en los mensajes) ───
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function addMsg(text, who) {
    const div = document.createElement('div');
    div.className = 'mrd-msg ' + who;       // who: 'user' | 'bot' | 'note'
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

  function renderSuggestions() {
    els.suggest.innerHTML = '';
    if (history.length > 1) return;          // solo al inicio
    SUGGESTIONS.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = s;
      b.addEventListener('click', () => { els.text.value = s; send(); });
      els.suggest.appendChild(b);
    });
  }

  function boot() {
    if (booted) return;
    booted = true;
    addMsg(GREETING, 'bot');
    renderSuggestions();
  }

  function toggle() { els.panel.classList.contains('open') ? close() : open(); }
  function open() {
    els.panel.classList.add('open');
    boot();
    setTimeout(() => els.text.focus(), 60);
  }
  function close() { els.panel.classList.remove('open'); }

  // ─── Envío de un mensaje a la IA ───
  async function send() {
    if (busy) return;
    const txt = (els.text.value || '').trim();
    if (!txt) return;

    els.text.value = '';
    autoGrow();
    addMsg(txt, 'user');
    history.push({ role: 'user', content: txt });
    els.suggest.innerHTML = '';

    busy = true;
    els.send.disabled = true;
    showTyping();

    try {
      if (typeof initSupabase === 'function') initSupabase();
      if (typeof sb === 'undefined' || !sb) {
        hideTyping();
        addMsg('El asistente no está disponible ahora mismo. Intenta más tarde 🙏', 'bot');
        return;
      }

      const { data, error } = await sb.functions.invoke('chatbot', {
        body: { messages: history.slice(-20) },
      });
      hideTyping();

      if (error) {
        // Las funciones de Supabase devuelven el cuerpo JSON aun con status de error.
        let reply = 'Tuve un problema al responder. Intenta de nuevo 🙏';
        try { const ctx = await error.context.json(); if (ctx && ctx.reply) reply = ctx.reply; } catch (_) {}
        addMsg(reply, 'bot');
        return;
      }

      const reply = (data && data.reply) || 'Disculpa, no pude responder. ¿Puedes reformular?';
      addMsg(reply, 'bot');
      history.push({ role: 'assistant', content: reply });
      if (data && data.reportFiled) addMsg('✓ Reporte enviado al equipo de MercadoRD', 'note');
    } catch (e) {
      hideTyping();
      addMsg('No pude conectar con el asistente. Revisa tu conexión e intenta de nuevo.', 'bot');
    } finally {
      busy = false;
      els.send.disabled = false;
      els.text.focus();
    }
  }

  // ─── Arranque ───
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
