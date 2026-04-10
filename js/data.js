// ═══════════════════════════════════════════════════
//  MercadoRD — Datos de productos y subastas
//  Archivo: js/data.js
// ═══════════════════════════════════════════════════

const products = [
  { id:1,  title:"iPhone 14 Pro Max 256GB",          price:68500,  old:75000,   icon:"📱", cat:"electronics", cond:"used", loc:"SD",  rating:4.8, reviews:312, seller:"TechShop RD",  badge:"hot"  },
  { id:2,  title:"Samsung 65\" QLED 4K Smart TV",    price:45000,  old:55000,   icon:"📺", cat:"electronics", cond:"new",  loc:"SD",  rating:4.7, reviews:89,  seller:"ElectroMax",   badge:"new"  },
  { id:3,  title:"MacBook Pro M3 14\" 512GB",         price:125000, old:null,    icon:"💻", cat:"electronics", cond:"new",  loc:"STI", rating:4.9, reviews:56,  seller:"AppleRD",      badge:"new"  },
  { id:4,  title:"Toyota Corolla 2019 Automático",    price:890000, old:null,    icon:"🚗", cat:"vehicles",    cond:"used", loc:"SD",  rating:4.5, reviews:23,  seller:"AutosElite",   badge:null   },
  { id:5,  title:"Vestido Casual Verano Colores",     price:1800,   old:2500,    icon:"👗", cat:"fashion",     cond:"new",  loc:"SD",  rating:4.3, reviews:145, seller:"ModaRD",       badge:"deal" },
  { id:6,  title:"Aire Acondicionado 18000 BTU",      price:28000,  old:33000,   icon:"❄️", cat:"home2",       cond:"new",  loc:"PP",  rating:4.6, reviews:78,  seller:"ClimaxRD",     badge:null   },
  { id:7,  title:"Bicicleta MTB 27.5\" 21v",          price:12500,  old:null,    icon:"🚲", cat:"sports",      cond:"new",  loc:"STI", rating:4.4, reviews:34,  seller:"DeportesSD",   badge:null   },
  { id:8,  title:"Silla Gamer Ergonómica Pro RGB",    price:9800,   old:12000,   icon:"🪑", cat:"home2",       cond:"new",  loc:"SD",  rating:4.7, reviews:201, seller:"GamerZone",    badge:"deal" },
  { id:9,  title:"Nevera Samsung 20 Pies Inox",       price:38500,  old:null,    icon:"🧊", cat:"home2",       cond:"new",  loc:"SD",  rating:4.8, reviews:167, seller:"ElectroMax",   badge:null   },
  { id:10, title:"Nike Air Max 270 Original",          price:5500,   old:7200,    icon:"👟", cat:"fashion",     cond:"new",  loc:"SD",  rating:4.5, reviews:289, seller:"ShoesRD",      badge:"deal" },
  { id:11, title:"PlayStation 5 + 2 Juegos",          price:42000,  old:45000,   icon:"🎮", cat:"electronics", cond:"new",  loc:"STI", rating:4.9, reviews:543, seller:"GameStoreRD",  badge:"hot"  },
  { id:12, title:"Terreno 200m² Zona Turística",      price:1800000,old:null,    icon:"🏗️", cat:"services",    cond:"new",  loc:"PP",  rating:5.0, reviews:8,   seller:"InmoBienes",   badge:null   },
  { id:13, title:"Lavadora LG 20 Lbs Carga Frontal",  price:22000,  old:26000,   icon:"🫧", cat:"home2",       cond:"new",  loc:"SD",  rating:4.6, reviews:112, seller:"ElectroMax",   badge:"deal" },
  { id:14, title:"Honda Civic 2020 EX Turbo",         price:1150000,old:null,    icon:"🚙", cat:"vehicles",    cond:"used", loc:"STI", rating:4.7, reviews:15,  seller:"AutosElite",   badge:null   },
  { id:15, title:"JBL Boombox 3 Speaker",             price:18500,  old:22000,   icon:"🔊", cat:"electronics", cond:"new",  loc:"SD",  rating:4.8, reviews:234, seller:"AudioRD",      badge:"hot"  },
  { id:16, title:"Generador Yamaha 3000W Inverter",   price:65000,  old:72000,   icon:"⚡", cat:"services",    cond:"new",  loc:"SD",  rating:4.9, reviews:189, seller:"GeneraRD",     badge:"hot"  },
];

const auctions = [
  { id:101, title:"Toyota Hilux 2020 4x4 Diesel",     icon:"🛻", cur:650000, bids:18, ends:"2h 34min", seller:"AutosRD",   loc:"SD"  },
  { id:102, title:"MacBook Air M2 256GB",              icon:"💻", cur:58000,  bids:31, ends:"5h 12min", seller:"TechShop",  loc:"STI" },
  { id:103, title:"Generador Eléctrico 8KW",           icon:"⚡", cur:35000,  bids:9,  ends:"1d 2h",    seller:"GeneraRD",  loc:"SD"  },
  { id:104, title:"Colección Relojes Vintage Suizos",  icon:"⌚", cur:22000,  bids:14, ends:"3h 50min", seller:"LujoRD",    loc:"SD"  },
  { id:105, title:"iPhone 15 Pro Max 1TB",             icon:"📱", cur:85000,  bids:42, ends:"45min",    seller:"AppleRD",   loc:"STI" },
];

const legalContent = {
  terms: {
    title: '📋 Términos de uso',
    body: `
      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">1. Aceptación de los términos</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Al acceder y utilizar MercadoRD, aceptas estar sujeto a estos Términos de Uso. Si no estás de acuerdo con alguna parte de estos términos, no podrás utilizar nuestros servicios.</p>

      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">2. Registro y cuenta</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Para publicar anuncios debes ser mayor de 18 años, proporcionar información veraz y verificar tu identidad con cédula dominicana o pasaporte válido. Eres responsable de mantener la confidencialidad de tu contraseña.</p>

      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">3. Conducta del usuario</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Está prohibido publicar artículos ilegales, engañar a otros usuarios, usar bots, spam o prácticas fraudulentas. MercadoRD suspende cuentas que violen estas normas de forma permanente.</p>

      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">4. Comisiones y tarifas</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">La publicación básica es gratuita. Se cobra 5% sobre ventas completadas. Los pagos están sujetos al ITBIS (18%). Consulta nuestro desglose de tarifas en la sección de Vendedores.</p>

      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">5. Propiedad intelectual</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Todos los derechos de marca, logo y contenido de MercadoRD son propiedad exclusiva. No puedes copiar, distribuir o modificar nuestro contenido sin autorización escrita previa.</p>

      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">6. Transacciones y pagos</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Todos los pagos se realizan a través de plataformas seguras. MercadoRD no es responsable de fallos de terceros como bancos. No emitimos reembolsos por cambio de opinión después de comprar.</p>

      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">7. Limitación de responsabilidad</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">MercadoRD actúa como intermediario. No somos responsables de daños indirectos, pérdida de datos o lucro cesante. Tu máximo recurso es reembolso del monto pagado.</p>

      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">8. Cancelación de cuenta</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Puedes cancelar tu cuenta en cualquier momento desde tu perfil. Las transacciones activas deben completarse. Las cuentas con deudas no se pueden cancelar hasta regularizar.</p>

      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">9. Cambios en los términos</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">MercadoRD se reserva el derecho de modificar estos términos notificándote con 30 días de anticipación. El uso continuado de la plataforma implica aceptación de los cambios.</p>

      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">10. Resolución de disputas</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Para disputas, contacta a soporte@mercadord.do. Las partes confieren a MercadoRD autoridad para mediar. Si persiste el conflicto, se canaliza a arbitraje conforme a las leyes de República Dominicana.</p>

      <p style="font-size:11px;color:var(--text2);margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">Última actualización: abril 2026 · MercadoRD S.R.L. · RNC: 1-30-12345-6<br>Conforme a Ley 358-05 del Consumidor y regulaciones de PROCONSUMIDOR</p>`
  },
  privacy: {
    title: '🔒 Política de privacidad',
    body: `
      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">Datos que recopilamos</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Nombre, correo, teléfono, cédula (cifrada), historial de compras/ventas y datos de navegación para mejorar tu experiencia.</p>
      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">Seguridad</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Cifrado AES-256. Contraseñas con bcrypt. Cumplimos la Ley 172-13 de Protección de Datos de RD. Nunca vendemos tu información.</p>
      <p style="font-size:11px;color:var(--text2);margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">Conforme a Ley 172-13 · Última actualización: enero 2025</p>`
  },
  cookies: {
    title: '🍪 Política de cookies',
    body: `<p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Usamos cookies esenciales, de preferencias y analíticas. No usamos cookies de publicidad de terceros. Puedes controlarlas desde tu navegador.</p><p style="font-size:11px;color:var(--text2);margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">Última actualización: enero 2025</p>`
  },
  fraud: {
    title: '🛡️ Política anti-fraude',
    body: `
      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">Cero tolerancia al fraude</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Todo vendedor debe verificar identidad con cédula RD y teléfono activo. Las cuentas sospechosas son suspendidas de inmediato.</p>
      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">Señales de alerta</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Desconfía si el precio es muy bajo, piden pagar fuera de la plataforma o solicitan datos personales por WhatsApp.</p>
      <p style="font-size:11px;color:var(--text2);margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">MercadoRD colabora con el Departamento de Cibercrimen de la RD.</p>`
  },
  returns: {
    title: '🔄 MercadoRD Retorno',
    body: `
      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">15 días para devolver</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Desde la recepción, si el producto no corresponde a la descripción, llegó dañado o es defectuoso.</p>
      <h3 style="font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)">Proceso</h3>
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">1. Abre caso desde "Mis compras". 2. Adjunta fotos. 3. MercadoRD media. 4. Reembolso en 3-5 días hábiles.</p>
      <p style="font-size:11px;color:var(--text2);margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">Conforme a Ley 358-05 del Consumidor de la República Dominicana.</p>`
  },
  accessibility: {
    title: '♿ Accesibilidad',
    body: `<p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Seguimos pautas WCAG 2.1 nivel AA. Si encuentras alguna barrera, contáctanos en accesibilidad@mercadord.do y la resolvemos en 5 días hábiles.</p><p style="font-size:11px;color:var(--text2);margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">Última actualización: enero 2025</p>`
  }
};
