// ═══════════════════════════════════════════════════
//  MercadoRD — Módulo de Autenticación (Supabase)
//  Archivo: js/auth.js  (v3 — Google OAuth + cuentas reales + validación)
// ═══════════════════════════════════════════════════

// ⚠️ PASO 1: crea un proyecto en https://app.supabase.com
// ⚠️ PASO 2: pega aquí Project URL y anon public key (Settings → API).
// ⚠️ PASO 3: cambia SUPABASE_ENABLED a true.
// ⚠️ PASO 4: para Google, habilita el provider en Supabase → Authentication
//            → Providers → Google (ver SUPABASE_SETUP.md).
const SUPABASE_ENABLED = false;
const SB_URL = 'https://TU_PROYECTO.supabase.co';
const SB_KEY = 'TU_ANON_PUBLIC_KEY';

const DEMO = !SUPABASE_ENABLED || SB_URL.includes('TU_PROYECTO') || !SB_KEY;
let sb = null;

// ─── Estado global de auth ───
let user = MRD.get(K.USER, null);     // restaura sesión al recargar
const hadUserAtLoad = !!user;          // ¿había sesión persistida al abrir la página?
let greeted  = false;                  // evita doble bienvenida (INITIAL_SESSION + SIGNED_IN)
let pending  = null;                   // vista a abrir tras login
let attempts = 0;
let lockTs   = 0;
let demoOTP  = null;

function persistUser() { user ? MRD.set(K.USER, user) : MRD.del(K.USER); }

function displayName(u) {
  u = u || user;
  return u?.user_metadata?.full_name || u?.email?.split('@')[0] || 'Usuario';
}

// ─── Inicialización perezosa del SDK ───
// supabase-js se carga con `defer`, así que este archivo puede ejecutarse
// antes de que window.supabase exista. Se reintenta en DOMContentLoaded
// (los scripts defer ya corrieron) y en load, y también al usar cualquier
// función de auth vía requireSb().
function initSupabase() {
  if (DEMO || sb || !window.supabase) return;
  try {
    sb = window.supabase.createClient(SB_URL, SB_KEY);
  } catch (e) {
    console.warn('Supabase init falló:', e);
    return;
  }
  // No usar await dentro del callback: las llamadas a la librería ahí dentro
  // deadlockean (getSession espera el lock que mantiene el propio callback).
  sb.auth.onAuthStateChange((ev, session) => {
    setTimeout(() => handleAuthEvent(ev, session), 0);
  });
}
initSupabase();
document.addEventListener('DOMContentLoaded', initSupabase);
window.addEventListener('load', initSupabase);

// Conexión real obligatoria: si el SDK aún no cargó, lo intenta; si no se
// puede (CDN caído/bloqueado), devuelve null y el caller muestra error en
// lugar de simular un login falso.
function requireSb() {
  if (DEMO) return null;
  if (!sb) initSupabase();
  return sb;
}

async function handleAuthEvent(ev, session) {
  if (ev === 'PASSWORD_RECOVERY') { startPasswordRecovery(); return; }

  user = session?.user ?? null;
  persistUser();
  userState.loggedIn = !!user;

  if (user) {
    await loadProfile();
  } else if (ev === 'SIGNED_OUT' || ev === 'INITIAL_SESSION') {
    userState.verified = false;
    userState.verificationStatus = 'none';
  }
  saveUserState();
  refreshHeader();

  // Sesión persistida localmente que ya no existe en Supabase (p.ej. la
  // dejó el modo demo, o expiró): avisar en vez de desloguear en silencio.
  if (ev === 'INITIAL_SESSION' && !user && hadUserAtLoad) {
    showToast('Tu sesión expiró — inicia sesión de nuevo');
  }

  // Bienvenida + vista pendiente. Tras el redirect de Google la sesión llega
  // en INITIAL_SESSION; en login con contraseña (sin recarga) llega SIGNED_IN.
  const modalOpen   = document.getElementById('authOverlay').style.display === 'flex';
  const oauthReturn = sessionStorage.getItem('mrd_oauth') === '1';
  const fresh = !!user && !greeted && (modalOpen || oauthReturn || !hadUserAtLoad);
  if ((ev === 'SIGNED_IN' || ev === 'INITIAL_SESSION') && fresh) {
    greeted = true;
    sessionStorage.removeItem('mrd_oauth');
    pending = pending || sessionStorage.getItem('mrd_pending') || null;
    sessionStorage.removeItem('mrd_pending');
    showToast(`¡Bienvenido/a ${displayName()}! 👋`);
    closeAuth();
    if (pending) { const v = pending; pending = null; requireAuth(v); }
  }

  if (ev === 'SIGNED_OUT') showToast('Sesión cerrada. ¡Hasta pronto!');
}

// ─── Perfil: el estado de verificación vive en la tabla `profiles` ───
async function loadProfile() {
  if (!sb || !user?.id) return;
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('is_verified, verification_status, full_name')
      .eq('id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      // Mientras la aprobación de identidad sea manual (Table Editor), el
      // estado 'pending' cuenta como verificado para no bloquear ventas.
      // Para endurecer en producción: deja solo `!!data.is_verified`.
      userState.verified = !!data.is_verified || data.verification_status === 'pending';
      userState.verificationStatus = data.verification_status || 'none';
      if (data.full_name && !user.user_metadata?.full_name) {
        user.user_metadata = { ...(user.user_metadata || {}), full_name: data.full_name };
        persistUser();
      }
    }
  } catch (e) { console.warn('No se pudo cargar el perfil:', e.message || e); }
}

// ─── Actualizar header según sesión ───
function refreshHeader() {
  const btn = document.getElementById('authBtn');
  if (!btn) return;
  if (user) {
    const name = displayName();
    const ini  = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    btn.outerHTML = `
      <div class="user-pill" id="authBtn" onclick="requireAuth('account')" role="button" tabindex="0">
        <div class="uav">${ini}</div>
        ${name.split(' ')[0]}
        <span class="vtick">${userState?.verified ? '✓' : ''}</span>
      </div>`;
  } else {
    const el = document.getElementById('authBtn');
    if (el && el.tagName !== 'BUTTON') {
      el.outerHTML = `<button class="hbtn" id="authBtn" onclick="openAuth()">👤 Ingresar</button>`;
    }
  }
}

// ─── Abrir / cerrar modal ───
function openAuth(tab) {
  document.getElementById('authOverlay').style.display = 'flex';
  switchTab(tab || 'login');
  clearAlert();
}
function closeAuth() {
  document.getElementById('authOverlay').style.display = 'none';
}
// Cierre manual (✕ u overlay): además descarta la vista pendiente para que
// un login posterior no navegue a donde el usuario ya no quería ir.
function cancelAuth() {
  pending = null;
  closeAuth();
}
document.getElementById('authOverlay').addEventListener('click', e => {
  if (e.target.id === 'authOverlay') cancelAuth();
});

// ─── Gates: qué requiere cada acción ───
//  · navegar / carrito / favoritos → libre
//  · checkout / cuenta / pedidos   → sesión iniciada
//  · vender / pujar                → sesión + identidad verificada
function requireAuth(v) {
  if (!user) {
    pending = v;
    openAuth('login');
    showAlert('info', 'Inicia sesión o crea una cuenta para continuar.');
    return;
  }
  if ((v === 'sell' || v === 'bid') && !userState.verified) {
    showToast('🪪 Verifica tu identidad para ' + (v === 'sell' ? 'vender' : 'pujar'));
    openVerification(v);
    return;
  }
  showView(v);
}

// ─── Cambiar tab login/registro ───
function switchTab(t) {
  clearAlert();
  const isL = t === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isL);
  document.getElementById('tabReg').classList.toggle('active', !isL);
  document.getElementById('loginFlow').style.display    = isL ? '' : 'none';
  document.getElementById('registerFlow').style.display = isL ? 'none' : '';
  if (!isL) resetSmsUI();
  gotoStep(isL ? 'l' : 'r', 1);
}

function gotoStep(flow, n) {
  const pfx = flow === 'l' ? 'ls' : 'rs';
  const max = 4;
  for (let i = 1; i <= max; i++) {
    document.getElementById(pfx + i)?.classList.toggle('active', i === n);
  }
  if (flow === 'r') {
    for (let i = 1; i <= 4; i++) {
      const d = document.getElementById('sd' + i);
      if (d) { d.classList.toggle('active', i === n); d.classList.toggle('done', i < n); }
    }
  }
}

// ─── Alertas ───
function showAlert(type, msg) {
  const e = document.getElementById('authAlert');
  e.className = `auth-alert ${({ ok:'ok', fail:'fail', info:'info' }[type] || 'info')} show`;
  e.textContent = msg;
}
function clearAlert() {
  const e = document.getElementById('authAlert');
  if (e) { e.className = 'auth-alert'; e.textContent = ''; }
}

// ─── Errores de campo ───
function fe(id, msg) {
  const e = document.getElementById(id);
  if (!e) return;
  e.textContent = msg;
  e.classList.toggle('show', !!msg);
}
function cfe(...ids) { ids.forEach(id => fe(id, '')); }

// ─── Toggle contraseña visible ───
function toggleEye(id, el) {
  const i = document.getElementById(id);
  if (!i) return;
  i.type = i.type === 'password' ? 'text' : 'password';
  el.textContent = i.type === 'password' ? '👁' : '🙈';
}

// ─── Fortaleza de contraseña ───
function pwdStrength(v) {
  let s = 0;
  if (v.length >= 8)          s++;
  if (/[A-Z]/.test(v))        s++;
  if (/[0-9]/.test(v))        s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  const cfg = [
    ['0%',   '#eee',    ''],
    ['25%',  '#e43e2b', 'Muy débil 🔴'],
    ['50%',  '#f5a623', 'Débil 🟠'],
    ['75%',  '#2196F3', 'Buena 🔵'],
    ['100%', '#0a8a4a', 'Muy segura 🟢'],
  ];
  const f = document.getElementById('pwdF');
  const l = document.getElementById('pwdL');
  if (f) { f.style.width = cfg[s][0]; f.style.background = cfg[s][1]; }
  if (l) l.textContent = cfg[s][2];
}

// ─── Formato y validación de cédula RD ───
function fmtCed(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 3)  v = v.slice(0,3)  + '-' + v.slice(3);
  if (v.length > 11) v = v.slice(0,11) + '-' + v.slice(11);
  el.value = v;
}

// Valida el dígito verificador de la cédula dominicana (algoritmo Luhn,
// el mismo que usa la JCE). No confirma que la cédula exista, pero
// descarta números inventados al azar.
function validCedula(ced) {
  const d = (ced || '').replace(/\D/g, '');
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false; // 00000000000, 11111111111…
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let p = parseInt(d[i], 10) * (i % 2 === 0 ? 1 : 2);
    if (p > 9) p = Math.floor(p / 10) + (p % 10);
    sum += p;
  }
  return (10 - (sum % 10)) % 10 === parseInt(d[10], 10);
}

// ─── OTP helpers ───
function onext(el, ni, p) {
  if (el.value && ni >= 0) document.getElementById((p === 's' ? 'so' : 'lo') + ni)?.focus();
}
function oback(e, el, pi, p) {
  if (e.key === 'Backspace' && !el.value && pi !== null) {
    const pr = document.getElementById((p === 's' ? 'so' : 'lo') + pi);
    if (pr) { pr.value = ''; pr.focus(); }
  }
}
function getOTP(p) {
  return [0,1,2,3,4,5].map(i => document.getElementById((p === 's' ? 'so' : 'lo') + i)?.value || '').join('');
}
function countdown(spanId, sec) {
  const s = document.getElementById(spanId);
  if (!s) return;
  let t = sec;
  s.textContent = t;
  const iv = setInterval(() => {
    t--;
    s.textContent = t;
    if (t <= 0) {
      clearInterval(iv);
      s.parentElement.innerHTML = '<span class="alink" onclick="sendSMS()">Reenviar código</span>';
    }
  }, 1000);
}

// ══════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════
async function doLogin() {
  clearAlert(); cfe('lEmailE','lPwdE');

  if (Date.now() < lockTs) {
    showAlert('fail', `Cuenta bloqueada. Espera ${Math.ceil((lockTs - Date.now()) / 1000)}s.`);
    return;
  }

  const email = document.getElementById('lEmail').value.trim();
  const pwd   = document.getElementById('lPwd').value;
  let ok = true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fe('lEmailE','Correo no válido.'); ok = false; }
  if (pwd.length < 6) { fe('lPwdE','Contraseña incorrecta.'); ok = false; }
  if (!ok) return;

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Verificando...';

  try {
    if (!DEMO) {
      const client = requireSb();
      if (!client) { showAlert('fail','No se pudo conectar con el servidor de autenticación. Recarga la página e intenta de nuevo.'); return; }
      const { error } = await client.auth.signInWithPassword({ email, password: pwd });
      if (error) {
        if (/confirm/i.test(error.message)) {
          showAlert('info', '📧 Tu correo aún no está confirmado. Revisa tu bandeja (y spam) y haz clic en el enlace de verificación.');
          return;
        }
        throw error;
      }
      attempts = 0;
      // handleAuthEvent se encarga del resto (header, toast, pending)
    } else {
      await new Promise(r => setTimeout(r, 600));
      user = { email, user_metadata: { full_name: email.split('@')[0] } };
      persistUser();
      userState.loggedIn = true; saveUserState();
      refreshHeader();
      showToast('Sesión iniciada (modo demo) ✓');
      closeAuth();
      if (pending) { const v = pending; pending = null; requireAuth(v); }
    }
  } catch (err) {
    // Solo cuentan para el bloqueo las credenciales inválidas; un fallo de
    // red no debe culpar al usuario ni bloquearlo.
    const badCreds = err?.status === 400 || /invalid login credentials/i.test(err?.message || '');
    if (!badCreds) {
      showAlert('fail', 'Error de conexión. Verifica tu internet e intenta de nuevo.');
      return;
    }
    attempts++;
    if (attempts >= 5) {
      lockTs = Date.now() + 60000; attempts = 0;
      showAlert('fail', '🔒 Demasiados intentos. Bloqueado 60 segundos.');
    } else {
      showAlert('fail', `Correo o contraseña incorrectos. (${attempts}/5)`);
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Iniciar sesión';
  }
}

// ─── Google OAuth ───
async function loginGoogle() {
  clearAlert();
  try {
    if (!DEMO) {
      const client = requireSb();
      if (!client) { showAlert('fail','No se pudo conectar con el servidor de autenticación. Recarga la página e intenta de nuevo.'); return; }
      // El redirect recarga la página: la vista pendiente sobrevive en sessionStorage
      if (pending) sessionStorage.setItem('mrd_pending', pending);
      sessionStorage.setItem('mrd_oauth', '1');
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname }
      });
      if (error) throw error;
    } else {
      await new Promise(r => setTimeout(r, 500));
      user = { email: 'demo@gmail.com', user_metadata: { full_name: 'Usuario Google' } };
      persistUser();
      userState.loggedIn = true; saveUserState();
      refreshHeader();
      showToast('Sesión con Google (modo demo) ✓');
      closeAuth();
      if (pending) { const v = pending; pending = null; requireAuth(v); }
    }
  } catch (e) {
    sessionStorage.removeItem('mrd_oauth');
    sessionStorage.removeItem('mrd_pending');
    console.warn('Google OAuth:', e);
    showAlert('fail', 'Error con Google. Verifica que el provider esté habilitado en Supabase.');
  }
}

// ─── 2FA ───
function verify2fa() {
  const c = getOTP('l');
  if (c.length < 6) { showAlert('fail','Ingresa los 6 dígitos.'); return; }
  showToast('2FA verificado ✓');
  closeAuth();
}

// ─── Reset password ───
async function doReset() {
  const email = document.getElementById('resetE').value.trim();
  if (!email) { showAlert('fail','Ingresa tu correo.'); return; }
  try {
    if (!DEMO) {
      const client = requireSb();
      if (!client) { showAlert('fail','Sin conexión con el servidor. Recarga la página.'); return; }
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname
      });
      if (error) throw error;
    }
    showAlert('ok', `✅ Enlace enviado a ${email}. Revisa tu bandeja.`);
  } catch (e) { showAlert('fail','Error al enviar. Verifica la dirección.'); }
}

// ─── Recuperación: definir nueva contraseña tras el enlace del correo ───
function startPasswordRecovery() {
  openAuth('login');
  gotoStep('l', 4);
  showAlert('info', '🔑 Define tu nueva contraseña para completar la recuperación.');
}

async function doSetNewPassword() {
  cfe('npPwdE');
  const pw = document.getElementById('npPwd').value;
  if (pw.length < 8)          { fe('npPwdE','Mínimo 8 caracteres.'); return; }
  if (!/[A-Z]/.test(pw))      { fe('npPwdE','Debe tener al menos una mayúscula.'); return; }
  if (!/[0-9]/.test(pw))      { fe('npPwdE','Debe tener al menos un número.'); return; }
  try {
    if (!DEMO) {
      const client = requireSb();
      if (!client) { showAlert('fail','Sin conexión con el servidor. Recarga la página.'); return; }
      const { error } = await client.auth.updateUser({ password: pw });
      if (error) throw error;
    }
    showToast('Contraseña actualizada ✓');
    closeAuth();
  } catch (e) {
    showAlert('fail', e.message || 'No se pudo actualizar la contraseña.');
  }
}

// ══════════════════════════════════════════════════
// REGISTRO
// ══════════════════════════════════════════════════
function rs1next() {
  cfe('rNomE','rApeE','rEmailE','rPwdE','rPwd2E'); clearAlert();
  const nom = document.getElementById('rNom').value.trim();
  const ape = document.getElementById('rApe').value.trim();
  const em  = document.getElementById('rEmail').value.trim();
  const pw  = document.getElementById('rPwd').value;
  const pw2 = document.getElementById('rPwd2').value;
  let ok = true;
  if (nom.length < 2) { fe('rNomE','Ingresa tu nombre.'); ok = false; }
  if (ape.length < 2) { fe('rApeE','Ingresa tu apellido.'); ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { fe('rEmailE','Correo no válido.'); ok = false; }
  if (pw.length < 8)          { fe('rPwdE','Mínimo 8 caracteres.'); ok = false; }
  else if (!/[A-Z]/.test(pw)) { fe('rPwdE','Debe tener al menos una mayúscula.'); ok = false; }
  else if (!/[0-9]/.test(pw)) { fe('rPwdE','Debe tener al menos un número.'); ok = false; }
  if (pw !== pw2) { fe('rPwd2E','Las contraseñas no coinciden.'); ok = false; }
  if (!ok) return;
  document.getElementById('emailTo').textContent = em;
  gotoStep('r', 2);
}

// Reinicia la UI del paso SMS (al entrar al registro o reintentar)
function resetSmsUI() {
  demoOTP = null;
  const btn = document.getElementById('smsBtnSend');
  if (btn) { btn.style.display = ''; btn.disabled = false; btn.innerHTML = 'Enviar código SMS'; }
  const sec = document.getElementById('smsSection');
  if (sec) sec.style.display = 'none';
  [0,1,2,3,4,5].forEach(i => { const el = document.getElementById('so' + i); if (el) el.value = ''; });
  const rs = document.getElementById('smsResend');
  if (rs) rs.innerHTML = 'Reenviar en <span id="smsC">60</span>s';
}

// El OTP por SMS es de prueba (consola F12) hasta configurar Twilio.
// Nota: la verificación REAL de teléfono con Supabase debe hacerse DESPUÉS
// de crear la cuenta, con updateUser({phone}) + verifyOtp type 'phone_change'
// — hacerlo antes crearía un usuario fantasma solo-teléfono.
async function sendSMS() {
  clearAlert(); cfe('rPhoneE');
  const pfx = document.getElementById('phPfx').value;
  const ph  = document.getElementById('rPhone').value.replace(/\D/g, '');
  if (ph.length < 7) { fe('rPhoneE','Número no válido.'); return; }
  const full = pfx + ph;
  document.getElementById('phoneTo').textContent = full;
  const btn = document.getElementById('smsBtnSend');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Enviando...';
  await new Promise(r => setTimeout(r, 500));

  demoOTP = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('%c🔑 Código de verificación: ' + demoOTP, 'color:#003087;font-size:16px;font-weight:bold');
  showAlert('info', '📱 Código de prueba en la consola del navegador (F12). El SMS real se activa al configurar Twilio.');

  [0,1,2,3,4,5].forEach(i => { const el = document.getElementById('so' + i); if (el) el.value = ''; });
  const rs = document.getElementById('smsResend');
  if (rs) rs.innerHTML = 'Reenviar en <span id="smsC">60</span>s';
  document.getElementById('smsSection').style.display = '';
  btn.style.display = 'none';
  countdown('smsC', 60);
}

function verifySMS() {
  const code = getOTP('s');
  if (code.length < 6) { showAlert('fail','Ingresa los 6 dígitos.'); return; }
  if (!demoOTP || code !== demoOTP) { showAlert('fail','❌ Código incorrecto. Revisa la consola (F12).'); return; }
  demoOTP = null;
  showAlert('ok','✅ Teléfono verificado.');
  setTimeout(() => { clearAlert(); gotoStep('r', 3); }, 900);
}

function rs3next() {
  cfe('rCedE','rDobE'); clearAlert();
  const ced   = document.getElementById('rCed').value;
  const dob   = document.getElementById('rDob').value;
  const prov  = document.getElementById('rProv').value;
  const terms = document.getElementById('rTerms').checked;
  let ok = true;
  if (!validCedula(ced)) { fe('rCedE','Cédula no válida: el dígito verificador no corresponde.'); ok = false; }
  if (!dob) { fe('rDobE','Ingresa tu fecha de nacimiento.'); ok = false; }
  else {
    const age = (Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000);
    if (age < 18)  { fe('rDobE','Debes ser mayor de 18 años.'); ok = false; }
    if (age > 110) { fe('rDobE','Fecha de nacimiento no válida.'); ok = false; }
  }
  if (!prov)  { showAlert('fail','Selecciona tu provincia.'); ok = false; }
  if (!terms) { showAlert('fail','Debes aceptar los términos.'); ok = false; }
  if (!ok) return;
  gotoStep('r', 4);
}

async function doCreateAccount() {
  clearAlert();
  const nom  = document.getElementById('rNom')?.value.trim() || 'Usuario';
  const ape  = document.getElementById('rApe')?.value.trim() || '';
  const em   = document.getElementById('rEmail')?.value.trim() || '';
  const pw   = document.getElementById('rPwd')?.value || '';
  const pfx  = document.getElementById('phPfx')?.value || '';
  const ph   = (document.getElementById('rPhone')?.value || '').replace(/\D/g, '');
  const ced  = (document.getElementById('rCed')?.value || '').replace(/\D/g, '');
  const dob  = document.getElementById('rDob')?.value || '';
  const prov = document.getElementById('rProv')?.value || '';

  // Re-validación: el atajo "Continuar con teléfono" permite llegar aquí
  // sin haber pasado por el paso 1.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) || pw.length < 8 || !/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    showAlert('fail', 'Falta completar el paso 1: correo y contraseña válidos.');
    gotoStep('r', 1);
    return;
  }

  const btn = document.querySelector('#rs4 .btn-pri');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Creando cuenta...'; }
  try {
    if (!DEMO) {
      const client = requireSb();
      if (!client) { showAlert('fail','Sin conexión con el servidor. Recarga la página e intenta de nuevo.'); return; }
      const { data, error } = await client.auth.signUp({
        email: em,
        password: pw,
        options: {
          data: {
            full_name: `${nom} ${ape}`.trim(),
            phone: ph ? pfx + ph : null,
            cedula: ced || null,
            birth_date: dob || null,
            province: prov || null
          },
          emailRedirectTo: location.origin + location.pathname
        }
      });
      if (error) {
        if (/already|registered/i.test(error.message)) {
          showAlert('fail', 'Este correo ya tiene una cuenta. Usa "Iniciar sesión" o recupera tu contraseña.');
          return;
        }
        throw error;
      }
      if (data?.session) {
        // Confirmación de email desactivada en el proyecto: sesión directa
        showToast(`¡Cuenta creada! Bienvenido/a ${nom} 🎉`);
        closeAuth();
      } else {
        showAlert('ok', `✅ Cuenta creada. Enviamos un enlace de verificación a ${em} — confírmalo para poder iniciar sesión.`);
      }
    } else {
      await new Promise(r => setTimeout(r, 700));
      user = { email: em, user_metadata: { full_name: `${nom} ${ape}`.trim() } };
      persistUser();
      userState.loggedIn = true; saveUserState();
      refreshHeader();
      showToast(`¡Cuenta creada! Bienvenido/a ${nom} 🎉`);
      closeAuth();
      if (pending) { const v = pending; pending = null; requireAuth(v); }
    }
  } catch (e) { showAlert('fail', e.message || 'Error al crear la cuenta.'); }
  finally { if (btn) { btn.disabled = false; btn.innerHTML = 'Crear cuenta y verificar email'; } }
}

async function resendEmail() {
  const em = document.getElementById('rEmail')?.value.trim();
  if (!em) return;
  try {
    if (!DEMO && requireSb()) await sb.auth.resend({ type: 'signup', email: em });
    showAlert('ok', `Reenviado a ${em}.`);
  } catch (e) { showAlert('fail','Error al reenviar.'); }
}

async function doLogout() {
  if (!DEMO && sb) { try { await sb.auth.signOut(); } catch (e) {} }
  user = null;
  persistUser();
  userState.loggedIn = false;
  // La verificación de identidad es de la cuenta, no del navegador:
  // no debe heredarla el siguiente usuario que inicie sesión aquí.
  userState.verified = false;
  userState.verificationStatus = 'none';
  saveUserState();
  refreshHeader();
  // En modo real el toast lo emite el handler de SIGNED_OUT
  if (DEMO || !sb) showToast('Sesión cerrada ✓');
  goHome();
}
