// ═══════════════════════════════════════════════════
//  MercadoRD — Datos de productos y subastas
//  Archivo: js/data.js
// ═══════════════════════════════════════════════════

// WhatsApp de contacto para los anuncios de ejemplo (formato internacional sin +).
// 👉 Cambia este número por un WhatsApp real para probar el botón "Contactar" en los productos demo.
const DEMO_WA = '18095551234';

// Catálogo demo vaciado (2026-06-22) por decisión del usuario: el sitio arranca limpio
// y solo muestra anuncios reales que publiquen los usuarios (tabla `products` de Supabase,
// cargada por loadProductsDB). Para reponer ejemplos, volver a llenar este array.
const products = [];

// ═══════════════════════════════════════════════════
//  Las 32 provincias de República Dominicana + municipios
//  Los códigos SD/STI/PP/LR/PC son los históricos de los productos demo (no romper).
// ═══════════════════════════════════════════════════
const RD_PROVINCES = [
  { code:'DN',  name:'Distrito Nacional' },
  { code:'SD',  name:'Santo Domingo' },
  { code:'STI', name:'Santiago' },
  { code:'PP',  name:'Puerto Plata' },
  { code:'LR',  name:'La Romana' },
  { code:'PC',  name:'La Altagracia' },
  { code:'AZ',  name:'Azua' },
  { code:'BH',  name:'Bahoruco' },
  { code:'BR',  name:'Barahona' },
  { code:'DJ',  name:'Dajabón' },
  { code:'DU',  name:'Duarte' },
  { code:'EP',  name:'Elías Piña' },
  { code:'ES',  name:'El Seibo' },
  { code:'ET',  name:'Espaillat' },
  { code:'HM',  name:'Hato Mayor' },
  { code:'HMir',name:'Hermanas Mirabal' },
  { code:'IN',  name:'Independencia' },
  { code:'LV',  name:'La Vega' },
  { code:'MTS', name:'María Trinidad Sánchez' },
  { code:'MN',  name:'Monseñor Nouel' },
  { code:'MC',  name:'Monte Cristi' },
  { code:'MP',  name:'Monte Plata' },
  { code:'PD',  name:'Pedernales' },
  { code:'PR',  name:'Peravia' },
  { code:'SC',  name:'San Cristóbal' },
  { code:'SJO', name:'San José de Ocoa' },
  { code:'SJ',  name:'San Juan' },
  { code:'SPM', name:'San Pedro de Macorís' },
  { code:'SR',  name:'Sánchez Ramírez' },
  { code:'SM',  name:'Samaná' },
  { code:'SAR', name:'Santiago Rodríguez' },
  { code:'VA',  name:'Valverde' }
];

const RD_MUNICIPIOS = {
  DN:  ['Santo Domingo de Guzmán'],
  SD:  ['Santo Domingo Este','Santo Domingo Norte','Santo Domingo Oeste','Boca Chica','Los Alcarrizos','Pedro Brand','San Antonio de Guerra'],
  STI: ['Santiago','Bisonó (Villa Bisonó)','Jánico','Licey al Medio','Puñal','Sabana Iglesia','San José de las Matas','Tamboril','Villa González'],
  PP:  ['Puerto Plata','Altamira','Guananico','Imbert','Los Hidalgos','Luperón','Sosúa','Villa Isabela','Villa Montellano'],
  LR:  ['La Romana','Guaymate','Villa Hostos'],
  PC:  ['Higüey','San Rafael del Yuma','La Otra Banda','Punta Cana (Verón)'],
  AZ:  ['Azua de Compostela','Estebanía','Guayabal','Las Charcas','Las Yayas de Viajama','Padre Las Casas','Peralta','Pueblo Viejo','Sabana Yegua','Tábara Arriba'],
  BH:  ['Neiba','Galván','Los Ríos','Tamayo','Villa Jaragua'],
  BR:  ['Barahona','Cabral','El Peñón','Enriquillo','Fundación','Jaquimeyes','La Ciénaga','Las Salinas','Paraíso','Polo','Vicente Noble'],
  DJ:  ['Dajabón','El Pino','Loma de Cabrera','Partido','Restauración'],
  DU:  ['San Francisco de Macorís','Arenoso','Castillo','Eugenio María de Hostos','Las Guáranas','Pimentel','Villa Riva'],
  EP:  ['Comendador','Bánica','El Llano','Hondo Valle','Juan Santiago','Pedro Santana'],
  ES:  ['Santa Cruz de El Seibo','Miches'],
  ET:  ['Moca','Cayetano Germosén','Gaspar Hernández','Jamao al Norte'],
  HM:  ['Hato Mayor del Rey','El Valle','Sabana de la Mar'],
  HMir:['Salcedo','Tenares','Villa Tapia'],
  IN:  ['Jimaní','Cristóbal','Duvergé','La Descubierta','Mella','Postrer Río'],
  LV:  ['La Vega','Constanza','Jarabacoa','Jima Abajo'],
  MTS: ['Nagua','Cabrera','El Factor','Río San Juan'],
  MN:  ['Bonao','Maimón','Piedra Blanca'],
  MC:  ['Monte Cristi','Castañuelas','Guayubín','Las Matas de Santa Cruz','Pepillo Salcedo','Villa Vásquez'],
  MP:  ['Monte Plata','Bayaguana','Peralvillo','Sabana Grande de Boyá','Yamasá'],
  PD:  ['Pedernales','Oviedo'],
  PR:  ['Baní','Nizao','Matanzas'],
  SC:  ['San Cristóbal','Bajos de Haina','Cambita Garabitos','Los Cacaos','Sabana Grande de Palenque','San Gregorio de Nigua','Villa Altagracia','Yaguate'],
  SJO: ['San José de Ocoa','Rancho Arriba','Sabana Larga'],
  SJ:  ['San Juan de la Maguana','Bohechío','El Cercado','Juan de Herrera','Las Matas de Farfán','Vallejuelo'],
  SPM: ['San Pedro de Macorís','Consuelo','Guayacanes','Quisqueya','Ramón Santana','San José de los Llanos'],
  SR:  ['Cotuí','Cevicos','Fantino','La Mata'],
  SM:  ['Samaná','Las Terrenas','Sánchez'],
  SAR: ['San Ignacio de Sabaneta','Los Almácigos','Monción'],
  VA:  ['Mao','Esperanza','Laguna Salada']
};

// Array de subastas vaciado (2026-06-22): las subastas reales viven en la tabla `auctions`
// de Supabase y loadAuctionsDB() reemplaza este array al cargar. Sin fallback demo el sitio
// arranca sin subastas hasta que los usuarios publiquen las suyas.
const auctions = [];

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
      <p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Para disputas, contacta a soporte@mercadord.net. Las partes confieren a MercadoRD autoridad para mediar. Si persiste el conflicto, se canaliza a arbitraje conforme a las leyes de República Dominicana.</p>

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
    body: `<p style="font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px">Seguimos pautas WCAG 2.1 nivel AA. Si encuentras alguna barrera, contáctanos en accesibilidad@mercadord.net y la resolvemos en 5 días hábiles.</p><p style="font-size:11px;color:var(--text2);margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">Última actualización: enero 2025</p>`
  }
};

// ═══════════════════════════════════════════════════
//  Contenido informativo de las subsecciones
//  (se muestra en el mismo modal que el contenido legal)
// ═══════════════════════════════════════════════════
const H3 = 'font-size:15px;font-weight:700;margin-bottom:10px;color:var(--primary)';
const P  = 'font-size:13px;color:var(--text2);line-height:1.8;margin-bottom:14px';

const infoContent = {
  protection: {
    title: '🛡️ Protección al Comprador',
    body: `
      <h3 style="${H3}">Garantía MercadoRD</h3>
      <p style="${P}">Cada compra realizada dentro de la plataforma está cubierta: si el artículo no llega, llega dañado o no corresponde a la descripción, te devolvemos el 100% de tu dinero.</p>
      <h3 style="${H3}">Cómo funciona</h3>
      <p style="${P}">1. El pago queda retenido hasta que confirmes la recepción.<br>2. Tienes 15 días para abrir un reclamo desde "Mis compras".<br>3. MercadoRD media entre comprador y vendedor.<br>4. Reembolso en 3-5 días hábiles si procede.</p>
      <h3 style="${H3}">Qué NO cubre</h3>
      <p style="${P}">Transacciones fuera de la plataforma, pagos por WhatsApp o entregas en mano sin registro. Siempre completa la compra dentro de MercadoRD.</p>`
  },
  payments: {
    title: '💳 Métodos de Pago',
    body: `
      <h3 style="${H3}">Paga con tarjeta</h3>
      <p style="${P}">💳 <strong>Tarjeta de crédito o débito</strong> — Visa, Mastercard y American Express. El pago se procesa de forma segura al finalizar la compra, igual que en eBay.</p>
      <h3 style="${H3}">Otras opciones</h3>
      <p style="${P}">💵 <strong>Efectivo contra entrega</strong> — paga en efectivo al recibir tu pedido, en zonas con cobertura de mensajería.</p>
      <h3 style="${H3}">Seguridad</h3>
      <p style="${P}">Tus datos viajan cifrados con SSL de 256 bits. MercadoRD nunca almacena el número completo de tu tarjeta ni tu código CVV.</p>`
  },
  howbuy: {
    title: '❓ ¿Cómo comprar en MercadoRD?',
    body: `
      <h3 style="${H3}">1. Encuentra tu producto</h3>
      <p style="${P}">Usa el buscador o navega por categorías. Filtra por precio, condición y ubicación.</p>
      <h3 style="${H3}">2. Tres formas de comprar (como en eBay)</h3>
      <p style="${P}">🛒 <strong>Precio fijo</strong> — añade al carrito y paga.<br>🔨 <strong>Subasta</strong> — haz tu puja y gana si eres el mejor postor al cierre.<br>💰 <strong>Mejor oferta</strong> — propón tu precio al vendedor y negocia.</p>
      <h3 style="${H3}">3. Finaliza el pedido</h3>
      <p style="${P}">Completa tus datos de entrega en el checkout. Recibirás un número de pedido (MRD-XXXX) para seguimiento en "Mis compras".</p>`
  },
  howsell: {
    title: '❓ ¿Cómo vender en MercadoRD?',
    body: `
      <h3 style="${H3}">1. Verifica tu identidad</h3>
      <p style="${P}">Para vender necesitas cuenta con cédula RD o pasaporte verificado. Esto protege a los compradores y aumenta tus ventas.</p>
      <h3 style="${H3}">2. Publica tu anuncio</h3>
      <p style="${P}">Fotos claras, título descriptivo y precio competitivo. Elige el formato: precio fijo, subasta o acepta ofertas.</p>
      <h3 style="${H3}">3. Vende y cobra</h3>
      <p style="${P}">Coordina la entrega, y al confirmarse la recepción recibes tu dinero menos la comisión del 5%. Publicar es gratis.</p>`
  },
  fees: {
    title: '💰 Tarifas y Comisiones',
    body: `
      <h3 style="${H3}">Publicar es GRATIS</h3>
      <p style="${P}">Sin costo por publicar anuncios básicos. Solo pagas cuando vendes.</p>
      <h3 style="${H3}">Comisión por venta</h3>
      <p style="${P}">📌 <strong>5%</strong> sobre el precio final de venta (igual modelo que eBay).<br>📌 Subastas: 5% sobre la puja ganadora.<br>📌 ITBIS (18%) aplica sobre la comisión, no sobre tu producto.</p>
      <h3 style="${H3}">Servicios opcionales</h3>
      <p style="${P}">⭐ Destacar anuncio: RD$250 / 7 días.<br>📣 Campaña publicitaria: desde RD$500.<br>👑 Vendedor Premium: RD$990/mes.</p>`
  },
  premium: {
    title: '⭐ Vendedor Premium',
    body: `
      <h3 style="${H3}">Beneficios</h3>
      <p style="${P}">👑 Insignia Premium visible en todos tus anuncios.<br>🚀 Posicionamiento prioritario en búsquedas.<br>📊 Estadísticas avanzadas de visitas y conversión.<br>🎧 Soporte prioritario 24/7.<br>🚚 Tarifas de envío preferenciales.</p>
      <h3 style="${H3}">Requisitos</h3>
      <p style="${P}">Identidad verificada, calificación mínima de 4.5 estrellas y al menos 10 ventas completadas.</p>
      <p style="${P}"><strong>Precio: RD$990/mes.</strong> Actívalo desde el Seller Center.</p>`
  },
  ads: {
    title: '📣 Publicidad en MercadoRD',
    body: `
      <h3 style="${H3}">Impulsa tus productos</h3>
      <p style="${P}">Llega a más de 800K compradores activos. Tus anuncios aparecen primero en los resultados con la etiqueta "Patrocinado".</p>
      <h3 style="${H3}">Modelos de campaña</h3>
      <p style="${P}">📌 <strong>CPC</strong> — pagas por clic, desde RD$5.<br>📌 <strong>Destacado</strong> — posición fija 7 días, RD$250.<br>📌 <strong>Banner de categoría</strong> — desde RD$2,500/semana.</p>
      <p style="${P}">Configura tus campañas desde el Seller Center.</p>`
  },
  rules: {
    title: '📋 Reglas del Vendedor',
    body: `
      <h3 style="${H3}">Artículos prohibidos</h3>
      <p style="${P}">Armas, drogas, medicamentos controlados, animales en peligro, artículos falsificados, documentos oficiales y cualquier producto ilegal según las leyes de RD.</p>
      <h3 style="${H3}">Conducta</h3>
      <p style="${P}">✅ Describe tus productos con honestidad.<br>✅ Responde a los compradores en menos de 24h.<br>✅ Cumple los tiempos de entrega.<br>❌ No manipules pujas ni uses cuentas falsas.<br>❌ No dirijas ventas fuera de la plataforma.</p>
      <h3 style="${H3}">Sanciones</h3>
      <p style="${P}">Tres advertencias = suspensión 30 días. Fraude comprobado = expulsión permanente y reporte al Departamento de Cibercrimen.</p>`
  },
  about: {
    title: '🇩🇴 Quiénes Somos',
    body: `
      <h3 style="${H3}">Nuestra misión</h3>
      <p style="${P}">Conectar a compradores y vendedores de toda República Dominicana en un mercado seguro, transparente y accesible — inspirados en el modelo de eBay, adaptado a la realidad dominicana.</p>
      <h3 style="${H3}">Nuestra historia</h3>
      <p style="${P}">MercadoRD nace en Santo Domingo con el objetivo de digitalizar el comercio entre personas: desde electrónica y vehículos hasta productos agropecuarios, cubriendo las 32 provincias.</p>
      <h3 style="${H3}">Nuestros valores</h3>
      <p style="${P}">🔒 Seguridad primero · 🤝 Confianza verificada · 🇩🇴 Orgullo dominicano · ⚖️ Comercio justo</p>`
  },
  press: {
    title: '📰 Sala de Prensa',
    body: `
      <h3 style="${H3}">Comunicados recientes</h3>
      <p style="${P}">📅 <strong>Jun 2026</strong> — MercadoRD lanza subastas en línea con pujas en tiempo real.<br>📅 <strong>May 2026</strong> — Nueva verificación de identidad con reconocimiento facial.<br>📅 <strong>Abr 2026</strong> — Alianza con empresas de mensajería para envíos a 32 provincias.</p>
      <h3 style="${H3}">Contacto de prensa</h3>
      <p style="${P}">prensa@mercadord.net · Kit de marca y logos disponibles bajo solicitud.</p>`
  },
  jobs: {
    title: '💼 Trabaja con Nosotros',
    body: `
      <h3 style="${H3}">Vacantes abiertas</h3>
      <p style="${P}">💻 Desarrollador Full-Stack (Santo Domingo / remoto)<br>🎨 Diseñador UX/UI (Santo Domingo)<br>🎧 Agente de Soporte al Cliente (Santiago)<br>📦 Coordinador de Logística (Santo Domingo Este)</p>
      <h3 style="${H3}">Beneficios</h3>
      <p style="${P}">Seguro médico complementario, horario flexible, capacitación continua y bonos por desempeño.</p>
      <p style="${P}">Envía tu CV a <strong>talento@mercadord.net</strong></p>`
  },
  community: {
    title: '👥 Comunidad MercadoRD',
    body: `
      <h3 style="${H3}">Foros y grupos</h3>
      <p style="${P}">🚗 Club del Motor RD — compra-venta de vehículos y repuestos.<br>📱 Tecnología RD — gadgets, reviews y alertas de ofertas.<br>🌿 Agro Dominicano — productores y compradores del campo.<br>👗 Moda Circular — ropa de segunda mano y vintage.</p>
      <h3 style="${H3}">Compras colectivas</h3>
      <p style="${P}">Únete a grupos de compra para conseguir precios de mayorista entre varios compradores.</p>`
  },
  blog: {
    title: '✍️ Blog y Consejos',
    body: `
      <h3 style="${H3}">Artículos destacados</h3>
      <p style="${P}">📸 <strong>Cómo fotografiar tus productos para vender más</strong> — luz natural, fondo neutro y 5 ángulos clave.<br>💰 <strong>Guía de precios: cuánto vale tu artículo usado</strong> — investiga, compara y ajusta.<br>🔨 <strong>Estrategias para ganar subastas</strong> — puja en los últimos minutos y define tu máximo.<br>🛡️ <strong>Evita estafas: 7 señales de alerta</strong> — precios irreales, prisa y pagos externos.</p>`
  },
  affiliates: {
    title: '🤝 Programa de Afiliados',
    body: `
      <h3 style="${H3}">Gana promocionando MercadoRD</h3>
      <p style="${P}">Comparte enlaces de productos y gana <strong>3% de comisión</strong> por cada venta generada desde tu enlace.</p>
      <h3 style="${H3}">Cómo funciona</h3>
      <p style="${P}">1. Regístrate como afiliado (gratis).<br>2. Genera tus enlaces únicos.<br>3. Compártelos en redes, blog o YouTube.<br>4. Cobra mensualmente vía transferencia (mínimo RD$1,000).</p>`
  },
  investors: {
    title: '📊 Para Inversionistas',
    body: `
      <h3 style="${H3}">MercadoRD en cifras</h3>
      <p style="${P}">📈 +120K productos activos · +45K vendedores verificados · +800K compradores registrados · Presencia en 32 provincias.</p>
      <h3 style="${H3}">Modelo de negocio</h3>
      <p style="${P}">Ingresos por comisión de venta (5%), suscripciones Premium, publicidad interna y servicios de logística — el modelo probado de los grandes marketplaces.</p>
      <p style="${P}">Contacto: <strong>inversion@mercadord.net</strong></p>`
  },
  help: {
    title: '❓ Centro de Ayuda',
    body: `
      <h3 style="${H3}">Preguntas frecuentes</h3>
      <p style="${P}"><strong>¿Comprar tiene costo?</strong><br>No. Comprar es 100% gratis; solo pagas el producto + envío + ITBIS.</p>
      <p style="${P}"><strong>¿Cómo funciona una subasta?</strong><br>Haz una puja igual o mayor a la mínima indicada. Si nadie te supera al cierre, ganas el artículo. También puedes usar "¡Cómpralo ya!" para llevártelo de inmediato.</p>
      <p style="${P}"><strong>¿Qué es "Mejor oferta"?</strong><br>Propón un precio al vendedor. Puede aceptar, rechazar o hacer una contraoferta.</p>
      <p style="${P}"><strong>¿Cuándo recibo mi pedido?</strong><br>2-5 días hábiles en Santo Domingo y Santiago; 3-7 en el resto del país.</p>
      <p style="${P}"><strong>¿Cómo reporto un problema?</strong><br>Desde "Mis compras" → selecciona el pedido → "Abrir reclamo", o escribe a soporte@mercadord.net.</p>
      <h3 style="${H3}">Chat en vivo</h3>
      <p style="${P}">💬 Disponible de 8am a 8pm. Escríbenos también por WhatsApp al +1 (809) 555-1234.</p>`
  }
};
