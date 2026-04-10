// ═══════════════════════════════════════════════════
//  MercadoRD — Módulo de Autenticación (Supabase)
//  Archivo: js/auth.js
// ═══════════════════════════════════════════════════

// ⚠️ REEMPLAZA con tus credenciales reales de Supabase
// Panel: https://app.supabase.com → Settings → API
const SB_URL = 'https://TU_PROYECTO.supabase.co';
const SB_KEY = 'TU_ANON_PUBLIC_KEY';

const DEMO = SB_URL.includes('TU_PROYECTO');
let sb = null;
try { if (!DEMO) sb = window.supabase.createClient(SB_URL, SB_KEY); } catch(e) {}

// ─── Estado global de auth ───
let user     = null;
let pending  = null;   // vista a abrir tras login
let attempts = 0;
let lockTs   = 0;
let demoOTP  = null;

// ─── Listener de sesión (Supabase real) ───
if (sb) {
  sb.auth.onAuthStateChange((ev, session) => {
    user = session?.user ?? null;
    refreshHeader();
    if (ev === 'SIGNED_IN') {
      showToast(`¡Bienvenido/a! ${user?.user_metadata?.full_name || user?.email} 👋`);
      closeAuth();
      if (pending) { showView(pending); pending = null; }
    }
    if (ev === 'SIGNED_OUT') {
      showToast('Sesión cerrada. ¡Hasta pronto!');
    }
  });
}

// ─── Actualizar header según sesión ───
function refreshHeader() {
  const btn = document.getElementById('authBtn');
  if (!btn) return;
  if (user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';
    const ini  = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    btn.outerHTML = `
      <div class="user-pill" id="authBtn" onclick="requireAuth('account')">
        <div class="uav">${ini}</div>
        ${name.split(' ')[0]}
        <span class="vtick">✓</span>
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

// Click fuera del modal = cerrar
document.getElementById('authOverlay').addEventListener('click', e => {
  if (e.target.id === 'authOverlay') closeAuth();
});

// Requerir auth antes de acción
function requireAuth(v) {
  if (!user) { 
    pending = v; 
    openAuth('login'); 
    showAlert('info', 'Inicia sesión o crea una cuenta para continuar.'); 
    return;
  }

  // Para vender, requerir verificación
  if (v === 'sell') {
    if (!userState.verified) {
      showAlert('warning', '⚠️ Debes verificar tu identidad para vender en MercadoRD.');
      setTimeout(() => openVerification('sell'), 500);
      return;
    }
  }

  // Para comprar, requerir verificación
  if (v === 'buy') {
    if (!userState.verified) {
      showAlert('warning', '✅ Verifica tu identidad para comprar en MercadoRD.');
      setTimeout(() => openVerification('buy'), 500);
      return;
    }
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
  gotoStep(isL ? 'l' : 'r', 1);
}

// ─── Ir a paso específico ───
function gotoStep(flow, n) {
  const pfx = flow === 'l' ? 'ls' : 'rs';
  const max  = flow === 'l' ? 3 : 4;
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
  if (v.length >= 8)            s++;
  if (/[A-Z]/.test(v))          s++;
  if (/[0-9]/.test(v))          s++;
  if (/[^A-Za-z0-9]/.test(v))   s++;
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

// ─── Formato cédula RD ───
function fmtCed(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 11);
  if (v.length > 3)  v = v.slice(0,3)  + '-' + v.slice(3);
  if (v.length > 11) v = v.slice(0,11) + '-' + v.slice(11);
  el.value = v;
}

// ─── OTP helpers ───
function onext(el, ni, p) {
  if (el.value && ni >= 0) {
    document.getElementById((p === 's' ? 'so' : 'lo') + ni)?.focus();
  }
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
    showAlert('fail', `Cuenta bloqueada. Espera ${Math.ceil((lockTs-Date.now())/1000)}s.`);
    return;
  }

  const email = document.getElementById('lEmail').value.trim();
  const pwd   = document.getElementById('lPwd').value;
  let ok = true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fe('lEmailE','Correo no válido.'); ok=false; }
  if (pwd.length < 6) { fe('lPwdE','Contraseña incorrecta.'); ok=false; }
  if (!ok) return;

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Verificando...';

  try {
    if (sb) {
      const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
      if (error) throw error;
      attempts = 0;
    } else {
      // DEMO
      await new Promise(r => setTimeout(r, 800));
      user = { email, user_metadata: { full_name: 'Usuario Demo' } };
      refreshHeader();
      showToast('Sesión iniciada (modo demo) ✓');
      closeAuth();
      if (pending) { showView(pending); pending = null; }
    }
  } catch(err) {
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
    if (sb) {
      const { error } = await sb.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: location.href } });
      if (error) throw error;
    } else {
      await new Promise(r => setTimeout(r, 600));
      user = { email:'demo@gmail.com', user_metadata:{ full_name:'Usuario Google' } };
      refreshHeader();
      showToast('Sesión con Google (modo demo) ✓');
      closeAuth();
      if (pending) { showView(pending); pending = null; }
    }
  } catch(e) { showAlert('fail','Error con Google. Intenta de nuevo.'); }
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
    if (sb) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href + '?reset=true' });
      if (error) throw error;
    }
    showAlert('ok', `✅ Enlace enviado a ${email}. Revisa tu bandeja.`);
  } catch(e) { showAlert('fail','Error al enviar. Verifica la dirección.'); }
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
  if (nom.length < 2)  { fe('rNomE','Ingresa tu nombre.'); ok=false; }
  if (ape.length < 2)  { fe('rApeE','Ingresa tu apellido.'); ok=false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { fe('rEmailE','Correo no válido.'); ok=false; }
  if (pw.length < 8)   { fe('rPwdE','Mínimo 8 caracteres.'); ok=false; }
  else if (!/[A-Z]/.test(pw)) { fe('rPwdE','Debe tener al menos una mayúscula.'); ok=false; }
  else if (!/[0-9]/.test(pw)) { fe('rPwdE','Debe tener al menos un número.'); ok=false; }
  if (pw !== pw2) { fe('rPwd2E','Las contraseñas no coinciden.'); ok=false; }
  if (!ok) return;
  document.getElementById('emailTo').textContent = em;
  gotoStep('r', 2);
}

async function sendSMS() {
  clearAlert(); cfe('rPhoneE');
  const pfx = document.getElementById('phPfx').value;
  const ph  = document.getElementById('rPhone').value.replace(/\D/g,'');
  if (ph.length < 7) { fe('rPhoneE','Número no válido.'); return; }
  const full = pfx + ph;
  document.getElementById('phoneTo').textContent = full;
  const btn = document.getElementById('smsBtnSend');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Enviando...';
  try {
    if (sb && !DEMO) {
      const { error } = await sb.auth.signInWithOtp({ phone: full });
      if (error) throw error;
    } else {
      demoOTP = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('%c🔑 Demo OTP: ' + demoOTP, 'color:#003087;font-size:16px;font-weight:bold');
      showAlert('info', '📱 Modo demo: código en consola del navegador (F12)');
    }
    document.getElementById('smsSection').style.display = '';
    btn.style.display = 'none';
    countdown('smsC', 60);
  } catch(e) {
    showAlert('fail','Error enviando SMS. Verifica el número.');
    btn.disabled = false;
    btn.innerHTML = 'Enviar código SMS';
  }
}

function verifySMS() {
  const code = getOTP('s');
  if (code.length < 6) { showAlert('fail','Ingresa los 6 dígitos.'); return; }
  if (DEMO && demoOTP && code !== demoOTP) { showAlert('fail','❌ Código incorrecto. Revisa la consola (F12).'); return; }
  showAlert('ok','✅ Teléfono verificado.');
  setTimeout(() => { clearAlert(); gotoStep('r', 3); }, 900);
}

function rs3next() {
  cfe('rCedE','rDobE'); clearAlert();
  const ced   = document.getElementById('rCed').value.replace(/\D/g,'');
  const dob   = document.getElementById('rDob').value;
  const prov  = document.getElementById('rProv').value;
  const terms = document.getElementById('rTerms').checked;
  let ok = true;
  if (ced.length !== 11) { fe('rCedE','La cédula debe tener 11 dígitos.'); ok=false; }
  if (!dob) { fe('rDobE','Ingresa tu fecha de nacimiento.'); ok=false; }
  else { const age=(Date.now()-new Date(dob))/(365.25*24*3600*1000); if(age<18){fe('rDobE','Debes ser mayor de 18 años.');ok=false;} }
  if (!prov)  { showAlert('fail','Selecciona tu provincia.'); ok=false; }
  if (!terms) { showAlert('fail','Debes aceptar los términos.'); ok=false; }
  if (!ok) return;
  gotoStep('r', 4);
}

async function doCreateAccount() {
  clearAlert();
  const nom = document.getElementById('rNom')?.value.trim() || 'Usuario';
  const ape = document.getElementById('rApe')?.value.trim() || '';
  const em  = document.getElementById('rEmail')?.value.trim();
  const pw  = document.getElementById('rPwd')?.value;
  const btn = document.querySelector('#rs4 .btn-pri');
  if (btn) { btn.disabled=true; btn.innerHTML='<span class="spin"></span> Creando cuenta...'; }
  try {
    if (sb && !DEMO) {
      const { error } = await sb.auth.signUp({
        email: em, password: pw,
        options: { data:{ full_name:`${nom} ${ape}`.trim() }, emailRedirectTo: location.href }
      });
      if (error) throw error;
      showAlert('ok', `✅ Cuenta creada. Revisa ${em} para verificar tu correo.`);
    } else {
      await new Promise(r => setTimeout(r, 900));
      user = { email: em, user_metadata: { full_name:`${nom} ${ape}`.trim() } };
      refreshHeader();
      showToast(`¡Cuenta creada! Bienvenido/a ${nom} 🎉`);
      closeAuth();
    }
  } catch(e) { showAlert('fail', e.message || 'Error al crear la cuenta.'); }
  finally { if (btn) { btn.disabled=false; btn.innerHTML='Crear cuenta y verificar email'; } }
}

async function resendEmail() {
  const em = document.getElementById('rEmail')?.value.trim();
  if (!em) return;
  try {
    if (sb && !DEMO) await sb.auth.resend({ type:'signup', email: em });
    showAlert('ok', `Reenviado a ${em}.`);
  } catch(e) { showAlert('fail','Error al reenviar.'); }
}

async function doLogout() {
  if (sb && !DEMO) await sb.auth.signOut();
  else { user=null; refreshHeader(); showToast('Sesión cerrada ✓'); goHome(); }
}
